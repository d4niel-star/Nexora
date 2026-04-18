import type { ReactNode } from "react";
import {
  CheckCircle2,
  Leaf,
  PackageCheck,
  Rabbit,
  ShieldCheck,
  Truck,
  Zap,
} from "lucide-react";

interface BenefitItem {
  title?: string;
  description?: string;
  icon?: string;
}

interface BenefitsSectionProps {
  settings: Record<string, unknown>;
}

const iconMap: Record<string, ReactNode> = {
  CheckCircle2: <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />,
  Leaf: <Leaf className="h-4 w-4" strokeWidth={1.75} />,
  PackageCheck: <PackageCheck className="h-4 w-4" strokeWidth={1.75} />,
  Rabbit: <Rabbit className="h-4 w-4" strokeWidth={1.75} />,
  ShieldCheck: <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />,
  Truck: <Truck className="h-4 w-4" strokeWidth={1.75} />,
  Zap: <Zap className="h-4 w-4" strokeWidth={1.75} />,
};

export function BenefitsSection({ settings }: BenefitsSectionProps) {
  const title = typeof settings.title === "string" ? settings.title : "Beneficios";
  const subtitle = typeof settings.subtitle === "string" ? settings.subtitle : null;
  const benefits = Array.isArray(settings.benefits) ? (settings.benefits as BenefitItem[]) : [];

  if (benefits.length === 0) return null;

  return (
    <section className="bg-[var(--surface-0)] py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="border-y border-[color:var(--hairline)] py-8 sm:py-10">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.6fr] lg:items-start lg:gap-14">
            <div className="max-w-lg">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-6">
                Compra simple
              </p>
              <h2 className="mt-3 text-[24px] font-semibold leading-[1.08] tracking-[-0.025em] text-ink-0 sm:text-[34px]">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-3 text-[14px] leading-[1.6] text-ink-5">
                  {subtitle}
                </p>
              )}
            </div>

            <div className="grid gap-0 divide-y divide-[color:var(--hairline)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {benefits.map((benefit, index) => (
                <article
                  key={`${benefit.title ?? "benefit"}-${index}`}
                  className="py-5 first:pt-0 last:pb-0 sm:px-6 sm:py-0 sm:first:pl-0 sm:last:pr-0"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-3">
                      {benefit.icon && iconMap[benefit.icon] ? iconMap[benefit.icon] : <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />}
                    </div>
                    <div className="min-w-0">
                      {benefit.title && (
                        <h3 className="text-[14px] font-semibold leading-snug tracking-[-0.01em] text-ink-0">
                          {benefit.title}
                        </h3>
                      )}
                      {benefit.description && (
                        <p className="mt-1.5 text-[13px] leading-[1.55] text-ink-5">
                          {benefit.description}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
