// ─── Sell-Through + Reorder / Replenishment Intelligence v2 Types ───
// All classifications are evidence-based. No forecasting, no machine learning.
// v2: lead-time-adjusted urgency, reorderPoint, leadTimeRiskLabel.
// Observable signals only: stock, velocity, coverage, provider availability.

// ─── Replenishment urgency ───
export type ReplenishmentUrgency = "critical" | "soon" | "monitor" | "overstock" | "adequate" | "no_data";

// ─── Replenishment action ───
export type ReplenishmentAction = "reorder" | "review" | "watch" | "reduce" | "skip";

// ─── Per-product replenishment evaluation ───
export interface ProductReplenishment {
  productId: string;
  title: string;
  category: string;
  supplier: string | null;

  // Stock state (aggregated across variants)
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  variantCount: number;
  variantsOutOfStock: number;
  trackingInventory: boolean;

  // Velocity cross (from velocity engine)
  velocityPerDay: number;
  unitsSold30d: number;
  rotation: string; // RotationTier from velocity

  // Coverage estimate (days of stock at current velocity)
  coverageDays: number | null; // null when velocity is 0 or no tracking
  coverageLabel: string;

  // Sell-through rate: units sold / (units sold + current stock) in window
  sellThroughPercent: number | null;
  sellThroughLabel: string;

  // Provider / sourcing context
  hasProvider: boolean;
  providerName: string | null;
  providerStock: number | null;
  providerLeadTime: string | null; // raw from ProviderProduct (display)
  providerLeadTimeMinDays: number | null; // structured (calculations)
  providerLeadTimeMaxDays: number | null; // structured (calculations)
  canReorderFromProvider: boolean;
  leadTimeRiskLabel: string | null; // v2: explains if reorder timing is viable

  // Economics cross
  hasEconomicsData: boolean;
  marginHealth: string | null;
  contributionPerUnit: number | null;

  // Classification
  urgency: ReplenishmentUrgency;
  urgencyEvidence: string;
  action: ReplenishmentAction;
  actionReason: string;

  // CTA
  href: string;
}

// ─── Provider replenishment summary ───
export interface ProviderReplenishment {
  providerName: string;
  productCount: number;
  criticalCount: number;
  soonCount: number;
  canSupplyCount: number;
  avgCoverageDays: number | null;
}

// ─── Summary ───
export interface ReplenishmentSummary {
  totalProducts: number;
  critical: number;
  soon: number;
  monitor: number;
  overstock: number;
  adequate: number;
  noData: number;
  reorderCount: number;
  reviewCount: number;
  watchCount: number;
  reduceCount: number;
  windowDays: number;
}

// ─── Full report ───
export interface ReplenishmentReport {
  products: ProductReplenishment[];
  providers: ProviderReplenishment[];
  summary: ReplenishmentSummary;
  generatedAt: string;
  engineVersion: string;
}
