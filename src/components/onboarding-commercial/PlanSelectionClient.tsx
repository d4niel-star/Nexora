"use client";

import { useState } from "react";
import { PLAN_DEFINITIONS, type PlanDefinition } from "@/lib/billing/plans";
import {
  Check,
  Sparkles,
  AlertCircle,
  Zap,
  Package,
  ShoppingCart,
  Globe,
  Palette,
  Bot,
  Key,
  Truck,
  Megaphone,
  Users,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { selectFreePlanAction } from "@/lib/onboarding-commercial/actions";
import { useRouter } from "next/navigation";

// ─── Plan presentation metadata (not backend, just UI) ───
const PLAN_META: Record<string, {
  tagline: string;
  audience: string;
  features: { icon: React.ElementType; label: string }[];
}> = {
  free: {
    tagline: "Explorá la plataforma sin compromiso.",
    audience: "Para probar Nexora",
    features: [
      { icon: Zap, label: "50 créditos IA" },
      { icon: Package, label: "15 productos" },
      { icon: ShoppingCart, label: "20 ventas / mes" },
      { icon: Sparkles, label: "Nexora AI básico" },
      { icon: Users, label: "1 usuario" },
    ],
  },
  starter: {
    tagline: "Todo lo esencial para operar en serio.",
    audience: "Para lanzar tu operación",
    features: [
      { icon: Zap, label: "200 créditos IA" },
      { icon: Package, label: "100 productos" },
      { icon: ShoppingCart, label: "100 ventas / mes" },
      { icon: Globe, label: "Dominio personalizado" },
      { icon: Palette, label: "Branding avanzado" },
      { icon: Sparkles, label: "Nexora AI (Catálogo)" },
      { icon: Users, label: "3 usuarios" },
    ],
  },
  growth: {
    tagline: "Escalá tu ecommerce con IA y multicanal.",
    audience: "Para escalar",
    features: [
      { icon: Zap, label: "500 créditos IA" },
      { icon: Package, label: "500 productos" },
      { icon: ShoppingCart, label: "500 ventas / mes" },
      { icon: Globe, label: "Dominio personalizado" },
      { icon: Palette, label: "Branding avanzado" },
      { icon: Sparkles, label: "Nexora AI ilimitado" },
      { icon: Truck, label: "Carriers avanzados" },
      { icon: Megaphone, label: "Modo Ads Performance" },
      { icon: Users, label: "5 usuarios" },
    ],
  },
  pro: {
    tagline: "Infraestructura completa sin límites.",
    audience: "Para operaciones avanzadas",
    features: [
      { icon: Zap, label: "2.000 créditos IA" },
      { icon: Package, label: "Productos ilimitados" },
      { icon: ShoppingCart, label: "Ventas ilimitadas" },
      { icon: Globe, label: "Dominio personalizado" },
      { icon: Palette, label: "Branding & white-label" },
      { icon: Sparkles, label: "Nexora AI ilimitado" },
      { icon: Key, label: "BYOK — tu propia IA" },
      { icon: Truck, label: "Carriers avanzados" },
      { icon: Megaphone, label: "Modo Ads Premium" },
      { icon: Users, label: "15 usuarios" },
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
      if (code === "free") {
        await selectFreePlanAction();
        router.push("/welcome/confirm");
      } else {
        router.push(`/welcome/payment?plan=${code}`);
      }
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
    <div className="space-y-12 animate-in fade-in duration-700">
      {/* ── Header ── */}
      <div className="text-center space-y-4 max-w-2xl mx-auto pt-4 sm:pt-8">
        <p className="text-emerald-600 text-[13px] font-semibold uppercase tracking-[0.15em]">
          Planes & Precios
        </p>
        <h1 className="text-3xl sm:text-[44px] sm:leading-[1.1] font-extrabold tracking-tight text-[#111111]">
          Elegí la infraestructura
          <br className="hidden sm:block" />
          <span className="text-[#999999]">{" "}para tu operación</span>
        </h1>
        <p className="text-[#666666] text-[15px] leading-relaxed max-w-lg mx-auto">
          Cada plan incluye acceso completo a Nexora. Empezá gratis y escalá cuando tu negocio lo necesite.
        </p>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2.5 bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 justify-center font-medium max-w-2xl mx-auto">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* ── Plan Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {PLAN_DEFINITIONS.map((plan) => {
          const meta = PLAN_META[plan.code];
          const isPopular = plan.highlight;
          const isLoading = loading === plan.code;

          return (
            <div
              key={plan.code}
              className={`
                relative group flex flex-col rounded-2xl transition-all duration-300
                ${isPopular
                  ? "bg-white border-emerald-500 border-2 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500/20"
                  : "bg-white border border-[#EAEAEA] shadow-sm hover:border-[#CCCCCC] hover:shadow-md"
                }
              `}
            >
              {/* Badge */}
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <div className="bg-emerald-500 text-white text-[10px] uppercase tracking-[0.15em] font-bold py-1 px-4 rounded-full flex items-center gap-1.5 shadow-lg shadow-emerald-500/25">
                    <Sparkles className="w-3 h-3" /> Recomendado
                  </div>
                </div>
              )}

              <div className="p-6 sm:p-7 flex flex-col flex-1">
                {/* Plan header */}
                <div className="mb-6">
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-600">
                      {meta?.audience}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-[#111111] mb-1">{plan.name}</h3>
                  <p className="text-[13px] text-[#999999] leading-snug">{meta?.tagline}</p>
                </div>

                {/* Price */}
                <div className="mb-6 pb-6 border-b border-[#EAEAEA]">
                  {plan.monthlyPrice === 0 ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[36px] font-extrabold text-[#111111] leading-none tracking-tight">Gratis</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[36px] font-extrabold text-[#111111] leading-none tracking-tight">
                        {formatPrice(plan.monthlyPrice)}
                      </span>
                      <span className="text-sm text-[#888888] font-medium">/mes</span>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <button
                  disabled={loading !== null}
                  onClick={() => handleSelectPlan(plan.code)}
                  className={`
                    w-full py-3.5 rounded-xl font-semibold text-[14px] mb-7 transition-all duration-200
                    flex items-center justify-center gap-2
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${isPopular
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
                      : "bg-[#F5F5F5] hover:bg-[#EAEAEA] text-[#111111] border border-[#EAEAEA] hover:border-[#CCCCCC]"
                    }
                  `}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {plan.monthlyPrice === 0 ? "Comenzar gratis" : `Elegir ${plan.name}`}
                      <ArrowRight className="w-4 h-4 opacity-50" />
                    </>
                  )}
                </button>

                {/* Features */}
                <div className="flex-1 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#999999] mb-3">
                    Qué incluye
                  </p>
                  <ul className="space-y-2.5">
                    {meta?.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2.5">
                        <f.icon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="text-[13px] text-[#555555] leading-tight">{f.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Bottom note ── */}
      <p className="text-center text-[12px] text-[#999999] max-w-md mx-auto leading-relaxed">
        Todos los planes incluyen acceso al panel de control, storefront integrado, checkout con Mercado Pago y soporte por email.
        Los precios no incluyen impuestos.
      </p>
    </div>
  );
}
