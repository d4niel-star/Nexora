"use server";

import { prisma } from "@/lib/db/prisma";
import { getDefaultStore } from "@/lib/store-engine/queries";

export interface AIHubData {
  storeId: string;
  // Ads
  recommendations: any[];
  drafts: any[];
  // Finance
  financeSummary: {
    totalCollected: number;
    totalPending: number;
    estimatedMarginPercent: number;
    pendingCount: number;
    criticalMargins: number;
  } | null;
  // Operations  
  ordersPendingFulfillment: number;
  ordersRequiringAttention: number;
  // Products
  productsWithoutCost: number;
  totalProducts: number;
  // Recent commands
  recentCommands: Array<{
    id: string;
    message: string;
    route: string | null;
    createdAt: string;
  }>;
}

export async function getAIHubData(): Promise<AIHubData> {
  const store = await getDefaultStore();
  if (!store) {
    return {
      storeId: "",
      recommendations: [],
      drafts: [],
      financeSummary: null,
      ordersPendingFulfillment: 0,
      ordersRequiringAttention: 0,
      productsWithoutCost: 0,
      totalProducts: 0,
      recentCommands: [],
    };
  }

  const storeId = store.id;

  // All queries in parallel
  const [
    recommendations,
    drafts,
    orders,
    productStats,
    recentEvents,
  ] = await Promise.all([
    // Active ad recommendations
    prisma.adRecommendation.findMany({
      where: { storeId, dismissedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // Campaign drafts pending review
    prisma.adCampaignDraft.findMany({
      where: { storeId, status: "draft" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // Orders needing action
    prisma.order.findMany({
      where: { storeId },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        shippingStatus: true,
        total: true,
        paymentFee: true,
        channelFee: true,
      },
    }),
    // Products missing cost data
    prisma.product.aggregate({
      where: { storeId },
      _count: { id: true },
    }).then(async (total) => {
      const noCost = await prisma.product.count({
        where: { storeId, OR: [{ cost: null }, { cost: 0 }] },
      });
      return { total: total._count.id, noCost };
    }),
    // Recent AI commands (scoped to store)
    prisma.systemEvent.findMany({
      where: { storeId, source: "ai_hub", eventType: "ai_command_executed" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, message: true, metadataJson: true, createdAt: true },
    }),
  ]);

  // Compute finance summary from orders
  let totalCollected = 0;
  let totalPending = 0;
  let pendingCount = 0;
  let ordersPendingFulfillment = 0;
  let ordersRequiringAttention = 0;

  for (const o of orders) {
    const isPaid = o.paymentStatus === "approved" || o.paymentStatus === "paid";
    const isPendingPayment = o.paymentStatus === "pending" || o.paymentStatus === "in_process";

    if (isPaid) totalCollected += o.total;
    if (isPendingPayment) {
      totalPending += o.total;
      pendingCount++;
    }

    if (isPaid && o.shippingStatus === "unfulfilled") {
      ordersPendingFulfillment++;
    }
    if (o.status === "new" && isPendingPayment) {
      ordersRequiringAttention++;
    }
  }

  const totalGross = totalCollected || 1;
  const totalFees = orders.reduce((s, o) => s + (o.paymentFee || 0) + (o.channelFee || 0), 0);
  const marginPercent = totalCollected > 0
    ? ((totalCollected - totalFees) / totalGross) * 100
    : 0;

  const recentCommands = recentEvents.map((e) => ({
    id: e.id,
    message: e.message,
    route: e.metadataJson ? (JSON.parse(e.metadataJson) as any).resolvedRoute || null : null,
    createdAt: e.createdAt.toISOString(),
  }));

  return {
    storeId,
    recommendations,
    drafts,
    financeSummary: {
      totalCollected,
      totalPending,
      estimatedMarginPercent: parseFloat(marginPercent.toFixed(1)),
      pendingCount,
      criticalMargins: 0, // would need product-level analysis
    },
    ordersPendingFulfillment,
    ordersRequiringAttention,
    productsWithoutCost: productStats.noCost,
    totalProducts: productStats.total,
    recentCommands,
  };
}
