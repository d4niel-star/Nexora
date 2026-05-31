import { notFound, redirect } from "next/navigation";
import { resolveActor } from "@/lib/rbac/guard";
import { roleHasPermission } from "@/lib/rbac/permissions";
import { getCustomerProfile } from "@/lib/customers/profile";
import { getCustomerTimeline } from "@/lib/customers/timeline";
import { classifyCustomer } from "@/lib/customers/segments";
import { classifyHealth } from "@/lib/customers/health";
import { listCustomerNotes } from "@/lib/customers/notes-actions";
import { listTagsForCustomer } from "@/lib/customers/tags-actions";
import { listTasksForCustomer } from "@/lib/customers/tasks";
import { logSystemEvent } from "@/lib/observability/audit";
import { CustomerProfileClient } from "./CustomerProfileClient";

interface PageProps {
  // [customerId] is the URL-encoded email — we use email as the customer
  // identifier because Nexora doesn't have a Customer table by design.
  params: Promise<{ customerId: string }>;
}

export default async function CustomerProfilePage({ params }: PageProps) {
  const actor = await resolveActor();
  if (!actor) redirect("/admin/dashboard");
  if (!roleHasPermission(actor.role, "customers.read")) {
    redirect("/admin/dashboard");
  }

  const { customerId } = await params;
  const customerEmail = decodeURIComponent(customerId).toLowerCase();
  if (!customerEmail.includes("@")) notFound();

  const profile = await getCustomerProfile(actor.storeId, customerEmail);
  if (!profile) notFound();

  const stats = {
    email: profile.email,
    totalOrders: profile.commercial.totalOrders,
    lifetimeValue: profile.commercial.lifetimeValue,
    refundedTotal: profile.commercial.refundedTotal,
    cancellationRate: profile.commercial.cancellationRate,
    lastOrderAt: profile.identity.lastOrderAt,
    firstOrderAt: profile.identity.firstOrderAt,
    abandonedCarts: profile.operational.abandonedCarts,
    currency: profile.commercial.currency,
  };
  const segments = classifyCustomer(stats);
  const health = classifyHealth({ stats });

  const [timeline, notes, tags, tasks] = await Promise.all([
    getCustomerTimeline(actor.storeId, customerEmail),
    listCustomerNotes(actor.storeId, customerEmail, actor.userId, actor.role),
    listTagsForCustomer(actor.storeId, customerEmail),
    listTasksForCustomer(actor.storeId, customerEmail),
  ]);

  // Audit-log the access — viewing a customer profile is a sensitive
  // read in regulated regimes (GDPR-ready architecture).
  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "customer",
    entityId: customerEmail,
    eventType: "customer_profile_viewed",
    severity: "info",
    source: "admin_panel",
    message: `Customer profile viewed: ${customerEmail}`,
    actorId: actor.userId,
    actorRole: actor.role,
  }).catch(() => undefined);

  const canManageNotes = roleHasPermission(actor.role, "customer.notes.manage");
  const canManageTags = roleHasPermission(actor.role, "customer.tags.manage");
  const canManageTasks = roleHasPermission(actor.role, "customer.tasks.manage");

  return (
    <CustomerProfileClient
      profile={profile}
      segments={segments}
      health={health}
      timeline={timeline}
      notes={notes}
      tags={tags}
      tasks={tasks}
      capabilities={{ canManageNotes, canManageTags, canManageTasks }}
    />
  );
}
