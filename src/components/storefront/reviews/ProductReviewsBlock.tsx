import { Star } from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  PublicReview,
  ProductReviewAggregate,
} from "@/lib/apps/product-reviews/queries";
import { ProductReviewForm } from "./ProductReviewForm";

interface Props {
  storeSlug: string;
  productId: string;
  reviews: PublicReview[];
  aggregate: ProductReviewAggregate;
}

export function ProductReviewsBlock({
  storeSlug,
  productId,
  reviews,
  aggregate,
}: Props) {
  const hasReviews = aggregate.count > 0 && aggregate.averageRating != null;

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-heading"
      className="mt-16 border-t border-[color:var(--hairline-strong)] pt-14 sm:mt-20 sm:pt-16"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-5">
            Opiniones reales
          </p>
          <h2
            id="reviews-heading"
            className="mt-3 font-semibold text-[26px] leading-[1.05] tracking-[-0.03em] text-ink-0 sm:text-[32px]"
          >
            Reseñas de clientes
          </h2>
        </div>

        {hasReviews ? (
          <div className="flex items-center gap-3">
            <StarRating rating={aggregate.averageRating ?? 0} />
            <div className="text-[13px] text-ink-5">
              <span className="font-semibold text-ink-0 tabular-nums">
                {aggregate.averageRating?.toFixed(1)}
              </span>
              <span className="mx-1">·</span>
              <span className="tabular-nums">
                {aggregate.count} reseña{aggregate.count === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-[12px] text-ink-5">
            Sé el primero en opinar.
          </span>
        )}
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px] lg:items-start">
        {/* Reviews list */}
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="rounded-[var(--r-md)] border border-dashed border-[color:var(--hairline)] bg-[var(--surface-1)] p-8 text-center">
              <p className="text-[14px] text-ink-4">
                Este producto aún no tiene reseñas aprobadas.
              </p>
              <p className="mt-1 text-[12px] text-ink-5">
                Compartí tu experiencia usando el formulario.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li
                  key={r.id}
                  className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5"
                >
                  <div className="flex items-center gap-2">
                    <StarRating rating={r.rating} />
                    {r.verifiedPurchase && (
                      <span className="inline-flex items-center h-5 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--signal-success)]">
                        Verificada
                      </span>
                    )}
                  </div>
                  {r.title && (
                    <h3 className="mt-3 text-[15px] font-semibold text-ink-0">
                      {r.title}
                    </h3>
                  )}
                  <p className="mt-1 text-[14px] leading-[1.6] text-ink-3 whitespace-pre-wrap">
                    {r.body}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-2 text-[12px] text-ink-5">
                    <span className="font-medium text-ink-3">{r.displayName}</span>
                    <span aria-hidden>·</span>
                    <time
                      dateTime={(r.publishedAt ?? r.createdAt).toISOString()}
                      className="tabular-nums"
                    >
                      {new Intl.DateTimeFormat("es-AR", {
                        dateStyle: "medium",
                      }).format(r.publishedAt ?? r.createdAt)}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Submit form */}
        <aside>
          <ProductReviewForm storeSlug={storeSlug} productId={productId} />
        </aside>
      </div>
    </section>
  );
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${rating} de 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i <= full ? "fill-ink-0 text-ink-0" : "text-ink-6",
          )}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}
