import { NexoraAIShell } from "@/components/admin/ai/NexoraAIShell";
import { getAdminCatalogPage } from "@/lib/store-engine/catalog/queries";
import { Package } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import CatalogClient from "@/app/admin/catalog/CatalogClient";
import type { Product } from "@/types/product";

interface Props {
  searchParams: Promise<{ tab?: string; page?: string; q?: string; status?: string }>;
}

export default async function AICatalogPage({ searchParams }: Props) {
  noStore();
  const params = await searchParams;

  const result = await getAdminCatalogPage({
    page: params.page ? parseInt(params.page, 10) : 1,
    status: params.status ?? params.tab,
    query: params.q,
  });

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
    <div className="h-[calc(100vh-8rem)]">
      <NexoraAIShell
        contextName="Catálogo & Calidad"
        contextIcon={<Package className="w-5 h-5 text-ink-0" />}
      >
        <CatalogClient products={products} pagination={result.pagination} counts={result.counts} hideHeader />
      </NexoraAIShell>
    </div>
  );
}
