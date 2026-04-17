"use client";

import { useState } from "react";
import { PLAN_DEFINITIONS } from "@/lib/billing/plans";
import {
  Check,
  AlertCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";

const PLAN_META: Record<string, { tagline: string; features: string[] }> = {
  core: {
    tagline: "Catálogo, inventario y ventas en un solo sistema.",
    features: [
      "Catálogo e inventario centralizado",
      "Storefront con checkout integrado",
      "Dashboard operativo",
      "Dominio personalizado",
      "100 créditos IA / mes",
      "Hasta 50 productos",
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
      "5 usuarios",
    ],
  },
  scale: {
    tagline: "Volumen, equipo y operación multicanal intensiva.",
    features: [
      "Todo en Growth",
      "Productos ilimitados",
      "Ventas ilimitadas",
      "BYOK — tu propia clave de IA",
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
    } catch (err: any) {
      setError(err.message || "Ocurrió un error al seleccionar el plan");
      setLoading(null);
    }
  };

  const formatPrice = (v: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(v);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto pt-4 sm:pt-8">
        <p className="text-[#999999] text-[11px] font-semibold uppercase tracking-[0.2em]">
          Elegí tu plan
        </p>
        <h1 className="text-3xl sm:text-[40px] sm:leading-[1.1] font-extrabold tracking-tight text-[#111111]">
          Control operativo real
          <br className="hidden sm:block" />
          <span className="text-[#BBBBBB]">{" "}para tu negocio</span>
        </h1>
        <p className="text-[#888888] text-[14px] leading-relaxed max-w-md mx-auto">
          Facturación mensual en ARS. Sin compromisos anuales.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 justify-center font-medium max-w-2xl mx-auto">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Plan Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {PLAN_DEFINITIONS.map((plan) => {
          const meta = PLAN_META[plan.code];
          const isHighlight = plan.highlight;
          const isEnterprise = plan.code === "enterprise";
          const isLoading = loading === plan.code;

          return (
            <div
              key={plan.code}
              className={`
                relative flex flex-col rounded-2xl transition-all duration-300
                ${isHighlight
                  ? "bg-[#111111] text-white ring-1 ring-[#333333]"
                  : "bg-white border border-[#E5E5E5] hover:border-[#CCCCCC]"
                }
              `}
            >
              {isHighlight && (
                <div className="px-6 pt-5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40">
                    Recomendado
                  </span>
                </div>
              )}

              <div className={`p-6 flex flex-col flex-1 ${isHighlight ? "pt-2" : ""}`}>
                <h3 className={`text-lg font-bold tracking-tight mb-1 ${isHighlight ? "text-white" : "text-[#111111]"}`}>
                  {plan.name}
                </h3>
                <p className={`text-[13px] leading-snug mb-6 ${isHighlight ? "text-white/40" : "text-[#999999]"}`}>
                  {meta?.tagline}
                </p>

                {/* Price */}
                <div className={`mb-6 pb-6 border-b ${isHighlight ? "border-white/10" : "border-[#EAEAEA]"}`}>
                  {isEnterprise ? (
                    <span className={`text-[28px] font-extrabold tracking-tight leading-none ${isHighlight ? "text-white" : "text-[#111111]"}`}>
                      Consultar
                    </span>
                  ) : (
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-[28px] font-extrabold tracking-tight leading-none ${isHighlight ? "text-white" : "text-[#111111]"}`}>
                        {formatPrice(plan.monthlyPrice)}
                      </span>
                      <span className={`text-sm font-medium ${isHighlight ? "text-white/30" : "text-[#BBBBBB]"}`}>/mes</span>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <button
                  disabled={loading !== null}
                  onClick={() => handleSelectPlan(plan.code)}
                  className={`
                    w-full py-3 rounded-xl font-semibold text-[13px] mb-6 transition-all duration-200
                    flex items-center justify-center gap-2
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${isHighlight
                      ? "bg-white text-[#111111] hover:bg-[#E5E5E5]"
                      : "bg-[#F5F5F5] hover:bg-[#EAEAEA] text-[#111111] border border-[#EAEAEA]"
                    }
                  `}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {isEnterprise ? "Hablar con ventas" : plan.code === "core" ? "Empezar con Core" : `Elegir ${plan.name}`}
                      <ArrowRight className="w-3.5 h-3.5 opacity-50" />
                    </>
                  )}
                </button>

                {/* Features */}
                <div className="flex-1">
                  <ul className="space-y-2.5">
                    {meta?.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isHighlight ? "text-white/30" : "text-[#CCCCCC]"}`} />
                        <span className={`text-[12px] font-medium leading-snug ${isHighlight ? "text-white/60" : "text-[#777777]"}`}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Note */}
      <p className="text-center text-[11px] text-[#BBBBBB] max-w-md mx-auto leading-relaxed">
        Todos los planes incluyen storefront, checkout con Mercado Pago y soporte por email. Precios no incluyen impuestos.
      </p>
    </div>
  );
}
