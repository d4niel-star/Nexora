import { redirect } from "next/navigation";
import { resolveActor } from "@/lib/rbac/guard";
import { getJobSummary, listJobs } from "@/lib/jobs/queries";
import { getSystemHealthReport } from "@/lib/observability/health";
import { OperationsCenterClient } from "./OperationsCenterClient";

// ─── Operations Center (Phase 7A) ─────────────────────────────────────
// Real operational dashboard for the platform: queue health, failed
// jobs, system warnings, audit timeline. Gated by `operations.read`
// permission.

export default async function OperationsCenterPage() {
  const actor = await resolveActor();
  if (!actor) redirect("/admin/dashboard");
  // Permission: only roles with operations.read can view this page
  const { roleHasPermission } = await import("@/lib/rbac/permissions");
  if (!roleHasPermission(actor.role, "operations.read")) {
    redirect("/admin/dashboard");
  }

  const [summary, recentJobs, failedJobs, deadJobs, health] = await Promise.all([
    getJobSummary(actor.storeId),
    listJobs({ storeId: actor.storeId, limit: 25 }),
    listJobs({ storeId: actor.storeId, status: "failed", limit: 25 }),
    listJobs({ storeId: actor.storeId, status: "dead", limit: 25 }),
    getSystemHealthReport(),
  ]);

  return (
    <OperationsCenterClient
      summary={summary}
      recentJobs={recentJobs}
      failedJobs={failedJobs}
      deadJobs={deadJobs}
      health={health}
      actorRole={actor.role}
    />
  );
}
