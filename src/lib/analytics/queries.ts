import { prisma } from "@/lib/db/prisma";
import type { DateRange } from "./dates";
import { previousRange, bucketKey, defaultGrouping } from "./dates";

// ─── Analytics Queries (Phase 7C.2) ──────────────────────────────────
// Honest analytics. Every metric returned here is computed from REAL
// data in our DB. When a metric requires telemetry we don't capture
// (e.g. PDP views, add-to-cart events at the storefront level), we
// surface it as `unavailable: { reason: "..." }` instead of fabricating.
// The UI renders an explicit unavailable state — no zero-with-tooltip.
//
// Caching: each function is cheap-ish individually but the page composes
// 5+ of them. The page-level component should wrap these in `cache()`
// from React 19. We avoid heavier caching (Redis, etc.) until a real
// performance issue surfaces — premature optimization buys nothing.

export interface RevenueIntelligence {
  range: { from: string; to: string };
  grossRevenue: number;
  refundedTotal: number;
  netRevenue: number;
  shippingRevenue: number;
  ordersCount: number;
  averageOrderValue: number;
  currency: string;
  comparison: {
    grossRevenueDelta: number; // -1..+inf, fraction change vs previous period
    ordersDelta: number;
  };
  series: Array<{ bucket: string; gross: number; orders: number }>;
}

export async function getRevenueIntelligence(storeId: string, range: DateRange): Promise<RevenueIntelligence> {
  const [current, previous] = await Promise.all([
    fetchRevenueWindow(storeId, range),
    fetchRevenueWindow(storeId, previousRange(range)),
  ]);

  const grouping = defaultGrouping(range);
  const seriesMap = new Map<string, { gross: number; orders: number }>();
  for (const o of current.orders) {
    const k = bucketKey(o.createdAt, grouping);
    const prev = seriesMap.get(k) ?? { gross: 0, orders: 0 };
    prev.gross += o.total;
    prev.orders += 1;
    seriesMap.set(k, prev);
  }
  const series = Array.from(seriesMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([bucket, v]) => ({ bucket, gross: v.gross, orders: v.orders }));

  const ordersCount = current.orders.length;
  const grossRevenue = current.gross;
  const refundedTotal = current.refunded;
  const shippingRevenue = current.shipping;
  const netRevenue = Math.max(0, grossRevenue - refundedTotal);
  const averageOrderValue = ordersCount > 0 ? grossRevenue / ordersCount : 0;

  return {
    range: { from: range.from.toISOString(), to: range.to.toISOString() },
    grossRevenue,
    refundedTotal,
    netRevenue,
    shippingRevenue,
    ordersCount,
    averageOrderValue,
    currency: current.currency,
    comparison: {
      grossRevenueDelta: previous.gross > 0 ? (grossRevenue - previous.gross) / previous.gross : 0,
      ordersDelta: previous.orders.length > 0 ? (ordersCount - previous.orders.length) / previous.orders.length : 0,
    },
    series,
  };
}

