"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac/guard";
import { logSystemEvent } from "@/lib/observability/audit";
import { requireRateLimit } from "@/lib/rate-limit";

// ─── Customer Notes CRUD (Phase 7C.1 + 7C.4) ─────────────────────────
// Every mutation:
//   1. requirePermission("customer.notes.manage")
//   2. requireRateLimit (60/min per actor — typing-fast is fine, scripted
//      flooding is not)
//   3. emits SystemEvent with actor + customerEmail correlation
//   4. revalidates the customer profile route

const MAX_BODY = 4000;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sanitizeBody(input: string): string {
  // No HTML — notes are plain text. Cap length and strip control chars.
  const trimmed = input.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim();
  if (!trimmed) throw new Error("La nota no puede estar vacía.");
  if (trimmed.length > MAX_BODY) {
    throw new Error(`La nota excede los ${MAX_BODY} caracteres.`);
  }
  return trimmed;
}

export async function createCustomerNote(input: { customerEmail: string; body: string }) {
  const actor = await requirePermission("customer.notes.manage");
  await requireRateLimit({
    key: `customer_notes:user:${actor.userId}`,
    limit: 60,
    windowMs: 60_000,
    route: "customer.notes.create",
    actorId: actor.userId,
    storeId: actor.storeId,
  });

  const customerEmail = normalizeEmail(input.customerEmail);
  if (!customerEmail) throw new Error("Email inválido.");
  const body = sanitizeBody(input.body);

  const note = await prisma.customerNote.create({
    data: {
      storeId: actor.storeId,
      customerEmail,
      authorId: actor.userId,
      authorRole: actor.role,
      body,
    },
  });

  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "customer_note",
    entityId: note.id,
    eventType: "customer_note_created",
    severity: "info",
    source: "admin_panel",
    message: `Nota creada para ${customerEmail}`,
    actorId: actor.userId,
    actorRole: actor.role,
    metadata: { customerEmail, length: body.length },
  });

  revalidatePath(`/admin/customers/${encodeURIComponent(customerEmail)}`);
  return { id: note.id };
}

export async function updateCustomerNote(input: { noteId: string; body: string }) {
  const actor = await requirePermission("customer.notes.manage");
  await requireRateLimit({
    key: `customer_notes:user:${actor.userId}`,
    limit: 60,
    windowMs: 60_000,
    route: "customer.notes.update",
    actorId: actor.userId,
    storeId: actor.storeId,
  });

  const existing = await prisma.customerNote.findFirst({
    where: { id: input.noteId, storeId: actor.storeId },
  });
  if (!existing) throw new Error("Nota no encontrada.");

  // Only the original author OR an admin/owner can edit. Managers and
  // support cannot rewrite history.
  const canEditAnyone = actor.role === "owner" || actor.role === "admin";
  if (!canEditAnyone && existing.authorId !== actor.userId) {
    throw new Error("Solo el autor original puede editar esta nota.");
  }

  const body = sanitizeBody(input.body);
  await prisma.customerNote.update({
    where: { id: input.noteId },
    data: { body },
  });

  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "customer_note",
    entityId: input.noteId,
    eventType: "customer_note_updated",
    severity: "info",
    source: "admin_panel",
    message: `Nota actualizada para ${existing.customerEmail}`,
    actorId: actor.userId,
    actorRole: actor.role,
    metadata: { customerEmail: existing.customerEmail, length: body.length },
  });

  revalidatePath(`/admin/customers/${encodeURIComponent(existing.customerEmail)}`);
  return { success: true };
}

export async function deleteCustomerNote(noteId: string) {
  const actor = await requirePermission("customer.notes.manage");

  const existing = await prisma.customerNote.findFirst({
    where: { id: noteId, storeId: actor.storeId },
  });
  if (!existing) throw new Error("Nota no encontrada.");

  const canDeleteAnyone = actor.role === "owner" || actor.role === "admin";
  if (!canDeleteAnyone && existing.authorId !== actor.userId) {
    throw new Error("Solo el autor original puede borrar esta nota.");
  }

  await prisma.customerNote.delete({ where: { id: noteId } });

  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "customer_note",
    entityId: noteId,
    eventType: "customer_note_deleted",
    severity: "info",
    source: "admin_panel",
    message: `Nota eliminada de ${existing.customerEmail}`,
    actorId: actor.userId,
    actorRole: actor.role,
    metadata: { customerEmail: existing.customerEmail },
  });

  revalidatePath(`/admin/customers/${encodeURIComponent(existing.customerEmail)}`);
  return { success: true };
}

export interface CustomerNoteRow {
  id: string;
  body: string;
  authorId: string;
  authorRole: string;
  authorName: string | null;
  authorEmail: string;
  createdAt: string;
  updatedAt: string;
  canMutate: boolean;
}

export async function listCustomerNotes(storeId: string, customerEmail: string, viewerUserId: string, viewerRole: string): Promise<CustomerNoteRow[]> {
  const email = normalizeEmail(customerEmail);
  const rows = await prisma.customerNote.findMany({
    where: { storeId, customerEmail: email },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Pull author info in a single batched query
  const authorIds = Array.from(new Set(rows.map((r) => r.authorId)));
  const authors = authorIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const authorMap = new Map(authors.map((a) => [a.id, a]));

  const canEditAnyone = viewerRole === "owner" || viewerRole === "admin";

  return rows.map((r) => {
    const author = authorMap.get(r.authorId);
    return {
      id: r.id,
      body: r.body,
      authorId: r.authorId,
      authorRole: r.authorRole,
      authorName: author?.name ?? null,
      authorEmail: author?.email ?? "—",
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      canMutate: canEditAnyone || r.authorId === viewerUserId,
    };
  });
}
