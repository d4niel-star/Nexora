// ─── Commercial Command Center v2 Types ───
// Unified commercial intelligence surface.
// Orchestrates: economics, velocity, replenishment, aptitude, decisions, operations.
// All signals observable. No magic scores.

export type CommandPriority = "critical" | "high" | "medium" | "low";
export type CommandDomain =
  | "revenue"        // push, grow, sell more
  | "margin"         // fix profitability, cost, pricing
  | "stock"          // reorder, overstock, coverage
  | "channel"        // sync, publish, friction
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
  revenue30d: number;
  unitsSold30d: number;
  avgMarginPercent: number | null;
  productsPublished: number;
  totalProducts: number;
  criticalStock: number;
  overstockProducts: number;
  pushCandidates: number;
  pauseCandidates: number;
  ordersToProcess: number;
  // Variant KPIs v1
  criticalVariants: number;
  stuckVariants: number;
  negativeVariants: number;
  hiddenVariantRiskProducts: number;
  // Variant Drilldown v1
  firstCriticalVariantId: string | null;
  firstHiddenVariantId: string | null;
}

export interface CommandCenterData {
  directives: CommandDirective[];
  kpis: CommandKpis;
  generatedAt: string;
}
