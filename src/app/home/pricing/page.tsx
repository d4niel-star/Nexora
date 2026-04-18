import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { DisplayText, Hairline, Surface } from "@/components/ui/primitives";
import { PLAN_DEFINITIONS } from "@/lib/billing/plans";

const PLAN_FEATURES: Record<string, { tagline: string; features: string[] }> = {
  core: {
    tagline: "Catalogo, inventario y ventas en un solo sistema.",
    features: [
      "Catalogo e inventario centralizado",
      "Storefront con checkout integrado",
      "Dashboard operativo",
      "Dominio personalizado",
      "Branding avanzado",
      "100 creditos IA / mes",
      "Hasta 100 productos",
      "Hasta 50 ventas / mes",
      "2 usuarios",
    ],
  },
  growth: {
    tagline: "IA aplicada, command center y workflows de resolucion.",
    features: [
      "Todo en Core",
      "AI Hub completo",
      "Command Center",
      "Variant Intelligence",
      "Variant Economics",
      "Replenishment Intelligence",
      "Pricing y cost review workflows",
      "Carriers y logistica avanzada",
      "500 creditos IA / mes",
      "Hasta 1.000 productos",
      "Ventas ilimitadas",
      "5 usuarios",
    ],
  },
  scale: {
    tagline: "Volumen, equipo y operacion comercial intensiva.",
    features: [
      "Todo en Growth",
      "Productos ilimitados",
      "Ventas ilimitadas",
      "BYOK, tu propia clave de IA",
      "2.000 creditos IA / mes",
      "Operacion centralizada avanzada",
      "15 usuarios",
    ],
  },
  enterprise: {
    tagline: "Infraestructura a medida para operacion compleja.",
    features: [
      "Todo en Scale",
      "Volumenes custom",
      "Usuarios ilimitados",
      "Creditos IA a medida",
      "Soporte dedicado",
      "Onboarding asistido",
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
      <section className="mx-auto flex min-h-[46vh] max-w-5xl items-center justify-center px-5 py-16 text-center sm:px-8 sm:py-24">
        <div className="max-w-4xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-5">
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
        </div>
      </section>

      <Hairline />

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {PLAN_DEFINITIONS.map((plan) => {
            const meta = PLAN_FEATURES[plan.code];
            const isEnterprise = plan.code === "enterprise";
            const isHighlight = plan.highlight;

            return (
              <Surface
                key={plan.code}
                level={0}
                hairline
                radius="lg"
                className={cn(
                  "flex flex-col p-5 sm:p-6",
                  isHighlight && "border-[color:var(--hairline-strong)]",
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
                    <span className="inline-flex h-5 items-center rounded-[var(--r-xs)] bg-[var(--surface-2)] px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
                      Recomendado
                    </span>
                  )}
                </div>

                <div className="mt-6 border-t border-[color:var(--hairline)] pt-5">
                  {isEnterprise ? (
                    <p className="tabular text-[28px] font-semibold tracking-[-0.03em] text-ink-0">
                      Consultar
                    </p>
                  ) : (
                    <div className="flex items-baseline gap-1.5">
                      <span className="tabular text-[30px] font-semibold tracking-[-0.03em] text-ink-0">
                        {formatPrice(plan.monthlyPrice)}
                      </span>
                      <span className="text-[12px] text-ink-5">/mes</span>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  {isEnterprise ? (
                    <Link
                      href="mailto:ventas@nexora.io"
                      className="inline-flex h-11 w-full items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-transparent text-[13px] font-medium text-ink-0 transition-colors hover:bg-ink-11"
                    >
                      Hablar con ventas
                    </Link>
                  ) : (
                    <Link
                      href="/home/register"
                      className={cn(
                        "inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-[var(--r-sm)] text-[13px] font-medium transition-colors",
                        isHighlight
                          ? "bg-ink-0 text-ink-12 hover:bg-ink-2"
                          : "border border-[color:var(--hairline-strong)] bg-transparent text-ink-0 hover:bg-ink-11",
                      )}
                    >
                      {plan.code === "core" ? "Empezar con Core" : `Elegir ${plan.name}`}
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </Link>
                  )}
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
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-8 text-center sm:px-8 sm:py-12">
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
      </section>
    </>
  );
}
