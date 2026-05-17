// ─── Order Lifecycle — Canonical Reference ────────────────────────────────
// Phase 4C hardening: this file documents the OFFICIAL order lifecycle used
// by Nexora. It serves as the single source of truth for state machines,
// valid transitions, and the relationship between the three status axes.
//
// IMPORTANT: This file is documentation-as-code. The constants below are
// importable by validators and UI components that need to enumerate states.
// ──────────────────────────────────────────────────────────────────────────

// ─── Axis 1: Order Status (internal admin view) ──────────────────────────
// Stored in Order.status as a String field.
// The Prisma enum `OrderStatus` exists but is only used by `publicStatus`.
export const ORDER_STATUSES = [
  "new",        // Created, awaiting payment
  "paid",       // Payment confirmed, awaiting fulfillment
  "processing", // Being prepared (picked/packed)
  "shipped",    // Dispatched with or without tracking
  "delivered",  // Confirmed received by customer
  "cancelled",  // Cancelled by merchant or system
  "refunded",   // Refund processed
] as const;

export type OrderStatusValue = (typeof ORDER_STATUSES)[number];

// ─── Axis 2: Payment Status ──────────────────────────────────────────────
// Stored in Order.paymentStatus as a String field.
// Driven by Mercado Pago webhook notifications.
export const PAYMENT_STATUSES = [
  "pending",    // Awaiting payment (MP preference created)
  "in_process", // MP is processing (e.g. credit card auth)
  "approved",   // MP confirmed payment (alias: "paid")
  "paid",       // Normalized status after webhook processing
  "rejected",   // MP rejected payment
  "failed",     // Payment failed (timeout, insufficient funds)
  "cancelled",  // Payment cancelled by buyer
  "refunded",   // Full refund processed
] as const;

export type PaymentStatusValue = (typeof PAYMENT_STATUSES)[number];

// ─── Axis 3: Shipping Status ─────────────────────────────────────────────
// Stored in Order.shippingStatus as a String field.
// Driven by admin fulfillment actions.
export const SHIPPING_STATUSES = [
  "unfulfilled", // Default — no fulfillment action taken
  "preparing",   // Merchant started preparing the order
  "shipped",     // Dispatched (tracking may or may not be added)
  "delivered",   // Confirmed delivered
  "cancelled",   // Shipping cancelled (order cancelled)
] as const;

export type ShippingStatusValue = (typeof SHIPPING_STATUSES)[number];

// ─── Valid Transitions ───────────────────────────────────────────────────
// Each entry maps a current status to the set of valid next statuses.
// Transitions not listed here are INVALID and should be rejected.

export const ORDER_TRANSITIONS: Record<OrderStatusValue, readonly OrderStatusValue[]> = {
  new:        ["paid", "cancelled"],
  paid:       ["processing", "shipped", "cancelled", "refunded"],
  processing: ["shipped", "cancelled", "refunded"],
  shipped:    ["delivered", "cancelled", "refunded"],
  delivered:  ["refunded"], // No cancel after delivery — refund only
  cancelled:  [],           // Terminal
  refunded:   [],           // Terminal
};

export const SHIPPING_TRANSITIONS: Record<ShippingStatusValue, readonly ShippingStatusValue[]> = {
  unfulfilled: ["preparing", "shipped", "cancelled"],
  preparing:   ["shipped", "cancelled"],
  shipped:     ["delivered", "cancelled"],
  delivered:   [],           // Terminal
  cancelled:   [],           // Terminal
};

// ─── Status ↔ Public Status Mapping ──────────────────────────────────────
// Order.publicStatus uses the Prisma OrderStatus enum (PENDING, PAID, etc.)
// and is the customer-facing status shown in tracking pages.
// Order.status is the internal admin status (new, paid, processing...).
//
// The webhook handler sets both: when MP approves a payment, it sets:
//   status = "paid", publicStatus = "PAID", paymentStatus = "approved"
//
// This duality exists because:
//   1. publicStatus is an enum — safe for customer-facing URLs/badges
//   2. status is a string — flexible for internal workflows
//   3. They can diverge: e.g. status="processing" while publicStatus="PAID"
//      (the customer sees "paid", the merchant sees "processing")

// ─── Pickup Orders ───────────────────────────────────────────────────────
// Pickup orders follow the same lifecycle but with different semantics:
//   - shippingStatus "preparing" = order is being prepared for pickup
//   - shippingStatus "shipped" = ready for pickup (customer notified)
//   - shippingStatus "delivered" = customer collected the order
//
// The ShippingMethod.type="pickup" flag on the order determines UI labels.
// No carrier/tracking is expected for pickup orders.

// ─── Stock Lifecycle ─────────────────────────────────────────────────────
// Stock is committed (decremented) when payment is approved, not at
// checkout creation. This prevents stock from being locked by unpaid carts.
//
//   Cart → Checkout → MP Preference → Payment Approved → commitOrderStock()
//                                                          ↓
//                                                    StockMovement(type="sale")
//
// On cancellation/refund:
//   cancelOrder() → restoreOrderStock() → StockMovement(type="cancellation_restore"|"refund_restore")
//
// Both operations are IDEMPOTENT via StockMovement existence checks.
// Race conditions on stock are prevented by atomic `updateMany` with
// `stock: { gte: quantity }` in the where clause.
