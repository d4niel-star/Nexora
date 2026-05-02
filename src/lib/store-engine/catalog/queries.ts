import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import { getVariantIntelligenceReport } from "@/lib/replenishment/variant-queries";
import { getVariantEconomicsReport } from "@/lib/profitability/variant-queries";
import type { StorefrontProduct, StorefrontCollection, ProductVariant } from "@/types/storefront";
import {
  type PaginationMeta,
  buildPaginationMeta,
  pageToSkip,
  clampPageSize,
  DEFAULT_PAGE_SIZE,
} from "@/lib/pagination";

// Utility to safely parse JSON or return empty array
const parseImages = (images: any): string[] => {
  if (!images) return [];
  if (Array.isArray(images)) return images.map((i) => i.url);
  return [];
};

export async function getStoreProducts(storeId: string): Promise<StorefrontProduct[]> {
  const products = await prisma.product.findMany({
    where: { storeId, isPublished: true, status: { not: "archived" } },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      variants: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return products.map(mapProductToStorefront).filter((product) => product.inStock);
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

export async function getStoreProductByIdentifier(storeId: string, identifier: string): Promise<StorefrontProduct | null> {
  const product = await prisma.product.findFirst({
    where: {
      storeId,
      isPublished: true,
      status: { not: "archived" },
      OR: [{ handle: identifier }, { id: identifier }],
    },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      variants: true,
    }
  });

  if (!product) return null;

  return mapProductToStorefront(product);
}

export async function getStoreProductByHandle(storeId: string, handle: string): Promise<StorefrontProduct | null> {
  return getStoreProductByIdentifier(storeId, handle);
}

export async function getRelatedProducts(storeId: string, currentProductId: string, limit: number = 4): Promise<StorefrontProduct[]> {
  const products = await prisma.product.findMany({
    where: {
      storeId,
      isPublished: true,
      status: { not: "archived" },
      id: { not: currentProductId }
    },
    take: limit,
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      variants: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  return products.map(mapProductToStorefront).filter((product) => product.inStock);
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
    .filter(cp => cp.product.isPublished && cp.product.status !== "archived")
    .map(cp => mapProductToStorefront(cp.product))
    .filter((product) => product.inStock);

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
    };
  });

  const inStock = variants.some((v: any) => v.inStock);

  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    description: product.description || "",
    category: product.category,
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

// â”€â”€â”€ Admin Catalog Queries â”€â”€â”€

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
  // Catalog Variant Intelligence v1
  variantRiskCount: number;
  hiddenVariantCount: number;
  variantCriticalId: string | null;
  variantHiddenId: string | null;
  variantStuckId: string | null;
  variantNegativeId: string | null;
  variantUrgentReorderId: string | null;
}

// â”€â”€â”€ Paginated Catalog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface CatalogStatusCounts {
  all: number;
  active: number;
  draft: number;
  archived: number;
  outOfStock: number;
  issues: number;
}

export interface CatalogPageResult {
  products: AdminProduct[];
  pagination: PaginationMeta;
  counts: CatalogStatusCounts;
}

export interface GetCatalogPageOptions {
  page?: number;
  pageSize?: number;
  query?: string;
  status?: string; // "all" | "active" | "draft" | "archived" | "out_of_stock"
}

/**
 * Server-side paginated catalog query.
 * Uses take/skip, filters, and returns pagination metadata + tab counts.
 */
export async function getAdminCatalogPage(
  options: GetCatalogPageOptions = {},
): Promise<CatalogPageResult> {
  const store = await getCurrentStore();

  const empty: CatalogPageResult = {
    products: [],
    pagination: buildPaginationMeta(0, 1, DEFAULT_PAGE_SIZE),
    counts: { all: 0, active: 0, draft: 0, archived: 0, outOfStock: 0, issues: 0 },
  };

  if (!store) return empty;

  const pageSize = clampPageSize(options.pageSize ?? DEFAULT_PAGE_SIZE);
  const page = Math.max(1, options.page ?? 1);

  // Build WHERE clause
  const where: Record<string, any> = { storeId: store.id };

  // Status filter
  if (options.status && options.status !== "all") {
    if (options.status === "active") {
      where.isPublished = true;
      where.status = { not: "archived" };
    } else if (options.status === "draft") {
      where.isPublished = false;
      where.status = { not: "archived" };
    } else if (options.status === "archived") {
      where.status = "archived";
    } else if (options.status === "out_of_stock") {
      // Server-side: all variants have stock <= 0
      where.variants = { every: { stock: { lte: 0 } } };
    }
  }

  // Search by title or category
  if (options.query) {
    const q = options.query.trim();
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
        { handle: { contains: q, mode: "insensitive" } },
      ];
    }
  }

  const storeWhere = { storeId: store.id };

  // Tab counts + main count (parallel) — fast indexed counts
  const outOfStockWhere = { ...storeWhere, variants: { every: { stock: { lte: 0 } } } };
  const [total, allCount, activeCount, draftCount, archivedCount, outOfStockCount] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.count({ where: { ...storeWhere } }),
    prisma.product.count({ where: { ...storeWhere, isPublished: true, status: { not: "archived" } } }),
    prisma.product.count({ where: { ...storeWhere, isPublished: false, status: { not: "archived" } } }),
    prisma.product.count({ where: { ...storeWhere, status: "archived" } }),
    prisma.product.count({ where: outOfStockWhere }),
  ]);

  // Clamp page to valid range BEFORE querying data
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.max(1, Math.min(page, pageCount));

  // Main query — always server-side paginated with clamped page
  const products = await prisma.product.findMany({
    where,
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
    },
    orderBy: { createdAt: "desc" },
    take: pageSize,
    skip: pageToSkip(safePage, pageSize),
  });

  // Fetch variant intelligence for variant-level signals
  const variantEcon = await getVariantEconomicsReport();
  const variantIntel = await getVariantIntelligenceReport(undefined, variantEcon);

  const mapped = products.map((p) => mapToAdminProduct(p, variantIntel));

  return {
    products: mapped,
    pagination: buildPaginationMeta(total, safePage, pageSize),
    counts: {
      all: allCount,
      active: activeCount,
      draft: draftCount,
      archived: archivedCount,
      outOfStock: outOfStockCount,
      issues: 0, // Requires denormalized field for global count — deferred
    },
  };
}

