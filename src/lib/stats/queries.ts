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
  PrevDailyRevenuePoint,
  OverviewKPIs,
  OverviewData,
  CommercialData,
  AudienceData,
  DateRange,
} from "./types";

// Re-export types for backward compatibility
export type {
  DailyRevenuePoint,
  PrevDailyRevenuePoint,
  OverviewKPIs,
  OverviewData,
  CommercialData,
  AudienceData,
  DateRange,
} from "./types";

// ─── Shared helpers ──────────────────────────────────────────────────────

/** Parse a YYYY-MM-DD into a UTC Date pinned to 00:00:00.000. Returns null
 *  on any malformed input — defensive parsing because this comes from
 *  searchParams. */
function parseISODate(value: string | undefined | null): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Resolve the effective analytical range. Defaults to the trailing 30
 *  days. Always returns a {from, to} pair where `to` is the END of the
 *  selected day (so SQL `< toExclusive` behaves correctly). */
export function resolveStatsRange(
  fromParam?: string | null,
  toParam?: string | null,
): { from: Date; to: Date; toExclusive: Date; days: number } {
  const fromArg = parseISODate(fromParam);
  const toArg = parseISODate(toParam);

  // Default = last 30 days, ending today.
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);

  const to = toArg ?? todayUtc;
  const from = fromArg ?? new Date(to.getTime() - 29 * 86_400_000);

  // Normalize: from <= to. If swapped, swap.
  const safeFrom = from <= to ? from : to;
  const safeTo = from <= to ? to : from;

  const toExclusive = new Date(safeTo.getTime() + 86_400_000);
  const days = Math.round((toExclusive.getTime() - safeFrom.getTime()) / 86_400_000);

  return { from: safeFrom, to: safeTo, toExclusive, days };
}

interface StatsRangeArgs {
  from?: string | null;
  to?: string | null;
}

// ─── Overview queries ────────────────────────────────────────────────────

