// ─── Commercial Command Center v2 Types ───
// Unified commercial intelligence surface.
// Orchestrates: economics, velocity, replenishment, aptitude, decisions, operations.
// All signals observable. No magic scores.

export type CommandPriority = "critical" | "high" | "medium" | "low";
export type CommandDomain =
  | "revenue"        // push, grow, sell more
  | "margin"         // fix profitability, cost, pricing
  | "stock"          // reorder, overstock, coverage
  | "sourcing"       // provider, import, supply chain
  | "operations";    // orders, fulfillment, operational

export interface CommandDirective {
  id: string;
  priority: CommandPriority;
  domain: CommandDomain;
  title: string;
  reason: string;
  evidence: string;
  href: string;
  actionLabel: string;
  productCount?: number;
}

export interface CommandKpis {
  revenue30d: number;          // real 30-day revenue from paid/approved orders only
  unitsSold30d: number;        // real 30-day units sold from paid/approved orders only
  paidOrdersLast30d: number;   // count of distinct paid orders in the last 30 days
  avgMarginPercent: number | null;
  productsPublished: number;
  totalProducts: number;
  criticalStock: number;
  overstockProducts: number;
  pushCandidates: number;
  pauseCandidates: number;
  ordersToProcess: number;     // paid-unfulfilled only (never pending)
  // Variant KPIs v1
  criticalVariants: number;
  stuckVariants: number;
  negativeVariants: number;
  hiddenVariantRiskProducts: number;
  // Variant Drilldown v1
  firstCriticalVariantId: string | null;
  firstHiddenVariantId: string | null;
}

export interface CommandTopSeller {
  productId: string;
  title: string;
  unitsSold30d: number;
  revenue30d: number;
  href: string;
}

export interface CommandCenterData {
  directives: CommandDirective[];
  kpis: CommandKpis;
  topSellers: CommandTopSeller[]; // up to 5, real units sold in last 30d, paid only
  generatedAt: string;
}
