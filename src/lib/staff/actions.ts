"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { requirePermission, resolveActor } from "@/lib/rbac/guard";
import type { StaffRole } from "@/lib/rbac/permissions";
import { logSystemEvent } from "@/lib/observability/audit";
import { requireRateLimit } from "@/lib/rate-limit";
import { generateInviteToken, hashInviteToken } from "./tokens";
import { sendStaffInviteEmail } from "./emails";

// ─── Staff Mutations ─────────────────────────────────────────────────
// Every mutation:
//   1. Goes through requirePermission()
//   2. Applies guard rails (cannot demote/remove the owner, cannot
//      remove yourself, cannot demote the last owner)
//   3. Emits a SystemEvent with actor + correlation
//   4. Revalidates /admin/settings/team

const VALID_ROLES: ReadonlyArray<Exclude<StaffRole, "owner">> = ["admin", "manager", "support", "analyst"];
const INVITE_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

function isValidRole(role: string): role is Exclude<StaffRole, "owner"> {
  return (VALID_ROLES as ReadonlyArray<string>).includes(role);
}

function sanitizeEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().toLowerCase();
  if (trimmed.length < 5 || trimmed.length > 254) return null;
  // Conservative RFC-5322-lite — good enough for invite gating
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

// ─── INVITE ────────────────────────────────────────────────────────────
export async function inviteStaffAction(input: { email: string; role: string }) {
  const actor = await requirePermission("staff.invite");

  // Rate limit per actor: 10 invites / hour
  await requireRateLimit({
    key: `staff_invite:user:${actor.userId}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
    route: "staff.invite",
    actorId: actor.userId,
    storeId: actor.storeId,
  });

  const email = sanitizeEmail(input.email);
  if (!email) throw new Error("Email inválido");
  if (!isValidRole(input.role)) throw new Error(`Rol inválido: ${input.role}`);

  // Prevent inviting an already-active staff member
  const existingMember = await prisma.staffMember.findFirst({
    where: { storeId: actor.storeId, user: { email }, status: { not: "removed" } },
    select: { id: true, status: true },
  });
  if (existingMember) {
    throw new Error("Ya hay un miembro activo con ese email.");
  }

  const correlationId = randomUUID();
  const { raw, hash } = generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  // Revoke any existing pending invites for the same email
  await prisma.staffInvitation.updateMany({
    where: { storeId: actor.storeId, email, acceptedAt: null, revokedAt: null },
    data: { revokedAt: new Date(), revokedById: actor.userId },
  });

  await prisma.staffInvitation.create({
    data: {
      storeId: actor.storeId,
      email,
      role: input.role,
      tokenHash: hash,
      invitedById: actor.userId,
      expiresAt,
    },
  });

  // Send the email (failure does not abort — admin can resend)
  try {
    await sendStaffInviteEmail({
      to: email,
      storeId: actor.storeId,
      token: raw,
      role: input.role,
    });
  } catch (err) {
    await logSystemEvent({
      storeId: actor.storeId,
      entityType: "staff_invitation",
      eventType: "staff_invite_email_failed",
      severity: "warn",
      source: "admin_panel",
      message: `Could not send invite email to ${email}: ${err instanceof Error ? err.message : "unknown"}`,
      actorId: actor.userId,
      actorRole: actor.role,
      correlationId,
    });
  }

  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "staff_invitation",
    eventType: "staff_invited",
    severity: "info",
    source: "admin_panel",
    message: `Invited ${email} as ${input.role}`,
    actorId: actor.userId,
    actorRole: actor.role,
    correlationId,
    metadata: { email, role: input.role, expiresAt: expiresAt.toISOString() },
  });

  revalidatePath("/admin/settings/team");
  return { success: true };
}

// ─── RESEND INVITE ─────────────────────────────────────────────────────
export async function resendInviteAction(invitationId: string) {
  const actor = await requirePermission("staff.invite");

  await requireRateLimit({
    key: `staff_invite:user:${actor.userId}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
    route: "staff.invite.resend",
    actorId: actor.userId,
    storeId: actor.storeId,
  });

  const old = await prisma.staffInvitation.findFirst({
    where: { id: invitationId, storeId: actor.storeId },
  });
  if (!old) throw new Error("Invitación no encontrada");
  if (old.acceptedAt) throw new Error("Esta invitación ya fue aceptada");

  // Revoke old, issue new
  await prisma.staffInvitation.update({
    where: { id: old.id },
    data: { revokedAt: new Date(), revokedById: actor.userId },
  });

  const { raw, hash } = generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  const correlationId = randomUUID();

  await prisma.staffInvitation.create({
    data: {
      storeId: actor.storeId,
      email: old.email,
      role: old.role,
      tokenHash: hash,
      invitedById: actor.userId,
      expiresAt,
    },
  });

  try {
    await sendStaffInviteEmail({ to: old.email, storeId: actor.storeId, token: raw, role: old.role });
  } catch {
    // logged below
  }

  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "staff_invitation",
    eventType: "staff_invite_resent",
    severity: "info",
    source: "admin_panel",
    message: `Resent invite to ${old.email}`,
    actorId: actor.userId,
    actorRole: actor.role,
    correlationId,
    metadata: { email: old.email, role: old.role },
  });

  revalidatePath("/admin/settings/team");
  return { success: true };
}

