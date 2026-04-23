// ─── Statistics Module · Data Layer ──────────────────────────────────────
//
// Single source of truth for /admin/stats. Every number is derived from
// concrete DB rows — no fabricated data, no ML scores, no placeholders
// that pretend to be real.
//
// Architecture: one server function per tab surface, each optimised for
// its own read pattern. The overview tab uses aggregate counts and sums;
// the commercial tab uses grouped product/category queries; the audience
// tab reuses the customer aggregation already wired in the growth module.

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import { getAggregatedCustomers } from "@/lib/customers/queries";
import type {
  DailyRevenuePoint,
  OverviewKPIs,
  OverviewData,
  CommercialData,
  AudienceData,
} from "./types";

// Re-export types for backward compatibility
export type {
  DailyRevenuePoint,
  OverviewKPIs,
  OverviewData,
  CommercialData,
  AudienceData,
} from "./types";

// ─── Shared helpers ──────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

// ─── Overview queries ────────────────────────────────────────────────────

export async function getStatsOverview(): Promise<OverviewData> {
  const store = await getCurrentStore();
  if (!store) {
    return {
      kpis: emptyKPIs(),
      dailyRevenue: [],
      topProducts: [],
      revenueByCategory: [],
    };
  }

  const sid = store.id;
  const d30 = daysAgo(30);
  const d60 = daysAgo(60);

  const paidFilter = {
    storeId: sid,
    paymentStatus: { in: ["approved", "paid"] as string[] },
    status: { notIn: ["cancelled", "refunded"] as string[] },
  };

  // Core aggregates in parallel
  const [
    agg30,
    aggPrev,
    marginAgg,
    productsPublished,
    productsWithSales,
    dailyOrders,
    topProductsRaw,
    categoryRaw,
    customers30d,
    totalCustomers,
    recurringCount,
  ] = await Promise.all([
    // Revenue + orders last 30d
    prisma.order.aggregate({
      where: { ...paidFilter, createdAt: { gte: d30 } },
      _sum: { total: true },
      _count: true,
    }),
    // Revenue + orders prev 30d
    prisma.order.aggregate({
      where: { ...paidFilter, createdAt: { gte: d60, lt: d30 } },
      _sum: { total: true },
      _count: true,
    }),
    // Margin from profitability — avg net contribution %
    // costSnapshot is Float @default(0) (non-nullable), no need to filter nulls
    prisma.orderItem.aggregate({
      where: {
        order: { ...paidFilter, createdAt: { gte: d30 } },
      },
      _sum: { lineTotal: true, costSnapshot: true, quantity: true },
    }),
    prisma.product.count({ where: { storeId: sid, isPublished: true } }),
    prisma.orderItem.findMany({
      where: { order: { ...paidFilter, createdAt: { gte: d30 } } },
      distinct: ["productId"],
      select: { productId: true },
    }).then((r) => new Set(r.map((x) => x.productId)).size),
    // Daily buckets for chart
    prisma.$queryRaw<
      { day: Date; total: number; cnt: number }[]
    >`SELECT DATE("createdAt") as day, SUM("total") as total, COUNT(*) as cnt FROM "Order" WHERE "storeId" = ${sid} AND "paymentStatus" IN ('approved','paid') AND "status" NOT IN ('cancelled','refunded') AND "createdAt" >= ${d30} GROUP BY DATE("createdAt") ORDER BY day ASC`,
    // Top products by revenue
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: { ...paidFilter, createdAt: { gte: d30 } },
        productId: { not: null },
      },
      _sum: { lineTotal: true, quantity: true },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: 8,
    }),
    // Revenue by category
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: { ...paidFilter, createdAt: { gte: d30 } },
        productId: { not: null },
      },
      _sum: { lineTotal: true, quantity: true },
    }),
    // New customers last 30d — raw SQL for accuracy
    prisma.$queryRaw<{ cnt: number }[]>`
      SELECT COUNT(*) as cnt FROM (
        SELECT "email", MIN("createdAt") as first_order
        FROM "Order"
        WHERE "storeId" = ${sid} AND "status" != 'cancelled' AND "email" IS NOT NULL AND "email" != ''
        GROUP BY "email"
        HAVING MIN("createdAt") >= ${d30}
      ) sub
    `.then((r) => Number(r[0]?.cnt ?? 0)),
    // Total distinct customers
    prisma.order.findMany({
      where: { storeId: sid, status: { not: "cancelled" as string }, email: { not: "" } },
      distinct: ["email"],
      select: { email: true },
    }).then((r) => r.length),
    // Recurring customers (>= 2 orders)
    prisma.$queryRaw<{ cnt: number }[]>`
      SELECT COUNT(*) as cnt FROM (
        SELECT "email" FROM "Order"
        WHERE "storeId" = ${sid} AND "status" != 'cancelled' AND "email" IS NOT NULL AND "email" != ''
        GROUP BY "email" HAVING COUNT(*) >= 2
      ) sub
    `.then((r) => Number(r[0]?.cnt ?? 0)),
  ]);

  const revenue30d = agg30._sum.total ?? 0;
  const revenuePrev30d = aggPrev._sum.total ?? 0;
  const orders30d = agg30._count;
  const ordersPrev30d = aggPrev._count;

  // Margin calculation
  const totalLineRevenue = marginAgg._sum?.lineTotal ?? 0;
  const totalCost = marginAgg._sum?.costSnapshot ?? 0;
  const marginPercent =
    totalLineRevenue > 0
      ? Math.round(((totalLineRevenue - totalCost) / totalLineRevenue) * 100)
      : null;

  // Resolve product titles
  const productIds = topProductsRaw.map((p) => p.productId).filter(Boolean) as string[];
  const productTitles = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, title: true },
  });
  const titleMap = new Map(productTitles.map((p) => [p.id, p.title]));

  // Resolve categories
  const allProductIdsInCat = categoryRaw.map((p) => p.productId).filter(Boolean) as string[];
  const catProducts = await prisma.product.findMany({
    where: { id: { in: allProductIdsInCat } },
    select: { id: true, category: true },
  });
  const catMap = new Map(catProducts.map((p) => [p.id, p.category || "Sin categoría"]));

  const topProducts = topProductsRaw.map((p) => ({
    title: titleMap.get(p.productId!) || "Producto eliminado",
    revenue: p._sum.lineTotal ?? 0,
    units: p._sum.quantity ?? 0,
  }));

  const revenueByCategoryMap = new Map<string, { revenue: number; units: number }>();
  for (const item of categoryRaw) {
    const cat = catMap.get(item.productId!) || "Sin categoría";
    const existing = revenueByCategoryMap.get(cat) || { revenue: 0, units: 0 };
    existing.revenue += item._sum.lineTotal ?? 0;
    existing.units += item._sum.quantity ?? 0;
    revenueByCategoryMap.set(cat, existing);
  }
  const revenueByCategory = Array.from(revenueByCategoryMap.entries())
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  // Daily revenue chart
  const monthLabels = [
    "", "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  const dailyRevenue: DailyRevenuePoint[] = dailyOrders.map((row) => {
    const d = new Date(row.day);
    const day = d.getDate();
    const month = monthLabels[d.getMonth() + 1];
    return {
      date: d.toISOString().slice(0, 10),
      label: `${day} ${month}`,
      revenue: Number(row.total),
      orders: Number(row.cnt),
    };
  });

  const pctChange = (curr: number, prev: number): number | null => {
    if (prev === 0 && curr === 0) return null;
    if (prev === 0) return null;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const newCustomers30d = customers30d as number;
  const repeatRate = totalCustomers > 0 ? Math.round((recurringCount / totalCustomers) * 100) : null;

  const kpis: OverviewKPIs = {
    revenue30d,
    revenuePrev30d,
    revenueChange: pctChange(revenue30d, revenuePrev30d),
    orders30d,
    ordersPrev30d,
    ordersChange: pctChange(orders30d, ordersPrev30d),
    avgTicket: orders30d > 0 ? Math.round(revenue30d / orders30d) : 0,
    avgTicketPrev: ordersPrev30d > 0 ? Math.round(revenuePrev30d / ordersPrev30d) : 0,
    avgTicketChange:
      orders30d > 0 && ordersPrev30d > 0
        ? pctChange(Math.round(revenue30d / orders30d), Math.round(revenuePrev30d / ordersPrev30d))
        : null,
    totalCustomers,
    newCustomers30d,
    repeatRate,
    marginPercent,
    productsPublished,
    productsWithSales,
  };

  return { kpis, dailyRevenue, topProducts, revenueByCategory };
}

