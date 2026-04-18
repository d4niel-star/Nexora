"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Check, Loader2 } from "lucide-react";
import { PLAN_DEFINITIONS } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

const PLAN_META: Record<string, { tagline: string; features: string[] }> = {
  core: {
    tagline: "Catálogo, inventario y ventas en un solo sistema.",
    features: [
      "Catálogo e inventario centralizado",
      "Storefront con checkout integrado",
      "Dashboard operativo",
      "Dominio personalizado",
      "100 créditos IA / mes",
      "Hasta 100 productos",
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
      "Hasta 1.000 productos",
      "5 usuarios",
    ],
  },
  scale: {
    tagline: "Volumen, equipo y operación comercial intensiva.",
    features: [
      "Todo en Growth",
      "Productos ilimitados",
      "Ventas ilimitadas",
      "BYOK, tu propia clave de IA",
      "2.000 créditos IA / mes",
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

export function PlanSelectionClient() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSelectPlan = async (code: string) => {
    setLoading(code);
    setError("");
    try {
      if (code === "enterprise") {
        window.location.href = "mailto:ventas@nexora.io";
        setLoading(null);
        return;
      }
      router.push(`/welcome/payment?plan=${code}`);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Ocurrió un error al seleccionar el plan",
      );
      setLoading(null);
    }
  };

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="space-y-9">
      <div className="mx-auto max-w-2xl pt-2 text-center sm:pt-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-5">
          Elegí tu plan
        </p>
        <h1 className="mt-4 font-semibold text-[34px] leading-[1.04] tracking-[-0.035em] text-ink-0 sm:text-[48px]">
          Prepará tu tienda para vender.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[14px] leading-[1.55] text-ink-5">
          Facturación mensual en ARS. Sin compromiso anual. Cambiá de plan
          cuando tu operación lo pida.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mx-auto flex max-w-2xl items-start gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-4 py-3 text-[13px] text-[color:var(--signal-danger)]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLAN_DEFINITIONS.map((plan) => {
          const meta = PLAN_META[plan.code];
          const isHighlight = plan.highlight;
          const isEnterprise = plan.code === "enterprise";
          const isLoading = loading === plan.code;

          return (
            <article
              key={plan.code}
              className={cn(
                "flex min-h-full flex-col rounded-[var(--r-lg)] border bg-[var(--surface-0)] p-5 transition-colors",
                isHighlight
                  ? "border-ink-0"
                  : "border-[color:var(--hairline)] hover:border-[color:var(--hairline-strong)]",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink-0">
                    {plan.name}
                  </h2>
                  <p className="mt-2 min-h-[42px] text-[12px] leading-[1.45] text-ink-5">
                    {meta?.tagline}
                  </p>
                </div>
                {isHighlight && (
                  <span className="inline-flex h-5 shrink-0 items-center rounded-[var(--r-xs)] bg-[var(--accent-50)] px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--accent-700)]">
                    Recomendado
                  </span>
                )}
              </div>

              <div className="mt-6 border-t border-[color:var(--hairline)] pt-5">
                {isEnterprise ? (
                  <p className="text-[26px] font-semibold tracking-[-0.03em] text-ink-0">
                    Consultar
                  </p>
                ) : (
                  <div className="flex items-baseline gap-1.5">
                    <span className="tabular text-[26px] font-semibold tracking-[-0.03em] text-ink-0">
                      {formatPrice(plan.monthlyPrice)}
                    </span>
                    <span className="text-[12px] font-medium text-ink-5">/mes</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={loading !== null}
                onClick={() => handleSelectPlan(plan.code)}
                className={cn(
                  "mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--r-sm)] px-4 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-50",
                  isHighlight
                    ? "bg-ink-0 text-ink-12 hover:bg-ink-2"
                    : "border border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-0 hover:bg-[var(--surface-3)]",
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {isEnterprise
                      ? "Hablar con ventas"
                      : plan.code === "core"
                        ? "Empezar con Core"
                        : `Elegir ${plan.name}`}
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </>
                )}
              </button>

              <ul className="mt-6 flex-1 space-y-2.5 border-t border-[color:var(--hairline)] pt-5">
                {meta?.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-5"
                      strokeWidth={2}
                    />
                    <span className="text-[12px] leading-snug text-ink-5">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>

      <p className="mx-auto max-w-md text-center text-[11px] leading-[1.55] text-ink-6">
        Todos los planes incluyen storefront, checkout con Mercado Pago y soporte
        por email. Precios no incluyen impuestos.
      </p>
    </div>
  );
}
