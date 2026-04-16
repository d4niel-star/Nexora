// ─── Sales Velocity + Demand Intelligence Engine v1 ───
// Pure calculation layer. No DB access. Receives raw data, outputs report.
// Designed to be consumed by Catalog, Sourcing, Nexora AI decision engine, and export.
//
// Signals are observable only:
// - Units sold (from collected/paid orders)
// - Revenue (net of cancellations/refunds at order level)
// - Time-windowed velocity (units/day in 7d and 30d)
// - Cross with profitability contribution when available
// - Provider aggregation when mirror data exists
//
// No forecasting. No ML. No invented demand.

import type {
  RotationTier,
  CommercialAction,
  VelocityWindow,
  ProductVelocity,
  ProviderVelocity,
  VelocitySummary,
  VelocityReport,
} from "@/types/velocity";

// ─── Input Types (what the query layer provides) ───

export interface VelocityOrderLine {
  orderId: string;
  productId: string;
  productTitle: string;
  category: string;
  supplier: string | null;
  quantity: number;
  lineTotal: number;
  orderDate: string; // ISO string
  orderStatus: string;
  paymentStatus: string;
  refundAmount: number;
  cancelledAt: string | null;
}

export interface VelocityProductContext {
  productId: string;
  isPublished: boolean;
  createdAt: string; // ISO string
  hasProvider: boolean;
  providerName: string | null;
}

export interface VelocityEconomics {
  productId: string;
  netContributionPercent: number;
  contributionPerUnit: number;
  marginHealth: string;
}

// ─── Constants ───

const PRIMARY_WINDOW_DAYS = 30;
const SECONDARY_WINDOW_DAYS = 7;

// Rotation thresholds (units in PRIMARY_WINDOW_DAYS)
const HIGH_ROTATION_UNITS = 10;
const MEDIUM_ROTATION_UNITS = 3;
const LOW_ROTATION_UNITS = 1;
// Minimum days since product creation to classify
const MIN_DAYS_FOR_CLASSIFICATION = 7;

// ─── Helpers ───

function daysBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

