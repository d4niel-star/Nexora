import { NexoraAIShell } from "@/components/admin/ai/NexoraAIShell";
import { getAdminCatalog } from "@/lib/store-engine/catalog/queries";
import { Package } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import CatalogClient from "@/app/admin/catalog/CatalogClient";
import type { Product } from "@/types/product";

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

export default async function AICatalogPage({ searchParams }: Props) {
  noStore();
  const adminProducts = await getAdminCatalog();
  const params = await searchParams;

  const validTabs = ["all", "active", "draft", "archived", "out_of_stock", "issues", "import"] as const;
  const tab = validTabs.includes(params.tab as any) ? (params.tab as any) : "all";

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
    channelCount: p.channelCount,
    channelSyncIssues: p.channelSyncIssues,
    firstListingId: p.firstListingId,
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
        contextIcon={<Package className="w-5 h-5 text-[#111111]" />}
      >
        <CatalogClient products={products} hideHeader initialTab={tab} />
      </NexoraAIShell>
    </div>
  );
}
