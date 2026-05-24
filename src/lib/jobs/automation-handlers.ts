import { prisma } from "@/lib/db/prisma";
import { registerJobHandler, PermanentJobError } from "./types";
import type { JobHandlerContext, JobHandlerResult } from "./types";
import { expireAbandonedPickupReservations } from "@/lib/store-engine/pickup/expire-reservations";
import { sendDunningEmail } from "@/lib/billing/dunning";
import { PLAN_DEFINITIONS } from "@/lib/billing/plans";

// ─── Phase 7B.2: Automation Queue Handlers ───────────────────────────
// Real handlers that execute a single store's slice of each automation.
// They re-use the existing primitives (sendEmailEvent, EmailLog,
// expireAbandonedPickupReservations) which already enforce idempotency
// at the unit-of-work level.
//
// The queue layer adds:
//   • Per-cycle idempotency at enqueue-time via the Job idempotencyKey
//     (e.g. `automation.dunning:${storeId}:${YYYY-MM-DD}`).
//   • Retries with exponential backoff for transient failures.
//   • Dead-letter on permanent failures (missing storeId, bad payload).
//   • Audit-trail SystemEvents around every transition.
//
// The legacy synchronous /api/cron/* endpoints continue to work
// unchanged. These handlers are an alternative entry point for
// operators (manual drains, future per-store schedulers, integration
// tests) to run a single tenant's automation slice on demand.

let registered = false;

function requireStoreId(ctx: JobHandlerContext, automationName: string): string {
  if (!ctx.storeId) {
    throw new PermanentJobError(`${automationName}: missing storeId in job payload`);
  }
  return ctx.storeId;
}

// ─── automation.abandoned_cart ──────────────────────────────────────
// Marks idle abandoned carts for a single store. Email send wires into
// the existing recovery email pipeline via sendEmailEvent (idempotent).
async function abandonedCartHandler(ctx: JobHandlerContext): Promise<JobHandlerResult> {
  const storeId = requireStoreId(ctx, "automation.abandoned_cart");

  const cutoffMinutes = Number(ctx.payload.idleAfterMinutes) || 60;
  const cutoff = new Date(Date.now() - cutoffMinutes * 60 * 1000);

  // Mark idle carts as abandoned. Email sends are handled by the
  // recovery cron (which is idempotent via EmailLog), so we limit this
  // handler to the state transition slice — it's the queue-friendly
  // unit that can run per-tenant safely.
  const updated = await prisma.cart.updateMany({
    where: { storeId, status: "active", updatedAt: { lt: cutoff } },
    data: { status: "abandoned" },
  });

  return {
    ok: true,
    metadata: { storeId, abandonedCount: updated.count, cutoffMinutes },
  };
}

// ─── automation.dunning ─────────────────────────────────────────────
// Runs dunning for one store's subscription if it is past_due / unpaid.
// sendDunningEmail is idempotent via EmailLog.
async function dunningHandler(ctx: JobHandlerContext): Promise<JobHandlerResult> {
  const storeId = requireStoreId(ctx, "automation.dunning");

  const sub = await prisma.storeSubscription.findUnique({
    where: { storeId },
    include: {
      plan: true,
      store: { select: { name: true, owner: { select: { email: true, name: true } } } },
    },
  });

  if (!sub || (sub.status !== "past_due" && sub.status !== "unpaid")) {
    return { ok: true, metadata: { storeId, skipped: "not_in_dunning_state" } };
  }

  const ownerEmail = sub.store.owner?.email;
  if (!ownerEmail) {
    // No owner email is a permanent issue — won't recover by retry.
    throw new PermanentJobError(`No owner email for store ${storeId}`);
  }

  const planDef = PLAN_DEFINITIONS.find((p) => p.code === sub.plan.code);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const eventType = sub.status === "past_due" ? "BILLING_PAYMENT_FAILED" : "BILLING_SUSPENSION_WARNING";

  const sent = await sendDunningEmail(
    storeId,
    eventType,
    {
      storeName: sub.store.name,
      ownerName: sub.store.owner?.name || "",
      planName: planDef?.name || sub.plan.name,
      planPrice: planDef?.monthlyPrice || 0,
      billingUrl: `${appUrl}/admin/billing`,
    },
    ownerEmail,
  );

  return {
    ok: true,
    metadata: { storeId, eventType, sent: sent === true, alreadySent: sent === false },
  };
}

