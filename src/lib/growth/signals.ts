// ─── Growth / lifecycle signals ─────────────────────────────────────────
//
// Single source of truth for the /admin/growth hub. Every number below
// is derived from a concrete DB row or an explicit rule the merchant
// can read on screen — no "churn risk", no "LTV prediction", no
// invented customer score.
//
// Hard guarantees:
//   * No Math.random, no ML, no opaque heuristics.
//   * Every rule-based signal (reorder opportunities, review-request
//     eligibility…) is computed with thresholds the merchant already
//     controls (PostPurchaseFlowsSettings.*DelayDays) or with
//     explicit, documented defaults that are disclosed on the UI.
//   * When a signal's data source is not available (app not installed,
//     settings row missing), the signal degrades to a clear "inactive"
//     state instead of a fabricated value. The UI then links the
//     merchant to the configuration surface.

import { prisma } from "@/lib/db/prisma";
import { getAggregatedCustomers } from "@/lib/customers/queries";

// Default delay used ONLY when the merchant has not configured the
// post-purchase-flows app. Kept in sync with the defaults in
// src/lib/apps/post-purchase-flows/settings.ts so the growth hub and
// the cron both tell the same story.
const DEFAULT_REVIEW_DELAY_DAYS = 7;
const DEFAULT_REORDER_DELAY_DAYS = 30;

// Window used by "last N days" aggregate signals. 90 days is wide
// enough to be meaningful for small stores and narrow enough that a
// spike from 18 months ago does not dominate the reading.
const LIFECYCLE_WINDOW_DAYS = 90;

export type AppState = "not_installed" | "needs_setup" | "active" | "disabled";

export interface GrowthCustomersSnapshot {
  total: number;
  new: number;
  recurring: number;
  vip: number;
  inactive: number;
  /** Customers whose first order was placed in the last 30 days. */
  newLast30Days: number;
}

export interface GrowthLifecycleSnapshot {
  windowDays: number;
  deliveredInWindow: number;
  reviewsApprovedInWindow: number;
  /**
   * Delivered orders that are AT LEAST `reviewDelayDays` old and still
   * have NO `POST_PURCHASE_REVIEW_REQUEST` email recorded. This is the
   * exact set the cron would pick up on its next run.
   */
  reviewRequestEligibleNow: number;
  reviewDelayDays: number;
  /**
   * Same idea for the reorder follow-up flow. Independent of the
   * review flow — an order can be in both buckets at the same time.
   */
  reorderFollowupEligibleNow: number;
  reorderDelayDays: number;
}

export interface GrowthReorderSnapshot {
  /** Recurring customers (>= 2 paid orders) whose last purchase is older
   *  than the merchant-configured (or default) reorder threshold. */
  eligibleCount: number;
  thresholdDays: number;
  ruleLabel: string;
}

export interface GrowthAppsSnapshot {
  productReviews: {
    state: AppState;
    pendingModeration: number;
    approvedTotal: number;
  };
  whatsappRecovery: {
    state: AppState;
    configured: boolean;
  };
  postPurchase: {
    state: AppState;
    reviewRequestEnabled: boolean;
    reviewDelayDays: number;
    reorderFollowupEnabled: boolean;
    reorderDelayDays: number;
  };
  bundlesUpsells: {
    state: AppState;
    activeOffers: number;
  };
  orderTracking: {
    state: AppState;
  };
}

