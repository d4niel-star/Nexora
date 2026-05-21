import { NextRequest, NextResponse } from "next/server";
import { runDueJobs } from "@/lib/jobs/queue";
import { ensureJobHandlersRegistered } from "@/lib/jobs/handlers";
import { logSystemEvent } from "@/lib/observability/audit";

// ─── Cron: Jobs Queue Drain (Phase 7A) ────────────────────────────────
// Pulls due jobs from the persistent queue and runs them. Designed to be
// invoked every minute by a scheduler (Render Cron, Vercel Cron, etc.)
// via POST with the shared `x-cron-secret` header — same protection
// pattern used by the rest of Nexora's cron endpoints.
//
// The endpoint is bounded: at most 25 jobs per run. If the backlog
// grows the next run will pick up the rest. Pending backlog and dead
// jobs are surfaced in /admin/operations and the system health report.

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cron_secret_not_configured" }, { status: 503 });
  }
  const provided = request.headers.get("x-cron-secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Ensure handlers are loaded before we try to dispatch
  ensureJobHandlersRegistered();

  try {
    const result = await runDueJobs({ limit: 25, workerId: `cron:${Date.now()}` });
    await logSystemEvent({
      storeId: "system",
      entityType: "cron",
      entityId: "jobs-drain",
      eventType: "jobs_drain_run",
      severity: result.failed > 0 ? "warn" : "info",
      source: "cron",
      message: `Jobs drain: ${result.processed} procesados, ${result.succeeded} ok, ${result.failed} fallidos`,
      metadata: result,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    await logSystemEvent({
      storeId: "system",
      entityType: "cron",
      entityId: "jobs-drain",
      eventType: "jobs_drain_failed",
      severity: "critical",
      source: "cron",
      message: `Jobs drain failed: ${msg}`,
    }).catch(() => undefined);
    return NextResponse.json({ error: "internal_error", message: msg }, { status: 500 });
  }
}

export async function GET() {
  const ok = Boolean(process.env.CRON_SECRET);
  return NextResponse.json({ status: ok ? "cron_jobs_drain_active" : "cron_secret_not_configured" });
}
