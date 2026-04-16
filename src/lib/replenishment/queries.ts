// ─── Sell-Through + Reorder / Replenishment Data Layer v1 ───
// Fetches stock, velocity, economics, and provider data from DB.
// Feeds the pure replenishment engine. Reuses velocity + profitability engines.

"use server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import { getVelocityReport } from "@/lib/velocity/queries";
import {
  calculateReplenishmentReport,
  type ReplenishmentStockInput,
  type ReplenishmentVelocityInput,
  type ReplenishmentEconomicsInput,
  type ReplenishmentProviderInput,
} from "./engine";
import type { ReplenishmentReport } from "@/types/replenishment";
import type { VelocityReport } from "@/types/velocity";

export async function getReplenishmentReport(precomputedVelocity?: VelocityReport): Promise<ReplenishmentReport> {
  const store = await getCurrentStore();
  if (!store) {
    return {
      products: [],
      providers: [],
      summary: {
        totalProducts: 0, critical: 0, soon: 0, monitor: 0, overstock: 0,
        adequate: 0, noData: 0, reorderCount: 0, reviewCount: 0,
        watchCount: 0, reduceCount: 0, windowDays: 30,
      },
      generatedAt: new Date().toISOString(),
      engineVersion: "v1",
    };
  }

  const sid = store.id;

  // ─── Fetch stock + provider data + velocity in parallel ───
  const [products, mirrors, velocityReport] = await Promise.all([
    prisma.product.findMany({
      where: { storeId: sid },
      select: {
        id: true,
        title: true,
        category: true,
        supplier: true,
        isPublished: true,
        variants: {
          select: { id: true, stock: true, reservedStock: true, trackInventory: true, reorderPoint: true },
        },
      },
    }),
    prisma.catalogMirrorProduct.findMany({
      where: { storeId: sid, importStatus: "imported" },
      select: {
        internalProductId: true,
        providerProduct: {
          select: {
            stock: true,
            leadTime: true,
            leadTimeMinDays: true,
            leadTimeMaxDays: true,
            provider: { select: { name: true } },
          },
        },
      },
    }),
    precomputedVelocity ?? getVelocityReport(),
  ]);

  // ─── Build stock inputs ───
  const stockInputs: ReplenishmentStockInput[] = products.map((p) => {
    const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
    const reservedStock = p.variants.reduce((sum, v) => sum + v.reservedStock, 0);
    const trackingInventory = p.variants.some((v) => v.trackInventory);
    const variantsOutOfStock = p.variants.filter((v) => v.trackInventory && (v.stock - v.reservedStock) <= 0).length;
    // Aggregate reorderPoint: use the minimum set across tracked variants, null if none set
    const trackedWithRP = p.variants.filter((v) => v.trackInventory && v.reorderPoint !== null);
    const reorderPoint = trackedWithRP.length > 0 ? Math.min(...trackedWithRP.map((v) => v.reorderPoint!)) : null;

    return {
      productId: p.id,
      title: p.title,
      category: p.category ?? "Sin categoria",
      supplier: p.supplier ?? null,
      isPublished: p.isPublished,
      totalStock,
      reservedStock,
      variantCount: p.variants.length,
      variantsOutOfStock,
      trackingInventory,
      reorderPoint,
    };
  });

  // ─── Build velocity inputs from velocity report ───
  const velocityInputs: ReplenishmentVelocityInput[] = velocityReport.products.map((vp) => ({
    productId: vp.productId,
    velocityPerDay: vp.velocityPerDay,
    unitsSold30d: vp.windows.find((w) => w.days === 30)?.unitsSold ?? vp.totalUnitsSold,
    rotation: vp.rotation,
  }));

  // ─── Build economics from velocity report (which already has economics cross) ───
  const economicsInputs: ReplenishmentEconomicsInput[] = velocityReport.products
    .filter((vp) => vp.hasEconomicsData && vp.marginHealth !== null)
    .map((vp) => ({
      productId: vp.productId,
      marginHealth: vp.marginHealth!,
      contributionPerUnit: vp.contributionPerUnit ?? 0,
    }));

  // ─── Build provider inputs from mirrors ───
  const providerInputs: ReplenishmentProviderInput[] = [];
  for (const m of mirrors) {
    if (!m.internalProductId) continue;
    providerInputs.push({
      productId: m.internalProductId,
      providerName: m.providerProduct.provider.name,
      providerStock: m.providerProduct.stock,
      providerLeadTime: m.providerProduct.leadTime,
      providerLeadTimeMinDays: m.providerProduct.leadTimeMinDays,
      providerLeadTimeMaxDays: m.providerProduct.leadTimeMaxDays,
    });
  }

  return calculateReplenishmentReport(stockInputs, velocityInputs, economicsInputs, providerInputs);
}
