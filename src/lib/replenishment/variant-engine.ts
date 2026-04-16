// ─── Variant Intelligence v2 Engine ───
// Pure calculation layer. No DB access.
// Detects variant-level risk hidden behind product-level aggregates.
// Uses OrderItem→ProductVariant relation for real variant velocity.

import type {
  VariantRiskTier,
  VariantIntelligence,
  ProductVariantSummary,
  VariantIntelligenceReport,
  VariantInventoryHealth,
  VariantInventoryAction,
} from "@/types/variant-intelligence";
import type { ReplenishmentUrgency } from "@/types/replenishment";

// ─── Input Types ───

export interface VariantStockInput {
  variantId: string;
  variantTitle: string;
  productId: string;
  productTitle: string;
  stock: number;
  reservedStock: number;
  trackInventory: boolean;
  reorderPoint: number | null;
  isPublished: boolean;
  price: number;
}

export interface VariantSalesInput {
  variantId: string;
  unitsSold30d: number;
  unitsSold7d: number;
}

export interface ProductAggregateContext {
  productId: string;
  aggregateUrgency: ReplenishmentUrgency; // from replenishment v1
}

// ─── Constants ───

const CRITICAL_COVERAGE_DAYS = 3;
const LOW_COVERAGE_DAYS = 10;

// ─── Helpers ───

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ─── Main Calculation ───

export function calculateVariantIntelligence(
  variants: VariantStockInput[],
  sales: VariantSalesInput[],
  aggregates: ProductAggregateContext[],
): VariantIntelligenceReport {

  const salesMap = new Map<string, VariantSalesInput>();
  for (const s of sales) salesMap.set(s.variantId, s);

  const aggMap = new Map<string, ProductAggregateContext>();
  for (const a of aggregates) aggMap.set(a.productId, a);

  // Group by product
  const byProduct = new Map<string, VariantStockInput[]>();
  for (const v of variants) {
    const arr = byProduct.get(v.productId) ?? [];
    arr.push(v);
    byProduct.set(v.productId, arr);
  }

  const products: ProductVariantSummary[] = [];
  let totalStockout = 0;
  let totalCritical = 0;
  let totalLow = 0;
  let totalHealthy = 0;
  let totalNoData = 0;
  let productsWithHiddenRisk = 0;

  for (const [productId, productVariants] of byProduct) {
    const firstVariant = productVariants[0];
    const productTitle = firstVariant.productTitle;
    const isPublished = firstVariant.isPublished;
    const aggUrgency = aggMap.get(productId)?.aggregateUrgency ?? "no_data";

    // Product-level aggregate looks "OK" if adequate, monitor, overstock, or no_data
    const aggregateLooksOK = aggUrgency === "adequate" || aggUrgency === "monitor" || aggUrgency === "overstock" || aggUrgency === "no_data";

    const variantResults: VariantIntelligence[] = [];
    let stockoutCount = 0;
    let criticalCount = 0;
    let lowCount = 0;
    let healthyCount = 0;
    let noDataCount = 0;

    for (const v of productVariants) {
      const sale = salesMap.get(v.variantId);
      const unitsSold30d = sale?.unitsSold30d ?? 0;
      const unitsSold7d = sale?.unitsSold7d ?? 0;
      const velocityPerDay = round1(unitsSold30d / 30);
      const available = Math.max(v.stock - v.reservedStock, 0);

      // Coverage
      let coverageDays: number | null = null;
      let coverageLabel: string;
      if (!v.trackInventory) {
        coverageLabel = "Sin seguimiento";
      } else if (velocityPerDay <= 0) {
        coverageLabel = available > 0 ? `${available} u. sin ventas recientes` : "Sin stock ni ventas";
      } else {
        coverageDays = round1(available / velocityPerDay);
        coverageLabel = coverageDays < 1
          ? "Menos de 1 dia de cobertura"
          : `${Math.round(coverageDays)}d a ${round1(velocityPerDay)} u./dia`;
      }

      // Risk classification
      const { risk, riskEvidence } = classifyVariantRisk(
        available, v.stock, v.reservedStock, coverageDays,
        velocityPerDay, unitsSold30d, v.trackInventory,
        isPublished, v.reorderPoint,
      );

      // Is this hidden?
      const hiddenByAggregate = aggregateLooksOK && (risk === "stockout" || risk === "critical" || risk === "low");

      // Sell-through calculation (v2.2)
      const { sellThroughPercent, sellThroughLabel } = calculateSellThrough(unitsSold30d, available);

      // Inventory health classification (v2.2)
      const { health, healthEvidence, action, actionReason } = classifyVariantInventoryHealth(
        risk,
        available,
        unitsSold30d,
        velocityPerDay,
        sellThroughPercent,
        v.stock,
        v.trackInventory,
      );

      const vi: VariantIntelligence = {
        variantId: v.variantId,
        variantTitle: v.variantTitle,
        productId,
        productTitle,
        stock: v.stock,
        reservedStock: v.reservedStock,
        available,
        reorderPoint: v.reorderPoint,
        price: v.price,
        unitsSold30d,
        unitsSold7d,
        velocityPerDay,
        coverageDays,
        coverageLabel,
        risk,
        riskEvidence,
        hiddenByAggregate,
        sellThroughPercent,
        sellThroughLabel,
        health,
        healthEvidence,
        action,
        actionReason,
        href: "/admin/inventory",
      };

      variantResults.push(vi);

      switch (risk) {
        case "stockout": stockoutCount++; totalStockout++; break;
        case "critical": criticalCount++; totalCritical++; break;
        case "low": lowCount++; totalLow++; break;
        case "healthy": healthyCount++; totalHealthy++; break;
        case "no_data": noDataCount++; totalNoData++; break;
      }
    }

    // Sort variants: worst risk first
    variantResults.sort((a, b) => riskRank(a.risk) - riskRank(b.risk));

    const hasHiddenRisk = aggregateLooksOK && (stockoutCount > 0 || criticalCount > 0);
    if (hasHiddenRisk) productsWithHiddenRisk++;

    products.push({
      productId,
      productTitle,
      totalVariants: productVariants.length,
      stockoutVariants: stockoutCount,
      criticalVariants: criticalCount,
      lowVariants: lowCount,
      healthyVariants: healthyCount,
      noDataVariants: noDataCount,
      hasHiddenRisk,
      worstVariant: variantResults[0] ?? null,
      variants: variantResults,
    });
  }

  // Sort: products with hidden risk first, then by worst variant count
  products.sort((a, b) => {
    if (a.hasHiddenRisk !== b.hasHiddenRisk) return a.hasHiddenRisk ? -1 : 1;
    return (b.stockoutVariants + b.criticalVariants) - (a.stockoutVariants + a.criticalVariants);
  });

  return {
    products,
    summary: {
      totalVariants: variants.length,
      stockoutVariants: totalStockout,
      criticalVariants: totalCritical,
      lowVariants: totalLow,
      productsWithHiddenRisk,
    },
    generatedAt: new Date().toISOString(),
    engineVersion: "v2",
  };
}

