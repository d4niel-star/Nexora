// ─── Daily Operations Center v1 ───
// Lightweight query layer. Uses count/aggregate only — no heavy joins.
// Every signal is derived from real persisted state.

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import type { OperationalItem, OpsKpis, OperationsCenterData, OpSeverity } from "@/types/operations";

const LOW_STOCK_THRESHOLD = 10;

export async function getOperationsCenterData(): Promise<OperationsCenterData> {
  const store = await getCurrentStore();

  if (!store) {
    return {
      items: [],
      kpis: { ordersToProcess: 0, totalRevenue: 0, productsPublished: 0, totalProducts: 0, inventoryAlerts: 0, productsWithoutCost: 0 },
      generatedAt: new Date().toISOString(),
    };
  }

  const sid = store.id;

  // ─── All queries in parallel (lightweight counts) ───
  const [
    ordersPaidUnfulfilled,
    ordersNewPending,
    revenueAgg,
    totalProducts,
    publishedProducts,
    productsNoCost,
    productsDraft,
    outOfStockVariants,
    lowStockVariants,
    channelErrors,
    sourcingPendingImports,
    sourcingFailedImports,
    aiRecommendations,
    aiDrafts,
  ] = await Promise.all([
    // Orders: paid but not shipped → critical
    prisma.order.count({
      where: {
        storeId: sid,
        paymentStatus: { in: ["approved", "paid"] },
        shippingStatus: "unfulfilled",
        status: { notIn: ["cancelled", "refunded"] },
      },
    }),
    // Orders: new with pending payment → high
    prisma.order.count({
      where: {
        storeId: sid,
        status: "new",
        paymentStatus: { in: ["pending", "in_process"] },
      },
    }),
    // Revenue aggregate (only collected orders)
    prisma.order.aggregate({
      where: { storeId: sid, paymentStatus: { in: ["approved", "paid"] }, status: { notIn: ["cancelled", "refunded"] } },
      _sum: { total: true },
    }),
    // Products total
    prisma.product.count({ where: { storeId: sid } }),
    // Products published
    prisma.product.count({ where: { storeId: sid, isPublished: true } }),
    // Products without cost
    prisma.product.count({ where: { storeId: sid, OR: [{ cost: null }, { cost: 0 }] } }),
    // Products in draft status
    prisma.product.count({ where: { storeId: sid, status: "draft" } }),
    // Inventory: published products with out-of-stock variants
    prisma.productVariant.count({
      where: {
        product: { storeId: sid, isPublished: true },
        trackInventory: true,
        stock: { lte: 0 },
      },
    }),
    // Inventory: published products with low stock variants
    prisma.productVariant.count({
      where: {
        product: { storeId: sid, isPublished: true },
        trackInventory: true,
        stock: { gt: 0, lte: LOW_STOCK_THRESHOLD },
      },
    }),
    // Channel connections with issues (status-based OR expired token)
    prisma.channelConnection.findMany({
      where: {
        storeId: sid,
        OR: [
          { status: { in: ["error", "expired", "reconnect_required", "invalid"] } },
          { tokenExpiresAt: { lt: new Date() } },
        ],
      },
      select: { id: true, channel: true, status: true, lastError: true, tokenExpiresAt: true },
    }),
    // Sourcing: imported products still in draft
    prisma.catalogMirrorProduct.count({
      where: {
        storeId: sid,
        importStatus: "imported",
        internalProduct: { status: "draft" },
      },
    }),
    // Sourcing: failed imports
    prisma.catalogMirrorProduct.count({
      where: { storeId: sid, importStatus: "failed" },
    }),
    // AI: undismissed recommendations
    prisma.adRecommendation.count({
      where: { storeId: sid, dismissedAt: null },
    }),
    // AI: draft campaigns pending review
    prisma.adCampaignDraft.count({
      where: { storeId: sid, status: "draft" },
    }),
  ]);

  // ─── Build operational items ───
  const items: OperationalItem[] = [];

  // CRITICAL: Paid orders waiting fulfillment
  if (ordersPaidUnfulfilled > 0) {
    items.push({
      id: "ops-fulfillment",
      severity: "critical",
      category: "orders",
      title: `${ordersPaidUnfulfilled} pedido${ordersPaidUnfulfilled !== 1 ? "s" : ""} pagado${ordersPaidUnfulfilled !== 1 ? "s" : ""} sin despachar`,
      description: "Hay pagos confirmados esperando preparación y envío.",
      metric: `${ordersPaidUnfulfilled}`,
      href: "/admin/orders",
      actionLabel: "Ver pedidos",
    });
  }

  // CRITICAL: Published products out of stock
  if (outOfStockVariants > 0) {
    items.push({
      id: "inv-out-of-stock",
      severity: "critical",
      category: "inventory",
      title: `${outOfStockVariants} variante${outOfStockVariants !== 1 ? "s" : ""} publicada${outOfStockVariants !== 1 ? "s" : ""} sin stock`,
      description: "Productos activos en tienda con stock agotado. Los clientes no pueden comprar.",
      metric: `${outOfStockVariants}`,
      href: "/admin/inventory",
      actionLabel: "Revisar inventario",
    });
  }

  // CRITICAL: Channel connections broken
  for (const ch of channelErrors) {
    const name = ch.channel === "mercadolibre" ? "Mercado Libre" : ch.channel === "shopify" ? "Shopify" : ch.channel;
    const isTokenExpired = ch.tokenExpiresAt && ch.tokenExpiresAt < new Date();
    const brokenStatus = ["error", "expired", "reconnect_required", "invalid"].includes(ch.status);
    items.push({
      id: `ch-error-${ch.id}`,
      severity: "critical",
      category: "channels",
      title: isTokenExpired && !brokenStatus
        ? `${name}: token vencido`
        : `Conexión ${name} con problemas`,
      description: isTokenExpired && !brokenStatus
        ? "El token OAuth expiró. Requiere renovación para seguir sincronizando."
        : (ch.lastError || `El canal ${name} requiere atención. Estado: ${ch.status}.`),
      href: "/admin/integrations",
      actionLabel: "Revisar salud",
    });
  }

  // HIGH: Orders pending payment
  if (ordersNewPending > 0) {
    items.push({
      id: "ops-pending-payment",
      severity: "high",
      category: "orders",
      title: `${ordersNewPending} pedido${ordersNewPending !== 1 ? "s" : ""} con pago pendiente`,
      description: "Pedidos nuevos esperando confirmación de pago.",
      metric: `${ordersNewPending}`,
      href: "/admin/orders",
      actionLabel: "Ver pedidos",
    });
  }

  // HIGH: Products without cost
  if (productsNoCost > 0) {
    items.push({
      id: "catalog-no-cost",
      severity: "high",
      category: "margin",
      title: `${productsNoCost} producto${productsNoCost !== 1 ? "s" : ""} sin costo cargado`,
      description: `No se puede calcular margen real para el ${totalProducts > 0 ? Math.round((productsNoCost / totalProducts) * 100) : 0}% del catálogo.`,
      metric: `${productsNoCost}/${totalProducts}`,
      href: "/admin/catalog",
      actionLabel: "Completar costos",
    });
  }

  // HIGH: Low stock on published products
  if (lowStockVariants > 0) {
    items.push({
      id: "inv-low-stock",
      severity: "high",
      category: "inventory",
      title: `${lowStockVariants} variante${lowStockVariants !== 1 ? "s" : ""} con stock bajo`,
      description: `Stock por debajo de ${LOW_STOCK_THRESHOLD} unidades en productos publicados.`,
      metric: `${lowStockVariants}`,
      href: "/admin/inventory",
      actionLabel: "Revisar stock",
    });
  }

  // HIGH: Failed sourcing imports
  if (sourcingFailedImports > 0) {
    items.push({
      id: "sourcing-failed",
      severity: "high",
      category: "sourcing",
      title: `${sourcingFailedImports} importación${sourcingFailedImports !== 1 ? "es" : ""} fallida${sourcingFailedImports !== 1 ? "s" : ""}`,
      description: "Productos de proveedor que no se pudieron importar al catálogo.",
      metric: `${sourcingFailedImports}`,
      href: "/admin/sourcing",
      actionLabel: "Revisar importaciones",
    });
  }

  // NORMAL: Sourcing imports pending review (products imported as draft)
  if (sourcingPendingImports > 0) {
    items.push({
      id: "sourcing-review",
      severity: "normal",
      category: "sourcing",
      title: `${sourcingPendingImports} producto${sourcingPendingImports !== 1 ? "s" : ""} importado${sourcingPendingImports !== 1 ? "s" : ""} en borrador`,
      description: "Productos traídos de proveedor listos para revisar y publicar.",
      metric: `${sourcingPendingImports}`,
      href: "/admin/sourcing",
      actionLabel: "Revisar productos",
    });
  }

  // NORMAL: Draft products (not from imports)
  const pureDrafts = productsDraft - sourcingPendingImports;
  if (pureDrafts > 0) {
    items.push({
      id: "catalog-drafts",
      severity: "normal",
      category: "catalog",
      title: `${pureDrafts} producto${pureDrafts !== 1 ? "s" : ""} en borrador`,
      description: "Productos creados pero no publicados en la tienda.",
      metric: `${pureDrafts}`,
      href: "/admin/catalog",
      actionLabel: "Revisar catálogo",
    });
  }

  // NORMAL: AI recommendations ready
  if (aiRecommendations > 0) {
    items.push({
      id: "ai-recos",
      severity: "normal",
      category: "ai",
      title: `${aiRecommendations} recomendación${aiRecommendations !== 1 ? "es" : ""} de IA lista${aiRecommendations !== 1 ? "s" : ""}`,
      description: "Nexora AI generó sugerencias de campaña listas para revisión.",
      metric: `${aiRecommendations}`,
      href: "/admin/ai/ads",
      actionLabel: "Ver recomendaciones",
    });
  }

  // NORMAL: AI campaign drafts
  if (aiDrafts > 0) {
    items.push({
      id: "ai-drafts",
      severity: "normal",
      category: "ai",
      title: `${aiDrafts} borrador${aiDrafts !== 1 ? "es" : ""} de campaña pendiente${aiDrafts !== 1 ? "s" : ""}`,
      description: "Campañas pre-armadas por IA esperando aprobación.",
      metric: `${aiDrafts}`,
      href: "/admin/ai/ads",
      actionLabel: "Revisar borradores",
    });
  }

  // ─── Sort by severity ───
  items.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  const kpis: OpsKpis = {
    ordersToProcess: ordersPaidUnfulfilled + ordersNewPending,
    totalRevenue: revenueAgg._sum.total ?? 0,
    productsPublished: publishedProducts,
    totalProducts,
    inventoryAlerts: outOfStockVariants + lowStockVariants,
    productsWithoutCost: productsNoCost,
  };

  return {
    items,
    kpis,
    generatedAt: new Date().toISOString(),
  };
}

function severityRank(s: OpSeverity): number {
  switch (s) {
    case "critical": return 4;
    case "high": return 3;
    case "normal": return 2;
    case "info": return 1;
  }
}
