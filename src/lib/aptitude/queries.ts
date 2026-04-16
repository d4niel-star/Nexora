// ─── Channel + Ads Aptitude Data Layer v1 ───
// Fetches all products with their signals from DB and feeds the aptitude engine.
// Reuses profitability data from Unit Economics v2 when available.

"use server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import { calculateAptitudeReport, type ProductAptitudeInput } from "./engine";
import { calculateProfitabilityReport, type OrderLineInput } from "@/lib/profitability/engine";
import type { AptitudeReport } from "@/types/aptitude";

export async function getAptitudeReport(): Promise<AptitudeReport> {
  const store = await getCurrentStore();
  if (!store) {
    return {
      products: [],
      summary: {
        totalProducts: 0, channelApt: 0, channelReview: 0, channelNotApt: 0, channelInsufficient: 0,
        adsApt: 0, adsReview: 0, adsNotApt: 0, adsInsufficient: 0, topBlockers: [],
      },
      generatedAt: new Date().toISOString(),
      engineVersion: "v1",
    };
  }

  const sid = store.id;

  // ─── Fetch all data in parallel ───
  const [products, listings, channelConns, adDrafts, adRecos, orders] = await Promise.all([
    prisma.product.findMany({
      where: { storeId: sid },
      include: {
        variants: { select: { stock: true, reservedStock: true, trackInventory: true } },
        images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.channelListing.findMany({
      where: { storeId: sid },
      select: { productId: true, channel: true, status: true, syncStatus: true },
    }),
    prisma.channelConnection.findMany({
      where: { storeId: sid, status: "connected" },
      select: { channel: true },
    }),
    prisma.adCampaignDraft.findMany({
      where: { storeId: sid },
      select: { sourceProductIds: true, sourceProducts: { select: { productId: true } } },
    }),
    prisma.adRecommendation.findMany({
      where: { storeId: sid, dismissedAt: null },
      select: { recommendationJson: true },
    }),
    // Fetch orders for profitability calculation (reuse same query pattern as profitability)
    prisma.order.findMany({
      where: {
        storeId: sid,
        OR: [
          { paymentStatus: { in: ["approved", "paid"] } },
          { paymentStatus: "refunded" },
          { status: "refunded" },
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
    }),
  ]);

  // ─── Build profitability map (productId → per-product metrics) ───
  const profitLines: OrderLineInput[] = [];
  for (const order of orders) {
    for (const item of order.items) {
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

  const profitReport = profitLines.length > 0 ? calculateProfitabilityReport(profitLines) : null;
  const profitByProduct = new Map<string, { contributionPerUnit: number; netContributionPercent: number; health: string; costConfidence: string }>();
  if (profitReport) {
    for (const pp of profitReport.byProduct) {
      profitByProduct.set(pp.productId, {
        contributionPerUnit: pp.contributionPerUnit,
        netContributionPercent: pp.netContributionPercent,
        health: pp.health,
        costConfidence: pp.costConfidence,
      });
    }
  }

  // ─── Build listing lookup (productId → listings[]) ───
  const listingsByProduct = new Map<string, { channel: string; status: string; syncStatus: string }[]>();
  for (const l of listings) {
    const arr = listingsByProduct.get(l.productId) ?? [];
    arr.push({ channel: l.channel, status: l.status, syncStatus: l.syncStatus });
    listingsByProduct.set(l.productId, arr);
  }

  // ─── Build ad context lookup (productId → boolean) ───
  const productsWithAdContext = new Set<string>();
  for (const d of adDrafts) {
    // Prefer join table (schema v2), fall back to CSV for legacy drafts
    if (d.sourceProducts.length > 0) {
      for (const sp of d.sourceProducts) productsWithAdContext.add(sp.productId);
    } else if (d.sourceProductIds) {
      for (const pid of d.sourceProductIds.split(",")) productsWithAdContext.add(pid.trim());
    }
  }
  for (const r of adRecos) {
    try {
      const parsed = JSON.parse(r.recommendationJson);
      if (Array.isArray(parsed.suggestedProducts)) {
        for (const pid of parsed.suggestedProducts) {
          productsWithAdContext.add(pid);
        }
      }
    } catch {
      // Malformed JSON, skip
    }
  }

  // ─── Known connected channels ───
  const knownChannels = Array.from(new Set(channelConns.map((c) => c.channel)));
  // Always include storefront
  if (!knownChannels.includes("storefront")) {
    knownChannels.unshift("storefront");
  }

  // ─── Build engine inputs ───
  const inputs: ProductAptitudeInput[] = products.map((p) => {
    const totalStock = p.variants.reduce((sum, v) => sum + Math.max(v.stock - v.reservedStock, 0), 0);
    const hasVariantsTracking = p.variants.some((v) => v.trackInventory);
    const prof = profitByProduct.get(p.id);

    return {
      productId: p.id,
      title: p.title,
      category: p.category ?? "Sin categoría",
      supplier: p.supplier ?? null,
      status: p.isPublished ? "published" : p.status,
      isPublished: p.isPublished,
      price: p.price,
      cost: p.cost ?? null,
      image: p.featuredImage ?? p.images[0]?.url ?? "",
      totalStock,
      hasVariantsTracking,
      listings: listingsByProduct.get(p.id) ?? [],
      contributionPerUnit: prof?.contributionPerUnit ?? null,
      netContributionPercent: prof?.netContributionPercent ?? null,
      marginHealth: prof?.health ?? null,
      costConfidence: prof?.costConfidence ?? null,
      hasAdContext: productsWithAdContext.has(p.id),
    };
  });

  return calculateAptitudeReport(inputs, knownChannels);
}