// ─── Classification ───

function classifyVariantRisk(
  available: number, stock: number, reserved: number,
  coverageDays: number | null, velocityPerDay: number,
  unitsSold30d: number, trackInventory: boolean,
  isPublished: boolean, reorderPoint: number | null,
): { risk: VariantRiskTier; riskEvidence: string } {

  if (!trackInventory) {
    return { risk: "no_data", riskEvidence: "Sin seguimiento de inventario" };
  }
  if (!isPublished) {
    return { risk: "no_data", riskEvidence: "Producto no publicado" };
  }

  // Stockout
  if (available <= 0) {
    if (unitsSold30d > 0) {
      return { risk: "stockout", riskEvidence: `Sin stock, ${unitsSold30d} u. vendidas en 30d` };
    }
    return { risk: "stockout", riskEvidence: `Sin stock disponible${reserved > 0 ? `, ${reserved} reservadas` : ""}` };
  }

  // Reorder point breach
  if (reorderPoint !== null && available <= reorderPoint && velocityPerDay > 0) {
    return {
      risk: "critical",
      riskEvidence: `${available} u. bajo reorderPoint (${reorderPoint}), ${round1(velocityPerDay)} u./dia`,
    };
  }

  // Coverage-based
  if (coverageDays !== null) {
    if (coverageDays <= CRITICAL_COVERAGE_DAYS) {
      return {
        risk: "critical",
        riskEvidence: `${Math.round(coverageDays)}d cobertura a ${round1(velocityPerDay)} u./dia`,
      };
    }
    if (coverageDays <= LOW_COVERAGE_DAYS) {
      return {
        risk: "low",
        riskEvidence: `${Math.round(coverageDays)}d cobertura a ${round1(velocityPerDay)} u./dia`,
      };
    }
    return {
      risk: "healthy",
      riskEvidence: `${Math.round(coverageDays)}d cobertura (${available} u.)`,
    };
  }

  // No velocity, has stock
  if (available > 0 && unitsSold30d === 0) {
    return { risk: "healthy", riskEvidence: `${available} u. sin ventas recientes` };
  }

  return { risk: "no_data", riskEvidence: "Datos insuficientes" };
}

function riskRank(r: VariantRiskTier): number {
  switch (r) {
    case "stockout": return 1;
    case "critical": return 2;
    case "low": return 3;
    case "healthy": return 4;
    case "no_data": return 5;
  }
}

