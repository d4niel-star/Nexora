"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac/guard";
import { logSystemEvent } from "@/lib/observability/logger";
import { retryJob, cancelJob, runDueJobs } from "./queue";

// ─── Operations Center server actions ────────────────────────────────
// Every action goes through the RBAC guard and writes a SystemEvent for
// audit traceability.

export async function retryJobAction(jobId: string) {
  const actor = await requirePermission("operations.retry");
  await retryJob(jobId);
  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "job",
    entityId: jobId,
    eventType: "job_retry_manual",
    severity: "info",
    source: "operations_center",
    message: `Job retried manually by ${actor.role}`,
    actorId: actor.userId,
    actorRole: actor.role,
  });
  revalidatePath("/admin/operations");
  return { success: true };
}

export async function cancelJobAction(jobId: string) {
  const actor = await requirePermission("operations.cancel");
  await cancelJob(jobId);
  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "job",
    entityId: jobId,
    eventType: "job_cancelled_manual",
    severity: "info",
    source: "operations_center",
    message: `Job cancelled manually by ${actor.role}`,
    actorId: actor.userId,
    actorRole: actor.role,
  });
  revalidatePath("/admin/operations");
  return { success: true };
}

export async function runDueJobsAction() {
  const actor = await requirePermission("operations.retry");
  const result = await runDueJobs({ limit: 25, workerId: `manual:${actor.userId}` });
  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "job",
    eventType: "job_drain_manual",
    severity: "info",
    source: "operations_center",
    message: `Manual drain: ${result.processed} processed (${result.succeeded} ok, ${result.failed} failed)`,
    actorId: actor.userId,
    actorRole: actor.role,
    metadata: result,
  });
  revalidatePath("/admin/operations");
  return result;
}
