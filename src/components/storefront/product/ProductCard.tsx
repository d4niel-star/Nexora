import Link from "next/link";
import { StorefrontProduct } from "@/types/storefront";
import { formatCurrency } from "@/lib/utils";
import { storePath } from "@/lib/store-engine/urls";

// ─── Product Card ───
// Editorial 4/5 frame, a single surfaced badge (uses the first one if the
// product ships multiple), and a quiet hover that underlines the title rather
// than overlaying a "Vista rápida" blur. No data is invented — everything
// rendered here comes straight from StorefrontProduct.

export function ProductCard({
  product,
  storeSlug,
}: {
  product: StorefrontProduct;
  storeSlug: string;
}) {
  const primaryBadge = product.badges[0];
  const hasCompare =
    typeof product.compareAtPrice === "number" && product.compareAtPrice > product.price;

  return (
    <Link
      href={storePath(storeSlug, `products/${product.handle}`)}
      className="group block rounded-[var(--r-md)] outline-none focus-visible:shadow-[var(--shadow-focus)]"
    >
      <div className="relative overflow-hidden rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-2)]">
        <div className="aspect-[4/5] w-full">
          {product.featuredImage ? (
            <img
              src={product.featuredImage}
              alt={product.title}
              className="h-full w-full object-cover transition-transform duration-[600ms] ease-[var(--ease-out)] group-hover:scale-[1.035]"
            />
          ) : (
            <div
              aria-hidden
              className="flex h-full w-full items-center justify-center bg-[var(--surface-3)]"
            >
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-6">
                Sin imagen
              </span>
            </div>
          )}
        </div>

        {primaryBadge && (
          <span className="absolute left-3 top-3 inline-flex items-center rounded-full border border-[color:var(--hairline)] bg-[var(--surface-0)]/95 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-0 backdrop-blur-[6px]">
            {primaryBadge}
          </span>
        )}

        {!product.inStock && (
          <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-ink-0/80 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-12 backdrop-blur-[6px]">
            Sin stock
          </span>
        )}
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-medium text-ink-0 decoration-[color:var(--hairline-strong)] underline-offset-4 group-hover:underline">
            {product.title}
          </h3>
          {product.brand && (
            <p className="mt-0.5 truncate text-[12px] text-ink-5">{product.brand}</p>
          )}
        </div>

        <div className="text-right">
          <p className="tabular text-[14px] font-medium text-ink-0">
            {formatCurrency(product.price)}
          </p>
          {hasCompare && (
            <p className="tabular text-[12px] text-ink-6 line-through">
              {formatCurrency(product.compareAtPrice as number)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
