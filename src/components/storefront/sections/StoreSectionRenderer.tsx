import type { BlockType } from "@/types/store-engine";
import { HeroSection } from "@/components/storefront/sections/HeroSection";
import { BenefitsSection } from "@/components/storefront/sections/BenefitsSection";
import { FeaturedProductsSection } from "@/components/storefront/sections/FeaturedProductsSection";
import { FeaturedCategoriesSection } from "@/components/storefront/sections/FeaturedCategoriesSection";
import { TestimonialsSection } from "@/components/storefront/sections/TestimonialsSection";
import { FaqSection } from "@/components/storefront/sections/FaqSection";
import { NewsletterSection } from "@/components/storefront/sections/NewsletterSection";
import { getStoreProducts, getStoreCollections } from "@/lib/store-engine/catalog/queries";

interface BlockData {
  id: string;
  blockType: BlockType;
  sortOrder: number;
  settings: Record<string, unknown>;
  source: string;
}

interface StoreSectionRendererProps {
  blocks: BlockData[];
  storeSlug: string;
  storeId?: string;
}

export async function StoreSectionRenderer({ blocks, storeSlug, storeId }: StoreSectionRendererProps) {
  const hasProductsBlock = blocks.some(b => b.blockType === "featured_products");
  const hasCategoriesBlock = blocks.some(b => b.blockType === "featured_categories");

  const products = (storeId && hasProductsBlock) ? await getStoreProducts(storeId) : [];
  const collections = (storeId && hasCategoriesBlock) ? await getStoreCollections(storeId) : [];
  return (
    <div className="flex flex-col">
      {blocks.map((block) => {
        switch (block.blockType) {
          case "hero":
            return <HeroSection key={block.id} settings={block.settings} storeSlug={storeSlug} />;
          case "benefits":
            return <BenefitsSection key={block.id} settings={block.settings} />;
          case "featured_products": {
            const handles = (block.settings.productHandles as string[]) ?? [];
            const featured = products.filter((p) =>
              handles.includes(p.handle)
            );
            return (
              <FeaturedProductsSection
                key={block.id}
                settings={block.settings}
                products={featured}
                storeSlug={storeSlug}
              />
            );
          }
          case "featured_categories": {
            const collectionHandles = (block.settings.collectionHandles as string[]) ?? [];
            const featuredCols = collections.filter((c) => collectionHandles.includes(c.handle));
            
            return (
              <FeaturedCategoriesSection
                key={block.id}
                settings={block.settings}
                storeSlug={storeSlug}
                collections={featuredCols}
              />
            );
          }
          case "testimonials":
            return <TestimonialsSection key={block.id} settings={block.settings} />;
          case "faq":
            return <FaqSection key={block.id} settings={block.settings} />;
          case "newsletter":
            return <NewsletterSection key={block.id} settings={block.settings} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
