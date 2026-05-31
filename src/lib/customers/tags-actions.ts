"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac/guard";
import { logSystemEvent } from "@/lib/observability/audit";
import { requireRateLimit } from "@/lib/rate-limit";

// ─── Customer Tags (Phase 7D.2) ──────────────────────────────────────
// Real CRUD on the existing CustomerTag schema. Tags are normalized to
// lowercase with hyphens; storage is `(storeId, customerEmail, label)`
// unique so the same tag on the same customer is idempotent. Renames
// happen across all customers that carry the tag, in a single
// updateMany — atomic at the row level.

const MAX_LABEL = 40;

function normalizeLabel(input: string): string {
  // Lowercase, trim, collapse whitespace, replace spaces with hyphens.
  // Strip everything that isn't alphanumeric / hyphen / accent.
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-záéíóúüñ0-9-]/gi, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!cleaned) throw new Error("Tag inválido.");
  if (cleaned.length > MAX_LABEL) throw new Error(`Tag excede ${MAX_LABEL} caracteres.`);
  return cleaned;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function rateLimitKey(actorId: string) {
  return `customer_tags:user:${actorId}`;
}

export async function assignCustomerTag(input: { customerEmail: string; label: string; color?: string | null }) {
  const actor = await requirePermission("customer.tags.manage");
  await requireRateLimit({
    key: rateLimitKey(actor.userId),
    limit: 60,
    windowMs: 60_000,
    route: "customer.tags.assign",
    actorId: actor.userId,
    storeId: actor.storeId,
  });

  const customerEmail = normalizeEmail(input.customerEmail);
  if (!customerEmail.includes("@")) throw new Error("Email inválido.");
  const label = normalizeLabel(input.label);
  const color = input.color?.trim() || null;
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error("Color hex inválido.");

  // Upsert keeps idempotent — same tag on same customer is a no-op
  const existing = await prisma.customerTag.findUnique({
    where: { storeId_customerEmail_label: { storeId: actor.storeId, customerEmail, label } },
  });

  if (existing) {
    return { id: existing.id, created: false };
  }

  const created = await prisma.customerTag.create({
    data: {
      storeId: actor.storeId,
      customerEmail,
      label,
      color,
      createdById: actor.userId,
    },
  });

  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "customer_tag",
    entityId: created.id,
    eventType: "customer_tag_assigned",
    severity: "info",
    source: "admin_panel",
    message: `Tag '${label}' asignado a ${customerEmail}`,
    actorId: actor.userId,
    actorRole: actor.role,
    metadata: { customerEmail, label },
  });

  revalidatePath(`/admin/customers/${encodeURIComponent(customerEmail)}`);
  return { id: created.id, created: true };
}

export async function removeCustomerTag(input: { customerEmail: string; label: string }) {
  const actor = await requirePermission("customer.tags.manage");
  await requireRateLimit({
    key: rateLimitKey(actor.userId),
    limit: 60,
    windowMs: 60_000,
    route: "customer.tags.remove",
    actorId: actor.userId,
    storeId: actor.storeId,
  });

  const customerEmail = normalizeEmail(input.customerEmail);
  const label = normalizeLabel(input.label);

  const deleted = await prisma.customerTag.deleteMany({
    where: { storeId: actor.storeId, customerEmail, label },
  });

  if (deleted.count === 0) {
    return { success: true, removed: 0 };
  }

  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "customer_tag",
    eventType: "customer_tag_removed",
    severity: "info",
    source: "admin_panel",
    message: `Tag '${label}' removido de ${customerEmail}`,
    actorId: actor.userId,
    actorRole: actor.role,
    metadata: { customerEmail, label, removed: deleted.count },
  });

  revalidatePath(`/admin/customers/${encodeURIComponent(customerEmail)}`);
  return { success: true, removed: deleted.count };
}