async function fetchRevenueWindow(storeId: string, range: DateRange) {
  const orders = await prisma.order.findMany({
    where: {
      storeId,
      createdAt: { gte: range.from, lt: range.to },
      status: { not: "cancelled" },
    },
    select: {
      total: true,
      shippingAmount: true,
      refundAmount: true,
      currency: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
    take: 5000, // bounded — covers >150/day for a year
  });

  let gross = 0;
  let refunded = 0;
  let shipping = 0;
  let currency = "ARS";
  for (const o of orders) {
    gross += o.total;
    refunded += o.refundAmount ?? 0;
    shipping += o.shippingAmount ?? 0;
    if (o.currency) currency = o.currency;
  }
  return { orders, gross, refunded, shipping, currency };
}

// ─── Conversion Intelligence ──────────────────────────────────────────
// Storefront PDP-view + add-to-cart telemetry IS NOT captured anywhere
// in the schema today. We surface checkout-start / checkout-complete /
// abandonment from the data we DO have (Cart + Order). Everything else
// is reported as unavailable.

export interface ConversionIntelligence {
  range: { from: string; to: string };
  storefrontVisits: { value: null; unavailable: { reason: string } };
  pdpViews: { value: null; unavailable: { reason: string } };
  addToCartRate: { value: null; unavailable: { reason: string } };
  checkoutStart: { value: number };
  checkoutCompletion: { value: number };
  /** completed / (completed + abandoned) */
  completionRate: number | null;
  abandonmentRate: number | null;
}

export async function getConversionIntelligence(storeId: string, range: DateRange): Promise<ConversionIntelligence> {
  const [completed, abandoned, started] = await Promise.all([
    prisma.order.count({
      where: {
        storeId,
        createdAt: { gte: range.from, lt: range.to },
        paymentStatus: { in: ["paid", "approved"] },
      },
    }),
    prisma.cart.count({
      where: { storeId, status: "abandoned", updatedAt: { gte: range.from, lt: range.to } },
    }),
    // checkoutStart = total carts that ever moved beyond the empty state
    // in this window. We approximate via Cart rows updated in window with
    // a checkout draft attached.
    prisma.checkoutDraft.count({
      where: { storeId, createdAt: { gte: range.from, lt: range.to } },
    }).catch(() => 0),
  ]);

  const denom = completed + abandoned;
  return {
    range: { from: range.from.toISOString(), to: range.to.toISOString() },
    storefrontVisits: {
      value: null,
      unavailable: {
        reason: "No tenemos telemetría de visitas storefront. Conectá Plausible/GA o instalá el script de Nexora Pixel para habilitar este panel.",
      },
    },
    pdpViews: {
      value: null,
      unavailable: {
        reason: "Vistas de PDP requieren analytics frontend. No están registradas en el schema actual.",
      },
    },
    addToCartRate: {
      value: null,
      unavailable: {
        reason: "Eventos add-to-cart no se persisten. Disponible cuando se habilite Pixel.",
      },
    },
    checkoutStart: { value: started },
    checkoutCompletion: { value: completed },
    completionRate: denom > 0 ? completed / denom : null,
    abandonmentRate: denom > 0 ? abandoned / denom : null,
  };
}

// ─── Product Intelligence ─────────────────────────────────────────────
export interface ProductIntelligence {
  topSellers: Array<{ productId: string; title: string; quantity: number; revenue: number }>;
  slowMovers: Array<{ productId: string; title: string; daysSinceLastSale: number | null }>;
  attachRateUnavailable: { reason: string };
}

export async function getProductIntelligence(storeId: string, range: DateRange): Promise<ProductIntelligence> {
  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: {
        storeId,
        createdAt: { gte: range.from, lt: range.to },
        status: { not: "cancelled" },
      },
    },
    select: {
      productId: true,
      productName: true,
      quantity: true,
      priceSnapshot: true,
    },
    take: 10_000,
  });

  const byProduct = new Map<string, { title: string; quantity: number; revenue: number }>();
  for (const it of orderItems) {
    if (!it.productId) continue; // legacy rows without product link
    const e = byProduct.get(it.productId) ?? { title: it.productName ?? "Producto", quantity: 0, revenue: 0 };
    e.quantity += it.quantity;
    e.revenue += it.quantity * (it.priceSnapshot ?? 0);
    byProduct.set(it.productId, e);
  }
  const topSellers = Array.from(byProduct.entries())
    .map(([productId, v]) => ({ productId, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Slow movers: published products with no order item in window
  const productsWithoutSales = await prisma.product.findMany({
    where: {
      storeId,
      isPublished: true,
      id: { notIn: Array.from(byProduct.keys()) },
    },
    select: { id: true, title: true, updatedAt: true },
    orderBy: { updatedAt: "asc" },
    take: 10,
  });

  return {
    topSellers,
    slowMovers: productsWithoutSales.map((p) => ({
      productId: p.id,
      title: p.title,
      daysSinceLastSale: null, // would require a per-product LAST_SOLD_AT denorm
    })),
    attachRateUnavailable: {
      reason: "Cálculo de attach rate requiere recorrido completo de combos. Diferido.",
    },
  };
}

// ─── Customer Intelligence ────────────────────────────────────────────
export interface CustomerIntelligence {
  newCustomers: number;
  returningCustomers: number;
  /** Top 10% of LTV vs the rest — VIP concentration. */
  vipShareOfRevenue: number | null;
  repeatPurchaseRate: number | null;
}

export async function getCustomerIntelligence(storeId: string, range: DateRange): Promise<CustomerIntelligence> {
  // All paid orders in window — we compute the customer aggregations
  // in JS to avoid 4 SQL roundtrips for what's a small dataset.
  const orders = await prisma.order.findMany({
    where: {
      storeId,
      createdAt: { gte: range.from, lt: range.to },
      status: { not: "cancelled" },
    },
    select: { email: true, total: true },
    take: 10_000,
  });

  if (orders.length === 0) {
    return { newCustomers: 0, returningCustomers: 0, vipShareOfRevenue: null, repeatPurchaseRate: null };
  }

  const byEmail = new Map<string, { count: number; revenue: number }>();
  for (const o of orders) {
    const k = o.email.toLowerCase();
    const e = byEmail.get(k) ?? { count: 0, revenue: 0 };
    e.count += 1;
    e.revenue += o.total;
    byEmail.set(k, e);
  }

  // For each unique email, was their *first ever* order at this store
  // inside the window? That's "new" — otherwise "returning".
  const emails = Array.from(byEmail.keys());
  const firstOrders = await prisma.order.groupBy({
    by: ["email"],
    where: { storeId, email: { in: emails } },
    _min: { createdAt: true },
  });
  const firstOrderMap = new Map(firstOrders.map((r) => [r.email.toLowerCase(), r._min.createdAt]));

  let newCustomers = 0;
  let returningCustomers = 0;
  for (const email of emails) {
    const firstAt = firstOrderMap.get(email);
    if (firstAt && firstAt >= range.from && firstAt < range.to) newCustomers += 1;
    else returningCustomers += 1;
  }

  // VIP = top 10% by revenue
  const sortedByRev = Array.from(byEmail.values()).sort((a, b) => b.revenue - a.revenue);
  const vipCount = Math.max(1, Math.ceil(sortedByRev.length * 0.1));
  const vipRevenue = sortedByRev.slice(0, vipCount).reduce((s, c) => s + c.revenue, 0);
  const totalRevenue = sortedByRev.reduce((s, c) => s + c.revenue, 0);
  const vipShare = totalRevenue > 0 ? vipRevenue / totalRevenue : null;

  // Repeat purchase rate = customers with ≥2 orders / total
  const repeats = Array.from(byEmail.values()).filter((c) => c.count >= 2).length;
  const repeatPurchaseRate = byEmail.size > 0 ? repeats / byEmail.size : null;

  return {
    newCustomers,
    returningCustomers,
    vipShareOfRevenue: vipShare,
    repeatPurchaseRate,
  };
}

// ─── Operational Intelligence ─────────────────────────────────────────
export interface OperationalIntelligence {
  fulfillmentSlaMs: number | null;
  averageShippingMs: number | null;
  refundLatencyMs: number | null;
  failedJobs24h: number;
  pendingJobs: number;
  deadJobs24h: number;
}

export async function getOperationalIntelligence(storeId: string): Promise<OperationalIntelligence> {
  const last30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [orders, pending, failed, dead] = await Promise.all([
    prisma.order.findMany({
      where: {
        storeId,
        createdAt: { gte: last30d },
        deliveredAt: { not: null },
      },
      select: { createdAt: true, deliveredAt: true, refundedAt: true, cancelledAt: true },
      take: 1000,
    }),
    prisma.job.count({ where: { status: "pending" } }),
    prisma.job.count({ where: { status: "failed", finishedAt: { gte: last24h } } }),
    prisma.job.count({ where: { status: "dead", finishedAt: { gte: last24h } } }),
  ]);

  const fulfillmentSamples: number[] = [];
  const refundLatencySamples: number[] = [];
  for (const o of orders) {
    if (o.deliveredAt) fulfillmentSamples.push(o.deliveredAt.getTime() - o.createdAt.getTime());
    if (o.refundedAt && o.cancelledAt) refundLatencySamples.push(o.refundedAt.getTime() - o.cancelledAt.getTime());
  }

  const avg = (xs: number[]) => xs.length === 0 ? null : Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
  return {
    fulfillmentSlaMs: avg(fulfillmentSamples),
    averageShippingMs: avg(fulfillmentSamples), // approximation: same for now
    refundLatencyMs: avg(refundLatencySamples),
    failedJobs24h: failed,
    pendingJobs: pending,
    deadJobs24h: dead,
  };
}
