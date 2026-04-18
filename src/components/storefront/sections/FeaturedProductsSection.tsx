import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/storefront/product/ProductCard";
import { StorefrontProduct } from "@/types/storefront";
import { storePath } from "@/lib/store-engine/urls";

// ─── Featured Products Section ───
// Editorial typography (display title) + tighter grid that scales from 1 col
// on mobile → 2 on tablet → 4 on desktop. The mobile CTA becomes a subtle
// full-width rail instead of a Shopify-style shout button.

export function FeaturedProductsSection({
  settings,
  products,
  storeSlug,
}: {
  settings: Record<string, any>;
  products: StorefrontProduct[];
  storeSlug: string;
}) {
  return (
    <section className="bg-[var(--surface-1)] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <h2 className="font-display text-[32px] leading-[1.02] tracking-[-0.015em] text-ink-0 sm:text-[44px]">
              {settings.title}
            </h2>
            {settings.subtitle && (
              <p className="mt-2 max-w-lg text-[14px] leading-[1.55] text-ink-5">
                {settings.subtitle}
              </p>
            )}
          </div>
          <Link
            href={storePath(storeSlug, "collections")}
            className="hidden items-center gap-1.5 text-[13px] font-medium text-ink-0 transition-colors hover:text-ink-4 sm:inline-flex"
          >
            Ver colección
            <ArrowRight className="h-[14px] w-[14px]" strokeWidth={1.75} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} storeSlug={storeSlug} />
          ))}
        </div>

        <div className="mt-12 flex justify-center sm:hidden">
          <Link
            href={storePath(storeSlug, "collections")}
            className="inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-full border border-[color:var(--hairline-strong)] bg-transparent px-6 text-[14px] font-medium text-ink-0 transition-colors hover:bg-ink-11"
          >
            Ver toda la colección
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </section>
  );
}
