import { prisma } from "@/lib/db/prisma";
import { getCurrentUser, getCurrentStore } from "@/lib/auth/session";
import { roleHasPermission, type Permission, type StaffRole } from "./permissions";

// ─── RBAC Guards ─────────────────────────────────────────────────────
// Server-side enforcement of role-based permissions. Always run as the
// first line of any sensitive server action.
//
// resolveActor() determines the role of the current user for the active
// store:
//   1. If they own the store → "owner"
//   2. If they have a StaffMember row with status="active" → that role
//   3. Otherwise → null (no access)
//
// requirePermission() throws if the actor lacks the permission. It also
// returns the resolved actor so callers can attach actorId/actorRole to
// audit events without an extra DB roundtrip.

export interface ResolvedActor {
  userId: string;
  storeId: string;
  role: StaffRole;
}

export async function resolveActor(): Promise<ResolvedActor | null> {
  const [user, store] = await Promise.all([getCurrentUser(), getCurrentStore()]);
  if (!user || !store) return null;

  // Owner check
  if (store.ownerId === user.id) {
    return { userId: user.id, storeId: store.id, role: "owner" };
  }

  // Staff lookup
  const staff = await prisma.staffMember.findUnique({
    where: { storeId_userId: { storeId: store.id, userId: user.id } },
    select: { role: true, status: true },
  });
  if (!staff || staff.status !== "active") return null;

  // Defensive: only known role strings
  const role = staff.role as StaffRole;
  return { userId: user.id, storeId: store.id, role };
}

export async function requirePermission(perm: Permission): Promise<ResolvedActor> {
  const actor = await resolveActor();
  if (!actor) {
    throw new RbacError("UNAUTHENTICATED", `No active staff session for permission: ${perm}`);
  }
  if (!roleHasPermission(actor.role, perm)) {
    throw new RbacError("FORBIDDEN", `Role ${actor.role} lacks permission: ${perm}`);
  }
  return actor;
}

export async function hasPermission(perm: Permission): Promise<boolean> {
  const actor = await resolveActor();
  return actor ? roleHasPermission(actor.role, perm) : false;
}

export class RbacError extends Error {
  code: "UNAUTHENTICATED" | "FORBIDDEN";
  constructor(code: "UNAUTHENTICATED" | "FORBIDDEN", message: string) {
    super(message);
    this.code = code;
    this.name = "RbacError";
  }
}