// ─── Commercial queries ──────────────────────────────────────────────────

export async function getStatsCommercial(): Promise<CommercialData> {
  const store = await getCurrentStore();
  if (!store) return { topProducts: [], topCategories: [], bottomProducts: [] };

  const sid = store.id;
  const d30 = daysAgo(30);
  const paidFilter = {
    storeId: sid,
    paymentStatus: { in: ["approved", "paid"] as string[] },
    status: { notIn: ["cancelled", "refunded"] as string[] },
  };

  const [topRaw, allRaw] = await Promise.all([
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: { ...paidFilter, createdAt: { gte: d30 } },
        productId: { not: null },
      },
      _sum: { lineTotal: true, quantity: true, costSnapshot: true },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: 12,
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: { ...paidFilter, createdAt: { gte: d30 } },
        productId: { not: null },
      },
      _sum: { lineTotal: true, quantity: true, costSnapshot: true },
    }),
  ]);

  const allIds = [...new Set([...topRaw, ...allRaw].map((r) => r.productId).filter(Boolean))] as string[];
  const products = await prisma.product.findMany({
    where: { id: { in: allIds } },
    select: { id: true, title: true, category: true },
  });
  const pMap = new Map(products.map((p) => [p.id, p]));

  const resolve = (r: (typeof topRaw)[number]) => {
    const p = pMap.get(r.productId!);
    const revenue = r._sum.lineTotal ?? 0;
    const cost = r._sum.costSnapshot ?? 0;
    const mp = revenue > 0 ? Math.round(((revenue - cost) / revenue) * 100) : null;
    const health =
      mp === null ? "sin datos" : mp < 0 ? "negativo" : mp < 15 ? "riesgo" : mp < 30 ? "fino" : "saludable";
    return {
      id: r.productId!,
      title: p?.title || "Producto eliminado",
      category: p?.category || "Sin categoría",
      revenue,
      units: r._sum.quantity ?? 0,
      marginPercent: mp,
      marginHealth: health,
    };
  };

  const topProducts = topRaw.map(resolve);

  // Categories
  const catMap = new Map<string, { revenue: number; units: number; productIds: Set<string>; margins: number[] }>();
  for (const r of allRaw) {
    const p = pMap.get(r.productId!);
    const cat = p?.category || "Sin categoría";
    const existing = catMap.get(cat) || { revenue: 0, units: 0, productIds: new Set<string>(), margins: [] as number[] };
    existing.revenue += r._sum.lineTotal ?? 0;
    existing.units += r._sum.quantity ?? 0;
    if (r.productId) existing.productIds.add(r.productId);
    const rev = r._sum.lineTotal ?? 0;
    const co = r._sum.costSnapshot ?? 0;
    if (rev > 0) existing.margins.push(Math.round(((rev - co) / rev) * 100));
    catMap.set(cat, existing);
  }

  const topCategories = Array.from(catMap.entries())
    .map(([category, d]) => ({
      category,
      revenue: d.revenue,
      units: d.units,
      productCount: d.productIds.size,
      avgMargin: d.margins.length > 0 ? Math.round(d.margins.reduce((a, b) => a + b, 0) / d.margins.length) : null,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  // Bottom products (lowest revenue, only those WITH sales)
  const bottomProducts = allRaw
    .map(resolve)
    .sort((a, b) => a.revenue - b.revenue)
    .slice(0, 5);

  return { topProducts, topCategories, bottomProducts };
}

// ─── Audience queries ────────────────────────────────────────────────────

export async function getStatsAudience(): Promise<AudienceData> {
  const store = await getCurrentStore();
  if (!store) {
    return {
      totalCustomers: 0, newCustomers30d: 0, recurringCustomers: 0,
      vipCustomers: 0, inactiveCustomers: 0, avgOrdersPerCustomer: 0,
      avgRevenuePerCustomer: 0, topCustomers: [], ordersByChannel: [],
    };
  }

  const sid = store.id;

  const [aggregated, channelRaw] = await Promise.all([
    getAggregatedCustomers(),
    prisma.order.groupBy({
      by: ["channel"],
      where: {
        storeId: sid,
        paymentStatus: { in: ["approved", "paid"] as string[] },
        status: { notIn: ["cancelled", "refunded"] as string[] },
      },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  const totalCustomers = aggregated.length;
  const recurring = aggregated.filter((c) => c.segment === "recurring").length;
  const vip = aggregated.filter((c) => c.segment === "vip").length;
  const inactive = aggregated.filter((c) => c.lifecycleStatus === "inactive").length;
  const totalOrders = aggregated.reduce((sum, c) => sum + c.ordersCount, 0);
  const totalSpent = aggregated.reduce((sum, c) => sum + c.totalSpent, 0);
  const new30d = aggregated.filter((c) => c.segment === "new").length;

  // Top customers
  const topCustomers = aggregated
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10)
    .map((c) => ({
      email: c.email,
      name: c.name || null,
      ordersCount: c.ordersCount,
      totalSpent: c.totalSpent,
      lastPurchaseAt: c.lastPurchaseAt,
    }));

  const ordersByChannel = channelRaw
    .map((r) => ({
      channel: r.channel || "directo",
      count: r._count,
      revenue: r._sum.total ?? 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    totalCustomers,
    newCustomers30d: new30d,
    recurringCustomers: recurring,
    vipCustomers: vip,
    inactiveCustomers: inactive,
    avgOrdersPerCustomer: totalCustomers > 0 ? Math.round((totalOrders / totalCustomers) * 10) / 10 : 0,
    avgRevenuePerCustomer: totalCustomers > 0 ? Math.round(totalSpent / totalCustomers) : 0,
    topCustomers,
    ordersByChannel,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function emptyKPIs(): OverviewKPIs {
  return {
    revenue30d: 0, revenuePrev30d: 0, revenueChange: null,
    orders30d: 0, ordersPrev30d: 0, ordersChange: null,
    avgTicket: 0, avgTicketPrev: 0, avgTicketChange: null,
    totalCustomers: 0, newCustomers30d: 0, repeatRate: null,
    marginPercent: null, productsPublished: 0, productsWithSales: 0,
  };
}