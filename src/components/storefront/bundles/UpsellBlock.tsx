import { ProductCard } from "@/components/storefront/product/ProductCard";
import type { StorefrontProduct } from "@/types/storefront";

interface Props {
  storeSlug: string;
  title: string | null;
  description: string | null;
  products: StorefrontProduct[];
}

export function UpsellBlock({ storeSlug, title, description, products }: Props) {
  if (products.length === 0) return null;

  return (
    <section
      id="upsells"
      aria-labelledby="upsells-heading"
      className="mt-16 border-t border-[color:var(--hairline-strong)] pt-14 sm:mt-20 sm:pt-16"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-5">
        Sumá al carrito
      </p>
      <h2
        id="upsells-heading"
        className="mt-3 font-semibold text-[26px] leading-[1.05] tracking-[-0.03em] text-ink-0 sm:text-[32px]"
      >
        {title ?? "Productos complementarios"}
      </h2>
      {description && (
        <p className="mt-3 max-w-2xl text-[14px] leading-[1.55] text-ink-5">
          {description}
        </p>
      )}
      <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} storeSlug={storeSlug} />
        ))}
      </div>
    </section>
  );
}
