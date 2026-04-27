import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLAN_DEFINITIONS } from "@/lib/billing/plans";
import { PageReveal, Reveal, StaggerGroup, StaggerItem } from "@/components/public/PublicMotion";

// ─── Pricing ──────────────────────────────────────────────────────────────
// Restructured to share the home's editorial language: numbered section
// rule, jumbo display, hairline-separated plan cards on a single rail
// instead of three centered "marketing" cards on a flat background.

const PLAN_FEATURES: Record<string, { tagline: string; features: readonly string[] }> = {
  core: {
    tagline:
      "Todo lo necesario para lanzar tu marca con una experiencia profesional.",
    features: [
      "Dominio personalizado",
      "Branding avanzado para tu tienda",
      "Checkout sin fricción (Mercado Pago)",
      "Gestión de catálogo, stock e inventario",
      "Reseñas de producto públicas",
      "Soporte para 150 productos",
      "Hasta 100 ventas mensuales",
      "150 créditos IA / mes",
      "2 usuarios",
    ],
  },
  growth: {
    tagline:
      "El motor de crecimiento y automatización más elegido para escalar.",
    features: [
      "Todo lo incluido en Core",
      "Recuperación automática por WhatsApp",
      "Cross-sell, upsells y bundles automáticos",
      "Flujos de email para fomentar recompra",
      "AI Builder (Tiendas e identidad con IA)",
      "Carriers y logística avanzada",
      "Ventas ilimitadas, sin tope",
      "Hasta 1.500 productos",
      "750 créditos IA / mes",
      "5 usuarios",
    ],
  },
  scale: {
    tagline:
      "Operación avanzada, alto volumen, sourcing predictivo y multi-tienda.",
    features: [
      "Todo lo incluido en Growth",
      "Sourcing avanzado y predicción de stock",
      "Hasta 3 tiendas unificadas en una cuenta",
      "Productos y ventas ilimitadas",
      "BYOK — tu propia clave de IA si preferís",
      "3.000 créditos IA / mes",
      "15 usuarios",
      "Operación sin límites",
    ],
  },
};

export default function PricingPage() {
  const formatPrice = (value: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <>
      {/* ─── Hero ───────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden border-b border-[color:var(--hairline)] bg-[var(--surface-paper)]">
        <div aria-hidden className="canvas-grid absolute inset-0 -z-10 opacity-50" />
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <PageReveal>
            <div className="section-rule">
              <span>00</span>
              <span>Planes · ARS · sin compromiso anual</span>
            </div>
            <h1 className="mt-10 max-w-[20ch] text-[44px] font-semibold leading-[1.04] tracking-[-0.04em] text-ink-0 sm:text-[64px]">
              Una estructura clara.
              <br />
              <span className="text-ink-5">Un precio proporcional.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-[16px] leading-[1.65] text-ink-4">
              Facturación mensual en ARS. Sin tarjeta para empezar, sin
              compromiso anual. Escalá cuando tu operación lo necesite.
            </p>
          </PageReveal>
        </div>
      </section>

      {/* ─── Plans ──────────────────────────────────────────────────── */}
      <section className="bg-[var(--surface-1)]">
        <div className="mx-auto max-w-7xl px-5 pb-24 pt-16 sm:px-8 sm:pb-32 sm:pt-20">
          <StaggerGroup className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
            {PLAN_DEFINITIONS.map((plan) => {
              const meta = PLAN_FEATURES[plan.code];
              const isHighlight = plan.highlight;

              return (
                <StaggerItem key={plan.code}>
                  <article
                    className={cn(
                      "relative flex h-full flex-col rounded-[var(--r-xl)] border bg-[var(--surface-paper)] p-7 shadow-[var(--shadow-soft)] transition-[box-shadow,border-color] hover:shadow-[var(--shadow-elevated)] sm:p-8",
                      isHighlight
                        ? "border-[color:var(--brand)]"
                        : "border-[color:var(--card-border)]",
                    )}
                  >
                    {isHighlight && (
                      <span className="absolute -top-3 left-7 inline-flex h-6 items-center rounded-full bg-[var(--brand)] px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-ink)]">
                        Recomendado
                      </span>
                    )}

                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-5">
                          Plan
                        </span>
                        <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.025em] text-ink-0">
                          {plan.name}
                        </h2>
                        <p className="mt-2 max-w-sm text-[13px] leading-[1.55] text-ink-5">
                          {meta?.tagline}
                        </p>
                      </div>
                    </div>

                    <div className="mt-7 border-t border-[color:var(--hairline)] pt-6">
                      <div className="flex items-baseline gap-1.5">
                        <span className="tabular text-[36px] font-semibold leading-none tracking-[-0.03em] text-ink-0 sm:text-[42px]">
                          {formatPrice(plan.monthlyPrice)}
                        </span>
                        <span className="text-[12px] text-ink-5">/mes</span>
                      </div>
                    </div>

                    <div className="mt-7">
                      <Link
                        href="/home/register"
                        className={cn(
                          "group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
                          isHighlight
                            ? "bg-[var(--brand)] text-[var(--brand-ink)] hover:bg-[var(--brand-hover)]"
                            : "border border-[color:var(--hairline-strong)] bg-[var(--surface-paper)] text-ink-0 hover:bg-[var(--surface-2)]",
                        )}
                      >
                        {plan.code === "core"
                          ? "Empezar con Core"
                          : `Elegir ${plan.name}`}
                        <ArrowRight
                          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                          strokeWidth={1.75}
                        />
                      </Link>
                    </div>

                    <div className="mt-7 border-t border-[color:var(--hairline)] pt-6">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-5">
                        Incluye
                      </span>
                      <ul role="list" className="mt-4 space-y-2.5">
                        {meta?.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2.5">
                            <Check
                              className="mt-[3px] h-3.5 w-3.5 shrink-0 text-ink-3"
                              strokeWidth={2}
                            />
                            <span className="text-[13px] leading-[1.55] text-ink-3">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                </StaggerItem>
              );
            })}
          </StaggerGroup>
        </div>
      </section>

      {/* ─── Footer note ────────────────────────────────────────────── */}
      <section className="bg-[var(--surface-paper)]">
        <div className="mx-auto max-w-3xl px-5 py-14 text-center sm:px-8 sm:py-16">
          <Reveal>
            <p className="text-[13.5px] leading-[1.6] text-ink-4">
              Todos los planes incluyen storefront, checkout con Mercado Pago y
              soporte por email.
            </p>
            <p className="mt-3 text-[13.5px] leading-[1.6] text-ink-5">
              Necesitás una configuración a medida?{" "}
              <a
                href="mailto:ventas@nexora.io"
                className="font-medium text-ink-0 underline decoration-[color:var(--hairline-strong)] underline-offset-4 transition-colors hover:decoration-ink-0"
              >
                ventas@nexora.io
              </a>
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
