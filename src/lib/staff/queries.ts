import { prisma } from "@/lib/db/prisma";

// ─── Staff Read Queries ──────────────────────────────────────────────
// Server-side only. Callers must ensure the requesting actor has
// `staff.read` (the page guard does this).

export interface StaffRow {
  id: string;
  userId: string | null;
  email: string;
  name: string | null;
  role: string;
  status: string;
  invitedAt: string | null;
  acceptedAt: string | null;
  suspendedAt: string | null;
  removedAt: string | null;
  lastActiveAt: string | null;
  createdAt: string;
  // Marker for the implicit owner row that doesn't actually live in
  // StaffMember; the UI uses this to disable role/remove controls.
  isOwner: boolean;
}

export interface InvitationRow {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export async function listStaff(storeId: string): Promise<StaffRow[]> {
  // Owner row (synthetic — not stored in StaffMember)
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { ownerId: true, owner: { select: { id: true, email: true, name: true, createdAt: true } } },
  });

  const members = await prisma.staffMember.findMany({
    where: { storeId, status: { not: "removed" } },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const rows: StaffRow[] = [];

  if (store?.owner) {
    rows.push({
      id: `owner:${store.owner.id}`,
      userId: store.owner.id,
      email: store.owner.email,
      name: store.owner.name,
      role: "owner",
      status: "active",
      invitedAt: null,
      acceptedAt: null,
      suspendedAt: null,
      removedAt: null,
      lastActiveAt: null,
      createdAt: store.owner.createdAt.toISOString(),
      isOwner: true,
    });
  }

  for (const m of members) {
    if (store?.ownerId && m.userId === store.ownerId) continue; // dedupe — owner already listed
    rows.push({
      id: m.id,
      userId: m.user.id,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      status: m.status,
      invitedAt: m.invitedAt?.toISOString() ?? null,
      acceptedAt: m.acceptedAt?.toISOString() ?? null,
      suspendedAt: m.suspendedAt?.toISOString() ?? null,
      removedAt: m.removedAt?.toISOString() ?? null,
      lastActiveAt: m.lastActiveAt?.toISOString() ?? null,
      createdAt: m.createdAt.toISOString(),
      isOwner: false,
    });
  }

  return rows;
}

export async function listPendingInvitations(storeId: string): Promise<InvitationRow[]> {
  const rows = await prisma.staffInvitation.findMany({
    where: { storeId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    expiresAt: r.expiresAt.toISOString(),
    acceptedAt: r.acceptedAt?.toISOString() ?? null,
    revokedAt: r.revokedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}