/** Map a Prisma product row to the AdminProduct shape. */
function mapToAdminProduct(p: any, variantIntel: any): AdminProduct {
  const totalStock = p.variants.reduce((acc: number, v: any) => acc + v.stock, 0);
  const costReal = p.cost !== null && p.cost !== undefined;
  const cost = costReal ? p.cost! : 0;
  const margin = costReal && p.price > 0 ? (p.price - cost) / p.price : 0;
  const status: AdminProduct["status"] = p.isPublished ? "active" : (p.status === "archived" ? "archived" : "draft");

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

  // Mirror desync
  if (mirrorSyncStatus === "out_of_sync") {
    signals.push({ key: "mirror_desync", label: "Espejo desincronizado", severity: "warning" });
  }

  // Good health
  if (signals.length === 0 && status === "active") {
    signals.push({ key: "healthy", label: "Sano", severity: "ok" });
  }

  // â”€â”€â”€ Variant Intelligence v1 (Catalog-level signals) â”€â”€â”€
  const productVariants = variantIntel.products.find((vp: any) => vp.productId === p.id);
  const variantRiskCount = (productVariants?.stockoutVariants ?? 0) + (productVariants?.criticalVariants ?? 0) + (productVariants?.lowVariants ?? 0) || 0;
  const hiddenVariantCount = productVariants?.hasHiddenRisk ? 1 : 0;

  // Find worst variant IDs for deep-linking
  const variantCriticalId = productVariants?.variants.find((v: any) => v.health === "critical" && v.unitsSold30d > 0)?.variantId ?? null;
  const variantHiddenId = productVariants?.variants.find((v: any) => v.hiddenByAggregate)?.variantId ?? null;
  const variantStuckId = productVariants?.variants.find((v: any) => v.health === "stuck" && v.stock > 0)?.variantId ?? null;
  const variantNegativeId = productVariants?.variants.find((v: any) => v.econHealth === "negative")?.variantId ?? null;
  const variantUrgentReorderId = productVariants?.variants.find((v: any) => v.action === "reorder" && v.health === "weak" && v.velocityPerDay >= 0.5)?.variantId ?? null;

  // Add variant signals to product signals
  if (variantCriticalId) {
    signals.push({ key: "variant_critical", label: "Variante crÃ­tica", severity: "blocker" });
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
    signals.push({ key: "variant_urgent", label: "Variante requiere reposiciÃ³n", severity: "warning" });
  }

  const issueCount = signals.filter((s) => s.severity === "blocker" || s.severity === "warning").length;

  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    status,
    category: p.category ?? "Sin categorÃ­a",
    supplier: p.supplier ?? "Propio",
    price: p.price,
    cost,
    costReal,
    margin,
    totalStock,
    image: p.featuredImage ?? p.images[0]?.url ?? "",
    isPublished: p.isPublished,
    isFeatured: p.isFeatured,
    variants: p.variants.map((v: any) => ({
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
    variantRiskCount,
    hiddenVariantCount,
    variantCriticalId,
    variantHiddenId,
    variantStuckId,
    variantNegativeId,
    variantUrgentReorderId,
  };
}

/**
 * @deprecated Use getAdminCatalogPage for paginated access.
 * Kept for backward compatibility with dashboard widgets and other callers.
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
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch variant intelligence for variant-level signals
  const variantEcon = await getVariantEconomicsReport();
  const variantIntel = await getVariantIntelligenceReport(undefined, variantEcon);

  return products.map((p) => mapToAdminProduct(p, variantIntel));
}

