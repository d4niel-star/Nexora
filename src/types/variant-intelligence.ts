// ─── Variant Intelligence v2 Types ───
// Variant-level risk detection that exposes hidden problems
// inside aggregate-healthy products.
// Observable signals only: per-variant stock, velocity, coverage.
// v2.1: optional economics fields when variant economics report is merged.
// v2.2: sell-through and inventory health classification.

import type { VariantEconHealth } from "./variant-economics";
import type { CostConfidence } from "./profitability";

// ─── Variant risk tier ───
export type VariantRiskTier = "stockout" | "critical" | "low" | "healthy" | "no_data";

// ─── Variant inventory health (v2.2) ───
// Combined classification of stock risk, economics, and velocity.
export type VariantInventoryHealth = "critical" | "weak" | "stable" | "stuck" | "uncertain" | "no_data";

// ─── Variant inventory action (v2.2) ───
// Recommended operational action based on health.
export type VariantInventoryAction = "reorder" | "push" | "monitor" | "pause" | "review" | "skip";

// ─── Per-variant intelligence ───
export interface VariantIntelligence {
  variantId: string;
  variantTitle: string;
  productId: string;
  productTitle: string;

  // Stock state
  stock: number;
  reservedStock: number;
  available: number;
  reorderPoint: number | null;

  // Pricing (from ProductVariant.price)
  price: number;

  // Variant-level velocity (from OrderItem.variantId)
  unitsSold30d: number;
  unitsSold7d: number;
  velocityPerDay: number; // units/day over 30d window

  // Coverage
  coverageDays: number | null; // null = no velocity
  coverageLabel: string;

  // Risk classification
  risk: VariantRiskTier;
  riskEvidence: string;

  // Is this variant hiding a problem at product level?
  hiddenByAggregate: boolean; // true when product looks OK but this variant is at risk

  // Economics (optional — only when variant economics report is merged)
  econHealth?: VariantEconHealth;
  econEvidence?: string;
  netContribution?: number;
  contributionPerUnit?: number;
  costConfidence?: CostConfidence;
  econDataQualityNote?: string | null;

  // Sell-through (v2.2): unitsSold30d / (unitsSold30d + current stock)
  sellThroughPercent: number | null; // null when no sales or stock is 0
  sellThroughLabel: string;

  // Inventory health (v2.2): combined risk + economics + velocity
  health: VariantInventoryHealth;
  healthEvidence: string;

  // Recommended action (v2.2)
  action: VariantInventoryAction;
  actionReason: string;

  href: string;
}

// ─── Product-level variant summary ───
export interface ProductVariantSummary {
  productId: string;
  productTitle: string;
  totalVariants: number;
  stockoutVariants: number;
  criticalVariants: number;
  lowVariants: number;
  healthyVariants: number;
  noDataVariants: number;
  hasHiddenRisk: boolean; // product aggregate is OK but variants have risk
  worstVariant: VariantIntelligence | null;
  variants: VariantIntelligence[];
}

// ─── Full report ───
export interface VariantIntelligenceReport {
  products: ProductVariantSummary[];
  summary: {
    totalVariants: number;
    stockoutVariants: number;
    criticalVariants: number;
    lowVariants: number;
    productsWithHiddenRisk: number;
  };
  generatedAt: string;
  engineVersion: string;
}
