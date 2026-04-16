// ─── Provider Score + Import Score Query Layer ───
// Fetches all observable signals from DB and feeds the scoring engine.
// No fabrication. All data from real Prisma queries.

"use server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import {
  calculateProviderScoreReport,
  type ProviderInput,
  type ImportInput,
} from "./scoring";
import type { ProviderTier, ProviderScoreReport } from "@/types/provider-score";

export async function getProviderScoreReport(): Promise<ProviderScoreReport> {
  const store = await getCurrentStore();
  if (!store) {
    return {
      providers: [],
      imports: [],
      summary: {
        totalProviders: 0, strong: 0, stable: 0, weak: 0, critical: 0, noData: 0,
        highPriorityImports: 0, mediumPriorityImports: 0, lowPriorityImports: 0, skipImports: 0,
      },
      generatedAt: new Date().toISOString(),
      engineVersion: "v1",
    };
  }

  const sid = store.id;

  // ─── Parallel fetch all provider-related data ───
  const [
    connections,
    syncJobs,
    mirrors,
    providerProducts,
    totalCatalogProducts,
    channelListings,
  ] = await Promise.all([
    prisma.providerConnection.findMany({
      where: { storeId: sid },
      include: {
        provider: {
          select: { id: true, name: true, code: true },
        },
      },
    }),
    prisma.providerSyncJob.findMany({
      where: { storeId: sid },
      select: {
        providerConnectionId: true,
        status: true,
        completedAt: true,
        failedAt: true,
      },
    }),
    prisma.catalogMirrorProduct.findMany({
      where: { storeId: sid },
      select: {
        providerConnectionId: true,
        providerProductId: true,
        syncStatus: true,
        importStatus: true,
        internalProductId: true,
        internalProduct: {
          select: { id: true, status: true, isPublished: true },
        },
      },
    }),
    prisma.providerProduct.findMany({
      where: {
        provider: {
          connections: { some: { storeId: sid } },
        },
      },
      select: {
        id: true,
        providerId: true,
        title: true,
        category: true,
        cost: true,
        suggestedPrice: true,
        stock: true,
      },
    }),
    prisma.product.count({ where: { storeId: sid, isPublished: true } }),
    prisma.channelListing.findMany({
      where: { storeId: sid, status: "published" },
      select: { productId: true },
    }),
  ]);

  // ─── Build lookups ───
  const mirrorsByConn = new Map<string, typeof mirrors>();
  const mirrorByPP = new Map<string, (typeof mirrors)[0]>();
  for (const m of mirrors) {
    const arr = mirrorsByConn.get(m.providerConnectionId) || [];
    arr.push(m);
    mirrorsByConn.set(m.providerConnectionId, arr);
    mirrorByPP.set(m.providerProductId, m);
  }

  const jobsByConn = new Map<string, typeof syncJobs>();
  for (const j of syncJobs) {
    const arr = jobsByConn.get(j.providerConnectionId) || [];
    arr.push(j);
    jobsByConn.set(j.providerConnectionId, arr);
  }

  const ppByProvider = new Map<string, typeof providerProducts>();
  for (const pp of providerProducts) {
    const arr = ppByProvider.get(pp.providerId) || [];
    arr.push(pp);
    ppByProvider.set(pp.providerId, arr);
  }

  const publishedProductIds = new Set(channelListings.map((l: { productId: string }) => l.productId));

  // ─── Build provider inputs ───
  const providerInputs: ProviderInput[] = [];
  const providerTierMap = new Map<string, ProviderTier>(); // for import scoring

  for (const conn of connections) {
    const connMirrors = mirrorsByConn.get(conn.id) || [];
    const connJobs = jobsByConn.get(conn.id) || [];
    const pProducts = ppByProvider.get(conn.providerId) || [];

    const productsWithCost = pProducts.filter((p: { cost: number }) => p.cost > 0).length;
    const productsWithStock = pProducts.filter((p: { stock: number }) => p.stock > 0).length;
    const importedMirrors = connMirrors.filter((m: { importStatus: string }) => m.importStatus === "imported");
    const importedInDraft = importedMirrors.filter((m: { internalProduct: { status: string } | null }) => m.internalProduct?.status === "draft").length;
    const importedPublished = importedMirrors.filter((m: { internalProduct: { isPublished: boolean } | null }) => m.internalProduct?.isPublished).length;
    const mirrorsOutOfSync = connMirrors.filter((m: { syncStatus: string }) => m.syncStatus === "out_of_sync").length;
    const syncJobsFailed = connJobs.filter((j: { status: string }) => j.status === "failed").length;
    const syncJobsCompleted = connJobs.filter((j: { status: string }) => j.status === "completed").length;

    // Average estimated margin across products with cost + suggestedPrice
    const marginsComputable = pProducts.filter((p: { cost: number; suggestedPrice: number | null }) => p.cost > 0 && p.suggestedPrice !== null && p.suggestedPrice > 0);
    const avgEstimatedMargin = marginsComputable.length > 0
      ? Math.round(marginsComputable.reduce((sum: number, p: { cost: number; suggestedPrice: number | null }) => sum + ((p.suggestedPrice! - p.cost) / p.suggestedPrice!) * 100, 0) / marginsComputable.length)
      : null;

    const input: ProviderInput = {
      providerId: conn.providerId,
      providerName: conn.provider.name,
      providerCode: conn.provider.code,
      connectionId: conn.id,
      connectionStatus: conn.status,
      lastSyncedAt: conn.lastSyncedAt,
      totalProducts: pProducts.length,
      productsWithCost,
      productsWithStock,
      productsImported: importedMirrors.length,
      importedInDraft,
      importedPublished,
      mirrorsOutOfSync,
      syncJobsTotal: connJobs.length,
      syncJobsFailed,
      syncJobsCompleted,
      totalCatalogProducts: totalCatalogProducts,
      avgEstimatedMargin,
    };

    providerInputs.push(input);
  }

  // ─── First pass: score providers to get tier map ───
  // We need tiers before scoring imports
  const { scoreProvider } = await import("./scoring");
  for (const pi of providerInputs) {
    const scored = scoreProvider(pi);
    providerTierMap.set(pi.providerId, scored.tier);
  }

  // ─── Build import inputs ───
  const importInputs: ImportInput[] = [];

  for (const pp of providerProducts) {
    const mirror = mirrorByPP.get(pp.id);
    const conn = connections.find((c: { providerId: string }) => c.providerId === pp.providerId);
    const internalProductId = mirror?.internalProductId;

    const hasCost = pp.cost > 0;
    const hasSuggestedPrice = pp.suggestedPrice !== null && pp.suggestedPrice > 0;
    const estimatedMarginPercent = hasCost && hasSuggestedPrice
      ? Math.round(((pp.suggestedPrice! - pp.cost) / pp.suggestedPrice!) * 100)
      : null;

    importInputs.push({
      providerProductId: pp.id,
      title: pp.title,
      category: pp.category || "Sin categoría",
      providerName: conn?.provider.name || "Desconocido",
      providerCode: conn?.provider.code || "",
      cost: pp.cost,
      suggestedPrice: pp.suggestedPrice,
      stock: pp.stock,
      alreadyImported: !!mirror,
      internalStatus: mirror?.internalProduct?.status ?? null,
      providerConnectionStatus: conn?.status || "active",
      providerTier: providerTierMap.get(pp.providerId) || "no_data",
      estimatedMarginPercent,
      hasChannelListing: internalProductId ? publishedProductIds.has(internalProductId) : false,
      hasAdDraft: false, // TODO: Schema v2 has AdCampaignProduct join table — can query per product in future
    });
  }

  return calculateProviderScoreReport(providerInputs, importInputs);
}
