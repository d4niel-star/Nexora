import { prisma } from "@/lib/db/prisma";

// ─── Revenue Intelligence ─────────────────────────────────────────────
// Real commerce metrics derived from paid orders. No fake data.

export interface RevenueTrend {
  date: string; // YYYY-MM-DD
  revenue: number;
  orders: number;
}

export interface RevenueIntelligence {
  // Trends (last 30 days, daily)
  revenueTrend: RevenueTrend[];
  // Summary metrics
  totalRevenue30d: number;
  totalOrders30d: number;
  avgOrderValue: number;
  refundTotal30d: number;
  refundCount30d: number;
  // Top products by revenue
  topProducts: Array<{ id: string; title: string; revenue: number; unitsSold: number }>;
  // Growth indicators
  revenueGrowthPct: number | null; // vs previous 30d period
  orderGrowthPct: number | null;
  // Fulfillment
  pendingFulfillment: number;
  avgFulfillmentDays: number | null;
}

export async function getRevenueIntelligence(storeId: string): Promise<RevenueIntelligence> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);

  // Fetch current period orders
  const currentOrders = await prisma.order.findMany({
    where: {
      storeId,
      status: { in: ["paid", "shipped", "delivered", "completed"] },
      createdAt: { gte: thirtyDaysAgo },
    },
    select: {
      id: true,
      total: true,
      createdAt: true,
      status: true,
      shippedAt: true,
      items: { select: { productId: true, quantity: true, priceSnapshot: true, titleSnapshot: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Previous period for growth comparison
  const previousOrders = await prisma.order.findMany({
    where: {
      storeId,
      status: { in: ["paid", "shipped", "delivered", "completed"] },
      createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
    },
    select: { total: true },
  });

  // Refunds
  const refunds = await prisma.order.findMany({
    where: {
      storeId,
      status: "refunded",
      updatedAt: { gte: thirtyDaysAgo },
    },
    select: { total: true },
  });

  // Pending fulfillment
  const pendingFulfillment = await prisma.order.count({
    where: {
      storeId,
      status: "paid",
      shippingStatus: "unfulfilled",
    },
  });

  // ─── Compute revenue trend (daily) ───
  const trendMap = new Map<string, { revenue: number; orders: number }>();
  for (let d = new Date(thirtyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
    trendMap.set(d.toISOString().slice(0, 10), { revenue: 0, orders: 0 });
  }
  for (const order of currentOrders) {
    const dateKey = order.createdAt.toISOString().slice(0, 10);
    const entry = trendMap.get(dateKey);
    if (entry) {
      entry.revenue += order.total;
      entry.orders += 1;
    }
  }
  const revenueTrend: RevenueTrend[] = Array.from(trendMap.entries()).map(([date, data]) => ({
    date,
    ...data,
  }));

  // ─── Top products ───
  const productRevenue = new Map<string, { title: string; revenue: number; unitsSold: number }>();
  for (const order of currentOrders) {
    for (const item of order.items) {
      const key = item.productId || item.titleSnapshot;
      const existing = productRevenue.get(key) || { title: item.titleSnapshot, revenue: 0, unitsSold: 0 };
      existing.revenue += item.priceSnapshot * item.quantity;
      existing.unitsSold += item.quantity;
      productRevenue.set(key, existing);
    }
  }
  const topProducts = Array.from(productRevenue.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // ─── Summary metrics ───
  const totalRevenue30d = currentOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders30d = currentOrders.length;
  const avgOrderValue = totalOrders30d > 0 ? totalRevenue30d / totalOrders30d : 0;
  const refundTotal30d = refunds.reduce((sum, o) => sum + o.total, 0);
  const refundCount30d = refunds.length;

  // ─── Growth ───
  const prevRevenue = previousOrders.reduce((sum, o) => sum + o.total, 0);
  const revenueGrowthPct = prevRevenue > 0 ? ((totalRevenue30d - prevRevenue) / prevRevenue) * 100 : null;
  const orderGrowthPct = previousOrders.length > 0 ? ((totalOrders30d - previousOrders.length) / previousOrders.length) * 100 : null;

  // ─── Fulfillment speed ───
  const fulfilledOrders = currentOrders.filter((o) => o.shippedAt);
  const avgFulfillmentDays = fulfilledOrders.length > 0
    ? fulfilledOrders.reduce((sum, o) => {
        const diffMs = o.shippedAt!.getTime() - o.createdAt.getTime();
        return sum + diffMs / 86400000;
      }, 0) / fulfilledOrders.length
    : null;

  return {
    revenueTrend,
    totalRevenue30d,
    totalOrders30d,
    avgOrderValue,
    refundTotal30d,
    refundCount30d,
    topProducts,
    revenueGrowthPct,
    orderGrowthPct,
    pendingFulfillment,
    avgFulfillmentDays,
  };
}
