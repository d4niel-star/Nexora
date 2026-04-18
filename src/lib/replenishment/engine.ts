// ─── Sell-Through + Reorder / Replenishment Intelligence Engine v2 ───
// Pure calculation layer. No DB access. Receives raw data, outputs report.
// Designed to be consumed by AI Hub, Inventory, Catalog, Sourcing.
//
// v2 improvements:
// - Lead-time-adjusted urgency: when coverage < provider lead time, escalate
// - reorderPoint per variant (aggregated) used in urgency classification
// - Structured leadTimeMinDays/leadTimeMaxDays for real coverage math
// - leadTimeRiskLabel: explains if reorder timing is viable
//
// Observable signals only:
// - Current stock & reserved stock per product (sum of variants)
// - Sales velocity (units/day from velocity engine)
// - Coverage = available stock / velocity per day
// - Sell-through = units sold / (units sold + current stock)
// - Provider stock & lead time when mirror exists
// - Economics cross for priority (margin health, contribution)
//
// No forecasting. No machine learning. No invented reorder points.

import type {
  ReplenishmentUrgency,
  ReplenishmentAction,
  ProductReplenishment,
  ProviderReplenishment,
  ReplenishmentSummary,
  ReplenishmentReport,
} from "@/types/replenishment";

// ─── Input Types (what the query layer provides) ───

export interface ReplenishmentStockInput {
  productId: string;
  title: string;
  category: string;
  supplier: string | null;
  isPublished: boolean;
  totalStock: number;
  reservedStock: number;
  variantCount: number;
  variantsOutOfStock: number;
  trackingInventory: boolean;
  reorderPoint: number | null; // Per-variant min (aggregated). Null = use system default.
}

export interface ReplenishmentVelocityInput {
  productId: string;
  velocityPerDay: number;
  unitsSold30d: number;
  rotation: string;
}

export interface ReplenishmentEconomicsInput {
  productId: string;
  marginHealth: string;
  contributionPerUnit: number;
}

export interface ReplenishmentProviderInput {
  productId: string;
  providerName: string;
  providerStock: number;
  providerLeadTime: string | null;
  providerLeadTimeMinDays: number | null;
  providerLeadTimeMaxDays: number | null;
}

// ─── Constants ───

const WINDOW_DAYS = 30;
const CRITICAL_COVERAGE_DAYS = 3;
const SOON_COVERAGE_DAYS = 10;
const OVERSTOCK_COVERAGE_DAYS = 120;
const OVERSTOCK_MIN_UNITS = 20;

// ─── Helpers ───

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ─── Main Calculation ───

