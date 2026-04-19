"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronLeft,
  CreditCard,
  Globe,
  Loader2,
  Package,
  Shield,
  ShoppingCart,
  Users,
  Zap,
} from "lucide-react";
import { checkoutPaidPlanAction } from "@/lib/onboarding-commercial/actions";

type PlanInfo = {
  code: string;
  name: string;
  monthlyPrice: number;
  config: {
    aiCredits: number;
    maxProducts: number;
    maxOrdersPerMonth: number;
    customDomain: boolean;
    maxStaff: number;
  };
};

export function PaymentSummaryClient({ planInfo }: { planInfo: PlanInfo }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleCheckout = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await checkoutPaidPlanAction(planInfo.code);
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else {
        setError("No se pudo generar el enlace de pago.");
        setLoading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ocurrió un error al procesar el pago");
      setLoading(false);
    }
  };

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(value);

  const summaryLines = [
    {
      label: "Créditos IA",
      value: planInfo.config.aiCredits.toLocaleString(),
      icon: Zap,
    },
    {
      label: "Productos",
      value:
        planInfo.config.maxProducts === 0
          ? "Ilimitados"
          : planInfo.config.maxProducts.toString(),
      icon: Package,
    },
    {
      label: "Ventas / mes",
      value:
        planInfo.config.maxOrdersPerMonth === 0
          ? "Ilimitadas"
          : planInfo.config.maxOrdersPerMonth.toString(),
      icon: ShoppingCart,
    },
    {
      label: "Dominio propio",
      value: planInfo.config.customDomain ? "Incluido" : "No incluido",
      icon: Globe,
    },
    {
      label: "Usuarios",
      value: planInfo.config.maxStaff.toString(),
      icon: Users,
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-7 pt-2 sm:pt-6">
      <button
        type="button"
        onClick={() => router.push("/welcome/plan")}
        className="inline-flex min-h-11 items-center gap-2 rounded-[var(--r-md)] px-1 py-2 text-[13px] font-medium text-ink-5 transition-colors hover:text-ink-0 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        Volver a los planes
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-7">
          <div className="mb-5 h-px w-10 bg-[var(--accent-500)]" aria-hidden />
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-5">
            Activar suscripción
          </p>
          <h1 className="mt-4 font-semibold text-[34px] leading-[1.04] tracking-[-0.035em] text-ink-0 sm:text-[46px]">
            Revisá tu plan antes de pagar.
          </h1>
          <p className="mt-4 max-w-md text-[14px] leading-[1.55] text-ink-5">
            El pago se completa fuera de Nexora en Mercado Pago. No guardamos
            datos de tarjeta.
          </p>

          <div className="mt-7 rounded-[var(--r-xl)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 shadow-[var(--shadow-soft)] sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-[color:var(--hairline)] pb-5">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
                  Plan seleccionado
                </p>
                <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-ink-0">
                  {planInfo.name}
                </h2>
                <p className="mt-1 text-[12px] text-ink-5">
                  Renovación mensual automática
                </p>
              </div>
              <div className="text-right">
                <p className="tabular text-[26px] font-semibold tracking-[-0.03em] text-ink-0">
                  {formatPrice(planInfo.monthlyPrice)}
                </p>
                <p className="text-[12px] text-ink-5">por mes</p>
              </div>
            </div>

            <dl className="space-y-3 border-b border-[color:var(--hairline)] py-5">
              {summaryLines.map((line) => (
                <div key={line.label} className="flex items-center justify-between gap-4">
                  <dt className="flex items-center gap-3 text-[13px] text-ink-5">
                    <line.icon className="h-4 w-4 text-ink-6" strokeWidth={1.75} />
                    {line.label}
                  </dt>
                  <dd className="text-right text-[13px] font-medium text-ink-0">
                    {line.value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="flex items-center justify-between gap-4 pt-5">
              <span className="text-[14px] font-medium text-ink-0">
                Total a pagar hoy
              </span>
              <span className="tabular text-[22px] font-semibold tracking-[-0.02em] text-ink-0">
                {formatPrice(planInfo.monthlyPrice)}
              </span>
            </div>
          </div>
        </section>

        <aside className="lg:col-span-5">
          <div className="rounded-[var(--r-xl)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 shadow-[var(--shadow-soft)] sm:p-6 lg:sticky lg:top-8">
            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-1)] px-3.5 py-3 text-[13px] text-[color:var(--signal-danger)]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-sm)] text-ink-12"
                style={{ backgroundColor: "#009EE3" }}
                aria-hidden
              >
                <CreditCard className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-ink-0">Mercado Pago</p>
                <p className="mt-0.5 text-[12px] text-ink-5">
                  Tarjeta, débito o dinero en cuenta
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={loading}
              className="mt-6 inline-flex h-12 min-h-12 w-full items-center justify-center gap-2 rounded-[var(--r-md)] bg-ink-0 px-4 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redirigiendo a Mercado Pago...
                </>
              ) : (
                <>
                  Confirmar y pagar
                  <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                </>
              )}
            </button>

            <div className="mt-5 space-y-2 border-t border-[color:var(--hairline)] pt-5 text-[12px] text-ink-5">
              <p className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-ink-5" strokeWidth={1.75} />
                Pago seguro fuera de Nexora
              </p>
              <p className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-ink-5" strokeWidth={1.75} />
                Cancelá cuando quieras
              </p>
            </div>
          </div>
        </aside>
      </div>

      <p className="mx-auto max-w-md text-center text-[11px] leading-[1.55] text-ink-6">
        Al confirmar, aceptás los Términos de Servicio. Los impuestos locales se
        calcularán en Mercado Pago.
      </p>
    </div>
  );
}
