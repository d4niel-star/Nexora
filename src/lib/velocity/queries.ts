// ─── Sales Velocity + Demand Intelligence Data Layer v1 ───
// Fetches order, product, mirror, and profitability data from DB.
// Feeds the pure velocity engine. Reuses profitability engine for economics cross.

"use server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import {
  calculateVelocityReport,
  type VelocityOrderLine,
  type VelocityProductContext,
  type VelocityEconomics,
} from "./engine";
import { calculateProfitabilityReport, type OrderLineInput } from "@/lib/profitability/engine";
import type { VelocityReport } from "@/types/velocity";

export async function getVelocityReport(): Promise<VelocityReport> {
  const store = await getCurrentStore();
  if (!store) {
    return {
      products: [],
      providers: [],
      summary: {
        totalProducts: 0, productsWithSales: 0, productsWithoutSales: 0,
        highRotation: 0, mediumRotation: 0, lowRotation: 0, stalled: 0, insufficientData: 0,
        pushCount: 0, reviewCount: 0, pauseCount: 0,
        totalUnitsSold: 0, totalRevenue: 0, windowDays: 30,
      },
      generatedAt: new Date().toISOString(),
      engineVersion: "v1",
    };
  }

  const sid = store.id;

  // ─── Fetch all data in parallel ───
  const [orders, products, mirrors] = await Promise.all([
    // Orders with economic activity (same pattern as profitability)
    prisma.order.findMany({
      where: {
        storeId: sid,
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
            product: { select: { id: true, cost: true, category: true, supplier: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    // All products (for context of zero-sales products)
    prisma.product.findMany({
      where: { storeId: sid },
      select: {
        id: true,
        title: true,
        category: true,
        supplier: true,
        isPublished: true,
        createdAt: true,
        catalogMirror: {
          select: {
            providerProduct: {
              select: { provider: { select: { name: true } } },
            },
          },
        },
      },
    }),
    // This query is already done in products above via catalogMirror, no extra query needed
    Promise.resolve(null),
  ]);

  // ─── Build velocity order lines ───
  const velocityLines: VelocityOrderLine[] = [];
  const profitLines: OrderLineInput[] = [];

  for (const order of orders) {
    for (const item of order.items) {
      velocityLines.push({
        orderId: order.id,
        productId: item.productId ?? "",
        productTitle: item.titleSnapshot,
        category: item.product?.category || "Sin categoria",
        supplier: item.product?.supplier || null,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
        orderDate: order.createdAt.toISOString(),
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        refundAmount: order.refundAmount || 0,
        cancelledAt: order.cancelledAt?.toISOString() ?? null,
      });

      // Also build profitability lines for economics cross
      profitLines.push({
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
        category: item.product?.category || "Sin categoria",
        supplier: item.product?.supplier || null,
        quantity: item.quantity,
        priceSnapshot: item.priceSnapshot,
        costSnapshot: item.costSnapshot,
        lineTotal: item.lineTotal,
        currentProductCost: item.product?.cost ?? null,
      });
    }
  }

  // ─── Build product contexts ───
  const contexts: VelocityProductContext[] = products.map((p) => ({
    productId: p.id,
    isPublished: p.isPublished,
    createdAt: p.createdAt.toISOString(),
    hasProvider: !!p.catalogMirror,
    providerName: p.catalogMirror?.providerProduct?.provider?.name ?? null,
  }));

  // ─── Build economics from profitability engine ───
  const economics: VelocityEconomics[] = [];
  if (profitLines.length > 0) {
    const profitReport = calculateProfitabilityReport(profitLines);
    for (const pp of profitReport.byProduct) {
      economics.push({
        productId: pp.productId,
        netContributionPercent: pp.netContributionPercent,
        contributionPerUnit: pp.contributionPerUnit,
        marginHealth: pp.health,
      });
    }
  }

  return calculateVelocityReport(velocityLines, contexts, economics);
}
