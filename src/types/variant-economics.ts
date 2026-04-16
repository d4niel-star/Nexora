// ─── Variant Economics v1 Types ───
// Per-variant economic signals derived from real OrderItem data.
//
// Honesty model:
// - Revenue per variant: REAL (from OrderItem.lineTotal where variantId matches)
// - Cost per variant: REAL when costSnapshot > 0 on OrderItem ("high")
//                     ESTIMATED when falling back to product.cost ("medium")
//                     UNKNOWN when neither exists ("none")
// - Fees per variant: PRORATED proportionally from order-level paymentFee/channelFee
//                     Not exact, but same method as product-level profitability engine
// - Refunds per variant: PRORATED proportionally from order-level refundAmount
//                        No per-item refund detail exists in schema
//
// What is NOT available and NOT invented:
// - Exact per-variant refund allocation
// - Per-variant shipping cost (shipping is customer-charged, not variant-attributed)
// - Channel-level variant economics
// - Variant-level pricing optimization

import type { CostConfidence, FeeDataQuality, MarginHealth } from "./profitability";

// ─── Per-variant economics evaluation ───

export type VariantEconHealth = "profitable" | "thin" | "at_risk" | "negative" | "uncertain" | "no_sales";

export interface VariantEconomics {
  variantId: string;
  variantTitle: string;
  productId: string;
  productTitle: string;

  // Revenue
  revenue: number;       // gross (lineTotal sum)
  refundImpact: number;  // prorated refund share
  netRevenue: number;    // revenue - refundImpact

  // Cost
  totalCost: number;     // unitCost * effectiveUnits
  unitCost: number;      // from costSnapshot or product.cost fallback
  costConfidence: CostConfidence;

  // Fees (prorated from order level)
  paymentFees: number;
  channelFees: number;
  feeDataQuality: FeeDataQuality;

  // Contribution
  grossMargin: number;          // netRevenue - totalCost
  netContribution: number;      // grossMargin - fees
  netContributionPercent: number;
  contributionPerUnit: number;

  // Volume
  unitsSold: number;     // effective (excluding cancelled/fully refunded)
  ordersCount: number;

  // Classification
  health: VariantEconHealth;
  healthEvidence: string;
  dataQualityNote: string | null;  // explains any limitation honestly

  href: string;
}

// ─── Product-level variant economics summary ───

export interface ProductVariantEconSummary {
  productId: string;
  productTitle: string;
  totalVariants: number;
  variantsWithSales: number;
  profitableVariants: number;
  negativeVariants: number;
  uncertainVariants: number;
  worstVariant: VariantEconomics | null;
  bestVariant: VariantEconomics | null;
  hasEconRisk: boolean;  // product has >=1 negative or at_risk variant with sales
  variants: VariantEconomics[];
}

// ─── Full report ───

export interface VariantEconomicsReport {
  products: ProductVariantEconSummary[];
  summary: {
    totalVariantsWithSales: number;
    profitableVariants: number;
    thinVariants: number;
    atRiskVariants: number;
    negativeVariants: number;
    uncertainVariants: number;
    productsWithEconRisk: number;
  };
  generatedAt: string;
  engineVersion: string;
  honesty: string; // short statement about data quality
}
