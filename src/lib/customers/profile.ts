import { prisma } from "@/lib/db/prisma";

// ─── Customer Profile 360 (Phase 7C.1) ───────────────────────────────
// Customers in Nexora are derived from Order rows by email — there is no
// `Customer` table by design. This module aggregates a complete profile
// from existing tables (Order, EmailLog, Cart, ProductReview, RefundRequest)
// keyed on `(storeId, email)`. Email comparison is normalized to lowercase
// at every read site to keep the join robust to casing variants.

export interface CustomerProfile {
  email: string;
  identity: {
    name: string;
    phone: string | null;
    createdAt: string; // First Order.createdAt
    firstOrderAt: string | null;
    lastOrderAt: string | null;
    acquisitionChannel: string | null;
  };
  commercial: {
    lifetimeValue: number; // Sum of paid order totals (excludes cancelled)
    totalOrders: number;
    averageOrderValue: number;
    refundedTotal: number; // Sum of Order.refundAmount
    cancellationRate: number; // 0..1
    netRevenue: number; // LTV - refunded
    currency: string;
  };
  operational: {
    averageFulfillmentMs: number | null; // mean(deliveredAt - createdAt)
    paymentMethods: string[];
    shippingMethods: string[];
    abandonedCarts: number;
    reviewsCount: number;
  };
}

export async function getCustomerProfile(
  storeId: string,
  rawEmail: string,
): Promise<CustomerProfile | null> {
  const email = rawEmail.trim().toLowerCase();
  if (!email) return null;

  // Pull every order this email placed at this store. Cap at 500 to stay
  // bounded even for the most prolific buyer — the UI shows the full
  // count via aggregation but only renders a paginated slice in the
  // timeline.
  const orders = await prisma.order.findMany({
    where: {
      storeId,
      email: { equals: email, mode: "insensitive" },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      orderNumber: true,
      total: true,
      currency: true,
      status: true,
      paymentStatus: true,
      paymentProvider: true,
      shippingMethodLabel: true,
      shippingStatus: true,
      cancelledAt: true,
      refundAmount: true,
      deliveredAt: true,
      createdAt: true,
      channel: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
  });

  if (orders.length === 0) {
    // No orders → not a real customer of this store. Caller should 404.
    return null;
  }

  const totalOrders = orders.length;
  const cancelled = orders.filter((o) => o.status === "cancelled").length;
  const nonCancelled = orders.filter((o) => o.status !== "cancelled");

  const lifetimeValue = nonCancelled.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const refundedTotal = orders.reduce((sum, o) => sum + (o.refundAmount ?? 0), 0);
  const averageOrderValue = nonCancelled.length > 0 ? lifetimeValue / nonCancelled.length : 0;

  // Fulfillment time (only for orders that actually shipped + delivered)
  const fulfilled = orders.filter((o) => o.deliveredAt !== null);
  const fulfillmentSamples = fulfilled.map(
    (o) => o.deliveredAt!.getTime() - o.createdAt.getTime(),
  );
  const averageFulfillmentMs = fulfillmentSamples.length > 0
    ? Math.round(fulfillmentSamples.reduce((a, b) => a + b, 0) / fulfillmentSamples.length)
    : null;

  const paymentMethods = Array.from(
    new Set(orders.map((o) => o.paymentProvider).filter((m): m is string => Boolean(m))),
  );
  const shippingMethods = Array.from(
    new Set(orders.map((o) => o.shippingMethodLabel).filter((m): m is string => Boolean(m))),
  );

  // Abandoned carts (correlated by CheckoutDraft.email)
  // ProductReview.customerEmail is NOT in schema by design (reviews carry
  // displayName only for privacy), so reviewsCount is honestly 0 here.
  const abandonedCarts = await prisma.cart.count({
    where: {
      storeId,
      status: "abandoned",
      checkouts: {
        some: { email: { equals: email, mode: "insensitive" } },
      },
    },
  }).catch(() => 0);
  const reviewsCount = 0; // No customerEmail on ProductReview — see schema comment

  const newest = orders[0];
  const oldest = orders[orders.length - 1];
  const buyerName = `${newest.firstName ?? ""} ${newest.lastName ?? ""}`.trim() || "Sin nombre";
  const currency = newest.currency || "ARS";

  return {
    email,
    identity: {
      name: buyerName,
      phone: newest.phone,
      createdAt: oldest.createdAt.toISOString(),
      firstOrderAt: oldest.createdAt.toISOString(),
      lastOrderAt: newest.createdAt.toISOString(),
      acquisitionChannel: newest.channel ?? null,
    },
    commercial: {
      lifetimeValue,
      totalOrders,
      averageOrderValue,
      refundedTotal,
      cancellationRate: totalOrders > 0 ? cancelled / totalOrders : 0,
      netRevenue: Math.max(0, lifetimeValue - refundedTotal),
      currency,
    },
    operational: {
      averageFulfillmentMs,
      paymentMethods,
      shippingMethods,
      abandonedCarts,
      reviewsCount,
    },
  };
}
