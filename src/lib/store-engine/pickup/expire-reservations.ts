// ─── Pickup reservation expiration · core service ───────────────────────
//
// Pickup orders decrement `LocalInventory.stock` inside the same
// transaction that creates the Order (see `initiatePayment` in
// `src/lib/payments/mercadopago/actions.ts`). If Mercado Pago never
// emits a terminal status (buyer abandons the wallet, MP dashboard
// stalls, webhook is throttled, …) the order sits in
// `paymentStatus='pending'` forever and the reserved stock is never
// released.
//
// This service walks through every candidate, verifies that the order
// is not secretly paid, cancels the order, and releases the pickup
// local stock idempotently via the existing helper. It never touches
// `ProductVariant.stock` and never touches shipping orders.
//
// The same function backs three surfaces:
//   · `scripts/expire-pickup-reservations.ts`          (CLI)
//   · `src/app/api/cron/expire-pickup-reservations/…`  (HTTP, cron)
//   · manual invocation from a REPL / debugger
//
// Safety contract:
//   1. Never expire an order with `paymentStatus` in
//      (`paid`, `approved`, `refunded`) or `status` in
//      (`paid`, `cancelled`, `refunded`).
//   2. Never expire an order that has any `Payment.status='approved'`
//      row, even if the webhook has not reconciled yet.
//   3. Stock release is idempotent at two layers:
//        a. our order-level gate (UPDATE … WHERE paymentStatus='pending'
//           AND status='new' returns 0 rows on a second pass);
//        b. the helper's SystemEvent gate (decremented → restored).
//   4. Order history is preserved — we flip status flags and write
//      audit events, never DELETE.

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { logSystemEvent } from "@/lib/observability/audit";
import { restorePickupLocalStockForOrderTx } from "@/lib/store-engine/pickup/local-stock";

type Tx = Prisma.TransactionClient;

export type ExpirationSource = "manual" | "endpoint" | "script" | "opportunistic";

export interface ExpireAbandonedPickupOptions {
  /** Age threshold in minutes. Falls back to env or default. */
  olderThanMinutes?: number;
  /** Max orders to process per run. Defaults to 200. */
  limit?: number;
  /** How this run was triggered — stored verbatim in audit events. */
  source?: ExpirationSource;
  /** If true, perform every read but write nothing. */
  dryRun?: boolean;
}

export interface ExpireAbandonedPickupSummary {
  scanned: number;
  expired: number;
  restored: number;
  skippedPaid: number;
  skippedAlreadyExpired: number;
  skippedAlreadyRestored: number;
  skippedNotDecremented: number;
  skippedRace: number;
  errors: number;
  errorDetails: Array<{ orderId: string; message: string }>;
  ttlMinutes: number;
  cutoff: string;
  dryRun: boolean;
  source: ExpirationSource;
  expiredOrders: Array<{
    orderId: string;
    orderNumber: string;
    storeId: string;
    ageMinutes: number;
    restored: boolean;
  }>;
}

// Sensible default TTL. Mercado Pago normally settles within minutes;
// 60 minutes is wide enough to tolerate slow bank auths and narrow
// enough to avoid hoarding stock.
const DEFAULT_TTL_MINUTES = 60;
// Paranoid upper bound — never scan beyond this even if the caller
// tries to override it, so a bad CLI flag cannot walk the entire
// table in a single run.
const MAX_LIMIT = 500;

