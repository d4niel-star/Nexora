import { Star } from "lucide-react";

// ─── PDP inline review summary ──────────────────────────────────────────
// Tiny, restrained strip placed under the product title so the buyer
// sees that other real buyers have reviewed the item before scrolling
// past the decision area. The full review list lives elsewhere
// (ProductReviewsBlock); this is only the hook that says "there ARE
// reviews, here's the honest average".
//
// Non-negotiable: renders nothing unless count > 0 and averageRating is
// a real number. No "popular", no "best seller", no fake ratings, no
// "based on verified buyers" when we can't prove it.

export interface ReviewSummaryProps {
  count: number;
  averageRating: number | null;
  /** Anchor id of the full reviews block on the same page. */
  anchorHref?: string;
}

export function ReviewSummary({
  count,
  averageRating,
  anchorHref = "#reviews",
}: ReviewSummaryProps) {
  if (count <= 0 || averageRating == null) return null;

  const rounded = Math.round(averageRating * 10) / 10;
  const filledStars = Math.round(averageRating);
  const countLabel =
    count === 1 ? "1 reseña" : `${count.toLocaleString("es-AR")} reseñas`;

  return (
    <a
      href={anchorHref}
      className="mt-3 inline-flex items-center gap-2 rounded-[var(--r-xs)] text-[13px] text-ink-4 transition-colors hover:text-ink-0 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
      aria-label={`${rounded} de 5 estrellas, ${countLabel}. Ver reseñas.`}
    >
      <span className="flex items-center gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={
              n <= filledStars
                ? "h-3.5 w-3.5 fill-ink-0 text-ink-0"
                : "h-3.5 w-3.5 text-ink-7"
            }
            strokeWidth={1.5}
          />
        ))}
      </span>
      <span className="tabular font-medium text-ink-0">{rounded.toFixed(1)}</span>
      <span className="text-ink-5" aria-hidden>
        ·
      </span>
      <span className="text-ink-5 underline decoration-[color:var(--hairline-strong)] underline-offset-4">
        {countLabel}
      </span>
    </a>
  );
}
