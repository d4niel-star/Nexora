"use server";

import { revalidatePath } from "next/cache";

import { getCurrentStore } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { logSystemEvent } from "@/lib/observability/audit";
import { isValidProductHandle, normalizeSlug } from "@/lib/store-engine/slug";

// ─── Catalog admin actions ─────────────────────────────────────────────────
//
// These power the admin Catalog surface (`/admin/catalog`) and are kept in
// a dedicated file so the storefront-facing queries (`./queries.ts`) stay
// pure server-side reads. Every mutation:
//
//   1. resolves the active store via getCurrentStore() — multi-tenant safe.
//   2. asserts that every targeted product belongs to that store before
//      writing anything (so a forged id from another tenant is rejected).
//   3. logs an audit event so the admin trail stays auditable.
//   4. revalidates the admin paths that surface this data.
//
// Bulk endpoints accept an array of ids and return a structured result
// describing how many rows were processed and the ids that were rejected
// (e.g. not found / not owned). The UI uses `processed` to refresh state.

export type CatalogActionResult<T = undefined> =
  | { success: true; data?: T; processed?: number; skipped?: string[] }
  | { success: false; error: string };

// ── Status whitelist ──────────────────────────────────────────────────────
// Mirrors the runtime values used across the schema (`Product.status` is a
// string column with these allowed values). We keep this as a string union
// so client and server agree on the contract.
const PRODUCT_STATUSES = ["active", "draft", "archived"] as const;
export type ProductStatusValue = (typeof PRODUCT_STATUSES)[number];

function revalidateCatalogPaths() {
  revalidatePath("/admin/catalog");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/ai");
  revalidatePath("/admin/ai/catalog");
}

