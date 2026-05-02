// ─── Sourcing Intelligence v1 ───
// Analyzes all provider products and catalog mirrors to produce
// actionable signals about what to import, what to review, and what's at risk.
// All signals are derived from real persisted state. No fabrication.

"use server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import { LEGACY_SEEDED_PROVIDER_CODES } from "./constants";
import type {
  ImportableProduct,
  SourcingIntelData,
  SourcingIntelSummary,
  SourcingReadiness,
} from "@/types/sourcing-intel";

export async function getSourcingIntelData(): Promise<SourcingIntelData> {
  const store = await getCurrentStore();

  if (!store) {
    return {
      products: [],
      summary: { totalAvailable: 0, readyToImport: 0, needsReview: 0, atRisk: 0, alreadyImported: 0, noData: 0, importedInDraft: 0, syncJobsFailed: 0, mirrorsOutOfSync: 0 },
      generatedAt: new Date().toISOString(),
    };
  }

  const sid = store.id;

  // ─── Fetch all data in parallel ───
  const [
    providerProducts,
    mirrors,
    connections,
    syncJobsFailed,
    mirrorsOutOfSync,
  ] = await Promise.all([
    // All provider products from connected providers
    prisma.providerProduct.findMany({
      where: {
        provider: {
          code: { notIn: LEGACY_SEEDED_PROVIDER_CODES },
          connections: { some: { storeId: sid, status: "active" } },
        },
      },
      include: {
        provider: {
          include: {
            connections: {
              where: { storeId: sid },
              select: { id: true, status: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    // All catalog mirrors for this store (to know what's already imported)
    prisma.catalogMirrorProduct.findMany({
      where: {
        storeId: sid,
        providerConnection: {
          provider: { code: { notIn: LEGACY_SEEDED_PROVIDER_CODES } },
        },
      },
      select: {
        providerProductId: true,
        importStatus: true,
        syncStatus: true,
        internalProductId: true,
        internalProduct: {
          select: { id: true, status: true, price: true, cost: true },
        },
      },
    }),
    // Provider connections for context
    prisma.providerConnection.findMany({
      where: {
        storeId: sid,
        provider: { code: { notIn: LEGACY_SEEDED_PROVIDER_CODES } },
      },
      select: { id: true, providerId: true, status: true },
    }),
    // Failed sync jobs
    prisma.providerSyncJob.count({
      where: {
        storeId: sid,
        status: "failed",
        providerConnection: {
          provider: { code: { notIn: LEGACY_SEEDED_PROVIDER_CODES } },
        },
      },
    }),
    // Out of sync mirrors
    prisma.catalogMirrorProduct.count({
      where: {
        storeId: sid,
        syncStatus: "out_of_sync",
        providerConnection: {
          provider: { code: { notIn: LEGACY_SEEDED_PROVIDER_CODES } },
        },
      },
    }),
  ]);

  // ─── Build mirror lookup ───
  const mirrorByPP = new Map<string, (typeof mirrors)[0]>();
  for (const m of mirrors) {
    mirrorByPP.set(m.providerProductId, m);
  }

  // ─── Analyze each provider product ───
  const products: ImportableProduct[] = [];

  for (const pp of providerProducts) {
    const mirror = mirrorByPP.get(pp.id);
    const conn = pp.provider.connections[0];
    const connectionId = conn?.id ?? "";

    const signals: string[] = [];
    let readiness: SourcingReadiness = "ready";
    let estimatedMarginPercent: number | null = null;

    const hasCost = pp.cost > 0;
    const hasStock = pp.stock > 0;
    const hasSuggestedPrice = pp.suggestedPrice !== null && pp.suggestedPrice > 0;

    // ─── Compute estimated margin if data allows ───
    if (hasCost && hasSuggestedPrice) {
      estimatedMarginPercent = Math.round(((pp.suggestedPrice! - pp.cost) / pp.suggestedPrice!) * 100);
    }

    // ─── Already imported? ───
    if (mirror) {
      // If the internal product no longer exists, this mirror is orphaned.
      // Clean it up asynchronously and treat the product as not imported.
      if (!mirror.internalProduct) {
        // Fire-and-forget: delete the orphaned mirror record
        prisma.catalogMirrorProduct.deleteMany({
          where: { storeId: sid, providerProductId: pp.id },
        }).catch(() => { /* best effort */ });

        // Fall through to classify as non-imported product
      } else {
        readiness = "imported";

        if (mirror.importStatus === "failed") {
          readiness = "risk";
          signals.push("Importación fallida");
        } else if (mirror.syncStatus === "out_of_sync") {
          signals.push("Espejo desincronizado");
        }

        if (mirror.internalProduct?.status === "draft") {
          signals.push("Producto interno en borrador");
        }

        products.push({
          providerProductId: pp.id,
          title: pp.title,
          category: pp.category || "Sin categoría",
          cost: pp.cost,
          suggestedPrice: pp.suggestedPrice,
          stock: pp.stock,
          providerName: pp.provider.name,
          providerCode: pp.provider.code,
          connectionId,
          readiness,
          signals,
          estimatedMarginPercent,
          alreadyImported: true,
          internalProductId: mirror.internalProductId,
          internalStatus: mirror.internalProduct?.status ?? null,
        });
        continue;
      }
    }

    // ─── Not imported: classify readiness ───

    // Risk signals
    if (!hasCost) {
      signals.push("Sin costo declarado");
      readiness = "no_data";
    }
    if (!hasStock) {
      signals.push("Sin stock disponible");
      readiness = readiness === "no_data" ? "no_data" : "risk";
    }
    if (estimatedMarginPercent !== null && estimatedMarginPercent < 10) {
      signals.push(`Margen estimado bajo (${estimatedMarginPercent}%)`);
      if (readiness === "ready") readiness = "review";
    }

    // Review signals
    if (!hasSuggestedPrice && hasCost && hasStock) {
      signals.push("Sin precio sugerido");
      if (readiness === "ready") readiness = "review";
    }

    // Provider connection health
    if (conn && conn.status === "error") {
      signals.push("Proveedor con error de conexión");
      readiness = "risk";
    }

    // If no issues found and has cost + stock, it's ready
    if (readiness === "ready" && !hasCost) {
      readiness = "no_data";
    }

    products.push({
      providerProductId: pp.id,
      title: pp.title,
      category: pp.category || "Sin categoría",
      cost: pp.cost,
      suggestedPrice: pp.suggestedPrice,
      stock: pp.stock,
      providerName: pp.provider.name,
      providerCode: pp.provider.code,
      connectionId,
      readiness,
      signals,
      estimatedMarginPercent,
      alreadyImported: false,
      internalProductId: null,
      internalStatus: null,
    });
  }

  // ─── Sort: risk first, then review, ready, no_data, imported last ───
  products.sort((a, b) => readinessRank(a.readiness) - readinessRank(b.readiness));

  // ─── Summary ───
  const summary: SourcingIntelSummary = {
    totalAvailable: products.length,
    readyToImport: products.filter((p) => p.readiness === "ready").length,
    needsReview: products.filter((p) => p.readiness === "review").length,
    atRisk: products.filter((p) => p.readiness === "risk").length,
    alreadyImported: products.filter((p) => p.readiness === "imported").length,
    noData: products.filter((p) => p.readiness === "no_data").length,
    importedInDraft: mirrors.filter((m) => m.internalProduct?.status === "draft").length,
    syncJobsFailed,
    mirrorsOutOfSync,
  };

  return {
    products,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

function readinessRank(r: SourcingReadiness): number {
  switch (r) {
    case "risk": return 1;
    case "review": return 2;
    case "ready": return 3;
    case "no_data": return 4;
    case "imported": return 5;
  }
}