export function calculateReplenishmentReport(
  stocks: ReplenishmentStockInput[],
  velocities: ReplenishmentVelocityInput[],
  economics: ReplenishmentEconomicsInput[],
  providers: ReplenishmentProviderInput[],
): ReplenishmentReport {

  const velMap = new Map<string, ReplenishmentVelocityInput>();
  for (const v of velocities) velMap.set(v.productId, v);

  const econMap = new Map<string, ReplenishmentEconomicsInput>();
  for (const e of economics) econMap.set(e.productId, e);

  const provMap = new Map<string, ReplenishmentProviderInput>();
  for (const p of providers) provMap.set(p.productId, p);

  const products: ProductReplenishment[] = [];

  for (const s of stocks) {
    const vel = velMap.get(s.productId);
    const econ = econMap.get(s.productId);
    const prov = provMap.get(s.productId);

    const availableStock = Math.max(s.totalStock - s.reservedStock, 0);
    const velocityPerDay = vel?.velocityPerDay ?? 0;
    const unitsSold30d = vel?.unitsSold30d ?? 0;
    const rotation = vel?.rotation ?? "no_sales";

    // ─── Coverage: days of stock at current velocity ───
    let coverageDays: number | null = null;
    let coverageLabel: string;
    if (!s.trackingInventory) {
      coverageLabel = "Sin seguimiento de inventario";
    } else if (velocityPerDay <= 0) {
      if (availableStock > 0) {
        coverageLabel = `${availableStock} u. disponibles, sin ventas recientes`;
      } else {
        coverageLabel = "Sin stock y sin ventas";
      }
    } else {
      coverageDays = round1(availableStock / velocityPerDay);
      if (coverageDays < 1) {
        coverageLabel = `Menos de 1 dia de cobertura`;
      } else {
        coverageLabel = `${Math.round(coverageDays)} dias de cobertura a ${round1(velocityPerDay)} u./dia`;
      }
    }

    // ─── Sell-through ───
    let sellThroughPercent: number | null = null;
    let sellThroughLabel: string;
    const sellThroughDenom = unitsSold30d + s.totalStock;
    if (sellThroughDenom > 0 && unitsSold30d > 0) {
      sellThroughPercent = Math.round((unitsSold30d / sellThroughDenom) * 100);
      sellThroughLabel = `${sellThroughPercent}% sell-through (${unitsSold30d} vendidas / ${sellThroughDenom} totales en 30d)`;
    } else if (unitsSold30d === 0 && s.totalStock > 0) {
      sellThroughPercent = 0;
      sellThroughLabel = `0% sell-through, ${s.totalStock} u. inmovilizadas`;
    } else {
      sellThroughLabel = "Sin datos suficientes";
    }

    // ─── Provider context + lead time analysis ───
    const hasProvider = !!prov;
    const canReorderFromProvider = hasProvider && (prov!.providerStock > 0);
    const leadTimeMaxDays = prov?.providerLeadTimeMaxDays ?? null;
    const leadTimeMinDays = prov?.providerLeadTimeMinDays ?? null;

    // Lead-time risk: can we reorder and receive before stockout?
    let leadTimeRiskLabel: string | null = null;
    if (hasProvider && canReorderFromProvider && coverageDays !== null && leadTimeMaxDays !== null) {
      if (coverageDays <= leadTimeMaxDays) {
        leadTimeRiskLabel = `Cobertura ${Math.round(coverageDays)}d < lead time ${leadTimeMaxDays}d — quiebre probable antes de recibir reposición`;
      } else if (leadTimeMinDays !== null && coverageDays <= leadTimeMinDays * 1.5) {
        leadTimeRiskLabel = `Cobertura ${Math.round(coverageDays)}d cercana a lead time ${leadTimeMinDays}-${leadTimeMaxDays}d — margen ajustado`;
      }
    }

    // ─── Urgency classification (v2: lead-time-adjusted) ───
    const { urgency, urgencyEvidence } = classifyUrgency(
      availableStock, s.totalStock, s.reservedStock, coverageDays,
      velocityPerDay, unitsSold30d, s.trackingInventory, s.isPublished,
      s.variantsOutOfStock, s.variantCount, s.reorderPoint,
      leadTimeMaxDays,
    );

    // ─── Action classification ───
    const { action, actionReason } = classifyAction(
      urgency, econ?.marginHealth ?? null, canReorderFromProvider, s.isPublished,
    );

    products.push({
      productId: s.productId,
      title: s.title,
      category: s.category,
      supplier: s.supplier,
      totalStock: s.totalStock,
      reservedStock: s.reservedStock,
      availableStock,
      variantCount: s.variantCount,
      variantsOutOfStock: s.variantsOutOfStock,
      trackingInventory: s.trackingInventory,
      velocityPerDay,
      unitsSold30d,
      rotation,
      coverageDays,
      coverageLabel,
      sellThroughPercent,
      sellThroughLabel,
      hasProvider,
      providerName: prov?.providerName ?? null,
      providerStock: prov?.providerStock ?? null,
      providerLeadTime: prov?.providerLeadTime ?? null,
      providerLeadTimeMinDays: prov?.providerLeadTimeMinDays ?? null,
      providerLeadTimeMaxDays: prov?.providerLeadTimeMaxDays ?? null,
      canReorderFromProvider,
      leadTimeRiskLabel,
      hasEconomicsData: !!econ,
      marginHealth: econ?.marginHealth ?? null,
      contributionPerUnit: econ?.contributionPerUnit ?? null,
      urgency,
      urgencyEvidence,
      action,
      actionReason,
      href: "/admin/inventory",
    });
  }

  // Sort: critical first, then soon, monitor, adequate, overstock, no_data
  products.sort((a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency) || b.velocityPerDay - a.velocityPerDay);

  // ─── Provider aggregation ───
  const provAcc = new Map<string, {
    productCount: number;
    criticalCount: number;
    soonCount: number;
    canSupplyCount: number;
    coverageSum: number;
    coverageCount: number;
  }>();

  for (const p of products) {
    if (!p.providerName) continue;
    let pa = provAcc.get(p.providerName);
    if (!pa) {
      pa = { productCount: 0, criticalCount: 0, soonCount: 0, canSupplyCount: 0, coverageSum: 0, coverageCount: 0 };
      provAcc.set(p.providerName, pa);
    }
    pa.productCount++;
    if (p.urgency === "critical") pa.criticalCount++;
    if (p.urgency === "soon") pa.soonCount++;
    if (p.canReorderFromProvider) pa.canSupplyCount++;
    if (p.coverageDays !== null) {
      pa.coverageSum += p.coverageDays;
      pa.coverageCount++;
    }
  }

  const providerResults: ProviderReplenishment[] = [];
  for (const [name, pa] of provAcc) {
    providerResults.push({
      providerName: name,
      productCount: pa.productCount,
      criticalCount: pa.criticalCount,
      soonCount: pa.soonCount,
      canSupplyCount: pa.canSupplyCount,
      avgCoverageDays: pa.coverageCount > 0 ? round1(pa.coverageSum / pa.coverageCount) : null,
    });
  }
  providerResults.sort((a, b) => b.criticalCount - a.criticalCount || b.soonCount - a.soonCount);

  // ─── Summary ───
  const summary: ReplenishmentSummary = {
    totalProducts: products.length,
    critical: products.filter((p) => p.urgency === "critical").length,
    soon: products.filter((p) => p.urgency === "soon").length,
    monitor: products.filter((p) => p.urgency === "monitor").length,
    overstock: products.filter((p) => p.urgency === "overstock").length,
    adequate: products.filter((p) => p.urgency === "adequate").length,
    noData: products.filter((p) => p.urgency === "no_data").length,
    reorderCount: products.filter((p) => p.action === "reorder").length,
    reviewCount: products.filter((p) => p.action === "review").length,
    watchCount: products.filter((p) => p.action === "watch").length,
    reduceCount: products.filter((p) => p.action === "reduce").length,
    windowDays: WINDOW_DAYS,
  };

  return {
    products,
    providers: providerResults,
    summary,
    generatedAt: new Date().toISOString(),
    engineVersion: "v2",
  };
}

