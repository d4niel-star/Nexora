import { PLAN_DEFINITIONS } from "@/lib/billing/plans";
import { Check, ChevronRight, X, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function PricingPage() {
  const formatPrice = (v: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(v);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111111] font-sans selection:bg-black selection:text-white">
      {/* Header */}
      <header className="absolute top-0 w-full px-5 sm:px-6 py-5 flex justify-between items-center z-50 max-w-7xl left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-[#111111] rounded-[10px] rotate-12" />
              <div className="absolute w-2.5 h-2.5 bg-emerald-500 rounded-sm -ml-2 -mt-2" />
              <div className="absolute w-2.5 h-2.5 bg-white rounded-sm ml-2 mt-2" />
            </div>
            <span className="font-extrabold tracking-tighter text-xl">nexora</span>
          </Link>
        </div>

        <nav className="flex items-center gap-4 sm:gap-6 text-[13px] font-bold tracking-wide">
          <Link href="/login" className="text-[#666666] hover:text-[#111111] transition-colors">Ingresar</Link>
          <Link href="/register" className="px-4 py-2 bg-[#111111] text-white rounded-full hover:bg-[#333333] transition-colors flex items-center gap-1.5">
            Empezar gratis <ChevronRight className="w-3 h-3" />
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <div className="pt-36 pb-14 px-5 sm:px-6 max-w-4xl mx-auto text-center">
        <p className="text-emerald-600 text-[11px] font-bold uppercase tracking-[0.15em] mb-4">Planes & precios</p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          Precios simples y escalables.
        </h1>
        <p className="text-[#666666] text-[16px] sm:text-lg font-medium max-w-xl mx-auto leading-relaxed">
          Empezá gratis y escalá a medida que tu catálogo y tus operaciones multicanal crezcan. Sin sorpresas.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-5 sm:px-6 pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLAN_DEFINITIONS.map((plan) => (
            <div
              key={plan.code}
              className={cn(
                "rounded-2xl p-6 sm:p-7 flex flex-col bg-white border transition-all",
                plan.highlight
                  ? "border-emerald-500 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500/50"
                  : "border-[#E5E5E5] shadow-sm hover:border-[#CCCCCC] hover:shadow-md"
              )}
            >
              {plan.badge && (
                <div className="inline-flex items-center gap-1.5 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-[0.12em] px-3 py-1 rounded-full w-fit mb-4">
                  <Sparkles className="w-3 h-3" />
                  Recomendado
                </div>
              )}
              <h3 className="text-xl font-bold tracking-tight mb-1">{plan.name}</h3>
              <p className="text-[12px] text-[#999999] font-medium mb-4">
                {plan.code === "free" && "Para explorar la plataforma"}
                {plan.code === "starter" && "Para lanzar tu operación"}
                {plan.code === "growth" && "Para escalar con multicanal e IA"}
                {plan.code === "pro" && "Para operaciones avanzadas"}
              </p>

              <div className="flex items-baseline gap-1.5 mb-6">
                {plan.monthlyPrice === 0 ? (
                  <span className="text-[34px] font-extrabold tracking-tight">Gratis</span>
                ) : (
                  <>
                    <span className="text-[34px] font-extrabold tracking-tight">{formatPrice(plan.monthlyPrice)}</span>
                    <span className="text-[#888888] font-medium text-sm">/mes</span>
                  </>
                )}
              </div>

              <Link
                href="/register"
                className={cn(
                  "w-full py-3 rounded-xl text-center font-bold text-[14px] transition-all mb-7 flex items-center justify-center gap-2",
                  plan.highlight
                    ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20"
                    : "bg-[#F5F5F5] text-[#111111] hover:bg-[#EAEAEA]"
                )}
              >
                {plan.monthlyPrice === 0 ? "Comenzar gratis" : `Elegir ${plan.name}`}
                <ArrowRight className="w-3.5 h-3.5 opacity-50" />
              </Link>

              <div className="flex-1">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#999999] mb-4">Límites principales</h4>
                <ul className="space-y-2.5 mb-6">
                  <Feature icon={<Check className="w-4 h-4 text-emerald-500" />} text={`${plan.config.aiCredits} créditos IA`} />
                  <Feature icon={<Check className="w-4 h-4 text-emerald-500" />} text={plan.config.maxProducts === 0 ? "Catálogo ilimitado" : `Hasta ${plan.config.maxProducts} productos`} />
                  <Feature icon={<Check className="w-4 h-4 text-emerald-500" />} text={plan.config.maxOrdersPerMonth === 0 ? "Ventas ilimitadas" : `Hasta ${plan.config.maxOrdersPerMonth} ventas / mes`} />
                  <Feature icon={<Check className="w-4 h-4 text-emerald-500" />} text={`${plan.config.maxStaff} ${plan.config.maxStaff === 1 ? "usuario" : "usuarios"}`} />
                </ul>

                <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#999999] mb-4">Funcionalidades</h4>
                <ul className="space-y-2.5">
                  <Feature enabled={plan.config.customDomain} text="Dominio personalizado" />
                  <Feature enabled={plan.config.advancedBranding} text="Branding avanzado" />
                  <Feature enabled={plan.config.aiStudioAdvanced} text="AI Studio completo" />
                  <Feature enabled={plan.config.advancedCarriers} text="Carriers avanzados" />
                  <Feature enabled={plan.config.byokEnabled} text="BYOK — tu propia IA" />
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <section className="border-t border-[#E5E5E5] bg-white py-16 px-5 sm:px-6 text-center">
        <p className="text-[#666666] text-[14px] font-medium mb-1">¿Tenés dudas?</p>
        <p className="text-[#111111] text-[15px] font-bold">Escribinos a soporte@nexora.io</p>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[#FAFAFA] text-center text-[#999999] text-[12px] font-medium border-t border-[#E5E5E5]">
        <p>© {new Date().getFullYear()} Nexora Inc. Infraestructura para ecommerce inteligente.</p>
      </footer>
    </div>
  );
}

function Feature({ enabled = true, text, icon }: { enabled?: boolean; text: string; icon?: React.ReactNode }) {
  if (!enabled && !icon) {
    return (
      <li className="flex items-start gap-2.5 text-[#BBBBBB]">
        <X className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span className="text-[12px] font-medium">{text}</span>
      </li>
    );
  }
  return (
    <li className="flex items-start gap-2.5">
      {icon || <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />}
      <span className="text-[12px] font-medium text-[#444444]">{text}</span>
    </li>
  );
}
