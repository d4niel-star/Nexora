// ─── Orders work-queue derivation ────────────────────────────────────────
// Pure functions that turn an Order (already in the admin UI shape) into
// the SINGLE next human action it needs, if any. No invented signals: the
// rules below reduce to honest reads of order.paymentStatus,
// order.shipping.shippingStatus, order.shipping.trackingNumber and
// createdAt. If nothing is pending, the result is null — never a
// fabricated "healthy" badge.
//
// Design goals:
//   - One primary action per order. Merchants scan rows; multiple chips
//     per row destroy scannability.
//   - Urgent flag is explicit, not implied by colour. It is set only on
//     states that have a real time-based risk (payment stalled > 48h,
//     preparation stalled > 24h).
//   - Cancelled / refunded orders never surface as needing action.

import type { Order } from "@/types/order";

export type OrderActionKind =
  /** Paid but no fulfillment has started yet → the most common queue. */
  | "mark_preparing"
  /** Preparing but not marked shipped yet. */
  | "mark_shipped"
  /** Shipped but there is no tracking number attached. */
  | "add_tracking"
  /** Payment is stuck in 'pending' or 'in_process' for too long. */
  | "payment_stalled"
  /** Preparation is taking too long (warehouse bottleneck signal). */
  | "preparation_stalled"
  /** Status is `new` AND payment is approved but fulfillment didn't move. */
  | "acknowledge";

export interface OrderNextAction {
  kind: OrderActionKind;
  label: string;
  /** True when the action reflects a real time-based risk. */
  urgent: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function deriveOrderNextAction(order: Order): OrderNextAction | null {
  // Terminal states never require action.
  if (
    order.status === "cancelled" ||
    order.status === "refunded" ||
    order.paymentStatus === "refunded" ||
    order.paymentStatus === "cancelled"
  ) {
    return null;
  }

  const ageMs = Date.now() - new Date(order.createdAt).getTime();
  const paidLike =
    order.paymentStatus === "paid" || order.paymentStatus === "approved";
  const shippingStatus = order.shipping.shippingStatus ?? "unfulfilled";

  // ── 1. Payment stalled ≥ 48h ────────────────────────────────────────────
  // Only surface after 48h so we don't pester the merchant about normal
  // MP-in-flight states.
  if (
    (order.paymentStatus === "pending" || order.paymentStatus === "in_process") &&
    ageMs > 2 * DAY_MS
  ) {
    return {
      kind: "payment_stalled",
      label: "Revisar cobro",
      urgent: true,
    };
  }

  // ── 2. Paid but no fulfillment movement ────────────────────────────────
  if (paidLike && (shippingStatus === "unfulfilled" || shippingStatus === "")) {
    return {
      kind: "mark_preparing",
      label: "Preparar",
      urgent: false,
    };
  }

  // ── 3. Preparation stalled ≥ 24h ───────────────────────────────────────
  // If it's been in "preparing" for more than a day and nothing moved, the
  // warehouse/operator needs a nudge. We key on order age as a proxy; a
  // dedicated preparedAt column would be more precise but is not in scope.
  if (paidLike && shippingStatus === "preparing" && ageMs > 1.5 * DAY_MS) {
    return {
      kind: "preparation_stalled",
      label: "Despachar",
      urgent: true,
    };
  }

  // ── 4. Preparing normal path ───────────────────────────────────────────
  if (paidLike && shippingStatus === "preparing") {
    return {
      kind: "mark_shipped",
      label: "Marcar enviado",
      urgent: false,
    };
  }

  // ── 5. Shipped without tracking ────────────────────────────────────────
  if (shippingStatus === "shipped" && !order.shipping.trackingNumber) {
    return {
      kind: "add_tracking",
      label: "Agregar tracking",
      urgent: false,
    };
  }

  // ── 6. Payment approved but status still "new" (drift between
  // webhook-driven publicStatus and admin status) ────────────────────────
  if (paidLike && order.status === "new") {
    return {
      kind: "acknowledge",
      label: "Confirmar",
      urgent: false,
    };
  }

  return null;
}

/**
 * True when the order currently needs human action. Thin wrapper for UI
 * filters so the derivation rule lives in exactly one place.
 */
export function orderNeedsAction(order: Order): boolean {
  return deriveOrderNextAction(order) !== null;
}
