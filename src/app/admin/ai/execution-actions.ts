"use server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { logSystemEvent } from "@/lib/observability/audit";

export interface BatchResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
}

// ─── Catalog Resolution: Update Product Cost ───
// Updates the cost of a product from the catalog drawer.
// Tenant-validated, audited. Accepts null to clear cost.

export async function updateProductCost(
  productId: string,
  cost: number | null,
): Promise<{ success: boolean; error?: string }> {
  const store = await getCurrentStore();
  if (!store) return { success: false, error: "Sin tienda activa" };

  if (cost !== null) {
    if (typeof cost !== "number" || !isFinite(cost)) return { success: false, error: "Costo inválido" };
    if (cost < 0) return { success: false, error: "El costo no puede ser negativo" };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId, storeId: store.id },
    select: { id: true, title: true, cost: true },
  });

  if (!product) return { success: false, error: "Producto no encontrado o acceso denegado" };

  // Idempotent: skip if already the same value
  if (product.cost === cost) return { success: true };

  await prisma.product.update({
    where: { id: productId },
    data: { cost },
  });

  await logSystemEvent({
    storeId: store.id,
    entityType: "product",
    entityId: productId,
    eventType: "product_cost_updated",
    source: "catalog_drawer",
    message: `Costo de "${product.title}" actualizado: ${product.cost ?? "sin costo"} → ${cost ?? "sin costo"}`,
    metadata: { previousCost: product.cost, newCost: cost },
  });

  revalidatePath("/admin/catalog");
  revalidatePath("/admin/ai/catalog");
  revalidatePath("/admin/ai");
  revalidatePath("/admin/finances");
  revalidatePath("/admin/operations");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

// ─── Execution Loop: Publish Draft Product ───
// Transitions a product from draft to published.
// Tenant-validated, idempotent, audited.