async function ownedProductIds(storeId: string, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.product.findMany({
    where: { storeId, id: { in: ids } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

// ─── Bulk delete ──────────────────────────────────────────────────────────

export async function deleteProductsAction(ids: string[]): Promise<CatalogActionResult<{ deleted: number }>> {
  const store = await getCurrentStore();
  if (!store) return { success: false, error: "Sin tienda activa" };

  if (!Array.isArray(ids) || ids.length === 0) {
    return { success: false, error: "No hay productos seleccionados" };
  }
  if (ids.length > 200) {
    return { success: false, error: "Demasiados productos en una sola operación (máximo 200)" };
  }

  const owned = await ownedProductIds(store.id, ids);
  const skipped = ids.filter((id) => !owned.includes(id));

  if (owned.length === 0) {
    return { success: false, error: "Los productos seleccionados no existen o no pertenecen a tu tienda" };
  }

  // Read titles first so we can audit them before the cascade delete wipes them.
  const targets = await prisma.product.findMany({
    where: { storeId: store.id, id: { in: owned } },
    select: { id: true, title: true, handle: true },
  });

  // Schema has onDelete: Cascade for variants/images/collections/reviews so a
  // single deleteMany cleans the graph. We protect against deleting products
  // that have order history (FK to OrderItem is RESTRICT-by-default in Prisma):
  // if there are order items, archive instead of delete and surface a clear
  // message so the merchant can react.
  const withOrders = await prisma.product.findMany({
    where: { storeId: store.id, id: { in: owned }, orderItems: { some: {} } },
    select: { id: true, title: true },
  });

  const deletableIds = owned.filter((id) => !withOrders.some((p) => p.id === id));
  const archivedIds = withOrders.map((p) => p.id);

  if (archivedIds.length > 0) {
    await prisma.product.updateMany({
      where: { storeId: store.id, id: { in: archivedIds } },
      data: { status: "archived", isPublished: false },
    });
  }

  if (deletableIds.length > 0) {
    await prisma.product.deleteMany({
      where: { storeId: store.id, id: { in: deletableIds } },
    });
  }

  await logSystemEvent({
    storeId: store.id,
    entityType: "product",
    entityId: "bulk",
    eventType: "products_bulk_deleted",
    source: "catalog_admin",
    message: `Eliminados ${deletableIds.length} producto(s)${archivedIds.length ? `, archivados ${archivedIds.length} con historial de pedidos` : ""}.`,
    metadata: {
      deletedIds: deletableIds,
      archivedIds,
      titles: targets.map((t) => t.title),
    },
  });

  revalidateCatalogPaths();

  return {
    success: true,
    processed: deletableIds.length + archivedIds.length,
    skipped,
    data: { deleted: deletableIds.length },
  };
}

// ─── Bulk status change ───────────────────────────────────────────────────

export async function setProductsStatusAction(
  ids: string[],
  status: ProductStatusValue,
): Promise<CatalogActionResult<{ updated: number }>> {
  const store = await getCurrentStore();
  if (!store) return { success: false, error: "Sin tienda activa" };

  if (!PRODUCT_STATUSES.includes(status)) {
    return { success: false, error: "Estado inválido" };
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    return { success: false, error: "No hay productos seleccionados" };
  }
  if (ids.length > 500) {
    return { success: false, error: "Demasiados productos en una sola operación (máximo 500)" };
  }

  const owned = await ownedProductIds(store.id, ids);
  const skipped = ids.filter((id) => !owned.includes(id));

  if (owned.length === 0) {
    return { success: false, error: "Los productos seleccionados no existen o no pertenecen a tu tienda" };
  }

  // status=active means the product is publicly visible: keep isPublished
  // synced with the status column so the storefront query (which filters by
  // isPublished + status != "archived") sees a consistent state.
  const isPublished = status === "active";

  const result = await prisma.product.updateMany({
    where: { storeId: store.id, id: { in: owned } },
    data: { status, isPublished },
  });

  await logSystemEvent({
    storeId: store.id,
    entityType: "product",
    entityId: "bulk",
    eventType: "products_status_changed",
    source: "catalog_admin",
    message: `Cambio masivo de estado a "${status}" en ${result.count} producto(s).`,
    metadata: { ids: owned, status },
  });

  revalidateCatalogPaths();

  return {
    success: true,
    processed: result.count,
    skipped,
    data: { updated: result.count },
  };
}

// ─── Manual create (used by the "Agregar manual" modal) ───────────────────

export interface CreateManualProductInput {
  title: string;
  category?: string | null;
  description?: string | null;
  price: number;
  cost?: number | null;
  stock: number;
  image?: string | null;
  supplier?: string | null;
  publish: boolean;
}

export async function createManualProductAction(
  input: CreateManualProductInput,
): Promise<CatalogActionResult<{ id: string; handle: string }>> {
  const store = await getCurrentStore();
  if (!store) return { success: false, error: "Sin tienda activa" };

  // ── Validation ──
  const title = (input.title ?? "").trim();
  if (title.length < 2 || title.length > 120) {
    return { success: false, error: "El nombre del producto debe tener entre 2 y 120 caracteres" };
  }
  if (!Number.isFinite(input.price) || input.price <= 0) {
    return { success: false, error: "El precio debe ser un número mayor a cero" };
  }
  if (!Number.isInteger(input.stock) || input.stock < 0) {
    return { success: false, error: "El stock debe ser un entero igual o mayor a cero" };
  }
  if (input.cost !== undefined && input.cost !== null) {
    if (!Number.isFinite(input.cost) || input.cost < 0) {
      return { success: false, error: "El costo debe ser un número igual o mayor a cero" };
    }
    if (input.cost > input.price * 5) {
      return { success: false, error: "El costo parece desproporcionado respecto al precio" };
    }
  }

  if (input.image && !/^https?:\/\/\S+$/i.test(input.image)) {
    return { success: false, error: "La imagen debe ser una URL pública válida (https://...)" };
  }

  // ── Build a unique handle ──
  const fallback = `producto-${Date.now().toString(36)}`;
  const base = normalizeSlug(title) || fallback;
  let handle = isValidProductHandle(base) ? base : fallback;
  let suffix = 2;
  while (
    await prisma.product.findUnique({
      where: { storeId_handle: { storeId: store.id, handle } },
      select: { id: true },
    })
  ) {
    handle = `${base}-${suffix}`;
    suffix += 1;
    if (suffix > 200) {
      // Failsafe: extremely unlikely, but avoid an infinite loop on pathological data.
      handle = `${fallback}-${Math.random().toString(36).slice(2, 6)}`;
      break;
    }
  }

  const status: ProductStatusValue = input.publish ? "active" : "draft";

  // ── Create product + a single default variant ──
  const product = await prisma.product.create({
    data: {
      storeId: store.id,
      handle,
      title,
      description: input.description?.trim() || null,
      category: input.category?.trim() || null,
      supplier: input.supplier?.trim() || "Propio",
      price: input.price,
      cost: input.cost ?? null,
      featuredImage: input.image?.trim() || null,
      status,
      isPublished: input.publish,
      isFeatured: false,
      variants: {
        create: {
          title: "Default",
          price: input.price,
          stock: input.stock,
          isDefault: true,
        },
      },
    },
    select: { id: true, handle: true, title: true },
  });

  await logSystemEvent({
    storeId: store.id,
    entityType: "product",
    entityId: product.id,
    eventType: "product_created_manual",
    source: "catalog_admin",
    message: `Producto "${product.title}" creado manualmente (${status}).`,
    metadata: { handle: product.handle, status, price: input.price, stock: input.stock },
  });

  revalidateCatalogPaths();

  return { success: true, data: { id: product.id, handle: product.handle } };
}
