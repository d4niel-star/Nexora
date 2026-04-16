// ─── Variant Economics v1 Engine ───
// Pure calculation layer. No DB access.
// Aggregates OrderItem-level economic data by variantId.
// Reuses the SAME economic model as the profitability v2 engine:
//   same cost resolution, same fee proration, same refund proration.
//
// Honesty:
// - costSnapshot on OrderItem = real per-item cost → confidence "high"
// - product.cost fallback = current, may differ → confidence "medium"
// - fees/refunds = prorated from order level → same as product profitability
// - No invented precision. Each variant carries a dataQualityNote when partial.

import type {
  VariantEconHealth,
  VariantEconomics,
  ProductVariantEconSummary,
  VariantEconomicsReport,
} from "@/types/variant-economics";
import type { CostConfidence, FeeDataQuality } from "@/types/profitability";

// ─── Input: same shape as profitability engine's OrderLineInput + variantId ───

export interface VariantEconLineInput {
  orderId: string;
  variantId: string | null;
  productId: string | null;
  productTitle: string;
  variantTitle: string;
  quantity: number;
  priceSnapshot: number;
  costSnapshot: number;
  lineTotal: number;
  currentProductCost: number | null;
  // Order-level (for proration)
  orderTotal: number;
  orderSubtotal: number;
  paymentFee: number;
  channelFee: number;
  refundAmount: number;
  orderStatus: string;
  paymentStatus: string;
  cancelledAt: string | null;
  shippingAmount: number;
}

// ─── Core helpers (same as profitability engine) ───

function resolveUnitCost(costSnapshot: number, currentProductCost: number | null): { unitCost: number; confidence: CostConfidence } {
  if (costSnapshot > 0) return { unitCost: costSnapshot, confidence: "high" };
  if (currentProductCost !== null && currentProductCost > 0) return { unitCost: currentProductCost, confidence: "medium" };
  return { unitCost: 0, confidence: "none" };
}

function proportionalShare(orderLevelAmount: number, lineTotal: number, orderSubtotal: number): number {
  if (orderSubtotal <= 0) return 0;
  return orderLevelAmount * (lineTotal / orderSubtotal);
}

function isCancelled(status: string, cancelledAt: string | null): boolean {
  return status === "cancelled" || !!cancelledAt;
}

function isFullyRefunded(paymentStatus: string, status: string): boolean {
  return paymentStatus === "refunded" || status === "refunded";
}

