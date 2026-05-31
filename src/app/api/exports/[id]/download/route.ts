import { NextResponse } from "next/server";
import { resolveActor } from "@/lib/rbac/guard";
import { roleHasPermission } from "@/lib/rbac/permissions";
import { getArtifactForDownload, markDownloaded } from "@/lib/exports/storage";
import { logSystemEvent } from "@/lib/observability/audit";

// ─── Export Download (Phase 7D.4) ────────────────────────────────────
// Authenticated download endpoint. Validates:
//   1. Caller has an active staff session at the artifact's store.
//   2. Caller carries `exports.manage` (the same gate used to enqueue).
//   3. Artifact exists, is ready, hasn't expired.
//
// Each successful download bumps `downloadedAt` + `downloadCount` and
// fires an `export_downloaded` audit event so the merchant can prove
// who exfiltrated which dataset and when (GDPR Art. 30 ready).

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const actor = await resolveActor();
  if (!actor) return new NextResponse("Unauthorized", { status: 401 });
  if (!roleHasPermission(actor.role, "exports.manage")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const result = await getArtifactForDownload(id, actor.storeId);
  if (!result.ok) {
    if (result.reason === "not_found") return new NextResponse("Not found", { status: 404 });
    if (result.reason === "expired") return new NextResponse("Export expired", { status: 410 });
    if (result.reason === "not_ready") return new NextResponse("Export still processing", { status: 425 });
    return new NextResponse("Forbidden", { status: 403 });
  }

  await markDownloaded(id);
  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "export",
    entityId: id,
    eventType: "export_downloaded",
    severity: "info",
    source: "admin_panel",
    message: `Export descargado: ${result.filename}`,
    actorId: actor.userId,
    actorRole: actor.role,
    correlationId: id,
    metadata: { type: result.type, fileSize: result.csv.length },
  }).catch(() => undefined);

  return new NextResponse(result.csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
