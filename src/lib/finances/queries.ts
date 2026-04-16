import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import type { 
  FinanceMovement, 
  PendingPayment, 
  Refund, 
  CommissionEntry, 
  MarginEntry, 
  ExportRecord,
  FinanceSummary
} from "@/types/finances";

export interface AdminFinanceData {
  summary: FinanceSummary;
  movements: FinanceMovement[];
  pending: PendingPayment[];
  refunds: Refund[];
  commissions: CommissionEntry[];
  margins: MarginEntry[];
  exports: ExportRecord[];
}

export async function getAdminFinanceData(): Promise<AdminFinanceData> {
  const store = await getCurrentStore();

  if (!store) {
    throw new Error("No active store found");
  }

  const orders = await prisma.order.findMany({
    where: { storeId: store.id },
    include: {
      items: {
        include: { product: true }
      },
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate Movements (Collected Orders)
  const movements: FinanceMovement[] = [];
  const pending: PendingPayment[] = [];
  const refunds: Refund[] = [];
  
  let totalCollected = 0;
  let totalPending = 0;
  let totalRefunded = 0;
  let totalCommissions = 0;
  let totalShipping = 0;
  let totalNet = 0;
  let orderCount = 0;
  
  // Product-level aggregation for Margins
  const productMarginsMap = new Map<string, {
    name: string;
    category: string;
    revenue: number;
    cost: number;
    qty: number;
    discountImpact: number;
    shippingImpact: number;
  }>();

  for (const order of orders) {
    orderCount++;
    // Refund takes precedence: only orders with an actual refund (payment marked refunded
    // or a non-zero refundAmount) belong in the refunds bucket. A paid-then-cancelled
    // order without a recorded refund must not be phantom-inflated into totalRefunded,
    // and a paid order cancelled for non-payment reasons must not be counted as collected.
    const hasRecordedRefund = (order.refundAmount ?? 0) > 0 || order.paymentStatus === "refunded";
    const isRefunded = hasRecordedRefund;
    const isCollected = !isRefunded && (order.paymentStatus === "approved" || order.paymentStatus === "paid") && order.status !== "cancelled";
    const isPending = !isRefunded && (order.paymentStatus === "pending" || order.paymentStatus === "in_process");

    const paymentFee = order.paymentFee;
    const channelFee = order.channelFee || 0;
    const totalCommissionsOrder = paymentFee + channelFee;
    
    // Sum real costs from order items
    let orderCost = 0;
    
    for (const item of order.items) {
      // Use costSnapshot if available, fallback to current product cost. Never fabricate.
      const unitCost = item.costSnapshot > 0 ? item.costSnapshot : (item.product?.cost || 0); 
      orderCost += (unitCost * item.quantity);
      
      const pId = item.productId || item.titleSnapshot;
      if (!productMarginsMap.has(pId)) {
        productMarginsMap.set(pId, {
          name: item.titleSnapshot,
          category: item.product?.category || "General",
          revenue: 0,
          cost: 0,
          qty: 0,
          discountImpact: 0,
          shippingImpact: 0,
        });
      }
      
      const m = productMarginsMap.get(pId)!;
      // We attribute revenue based on what was sold.
      m.revenue += item.lineTotal;
      m.cost += (unitCost * item.quantity);
      m.qty += item.quantity;
      // proportional shipping
      m.shippingImpact += (order.shippingAmount / order.items.length);
    }
    
    const netAmount = order.total - order.shippingAmount - totalCommissionsOrder - orderCost;
    
    if (isCollected) {
      totalCollected += order.total;
      totalCommissions += totalCommissionsOrder;
      totalShipping += order.shippingAmount;
      totalNet += netAmount;
      
      movements.push({
        id: order.id,
        reference: order.orderNumber,
        customer: `${order.firstName} ${order.lastName}`.trim(),
        channel: order.channel as any,
        date: order.createdAt.toISOString(),
        gross: order.total,
        commission: totalCommissionsOrder,
        shipping: order.shippingAmount,
        net: netAmount,
        status: "collected"
      });
    } else if (isPending) {
      totalPending += order.total;
      pending.push({
        id: order.id,
        reference: order.orderNumber,
        customer: `${order.firstName} ${order.lastName}`.trim(),
        date: order.createdAt.toISOString(),
        amount: order.total,
        cause: "Pago pendiente",
        dueDate: order.createdAt.toISOString(),
        channel: order.channel as any,
        status: "pending"
      });
    } else if (isRefunded) {
      // Use the real refundAmount; if unavailable but paymentStatus is refunded,
      // fall back to order.total. Never invent a refund when neither is present.
      const refundedAmount = (order.refundAmount ?? 0) > 0
        ? order.refundAmount!
        : (order.paymentStatus === "refunded" ? order.total : 0);
      totalRefunded += refundedAmount;
      refunds.push({
        id: order.id,
        reference: order.orderNumber,
        customer: `${order.firstName} ${order.lastName}`.trim(),
        date: order.updatedAt.toISOString(),
        amount: refundedAmount,
        reason: order.cancelReason as any || "Cancelacion cliente",
        status: "refunded",
        method: order.paymentProvider || "Desconocido"
      });
    }
  }

  // Build margins
  const margins: MarginEntry[] = [];
  productMarginsMap.forEach((val, key) => {
    const margin = val.revenue - val.cost;
    const marginPercent = val.revenue > 0 ? (margin / val.revenue) * 100 : 0;
    
    let health: "stable" | "warning" | "critical" = "stable";
    if (marginPercent < 15) health = "critical";
    else if (marginPercent < 30) health = "warning";
    
    margins.push({
      id: key,
      name: val.name,
      category: val.category,
      revenue: val.revenue,
      cost: val.cost,
      margin: margin,
      marginPercent: parseFloat(marginPercent.toFixed(1)),
      discountImpact: val.discountImpact,
      shippingImpact: val.shippingImpact,
      health
    });
  });

  // Build commissions from real payment providers seen in collected orders
  const commissions: CommissionEntry[] = [];
  const providerFeeMap = new Map<string, { amount: number; txCount: number }>();
  for (const order of orders) {
    const isCollected = order.paymentStatus === "approved" || order.paymentStatus === "paid";
    if (!isCollected) continue;
    const provider = order.paymentProvider || "Plataforma";
    const existing = providerFeeMap.get(provider) || { amount: 0, txCount: 0 };
    existing.amount += order.paymentFee + (order.channelFee || 0);
    existing.txCount += 1;
    providerFeeMap.set(provider, existing);
  }
  for (const [provider, data] of providerFeeMap) {
    if (data.amount <= 0) continue;
    const effectiveRate = totalCollected > 0 ? (data.amount / totalCollected) * 100 : 0;
    commissions.push({
      id: `comm-${provider}`,
      source: provider === "mercadopago" ? "Mercado Pago" : provider === "stripe" ? "Stripe" : provider,
      type: "pasarela",
      amount: data.amount,
      percentage: parseFloat(effectiveRate.toFixed(2)),
      transactions: data.txCount,
      period: "Acumulado"
    });
  }

  const exportsRecords: ExportRecord[] = []; // Usually kept in a separate table, mocking empty for real flow.

  const collectedCount = movements.length;
  const avgTicket = collectedCount > 0 ? totalCollected / collectedCount : 0;
  
  // Estimated margin uses only collected orders' net amounts
  // totalNet already accumulates per collected order: total - shipping - fees - cost
  const estimatedMargin = totalNet;
  const estimatedMarginPercent = totalCollected > 0 ? (estimatedMargin / totalCollected) * 100 : 0;

  return {
    summary: {
      totalCollected,
      totalPending,
      totalRefunded,
      avgTicket,
      estimatedMargin,
      estimatedMarginPercent: parseFloat(estimatedMarginPercent.toFixed(1)),
      totalCommissions,
      totalShipping,
      estimatedNet: estimatedMargin,
      pendingCount: pending.length,
      refundCount: refunds.length
    },
    movements,
    pending,
    refunds,
    commissions,
    margins: margins.sort((a,b) => b.revenue - a.revenue),
    exports: exportsRecords
  };
}
