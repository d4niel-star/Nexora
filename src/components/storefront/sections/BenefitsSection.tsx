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
    <section className="bg-ink-0 py-20 text-ink-12 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.4fr] lg:gap-16">
          <div className="max-w-xl">
            <p className="text-eyebrow text-ink-6">Sistema de confianza</p>
            <h2 className="mt-4 font-semibold text-[32px] leading-[1.02] tracking-[-0.03em] text-ink-12 sm:text-[48px]">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-4 text-[15px] leading-[1.6] text-ink-7">
                {subtitle}
              </p>
            )}
          </div>

          <div className="grid gap-px overflow-hidden rounded-[var(--r-sm)] border border-ink-12/10 bg-ink-12/10 sm:grid-cols-3">
            {benefits.map((benefit, index) => (
              <article
                key={`${benefit.title ?? "benefit"}-${index}`}
                className="min-h-[190px] bg-ink-0 p-5 transition-colors hover:bg-ink-1 sm:p-6"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-[var(--r-sm)] border border-ink-12/10 bg-ink-12/[0.03] text-ink-12">
                  {benefit.icon && iconMap[benefit.icon] ? iconMap[benefit.icon] : <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />}
                </div>
                {benefit.title && (
                  <h3 className="mt-8 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-ink-12">
                    {benefit.title}
                  </h3>
                )}
                {benefit.description && (
                  <p className="mt-2 text-[13px] leading-[1.55] text-ink-7">
                    {benefit.description}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