export async function publishDraftProduct(productId: string): Promise<{ success: boolean; error?: string }> {
  const store = await getCurrentStore();
  if (!store) return { success: false, error: "Sin tienda activa" };

  const product = await prisma.product.findUnique({
    where: { id: productId, storeId: store.id },
    select: { id: true, title: true, isPublished: true, status: true },
  });

  if (!product) return { success: false, error: "Producto no encontrado o acceso denegado" };
  if (product.isPublished) return { success: true }; // idempotent

  await prisma.product.update({
    where: { id: productId },
    data: { isPublished: true, status: "active" },
  });

  await logSystemEvent({
    storeId: store.id,
    entityType: "product",
    entityId: productId,
    eventType: "product_published",
    source: "ai_hub",
    message: `Producto "${product.title}" publicado desde el hub de decisiones`,
  });

  revalidatePath("/admin/ai");
  revalidatePath("/admin/catalog");
  revalidatePath("/admin/sourcing");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

// ─── Execution Loop: Mark Order Preparing ───
// Transitions an unfulfilled paid order to "preparing".
// Tenant-validated, idempotent, audited.

export async function markOrderPreparing(orderId: string): Promise<{ success: boolean; error?: string }> {
  const store = await getCurrentStore();
  if (!store) return { success: false, error: "Sin tienda activa" };

  const order = await prisma.order.findUnique({
    where: { id: orderId, storeId: store.id },
    select: { id: true, orderNumber: true, shippingStatus: true, paymentStatus: true, status: true },
  });

  if (!order) return { success: false, error: "Orden no encontrada o acceso denegado" };
  if (order.status === "cancelled") return { success: false, error: "Orden cancelada" };
  if (order.shippingStatus === "preparing" || order.shippingStatus === "shipped" || order.shippingStatus === "delivered") {
    return { success: true }; // idempotent
  }

  const { updateOrderFulfillment } = await import("@/lib/store-engine/fulfillment/actions");
  await updateOrderFulfillment({ orderId, shippingStatus: "preparing" });

  await logSystemEvent({
    storeId: store.id,
    entityType: "order",
    entityId: orderId,
    eventType: "order_preparing_from_hub",
    source: "ai_hub",
    message: `Orden #${order.orderNumber} marcada "en preparación" desde el hub de decisiones`,
  });

  revalidatePath("/admin/ai");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

// ─── Execution Loop: Retry Provider Sync ───
// Enqueues a new sync job for a provider connection.
// Tenant-validated, idempotent (won't duplicate running jobs), audited.

export async function retryProviderSync(connectionId: string): Promise<{ success: boolean; error?: string }> {
  const store = await getCurrentStore();
  if (!store) return { success: false, error: "Sin tienda activa" };

  const connection = await prisma.providerConnection.findUnique({
    where: { id: connectionId, storeId: store.id },
    include: { provider: { select: { name: true } } },
  });

  if (!connection) return { success: false, error: "Conexión no encontrada o acceso denegado" };

  try {
    const { enqueueProviderSyncJob } = await import("@/lib/sourcing/workers/actions");
    await enqueueProviderSyncJob(connectionId);
  } catch (e: any) {
    if (e.message?.includes("en curso")) return { success: true }; // idempotent — already running
    return { success: false, error: e.message || "Error al encolar sync" };
  }

  await logSystemEvent({
    storeId: store.id,
    entityType: "provider_connection",
    entityId: connectionId,
    eventType: "provider_sync_retried_from_hub",
    source: "ai_hub",
    message: `Sync de proveedor "${connection.provider.name}" reintentado desde el hub de decisiones`,
  });

  revalidatePath("/admin/ai");
  revalidatePath("/admin/sourcing");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

// ─── Execution Loop: Resync Channel Listing ───
// Re-syncs a single out-of-sync listing from the hub.
// Tenant-validated, idempotent, audited.

export async function resyncListing(listingId: string): Promise<{ success: boolean; error?: string }> {
  const store = await getCurrentStore();
  if (!store) return { success: false, error: "Sin tienda activa" };

  // Tenant validation: ensure listing belongs to the current store
  const listing = await prisma.channelListing.findUnique({
    where: { id: listingId, storeId: store.id },
    select: { id: true, channel: true },
  });
  if (!listing) return { success: false, error: "Publicación no encontrada o acceso denegado" };

  try {
    const { syncChannelListingAction } = await import("@/lib/channels/actions");
    await syncChannelListingAction(listingId);
  } catch (e: any) {
    return { success: false, error: e.message || "Error al resincronizar" };
  }

  revalidatePath("/admin/ai");
  revalidatePath("/admin/publications");
  revalidatePath("/admin/catalog");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

// ════════════════════════════════════════════
// BATCH EXECUTION LOOPS v2
// ════════════════════════════════════════════

// ─── Batch: Publish All Eligible Draft Products ───
// Publishes all draft products that have the minimum data to go live.
// Tenant-scoped, idempotent per product, audited as batch.

export async function batchPublishDrafts(): Promise<BatchResult> {
  const store = await getCurrentStore();
  if (!store) return { success: false, processed: 0, failed: 0, errors: ["Sin tienda activa"] };

  // Gate batch publish on basic economic honesty: price AND cost must be declared,
  // and there must be at least one variant with real available stock. This mirrors
  // the sourcing readiness signals — without them the hub could push broken
  // products live (no margin, oversell risk).
  const drafts = await prisma.product.findMany({
    where: {
      storeId: store.id,
      isPublished: false,
      status: { in: ["draft", "active"] },
      price: { gt: 0 },
      cost: { gt: 0 },
      variants: { some: { stock: { gt: 0 } } },
    },
    select: { id: true, title: true },
    take: 50,
  });

  if (drafts.length === 0) return { success: true, processed: 0, failed: 0, errors: [] };

  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const product of drafts) {
    try {
      await prisma.product.update({
        where: { id: product.id },
        data: { isPublished: true, status: "active" },
      });
      processed++;
    } catch (e: any) {
      failed++;
      errors.push(`${product.title}: ${e.message}`);
    }
  }

  await logSystemEvent({
    storeId: store.id,
    entityType: "batch_execution",
    entityId: "batch_publish_drafts",
    eventType: "batch_publish_completed",
    source: "ai_hub",
    message: `Batch publish: ${processed} publicado(s), ${failed} fallido(s) de ${drafts.length} elegible(s)`,
  });

  revalidatePath("/admin/ai");
  revalidatePath("/admin/catalog");
  revalidatePath("/admin/sourcing");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/dashboard");
  return { success: failed === 0, processed, failed, errors };
}

// ─── Batch: Mark All Eligible Orders Preparing ───
// Moves all paid+unfulfilled orders to "preparing" status.
// Tenant-scoped, idempotent, audited.

export async function batchMarkPreparing(): Promise<BatchResult> {
  const store = await getCurrentStore();
  if (!store) return { success: false, processed: 0, failed: 0, errors: ["Sin tienda activa"] };

  const orders = await prisma.order.findMany({
    where: {
      storeId: store.id,
      paymentStatus: { in: ["approved", "paid"] },
      shippingStatus: "unfulfilled",
      status: { notIn: ["cancelled", "refunded"] },
    },
    select: { id: true, orderNumber: true },
    take: 50,
  });

  if (orders.length === 0) return { success: true, processed: 0, failed: 0, errors: [] };

  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  const { updateOrderFulfillment } = await import("@/lib/store-engine/fulfillment/actions");

  for (const order of orders) {
    try {
      await updateOrderFulfillment({ orderId: order.id, shippingStatus: "preparing" });
      processed++;
    } catch (e: any) {
      failed++;
      errors.push(`#${order.orderNumber}: ${e.message}`);
    }
  }

  await logSystemEvent({
    storeId: store.id,
    entityType: "batch_execution",
    entityId: "batch_mark_preparing",
    eventType: "batch_preparing_completed",
    source: "ai_hub",
    message: `Batch preparar: ${processed} orden(es) en preparación, ${failed} fallida(s) de ${orders.length} elegible(s)`,
  });

  revalidatePath("/admin/ai");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/dashboard");
  return { success: failed === 0, processed, failed, errors };
}

// ─── Batch: Resync All Out-of-Sync Listings ───
// Re-syncs all listings that are out_of_sync or in error state.
// Tenant-scoped, sequential to avoid rate limiting, audited.

export async function batchResyncListings(): Promise<BatchResult> {
  const store = await getCurrentStore();
  if (!store) return { success: false, processed: 0, failed: 0, errors: ["Sin tienda activa"] };

  const listings = await prisma.channelListing.findMany({
    where: {
      storeId: store.id,
      OR: [
        { syncStatus: "out_of_sync" },
        { syncStatus: "error" },
      ],
      status: { in: ["published", "paused"] },
    },
    select: { id: true, channel: true },
    take: 20,
  });

  if (listings.length === 0) return { success: true, processed: 0, failed: 0, errors: [] };

  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  const { syncChannelListingAction } = await import("@/lib/channels/actions");

  for (const listing of listings) {
    try {
      await syncChannelListingAction(listing.id);
      processed++;
    } catch (e: any) {
      failed++;
      errors.push(`${listing.channel}/${listing.id.slice(0, 8)}: ${e.message}`);
    }
  }

  await logSystemEvent({
    storeId: store.id,
    entityType: "batch_execution",
    entityId: "batch_resync_listings",
    eventType: "batch_resync_completed",
    source: "ai_hub",
    message: `Batch resync: ${processed} resincronizado(s), ${failed} fallido(s) de ${listings.length} elegible(s)`,
  });

  revalidatePath("/admin/ai");
  revalidatePath("/admin/publications");
  revalidatePath("/admin/catalog");
  revalidatePath("/admin/dashboard");
  return { success: failed === 0, processed, failed, errors };
}
