// ─── Net Profitability Engine v2 ───
// Pure calculation layer. No DB access. Receives raw data, outputs report.
// Designed to be consumed by UI, Nexora AI decision engine, and export.
//
// v2 changes from v1:
// - Honest shipping: shippingAmount is charged to buyer, NOT merchant cost.
//   It is tracked separately and NOT deducted from contribution.
// - Net contribution = revenue - refunds - COGS - paymentFee - channelFee
// - Contribution per unit for real unit economics
// - Revenue status awareness (collected, partially/fully refunded, cancelled)
// - Fee data quality tracking (real from MP vs zero/unavailable)
// - Supplier aggregation support
// - Refund rate detection

import type {
  CostConfidence,
  FeeDataQuality,
  MarginHealth,
  OrderRevenueStatus,
  ProfitabilityLine,
  ProductProfitability,
  ChannelProfitability,
  ProfitabilityAlert,
  ProfitabilitySummary,
  ProfitabilityReport,
} from "@/types/profitability";

// ─── Input Types (what the query layer provides) ───

export interface OrderLineInput {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  channel: string;
  orderTotal: number;
  orderSubtotal: number;
  orderItemCount: number;
  paymentFee: number;
  channelFee: number;
  shippingAmount: number;
  refundAmount: number;
  orderStatus: string;
  paymentStatus: string;
  cancelledAt: string | null;
  productId: string | null;
  productTitle: string;
  variantTitle: string;
  sku: string | null;
  category: string;
  supplier: string | null;
  quantity: number;
  priceSnapshot: number;
  costSnapshot: number;
  lineTotal: number;
  currentProductCost: number | null;
}

// ─── Core Resolution Functions ───

function resolveUnitCost(line: OrderLineInput): { unitCost: number; confidence: CostConfidence } {
  if (line.costSnapshot > 0) {
    return { unitCost: line.costSnapshot, confidence: "high" };
  }
  if (line.currentProductCost !== null && line.currentProductCost > 0) {
    return { unitCost: line.currentProductCost, confidence: "medium" };
  }
  return { unitCost: 0, confidence: "none" };
}

function resolveRevenueStatus(line: OrderLineInput): OrderRevenueStatus {
  if (line.orderStatus === "cancelled" || line.cancelledAt) return "cancelled";
  if (line.paymentStatus === "refunded" || line.orderStatus === "refunded") return "fully_refunded";
  if (line.refundAmount > 0 && line.refundAmount < line.orderTotal) return "partially_refunded";
  return "collected";
}

function resolveFeeDataQuality(paymentFee: number, paymentStatus: string): FeeDataQuality {
  if (paymentFee > 0) return "real";
  // If payment was approved but fee is 0, it means we either didn't capture it or it's genuinely 0
  if (paymentStatus === "paid" || paymentStatus === "approved") return "zero_recorded";
  return "unavailable";
}

function resolveHealth(netPercent: number, confidence: CostConfidence, netAmount: number): MarginHealth {
  if (confidence === "none") return "uncertain";
  if (netAmount < 0 || netPercent < 0) return "negative";
  if (netPercent < 15) return "at_risk";
  if (netPercent < 30) return "thin";
  return "profitable";
}

function proportionalShare(orderLevelAmount: number, lineTotal: number, orderSubtotal: number): number {
  if (orderSubtotal <= 0) return 0;
  return orderLevelAmount * (lineTotal / orderSubtotal);
}

function resolveRefundShare(line: OrderLineInput): number {
  if (line.refundAmount <= 0) return 0;
  // Prorate refund to line level. Cap at lineTotal (can't refund more than the line).
  return Math.min(proportionalShare(line.refundAmount, line.lineTotal, line.orderTotal), line.lineTotal);
}

// ─── Main Calculation ───