// ─── Classification helpers ───

function classifyUrgency(
  available: number, totalStock: number, reserved: number,
  coverageDays: number | null, velocityPerDay: number, unitsSold30d: number,
  trackingInventory: boolean, isPublished: boolean,
  variantsOOS: number, variantCount: number,
  reorderPoint: number | null,
  leadTimeMaxDays: number | null,
): { urgency: ReplenishmentUrgency; urgencyEvidence: string } {

  if (!trackingInventory) {
    return { urgency: "no_data", urgencyEvidence: "Producto sin seguimiento de inventario" };
  }

  if (!isPublished) {
    if (available <= 0) {
      return { urgency: "monitor", urgencyEvidence: `No publicado, sin stock disponible` };
    }
    return { urgency: "no_data", urgencyEvidence: `No publicado, ${available} u. disponibles` };
  }

  // Out of stock completely
  if (available <= 0 && velocityPerDay > 0) {
    return {
      urgency: "critical",
      urgencyEvidence: `Sin stock disponible, velocidad ${round1(velocityPerDay)} u./dia, ${unitsSold30d} vendidas en 30d${reserved > 0 ? `, ${reserved} u. reservadas` : ""}`,
    };
  }

  if (available <= 0 && unitsSold30d > 0) {
    return {
      urgency: "critical",
      urgencyEvidence: `Sin stock disponible, ${unitsSold30d} u. vendidas en 30d`,
    };
  }

  if (available <= 0) {
    return {
      urgency: "critical",
      urgencyEvidence: `Sin stock disponible${reserved > 0 ? `, ${reserved} u. reservadas` : ""}`,
    };
  }

  // Some variants OOS
  if (variantsOOS > 0 && variantsOOS < variantCount) {
    const base = `${variantsOOS} de ${variantCount} variantes sin stock`;
    if (coverageDays !== null && coverageDays <= CRITICAL_COVERAGE_DAYS) {
      return { urgency: "critical", urgencyEvidence: `${base}, cobertura global ${Math.round(coverageDays)}d` };
    }
    if (coverageDays !== null && coverageDays <= SOON_COVERAGE_DAYS) {
      return { urgency: "soon", urgencyEvidence: `${base}, cobertura global ${Math.round(coverageDays)}d` };
    }
  }

  // Reorder point (per-product config, overrides SOON threshold when set)
  if (reorderPoint !== null && available > 0 && available <= reorderPoint && velocityPerDay > 0) {
    // If coverage is below lead time, escalate to critical
    if (leadTimeMaxDays !== null && coverageDays !== null && coverageDays <= leadTimeMaxDays) {
      return {
        urgency: "critical",
        urgencyEvidence: `Stock ${available} u. bajo reorden (${reorderPoint} u.), cobertura ${Math.round(coverageDays)}d < lead time ${leadTimeMaxDays}d`,
      };
    }
    return {
      urgency: "soon",
      urgencyEvidence: `Stock ${available} u. bajo punto de reorden (${reorderPoint} u.), velocidad ${round1(velocityPerDay)} u./dia`,
    };
  }

  // Coverage-based (v2: lead-time-adjusted thresholds)
  if (coverageDays !== null) {
    if (coverageDays <= CRITICAL_COVERAGE_DAYS) {
      return {
        urgency: "critical",
        urgencyEvidence: `${Math.round(coverageDays)}d de cobertura a ${round1(velocityPerDay)} u./dia (${available} u. disponibles)`,
      };
    }
    // v2: if coverage < provider lead time, escalate to critical
    if (leadTimeMaxDays !== null && coverageDays <= leadTimeMaxDays) {
      return {
        urgency: "critical",
        urgencyEvidence: `${Math.round(coverageDays)}d cobertura < ${leadTimeMaxDays}d lead time proveedor — quiebre antes de recibir`,
      };
    }
    if (coverageDays <= SOON_COVERAGE_DAYS) {
      return {
        urgency: "soon",
        urgencyEvidence: `${Math.round(coverageDays)}d de cobertura a ${round1(velocityPerDay)} u./dia (${available} u. disponibles)`,
      };
    }
    if (coverageDays >= OVERSTOCK_COVERAGE_DAYS && totalStock >= OVERSTOCK_MIN_UNITS) {
      return {
        urgency: "overstock",
        urgencyEvidence: `${Math.round(coverageDays)}d de cobertura, ${totalStock} u. en stock, velocidad ${round1(velocityPerDay)} u./dia`,
      };
    }
    return {
      urgency: "adequate",
      urgencyEvidence: `${Math.round(coverageDays)}d de cobertura (${available} u. disponibles, ${round1(velocityPerDay)} u./dia)`,
    };
  }

  // No velocity (no sales) but has stock
  if (totalStock >= OVERSTOCK_MIN_UNITS && unitsSold30d === 0) {
    return {
      urgency: "overstock",
      urgencyEvidence: `${totalStock} u. en stock sin ventas en 30d`,
    };
  }

  return {
    urgency: "monitor",
    urgencyEvidence: `${available} u. disponibles, sin velocidad de venta suficiente para estimar cobertura`,
  };
}

