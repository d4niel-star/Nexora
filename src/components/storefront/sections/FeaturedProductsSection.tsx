import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/storefront/product/ProductCard";
import { StorefrontProduct } from "@/types/storefront";
import { storePath } from "@/lib/store-engine/urls";

// ─── Featured Products Section ───
// Editorial grid + restrained CTA rail — data from CMS/settings unchanged.

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
    <section className="border-t border-[color:var(--hairline-strong)] bg-[var(--surface-1)] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-8 sm:mb-14 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-5 h-px w-10 bg-[var(--accent-500)]" aria-hidden />
            <h2 className="font-semibold text-[32px] leading-[1.05] tracking-[-0.035em] text-ink-0 sm:text-[44px]">
              {settings.title}
            </h2>
            {settings.subtitle && (
              <p className="mt-3 max-w-lg text-[14px] leading-[1.6] text-ink-5 sm:text-[15px]">
                {settings.subtitle}
              </p>
            )}
          </div>
          <Link
            href={storePath(storeSlug, "collections")}
            className="hidden shrink-0 items-center gap-2 rounded-[var(--r-md)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-4 py-2.5 text-[13px] font-medium text-ink-0 shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] sm:inline-flex sm:min-h-11"
          >
            Ver colección
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} storeSlug={storeSlug} />
          ))}
        </div>

        <div className="mt-14 flex justify-center sm:hidden">
          <Link
            href={storePath(storeSlug, "collections")}
            className="inline-flex h-12 min-h-12 w-full max-w-md items-center justify-center gap-2 rounded-[var(--r-md)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-6 text-[14px] font-medium text-ink-0 shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
          >
            Ver toda la colección
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </section>
  );
}
