"use server";

// ─── Bulk order actions ─────────────────────────────────────────────────
// Thin wrapper around the single-order fulfillment action. Validates
// that each order belongs to the current store (delegated to
// updateOrderFulfillment) and aggregates the results honestly: the
// caller gets an explicit success/failure split, not a false "all done".
//
// Kept intentionally small — anything more complex (labels, carrier
// assignment, invoicing) must go through the dedicated per-order
// drawers, because the data those flows need is always per-order.

import { updateOrderFulfillment, type ShippingStatus } from "@/lib/store-engine/fulfillment/actions";

export interface BulkFulfillmentResult {
  succeeded: string[];
  failed: Array<{ orderId: string; error: string }>;
}

export async function bulkUpdateFulfillment(
  orderIds: string[],
  shippingStatus: ShippingStatus,
): Promise<BulkFulfillmentResult> {
  const uniqueIds = Array.from(new Set(orderIds.filter(Boolean)));
  if (uniqueIds.length === 0) return { succeeded: [], failed: [] };

  const outcomes = await Promise.allSettled(
    uniqueIds.map((orderId) => updateOrderFulfillment({ orderId, shippingStatus })),
  );

  const succeeded: string[] = [];
  const failed: Array<{ orderId: string; error: string }> = [];
  outcomes.forEach((outcome, idx) => {
    const orderId = uniqueIds[idx];
    if (outcome.status === "fulfilled") {
      succeeded.push(orderId);
    } else {
      const error =
        outcome.reason instanceof Error
          ? outcome.reason.message
          : String(outcome.reason ?? "Error desconocido");
      failed.push({ orderId, error });
    }
  });

  return { succeeded, failed };
}