// ─── Sell-Through Calculation (v2.2) ───
// Formula: unitsSold30d / (unitsSold30d + current stock)
// Returns null when no sales or stock is 0 (division by zero)
function calculateSellThrough(
  unitsSold30d: number,
  available: number,
): { sellThroughPercent: number | null; sellThroughLabel: string } {
  if (unitsSold30d === 0 || available === 0) {
    return {
      sellThroughPercent: null,
      sellThroughLabel: unitsSold30d === 0 ? "Sin ventas" : "Sin stock",
    };
  }
  const sellThroughPercent = round1((unitsSold30d / (unitsSold30d + available)) * 100);
  let sellThroughLabel: string;
  if (sellThroughPercent >= 70) {
    sellThroughLabel = "Alto";
  } else if (sellThroughPercent >= 40) {
    sellThroughLabel = "Medio";
  } else if (sellThroughPercent >= 20) {
    sellThroughLabel = "Bajo";
  } else {
    sellThroughLabel = "Muy bajo";
  }
  return { sellThroughPercent, sellThroughLabel };
}

// ─── Inventory Health Classification (v2.2) ───
// Combined classification of stock risk, economics (if available), and velocity.
// Uses observable signals only. No forecasting.
function classifyVariantInventoryHealth(
  risk: VariantRiskTier,
  available: number,
  unitsSold30d: number,
  velocityPerDay: number,
  sellThroughPercent: number | null,
  stock: number,
  trackInventory: boolean,
): {
  health: VariantInventoryHealth;
  healthEvidence: string;
  action: VariantInventoryAction;
  actionReason: string;
} {
  // No tracking or no data
  if (!trackInventory) {
    return {
      health: "no_data",
      healthEvidence: "Sin seguimiento de inventario",
      action: "skip",
      actionReason: "No se puede evaluar sin tracking",
    };
  }

  // Stockout — critical health
  if (risk === "stockout") {
    if (unitsSold30d > 0) {
      return {
        health: "critical",
        healthEvidence: `Agotada con ${unitsSold30d} u. vendidas en 30d`,
        action: "reorder",
        actionReason: "Variante agotada con demanda reciente",
      };
    }
    return {
      health: "no_data",
      healthEvidence: "Agotada sin ventas recientes",
      action: "skip",
      actionReason: "Sin evidencia de demanda",
    };
  }

  // Critical risk — weak health
  if (risk === "critical") {
    return {
      health: "weak",
      healthEvidence: `Stock crítico (${available} u.) con rotación ${round1(velocityPerDay)} u./dia`,
      action: "reorder",
      actionReason: "Stock bajo reorderPoint o cobertura crítica",
    };
  }

  // Low risk — weak or stable depending on velocity
  if (risk === "low") {
    if (velocityPerDay >= 0.5) {
      return {
        health: "weak",
        healthEvidence: `Stock bajo (${available} u.) con rotación media-alta`,
        action: "monitor",
        actionReason: "Cobertura baja pero con rotación, monitorear",
      };
    }
    return {
      health: "stable",
      healthEvidence: `Stock bajo (${available} u.) con rotación baja, estable por ahora`,
      action: "monitor",
      actionReason: "Cobertura baja pero rotación lenta, monitorear",
    };
  }

  // Healthy risk — check for stuck inventory
  if (risk === "healthy") {
    // Stuck: high stock, no sales
    if (stock > 0 && unitsSold30d === 0) {
      return {
        health: "stuck",
        healthEvidence: `${stock} u. sin ventas en 30d, capital inmovilizado`,
        action: "push",
        actionReason: "Stock alto sin rotación, considerar empuje o pausa",
      };
    }
    // High sell-through with good stock = stable
    if (sellThroughPercent !== null && sellThroughPercent >= 40) {
      return {
        health: "stable",
        healthEvidence: `Saludable: ${Math.round(sellThroughPercent)}% sell-through, ${available} u. disponibles`,
        action: "monitor",
        actionReason: "Rotación sana, mantener monitoreo",
      };
    }
    // Low sell-through but some sales = weak
    if (sellThroughPercent !== null && sellThroughPercent < 20 && unitsSold30d > 0) {
      return {
        health: "weak",
        healthEvidence: `Rotación baja: ${Math.round(sellThroughPercent)}% sell-through, ${available} u. disponibles`,
        action: "push",
        actionReason: "Sell-through bajo, considerar empuje o revisión",
      };
    }
    // Default healthy
    return {
      health: "stable",
      healthEvidence: `Saludable: ${available} u. con cobertura adecuada`,
      action: "monitor",
      actionReason: "Stock saludable, monitorear",
    };
  }

  // No data
  return {
    health: "uncertain",
    healthEvidence: "Datos insuficientes para clasificar",
    action: "review",
    actionReason: "Revisar configuración o tracking",
  };
}