function resolveTtlMinutes(explicit?: number): number {
  if (typeof explicit === "number" && Number.isFinite(explicit) && explicit > 0) {
    return Math.floor(explicit);
  }
  const envRaw = process.env.PICKUP_RESERVATION_TTL_MINUTES;
  if (envRaw) {
    const parsed = Number.parseInt(envRaw, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_TTL_MINUTES;
}

function resolveLimit(explicit?: number): number {
  const raw = typeof explicit === "number" && Number.isFinite(explicit) && explicit > 0
    ? Math.floor(explicit)
    : 200;
  return Math.min(raw, MAX_LIMIT);
}

/**
 * Main entry point. Detects abandoned pickup reservations past the
 * TTL and releases their local stock atomically and idempotently.
 *
 * The function NEVER throws on per-order failures — they are captured
 * in `summary.errors` / `summary.errorDetails` so the overall job can
 * report a complete picture even if one order is broken.
 */
export async function expireAbandonedPickupReservations(
  options: ExpireAbandonedPickupOptions = {},
): Promise<ExpireAbandonedPickupSummary> {
  const ttlMinutes = resolveTtlMinutes(options.olderThanMinutes);
  const limit = resolveLimit(options.limit);
  const source: ExpirationSource = options.source ?? "manual";
  const dryRun = Boolean(options.dryRun);

  const now = new Date();
  const cutoff = new Date(now.getTime() - ttlMinutes * 60_000);

  const summary: ExpireAbandonedPickupSummary = {
    scanned: 0,
    expired: 0,
    restored: 0,
    skippedPaid: 0,
    skippedAlreadyExpired: 0,
    skippedAlreadyRestored: 0,
    skippedNotDecremented: 0,
    skippedRace: 0,
    errors: 0,
    errorDetails: [],
    ttlMinutes,
    cutoff: cutoff.toISOString(),
    dryRun,
    source,
    expiredOrders: [],
  };

  // ── Candidate lookup ────────────────────────────────────────────
  // `Order.shippingMethodId` is a plain FK column (no Prisma
  // relation object), so we pre-resolve every pickup method id and
  // filter the orders by `IN`. The set is very small (one or two
  // rows per store) and must include BOTH active and inactive methods
  // — a merchant who disables pickup after an order was placed still
  // needs the stock released.
  const pickupMethods = await prisma.shippingMethod.findMany({
    where: { type: "pickup" },
    select: { id: true },
  });
  const pickupMethodIds = pickupMethods.map((m) => m.id);

  const candidates = pickupMethodIds.length === 0
    ? []
    : await prisma.order.findMany({
        where: {
          createdAt: { lt: cutoff },
          paymentStatus: "pending",
          status: "new",
          cancelledAt: null,
          shippingStatus: { notIn: ["delivered", "cancelled"] },
          shippingMethodId: { in: pickupMethodIds },
        },
        select: {
          id: true,
          orderNumber: true,
          storeId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
        take: limit,
      });

  summary.scanned = candidates.length;

  for (const candidate of candidates) {
    try {
      const ageMinutes = Math.floor((now.getTime() - candidate.createdAt.getTime()) / 60_000);
      const outcome = await processCandidate({
        order: candidate,
        cutoffIso: cutoff.toISOString(),
        ttlMinutes,
        source,
        dryRun,
      });

      if (outcome.kind === "skipped_paid") summary.skippedPaid += 1;
      else if (outcome.kind === "skipped_already_expired") summary.skippedAlreadyExpired += 1;
      else if (outcome.kind === "skipped_already_restored") summary.skippedAlreadyRestored += 1;
      else if (outcome.kind === "skipped_not_decremented") summary.skippedNotDecremented += 1;
      else if (outcome.kind === "skipped_race") summary.skippedRace += 1;
      else if (outcome.kind === "expired") {
        summary.expired += 1;
        if (outcome.restored) summary.restored += 1;
        summary.expiredOrders.push({
          orderId: candidate.id,
          orderNumber: candidate.orderNumber,
          storeId: candidate.storeId,
          ageMinutes,
          restored: outcome.restored,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown_error";
      summary.errors += 1;
      summary.errorDetails.push({ orderId: candidate.id, message });
      // Best-effort audit; never break the loop.
      logSystemEvent({
        storeId: candidate.storeId,
        entityType: "order",
        entityId: candidate.id,
        eventType: "pickup_reservation_expire_failed",
        severity: "error",
        source: `pickup_expire_${source}`,
        message: `Expiración pickup falló para ${candidate.orderNumber}: ${message}`,
        metadata: { ageMinutesApprox: Math.floor((now.getTime() - candidate.createdAt.getTime()) / 60_000) },
      }).catch(() => {
        /* audit is best-effort */
      });
    }
  }

  return summary;
}

// ─── Per-order pipeline ───────────────────────────────────────────────
//
// We run every write for a single order inside one Prisma transaction
// so the order update and the stock restore either both land or none
// do. The helper `restorePickupLocalStockForOrderTx` carries its own
// SystemEvent-based idempotency, so repeated runs are safe.

type CandidateOutcome =
  | { kind: "expired"; restored: boolean }
  | { kind: "skipped_paid" }
  | { kind: "skipped_already_expired" }
  | { kind: "skipped_already_restored" }
  | { kind: "skipped_not_decremented" }
  | { kind: "skipped_race" };

async function processCandidate(params: {
  order: { id: string; orderNumber: string; storeId: string; createdAt: Date };
  cutoffIso: string;
  ttlMinutes: number;
  source: ExpirationSource;
  dryRun: boolean;
}): Promise<CandidateOutcome> {
  const { order, ttlMinutes, source, dryRun } = params;

  // ── Fast read-only gates (outside the transaction) ───────────────
  // Hit the cheap, indexed checks first so a paid order or an already
  // expired one never gets a write transaction opened.
  const fresh = await prisma.order.findUnique({
    where: { id: order.id },
    select: {
      id: true,
      paymentStatus: true,
      status: true,
      cancelledAt: true,
      shippingStatus: true,
    },
  });

  if (!fresh) return { kind: "skipped_already_expired" };

  // Already terminal → nothing to do. Cancelled orders may still be
  // unpaid; we treat them as already expired so we don't re-audit.
  if (
    fresh.cancelledAt !== null ||
    fresh.status === "cancelled" ||
    fresh.status === "paid" ||
    fresh.status === "refunded"
  ) {
    return { kind: "skipped_already_expired" };
  }

  if (
    fresh.paymentStatus === "paid" ||
    fresh.paymentStatus === "approved" ||
    fresh.paymentStatus === "refunded"
  ) {
    return { kind: "skipped_paid" };
  }

  // Paranoid cross-check: a Payment may already be approved even if
  // the webhook has not reconciled Order.paymentStatus yet. This is
  // the single most dangerous case — cancelling here would release
  // stock for a real sale.
  const approvedPayment = await prisma.payment.findFirst({
    where: { orderId: order.id, status: "approved" },
    select: { id: true },
  });
  if (approvedPayment) {
    logSystemEvent({
      storeId: order.storeId,
      entityType: "order",
      entityId: order.id,
      eventType: "pickup_reservation_expire_skipped_paid",
      severity: "warn",
      source: `pickup_expire_${source}`,
      message: `Orden ${order.orderNumber} no expirada: existe Payment approved pero Order.paymentStatus sigue pending. Revisar reconciliación del webhook.`,
      metadata: { paymentId: approvedPayment.id },
    }).catch(() => {
      /* audit is best-effort */
    });
    return { kind: "skipped_paid" };
  }

  // The helper only restores if a prior decrement event exists AND
  // no prior restore event exists. We also check here so the summary
  // classifies runs honestly.
  const [decrementEvent, restoredEvent] = await Promise.all([
    prisma.systemEvent.findFirst({
      where: {
        storeId: order.storeId,
        entityType: "order",
        entityId: order.id,
        eventType: "pickup_local_stock_decremented",
      },
      select: { id: true },
    }),
    prisma.systemEvent.findFirst({
      where: {
        storeId: order.storeId,
        entityType: "order",
        entityId: order.id,
        eventType: "pickup_local_stock_restored",
      },
      select: { id: true },
    }),
  ]);

  if (dryRun) {
    // In dry-run we still classify the outcome so the summary is
    // informative, but we never write.
    if (!decrementEvent) return { kind: "skipped_not_decremented" };
    if (restoredEvent) return { kind: "skipped_already_restored" };
    return { kind: "expired", restored: true };
  }

  const ageMinutes = Math.max(
    0,
    Math.floor((Date.now() - order.createdAt.getTime()) / 60_000),
  );
  const reason = `Retiro en local expirado: pago no confirmado en ${ttlMinutes} minutos`;

  // ── Write transaction ───────────────────────────────────────────
  // We UPDATE with a strict WHERE clause so a concurrent paid webhook
  // racing our job cannot be clobbered. If the UPDATE touches 0 rows,
  // we skip without calling the stock helper.
  const txResult = await prisma.$transaction(async (tx: Tx) => {
    const updateResult = await tx.order.updateMany({
      where: {
        id: order.id,
        paymentStatus: "pending",
        status: "new",
        cancelledAt: null,
      },
      data: {
        status: "cancelled",
        paymentStatus: "failed",
        publicStatus: "CANCELLED",
        shippingStatus: "cancelled",
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });

    if (updateResult.count === 0) {
      return { kind: "skipped_race" as const };
    }

    const restored = decrementEvent
      ? await restorePickupLocalStockForOrderTx(tx, {
          orderId: order.id,
          reason,
          source: `pickup_expire_${source}`,
        })
      : false;

    return {
      kind: "expired" as const,
      restored,
      hadDecrement: Boolean(decrementEvent),
    };
  });

  if (txResult.kind === "skipped_race") return { kind: "skipped_race" };

  // ── Audit trail ─────────────────────────────────────────────────
  // `logSystemEvent` already swallows its own errors, so we don't
  // wrap it in try/catch.
  await logSystemEvent({
    storeId: order.storeId,
    entityType: "order",
    entityId: order.id,
    eventType: "pickup_reservation_expired",
    severity: "info",
    source: `pickup_expire_${source}`,
    message: `Orden pickup ${order.orderNumber} expirada tras ${ageMinutes} minutos sin pago confirmado.`,
    metadata: {
      ttlMinutes,
      ageMinutes,
      restored: txResult.restored,
      hadDecrement: txResult.hadDecrement,
    },
  });

  if (!txResult.hadDecrement) {
    return { kind: "expired", restored: false };
  }

  return { kind: "expired", restored: txResult.restored };
}
