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
    <section className="bg-[var(--surface-1)] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-9 flex flex-col gap-4 border-b border-[color:var(--hairline)] pb-6 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-6">
              Experiencia de compra
            </p>
            <h2 className="mt-3 text-[28px] font-semibold leading-[1.06] tracking-[-0.025em] text-ink-0 sm:text-[40px]">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-3 text-[14px] leading-[1.6] text-ink-5">
                {subtitle}
              </p>
            )}
          </div>
          <p className="text-[12px] font-medium text-ink-6">
            Opiniones cargadas por la tienda
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.map((testimonial, index) => {
            const rating = clampRating(testimonial.rating);
            const initial = testimonial.name?.trim().charAt(0).toUpperCase() || "N";

            return (
              <article
                key={`${testimonial.name ?? "testimonial"}-${index}`}
                className="flex min-h-[230px] flex-col rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 transition-colors hover:border-[color:var(--hairline-strong)] sm:p-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {testimonial.avatar ? (
                      <img
                        src={testimonial.avatar}
                        alt=""
                        className="h-8 w-8 rounded-[var(--r-sm)] object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-[var(--r-sm)] bg-[var(--surface-2)] text-[12px] font-semibold text-ink-4">
                        {initial}
                      </div>
                    )}
                    <p className="truncate text-[13px] font-semibold text-ink-0">
                      {testimonial.name || "Cliente"}
                    </p>
                  </div>
                  {rating > 0 && (
                    <div className="flex gap-0.5" aria-label={`${rating} de 5`}>
                      {Array.from({ length: 5 }).map((_, starIndex) => (
                        <Star
                          key={starIndex}
                          className={starIndex < rating ? "h-3 w-3 fill-ink-0 text-ink-0" : "h-3 w-3 text-ink-8"}
                          strokeWidth={1.75}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {testimonial.text && (
                  <p className="mt-8 text-[15px] leading-[1.65] tracking-[-0.01em] text-ink-2">
                    &ldquo;{testimonial.text}&rdquo;
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
