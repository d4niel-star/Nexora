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
    <section className="border-y border-[color:var(--hairline-strong)] bg-[var(--surface-0)] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-16">
          <div className="max-w-lg">
            <div className="mb-5 h-px w-10 bg-[var(--accent-500)]" aria-hidden />
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-5">
              Compra simple
            </p>
            <h2 className="mt-4 text-[28px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink-0 sm:text-[38px]">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-4 text-[14px] leading-[1.65] text-ink-5 sm:text-[15px]">
                {subtitle}
              </p>
            )}
          </div>

          <div className="grid gap-0 divide-y divide-[color:var(--hairline)] rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-1)] shadow-[var(--shadow-soft)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {benefits.map((benefit, index) => (
              <article
                key={`${benefit.title ?? "benefit"}-${index}`}
                className="px-5 py-6 first:pt-6 last:pb-6 sm:px-6 sm:py-8 sm:first:pl-6 sm:last:pr-6"
              >
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] text-ink-4 shadow-[var(--shadow-soft)]">
                    {benefit.icon && iconMap[benefit.icon] ? iconMap[benefit.icon] : <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />}
                  </div>
                  <div className="min-w-0">
                    {benefit.title && (
                      <h3 className="text-[14px] font-semibold leading-snug tracking-[-0.015em] text-ink-0">
                        {benefit.title}
                      </h3>
                    )}
                    {benefit.description && (
                      <p className="mt-2 text-[13px] leading-[1.6] text-ink-5">
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
    </section>
  );
}