export async function getStatsOverview(args: StatsRangeArgs = {}): Promise<OverviewData> {
  const store = await getCurrentStore();
  const range = resolveStatsRange(args.from, args.to);
  const prevTo = new Date(range.from.getTime()); // exclusive upper bound for prev period
  const prevFrom = new Date(range.from.getTime() - range.days * 86_400_000);
  const fallbackRange: DateRange = { from: toISODate(range.from), to: toISODate(range.to) };
  const fallbackPrev: DateRange = { from: toISODate(prevFrom), to: toISODate(new Date(prevTo.getTime() - 86_400_000)) };

  if (!store) {
    return {
      range: fallbackRange,
      prevRange: fallbackPrev,
      rangeDays: range.days,
      kpis: emptyKPIs(),
      dailyRevenue: [],
      prevDailyRevenue: [],
      topProducts: [],
      revenueByCategory: [],
    };
  }

  const sid = store.id;

  const paidFilter = {
    storeId: sid,
    paymentStatus: { in: ["approved", "paid"] as string[] },
    status: { notIn: ["cancelled", "refunded"] as string[] },
  };

  // Core aggregates in parallel — all bounded by the resolved range.
  const [
    aggCurr,
    aggPrev,
    marginAgg,
    productsPublished,
    productsWithSales,
    dailyOrders,
    prevDailyOrders,
    topProductsRaw,
    categoryRaw,
    customersInRange,
    totalCustomers,
    recurringCount,
  ] = await Promise.all([
    // Revenue + orders for current range
    prisma.order.aggregate({
      where: { ...paidFilter, createdAt: { gte: range.from, lt: range.toExclusive } },
      _sum: { total: true },
      _count: true,
    }),
    // Revenue + orders for previous equal-length range
    prisma.order.aggregate({
      where: { ...paidFilter, createdAt: { gte: prevFrom, lt: prevTo } },
      _sum: { total: true },
      _count: true,
    }),
    // Margin from profitability — avg net contribution %
    prisma.orderItem.aggregate({
      where: {
        order: { ...paidFilter, createdAt: { gte: range.from, lt: range.toExclusive } },
      },
      _sum: { lineTotal: true, costSnapshot: true, quantity: true },
    }),
    prisma.product.count({ where: { storeId: sid, isPublished: true } }),
    prisma.orderItem.findMany({
      where: { order: { ...paidFilter, createdAt: { gte: range.from, lt: range.toExclusive } } },
      distinct: ["productId"],
      select: { productId: true },
    }).then((r) => new Set(r.map((x) => x.productId)).size),
    // Daily buckets for current range
    prisma.$queryRaw<
      { day: Date; total: number; cnt: number }[]
    >`SELECT DATE("createdAt") as day, SUM("total") as total, COUNT(*) as cnt FROM "Order" WHERE "storeId" = ${sid} AND "paymentStatus" IN ('approved','paid') AND "status" NOT IN ('cancelled','refunded') AND "createdAt" >= ${range.from} AND "createdAt" < ${range.toExclusive} GROUP BY DATE("createdAt") ORDER BY day ASC`,
    // Daily buckets for previous range — used by the hero chart overlay
    prisma.$queryRaw<
      { day: Date; total: number }[]
    >`SELECT DATE("createdAt") as day, SUM("total") as total FROM "Order" WHERE "storeId" = ${sid} AND "paymentStatus" IN ('approved','paid') AND "status" NOT IN ('cancelled','refunded') AND "createdAt" >= ${prevFrom} AND "createdAt" < ${prevTo} GROUP BY DATE("createdAt") ORDER BY day ASC`,
    // Top products by revenue
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: { ...paidFilter, createdAt: { gte: range.from, lt: range.toExclusive } },
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
        order: { ...paidFilter, createdAt: { gte: range.from, lt: range.toExclusive } },
        productId: { not: null },
      },
      _sum: { lineTotal: true, quantity: true },
    }),
    // New customers in range — raw SQL for accuracy
    prisma.$queryRaw<{ cnt: number }[]>`
      SELECT COUNT(*) as cnt FROM (
        SELECT "email", MIN("createdAt") as first_order
        FROM "Order"
        WHERE "storeId" = ${sid} AND "status" != 'cancelled' AND "email" IS NOT NULL AND "email" != ''
        GROUP BY "email"
        HAVING MIN("createdAt") >= ${range.from} AND MIN("createdAt") < ${range.toExclusive}
      ) sub
    `.then((r) => Number(r[0]?.cnt ?? 0)),
    // Total distinct customers (lifetime)
    prisma.order.findMany({
      where: { storeId: sid, status: { not: "cancelled" as string }, email: { not: "" } },
      distinct: ["email"],
      select: { email: true },
    }).then((r) => r.length),
    // Recurring customers (>= 2 orders) lifetime
    prisma.$queryRaw<{ cnt: number }[]>`
      SELECT COUNT(*) as cnt FROM (
        SELECT "email" FROM "Order"
        WHERE "storeId" = ${sid} AND "status" != 'cancelled' AND "email" IS NOT NULL AND "email" != ''
        GROUP BY "email" HAVING COUNT(*) >= 2
      ) sub
    `.then((r) => Number(r[0]?.cnt ?? 0)),
  ]);

  const revenue30d = aggCurr._sum.total ?? 0;
  const revenuePrev30d = aggPrev._sum.total ?? 0;
  const orders30d = aggCurr._count;
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

  // Daily revenue chart — fill missing days with zeros so the line is
  // continuous and the X axis density matches the selected range.
  const monthLabels = [
    "", "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];

  const dailyMap = new Map<string, { revenue: number; orders: number }>();
  for (const row of dailyOrders) {
    const key = toISODate(new Date(row.day));
    dailyMap.set(key, { revenue: Number(row.total), orders: Number(row.cnt) });
  }
  const prevMap = new Map<string, number>();
  for (const row of prevDailyOrders) {
    const key = toISODate(new Date(row.day));
    prevMap.set(key, Number(row.total));
  }

  const dailyRevenue: DailyRevenuePoint[] = [];
  const prevDailyRevenue: PrevDailyRevenuePoint[] = [];
  for (let i = 0; i < range.days; i++) {
    const cur = new Date(range.from.getTime() + i * 86_400_000);
    const prev = new Date(prevFrom.getTime() + i * 86_400_000);
    const curKey = toISODate(cur);
    const prevKey = toISODate(prev);
    const curBucket = dailyMap.get(curKey) ?? { revenue: 0, orders: 0 };
    dailyRevenue.push({
      date: curKey,
      label: `${cur.getUTCDate()} ${monthLabels[cur.getUTCMonth() + 1]}`,
      revenue: curBucket.revenue,
      orders: curBucket.orders,
    });
    prevDailyRevenue.push({
      index: i,
      date: prevKey,
      revenue: prevMap.get(prevKey) ?? 0,
    });
  }

  const pctChange = (curr: number, prev: number): number | null => {
    if (prev === 0 && curr === 0) return null;
    if (prev === 0) return null;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const newCustomers30d = customersInRange as number;
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

  return {
    range: fallbackRange,
    prevRange: fallbackPrev,
    rangeDays: range.days,
    kpis,
    dailyRevenue,
    prevDailyRevenue,
    topProducts,
    revenueByCategory,
  };
}

// ─── Commercial queries ──────────────────────────────────────────────────

export async function getStatsCommercial(args: StatsRangeArgs = {}): Promise<CommercialData> {
  const store = await getCurrentStore();
  if (!store) return { topProducts: [], topCategories: [], bottomProducts: [] };

  const sid = store.id;
  const range = resolveStatsRange(args.from, args.to);
  const paidFilter = {
    storeId: sid,
    paymentStatus: { in: ["approved", "paid"] as string[] },
    status: { notIn: ["cancelled", "refunded"] as string[] },
  };

  const [topRaw, allRaw] = await Promise.all([
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: { ...paidFilter, createdAt: { gte: range.from, lt: range.toExclusive } },
        productId: { not: null },
      },
      _sum: { lineTotal: true, quantity: true, costSnapshot: true },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: 12,
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: { ...paidFilter, createdAt: { gte: range.from, lt: range.toExclusive } },
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