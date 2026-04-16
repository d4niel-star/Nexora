// Net Profitability Data Layer v2
// Fetches settled/refunded/cancelled order data from DB and feeds it to the v2 engine.
// Includes: collected orders, partial/full refunds, cancellations with prior payment.

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import { calculateProfitabilityReport, type OrderLineInput } from "./engine";
import type { ProfitabilityReport } from "@/types/profitability";

export async function getProfitabilityReport(): Promise<ProfitabilityReport> {
  const store = await getCurrentStore();
  if (!store) return calculateProfitabilityReport([]);

  // Fetch all orders that had economic activity:
  // - approved/paid (collected revenue)
  // - refunded (full or partial)
  // - cancelled (may have had approved payment before cancellation)
  const orders = await prisma.order.findMany({
    where: {
      storeId: store.id,
      OR: [
        { paymentStatus: { in: ["approved", "paid"] } },
        { paymentStatus: "refunded" },
        { status: "refunded" },
        { status: "cancelled", paymentStatus: { not: "pending" } },
        { refundAmount: { gt: 0 } },
      ],
    },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, cost: true, category: true, supplier: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const lines: OrderLineInput[] = [];

  for (const order of orders) {
    for (const item of order.items) {
      lines.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderDate: order.createdAt.toISOString(),
        channel: order.channel,
        orderTotal: order.total,
        orderSubtotal: order.subtotal,
        orderItemCount: order.items.length,
        paymentFee: order.paymentFee,
        channelFee: order.channelFee,
        shippingAmount: order.shippingAmount,
        refundAmount: order.refundAmount || 0,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        cancelledAt: order.cancelledAt?.toISOString() ?? null,
        productId: item.productId,
        productTitle: item.titleSnapshot,
        variantTitle: item.variantTitleSnapshot,
        sku: item.skuSnapshot || null,
        category: item.product?.category || "Sin categoría",
        supplier: item.product?.supplier || null,
        quantity: item.quantity,
        priceSnapshot: item.priceSnapshot,
        costSnapshot: item.costSnapshot,
        lineTotal: item.lineTotal,
        currentProductCost: item.product?.cost ?? null,
      });
    }
  }

  return calculateProfitabilityReport(lines);
}