function isCollectedOrder(line: VelocityOrderLine): boolean {
  if (line.orderStatus === "cancelled" || line.cancelledAt) return false;
  if (line.paymentStatus === "refunded" || line.orderStatus === "refunded") return false;
  return line.paymentStatus === "approved" || line.paymentStatus === "paid";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Main Calculation ───

export function calculateVelocityReport(
  lines: VelocityOrderLine[],
  contexts: VelocityProductContext[],
  economics: VelocityEconomics[],
): VelocityReport {
  const now = new Date();
  const cutoff30 = new Date(now.getTime() - PRIMARY_WINDOW_DAYS * 86400000);
  const cutoff7 = new Date(now.getTime() - SECONDARY_WINDOW_DAYS * 86400000);

  // ─── Build per-product accumulators ───
  const productAcc = new Map<string, {
    title: string;
    category: string;
    supplier: string | null;
    totalUnits: number;
    totalRevenue: number;
    totalRefundedUnits: number;
    orderIds: Set<string>;
    units30d: number;
    revenue30d: number;
    orders30d: Set<string>;
    units7d: number;
    revenue7d: number;
    orders7d: Set<string>;
  }>();

  for (const line of lines) {
    if (!line.productId) continue;

    const collected = isCollectedOrder(line);
    if (!collected) continue;

    let acc = productAcc.get(line.productId);
    if (!acc) {
      acc = {
        title: line.productTitle,
        category: line.category,
        supplier: line.supplier,
        totalUnits: 0,
        totalRevenue: 0,
        totalRefundedUnits: 0,
        orderIds: new Set(),
        units30d: 0,
        revenue30d: 0,
        orders30d: new Set(),
        units7d: 0,
        revenue7d: 0,
        orders7d: new Set(),
      };
      productAcc.set(line.productId, acc);
    }

    acc.totalUnits += line.quantity;
    acc.totalRevenue += line.lineTotal;
    acc.orderIds.add(line.orderId);

    const orderDate = new Date(line.orderDate);

    if (orderDate >= cutoff30) {
      acc.units30d += line.quantity;
      acc.revenue30d += line.lineTotal;
      acc.orders30d.add(line.orderId);
    }
    if (orderDate >= cutoff7) {
      acc.units7d += line.quantity;
      acc.revenue7d += line.lineTotal;
      acc.orders7d.add(line.orderId);
    }
  }

  // Refunded units: count separately from refunded orders
  for (const line of lines) {
    if (!line.productId) continue;
    const isRefunded = line.paymentStatus === "refunded" || line.orderStatus === "refunded";
    if (!isRefunded) continue;
    const acc = productAcc.get(line.productId);
    if (acc) {
      acc.totalRefundedUnits += line.quantity;
    }
  }

  // ─── Context maps ───
  const contextMap = new Map<string, VelocityProductContext>();
  for (const c of contexts) contextMap.set(c.productId, c);

  const econMap = new Map<string, VelocityEconomics>();
  for (const e of economics) econMap.set(e.productId, e);

  // ─── Build product velocities ───
  // Include ALL products from context (even those with zero sales)
  const products: ProductVelocity[] = [];

  const allProductIds = new Set([
    ...productAcc.keys(),
    ...contexts.map((c) => c.productId),
  ]);

  for (const pid of allProductIds) {
    const acc = productAcc.get(pid);
    const ctx = contextMap.get(pid);
    const econ = econMap.get(pid);

    const title = acc?.title ?? ctx?.productId ?? pid;
    const category = acc?.category ?? "Sin categoria";
    const supplier = acc?.supplier ?? null;

    const totalUnitsSold = acc?.totalUnits ?? 0;
    const totalRevenue = acc?.totalRevenue ?? 0;
    const totalOrdersCount = acc?.orderIds.size ?? 0;
    const refundedUnits = acc?.totalRefundedUnits ?? 0;

    const units30d = acc?.units30d ?? 0;
    const revenue30d = acc?.revenue30d ?? 0;
    const orders30d = acc?.orders30d.size ?? 0;

    const units7d = acc?.units7d ?? 0;
    const revenue7d = acc?.revenue7d ?? 0;
    const orders7d = acc?.orders7d.size ?? 0;

    const windows: VelocityWindow[] = [
      { label: "30 dias", days: PRIMARY_WINDOW_DAYS, unitsSold: units30d, revenue: round2(revenue30d), ordersCount: orders30d },
      { label: "7 dias", days: SECONDARY_WINDOW_DAYS, unitsSold: units7d, revenue: round2(revenue7d), ordersCount: orders7d },
    ];

    const velocityPerDay = round2(units30d / PRIMARY_WINDOW_DAYS);

    // ─── Rotation classification ───
    const productAge = ctx ? daysBetween(new Date(ctx.createdAt), now) : 999;
    const rotation = classifyRotation(units30d, productAge, totalUnitsSold);
    const rotationEvidence = buildRotationEvidence(units30d, units7d, totalUnitsSold, productAge);

    // ─── Commercial action ───
    const { action, actionReason } = classifyAction(
      rotation,
      econ?.marginHealth ?? null,
      econ?.netContributionPercent ?? null,
      totalUnitsSold,
      ctx?.isPublished ?? false,
    );

    const hasProvider = ctx?.hasProvider ?? false;
    const providerName = ctx?.providerName ?? null;

    products.push({
      productId: pid,
      title,
      category,
      supplier,
      totalUnitsSold,
      totalRevenue: round2(totalRevenue),
      totalOrdersCount,
      refundedUnits,
      windows,
      velocityPerDay,
      velocityWindowDays: PRIMARY_WINDOW_DAYS,
      rotation,
      rotationEvidence,
      hasEconomicsData: !!econ,
      netContributionPercent: econ?.netContributionPercent ?? null,
      contributionPerUnit: econ?.contributionPerUnit ?? null,
      marginHealth: econ?.marginHealth ?? null,
      action,
      actionReason,
      hasProvider,
      providerName,
      href: `/admin/catalog`,
    });
  }

  // Sort: push first, then review, pause, maintain, evaluate
  products.sort((a, b) => actionRank(a.action) - actionRank(b.action) || b.velocityPerDay - a.velocityPerDay);

  // ─── Provider aggregation ───
  const providerAcc = new Map<string, {
    productCount: number;
    totalUnits: number;
    totalRevenue: number;
    velocitySum: number;
    highRotation: number;
    stalled: number;
    actions: CommercialAction[];
  }>();

  for (const p of products) {
    if (!p.providerName) continue;
    let pa = providerAcc.get(p.providerName);
    if (!pa) {
      pa = { productCount: 0, totalUnits: 0, totalRevenue: 0, velocitySum: 0, highRotation: 0, stalled: 0, actions: [] };
      providerAcc.set(p.providerName, pa);
    }
    pa.productCount++;
    pa.totalUnits += p.totalUnitsSold;
    pa.totalRevenue += p.totalRevenue;
    pa.velocitySum += p.velocityPerDay;
    if (p.rotation === "high") pa.highRotation++;
    if (p.rotation === "stalled" || p.rotation === "no_sales") pa.stalled++;
    pa.actions.push(p.action);
  }

  const providers: ProviderVelocity[] = [];
  for (const [name, pa] of providerAcc) {
    providers.push({
      providerName: name,
      productCount: pa.productCount,
      totalUnitsSold: pa.totalUnits,
      totalRevenue: round2(pa.totalRevenue),
      avgVelocityPerDay: round2(pa.velocitySum / pa.productCount),
      highRotationCount: pa.highRotation,
      stalledCount: pa.stalled,
      dominantAction: dominantValue(pa.actions),
    });
  }
  providers.sort((a, b) => b.totalUnitsSold - a.totalUnitsSold);

  // ─── Summary ───
  const summary: VelocitySummary = {
    totalProducts: products.length,
    productsWithSales: products.filter((p) => p.totalUnitsSold > 0).length,
    productsWithoutSales: products.filter((p) => p.totalUnitsSold === 0).length,
    highRotation: products.filter((p) => p.rotation === "high").length,
    mediumRotation: products.filter((p) => p.rotation === "medium").length,
    lowRotation: products.filter((p) => p.rotation === "low").length,
    stalled: products.filter((p) => p.rotation === "stalled").length,
    insufficientData: products.filter((p) => p.rotation === "insufficient_data" || p.rotation === "no_sales").length,
    pushCount: products.filter((p) => p.action === "push").length,
    reviewCount: products.filter((p) => p.action === "review").length,
    pauseCount: products.filter((p) => p.action === "pause").length,
    totalUnitsSold: products.reduce((s, p) => s + p.totalUnitsSold, 0),
    totalRevenue: round2(products.reduce((s, p) => s + p.totalRevenue, 0)),
    windowDays: PRIMARY_WINDOW_DAYS,
  };

  return {
    products,
    providers,
    summary,
    generatedAt: new Date().toISOString(),
    engineVersion: "v1",
  };
}

// ─── Classification helpers ───

function classifyRotation(units30d: number, productAgeDays: number, totalUnitsAllTime: number): RotationTier {
  if (productAgeDays < MIN_DAYS_FOR_CLASSIFICATION && totalUnitsAllTime === 0) {
    return "insufficient_data";
  }
  if (totalUnitsAllTime === 0) return "no_sales";
  if (units30d >= HIGH_ROTATION_UNITS) return "high";
  if (units30d >= MEDIUM_ROTATION_UNITS) return "medium";
  if (units30d >= LOW_ROTATION_UNITS) return "low";
  return "stalled";
}

function buildRotationEvidence(units30d: number, units7d: number, totalUnitsAllTime: number, productAgeDays: number): string {
  const parts: string[] = [];
  if (totalUnitsAllTime > 0) {
    parts.push(`${totalUnitsAllTime} u. vendidas total`);
  }
  parts.push(`${units30d} u. en 30d`);
  if (units7d > 0) {
    parts.push(`${units7d} u. en 7d`);
  }
  if (productAgeDays < MIN_DAYS_FOR_CLASSIFICATION) {
    parts.push(`producto creado hace ${Math.round(productAgeDays)}d`);
  }
  return parts.join(" · ");
}

function classifyAction(
  rotation: RotationTier,
  marginHealth: string | null,
  netContributionPercent: number | null,
  totalUnits: number,
  isPublished: boolean,
): { action: CommercialAction; actionReason: string } {
  // Not published: evaluate
  if (!isPublished) {
    return { action: "evaluate", actionReason: "Producto no publicado" };
  }

  // No economics data: classify by rotation alone
  if (!marginHealth) {
    if (rotation === "high" || rotation === "medium") {
      return { action: "maintain", actionReason: `Rotacion ${rotation === "high" ? "alta" : "media"}, sin datos de rentabilidad` };
    }
    if (rotation === "low" || rotation === "stalled") {
      return { action: "review", actionReason: "Rotacion baja, sin datos de rentabilidad para decidir" };
    }
    if (rotation === "no_sales") {
      return { action: "review", actionReason: "Sin ventas, evaluar visibilidad o retirar" };
    }
    return { action: "evaluate", actionReason: "Datos insuficientes" };
  }

  // With economics: cross rotation x margin
  const goodMargin = marginHealth === "profitable" || marginHealth === "thin";
  const badMargin = marginHealth === "negative" || marginHealth === "at_risk";

  if (rotation === "high" && goodMargin) {
    return { action: "push", actionReason: "Alta rotacion + contribucion positiva" };
  }
  if (rotation === "high" && badMargin) {
    return { action: "review", actionReason: "Alta rotacion pero contribucion negativa o riesgosa" };
  }
  if (rotation === "medium" && goodMargin) {
    return { action: "push", actionReason: "Rotacion media + buena contribucion" };
  }
  if (rotation === "medium" && badMargin) {
    return { action: "review", actionReason: "Rotacion media con margen debil" };
  }
  if ((rotation === "low" || rotation === "stalled") && goodMargin) {
    return { action: "review", actionReason: "Buena contribucion pero baja rotacion, evaluar visibilidad" };
  }
  if ((rotation === "low" || rotation === "stalled") && badMargin) {
    return { action: "pause", actionReason: "Baja rotacion + margen negativo" };
  }
  if (rotation === "no_sales" && badMargin) {
    return { action: "pause", actionReason: "Sin ventas y margen negativo" };
  }
  if (rotation === "no_sales") {
    return { action: "review", actionReason: "Sin ventas en 30 dias" };
  }

  return { action: "evaluate", actionReason: "Datos insuficientes para clasificar" };
}

function actionRank(a: CommercialAction): number {
  switch (a) {
    case "push": return 1;
    case "review": return 2;
    case "pause": return 3;
    case "maintain": return 4;
    case "evaluate": return 5;
  }
}

function dominantValue(actions: CommercialAction[]): CommercialAction {
  const counts = new Map<CommercialAction, number>();
  for (const a of actions) counts.set(a, (counts.get(a) || 0) + 1);
  let best: CommercialAction = "evaluate";
  let bestCount = 0;
  for (const [action, count] of counts) {
    if (count > bestCount) { best = action; bestCount = count; }
  }
  return best;
}
