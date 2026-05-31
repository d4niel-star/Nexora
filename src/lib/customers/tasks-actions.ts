"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac/guard";
import { logSystemEvent } from "@/lib/observability/audit";
import { requireRateLimit } from "@/lib/rate-limit";

// ─── Customer Tasks (Phase 7D.3) ─────────────────────────────────────
// Real CRUD on the existing CustomerTask schema. Each mutation goes
// through requirePermission("customer.tasks.manage") + 60/min rate
// limit + audit. Status machine:
//
//   open ──complete──▶ completed
//    │
//    └──cancel─────▶ cancelled
//
//   completed/cancelled ──reopen──▶ open

const VALID_PRIORITY = new Set(["low", "normal", "medium", "high", "urgent"]);
const MAX_TITLE = 200;
const MAX_DESC = 4000;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function rateLimitKey(actorId: string) {
  return `customer_tasks:user:${actorId}`;
}

function sanitizeTitle(s: string): string {
  const t = s.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim();
  if (!t) throw new Error("El título es obligatorio.");
  if (t.length > MAX_TITLE) throw new Error(`Título excede ${MAX_TITLE} caracteres.`);
  return t;
}

function sanitizeDescription(s: string | null | undefined): string | null {
  if (!s) return null;
  const d = s.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim();
  if (!d) return null;
  if (d.length > MAX_DESC) throw new Error(`Descripción excede ${MAX_DESC} caracteres.`);
  return d;
}

export interface CreateTaskInput {
  customerEmail: string;
  title: string;
  description?: string | null;
  dueAt?: string | null;
  priority?: string;
  assignedToId?: string | null;
}

export async function createCustomerTask(input: CreateTaskInput) {
  const actor = await requirePermission("customer.tasks.manage");
  await requireRateLimit({
    key: rateLimitKey(actor.userId),
    limit: 60,
    windowMs: 60_000,
    route: "customer.tasks.create",
    actorId: actor.userId,
    storeId: actor.storeId,
  });

  const customerEmail = normalizeEmail(input.customerEmail);
  if (!customerEmail.includes("@")) throw new Error("Email del cliente inválido.");

  const title = sanitizeTitle(input.title);
  const description = sanitizeDescription(input.description);
  const priority = input.priority && VALID_PRIORITY.has(input.priority) ? input.priority : "normal";

  let dueAt: Date | null = null;
  if (input.dueAt) {
    const parsed = new Date(input.dueAt);
    if (isNaN(parsed.getTime())) throw new Error("Fecha inválida.");
    dueAt = parsed;
  }

  const created = await prisma.customerTask.create({
    data: {
      storeId: actor.storeId,
      customerEmail,
      title,
      description,
      dueAt,
      priority,
      assignedToId: input.assignedToId || null,
      createdById: actor.userId,
      status: "open",
    },
  });

  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "customer_task",
    entityId: created.id,
    eventType: "customer_task_created",
    severity: "info",
    source: "admin_panel",
    message: `Task creado: ${title}`,
    actorId: actor.userId,
    actorRole: actor.role,
    metadata: { customerEmail, priority, dueAt: dueAt?.toISOString() ?? null, assignedToId: input.assignedToId ?? null },
  });

  revalidatePath(`/admin/customers/${encodeURIComponent(customerEmail)}`);
  revalidatePath("/admin/customers/tasks");
  return { id: created.id };
}

export async function updateCustomerTask(input: {
  taskId: string;
  title?: string;
  description?: string | null;
  dueAt?: string | null;
  priority?: string;
}) {
  const actor = await requirePermission("customer.tasks.manage");
  await requireRateLimit({
    key: rateLimitKey(actor.userId),
    limit: 60,
    windowMs: 60_000,
    route: "customer.tasks.update",
    actorId: actor.userId,
    storeId: actor.storeId,
  });

  const existing = await prisma.customerTask.findFirst({
    where: { id: input.taskId, storeId: actor.storeId },
  });
  if (!existing) throw new Error("Task no encontrado.");

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = sanitizeTitle(input.title);
  if (input.description !== undefined) data.description = sanitizeDescription(input.description);
  if (input.priority !== undefined) {
    if (!VALID_PRIORITY.has(input.priority)) throw new Error("Prioridad inválida.");
    data.priority = input.priority;
  }
  if (input.dueAt !== undefined) {
    if (input.dueAt === null) data.dueAt = null;
    else {
      const parsed = new Date(input.dueAt);
      if (isNaN(parsed.getTime())) throw new Error("Fecha inválida.");
      data.dueAt = parsed;
    }
  }

  await prisma.customerTask.update({ where: { id: input.taskId }, data });

  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "customer_task",
    entityId: input.taskId,
    eventType: "customer_task_updated",
    severity: "info",
    source: "admin_panel",
    message: `Task actualizado: ${existing.title}`,
    actorId: actor.userId,
    actorRole: actor.role,
    metadata: { customerEmail: existing.customerEmail, fields: Object.keys(data) },
  });

  revalidatePath(`/admin/customers/${encodeURIComponent(existing.customerEmail)}`);
  revalidatePath("/admin/customers/tasks");
  return { success: true };
}

