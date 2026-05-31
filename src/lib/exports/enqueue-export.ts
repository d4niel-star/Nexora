"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac/guard";
import { requireRateLimit } from "@/lib/rate-limit";
import { logSystemEvent } from "@/lib/observability/audit";
import { enqueueJob } from "@/lib/jobs/queue";
import { createPendingArtifact, attachJobIdToArtifact } from "./storage";

// ─── Export Producer (Phase 7D.4) ────────────────────────────────────
// Single entry point for "merchant clicks Export" → durable artifact.
//
// Flow:
//   1. RBAC + rate-limit (10/hour per actor — prevents storage flood).
//   2. Insert ExportArtifact (status=pending) so the user gets an ID
//      to poll immediately.
//   3. Enqueue a job (export.<type>) with payload.artifactId.
//   4. Audit-log `export_requested` correlated to artifactId + jobId.
//   5. Worker picks up the job → handler streams CSV → flips to ready.

const EXPORT_TYPES = new Set(["customers", "orders", "inventory", "analytics"]);

export interface EnqueueExportInput {
  type: "customers" | "orders" | "inventory" | "analytics";
}

export async function enqueueExportAction(input: EnqueueExportInput): Promise<{ artifactId: string; jobId: string }> {
  if (!EXPORT_TYPES.has(input.type)) {
    throw new Error(`Tipo de export inválido: ${input.type}`);
  }

  const actor = await requirePermission("exports.manage");

  // 10/hour cap is the hardest of all our rate limits because each
  // export touches the DB heavily and produces a large blob.
  await requireRateLimit({
    key: `exports:user:${actor.userId}`,
    limit: 10,
    windowMs: 60 * 60_000,
    route: `exports.${input.type}`,
    actorId: actor.userId,
    storeId: actor.storeId,
  });

  const filename = `nexora-${input.type}-${new Date().toISOString().slice(0, 10)}-${Date.now()}.csv`;
  const { id: artifactId } = await createPendingArtifact({
    storeId: actor.storeId,
    type: input.type,
    filename,
    createdById: actor.userId,
  });

  const { id: jobId } = await enqueueJob({
    type: `export.${input.type}`,
    storeId: actor.storeId,
    actorId: actor.userId,
    payload: { artifactId },
    correlationId: artifactId,
  });
  await attachJobIdToArtifact(artifactId, jobId);

  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "export",
    entityId: artifactId,
    eventType: "export_requested",
    severity: "info",
    source: "admin_panel",
    message: `Export solicitado (${input.type})`,
    actorId: actor.userId,
    actorRole: actor.role,
    correlationId: artifactId,
    metadata: { type: input.type, jobId },
  });

  revalidatePath("/admin/operations");
  return { artifactId, jobId };
}
