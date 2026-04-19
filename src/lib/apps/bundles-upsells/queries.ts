// ─── Bundles & Upsells · Queries ───
// Read-only helpers for admin list/form and storefront rendering. Storefront
// queries filter strictly by isPublished + inStock so nothing ghost-stock
// is offered to customers.

import { prisma } from "@/lib/db/prisma";
import type { StorefrontProduct } from "@/types/storefront";

export type BundleOfferStatus = "draft" | "active";

export interface AdminOfferRow {
  id: string;
  name: string;
  title: string | null;
  status: BundleOfferStatus;
  triggerProductId: string;
  triggerProductTitle: string;
  triggerProductHandle: string;
  itemsCount: number;
  updatedAt: Date;
}

export interface AdminOfferDetail extends AdminOfferRow {
  description: string | null;
  items: { productId: string; productTitle: string; position: number }[];
}

export async function listOffersForAdmin(
  storeId: string,
): Promise<AdminOfferRow[]> {
  const rows = await prisma.bundleOffer.findMany({
    where: { storeId },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      trigger: { select: { id: true, title: true, handle: true } },
      _count: { select: { items: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    title: r.title,
    status: r.status as BundleOfferStatus,
    triggerProductId: r.triggerProductId,
    triggerProductTitle: r.trigger.title,
    triggerProductHandle: r.trigger.handle,
    itemsCount: r._count.items,
    updatedAt: r.updatedAt,
  }));
}

export async function getOfferForAdmin(
  storeId: string,
  id: string,
): Promise<AdminOfferDetail | null> {
  const row = await prisma.bundleOffer.findFirst({
    where: { id, storeId },
    include: {
      trigger: { select: { id: true, title: true, handle: true } },
      items: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: { product: { select: { id: true, title: true } } },
      },
      _count: { select: { items: true } },
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    description: row.description,
    status: row.status as BundleOfferStatus,
    triggerProductId: row.triggerProductId,
    triggerProductTitle: row.trigger.title,
    triggerProductHandle: row.trigger.handle,
    itemsCount: row._count.items,
    updatedAt: row.updatedAt,
    items: row.items.map((it) => ({
      productId: it.productId,
      productTitle: it.product.title,
      position: it.position,
    })),
  };
}

/**
 * Published products for the admin picker. Tenant-scoped.
 */
export async function listPublishedProductsForStore(storeId: string) {
  const rows = await prisma.product.findMany({
    where: { storeId, isPublished: true, status: "published" },
    orderBy: [{ title: "asc" }],
    select: { id: true, title: true, handle: true, price: true },
    take: 500,
  });
  return rows;
}

interface StoreContext {
  locale: string;
  currency: string;
}

/**
 * Returns the approved offered products for the given trigger. Each item is
 * shaped like a StorefrontProduct so the existing ProductCard can render it.
 * Filters out unpublished / out-of-stock / missing items silently.
 */
export async function getActiveUpsellsForProduct(
  storeId: string,
  triggerProductId: string,
  _store: StoreContext = { locale: "es-AR", currency: "ARS" },
): Promise<{ title: string | null; description: string | null; products: StorefrontProduct[] } | null> {
  const offer = await prisma.bundleOffer.findFirst({
    where: { storeId, triggerProductId, status: "active" },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      items: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: {
          product: {
            include: {
              variants: { select: { id: true, stock: true } },
              images: { orderBy: { sortOrder: "asc" }, take: 1 },
            },
          },
        },
      },
    },
  });
  if (!offer) return null;

  const products: StorefrontProduct[] = [];
  for (const it of offer.items) {
    const p = it.product;
    if (!p.isPublished || p.status !== "published") continue;

    // In-stock if any variant has stock>0, otherwise treat standalone products
    // as in-stock when the only variant shows stock or when no variant row
    // exists. Keeps the helper aligned with the main catalog query behaviour.
    const inStock =
      p.variants.length === 0
        ? true
        : p.variants.some((v) => v.stock > 0);
    if (!inStock) continue;

    products.push({
      id: p.id,
      handle: p.handle,
      title: p.title,
      description: p.description ?? "",
      price: p.price,
      compareAtPrice: p.compareAtPrice ?? undefined,
      featuredImage: p.featuredImage ?? p.images[0]?.url ?? "",
      images: p.images.map((img) => img.url),
      variants: [],
      brand: "",
      badges: [],
      rating: 0,
      reviewCount: 0,
      inStock,
      features: [],
    });
  }

  if (products.length === 0) return null;
  return {
    title: offer.title,
    description: offer.description,
    products,
  };
}
