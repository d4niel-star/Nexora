import { prisma } from "@/lib/db/prisma";
import type { StorefrontProduct, StorefrontCollection, ProductVariant } from "@/types/storefront";

// Utility to safely parse JSON or return empty array
const parseImages = (images: any): string[] => {
  if (!images) return [];
  if (Array.isArray(images)) return images.map((i) => i.url);
  return [];
};

export async function getStoreProducts(storeId: string): Promise<StorefrontProduct[]> {
  const products = await prisma.product.findMany({
    where: { storeId, isPublished: true },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      variants: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return products.map(mapProductToStorefront);
}

export async function getStoreCollections(storeId: string): Promise<StorefrontCollection[]> {
  const collections = await prisma.collection.findMany({
    where: { storeId, isPublished: true },
    include: {
      _count: {
        select: { products: true }
      }
    },
    orderBy: { sortOrder: 'asc' }
  });

  return collections.map((col) => ({
    id: col.id,
    handle: col.handle,
    title: col.title,
    description: col.description || "",
    imageUrl: col.imageUrl || "",
    productCount: col._count.products,
  }));
}

export async function getStoreProductByHandle(storeId: string, handle: string): Promise<StorefrontProduct | null> {
  const product = await prisma.product.findUnique({
    where: {
      storeId_handle: {
        storeId,
        handle
      }
    },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      variants: true,
    }
  });

  if (!product || !product.isPublished) return null;

  return mapProductToStorefront(product);
}

export async function getRelatedProducts(storeId: string, currentProductId: string, limit: number = 4): Promise<StorefrontProduct[]> {
  const products = await prisma.product.findMany({
    where: {
      storeId,
      isPublished: true,
      id: { not: currentProductId }
    },
    take: limit,
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      variants: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  return products.map(mapProductToStorefront);
}

export async function getStoreCollectionByHandle(storeId: string, handle: string): Promise<{ collection: StorefrontCollection; products: StorefrontProduct[] } | null> {
  const collection = await prisma.collection.findUnique({
    where: {
      storeId_handle: {
        storeId,
        handle
      }
    },
    include: {
      products: {
        include: {
          product: {
            include: {
              images: { orderBy: { sortOrder: 'asc' } },
              variants: true,
            }
          }
        },
        orderBy: { sortOrder: 'asc' }
      },
      _count: {
        select: { products: true }
      }
    }
  });

  if (!collection || !collection.isPublished) return null;

  const validProducts = collection.products
    .filter(cp => cp.product.isPublished)
    .map(cp => mapProductToStorefront(cp.product));

  return {
    collection: {
      id: collection.id,
      handle: collection.handle,
      title: collection.title,
      description: collection.description || "",
      imageUrl: collection.imageUrl || "",
      productCount: collection._count.products,
    },
    products: validProducts,
  };
}

function mapProductToStorefront(product: any): StorefrontProduct {
  const variants: ProductVariant[] = product.variants.map((v: any) => {
    const availableStock = v.stock - (v.reservedStock || 0);
    const inStock = v.trackInventory ? (v.allowBackorder || availableStock > 0) : true;
    
    return {
      id: v.id,
      name: "Opciones", 
      values: [v.title], 
      inStock,
      availableStock,
      allowBackorder: v.allowBackorder || false,
      // Extensible raw mapping if needed by UI
      raw: {
        title: v.title,
        price: v.price,
        stock: v.stock,
        compareAtPrice: v.compareAtPrice,
      }
    };
  });

  const inStock = variants.some((v: any) => v.inStock);

  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    description: product.description || "",
    price: product.price,
    compareAtPrice: product.compareAtPrice || undefined,
    featuredImage: product.featuredImage || product.images?.[0]?.url || "",
    images: parseImages(product.images),
    variants,
    brand: product.supplier || "Nexora",
    badges: product.isFeatured ? ["Featured"] : [],
    rating: 0, // Mock, extend model later
    reviewCount: 0, // Mock, extend later
    inStock,
    features: [], 
  };
}

// ─── Admin Catalog Queries ───

export interface AdminProduct {
  id: string;
  handle: string;
  title: string;
  status: "active" | "draft" | "archived";
  category: string;
  supplier: string;
  price: number;
  cost: number;
  margin: number;
  totalStock: number;
  image: string;
  isPublished: boolean;
  isFeatured: boolean;
  variants: { id: string; title: string; price: number; stock: number; reservedStock: number; }[];
  createdAt: string;
}

/**
 * Fetches all products for the active store, adapted for the admin catalog UI.
 * Includes unpublished/draft/archived products unlike the storefront queries.
 */
export async function getAdminCatalog(): Promise<AdminProduct[]> {
  const store = await prisma.store.findFirst({
    where: { status: "active" },
  });

  if (!store) return [];

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    include: {
      variants: {
        orderBy: { createdAt: "asc" },
      },
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return products.map((p) => {
    const totalStock = p.variants.reduce((acc, v) => acc + v.stock, 0);
    const cost = p.cost ?? p.price * 0.6;
    const margin = p.price > 0 ? (p.price - cost) / p.price : 0;
    const status: AdminProduct["status"] = p.isPublished ? "active" : (p.status === "archived" ? "archived" : "draft");

    return {
      id: p.id,
      handle: p.handle,
      title: p.title,
      status,
      category: p.category ?? "Sin categoría",
      supplier: p.supplier ?? "Propio",
      price: p.price,
      cost,
      margin,
      totalStock,
      image: p.featuredImage ?? p.images[0]?.url ?? "",
      isPublished: p.isPublished,
      isFeatured: p.isFeatured,
      variants: p.variants.map((v) => ({
        id: v.id,
        title: v.title,
        price: v.price,
        stock: v.stock,
        reservedStock: v.reservedStock,
      })),
      createdAt: p.createdAt.toISOString(),
    };
  });
}