function classifyAction(
  urgency: ReplenishmentUrgency,
  marginHealth: string | null,
  canReorderFromProvider: boolean,
  isPublished: boolean,
): { action: ReplenishmentAction; actionReason: string } {

  if (!isPublished && urgency !== "critical") {
    return { action: "skip", actionReason: "Producto no publicado" };
  }

  const goodMargin = marginHealth === "profitable" || marginHealth === "thin";
  const badMargin = marginHealth === "negative" || marginHealth === "at_risk";

  if (urgency === "critical") {
    if (badMargin) {
      return { action: "review", actionReason: "Sin stock pero margen negativo, evaluar si conviene reponer" };
    }
    if (canReorderFromProvider) {
      return { action: "reorder", actionReason: "Stock critico, proveedor con stock disponible" };
    }
    return { action: "reorder", actionReason: "Stock critico, reponer con urgencia" };
  }

  if (urgency === "soon") {
    if (badMargin) {
      return { action: "review", actionReason: "Stock bajo pero margen debil, revisar antes de reponer" };
    }
    return { action: "reorder", actionReason: "Cobertura baja, reponer pronto" };
  }

  if (urgency === "overstock") {
    if (badMargin) {
      return { action: "reduce", actionReason: "Sobrestock con margen negativo, liquidar o pausar" };
    }
    return { action: "reduce", actionReason: "Sobrestock, evaluar promocion o reducir compras" };
  }

  if (urgency === "monitor") {
    return { action: "watch", actionReason: "Monitorear velocidad y stock" };
  }

  if (urgency === "adequate") {
    return { action: "watch", actionReason: "Cobertura adecuada, sin accion inmediata" };
  }

  return { action: "skip", actionReason: "Sin datos suficientes para decidir" };
}

function urgencyRank(u: ReplenishmentUrgency): number {
  switch (u) {
    case "critical": return 1;
    case "soon": return 2;
    case "monitor": return 3;
    case "overstock": return 4;
    case "adequate": return 5;
    case "no_data": return 6;
  }
}
