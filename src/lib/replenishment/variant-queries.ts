// ─── Variant Intelligence v2 Data Layer ───
// Fetches variant-level stock and sales data using OrderItem→ProductVariant relation.
// Feeds the variant intelligence engine. Reuses replenishment for aggregate context.

"use server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import {
  calculateVariantIntelligence,
  type VariantStockInput,
  type VariantSalesInput,
  type ProductAggregateContext,
} from "./variant-engine";
import type { VariantIntelligenceReport } from "@/types/variant-intelligence";
import type { ReplenishmentReport } from "@/types/replenishment";
import type { VariantEconomicsReport } from "@/types/variant-economics";

export async function getVariantIntelligenceReport(
  precomputedReplenishment?: ReplenishmentReport,
  precomputedEconomics?: VariantEconomicsReport,
): Promise<VariantIntelligenceReport> {
  const store = await getCurrentStore();
  if (!store) {
    return {
      products: [],
      summary: { totalVariants: 0, stockoutVariants: 0, criticalVariants: 0, lowVariants: 0, productsWithHiddenRisk: 0 },
      generatedAt: new Date().toISOString(),
      engineVersion: "v2",
    };
  }

  const sid = store.id;
  const now = new Date();
  const cutoff30 = new Date(now.getTime() - 30 * 86400000);
  const cutoff7 = new Date(now.getTime() - 7 * 86400000);

  // ─── Fetch variant stock + variant-level sales in parallel ───
  const [products, variantSales30d, variantSales7d] = await Promise.all([
    prisma.product.findMany({
      where: { storeId: sid },
      select: {
        id: true,
        title: true,
        isPublished: true,
        variants: {
          select: {
            id: true,
            title: true,
            stock: true,
            reservedStock: true,
            trackInventory: true,
            reorderPoint: true,
            price: true,
          },
        },
      },
    }),
    // Variant-level sales in 30d window — exploits OrderItem→ProductVariant relation
    prisma.orderItem.groupBy({
      by: ["variantId"],
      where: {
        variantId: { not: null },
        order: {
          storeId: sid,
          createdAt: { gte: cutoff30 },
          OR: [
            { paymentStatus: { in: ["approved", "paid"] } },
          ],
          status: { notIn: ["cancelled", "refunded"] },
        },
      },
      _sum: { quantity: true },
    }),
    // Variant-level sales in 7d window
    prisma.orderItem.groupBy({
      by: ["variantId"],
      where: {
        variantId: { not: null },
        order: {
          storeId: sid,
          createdAt: { gte: cutoff7 },
          OR: [
            { paymentStatus: { in: ["approved", "paid"] } },
          ],
          status: { notIn: ["cancelled", "refunded"] },
        },
      },
      _sum: { quantity: true },
    }),
  ]);

  // ─── Build variant stock inputs ───
  const variantInputs: VariantStockInput[] = [];
  for (const p of products) {
    for (const v of p.variants) {
      variantInputs.push({
        variantId: v.id,
        variantTitle: v.title,
        productId: p.id,
        productTitle: p.title,
        stock: v.stock,
        reservedStock: v.reservedStock,
        trackInventory: v.trackInventory,
        price: v.price,
        reorderPoint: v.reorderPoint,
        isPublished: p.isPublished,
      });
    }
  }

  // ─── Build variant sales maps ───
  const sales30Map = new Map<string, number>();
  for (const row of variantSales30d) {
    if (row.variantId) sales30Map.set(row.variantId, row._sum.quantity ?? 0);
  }
  const sales7Map = new Map<string, number>();
  for (const row of variantSales7d) {
    if (row.variantId) sales7Map.set(row.variantId, row._sum.quantity ?? 0);
  }

  const salesInputs: VariantSalesInput[] = variantInputs.map((v) => ({
    variantId: v.variantId,
    unitsSold30d: sales30Map.get(v.variantId) ?? 0,
    unitsSold7d: sales7Map.get(v.variantId) ?? 0,
  }));

  // ─── Build aggregate context from replenishment ───
  const aggregates: ProductAggregateContext[] = precomputedReplenishment
    ? precomputedReplenishment.products.map((p) => ({
        productId: p.productId,
        aggregateUrgency: p.urgency,
      }))
    : [];

  const report = calculateVariantIntelligence(variantInputs, salesInputs, aggregates);

  // Merge economics if provided
  if (precomputedEconomics) {
    const econMap = new Map<string, (typeof precomputedEconomics.products[0]["variants"])[0]>();
    for (const p of precomputedEconomics.products) {
      for (const v of p.variants) {
        econMap.set(v.variantId, v);
      }
    }
    for (const product of report.products) {
      for (const variant of product.variants) {
        const econ = econMap.get(variant.variantId);
        if (econ) {
          variant.econHealth = econ.health;
          variant.econEvidence = econ.healthEvidence;
          variant.netContribution = econ.netContribution;
          variant.contributionPerUnit = econ.contributionPerUnit;
          variant.costConfidence = econ.costConfidence;
          variant.econDataQualityNote = econ.dataQualityNote;
        }
      }
    }
  }

  return report;
}
