import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoreSectionRenderer } from "@/components/storefront/sections/StoreSectionRenderer";
import { getStorefrontData } from "@/lib/store-engine/queries";
import { toMetaDescription } from "@/lib/store-engine/seo";

type StoreHomepageProps = {
  params: Promise<{ storeSlug: string }>;
};

function getHeroDescription(blocks: Array<{ blockType: string; settings: Record<string, unknown> }>): string | null {
  const heroBlock = blocks.find((block) => block.blockType === "hero");
  const subheadline = heroBlock?.settings.subheadline;

  return typeof subheadline === "string" && subheadline.trim() ? subheadline : null;
}

export async function generateMetadata({ params }: StoreHomepageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const storefrontData = await getStorefrontData(resolvedParams.storeSlug);

  if (!storefrontData) {
    return {
      title: "Tienda no encontrada",
    };
  }

  const description = toMetaDescription(
    storefrontData.store.description ?? getHeroDescription(storefrontData.homeBlocks),
    `${storefrontData.store.name} en Nexora`,
  );

  return {
    title: storefrontData.store.name,
    description,
    openGraph: {
      title: storefrontData.store.name,
      description,
      images: storefrontData.store.logo ? [{ url: storefrontData.store.logo, alt: storefrontData.store.name }] : undefined,
    },
  };
}

export default async function StoreHomepage({ params }: StoreHomepageProps) {
  const resolvedParams = await params;
  const storefrontData = await getStorefrontData(resolvedParams.storeSlug);

  if (!storefrontData) {
    notFound();
  }

  // ─── JSON-LD Store / Organization ───
  // Used by search engines for knowledge-panel and sitelinks. Only declares
  // fields actually populated in the Store model.
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const storeUrl = `${appUrl}/store/${resolvedParams.storeSlug}`;
  const storeJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: storefrontData.store.name,
    description: storefrontData.store.description ?? undefined,
    url: storeUrl,
    image: storefrontData.store.logo ?? undefined,
    logo: storefrontData.store.logo ?? undefined,
  };

  return (
    <div className="w-full">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }}
      />
      <StoreSectionRenderer
        blocks={storefrontData.homeBlocks}
        storeSlug={resolvedParams.storeSlug}
        storeId={storefrontData.store.id}
      />
    </div>
  );
}