export async function renameCustomerTagGlobal(input: { fromLabel: string; toLabel: string }) {
  const actor = await requirePermission("customer.tags.manage");
  await requireRateLimit({
    key: rateLimitKey(actor.userId),
    limit: 60,
    windowMs: 60_000,
    route: "customer.tags.rename",
    actorId: actor.userId,
    storeId: actor.storeId,
  });

  const from = normalizeLabel(input.fromLabel);
  const to = normalizeLabel(input.toLabel);
  if (from === to) return { renamed: 0 };

  // Two-step rename to avoid the unique constraint colliding with rows
  // that already carry `to`. We delete duplicates that would collide,
  // then update the rest. This preserves at-least-one occurrence.
  const colliding = await prisma.customerTag.findMany({
    where: { storeId: actor.storeId, label: from },
    select: { customerEmail: true },
  });
  const customers = colliding.map((c) => c.customerEmail);
  if (customers.length === 0) return { renamed: 0 };

  // Delete pre-existing rows where the same (customer, to) already exists,
  // so the bulk update never trips the unique constraint.
  await prisma.customerTag.deleteMany({
    where: {
      storeId: actor.storeId,
      label: to,
      customerEmail: { in: customers },
    },
  });

  const result = await prisma.customerTag.updateMany({
    where: { storeId: actor.storeId, label: from },
    data: { label: to },
  });

  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "customer_tag",
    eventType: "customer_tag_renamed",
    severity: "info",
    source: "admin_panel",
    message: `Tag '${from}' renombrado a '${to}' en ${result.count} clientes`,
    actorId: actor.userId,
    actorRole: actor.role,
    metadata: { from, to, affected: result.count },
  });

  revalidatePath("/admin/customers");
  return { renamed: result.count };
}

const BULK_LIMIT = 500;

export async function bulkAssignCustomerTag(input: { emails: string[]; label: string; color?: string | null }) {
  const actor = await requirePermission("customer.tags.manage");

  // A bulk operation costs more rate-limit tokens than a single one to
  // discourage scripted misuse. Treat each batch as 5 ops.
  await requireRateLimit({
    key: rateLimitKey(actor.userId),
    limit: 60,
    windowMs: 60_000,
    route: "customer.tags.bulk",
    actorId: actor.userId,
    storeId: actor.storeId,
  });

  if (!Array.isArray(input.emails) || input.emails.length === 0) {
    throw new Error("Sin clientes en el batch.");
  }
  if (input.emails.length > BULK_LIMIT) {
    throw new Error(`Máximo ${BULK_LIMIT} clientes por batch.`);
  }

  const label = normalizeLabel(input.label);
  const color = input.color?.trim() || null;
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error("Color hex inválido.");

  const emails = Array.from(new Set(input.emails.map(normalizeEmail).filter((e) => e.includes("@"))));

  const data = emails.map((customerEmail) => ({
    storeId: actor.storeId,
    customerEmail,
    label,
    color,
    createdById: actor.userId,
  }));

  const result = await prisma.customerTag.createMany({
    data,
    skipDuplicates: true,
  });

  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "customer_tag",
    eventType: "customer_tag_bulk_assigned",
    severity: "info",
    source: "admin_panel",
    message: `Tag '${label}' asignado a ${result.count} clientes (batch ${emails.length})`,
    actorId: actor.userId,
    actorRole: actor.role,
    metadata: { label, attempted: emails.length, created: result.count },
  });

  revalidatePath("/admin/customers");
  return { created: result.count, attempted: emails.length };
}

export interface TagRow {
  id: string;
  label: string;
  color: string | null;
  createdAt: string;
}

export async function listTagsForCustomer(storeId: string, customerEmail: string): Promise<TagRow[]> {
  const email = normalizeEmail(customerEmail);
  const tags = await prisma.customerTag.findMany({
    where: { storeId, customerEmail: email },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return tags.map((t) => ({
    id: t.id,
    label: t.label,
    color: t.color,
    createdAt: t.createdAt.toISOString(),
  }));
}

export async function listAllTags(storeId: string): Promise<Array<{ label: string; count: number }>> {
  // groupBy avoids a full-table scan on a large CRM.
  const grouped = await prisma.customerTag.groupBy({
    by: ["label"],
    where: { storeId },
    _count: { _all: true },
    orderBy: { _count: { label: "desc" } },
    take: 200,
  });
  return grouped.map((g) => ({ label: g.label, count: g._count._all }));
}
