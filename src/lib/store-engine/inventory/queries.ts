"use server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { logSystemEvent } from "@/lib/observability/audit";

export interface AdminInventoryItem {
  variantId: string;
  productId: string;
  sku: string;
  productTitle: string;
  variantTitle: string;
  image: string;
  category: string;
  supplier: string;
  stock: number;
  reservedStock: number;
  available: number;
  trackInventory: boolean;
  reorderPoint: number | null; // v2: per-variant reorder threshold
  status: "in_stock" | "low_stock" | "out_of_stock";
  productHandle: string;
}

export interface AdminInventoryMovement {
  id: string;
  type: string;
  quantityDelta: number;
  reason: string | null;
  createdAt: string;
  orderId: string | null;
}

const LOW_STOCK_THRESHOLD_DEFAULT = 10;

function deriveStatus(stock: number, reservedStock: number, reorderPoint: number | null): AdminInventoryItem["status"] {
  const available = stock - reservedStock;
  if (available <= 0) return "out_of_stock";
  const threshold = reorderPoint ?? LOW_STOCK_THRESHOLD_DEFAULT;
  if (available <= threshold) return "low_stock";
  return "in_stock";
}

export async function getAdminInventory(): Promise<AdminInventoryItem[]> {
  const store = await getCurrentStore();
  if (!store) return [];

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    include: {
      variants: { orderBy: { createdAt: "asc" } },
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  const items: AdminInventoryItem[] = [];

  for (const product of products) {
    for (const variant of product.variants) {
      const available = variant.stock - variant.reservedStock;
      items.push({
        variantId: variant.id,
        productId: product.id,
        sku: variant.sku || `${product.handle}-${variant.title}`.toUpperCase().replace(/\s+/g, "-"),
        productTitle: product.title,
        variantTitle: variant.title,
        image: product.featuredImage || product.images[0]?.url || "",
        category: product.category || "Sin categoría",
        supplier: product.supplier || "Propio",
        stock: variant.stock,
        reservedStock: variant.reservedStock,
        available,
        trackInventory: variant.trackInventory,
        reorderPoint: variant.reorderPoint,
        status: deriveStatus(variant.stock, variant.reservedStock, variant.reorderPoint),
        productHandle: product.handle,
      });
    }
  }

  return items;
}

export async function getVariantMovements(variantId: string): Promise<AdminInventoryMovement[]> {
  const movements = await prisma.stockMovement.findMany({
    where: { variantId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return movements.map((m) => ({
    id: m.id,
    type: m.type,
    quantityDelta: m.quantityDelta,
    reason: m.reason,
    createdAt: m.createdAt.toISOString(),
    orderId: m.orderId,
  }));
}

export async function adjustStock(
  variantId: string,
  delta: number,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const store = await getCurrentStore();
  if (!store) return { success: false, error: "Sesión inválida" };

  if (delta === 0) return { success: false, error: "El ajuste no puede ser 0" };
  if (!reason.trim()) return { success: false, error: "Se requiere una razón para el ajuste" };

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });

  if (!variant) return { success: false, error: "Variante no encontrada" };
  if (variant.product.storeId !== store.id) return { success: false, error: "Acceso denegado" };

  const newStock = variant.stock + delta;
  if (newStock < 0) return { success: false, error: `No es posible. Stock actual: ${variant.stock}, ajuste: ${delta}` };

  await prisma.$transaction(async (tx) => {
    await tx.productVariant.update({
      where: { id: variantId },
      data: { stock: { increment: delta } },
    });

    await tx.stockMovement.create({
      data: {
        storeId: store.id,
        productId: variant.productId,
        variantId,
        type: "manual_adjustment",
        quantityDelta: delta,
        reason: reason.trim(),
      },
    });
  });

  await logSystemEvent({
    storeId: store.id,
    entityType: "ProductVariant",
    entityId: variantId,
    eventType: "stock_adjusted",
    source: "admin_inventory",
    message: `Stock ajustado en ${delta > 0 ? "+" : ""}${delta} unidades. Razón: ${reason}`,
  });

  revalidatePath("/admin/inventory");

  return { success: true };
}

export async function updateReorderPoint(
  variantId: string,
  reorderPoint: number | null,
): Promise<{ success: boolean; error?: string }> {
  const store = await getCurrentStore();
  if (!store) return { success: false, error: "Sesión inválida" };

  if (reorderPoint !== null) {
    if (!Number.isInteger(reorderPoint)) return { success: false, error: "El punto de reorden debe ser un número entero" };
    if (reorderPoint < 0) return { success: false, error: "El punto de reorden no puede ser negativo" };
  }

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });

  if (!variant) return { success: false, error: "Variante no encontrada" };
  if (variant.product.storeId !== store.id) return { success: false, error: "Acceso denegado" };

  await prisma.productVariant.update({
    where: { id: variantId },
    data: { reorderPoint },
  });

  await logSystemEvent({
    storeId: store.id,
    entityType: "ProductVariant",
    entityId: variantId,
    eventType: "reorder_point_updated",
    source: "admin_inventory",
    message: `Punto de reorden actualizado a ${reorderPoint === null ? "sistema (10)" : reorderPoint}`,
  });

  revalidatePath("/admin/inventory");

  return { success: true };
}

export async function updateVariantPrice(
  variantId: string,
  price: number,
): Promise<{ success: boolean; error?: string }> {
  const store = await getCurrentStore();
  if (!store) return { success: false, error: "Sesión inválida" };

  if (typeof price !== "number" || !isFinite(price)) return { success: false, error: "Precio inválido" };
  if (price < 0) return { success: false, error: "El precio no puede ser negativo" };

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });

  if (!variant) return { success: false, error: "Variante no encontrada" };
  if (variant.product.storeId !== store.id) return { success: false, error: "Acceso denegado" };

  // Idempotent: skip if already the same value
  if (variant.price === price) return { success: true };

  await prisma.productVariant.update({
    where: { id: variantId },
    data: { price },
  });

  await logSystemEvent({
    storeId: store.id,
    entityType: "ProductVariant",
    entityId: variantId,
    eventType: "variant_price_updated",
    source: "admin_inventory",
    message: `Precio de variante actualizado de ${variant.price} a ${price}`,
  });

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/catalog");
  revalidatePath("/admin/operations");

  return { success: true };
}

export async function checkVariantStock(variantId: string, quantityDesired: number): Promise<{ hasStock: boolean; available: number }> {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { stock: true, reservedStock: true, trackInventory: true, allowBackorder: true }
  });

  if (!variant) return { hasStock: false, available: 0 };
  if (!variant.trackInventory || variant.allowBackorder) return { hasStock: true, available: 9999 };

  const available = variant.stock - variant.reservedStock;
  return {
    hasStock: available >= quantityDesired,
    available
  };
}
