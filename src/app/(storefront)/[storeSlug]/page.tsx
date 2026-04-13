import { StoreSectionRenderer } from "@/components/storefront/sections/StoreSectionRenderer";
import { getStorefrontData } from "@/lib/store-engine/queries";
import { MOCK_STOREFRONT_BLOCKS } from "@/lib/mocks/storefront";

export default async function StoreHomepage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const resolvedParams = await params;
  const storefrontData = await getStorefrontData(resolvedParams.storeSlug);

  // Use real blocks from DB, or fallback to mocks
  const blocks = storefrontData?.homeBlocks ?? MOCK_STOREFRONT_BLOCKS.map((b, i) => ({
    id: b.id,
    blockType: b.type,
    sortOrder: i,
    settings: b.settings,
    source: "mock" as const,
  }));

  return (
    <div className="w-full">
      <StoreSectionRenderer blocks={blocks} storeSlug={resolvedParams.storeSlug} storeId={storefrontData?.store.id} />
    </div>
  );
}
