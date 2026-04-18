import { getAdminCatalog } from "@/lib/store-engine/catalog/queries";
import type { Product } from "@/types/product";
import CatalogClient from "./CatalogClient";

export default async function CatalogPage({ searchParams }: { searchParams?: Promise<{ product?: string; focus?: string }> }) {
  const params = searchParams ? await searchParams : undefined;
  const adminProducts = await getAdminCatalog();

  // Map AdminProduct → Product type expected by UI components (drawers, badges)
  const products: Product[] = adminProducts.map((p) => ({
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

  return <CatalogClient products={products} focusProductId={params?.product} focusSection={params?.focus} />;
}
