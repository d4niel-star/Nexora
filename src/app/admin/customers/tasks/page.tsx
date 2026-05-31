import { redirect } from "next/navigation";
import { resolveActor } from "@/lib/rbac/guard";
import { roleHasPermission } from "@/lib/rbac/permissions";
import { getTaskBuckets } from "@/lib/customers/tasks";
import { TasksHubClient } from "./TasksHubClient";

interface PageProps {
  searchParams: Promise<{ scope?: string }>;
}

export default async function CustomerTasksPage({ searchParams }: PageProps) {
  const actor = await resolveActor();
  if (!actor) redirect("/admin/dashboard");
  if (!roleHasPermission(actor.role, "customers.read")) {
    redirect("/admin/dashboard");
  }

  const sp = await searchParams;
  const scope = sp.scope === "mine" ? "mine" : "all";
  const buckets = await getTaskBuckets({
    storeId: actor.storeId,
    assignedToId: scope === "mine" ? actor.userId : undefined,
  });

  const canManage = roleHasPermission(actor.role, "customer.tasks.manage");
  return (
    <TasksHubClient
      buckets={buckets}
      scope={scope}
      currentUserId={actor.userId}
      canManage={canManage}
    />
  );
}