function resolveHealth(netPercent: number, confidence: CostConfidence, netAmount: number, unitsSold: number): VariantEconHealth {
  if (unitsSold === 0) return "no_sales";
  if (confidence === "none") return "uncertain";
  if (netAmount < 0 || netPercent < 0) return "negative";
  if (netPercent < 15) return "at_risk";
  if (netPercent < 30) return "thin";
  return "profitable";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function confidenceRank(c: CostConfidence): number {
  switch (c) { case "high": return 3; case "medium": return 2; case "none": return 1; }
}

// ─── Main Calculation ───

export function calculateVariantEconomics(lines: VariantEconLineInput[]): VariantEconomicsReport {
  // Accumulate by variantId (skip lines without variantId — can't attribute)
  const variantMap = new Map<string, {
    variantId: string;
    variantTitle: string;
    productId: string;
    productTitle: string;
    totalRevenue: number;
    totalRefundImpact: number;
    totalCost: number;
    totalPaymentFees: number;
    totalChannelFees: number;
    unitsSold: number;
    orderIds: Set<string>;
    hasCostData: boolean;
    worstConfidence: CostConfidence;
    hasFeeData: boolean;
  }>();

  for (const line of lines) {
    if (!line.variantId) continue;

    const cancelled = isCancelled(line.orderStatus, line.cancelledAt);
    const fullyRefunded = isFullyRefunded(line.paymentStatus, line.orderStatus);

    const { unitCost, confidence } = resolveUnitCost(line.costSnapshot, line.currentProductCost);

    const grossRevenue = cancelled ? 0 : line.lineTotal;
    const refundShare = (line.refundAmount <= 0 || cancelled) ? 0
      : Math.min(proportionalShare(line.refundAmount, line.lineTotal, line.orderTotal), line.lineTotal);
    const netRevenue = cancelled ? 0 : fullyRefunded ? 0 : Math.max(line.lineTotal - refundShare, 0);
    const effectiveRefund = cancelled ? line.lineTotal : refundShare;

    const totalCost = (cancelled || fullyRefunded) ? 0 : unitCost * line.quantity;
    const paymentFeeShare = (cancelled || fullyRefunded) ? 0 : proportionalShare(line.paymentFee, line.lineTotal, line.orderSubtotal);
    const channelFeeShare = (cancelled || fullyRefunded) ? 0 : proportionalShare(line.channelFee, line.lineTotal, line.orderSubtotal);
    const effectiveUnits = (cancelled || fullyRefunded) ? 0 : line.quantity;
    const feeQ: FeeDataQuality = line.paymentFee > 0 ? "real" : (line.paymentStatus === "paid" || line.paymentStatus === "approved") ? "zero_recorded" : "unavailable";

    const key = line.variantId;
    if (!variantMap.has(key)) {
      variantMap.set(key, {
        variantId: line.variantId,
        variantTitle: line.variantTitle,
        productId: line.productId || "",
        productTitle: line.productTitle,
        totalRevenue: 0,
        totalRefundImpact: 0,
        totalCost: 0,
        totalPaymentFees: 0,
        totalChannelFees: 0,
        unitsSold: 0,
        orderIds: new Set(),
        hasCostData: false,
        worstConfidence: "high",
        hasFeeData: false,
      });
    }
    const v = variantMap.get(key)!;
    v.totalRevenue += grossRevenue;
    v.totalRefundImpact += effectiveRefund;
    v.totalCost += totalCost;
    v.totalPaymentFees += paymentFeeShare;
    v.totalChannelFees += channelFeeShare;
    v.unitsSold += effectiveUnits;
    v.orderIds.add(line.orderId);
    if (confidence !== "none") v.hasCostData = true;
    if (feeQ === "real") v.hasFeeData = true;
    if (confidenceRank(confidence) < confidenceRank(v.worstConfidence)) {
      v.worstConfidence = confidence;
    }
  }

  // ─── Build variant economics ───
  const allVariants: VariantEconomics[] = [];
  for (const [, val] of variantMap) {
    const netRevenue = val.totalRevenue - val.totalRefundImpact;
    const grossMargin = netRevenue - val.totalCost;
    const netContribution = grossMargin - val.totalPaymentFees - val.totalChannelFees;
    const netPercent = netRevenue > 0 ? (netContribution / netRevenue) * 100 : 0;
    const contribPerUnit = val.unitsSold > 0 ? netContribution / val.unitsSold : 0;
    const health = resolveHealth(netPercent, val.worstConfidence, netContribution, val.unitsSold);

    const feeQ: FeeDataQuality = val.hasFeeData ? "real" : val.unitsSold > 0 ? "zero_recorded" : "unavailable";

    // Build evidence
    const healthEvidence = buildEvidence(health, val.unitsSold, round2(netContribution), round2(contribPerUnit), parseFloat(netPercent.toFixed(1)), val.worstConfidence);
    const dataQualityNote = buildQualityNote(val.worstConfidence, feeQ, val.totalRefundImpact > 0);

    allVariants.push({
      variantId: val.variantId,
      variantTitle: val.variantTitle,
      productId: val.productId,
      productTitle: val.productTitle,
      revenue: round2(val.totalRevenue),
      refundImpact: round2(val.totalRefundImpact),
      netRevenue: round2(netRevenue),
      totalCost: round2(val.totalCost),
      unitCost: val.unitsSold > 0 ? round2(val.totalCost / val.unitsSold) : 0,
      costConfidence: val.worstConfidence,
      paymentFees: round2(val.totalPaymentFees),
      channelFees: round2(val.totalChannelFees),
      feeDataQuality: feeQ,
      grossMargin: round2(grossMargin),
      netContribution: round2(netContribution),
      netContributionPercent: parseFloat(netPercent.toFixed(1)),
      contributionPerUnit: round2(contribPerUnit),
      unitsSold: val.unitsSold,
      ordersCount: val.orderIds.size,
      health,
      healthEvidence,
      dataQualityNote,
      href: "/admin/inventory",
    });
  }

  // ─── Group by product ───
  const byProduct = new Map<string, VariantEconomics[]>();
  for (const v of allVariants) {
    const arr = byProduct.get(v.productId) ?? [];
    arr.push(v);
    byProduct.set(v.productId, arr);
  }

  const products: ProductVariantEconSummary[] = [];
  let totalProfitable = 0, totalThin = 0, totalAtRisk = 0, totalNegative = 0, totalUncertain = 0, totalNoSales = 0;
  let productsWithEconRisk = 0;

  for (const [productId, variants] of byProduct) {
    variants.sort((a, b) => a.netContribution - b.netContribution); // worst first
    const withSales = variants.filter((v) => v.unitsSold > 0);
    const profitable = withSales.filter((v) => v.health === "profitable").length;
    const negative = withSales.filter((v) => v.health === "negative").length;
    const uncertain = withSales.filter((v) => v.health === "uncertain").length;
    const atRisk = withSales.filter((v) => v.health === "at_risk").length;
    const thin = withSales.filter((v) => v.health === "thin").length;

    totalProfitable += profitable;
    totalThin += thin;
    totalAtRisk += atRisk;
    totalNegative += negative;
    totalUncertain += uncertain;
    totalNoSales += variants.length - withSales.length;

    const hasEconRisk = negative > 0 || atRisk > 0;
    if (hasEconRisk) productsWithEconRisk++;

    const worstVariant = withSales.length > 0 ? withSales[0] : null;
    const bestVariant = withSales.length > 0 ? withSales[withSales.length - 1] : null;

    products.push({
      productId,
      productTitle: variants[0].productTitle,
      totalVariants: variants.length,
      variantsWithSales: withSales.length,
      profitableVariants: profitable,
      negativeVariants: negative,
      uncertainVariants: uncertain,
      worstVariant,
      bestVariant,
      hasEconRisk,
      variants,
    });
  }

  // Sort: products with economic risk first
  products.sort((a, b) => {
    if (a.hasEconRisk !== b.hasEconRisk) return a.hasEconRisk ? -1 : 1;
    return b.negativeVariants - a.negativeVariants;
  });

  const totalWithSales = totalProfitable + totalThin + totalAtRisk + totalNegative + totalUncertain;

  // Honesty statement
  const costDataPct = allVariants.length > 0
    ? Math.round((allVariants.filter((v) => v.costConfidence !== "none").length / allVariants.length) * 100)
    : 0;
  let honesty: string;
  if (costDataPct >= 80) {
    honesty = `Revenue y unidades por variante: reales. Costo por variante: ${costDataPct}% con costSnapshot real. Fees y reembolsos: prorrateados desde nivel orden.`;
  } else if (costDataPct >= 40) {
    honesty = `Revenue real por variante. Costo: ${costDataPct}% con dato real, resto estimado o sin dato. Fees prorrateados. Contribucion parcialmente confiable.`;
  } else {
    honesty = `Revenue real por variante. Costo: solo ${costDataPct}% con dato real. Contribucion mayormente incierta. Cargar costos para mejorar precision.`;
  }

  return {
    products,
    summary: {
      totalVariantsWithSales: totalWithSales,
      profitableVariants: totalProfitable,
      thinVariants: totalThin,
      atRiskVariants: totalAtRisk,
      negativeVariants: totalNegative,
      uncertainVariants: totalUncertain,
      productsWithEconRisk,
    },
    generatedAt: new Date().toISOString(),
    engineVersion: "v1",
    honesty,
  };
}

// ─── Evidence builders ───

function buildEvidence(
  health: VariantEconHealth, units: number, netContrib: number,
  contribPerUnit: number, netPct: number, confidence: CostConfidence,
): string {
  if (health === "no_sales") return "Sin ventas en el periodo analizado";
  if (health === "uncertain") return `${units} u. vendidas, sin costo cargado — contribucion no calculable`;
  if (health === "negative") return `${units} u. vendidas, contribucion -$${Math.abs(netContrib).toLocaleString("es-AR")} (${netPct}%). Cada venta destruye valor.`;
  if (health === "at_risk") return `${units} u. vendidas, contribucion ${netPct}% ($${contribPerUnit}/u.). Margen delgado, vulnerable a fees o costos.`;
  if (health === "thin") return `${units} u. vendidas, contribucion ${netPct}% ($${contribPerUnit}/u.). Margen fino pero positivo.`;
  return `${units} u. vendidas, contribucion ${netPct}% ($${contribPerUnit}/u.). Economía sana.`;
}

function buildQualityNote(confidence: CostConfidence, feeQ: FeeDataQuality, hasRefunds: boolean): string | null {
  const notes: string[] = [];
  if (confidence === "medium") notes.push("Costo desde producto actual (no snapshot de orden)");
  if (confidence === "none") notes.push("Sin costo cargado — contribucion no confiable");
  if (feeQ === "zero_recorded") notes.push("Fees de pago sin registrar — contribucion puede estar sobreestimada");
  if (hasRefunds) notes.push("Reembolsos prorrateados desde nivel orden");
  return notes.length > 0 ? notes.join(". ") + "." : null;
}