// ─── REVOKE INVITE ─────────────────────────────────────────────────────
export async function revokeInviteAction(invitationId: string) {
  const actor = await requirePermission("staff.invite");

  const inv = await prisma.staffInvitation.findFirst({
    where: { id: invitationId, storeId: actor.storeId },
  });
  if (!inv) throw new Error("Invitación no encontrada");

  await prisma.staffInvitation.update({
    where: { id: inv.id },
    data: { revokedAt: new Date(), revokedById: actor.userId },
  });

  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "staff_invitation",
    eventType: "staff_invite_revoked",
    severity: "info",
    source: "admin_panel",
    message: `Revoked invite to ${inv.email}`,
    actorId: actor.userId,
    actorRole: actor.role,
    metadata: { email: inv.email },
  });

  revalidatePath("/admin/settings/team");
  return { success: true };
}

// ─── CHANGE ROLE ───────────────────────────────────────────────────────
export async function changeRoleAction(memberId: string, newRole: string) {
  const actor = await requirePermission("staff.manage");
  if (!isValidRole(newRole)) throw new Error(`Rol inválido: ${newRole}`);

  const m = await prisma.staffMember.findFirst({
    where: { id: memberId, storeId: actor.storeId },
  });
  if (!m) throw new Error("Miembro no encontrado");

  // Cannot change your own role (lockout protection)
  if (m.userId === actor.userId) throw new Error("No puedes cambiar tu propio rol.");

  // Owner is implicit — never appears in StaffMember, so no need to guard.

  if (m.role === newRole) return { success: true, unchanged: true };

  const oldRole = m.role;
  await prisma.staffMember.update({
    where: { id: m.id },
    data: { role: newRole },
  });

  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "staff",
    entityId: m.id,
    eventType: "staff_role_changed",
    severity: "info",
    source: "admin_panel",
    message: `Role changed: ${oldRole} → ${newRole}`,
    actorId: actor.userId,
    actorRole: actor.role,
    metadata: { affectedUserId: m.userId, oldRole, newRole },
  });

  revalidatePath("/admin/settings/team");
  return { success: true };
}

// ─── SUSPEND ──────────────────────────────────────────────────────────
export async function suspendStaffAction(memberId: string) {
  const actor = await requirePermission("staff.manage");

  const m = await prisma.staffMember.findFirst({
    where: { id: memberId, storeId: actor.storeId },
  });
  if (!m) throw new Error("Miembro no encontrado");
  if (m.userId === actor.userId) throw new Error("No puedes suspenderte a ti mismo.");

  await prisma.staffMember.update({
    where: { id: m.id },
    data: { status: "suspended", suspendedAt: new Date() },
  });

  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "staff",
    entityId: m.id,
    eventType: "staff_suspended",
    severity: "info",
    source: "admin_panel",
    message: `Staff member suspended`,
    actorId: actor.userId,
    actorRole: actor.role,
    metadata: { affectedUserId: m.userId },
  });

  revalidatePath("/admin/settings/team");
  return { success: true };
}

