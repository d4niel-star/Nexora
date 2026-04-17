import { PLAN_DEFINITIONS } from "@/lib/billing/plans";
import { Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
    tagline: "Volumen, equipo y operación multicanal intensiva.",
    features: [
      "Todo en Growth",
      "Productos ilimitados",
      "Ventas ilimitadas",
      "BYOK — tu propia clave de IA",
      "2.000 créditos IA / mes",
      "Sincronización multicanal avanzada",
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

export default function PricingPage() {
  const formatPrice = (v: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(v);

  return (
    <div className="min-h-screen bg-[#07070A] text-white font-sans selection:bg-white/10 selection:text-white">
      {/* Header */}
      <header className="absolute top-0 w-full px-5 sm:px-6 py-5 flex justify-between items-center z-50 max-w-7xl left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-white rounded-[10px] rotate-12" />
              <div className="absolute w-2.5 h-2.5 bg-[#07070A] rounded-sm -ml-2 -mt-2" />
              <div className="absolute w-2.5 h-2.5 bg-[#07070A]/30 rounded-sm ml-2 mt-2" />
            </div>
            <span className="font-extrabold tracking-tighter text-xl text-white">nexora</span>
          </Link>
        </div>

        <nav className="flex items-center gap-4 sm:gap-6 text-[13px] font-bold tracking-wide">
          <Link href="/home/login" className="text-[#666666] hover:text-white transition-colors">Ingresar</Link>
          <Link href="/home/register" className="px-4 py-2 bg-white text-[#07070A] rounded-full hover:bg-[#E5E5E5] transition-colors flex items-center gap-1.5">
            Empezar <ArrowRight className="w-3 h-3" />
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <div className="pt-36 pb-20 px-5 sm:px-6 max-w-3xl mx-auto text-center">
        <p className="text-[#444444] text-[11px] font-semibold uppercase tracking-[0.25em] mb-6">Planes</p>
        <h1 className="text-3xl sm:text-4xl md:text-[44px] md:leading-[1.08] font-extrabold tracking-tight mb-6">
          Control operativo real.
          <br className="hidden sm:block" />
          <span className="text-[#444444]">Precio justo.</span>
        </h1>
        <p className="text-[#5A5A5A] text-[15px] sm:text-[16px] font-medium max-w-md mx-auto leading-relaxed">
          Facturación mensual en ARS. Sin compromisos anuales.
          <br className="hidden sm:block" />
          Escalá cuando lo necesites.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6 pb-28">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-[1px] bg-[#1A1A1F] rounded-2xl overflow-hidden ring-1 ring-[#1A1A1F]">
          {PLAN_DEFINITIONS.map((plan) => {
            const meta = PLAN_FEATURES[plan.code];
            const isEnterprise = plan.code === "enterprise";
            const isHighlight = plan.highlight;

            return (
              <div
                key={plan.code}
                className={cn(
                  "flex flex-col relative",
                  isHighlight
                    ? "bg-white text-[#07070A]"
                    : "bg-[#0D0D11] text-white"
                )}
              >
                {/* Recommended label */}
                {isHighlight && (
                  <div className="px-7 pt-6">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#07070A]/35">
                      Recomendado
                    </span>
                  </div>
                )}

                <div className={cn("p-7 flex flex-col flex-1", isHighlight && "pt-2.5")}>
                  {/* Plan name */}
                  <h3 className={cn(
                    "text-[17px] font-extrabold tracking-tight mb-1",
                    isHighlight ? "text-[#07070A]" : "text-white"
                  )}>
                    {plan.name}
                  </h3>
                  <p className={cn(
                    "text-[12.5px] leading-snug mb-8",
                    isHighlight ? "text-[#07070A]/45" : "text-[#555555]"
                  )}>
                    {meta?.tagline}
                  </p>

                  {/* Price */}
                  <div className={cn(
                    "mb-8 pb-7 border-b",
                    isHighlight ? "border-[#07070A]/8" : "border-[#1A1A1F]"
                  )}>
                    {isEnterprise ? (
                      <span className={cn(
                        "text-[26px] font-extrabold tracking-tight leading-none",
                        "text-white"
                      )}>
                        Consultar
                      </span>
                    ) : (
                      <div className="flex items-baseline gap-1.5">
                        <span className={cn(
                          "text-[26px] font-extrabold tracking-tight leading-none",
                          isHighlight ? "text-[#07070A]" : "text-white"
                        )}>
                          {formatPrice(plan.monthlyPrice)}
                        </span>
                        <span className={cn(
                          "text-[13px] font-medium",
                          isHighlight ? "text-[#07070A]/30" : "text-[#444444]"
                        )}>
                          /mes
                        </span>
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  {isEnterprise ? (
                    <Link
                      href="mailto:ventas@nexora.io"
                      className="w-full py-3 rounded-lg text-center font-semibold text-[13px] transition-all mb-8 flex items-center justify-center gap-2 bg-[#151518] text-[#777777] hover:text-white hover:bg-[#1D1D22] ring-1 ring-[#222228]"
                    >
                      Hablar con ventas
                    </Link>
                  ) : (
                    <Link
                      href="/home/register"
                      className={cn(
                        "w-full py-3 rounded-lg text-center font-semibold text-[13px] transition-all mb-8 flex items-center justify-center gap-2",
                        isHighlight
                          ? "bg-[#07070A] text-white hover:bg-[#1A1A1F]"
                          : "bg-[#151518] text-[#999999] hover:text-white hover:bg-[#1D1D22] ring-1 ring-[#222228]"
                      )}
                    >
                      {plan.code === "core" ? "Empezar con Core" : `Elegir ${plan.name}`}
                      <ArrowRight className="w-3.5 h-3.5 opacity-40" />
                    </Link>
                  )}

                  {/* Features */}
                  <div className="flex-1">
                    <ul className="space-y-3">
                      {meta?.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <Check className={cn(
                            "w-3.5 h-3.5 shrink-0 mt-[1px]",
                            isHighlight ? "text-[#07070A]/20" : "text-[#333338]"
                          )} />
                          <span className={cn(
                            "text-[12px] font-medium leading-snug",
                            isHighlight ? "text-[#07070A]/60" : "text-[#6B6B6B]"
                          )}>
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
      </div>

      {/* Bottom note */}
      <section className="border-t border-[#141418] py-16 px-5 sm:px-6 text-center">
        <p className="text-[#3A3A3A] text-[13px] font-medium mb-1.5">
          Todos los planes incluyen storefront, checkout con Mercado Pago y soporte por email.
        </p>
        <p className="text-[#444444] text-[13px] font-medium mb-1">¿Necesitás una configuración a medida?</p>
        <p className="text-[#666666] text-[14px] font-semibold">ventas@nexora.io</p>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-[#333338] text-[12px] font-medium border-t border-[#141418]">
        <p>&copy; {new Date().getFullYear()} Nexora. Infraestructura operativa para ecommerce.</p>
      </footer>
    </div>
  );
}
