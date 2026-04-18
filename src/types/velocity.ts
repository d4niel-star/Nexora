// ─── Sales Velocity + Demand Intelligence v1 Types ───
// All classifications are evidence-based. No forecasting, no machine learning.
// Observable signals only: orders, units, revenue, contribution, time windows.

// ─── Rotation classification (volume-based) ───
export type RotationTier = "high" | "medium" | "low" | "stalled" | "no_sales" | "insufficient_data";

// ─── Commercial action signal (volume x economics) ───
export type CommercialAction = "push" | "maintain" | "review" | "pause" | "evaluate";

// ─── Time window used for velocity calculation ───
export interface VelocityWindow {
  label: string;
  days: number;
  unitsSold: number;
  revenue: number;
  ordersCount: number;
}

// ─── Per-product velocity evaluation ───
export interface ProductVelocity {
  productId: string;
  title: string;
  category: string;
  supplier: string | null;

  // Observable totals (all time, from collected orders)
  totalUnitsSold: number;
  totalRevenue: number;
  totalOrdersCount: number;
  refundedUnits: number;

  // Time-windowed velocity
  windows: VelocityWindow[];

  // Primary velocity metric: units per day in the main window
  velocityPerDay: number;
  velocityWindowDays: number;

  // Rotation classification
  rotation: RotationTier;
  rotationEvidence: string;

  // Economics cross (from profitability when available)
  hasEconomicsData: boolean;
  netContributionPercent: number | null;
  contributionPerUnit: number | null;
  marginHealth: string | null;

  // Commercial action
  action: CommercialAction;
  actionReason: string;

  // Provider/import context (when product has a mirror)
  hasProvider: boolean;
  providerName: string | null;

  // CTA
  href: string;
}

// ─── Provider velocity aggregation ───
export interface ProviderVelocity {
  providerName: string;
  productCount: number;
  totalUnitsSold: number;
  totalRevenue: number;
  avgVelocityPerDay: number;
  highRotationCount: number;
  stalledCount: number;
  dominantAction: CommercialAction;
}

// ─── Summary ───
export interface VelocitySummary {
  totalProducts: number;
  productsWithSales: number;
  productsWithoutSales: number;
  highRotation: number;
  mediumRotation: number;
  lowRotation: number;
  stalled: number;
  insufficientData: number;
  pushCount: number;
  reviewCount: number;
  pauseCount: number;
  totalUnitsSold: number;
  totalRevenue: number;
  windowDays: number;
}

// ─── Full report ───
export interface VelocityReport {
  products: ProductVelocity[];
  providers: ProviderVelocity[];
  summary: VelocitySummary;
  generatedAt: string;
  engineVersion: string;
}