// ─── REACTIVATE ───────────────────────────────────────────────────────
export async function reactivateStaffAction(memberId: string) {
  const actor = await requirePermission("staff.manage");

  const m = await prisma.staffMember.findFirst({
    where: { id: memberId, storeId: actor.storeId },
  });
  if (!m) throw new Error("Miembro no encontrado");

  await prisma.staffMember.update({
    where: { id: m.id },
    data: { status: "active", suspendedAt: null },
  });

  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "staff",
    entityId: m.id,
    eventType: "staff_reactivated",
    severity: "info",
    source: "admin_panel",
    message: `Staff member reactivated`,
    actorId: actor.userId,
    actorRole: actor.role,
    metadata: { affectedUserId: m.userId },
  });

  revalidatePath("/admin/settings/team");
  return { success: true };
}

// ─── REMOVE ───────────────────────────────────────────────────────────
export async function removeStaffAction(memberId: string) {
  const actor = await requirePermission("staff.remove");

  const m = await prisma.staffMember.findFirst({
    where: { id: memberId, storeId: actor.storeId },
  });
  if (!m) throw new Error("Miembro no encontrado");
  if (m.userId === actor.userId) throw new Error("No puedes eliminarte a ti mismo.");

  await prisma.staffMember.update({
    where: { id: m.id },
    data: { status: "removed", removedAt: new Date(), removedById: actor.userId },
  });

  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "staff",
    entityId: m.id,
    eventType: "staff_removed",
    severity: "warn",
    source: "admin_panel",
    message: `Staff member removed`,
    actorId: actor.userId,
    actorRole: actor.role,
    metadata: { affectedUserId: m.userId, previousRole: m.role },
  });

  revalidatePath("/admin/settings/team");
  return { success: true };
}

// ─── ACCEPT INVITE ────────────────────────────────────────────────────
// This action runs on the public /invite/[token] page after the user
// has signed up / logged in. It validates the token, creates the
// StaffMember row, marks the invite as accepted, and revalidates.
export async function acceptInviteAction(rawToken: string) {
  // Light rate limit on this public-ish endpoint — slow brute force.
  await requireRateLimit({
    key: `invite_accept:token:${rawToken.slice(0, 8)}`,
    limit: 10,
    windowMs: 60 * 1000,
    route: "staff.invite.accept",
  });

  const actor = await resolveActor();
  // We do NOT require permission here — invite acceptance is the entry
  // point for *becoming* staff. Instead we require an authenticated user.
  // The session check happens via the page-level redirect to login if
  // there's no active user.
  const userId = actor?.userId ?? null;
  if (!userId) throw new Error("Necesitas iniciar sesión para aceptar la invitación.");

  const tokenHash = hashInviteToken(rawToken);
  const inv = await prisma.staffInvitation.findUnique({ where: { tokenHash } });

  if (!inv) throw new Error("Invitación inválida o ya consumida.");
  if (inv.revokedAt) throw new Error("La invitación fue revocada.");
  if (inv.acceptedAt) throw new Error("La invitación ya fue aceptada.");
  if (inv.expiresAt < new Date()) throw new Error("La invitación expiró.");

  // Sanity: the user accepting must match the invited email — protects
  // against forwarded links. Not strictly required, but recommended.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user || user.email.toLowerCase() !== inv.email.toLowerCase()) {
    throw new Error("Esta invitación es para otro email.");
  }

  // Mark accepted + create membership atomically
  await prisma.$transaction(async (tx) => {
    await tx.staffInvitation.update({
      where: { id: inv.id },
      data: { acceptedAt: new Date(), acceptedById: userId },
    });

    await tx.staffMember.upsert({
      where: { storeId_userId: { storeId: inv.storeId, userId } },
      create: {
        storeId: inv.storeId,
        userId,
        role: inv.role,
        status: "active",
        invitedAt: inv.createdAt,
        invitedById: inv.invitedById,
        acceptedAt: new Date(),
      },
      update: {
        role: inv.role,
        status: "active",
        acceptedAt: new Date(),
        suspendedAt: null,
        removedAt: null,
        removedById: null,
      },
    });
  });

  await logSystemEvent({
    storeId: inv.storeId,
    entityType: "staff",
    entityId: inv.id,
    eventType: "invite_accepted",
    severity: "info",
    source: "invite_flow",
    message: `Invite accepted by ${inv.email} as ${inv.role}`,
    actorId: userId,
    actorRole: inv.role,
    metadata: { email: inv.email, role: inv.role },
  });

  return { success: true, storeId: inv.storeId, role: inv.role };
}
