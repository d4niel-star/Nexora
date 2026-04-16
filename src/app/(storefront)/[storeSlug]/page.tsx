import { StoreSectionRenderer } from "@/components/storefront/sections/StoreSectionRenderer";
import { getStorefrontData } from "@/lib/store-engine/queries";


export default async function StoreHomepage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const resolvedParams = await params;
  const storefrontData = await getStorefrontData(resolvedParams.storeSlug);

  const blocks = storefrontData?.homeBlocks ?? [];

  return (
    <div className="w-full">
      <StoreSectionRenderer blocks={blocks} storeSlug={resolvedParams.storeSlug} storeId={storefrontData?.store.id} />
    </div>
  );
}
