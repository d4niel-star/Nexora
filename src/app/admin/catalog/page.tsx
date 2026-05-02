import { getAdminCatalogPage } from "@/lib/store-engine/catalog/queries";
import { parsePositiveInt, DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import type { Product } from "@/types/product";
import CatalogClient from "./CatalogClient";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams?: Promise<{
    product?: string;
    focus?: string;
    page?: string;
    pageSize?: string;
    q?: string;
    status?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};

  const result = await getAdminCatalogPage({
    page: parsePositiveInt(params.page, 1),
    pageSize: parsePositiveInt(params.pageSize, DEFAULT_PAGE_SIZE),
    query: params.q,
    status: params.status,
  });

  // Map AdminProduct → Product type expected by UI components (drawers, badges)
  const products: Product[] = result.products.map((p) => ({
    id: p.id,
    image: p.image,
    title: p.title,
    category: p.category,
    status: p.status,
    supplier: p.supplier as Product["supplier"],
    price: p.price,
    cost: p.cost,
    costReal: p.costReal,
    margin: p.margin,
    totalStock: p.totalStock,
    updatedAt: p.createdAt,
    variants: p.variants.map((v) => ({
      id: v.id,
      sku: `${p.handle}-${v.title}`.toUpperCase().replace(/\s+/g, "-"),
      title: v.title,
      price: v.price,
      cost: p.cost,
      stock: v.stock,
      reservedStock: v.reservedStock,
      availableStock: v.stock - (v.reservedStock || 0),
    })),
    signals: p.signals,
    issueCount: p.issueCount,
    hasProvider: p.hasProvider,
    providerName: p.providerName,
    mirrorSyncStatus: p.mirrorSyncStatus,
    variantRiskCount: p.variantRiskCount,
    hiddenVariantCount: p.hiddenVariantCount,
    variantCriticalId: p.variantCriticalId,
    variantHiddenId: p.variantHiddenId,
    variantStuckId: p.variantStuckId,
    variantNegativeId: p.variantNegativeId,
    variantUrgentReorderId: p.variantUrgentReorderId,
  }));

  return (
    <CatalogClient
      products={products}
      pagination={result.pagination}
      counts={result.counts}
      focusProductId={params.product}
      focusSection={params.focus}
    />
  );
}
