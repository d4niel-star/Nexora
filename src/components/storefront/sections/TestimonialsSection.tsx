import { Star } from "lucide-react";

interface TestimonialItem {
  name?: string;
  text?: string;
  rating?: number;
  avatar?: string;
}

interface TestimonialsSectionProps {
  settings: Record<string, unknown>;
}

function clampRating(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(5, Math.round(value)));
}

export function TestimonialsSection({ settings }: TestimonialsSectionProps) {
  const title = typeof settings.title === "string" ? settings.title : "Testimonios";
  const subtitle = typeof settings.subtitle === "string" ? settings.subtitle : null;
  const testimonials = Array.isArray(settings.testimonials)
    ? (settings.testimonials as TestimonialItem[]).filter((item) => item.text || item.name)
    : [];

  if (testimonials.length === 0) return null;

  return (
    <section className="bg-[var(--surface-1)] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl sm:mb-14">
          <p className="text-eyebrow">Prueba social</p>
          <h2 className="mt-4 font-semibold text-[32px] leading-[1.02] tracking-[-0.03em] text-ink-0 sm:text-[48px]">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-4 text-[15px] leading-[1.6] text-ink-5">
              {subtitle}
            </p>
          )}
        </div>

        <div className="grid gap-px overflow-hidden rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[color:var(--hairline)] md:grid-cols-3">
          {testimonials.map((testimonial, index) => {
            const rating = clampRating(testimonial.rating);
            const initial = testimonial.name?.trim().charAt(0).toUpperCase() || "N";

            return (
              <article
                key={`${testimonial.name ?? "testimonial"}-${index}`}
                className="flex min-h-[260px] flex-col bg-[var(--surface-0)] p-5 transition-colors hover:bg-[var(--surface-2)] sm:p-6"
              >
                {rating > 0 && (
                  <div className="flex gap-1" aria-label={`${rating} de 5`}>
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <Star
                        key={starIndex}
                        className={starIndex < rating ? "h-3.5 w-3.5 fill-ink-0 text-ink-0" : "h-3.5 w-3.5 text-ink-8"}
                        strokeWidth={1.75}
                      />
                    ))}
                  </div>
                )}

                {testimonial.text && (
                  <p className="mt-8 text-[15px] leading-[1.65] tracking-[-0.01em] text-ink-2">
                    &ldquo;{testimonial.text}&rdquo;
                  </p>
                )}

                <div className="mt-auto flex items-center gap-3 pt-8">
                  {testimonial.avatar ? (
                    <img
                      src={testimonial.avatar}
                      alt=""
                      className="h-9 w-9 rounded-[var(--r-sm)] object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-2)] text-[12px] font-semibold text-ink-4">
                      {initial}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink-0">
                      {testimonial.name || "Cliente"}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
