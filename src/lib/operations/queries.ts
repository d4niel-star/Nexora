// Daily Operations Center v1
// Lightweight query layer. Uses count/aggregate only: no heavy joins.
// Every signal is derived from real persisted state.

import { getCurrentStore } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import type { OperationalItem, OperationsCenterData, OpSeverity, OpsKpis } from "@/types/operations";

const LOW_STOCK_THRESHOLD = 10;

export async function getOperationsCenterData(): Promise<OperationsCenterData> {
  const store = await getCurrentStore();

  if (!store) {
    return {
      items: [],
      kpis: {
        ordersToProcess: 0,
        totalRevenue: 0,
        productsPublished: 0,
        totalProducts: 0,
        inventoryAlerts: 0,
        productsWithoutCost: 0,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  const sid = store.id;

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
    sourcingPendingImports,
    sourcingFailedImports,
    aiRecommendations,
    aiDrafts,
  ] = await Promise.all([
    prisma.order.count({
      where: {
        storeId: sid,
        paymentStatus: { in: ["approved", "paid"] },
        shippingStatus: "unfulfilled",
        status: { notIn: ["cancelled", "refunded"] },
      },
    }),
    prisma.order.count({
      where: {
        storeId: sid,
        status: "new",
        paymentStatus: { in: ["pending", "in_process"] },
      },
    }),
    prisma.order.aggregate({
      where: {
        storeId: sid,
        paymentStatus: { in: ["approved", "paid"] },
        status: { notIn: ["cancelled", "refunded"] },
      },
      _sum: { total: true },
    }),
    prisma.product.count({ where: { storeId: sid } }),
    prisma.product.count({ where: { storeId: sid, isPublished: true } }),
    prisma.product.count({ where: { storeId: sid, OR: [{ cost: null }, { cost: 0 }] } }),
    prisma.product.count({ where: { storeId: sid, status: "draft" } }),
    prisma.productVariant.count({
      where: {
        product: { storeId: sid, isPublished: true },
        trackInventory: true,
        stock: { lte: 0 },
      },
    }),
    prisma.productVariant.count({
      where: {
        product: { storeId: sid, isPublished: true },
        trackInventory: true,
        stock: { gt: 0, lte: LOW_STOCK_THRESHOLD },
      },
    }),
    prisma.catalogMirrorProduct.count({
      where: {
        storeId: sid,
        importStatus: "imported",
        internalProduct: { status: "draft" },
      },
    }),
    prisma.catalogMirrorProduct.count({
      where: { storeId: sid, importStatus: "failed" },
    }),
    prisma.adRecommendation.count({
      where: { storeId: sid, dismissedAt: null },
    }),
    prisma.adCampaignDraft.count({
      where: { storeId: sid, status: "draft" },
    }),
  ]);

  const items: OperationalItem[] = [];

  if (ordersPaidUnfulfilled > 0) {
    items.push({
      id: "ops-fulfillment",
      severity: "critical",
      category: "orders",
      title: `${ordersPaidUnfulfilled} pedido${ordersPaidUnfulfilled !== 1 ? "s" : ""} pagado${ordersPaidUnfulfilled !== 1 ? "s" : ""} sin despachar`,
      description: "Hay pagos confirmados esperando preparacion y envio.",
      metric: `${ordersPaidUnfulfilled}`,
      href: "/admin/orders",
      actionLabel: "Ver pedidos",
    });
  }

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

  if (ordersNewPending > 0) {
    items.push({
      id: "ops-pending-payment",
      severity: "high",
      category: "orders",
      title: `${ordersNewPending} pedido${ordersNewPending !== 1 ? "s" : ""} con pago pendiente`,
      description: "Pedidos nuevos esperando confirmacion de pago.",
      metric: `${ordersNewPending}`,
      href: "/admin/orders",
      actionLabel: "Ver pedidos",
    });
  }

  if (productsNoCost > 0) {
    items.push({
      id: "catalog-no-cost",
      severity: "high",
      category: "margin",
      title: `${productsNoCost} producto${productsNoCost !== 1 ? "s" : ""} sin costo cargado`,
      description: `No se puede calcular margen real para el ${totalProducts > 0 ? Math.round((productsNoCost / totalProducts) * 100) : 0}% del catalogo.`,
      metric: `${productsNoCost}/${totalProducts}`,
      href: "/admin/catalog",
      actionLabel: "Completar costos",
    });
  }

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

  if (sourcingFailedImports > 0) {
    items.push({
      id: "sourcing-failed",
      severity: "high",
      category: "sourcing",
      title: `${sourcingFailedImports} importacion${sourcingFailedImports !== 1 ? "es" : ""} fallida${sourcingFailedImports !== 1 ? "s" : ""}`,
      description: "Productos de proveedor que no se pudieron importar al catalogo.",
      metric: `${sourcingFailedImports}`,
      href: "/admin/sourcing",
      actionLabel: "Revisar importaciones",
    });
  }

  if (sourcingPendingImports > 0) {
    items.push({
      id: "sourcing-review",
      severity: "normal",
      category: "sourcing",
      title: `${sourcingPendingImports} producto${sourcingPendingImports !== 1 ? "s" : ""} importado${sourcingPendingImports !== 1 ? "s" : ""} en borrador`,
      description: "Productos traidos de proveedor listos para revisar y publicar.",
      metric: `${sourcingPendingImports}`,
      href: "/admin/sourcing",
      actionLabel: "Revisar productos",
    });
  }

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
      actionLabel: "Revisar catalogo",
    });
  }

  if (aiRecommendations > 0) {
    items.push({
      id: "ai-recos",
      severity: "normal",
      category: "ai",
      title: `${aiRecommendations} recomendacion${aiRecommendations !== 1 ? "es" : ""} de IA lista${aiRecommendations !== 1 ? "s" : ""}`,
      description: "Nexora AI genero sugerencias de campana listas para revision.",
      metric: `${aiRecommendations}`,
      href: "/admin/ads",
      actionLabel: "Ver recomendaciones",
    });
  }

  if (aiDrafts > 0) {
    items.push({
      id: "ai-drafts",
      severity: "normal",
      category: "ai",
      title: `${aiDrafts} borrador${aiDrafts !== 1 ? "es" : ""} de campana pendiente${aiDrafts !== 1 ? "s" : ""}`,
      description: "Campanas pre-armadas por IA esperando aprobacion.",
      metric: `${aiDrafts}`,
      href: "/admin/ads",
      actionLabel: "Revisar borradores",
    });
  }

  items.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  const kpis: OpsKpis = {
    // Paid-unfulfilled only. Pending-payment orders are surfaced as a separate
    // operational item (ops-pending-payment) but never mixed into executive KPIs.
    ordersToProcess: ordersPaidUnfulfilled,
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
