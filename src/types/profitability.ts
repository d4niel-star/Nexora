// ─── Net Profitability Engine v2 Types ───
// Unit economics by SKU, channel, and order with honest confidence model.
//
// Key design decisions based on real schema:
// - costSnapshot on OrderItem = real cost frozen at purchase → confidence "high"
// - product.cost fallback = current cost, may differ → confidence "medium"
// - shippingAmount on Order = amount CHARGED to buyer, NOT merchant shipping cost
//   Treated as "shipping charged" (revenue component), not a cost deduction
// - paymentFee = real MP fee from fee_details (persisted by webhook)
// - channelFee = marketplace commission (0 for Storefront)
// - refundAmount = order-level, prorated to items proportionally
// - No per-item refund detail exists in schema

// ─── Enums ───

export type CostConfidence = "high" | "medium" | "none";
export type MarginHealth = "profitable" | "thin" | "at_risk" | "negative" | "uncertain";
export type OrderRevenueStatus = "collected" | "partially_refunded" | "fully_refunded" | "cancelled";
export type FeeDataQuality = "real" | "zero_recorded" | "unavailable";

// ─── Per-line (OrderItem level) ───

export interface ProfitabilityLine {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  channel: string;
  productId: string | null;
  productTitle: string;
  variantTitle: string;
  sku: string | null;
  supplier: string | null;
  quantity: number;
  revenue: number;
  refundImpact: number;
  netRevenue: number;
  unitCost: number;
  totalCost: number;
  paymentFeeShare: number;
  channelFeeShare: number;
  grossMargin: number;
  netContribution: number;
  netContributionPercent: number;
  contributionPerUnit: number;
  costConfidence: CostConfidence;
  feeDataQuality: FeeDataQuality;
  revenueStatus: OrderRevenueStatus;
  health: MarginHealth;
}

// ─── Aggregated by Product ───

export interface ProductProfitability {
  productId: string;
  title: string;
  category: string;
  supplier: string | null;
  totalRevenue: number;
  totalRefundImpact: number;
  totalNetRevenue: number;
  totalCost: number;
  totalPaymentFees: number;
  totalChannelFees: number;
  grossMargin: number;
  netContribution: number;
  netContributionPercent: number;
  contributionPerUnit: number;
  unitsSold: number;
  ordersCount: number;
  refundedUnits: number;
  costConfidence: CostConfidence;
  feeDataQuality: FeeDataQuality;
  health: MarginHealth;
  hasCostData: boolean;
}

// ─── Aggregated by Channel ───

export interface ChannelProfitability {
  channel: string;
  totalRevenue: number;
  totalRefundImpact: number;
  totalNetRevenue: number;
  totalCost: number;
  totalPaymentFees: number;
  totalChannelFees: number;
  grossMargin: number;
  netContribution: number;
  netContributionPercent: number;
  ordersCount: number;
  avgContributionPerOrder: number;
  feeRatio: number;
  health: MarginHealth;
}

// ─── Alerts ───

export type ProfitabilityAlertType =
  | "no_cost"
  | "negative_margin"
  | "thin_margin"
  | "high_fees"
  | "incomplete_data"
  | "high_refund_rate"
  | "zero_fees_warning"
  | "channel_erosion";

export interface ProfitabilityAlert {
  type: ProfitabilityAlertType;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  productId?: string;
  channel?: string;
  actionHref?: string;
  actionLabel?: string;
}

// ─── Summary ───

export interface ProfitabilitySummary {
  totalRevenue: number;
  totalRefunds: number;
  totalNetRevenue: number;
  totalCostOfGoods: number;
  totalPaymentFees: number;
  totalChannelFees: number;
  grossMargin: number;
  grossMarginPercent: number;
  netContribution: number;
  netContributionPercent: number;
  ordersAnalyzed: number;
  ordersRefunded: number;
  ordersCancelled: number;
  linesAnalyzed: number;
  productsWithCost: number;
  productsWithoutCost: number;
  productsWithFees: number;
  dataConfidenceScore: number;
  feeDataQuality: FeeDataQuality;
  overallHealth: MarginHealth;
  shippingChargedToCustomer: number;
  shippingNote: string;
}

// ─── Full Report ───

export interface ProfitabilityReport {
  summary: ProfitabilitySummary;
  byProduct: ProductProfitability[];
  byChannel: ChannelProfitability[];
  alerts: ProfitabilityAlert[];
  generatedAt: string;
  engineVersion: "v2";
}
