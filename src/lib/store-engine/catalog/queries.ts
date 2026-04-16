import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import { getVariantIntelligenceReport } from "@/lib/replenishment/variant-queries";
import { getVariantEconomicsReport } from "@/lib/profitability/variant-queries";
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

export interface CatalogSignal {
  key: string;
  label: string;
  severity: "blocker" | "warning" | "info" | "ok";
}

export interface AdminProduct {
  id: string;
  handle: string;
  title: string;
  status: "active" | "draft" | "archived";
  category: string;
  supplier: string;
  price: number;
  cost: number;
  costReal: boolean;
  margin: number;
  totalStock: number;
  image: string;
  isPublished: boolean;
  isFeatured: boolean;
  variants: { id: string; title: string; price: number; stock: number; reservedStock: number; }[];
  createdAt: string;
  // Catalog Intelligence v2
  signals: CatalogSignal[];
  issueCount: number;
  hasProvider: boolean;
  providerName: string | null;
  mirrorSyncStatus: string | null;
  channelCount: number;
  channelSyncIssues: number;
  firstListingId: string | null;
  // Catalog Variant Intelligence v1
  variantRiskCount: number;
  hiddenVariantCount: number;
  variantCriticalId: string | null;
  variantHiddenId: string | null;
  variantStuckId: string | null;
  variantNegativeId: string | null;
  variantUrgentReorderId: string | null;
}

/**
 * Fetches all products for the active store, adapted for the admin catalog UI.
 * Includes unpublished/draft/archived products unlike the storefront queries.
 * v1: Includes variant intelligence signals.
 */
export async function getAdminCatalog(): Promise<AdminProduct[]> {
  const store = await getCurrentStore();

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
      catalogMirror: {
        select: {
          syncStatus: true,
          providerProduct: {
            select: { provider: { select: { name: true } } },
          },
        },
      },
      channelListings: {
        select: {
          id: true,
          channel: true,
          status: true,
          syncStatus: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch variant intelligence for variant-level signals
  const variantEcon = await getVariantEconomicsReport();
  const variantIntel = await getVariantIntelligenceReport(undefined, variantEcon);

  return products.map((p) => {
    const totalStock = p.variants.reduce((acc, v) => acc + v.stock, 0);
    const costReal = p.cost !== null && p.cost !== undefined;
    const cost = costReal ? p.cost! : 0;
    const margin = costReal && p.price > 0 ? (p.price - cost) / p.price : 0;
    const status: AdminProduct["status"] = p.isPublished ? "active" : (p.status === "archived" ? "archived" : "draft");

    // Channel intelligence
    const publishedListings = p.channelListings.filter((l) => l.status === "published");
    const channelSyncIssues = publishedListings.filter((l) => l.syncStatus === "out_of_sync" || l.syncStatus === "error").length;
    const firstListingWithIssue = publishedListings.find((l) => l.syncStatus === "out_of_sync" || l.syncStatus === "error");

    // Mirror intelligence
    const hasProvider = !!p.catalogMirror;
    const providerName = p.catalogMirror?.providerProduct?.provider?.name ?? null;
    const mirrorSyncStatus = p.catalogMirror?.syncStatus ?? null;

    // Build signals
    const signals: CatalogSignal[] = [];

    // Cost health
    if (!costReal) {
      signals.push({ key: "no_cost", label: "Sin costo", severity: "blocker" });
    } else if (margin < 0.05) {
      signals.push({ key: "low_margin", label: `Margen ${Math.round(margin * 100)}%`, severity: "warning" });
    }

    // Stock
    if (totalStock === 0) {
      signals.push({ key: "no_stock", label: "Sin stock", severity: "blocker" });
    }

    // Draft status
    if (status === "draft") {
      signals.push({ key: "draft", label: "Borrador", severity: "warning" });
    }

    // Channel sync
    if (channelSyncIssues > 0) {
      signals.push({ key: "sync_issue", label: `${channelSyncIssues} sync issue${channelSyncIssues !== 1 ? "s" : ""}`, severity: "warning" });
    }

    // Mirror desync
    if (mirrorSyncStatus === "out_of_sync") {
      signals.push({ key: "mirror_desync", label: "Espejo desincronizado", severity: "warning" });
    }

    // No channels
    if (status === "active" && publishedListings.length === 0) {
      signals.push({ key: "no_channel", label: "Sin canal", severity: "info" });
    }

    // Good health
    if (signals.length === 0 && status === "active") {
      signals.push({ key: "healthy", label: "Sano", severity: "ok" });
    }

    // ─── Variant Intelligence v1 (Catalog-level signals) ───
    const productVariants = variantIntel.products.find((vp) => vp.productId === p.id);
    const variantRiskCount = (productVariants?.stockoutVariants ?? 0) + (productVariants?.criticalVariants ?? 0) + (productVariants?.lowVariants ?? 0) || 0;
    const hiddenVariantCount = productVariants?.hasHiddenRisk ? 1 : 0;

    // Find worst variant IDs for deep-linking
    const variantCriticalId = productVariants?.variants.find((v) => v.health === "critical" && v.unitsSold30d > 0)?.variantId ?? null;
    const variantHiddenId = productVariants?.variants.find((v) => v.hiddenByAggregate)?.variantId ?? null;
    const variantStuckId = productVariants?.variants.find((v) => v.health === "stuck" && v.stock > 0)?.variantId ?? null;
    const variantNegativeId = productVariants?.variants.find((v) => v.econHealth === "negative")?.variantId ?? null;
    const variantUrgentReorderId = productVariants?.variants.find((v) => v.action === "reorder" && v.health === "weak" && v.velocityPerDay >= 0.5)?.variantId ?? null;

    // Add variant signals to product signals
    if (variantCriticalId) {
      signals.push({ key: "variant_critical", label: "Variante crítica", severity: "blocker" });
    }
    if (variantStuckId) {
      signals.push({ key: "variant_stuck", label: "Variante inmovilizada", severity: "warning" });
    }
    if (variantNegativeId) {
      signals.push({ key: "variant_negative", label: "Variante destruye valor", severity: "warning" });
    }
    if (hiddenVariantCount > 0) {
      signals.push({ key: "variant_hidden", label: "Riesgo oculto por variante", severity: "blocker" });
    }
    if (variantUrgentReorderId) {
      signals.push({ key: "variant_urgent", label: "Variante requiere reposición", severity: "warning" });
    }

    const issueCount = signals.filter((s) => s.severity === "blocker" || s.severity === "warning").length;

    return {
      id: p.id,
      handle: p.handle,
      title: p.title,
      status,
      category: p.category ?? "Sin categoría",
      supplier: p.supplier ?? "Propio",
      price: p.price,
      cost,
      costReal,
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
      signals,
      issueCount,
      hasProvider,
      providerName,
      mirrorSyncStatus,
      channelCount: publishedListings.length,
      channelSyncIssues,
      firstListingId: firstListingWithIssue?.id ?? null,
      variantRiskCount,
      hiddenVariantCount,
      variantCriticalId,
      variantHiddenId,
      variantStuckId,
      variantNegativeId,
      variantUrgentReorderId,
    };
  });
}

