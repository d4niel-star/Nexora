// ─── Pickup reservation expiration · HTTP entrypoint ──────────────────
//
// Releases `LocalInventory.stock` that has been reserved by pickup
// orders whose payment never landed. The heavy lifting lives in the
// shared core service so CLI, cron and manual invocations behave
// identically.
//
// Protection: header `x-cron-secret` must equal `CRON_SECRET`. Mirrors
// the pattern of `/api/cron/abandoned-carts` so an operator only has
// to memorise one secret. If `CRON_SECRET` is not set the endpoint
// answers 503 on both GET and POST — this prevents accidental open
// access in environments where the env was forgotten.
//
// Body (JSON, optional):
//   {
//     "dryRun": true,               // no writes, read-only smoke
//     "olderThanMinutes": 60,       // override TTL for this call
//     "limit": 100                  // max orders processed this run
//   }
//
// A JSON body is never required: Render Cron and most uptime
// services just POST with empty bodies. We accept "application/json"
// and fall back gracefully if the body is empty.

import { NextRequest, NextResponse } from "next/server";

import { logSystemEvent } from "@/lib/observability/audit";
import {
  expireAbandonedPickupReservations,
  type ExpireAbandonedPickupOptions,
} from "@/lib/store-engine/pickup/expire-reservations";

export const runtime = "nodejs";

function parseOptions(body: unknown): ExpireAbandonedPickupOptions {
  if (!body || typeof body !== "object") return {};
  const raw = body as Record<string, unknown>;
  const out: ExpireAbandonedPickupOptions = {};
  if (typeof raw.dryRun === "boolean") out.dryRun = raw.dryRun;
  if (typeof raw.olderThanMinutes === "number" && Number.isFinite(raw.olderThanMinutes)) {
    out.olderThanMinutes = raw.olderThanMinutes;
  }
  if (typeof raw.limit === "number" && Number.isFinite(raw.limit)) {
    out.limit = raw.limit;
  }
  return out;
}

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "cron_secret_not_configured" },
      { status: 503 },
    );
  }

  // Accept either the x-cron-secret header (shared with the other
  // cron routes) or a Bearer token for ops tooling convenience. Both
  // go through the same timing-agnostic equality check — these are
  // shared secrets, not user credentials.
  const headerSecret =
    request.headers.get("x-cron-secret") ||
    request.headers.get("x-job-secret") ||
    null;
  const authHeader = request.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;
  const provided = headerSecret || bearerSecret;
  if (!provided || provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Body is optional. When present we parse carefully so garbage
  // input does not 500 the endpoint — every knob has a safe default.
  let options: ExpireAbandonedPickupOptions = {};
  try {
    const text = await request.text();
    if (text.trim().length > 0) {
      options = parseOptions(JSON.parse(text));
    }
  } catch {
    return NextResponse.json({ error: "invalid_json_body" }, { status: 400 });
  }

  try {
    const summary = await expireAbandonedPickupReservations({
      ...options,
      source: "endpoint",
    });

    // One audit row per run so operators can see the job actually
    // executed in production, even if no order matched. Keeps a
    // queryable history at SystemEvent(entityType=job).
    await logSystemEvent({
      entityType: "job",
      entityId: "pickup_expire",
      eventType: "pickup_reservation_expire_run",
      severity: summary.errors > 0 ? "warn" : "info",
      source: "cron_endpoint",
      message: `Pickup expiration run: scanned=${summary.scanned} expired=${summary.expired} restored=${summary.restored} errors=${summary.errors}`,
      metadata: {
        scanned: summary.scanned,
        expired: summary.expired,
        restored: summary.restored,
        skippedPaid: summary.skippedPaid,
        skippedAlreadyExpired: summary.skippedAlreadyExpired,
        skippedAlreadyRestored: summary.skippedAlreadyRestored,
        skippedNotDecremented: summary.skippedNotDecremented,
        skippedRace: summary.skippedRace,
        errors: summary.errors,
        ttlMinutes: summary.ttlMinutes,
        dryRun: summary.dryRun,
      },
    });

    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    await logSystemEvent({
      entityType: "job",
      entityId: "pickup_expire",
      eventType: "pickup_reservation_expire_run_failed",
      severity: "critical",
      source: "cron_endpoint",
      message: `Pickup expiration run failed: ${message}`,
    });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function GET() {
  // Health check only — never exposes any state. Useful so the
  // operator can curl the URL to confirm the route is registered
  // without having to craft a signed request.
  const secretConfigured = Boolean(process.env.CRON_SECRET);
  return NextResponse.json({
    status: secretConfigured
      ? "cron_pickup_expire_active"
      : "cron_secret_not_configured",
    ttlMinutesDefault: Number.parseInt(
      process.env.PICKUP_RESERVATION_TTL_MINUTES ?? "60",
      10,
    ),
  });
}
