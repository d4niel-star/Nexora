import Link from "next/link";
import { StorefrontProduct } from "@/types/storefront";
import { formatCurrency } from "@/lib/utils";
import { storePath } from "@/lib/store-engine/urls";

// ─── Product Card ───
// 4/5 frame, real badges/stock only. Quiet commerce typography.

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
      className="group block rounded-[var(--r-lg)] outline-none focus-visible:shadow-[var(--shadow-focus)]"
    >
      <div className="relative overflow-hidden rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-soft)] transition-all duration-[var(--dur-slow)] ease-[var(--ease-out)] group-hover:border-[color:var(--hairline-strong)] group-hover:shadow-[var(--shadow-elevated)]">
        <div className="aspect-[4/5] w-full">
          {product.featuredImage ? (
            <img
              src={product.featuredImage}
              alt={product.title}
              className="h-full w-full object-cover transition-opacity duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:opacity-[0.96]"
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
          <span className="absolute left-3 top-3 inline-flex items-center rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-0">
            {primaryBadge}
          </span>
        )}

        {!product.inStock && (
          <span className="absolute right-3 top-3 inline-flex items-center rounded-[var(--r-xs)] bg-ink-0 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-12">
            Sin stock
          </span>
        )}
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-semibold tracking-[-0.01em] text-ink-0 decoration-[color:var(--hairline-strong)] underline-offset-4 group-hover:underline">
            {product.title}
          </h3>
          {product.brand && (
            <p className="mt-1 truncate text-[12px] text-ink-5">{product.brand}</p>
          )}
        </div>

        <div className="text-right">
          <p className="tabular text-[15px] font-semibold text-ink-0">{formatCurrency(product.price)}</p>
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
