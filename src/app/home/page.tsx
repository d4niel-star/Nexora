"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowRight,
  ChevronRight,
  Globe,
  Database,
  Package,
  Megaphone,
  ShoppingCart,
  Truck,
  TrendingUp,
  Zap,
  Store,
  Sparkles,
} from "lucide-react"

export default function MarketingLandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#111111] font-sans selection:bg-black selection:text-white relative overflow-x-hidden">

      {/* Subtle Grid Background */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
           style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      {/* Header */}
      <header className="absolute top-0 w-full px-5 sm:px-6 py-5 flex justify-between items-center z-50 max-w-7xl left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 flex items-center justify-center overflow-hidden">
             <div className="absolute inset-0 bg-[#111111] rounded-[10px] rotate-12" />
             <div className="absolute w-2.5 h-2.5 bg-emerald-500 rounded-sm -ml-2 -mt-2" />
             <div className="absolute w-2.5 h-2.5 bg-white rounded-sm ml-2 mt-2" />
          </div>
          <span className="font-extrabold tracking-tighter text-xl">nexora</span>
        </div>

        <nav className="flex items-center gap-4 sm:gap-6 text-[13px] font-bold tracking-wide">
          <Link href="/home/pricing" className="text-[#666666] hover:text-[#111111] transition-colors hidden sm:block">Planes</Link>
          <Link href="/home/login" className="text-[#666666] hover:text-[#111111] transition-colors">Ingresar</Link>
          <Link href="/home/register" className="px-4 py-2 bg-[#111111] text-white rounded-full hover:bg-[#333333] transition-colors flex items-center gap-1.5 text-[13px]">
            Empezar <ChevronRight className="w-3 h-3" />
          </Link>
        </nav>
      </header>

      {/* ─── Hero ─── */}
      <main className="flex flex-col items-center justify-start pt-32 sm:pt-36 pb-0 px-5 sm:px-6 max-w-5xl mx-auto text-center relative z-10 w-full">

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }} className="w-full flex flex-col items-center">

          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F5F5F5] rounded-full text-[11px] font-bold uppercase tracking-[0.12em] text-[#666666] mb-6 border border-[#E5E5E5]">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Plataforma de Ecommerce Operativo
          </div>

          <h1 className="text-[42px] sm:text-[56px] md:text-[68px] font-extrabold tracking-tighter leading-[1.0] mb-5 max-w-4xl">
            Gestioná todo.<br/>
            <span className="text-[#888888]">Vendé en todos lados.</span>
          </h1>

          <p className="text-[16px] sm:text-[17px] text-[#666666] max-w-xl mx-auto leading-relaxed mb-8 font-medium">
            Catálogo centralizado, storefront propio, IA integrada, checkout con Mercado Pago y sincronización multicanal. Todo desde un solo lugar.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/home/register" className="px-7 py-3.5 bg-[#111111] text-white rounded-full font-bold text-[14px] hover:bg-[#222222] transition-all shadow-xl shadow-black/10 flex items-center gap-2 w-full sm:w-auto justify-center">
              Empezar <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/home/pricing" className="px-7 py-3.5 bg-white text-[#111111] border border-[#E5E5E5] rounded-full font-bold text-[14px] hover:bg-[#FAFAFA] hover:border-[#CCCCCC] transition-all w-full sm:w-auto text-center">
              Ver planes
            </Link>
          </div>
        </motion.div>

        {/* ─── Dashboard Preview ─── */}
        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.15 }} className="mt-14 w-full max-w-5xl mx-auto">
          <div className="rounded-2xl border border-[#E5E5E5] bg-[#FAFAFA] overflow-hidden shadow-2xl shadow-black/[0.06]">
            {/* Top bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E5E5E5] bg-white">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#E5E5E5]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#E5E5E5]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#E5E5E5]" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 bg-[#F5F5F5] rounded-md text-[10px] font-medium text-[#999999] tracking-wide">app.nexora.io/dashboard</div>
              </div>
            </div>

            {/* Content grid */}
            <div className="grid grid-cols-12 gap-0 min-h-[320px] sm:min-h-[380px]">
              {/* Sidebar mock */}
              <div className="col-span-3 border-r border-[#E5E5E5] bg-white p-4 hidden sm:block">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-6 h-6 bg-[#111111] rounded-md flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-[2px]" />
                  </div>
                  <span className="text-[12px] font-bold text-[#111111]">Nexora</span>
                </div>
                {[
                  { label: "Panel de Control", active: true },
                  { label: "Pedidos" },
                  { label: "Catálogo" },
                  { label: "Inventario" },
                  { label: "Canales" },
                  { label: "Nexora AI" },
                ].map((item, i) => (
                  <div key={i} className={`text-[11px] font-medium py-2 px-2.5 rounded-lg mb-0.5 ${item.active ? "bg-[#F5F5F5] text-[#111111]" : "text-[#999999]"}`}>
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Main content area */}
              <div className="col-span-12 sm:col-span-9 p-5 sm:p-6 bg-[#FAFAFA]">
                {/* Top row — KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  {[
                    { label: "Ventas hoy", value: "$182.400", change: "+12%", icon: TrendingUp },
                    { label: "Pedidos", value: "47", change: "+8%", icon: ShoppingCart },
                    { label: "Productos", value: "234", change: "", icon: Package },
                    { label: "Créditos IA", value: "412", change: "", icon: Zap },
                  ].map((kpi, i) => (
                    <div key={i} className="bg-white rounded-xl border border-[#E5E5E5] p-3.5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#999999]">{kpi.label}</span>
                        <kpi.icon className="w-3.5 h-3.5 text-[#CCCCCC]" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[18px] font-bold text-[#111111] tracking-tight">{kpi.value}</span>
                        {kpi.change && <span className="text-[10px] font-bold text-emerald-500">{kpi.change}</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* AI Suggestion card */}
                <div className="bg-white rounded-xl border border-[#E5E5E5] p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#111111] flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[12px] font-bold text-[#111111]">Nexora AI</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#888888] bg-white border border-[#EAEAEA] shadow-sm px-1.5 py-0.5 rounded">Contexto: Inventario</span>
                      </div>
                      <p className="text-[12px] text-[#666666] leading-relaxed">
                        Tus 3 productos más vendidos tienen stock bajo. <span className="font-semibold text-[#111111]">Reponer &quot;Crema Hidratante&quot; (quedan 4 units)</span> podría evitar quiebres esta semana.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recent orders table mock */}
                <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#E5E5E5] flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#999999]">Últimos pedidos</span>
                    <span className="text-[11px] font-medium text-emerald-600">Ver todos</span>
                  </div>
                  {[
                    { id: "#4821", customer: "María G.", amount: "$12.400", status: "Enviado", statusColor: "bg-emerald-500" },
                    { id: "#4820", customer: "Lucas R.", amount: "$8.900", status: "Preparando", statusColor: "bg-amber-500" },
                    { id: "#4819", customer: "Ana P.", amount: "$24.100", status: "Pagado", statusColor: "bg-blue-500" },
                  ].map((order, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-center justify-between border-b border-[#F5F5F5] last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-bold text-[#111111] font-mono">{order.id}</span>
                        <span className="text-[11px] text-[#999999]">{order.customer}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-bold text-[#111111]">{order.amount}</span>
                        <span className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${order.statusColor}`} />
                          <span className="text-[10px] font-medium text-[#999999]">{order.status}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* ─── Value Drivers ─── */}
      <section className="bg-white pt-20 sm:pt-24 pb-20 sm:pb-24 px-5 sm:px-6 relative z-10">
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-14">
            <p className="text-emerald-600 text-[11px] font-bold uppercase tracking-[0.15em] mb-3">Infraestructura completa</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111]">
              Todo lo que necesitás para operar
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              {
                icon: Database,
                title: "Catálogo centralizado",
                description: "Administrá productos, variantes, precios y atributos desde un solo lugar."
              },
              {
                icon: Globe,
                title: "Sincronización multicanal",
                description: "Publicá en Mercado Libre y Shopify con stock bidireccional 1:1."
              },
              {
                icon: Store,
                title: "Storefront optimizado",
                description: "Checkout integrado, dominio propio y listados sincronizados con tu operación."
              },
              {
                icon: Sparkles,
                title: "Nexora AI",
                description: "Arquitecto de IA integrado que entiende el modelo completo de tu negocio cruzando datos reales."
              },
              {
                icon: Package,
                title: "Abastecimiento B2B",
                description: "Recepción de compras y routing automático hacia proveedores dropshipping."
              },
              {
                icon: Truck,
                title: "Logística integrada",
                description: "Fulfillment, tracking y carriers avanzados con soporte multi-proveedor."
              },
              {
                icon: Megaphone,
                title: "AI: Performance & Ads",
                description: "Media buyer automático. Campañas sugeridas y borradores basados en margen y stock real."
              },
            ].map((feature, i) => (
              <div key={i} className="group">
                <div className="w-10 h-10 rounded-xl bg-[#F5F5F5] border border-[#E5E5E5] flex items-center justify-center mb-4 group-hover:border-emerald-200 group-hover:bg-emerald-50 transition-colors">
                  <feature.icon className="h-[18px] w-[18px] text-[#111111] group-hover:text-emerald-600 transition-colors" />
                </div>
                <h3 className="font-bold text-[15px] tracking-tight text-[#111111] mb-1.5">{feature.title}</h3>
                <p className="text-[#666666] text-[13px] leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Final ─── */}
      <section className="border-t border-[#E5E5E5] bg-[#FAFAFA] py-20 sm:py-24 px-5 sm:px-6 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111] mb-4">
            Operación centralizada. Control real.
          </h2>
          <p className="text-[#666666] text-[15px] font-medium mb-8 leading-relaxed">
            Creá tu cuenta y accedé a la infraestructura operativa que tu negocio necesita.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/home/register" className="px-7 py-3.5 bg-[#111111] text-white rounded-full font-bold text-[14px] hover:bg-[#222222] transition-all shadow-xl shadow-black/10 flex items-center gap-2 w-full sm:w-auto justify-center">
              Crear cuenta <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/home/pricing" className="px-7 py-3.5 bg-white text-[#111111] border border-[#E5E5E5] rounded-full font-bold text-[14px] hover:bg-white hover:border-[#CCCCCC] transition-all w-full sm:w-auto text-center">
              Ver planes
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-white text-center text-[#999999] text-[12px] font-medium border-t border-[#E5E5E5]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center px-5 sm:px-6 gap-4">
           <div className="flex items-center gap-2">
             <div className="relative w-5 h-5 flex items-center justify-center overflow-hidden">
               <div className="absolute inset-0 bg-[#111111] rounded-md rotate-12" />
               <div className="absolute w-1.5 h-1.5 bg-emerald-500 rounded-[1px] -ml-1 -mt-1" />
               <div className="absolute w-1.5 h-1.5 bg-white rounded-[1px] ml-1 mt-1" />
             </div>
             <span className="text-[#111111] font-bold text-[13px]">nexora</span>
           </div>
           <p>© {new Date().getFullYear()} Nexora Inc. Infraestructura para ecommerce inteligente.</p>
        </div>
      </footer>
    </div>
  )
}