export async function reassignCustomerTask(input: { taskId: string; assignedToId: string | null }) {
  const actor = await requirePermission("customer.tasks.manage");
  await requireRateLimit({
    key: rateLimitKey(actor.userId),
    limit: 60,
    windowMs: 60_000,
    route: "customer.tasks.reassign",
    actorId: actor.userId,
    storeId: actor.storeId,
  });

  const existing = await prisma.customerTask.findFirst({
    where: { id: input.taskId, storeId: actor.storeId },
  });
  if (!existing) throw new Error("Task no encontrado.");

  // Verify the assignee exists and is staff at this store. Owner is
  // always assignable.
  if (input.assignedToId) {
    const isOwnerOrStaff = await prisma.staffMember.findFirst({
      where: { storeId: actor.storeId, userId: input.assignedToId, status: "active" },
    });
    const isOwner = await prisma.store.findFirst({
      where: { id: actor.storeId, ownerId: input.assignedToId },
    });
    if (!isOwnerOrStaff && !isOwner) {
      throw new Error("El asignado no es staff activo de esta tienda.");
    }
  }

  const previousAssigneeId = existing.assignedToId;
  await prisma.customerTask.update({
    where: { id: input.taskId },
    data: { assignedToId: input.assignedToId },
  });

  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "customer_task",
    entityId: input.taskId,
    eventType: "customer_task_reassigned",
    severity: "info",
    source: "admin_panel",
    message: `Task reasignado: ${existing.title}`,
    actorId: actor.userId,
    actorRole: actor.role,
    metadata: { previousAssigneeId, newAssigneeId: input.assignedToId },
  });

  revalidatePath(`/admin/customers/${encodeURIComponent(existing.customerEmail)}`);
  revalidatePath("/admin/customers/tasks");
  return { success: true };
}

export async function completeCustomerTask(taskId: string) {
  return transitionTask(taskId, "completed", "customer_task_completed");
}

export async function cancelCustomerTask(taskId: string) {
  return transitionTask(taskId, "cancelled", "customer_task_cancelled");
}

export async function reopenCustomerTask(taskId: string) {
  return transitionTask(taskId, "open", "customer_task_reopened");
}

async function transitionTask(taskId: string, target: "open" | "completed" | "cancelled", eventType: string) {
  const actor = await requirePermission("customer.tasks.manage");
  await requireRateLimit({
    key: rateLimitKey(actor.userId),
    limit: 60,
    windowMs: 60_000,
    route: `customer.tasks.${target}`,
    actorId: actor.userId,
    storeId: actor.storeId,
  });

  const existing = await prisma.customerTask.findFirst({
    where: { id: taskId, storeId: actor.storeId },
  });
  if (!existing) throw new Error("Task no encontrado.");
  if (existing.status === target) return { success: true, unchanged: true };

  const data: Record<string, unknown> = { status: target };
  if (target === "completed") data.completedAt = new Date();
  if (target === "cancelled") data.cancelledAt = new Date();
  if (target === "open") {
    data.completedAt = null;
    data.cancelledAt = null;
  }

  await prisma.customerTask.update({ where: { id: taskId }, data });

  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "customer_task",
    entityId: taskId,
    eventType,
    severity: "info",
    source: "admin_panel",
    message: `Task → ${target}: ${existing.title}`,
    actorId: actor.userId,
    actorRole: actor.role,
    metadata: { customerEmail: existing.customerEmail, previousStatus: existing.status },
  });

  revalidatePath(`/admin/customers/${encodeURIComponent(existing.customerEmail)}`);
  revalidatePath("/admin/customers/tasks");
  return { success: true };
}