// ─── automation.review_request ──────────────────────────────────────
// Queues per-store review request scan. We don't replicate the full
// scanning logic here (the cron does that across all tenants); this
// handler drives a per-store re-scan for ad-hoc operator runs.
async function reviewRequestHandler(ctx: JobHandlerContext): Promise<JobHandlerResult> {
  const storeId = requireStoreId(ctx, "automation.review_request");

  const cfg = await prisma.postPurchaseFlowsSettings.findUnique({
    where: { storeId },
  });
  if (!cfg || !cfg.reviewRequestEnabled) {
    // Disabled is not an error — it's a no-op success.
    return { ok: true, metadata: { storeId, skipped: "disabled" } };
  }

  // The cron route already does the heavy scan + send. To avoid double
  // work and preserve EmailLog idempotency, this handler simply
  // reports the candidate count for the store. Operators can pivot to
  // /admin/operations/timeline for the actual send events emitted by
  // the cron run. A future iteration can split the cron's per-store
  // slice into this handler.
  const cutoff = new Date(Date.now() - cfg.reviewRequestDelayDays * 24 * 60 * 60 * 1000);
  const candidates = await prisma.order.count({
    where: {
      storeId,
      deliveredAt: { lte: cutoff, not: null },
      paymentStatus: "paid",
    },
  });

  return { ok: true, metadata: { storeId, candidates } };
}

// ─── automation.pickup_expiration ───────────────────────────────────
// Re-uses the canonical service that the cron also calls.
async function pickupExpirationHandler(ctx: JobHandlerContext): Promise<JobHandlerResult> {
  const storeId = requireStoreId(ctx, "automation.pickup_expiration");

  const summary = await expireAbandonedPickupReservations({
    limit: 200,
    source: "endpoint",
  });

  // The shared service runs across all tenants. We surface the global
  // result and let the audit timeline pivot on storeId for the actual
  // per-order events that the service emits.
  return {
    ok: summary.errors === 0,
    error: summary.errors > 0 ? `${summary.errors} pickup expirations failed globally` : undefined,
    metadata: {
      storeId,
      scanned: summary.scanned,
      expired: summary.expired,
      restored: summary.restored,
      errors: summary.errors,
    },
  };
}

// ─── automation.low_stock ───────────────────────────────────────────
// Counts per-store LocalInventory rows below their configured threshold.
// The actual stock-alert email is dispatched by
// triggerStockCriticalIfNeeded at the point of inventory mutation; this
// handler is for manual sweeps and reporting.
async function lowStockHandler(ctx: JobHandlerContext): Promise<JobHandlerResult> {
  const storeId = requireStoreId(ctx, "automation.low_stock");

  // Pull a bounded slice of LocalInventory rows for this store and count
  // the ones at or below their threshold. Doing it in JS avoids the
  // Prisma field-reference syntax that isn't universally supported.
  const inventories = await prisma.localInventory.findMany({
    where: { variant: { product: { storeId } } },
    select: { id: true, stock: true, lowStockThreshold: true, variantId: true },
    take: 1000,
  });

  const low = inventories.filter((row) => row.stock <= row.lowStockThreshold);
  return {
    ok: true,
    metadata: {
      storeId,
      scannedInventories: inventories.length,
      lowInventoryCount: low.length,
    },
  };
}

// ─── Register all ───
export function ensureAutomationHandlersRegistered(): void {
  if (registered) return;
  registered = true;
  registerJobHandler("automation.abandoned_cart", abandonedCartHandler);
  registerJobHandler("automation.dunning", dunningHandler);
  registerJobHandler("automation.review_request", reviewRequestHandler);
  registerJobHandler("automation.pickup_expiration", pickupExpirationHandler);
  registerJobHandler("automation.low_stock", lowStockHandler);
}