export interface GrowthSnapshot {
  customers: GrowthCustomersSnapshot;
  lifecycle: GrowthLifecycleSnapshot;
  reorder: GrowthReorderSnapshot;
  apps: GrowthAppsSnapshot;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function readInstalledAppState(
  storeId: string,
  slug: string,
): Promise<AppState> {
  const row = await prisma.installedApp
    .findUnique({
      where: { storeId_appSlug: { storeId, appSlug: slug } },
      select: { status: true },
    })
    .catch(() => null);
  if (!row) return "not_installed";
  // InstalledApp.status is a free-form string in the schema but the
  // retention apps converge on three values: "active", "needs_setup",
  // "disabled". Anything else is treated as needs_setup so the hub
  // keeps nudging the merchant toward configuration instead of silently
  // pretending everything is fine.
  switch (row.status) {
    case "active":
      return "active";
    case "disabled":
      return "disabled";
    case "needs_setup":
      return "needs_setup";
    default:
      return "needs_setup";
  }
}

export async function getGrowthSnapshot(
  storeId: string,
): Promise<GrowthSnapshot> {
  const windowStart = daysAgo(LIFECYCLE_WINDOW_DAYS);
  const thirtyDaysAgo = daysAgo(30);

  // All the queries are independent — run them in parallel to keep the
  // hub fast even on stores with thousands of orders.
  const [
    aggregatedCustomers,
    deliveredInWindowCount,
    reviewsApprovedInWindowCount,
    reviewsPendingCount,
    reviewsApprovedTotal,
    bundlesActiveCount,
    postPurchaseSettings,
    whatsappSettings,
    productReviewsState,
    whatsappState,
    postPurchaseState,
    bundlesState,
    orderTrackingState,
  ] = await Promise.all([
    getAggregatedCustomers(),
    prisma.order.count({
      where: {
        storeId,
        deliveredAt: { not: null, gte: windowStart },
      },
    }),
    prisma.productReview.count({
      where: {
        storeId,
        status: "approved",
        publishedAt: { not: null, gte: windowStart },
      },
    }),
    prisma.productReview.count({
      where: { storeId, status: "pending" },
    }),
    prisma.productReview.count({
      where: { storeId, status: "approved" },
    }),
    prisma.bundleOffer.count({
      where: { storeId, status: "active" },
    }),
    prisma.postPurchaseFlowsSettings.findUnique({
      where: { storeId },
    }),
    prisma.whatsappRecoverySettings.findUnique({
      where: { storeId },
    }),
    readInstalledAppState(storeId, "product-reviews"),
    readInstalledAppState(storeId, "whatsapp-recovery"),
    readInstalledAppState(storeId, "post-purchase-flows"),
    readInstalledAppState(storeId, "bundles-upsells"),
    readInstalledAppState(storeId, "order-tracking-widget"),
  ]);

  const reviewDelayDays =
    postPurchaseSettings?.reviewRequestDelayDays ?? DEFAULT_REVIEW_DELAY_DAYS;
  const reorderDelayDays =
    postPurchaseSettings?.reorderFollowupDelayDays ??
    DEFAULT_REORDER_DELAY_DAYS;

  const reviewCutoff = daysAgo(reviewDelayDays);
  const reorderCutoff = daysAgo(reorderDelayDays);

  // Cron-eligibility counts. These mirror the actual WHERE clause of
  // the post-purchase cron (src/app/api/cron/post-purchase-review-
  // requests/route.ts) so the growth hub shows exactly what the next
  // run will process — nothing more, nothing less.
  const [
    reviewEligibleDeliveredIds,
    reorderEligibleDeliveredIds,
    reviewAlreadySentOrderIds,
    reorderAlreadySentOrderIds,
  ] = await Promise.all([
    prisma.order.findMany({
      where: {
        storeId,
        deliveredAt: { not: null, lte: reviewCutoff },
        email: { not: "" },
      },
      select: { id: true },
    }),
    prisma.order.findMany({
      where: {
        storeId,
        deliveredAt: { not: null, lte: reorderCutoff },
        email: { not: "" },
      },
      select: { id: true },
    }),
    prisma.emailLog.findMany({
      where: {
        storeId,
        eventType: "POST_PURCHASE_REVIEW_REQUEST",
        entityType: "order",
        status: "sent",
      },
      select: { entityId: true },
    }),
    prisma.emailLog.findMany({
      where: {
        storeId,
        eventType: "POST_PURCHASE_REORDER_FOLLOWUP",
        entityType: "order",
        status: "sent",
      },
      select: { entityId: true },
    }),
  ]);

  const reviewSentSet = new Set(reviewAlreadySentOrderIds.map((r) => r.entityId));
  const reorderSentSet = new Set(reorderAlreadySentOrderIds.map((r) => r.entityId));
  const reviewRequestEligibleNow = reviewEligibleDeliveredIds.filter(
    (o) => !reviewSentSet.has(o.id),
  ).length;
  const reorderFollowupEligibleNow = reorderEligibleDeliveredIds.filter(
    (o) => !reorderSentSet.has(o.id),
  ).length;

  // ── Reorder opportunity ─────────────────────────────────────────────
  // Explicit, auditable rule: a customer is "ready for reorder" iff
  //   * ordersCount >= 2  (they already repeated at least once)
  //   * daysSinceLastPurchase > reorderDelayDays (the merchant's own
  //     reorder threshold, or the 30d default if not configured)
  // No ML, no propensity, no decay. If the customer could trigger the
  // reorder flow today, we count them here.
  const reorderEligibleCustomers = aggregatedCustomers.filter((c) => {
    if (c.ordersCount < 2) return false;
    const days = Math.floor(
      (Date.now() - new Date(c.lastPurchaseAt).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    return days >= reorderDelayDays;
  });

  // Customer counts ---------------------------------------------------
  // "newLast30Days" uses firstPurchase = last order in asc order; the
  // aggregated view only has lastPurchaseAt so we fall back to a cheap
  // extra query to count distinct emails whose FIRST order is within
  // the window. Keeping it as a dedicated COUNT keeps the cost low.
  const newLast30Emails = await prisma.order
    .groupBy({
      by: ["email"],
      where: { storeId, status: { not: "cancelled" } },
      _min: { createdAt: true },
    })
    .catch(() => [] as Array<{ email: string; _min: { createdAt: Date | null } }>);

  const newLast30Days = newLast30Emails.filter((row) => {
    const first = row._min.createdAt;
    return first instanceof Date && first >= thirtyDaysAgo;
  }).length;

  const customers: GrowthCustomersSnapshot = {
    total: aggregatedCustomers.length,
    new: aggregatedCustomers.filter((c) => c.segment === "new").length,
    recurring: aggregatedCustomers.filter((c) => c.segment === "recurring")
      .length,
    vip: aggregatedCustomers.filter((c) => c.segment === "vip").length,
    inactive: aggregatedCustomers.filter((c) => c.lifecycleStatus === "inactive")
      .length,
    newLast30Days,
  };

  return {
    customers,
    lifecycle: {
      windowDays: LIFECYCLE_WINDOW_DAYS,
      deliveredInWindow: deliveredInWindowCount,
      reviewsApprovedInWindow: reviewsApprovedInWindowCount,
      reviewRequestEligibleNow,
      reviewDelayDays,
      reorderFollowupEligibleNow,
      reorderDelayDays,
    },
    reorder: {
      eligibleCount: reorderEligibleCustomers.length,
      thresholdDays: reorderDelayDays,
      ruleLabel: `Clientes con ≥ 2 pedidos cuya última compra supera los ${reorderDelayDays} días configurados por la tienda.`,
    },
    apps: {
      productReviews: {
        state: productReviewsState,
        pendingModeration: reviewsPendingCount,
        approvedTotal: reviewsApprovedTotal,
      },
      whatsappRecovery: {
        state: whatsappState,
        configured: Boolean(
          whatsappSettings?.phoneNumberId &&
            whatsappSettings?.accessTokenEncrypted &&
            whatsappSettings?.templateName,
        ),
      },
      postPurchase: {
        state: postPurchaseState,
        reviewRequestEnabled: postPurchaseSettings?.reviewRequestEnabled ?? false,
        reviewDelayDays,
        reorderFollowupEnabled:
          postPurchaseSettings?.reorderFollowupEnabled ?? false,
        reorderDelayDays,
      },
      bundlesUpsells: {
        state: bundlesState,
        activeOffers: bundlesActiveCount,
      },
      orderTracking: {
        state: orderTrackingState,
      },
    },
  };
}