export function calculateProfitabilityReport(lines: OrderLineInput[]): ProfitabilityReport {
  const processedLines: ProfitabilityLine[] = [];

  // ─── Product aggregation accumulator ───
  const productMap = new Map<string, {
    productId: string;
    title: string;
    category: string;
    supplier: string | null;
    totalRevenue: number;
    totalRefundImpact: number;
    totalCost: number;
    totalPaymentFees: number;
    totalChannelFees: number;
    unitsSold: number;
    refundedUnits: number;
    orderIds: Set<string>;
    hasCostData: boolean;
    worstConfidence: CostConfidence;
    hasFeeData: boolean;
  }>();

  // ─── Channel aggregation accumulator ───
  const channelMap = new Map<string, {
    channel: string;
    totalRevenue: number;
    totalRefundImpact: number;
    totalCost: number;
    totalPaymentFees: number;
    totalChannelFees: number;
    orderIds: Set<string>;
  }>();

  // ─── Global accumulators ───
  let totalRevenue = 0;
  let totalRefunds = 0;
  let totalCostOfGoods = 0;
  let totalPaymentFees = 0;
  let totalChannelFees = 0;
  let totalShippingCharged = 0;
  const orderIdsSeen = new Set<string>();
  const refundedOrderIds = new Set<string>();
  const cancelledOrderIds = new Set<string>();
  const productsWithCost = new Set<string>();
  const productsWithoutCost = new Set<string>();
  const productsWithFees = new Set<string>();

  for (const line of lines) {
    const { unitCost, confidence } = resolveUnitCost(line);
    const revenueStatus = resolveRevenueStatus(line);
    const feeDataQuality = resolveFeeDataQuality(line.paymentFee, line.paymentStatus);

    // For cancelled orders: zero revenue, zero cost contribution
    const isCancelled = revenueStatus === "cancelled";
    const isFullyRefunded = revenueStatus === "fully_refunded";

    const refundShare = resolveRefundShare(line);
    const grossRevenue = isCancelled ? 0 : line.lineTotal;
    const netRevenue = isCancelled ? 0 : isFullyRefunded ? 0 : Math.max(line.lineTotal - refundShare, 0);
    const effectiveRefund = isCancelled ? line.lineTotal : refundShare;

    const totalCost = (isCancelled || isFullyRefunded) ? 0 : unitCost * line.quantity;

    // Fees prorated by subtotal (fees apply to product revenue, not shipping)
    const paymentFeeShare = (isCancelled || isFullyRefunded) ? 0 : proportionalShare(line.paymentFee, line.lineTotal, line.orderSubtotal);
    const channelFeeShare = (isCancelled || isFullyRefunded) ? 0 : proportionalShare(line.channelFee, line.lineTotal, line.orderSubtotal);

    // Gross margin = net revenue - COGS
    const grossMargin = netRevenue - totalCost;
    // Net contribution = gross margin - fees (shipping NOT deducted — it's customer-charged, not merchant cost)
    const netContribution = grossMargin - paymentFeeShare - channelFeeShare;
    const netContributionPercent = netRevenue > 0 ? (netContribution / netRevenue) * 100 : 0;
    const effectiveUnits = (isCancelled || isFullyRefunded) ? 0 : line.quantity;
    const contributionPerUnit = effectiveUnits > 0 ? netContribution / effectiveUnits : 0;

    const health = resolveHealth(netContributionPercent, confidence, netContribution);

    processedLines.push({
      orderId: line.orderId,
      orderNumber: line.orderNumber,
      orderDate: line.orderDate,
      channel: line.channel,
      productId: line.productId,
      productTitle: line.productTitle,
      variantTitle: line.variantTitle,
      sku: line.sku,
      supplier: line.supplier,
      quantity: line.quantity,
      revenue: round2(grossRevenue),
      refundImpact: round2(effectiveRefund),
      netRevenue: round2(netRevenue),
      unitCost,
      totalCost: round2(totalCost),
      paymentFeeShare: round2(paymentFeeShare),
      channelFeeShare: round2(channelFeeShare),
      grossMargin: round2(grossMargin),
      netContribution: round2(netContribution),
      netContributionPercent: parseFloat(netContributionPercent.toFixed(1)),
      contributionPerUnit: round2(contributionPerUnit),
      costConfidence: confidence,
      feeDataQuality,
      revenueStatus,
      health,
    });

    // ─── Accumulate global totals ───
    totalRevenue += grossRevenue;
    totalRefunds += effectiveRefund;
    totalCostOfGoods += totalCost;
    totalPaymentFees += paymentFeeShare;
    totalChannelFees += channelFeeShare;
    if (!isCancelled && !isFullyRefunded) {
      totalShippingCharged += proportionalShare(line.shippingAmount, line.lineTotal, line.orderSubtotal);
    }
    orderIdsSeen.add(line.orderId);
    if (revenueStatus === "fully_refunded" || revenueStatus === "partially_refunded") refundedOrderIds.add(line.orderId);
    if (isCancelled) cancelledOrderIds.add(line.orderId);

    const pKey = line.productId || line.productTitle;
    if (confidence !== "none") productsWithCost.add(pKey);
    else productsWithoutCost.add(pKey);
    if (feeDataQuality === "real") productsWithFees.add(pKey);

    // ─── Product aggregation ───
    if (!productMap.has(pKey)) {
      productMap.set(pKey, {
        productId: line.productId || pKey,
        title: line.productTitle,
        category: line.category,
        supplier: line.supplier,
        totalRevenue: 0,
        totalRefundImpact: 0,
        totalCost: 0,
        totalPaymentFees: 0,
        totalChannelFees: 0,
        unitsSold: 0,
        refundedUnits: 0,
        orderIds: new Set(),
        hasCostData: false,
        worstConfidence: "high",
        hasFeeData: false,
      });
    }
    const pm = productMap.get(pKey)!;
    pm.totalRevenue += grossRevenue;
    pm.totalRefundImpact += effectiveRefund;
    pm.totalCost += totalCost;
    pm.totalPaymentFees += paymentFeeShare;
    pm.totalChannelFees += channelFeeShare;
    pm.unitsSold += effectiveUnits;
    if (isCancelled || isFullyRefunded) pm.refundedUnits += line.quantity;
    pm.orderIds.add(line.orderId);
    if (confidence !== "none") pm.hasCostData = true;
    if (feeDataQuality === "real") pm.hasFeeData = true;
    if (confidenceRank(confidence) < confidenceRank(pm.worstConfidence)) {
      pm.worstConfidence = confidence;
    }

    // ─── Channel aggregation ───
    const ch = line.channel;
    if (!channelMap.has(ch)) {
      channelMap.set(ch, {
        channel: ch,
        totalRevenue: 0,
        totalRefundImpact: 0,
        totalCost: 0,
        totalPaymentFees: 0,
        totalChannelFees: 0,
        orderIds: new Set(),
      });
    }
    const cm = channelMap.get(ch)!;
    cm.totalRevenue += grossRevenue;
    cm.totalRefundImpact += effectiveRefund;
    cm.totalCost += totalCost;
    cm.totalPaymentFees += paymentFeeShare;
    cm.totalChannelFees += channelFeeShare;
    cm.orderIds.add(line.orderId);
  }

  // ─── Phase 2: Build product profitability ───
  const byProduct: ProductProfitability[] = [];
  productMap.forEach((val) => {
    const netRevenue = val.totalRevenue - val.totalRefundImpact;
    const grossMargin = netRevenue - val.totalCost;
    const netContribution = grossMargin - val.totalPaymentFees - val.totalChannelFees;
    const netContributionPercent = netRevenue > 0 ? (netContribution / netRevenue) * 100 : 0;
    const contributionPerUnit = val.unitsSold > 0 ? netContribution / val.unitsSold : 0;
    const health = resolveHealth(netContributionPercent, val.worstConfidence, netContribution);
    const feeQ: FeeDataQuality = val.hasFeeData ? "real" : val.unitsSold > 0 ? "zero_recorded" : "unavailable";

    byProduct.push({
      productId: val.productId,
      title: val.title,
      category: val.category,
      supplier: val.supplier,
      totalRevenue: round2(val.totalRevenue),
      totalRefundImpact: round2(val.totalRefundImpact),
      totalNetRevenue: round2(netRevenue),
      totalCost: round2(val.totalCost),
      totalPaymentFees: round2(val.totalPaymentFees),
      totalChannelFees: round2(val.totalChannelFees),
      grossMargin: round2(grossMargin),
      netContribution: round2(netContribution),
      netContributionPercent: parseFloat(netContributionPercent.toFixed(1)),
      contributionPerUnit: round2(contributionPerUnit),
      unitsSold: val.unitsSold,
      ordersCount: val.orderIds.size,
      refundedUnits: val.refundedUnits,
      costConfidence: val.worstConfidence,
      feeDataQuality: feeQ,
      health,
      hasCostData: val.hasCostData,
    });
  });
  byProduct.sort((a, b) => b.totalNetRevenue - a.totalNetRevenue);

  // ─── Phase 3: Build channel profitability ───
  const byChannel: ChannelProfitability[] = [];
  channelMap.forEach((val) => {
    const netRevenue = val.totalRevenue - val.totalRefundImpact;
    const grossMargin = netRevenue - val.totalCost;
    const netContribution = grossMargin - val.totalPaymentFees - val.totalChannelFees;
    const netContributionPercent = netRevenue > 0 ? (netContribution / netRevenue) * 100 : 0;
    const feeRatio = netRevenue > 0 ? ((val.totalPaymentFees + val.totalChannelFees) / netRevenue) * 100 : 0;
    const orderCount = val.orderIds.size;
    const avgContribution = orderCount > 0 ? netContribution / orderCount : 0;
    const allHaveCost = productsWithoutCost.size === 0;
    const health = resolveHealth(netContributionPercent, allHaveCost ? "high" : "medium", netContribution);

    byChannel.push({
      channel: val.channel,
      totalRevenue: round2(val.totalRevenue),
      totalRefundImpact: round2(val.totalRefundImpact),
      totalNetRevenue: round2(netRevenue),
      totalCost: round2(val.totalCost),
      totalPaymentFees: round2(val.totalPaymentFees),
      totalChannelFees: round2(val.totalChannelFees),
      grossMargin: round2(grossMargin),
      netContribution: round2(netContribution),
      netContributionPercent: parseFloat(netContributionPercent.toFixed(1)),
      ordersCount: orderCount,
      avgContributionPerOrder: round2(avgContribution),
      feeRatio: parseFloat(feeRatio.toFixed(1)),
      health,
    });
  });
  byChannel.sort((a, b) => b.totalNetRevenue - a.totalNetRevenue);

  // ─── Phase 4: Generate alerts ───
  const alerts: ProfitabilityAlert[] = [];

  // Products without cost
  const noCostProducts = byProduct.filter((p) => !p.hasCostData && p.unitsSold > 0);
  for (const p of noCostProducts.slice(0, 5)) {
    alerts.push({
      type: "no_cost",
      severity: "critical",
      title: `Sin costo: ${p.title}`,
      description: `Vendió ${p.unitsSold} uds ($${round2(p.totalNetRevenue).toLocaleString("es-AR")}) sin costo cargado. La contribución no se puede calcular.`,
      productId: p.productId,
      actionHref: `/admin/catalog`,
      actionLabel: "Cargar costo",
    });
  }

  // Products with negative contribution (only if cost data exists)
  const negativeProducts = byProduct.filter((p) => p.hasCostData && p.netContribution < 0);
  for (const p of negativeProducts.slice(0, 5)) {
    alerts.push({
      type: "negative_margin",
      severity: "critical",
      title: `Contribución negativa: ${p.title}`,
      description: `Pierde $${Math.abs(p.netContribution).toLocaleString("es-AR")} neto (${p.netContributionPercent}%). Cada venta destruye valor. Revisá precio, costo o fees.`,
      productId: p.productId,
      actionHref: `/admin/catalog`,
      actionLabel: "Revisar producto",
    });
  }

  // Products with thin margin
  const thinProducts = byProduct.filter((p) => p.hasCostData && p.health === "thin");
  if (thinProducts.length > 0) {
    alerts.push({
      type: "thin_margin",
      severity: "warning",
      title: `${thinProducts.length} producto(s) con contribución fina`,
      description: `Operan entre 15% y 30% de contribución neta. Cualquier aumento de costos o fees puede volverlos negativos.`,
      actionHref: `/admin/catalog`,
      actionLabel: "Revisar catálogo",
    });
  }

  // High fees detection
  const totalNetRevenue = totalRevenue - totalRefunds;
  const feeRatio = totalNetRevenue > 0 ? ((totalPaymentFees + totalChannelFees) / totalNetRevenue) * 100 : 0;
  if (feeRatio > 10) {
    alerts.push({
      type: "high_fees",
      severity: "warning",
      title: `Comisiones altas: ${feeRatio.toFixed(1)}% de ingresos netos`,
      description: `Los fees de pago y canal representan más del 10% de los ingresos netos. Esto erosiona la contribución directamente.`,
      actionHref: `/admin/integrations`,
      actionLabel: "Revisar integraciones",
    });
  }

  // High refund rate
  const refundRate = orderIdsSeen.size > 0 ? (refundedOrderIds.size / orderIdsSeen.size) * 100 : 0;
  if (refundRate > 5 && refundedOrderIds.size >= 2) {
    alerts.push({
      type: "high_refund_rate",
      severity: refundRate > 15 ? "critical" : "warning",
      title: `Tasa de reembolso: ${refundRate.toFixed(0)}%`,
      description: `${refundedOrderIds.size} de ${orderIdsSeen.size} órdenes tienen reembolso total o parcial. Revisá calidad de producto o expectativas del cliente.`,
      actionHref: `/admin/orders`,
      actionLabel: "Revisar órdenes",
    });
  }

  // Zero fees warning (orders with approved payment but no fee data)
  const ordersWithZeroFees = processedLines.filter((l) => l.feeDataQuality === "zero_recorded" && l.netRevenue > 0);
  if (ordersWithZeroFees.length > 0) {
    const uniqueOrders = new Set(ordersWithZeroFees.map((l) => l.orderId));
    alerts.push({
      type: "zero_fees_warning",
      severity: "info",
      title: `${uniqueOrders.size} orden(es) sin fee de pago registrado`,
      description: `Estas órdenes fueron cobradas pero el fee de la pasarela no se capturó. La contribución neta puede estar sobreestimada en esos casos.`,
    });
  }

  // Channel erosion: channel with negative contribution
  const erodingChannels = byChannel.filter((c) => c.netContribution < 0 && c.totalNetRevenue > 0);
  for (const c of erodingChannels) {
    alerts.push({
      type: "channel_erosion",
      severity: "critical",
      title: `Canal erosivo: ${c.channel}`,
      description: `El canal ${c.channel} genera $${round2(c.totalNetRevenue).toLocaleString("es-AR")} en ingresos pero la contribución neta es -$${Math.abs(c.netContribution).toLocaleString("es-AR")}. Los costos y fees superan los ingresos.`,
      channel: c.channel,
      actionHref: `/admin/integrations`,
      actionLabel: "Revisar canal",
    });
  }

  // Data completeness
  const withoutCostCount = productsWithoutCost.size;
  const totalProductsSeen = productsWithCost.size + withoutCostCount;
  if (withoutCostCount > 0) {
    alerts.push({
      type: "incomplete_data",
      severity: withoutCostCount > totalProductsSeen / 2 ? "critical" : "warning",
      title: `${withoutCostCount} de ${totalProductsSeen} producto(s) sin costo`,
      description: `El ${totalProductsSeen > 0 ? ((withoutCostCount / totalProductsSeen) * 100).toFixed(0) : 0}% de los productos vendidos no tiene costo. Las contribuciones marcadas "Incierto" no son confiables.`,
      actionHref: `/admin/catalog`,
      actionLabel: "Cargar costos",
    });
  }

  // ─── Phase 5: Summary ───
  const grossMargin = totalNetRevenue - totalCostOfGoods;
  const netContribution = grossMargin - totalPaymentFees - totalChannelFees;
  const grossMarginPercent = totalNetRevenue > 0 ? (grossMargin / totalNetRevenue) * 100 : 0;
  const netContributionPercent = totalNetRevenue > 0 ? (netContribution / totalNetRevenue) * 100 : 0;
  const dataConfidenceScore = totalProductsSeen > 0
    ? Math.round((productsWithCost.size / totalProductsSeen) * 100)
    : 0;

  const overallFeeQuality: FeeDataQuality = productsWithFees.size > 0
    ? "real"
    : totalPaymentFees > 0 ? "real" : orderIdsSeen.size > 0 ? "zero_recorded" : "unavailable";

  const overallHealth = resolveHealth(
    netContributionPercent,
    dataConfidenceScore >= 70 ? "high" : dataConfidenceScore >= 40 ? "medium" : "none",
    netContribution,
  );

  const summary: ProfitabilitySummary = {
    totalRevenue: round2(totalRevenue),
    totalRefunds: round2(totalRefunds),
    totalNetRevenue: round2(totalNetRevenue),
    totalCostOfGoods: round2(totalCostOfGoods),
    totalPaymentFees: round2(totalPaymentFees),
    totalChannelFees: round2(totalChannelFees),
    grossMargin: round2(grossMargin),
    grossMarginPercent: parseFloat(grossMarginPercent.toFixed(1)),
    netContribution: round2(netContribution),
    netContributionPercent: parseFloat(netContributionPercent.toFixed(1)),
    ordersAnalyzed: orderIdsSeen.size,
    ordersRefunded: refundedOrderIds.size,
    ordersCancelled: cancelledOrderIds.size,
    linesAnalyzed: processedLines.length,
    productsWithCost: productsWithCost.size,
    productsWithoutCost: withoutCostCount,
    productsWithFees: productsWithFees.size,
    dataConfidenceScore,
    feeDataQuality: overallFeeQuality,
    overallHealth,
    shippingChargedToCustomer: round2(totalShippingCharged),
    shippingNote: "El importe de envío es lo cobrado al comprador. No representa costo logístico del negocio, que no está disponible en el sistema actual.",
  };

  return {
    summary,
    byProduct,
    byChannel,
    alerts: alerts.sort((a, b) => severityRank(b.severity) - severityRank(a.severity)),
    generatedAt: new Date().toISOString(),
    engineVersion: "v2",
  };
}

// ─── Helpers ───

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function confidenceRank(c: CostConfidence): number {
  switch (c) {
    case "high": return 3;
    case "medium": return 2;
    case "none": return 1;
  }
}

function severityRank(s: string): number {
  switch (s) {
    case "critical": return 3;
    case "warning": return 2;
    case "info": return 1;
    default: return 0;
  }
}
