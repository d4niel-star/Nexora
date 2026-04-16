// ─── Variant Economics v1 Data Layer ───
// Fetches OrderItem-level economic data grouped by variantId.
// Reuses the same order filter as profitability v2 queries.
// Exploits OrderItem.variantId + costSnapshot + lineTotal for real per-variant economics.

"use server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import { calculateVariantEconomics, type VariantEconLineInput } from "./variant-engine";
import type { VariantEconomicsReport } from "@/types/variant-economics";

export async function getVariantEconomicsReport(): Promise<VariantEconomicsReport> {
  const store = await getCurrentStore();
  if (!store) return calculateVariantEconomics([]);

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
            select: { id: true, cost: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const lines: VariantEconLineInput[] = [];

  for (const order of orders) {
    for (const item of order.items) {
      lines.push({
        orderId: order.id,
        variantId: item.variantId,
        productId: item.productId,
        productTitle: item.titleSnapshot,
        variantTitle: item.variantTitleSnapshot,
        quantity: item.quantity,
        priceSnapshot: item.priceSnapshot,
        costSnapshot: item.costSnapshot,
        lineTotal: item.lineTotal,
        currentProductCost: item.product?.cost ?? null,
        orderTotal: order.total,
        orderSubtotal: order.subtotal,
        paymentFee: order.paymentFee,
        channelFee: order.channelFee,
        refundAmount: order.refundAmount || 0,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        cancelledAt: order.cancelledAt?.toISOString() ?? null,
        shippingAmount: order.shippingAmount,
      });
    }
  }

  return calculateVariantEconomics(lines);
}
