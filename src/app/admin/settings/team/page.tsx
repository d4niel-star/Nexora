import { redirect } from "next/navigation";
import { resolveActor } from "@/lib/rbac/guard";
import { roleHasPermission } from "@/lib/rbac/permissions";
import { listStaff, listPendingInvitations } from "@/lib/staff/queries";
import { TeamPageClient } from "./TeamPageClient";

// ─── /admin/settings/team ───────────────────────────────────────────
// Real staff management surface. Gated by `staff.read`. Mutations are
// gated server-side again on every action — UI hiding is informational
// only.

export default async function TeamPage() {
  const actor = await resolveActor();
  if (!actor) redirect("/admin/dashboard");
  if (!roleHasPermission(actor.role, "staff.read")) {
    redirect("/admin/settings");
  }

  const [staff, invitations] = await Promise.all([
    listStaff(actor.storeId),
    listPendingInvitations(actor.storeId),
  ]);

  const canInvite = roleHasPermission(actor.role, "staff.invite");
  const canManage = roleHasPermission(actor.role, "staff.manage");
  const canRemove = roleHasPermission(actor.role, "staff.remove");

  return (
    <TeamPageClient
      staff={staff}
      invitations={invitations}
      currentUserId={actor.userId}
      capabilities={{ canInvite, canManage, canRemove }}
    />
  );
}
