import { PLAN_DEFINITIONS } from "@/lib/billing/plans";
import { Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Pricing ───
// Ultra-serious monochrome comparison. Four plans as a single hairline-
// bordered grid. No dark inverted tiles, no pastel highlights, no shadow
// elevations. The highlighted plan is marked only with an accent eyebrow
// ("Recomendado") and a filled CTA — everything else stays neutral.
//
// Plan data, routing and pricing logic preserved as-is.

const PLAN_FEATURES: Record<string, { tagline: string; features: string[] }> = {
  core: {
    tagline: "Catálogo, inventario y ventas en un solo sistema.",
    features: [
      "Catálogo e inventario centralizado",
      "Storefront con checkout integrado",
      "Dashboard operativo",
      "Dominio personalizado",
      "Branding avanzado",
      "100 créditos IA / mes",
      "Hasta 50 productos",
      "Hasta 100 ventas / mes",
      "2 usuarios",
    ],
  },
  growth: {
    tagline: "IA aplicada, command center y workflows de resolución.",
    features: [
      "Todo en Core",
      "AI Hub completo",
      "Command Center",
      "Variant Intelligence",
      "Variant Economics",
      "Replenishment Intelligence",
      "Pricing y cost review workflows",
      "Carriers y logística avanzada",
      "500 créditos IA / mes",
      "Hasta 300 productos",
      "Hasta 500 ventas / mes",
      "5 usuarios",
    ],
  },
  scale: {
    tagline: "Volumen, equipo y operación comercial intensiva.",
    features: [
      "Todo en Growth",
      "Productos ilimitados",
      "Ventas ilimitadas",
      "BYOK — tu propia clave de IA",
      "2.000 créditos IA / mes",
      "Operación centralizada avanzada",
      "15 usuarios",
    ],
  },
  enterprise: {
    tagline: "Infraestructura a medida para operación compleja.",
    features: [
      "Todo en Scale",
      "Volúmenes custom",
      "Usuarios ilimitados",
      "Créditos IA a medida",
      "Soporte dedicado",
      "Onboarding asistido",
    ],
  },
};

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="relative inline-flex items-center justify-center">
        <span className="block h-3 w-3 rounded-[2px] bg-ink-0 translate-x-[2px] translate-y-[2px]" />
        <span className="absolute h-3 w-3 rounded-[2px] bg-[var(--accent-500)] -translate-x-[2px] -translate-y-[2px]" />
      </span>
      <span className="font-semibold text-[15px] leading-none tracking-[-0.03em] text-ink-0">
        nexora
      </span>
    </Link>
  );
}

export default function PricingPage() {
  const formatPrice = (v: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(v);

  return (
    <div className="min-h-screen bg-[var(--surface-1)] text-ink-0">
      {/* Header */}
      <header className="border-b border-[color:var(--hairline)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Wordmark />
          <nav className="flex items-center gap-5 text-[13px]">
            <Link
              href="/home/login"
              className="text-ink-5 transition-colors hover:text-ink-0"
            >
              Ingresar
            </Link>
            <Link
              href="/home/register"
              className="inline-flex h-9 items-center gap-1.5 rounded-[var(--r-sm)] bg-ink-0 px-4 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2"
            >
              Empezar
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pt-20 pb-14 text-center sm:px-8 sm:pt-28 sm:pb-20">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-5">
          Planes
        </p>
        <h1 className="mt-5 font-semibold text-[36px] leading-[1.05] tracking-[-0.035em] text-ink-0 sm:text-[52px]">
          Control operativo real.
          <br />
          <span className="text-ink-5">Precio justo.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-md text-[15px] leading-[1.55] text-ink-4">
          Facturación mensual en ARS. Sin compromisos anuales. Escalá cuando lo
          necesites.
        </p>
      </section>

      {/* Plans grid */}
      <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {PLAN_DEFINITIONS.map((plan) => {
            const meta = PLAN_FEATURES[plan.code];
            const isEnterprise = plan.code === "enterprise";
            const isHighlight = plan.highlight;

            return (
              <div
                key={plan.code}
                className={cn(
                  "relative flex flex-col rounded-[var(--r-md)] border bg-[var(--surface-0)] p-6",
                  isHighlight
                    ? "border-ink-0"
                    : "border-[color:var(--hairline)]",
                )}
              >
                {/* Recommended eyebrow */}
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-ink-0">
                    {plan.name}
                  </h3>
                  {isHighlight && (
                    <span className="inline-flex h-5 items-center rounded-[var(--r-xs)] bg-[color:var(--accent-50)] px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--accent-700)]">
                      Recomendado
                    </span>
                  )}
                </div>

                <p className="mt-2 text-[13px] leading-[1.5] text-ink-5">
                  {meta?.tagline}
                </p>

                {/* Price */}
                <div className="mt-6 pb-6 border-b border-[color:var(--hairline)]">
                  {isEnterprise ? (
                    <span className="tabular text-[28px] font-semibold leading-none tracking-[-0.02em] text-ink-0">
                      Consultar
                    </span>
                  ) : (
                    <div className="flex items-baseline gap-1.5">
                      <span className="tabular text-[32px] font-semibold leading-none tracking-[-0.025em] text-ink-0">
                        {formatPrice(plan.monthlyPrice)}
                      </span>
                      <span className="text-[13px] text-ink-5">/mes</span>
                    </div>
                  )}
                </div>

                {/* CTA */}
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
                      {plan.code === "core"
                        ? "Empezar con Core"
                        : `Elegir ${plan.name}`}
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </Link>
                  )}
                </div>

                {/* Features */}
                <ul role="list" className="mt-7 space-y-2.5">
                  {meta?.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check
                        className="mt-[2px] h-3.5 w-3.5 shrink-0 text-ink-3"
                        strokeWidth={2}
                      />
                      <span className="text-[13px] leading-[1.5] text-ink-3">
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footnote */}
      <section className="border-t border-[color:var(--hairline)]">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-8">
          <p className="text-[13px] leading-[1.6] text-ink-5">
            Todos los planes incluyen storefront, checkout con Mercado Pago y
            soporte por email.
          </p>
          <p className="mt-3 text-[13px] text-ink-5">
            ¿Necesitás una configuración a medida?{" "}
            <a
              href="mailto:ventas@nexora.io"
              className="text-ink-0 font-medium underline decoration-[color:var(--hairline-strong)] underline-offset-4 hover:decoration-ink-0"
            >
              ventas@nexora.io
            </a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[color:var(--hairline)]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-5 py-8 text-[12px] text-ink-5 sm:flex-row sm:items-center sm:px-8">
          <p>© {new Date().getFullYear()} Nexora Inc.</p>
          <p>Infraestructura operativa para ecommerce.</p>
        </div>
      </footer>
    </div>
  );
}
