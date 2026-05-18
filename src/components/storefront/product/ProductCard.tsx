import Link from "next/link";
import { StorefrontProduct } from "@/types/storefront";
import { formatCurrency } from "@/lib/utils";
import { storePath } from "@/lib/store-engine/urls";

// ─── Product Card Pro ───
// Premium card with smooth hover lift, secondary image crossfade,
// discount badge, and improved spacing hierarchy.
// Performance: pure CSS transitions, no JS animation library.
// Mobile: no hover dependency, touch-friendly tap targets.

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
  const discountPct = hasCompare
    ? Math.round(100 - (product.price / (product.compareAtPrice as number)) * 100)
    : null;
  const hasSecondaryImage = product.images.length > 1;
  const secondaryImage = hasSecondaryImage ? product.images[1] : null;

  return (
    <Link
      href={storePath(storeSlug, `products/${product.handle}`)}
      className="group block outline-none focus-visible:shadow-[var(--shadow-focus)]"
      style={{ borderRadius: "var(--theme-radius-cards, var(--r-lg))" }}
    >
      {/* Image container */}
      <div
        className="relative overflow-hidden border border-[color:var(--hairline)] bg-[var(--surface-0)] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:border-[color:var(--hairline-strong)] group-hover:-translate-y-[var(--theme-card-lift,2px)]"
        style={{
          borderRadius: "var(--theme-radius-cards, var(--r-lg))",
          boxShadow: "var(--theme-shadow-cards, var(--shadow-soft))",
        }}
      >
        <div className="aspect-[4/5] w-full overflow-hidden">
          {product.featuredImage ? (
            <div className="relative h-full w-full">
              {/* Primary image */}
              <img
                src={product.featuredImage}
                alt={product.title}
                loading="lazy"
                className={
                  "h-full w-full object-cover transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[var(--theme-image-hover-zoom,1.03)]" +
                  (hasSecondaryImage ? " group-hover:opacity-0" : "")
                }
              />
              {/* Secondary image crossfade on hover (desktop only) */}
              {secondaryImage && (
                <img
                  src={secondaryImage}
                  alt=""
                  loading="lazy"
                  aria-hidden
                  className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:opacity-100"
                />
              )}
            </div>
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

        {/* Badges — top-left */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {primaryBadge && (
            <span className="inline-flex items-center rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-0)]/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-0 backdrop-blur-sm">
              {primaryBadge}
            </span>
          )}
          {discountPct !== null && discountPct > 0 && (
            <span className="inline-flex items-center rounded-[var(--r-xs)] bg-ink-0 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-12">
              −{discountPct}%
            </span>
          )}
        </div>

        {/* Out of stock */}
        {!product.inStock && (
          <span className="absolute right-3 top-3 inline-flex items-center rounded-[var(--r-xs)] bg-ink-0/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-12 backdrop-blur-sm">
            Sin stock
          </span>
        )}
      </div>

      {/* Product info */}
      <div className="mt-4 px-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[14px] font-semibold tracking-[-0.01em] text-ink-0 transition-colors group-hover:text-ink-3">
              {product.title}
            </h3>
            {product.brand && (
              <p className="mt-1 truncate text-[12px] text-ink-5">{product.brand}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="tabular text-[15px] font-semibold text-ink-0">
              {formatCurrency(product.price)}
            </p>
            {hasCompare && (
              <p className="tabular mt-0.5 text-[12px] text-ink-6 line-through">
                {formatCurrency(product.compareAtPrice as number)}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
