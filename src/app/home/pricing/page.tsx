import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { DisplayText, Hairline, Surface } from "@/components/ui/primitives";
import { PLAN_DEFINITIONS } from "@/lib/billing/plans";
import {
  PageReveal,
  Reveal,
  StaggerGroup,
  StaggerItem,
} from "@/components/public/PublicMotion";

const PLAN_FEATURES: Record<string, { tagline: string; features: string[] }> = {
  core: {
    tagline: "Todo lo necesario para lanzar tu marca con una experiencia profesional.",
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
    tagline: "El motor de crecimiento y automatización más elegido para escalar.",
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
    tagline: "Operación avanzada, alto volumen, sourcing predictivo y multi-tienda.",
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
      <section className="mx-auto flex min-h-[48vh] max-w-5xl items-center justify-center px-5 py-20 text-center sm:px-8 sm:py-28">
        <PageReveal className="max-w-4xl">
          <div className="mx-auto mb-6 h-px w-10 bg-[var(--accent-500)]" aria-hidden />
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-5">
            Planes
          </p>
          <DisplayText as="h1" size="lg" className="mt-6 text-center">
            Una estructura clara.
            <br />
            <span className="text-ink-5">Un precio proporcional.</span>
          </DisplayText>
          <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-[1.65] text-ink-4">
            Facturacion mensual en ARS. Sin compromiso anual. Escala cuando tu
            operacion lo necesite.
          </p>
        </PageReveal>
      </section>

      <Hairline />

      <section className="mx-auto max-w-7xl px-5 pb-20 pt-4 sm:px-8 sm:pb-24">
        <StaggerGroup className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
          {PLAN_DEFINITIONS.map((plan) => {
            const meta = PLAN_FEATURES[plan.code];
            const isHighlight = plan.highlight;

            return (
              <StaggerItem key={plan.code}>
                <Surface
                  level={0}
                  hairline
                  radius="lg"
                  className={cn(
                    "flex h-full flex-col p-6 shadow-[var(--shadow-soft)] transition-[box-shadow,transform] duration-[var(--dur-base)] hover:shadow-[var(--shadow-elevated)] sm:p-7",
                    isHighlight &&
                      "border-[color:var(--accent-400)]/40 bg-[var(--accent-50)] ring-1 ring-[color:var(--accent-500)]/20",
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink-0">
                        {plan.name}
                      </h2>
                      <p className="mt-2 text-[13px] leading-[1.55] text-ink-5">
                        {meta?.tagline}
                      </p>
                    </div>
                    {isHighlight && (
                      <span className="inline-flex h-6 items-center rounded-full border border-[color:var(--hairline)] bg-[var(--surface-0)] px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-4">
                        Recomendado
                      </span>
                    )}
                  </div>

                  <div className="mt-6 border-t border-[color:var(--hairline)] pt-5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="tabular text-[30px] font-semibold tracking-[-0.03em] text-ink-0">
                        {formatPrice(plan.monthlyPrice)}
                      </span>
                      <span className="text-[12px] text-ink-5">/mes</span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Link
                      href="/home/register"
                      className={cn(
                        "group inline-flex h-12 min-h-12 w-full items-center justify-center gap-1.5 rounded-full text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
                        isHighlight
                          ? "bg-ink-0 text-ink-12 hover:bg-ink-2"
                          : "border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-ink-0 hover:bg-[var(--surface-2)]",
                      )}
                    >
                      {plan.code === "core" ? "Empezar con Core" : `Elegir ${plan.name}`}
                      <ArrowRight
                        className="h-3.5 w-3.5 transition-transform duration-[var(--dur-base)] group-hover:translate-x-0.5"
                        strokeWidth={1.75}
                      />
                    </Link>
                  </div>

                  <div className="mt-6 border-t border-[color:var(--hairline)] pt-5">
                    <ul role="list" className="space-y-2.5">
                      {meta?.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5">
                          <Check
                            className="mt-[2px] h-3.5 w-3.5 shrink-0 text-ink-4"
                            strokeWidth={2}
                          />
                          <span className="text-[13px] leading-[1.55] text-ink-4">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Surface>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-8 text-center sm:px-8 sm:py-12">
        <Reveal>
          <p className="text-[13px] leading-[1.6] text-ink-5">
            Todos los planes incluyen storefront, checkout con Mercado Pago y soporte por email.
          </p>
          <p className="mt-3 text-[13px] text-ink-5">
            Necesitas una configuracion a medida?{" "}
            <a
              href="mailto:ventas@nexora.io"
              className="font-medium text-ink-0 underline decoration-[color:var(--hairline-strong)] underline-offset-4 hover:decoration-ink-0"
            >
              ventas@nexora.io
            </a>
          </p>
        </Reveal>
      </section>
    </>
  );
}
