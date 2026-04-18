"use server";

import { revalidatePath } from "next/cache";

import { getCurrentStore } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { logSystemEvent } from "@/lib/observability/audit";

export interface BatchResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
}

export async function updateProductCost(
  productId: string,
  cost: number | null,
): Promise<{ success: boolean; error?: string }> {
  const store = await getCurrentStore();
  if (!store) return { success: false, error: "Sin tienda activa" };

  if (cost !== null) {
    if (typeof cost !== "number" || !isFinite(cost)) return { success: false, error: "Costo invalido" };
    if (cost < 0) return { success: false, error: "El costo no puede ser negativo" };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId, storeId: store.id },
    select: { id: true, title: true, cost: true },
  });

  if (!product) return { success: false, error: "Producto no encontrado o acceso denegado" };
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
    message: `Costo de "${product.title}" actualizado: ${product.cost ?? "sin costo"} -> ${cost ?? "sin costo"}`,
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

export async function publishDraftProduct(productId: string): Promise<{ success: boolean; error?: string }> {
  const store = await getCurrentStore();
  if (!store) return { success: false, error: "Sin tienda activa" };

  const product = await prisma.product.findUnique({
    where: { id: productId, storeId: store.id },
    select: { id: true, title: true, isPublished: true },
  });

  if (!product) return { success: false, error: "Producto no encontrado o acceso denegado" };
  if (product.isPublished) return { success: true };

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

export async function markOrderPreparing(orderId: string): Promise<{ success: boolean; error?: string }> {
  const store = await getCurrentStore();
  if (!store) return { success: false, error: "Sin tienda activa" };

  const order = await prisma.order.findUnique({
    where: { id: orderId, storeId: store.id },
    select: { id: true, orderNumber: true, shippingStatus: true, status: true },
  });

  if (!order) return { success: false, error: "Orden no encontrada o acceso denegado" };
  if (order.status === "cancelled") return { success: false, error: "Orden cancelada" };
  if (["preparing", "shipped", "delivered"].includes(order.shippingStatus)) return { success: true };

  const { updateOrderFulfillment } = await import("@/lib/store-engine/fulfillment/actions");
  await updateOrderFulfillment({ orderId, shippingStatus: "preparing" });

  await logSystemEvent({
    storeId: store.id,
    entityType: "order",
    entityId: orderId,
    eventType: "order_preparing_from_hub",
    source: "ai_hub",
    message: `Orden #${order.orderNumber} marcada en preparacion desde el hub de decisiones`,
  });

  revalidatePath("/admin/ai");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function retryProviderSync(connectionId: string): Promise<{ success: boolean; error?: string }> {
  const store = await getCurrentStore();
  if (!store) return { success: false, error: "Sin tienda activa" };

  const connection = await prisma.providerConnection.findUnique({
    where: { id: connectionId, storeId: store.id },
    include: { provider: { select: { name: true } } },
  });

  if (!connection) return { success: false, error: "Conexion no encontrada o acceso denegado" };

  try {
    const { enqueueProviderSyncJob } = await import("@/lib/sourcing/workers/actions");
    await enqueueProviderSyncJob(connectionId);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al encolar sync";
    if (message.includes("en curso")) return { success: true };
    return { success: false, error: message };
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

export async function batchPublishDrafts(): Promise<BatchResult> {
  const store = await getCurrentStore();
  if (!store) return { success: false, processed: 0, failed: 0, errors: ["Sin tienda activa"] };

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
    } catch (e) {
      failed++;
      errors.push(`${product.title}: ${e instanceof Error ? e.message : "error desconocido"}`);
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
    } catch (e) {
      failed++;
      errors.push(`#${order.orderNumber}: ${e instanceof Error ? e.message : "error desconocido"}`);
    }
  }

  await logSystemEvent({
    storeId: store.id,
    entityType: "batch_execution",
    entityId: "batch_mark_preparing",
    eventType: "batch_preparing_completed",
    source: "ai_hub",
    message: `Batch preparar: ${processed} orden(es) en preparacion, ${failed} fallida(s) de ${orders.length} elegible(s)`,
  });

  revalidatePath("/admin/ai");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/dashboard");
  return { success: failed === 0, processed, failed, errors };
}
