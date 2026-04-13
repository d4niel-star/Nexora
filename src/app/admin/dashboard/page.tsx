import { Handshake, TrendingUp, Package, Users, ShoppingCart, ArrowRight } from "lucide-react"
import Link from "next/link"
import { getDashboardMetrics } from "@/lib/store-engine/admin/queries"
import { getStoreOnboardingState } from "@/lib/onboarding/actions"
import { OnboardingDashboard } from "@/components/admin/onboarding/OnboardingDashboard"

export default async function DashboardPage() {
  const [metrics, onboardingState] = await Promise.all([
    getDashboardMetrics(),
    getStoreOnboardingState()
  ]);

  if (onboardingState && onboardingState.score < 100) {
    return <OnboardingDashboard data={onboardingState} />;
  }

  const formatCurrency = (v: number) => new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(v);

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#111111] mb-1">
          Panel de Control
        </h1>
        <p className="text-[#666666] text-sm">
          Visión general de tu negocio y estado de las integraciones activas.
        </p>
      </header>

      {/* KPI Metrics — Real Data */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-t border-b border-[#EAEAEA]">
        
        <div className="space-y-2">
          <h3 className="text-[12px] uppercase tracking-widest font-bold text-[#888888]">
            Ingresos Brutos
          </h3>
          <div className="text-3xl font-black text-[#111111]">
            {formatCurrency(metrics.totalRevenue)}
          </div>
          <p className="text-[13px] text-[#888888] font-medium">
            {metrics.totalOrders > 0 
              ? <>{metrics.totalOrders} orden{metrics.totalOrders !== 1 ? "es" : ""} total{metrics.totalOrders !== 1 ? "es" : ""}</>
              : "Esperando datos de canales"
            }
          </p>
        </div>

        <div className="space-y-2 relative md:pl-8 before:hidden md:before:block before:absolute before:left-0 before:top-2 before:bottom-2 before:w-px before:bg-[#EAEAEA]">
          <h3 className="text-[12px] uppercase tracking-widest font-bold text-[#888888]">
            Catálogo Publicado
          </h3>
          <div className="text-3xl font-black text-[#111111]">
            {metrics.publishedProducts} <span className="text-xl text-[#888888] font-bold">/ {metrics.totalProducts}</span>
          </div>
          <p className="text-[13px] text-emerald-600 font-semibold">
            {metrics.publishedProducts > 0 ? "Productos activos en tienda" : "Sin productos publicados"}
          </p>
        </div>

        <div className="space-y-2 relative md:pl-8 before:hidden md:before:block before:absolute before:left-0 before:top-2 before:bottom-2 before:w-px before:bg-[#EAEAEA]">
          <h3 className="text-[12px] uppercase tracking-widest font-bold text-[#888888]">
            Estado Operativo
          </h3>
          <div className="text-3xl font-black text-[#111111]">
            {metrics.newOrders > 0 ? (
              <><span className="text-emerald-600">{metrics.newOrders}</span> <span className="text-xl text-[#888888] font-bold">nuevos</span></>
            ) : (
              "Operativo"
            )}
          </div>
          <p className="text-[13px] text-[#888888] font-medium">
            {metrics.totalCustomers} cliente{metrics.totalCustomers !== 1 ? "s" : ""} únicos
          </p>
        </div>

      </section>

      {/* Quick Action Cards */}
      <section>
        <h2 className="text-sm uppercase tracking-wider font-bold text-[#888888] mb-6">
          Accesos Rápidos
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/admin/orders" className="group relative rounded-2xl bg-white border border-[#EAEAEA] p-6 hover:border-gray-300 transition-all shadow-sm hover:shadow-md duration-200">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111111]">Pedidos</h3>
                <p className="text-xs text-gray-500">{metrics.totalOrders} totales · {metrics.newOrders} nuevos</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-gray-400 group-hover:text-[#111111] transition-colors">
              Ver pedidos <ArrowRight className="w-3 h-3" />
            </div>
          </Link>

          <Link href="/admin/catalog" className="group relative rounded-2xl bg-white border border-[#EAEAEA] p-6 hover:border-gray-300 transition-all shadow-sm hover:shadow-md duration-200">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Package className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111111]">Catálogo</h3>
                <p className="text-xs text-gray-500">{metrics.publishedProducts} publicados</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-gray-400 group-hover:text-[#111111] transition-colors">
              Administrar <ArrowRight className="w-3 h-3" />
            </div>
          </Link>

          <Link href={`/${metrics.storeSlug}`} target="_blank" className="group relative rounded-2xl bg-white border border-[#EAEAEA] p-6 hover:border-gray-300 transition-all shadow-sm hover:shadow-md duration-200">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111111]">Ver Tienda</h3>
                <p className="text-xs text-gray-500">{metrics.storeSlug}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-gray-400 group-hover:text-[#111111] transition-colors">
              Abrir storefront <ArrowRight className="w-3 h-3" />
            </div>
          </Link>
        </div>
      </section>

      {/* Integrations Section */}
      <section>
         <h2 className="text-sm uppercase tracking-wider font-bold text-[#888888] mb-6">
           Conexión de Canales
         </h2>
         <div className="grid gap-6 md:grid-cols-2">
            
            {/* MERCADO LIBRE */}
            <div className="group relative rounded-2xl bg-[#FAFAFA] border border-[#EAEAEA] p-8 hover:bg-white hover:border-[#FFE600] transition-colors shadow-sm hover:shadow-xl hover:shadow-[#FFE600]/10 duration-300">
              <div className="flex justify-between items-start mb-12">
                <div className="w-12 h-12 rounded-full bg-[#FFE600] flex items-center justify-center border-4 border-white/50 shadow-sm shrink-0">
                  <Handshake className="w-6 h-6 text-[#2D3277]" strokeWidth={2.5} />
                </div>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-bold uppercase tracking-wider rounded-full">
                  Desconectado
                </span>
              </div>
              <h3 className="text-xl font-bold text-[#111111] mb-2">Mercado Libre</h3>
              <p className="text-[15px] text-[#666666] leading-relaxed mb-8">
                Publicá instantáneamente el inventario mayorista con reglas de precios automáticas y sincronización de stock continua.
              </p>
              <button type="button" className="w-full text-sm font-bold text-[#2D3277] bg-[#FFE600] hover:bg-[#F2DB00] rounded-xl py-3.5 transition-colors">
                Iniciar Vinculación
              </button>
            </div>

            {/* SHOPIFY */}
            <div className="group relative rounded-2xl bg-[#FAFAFA] border border-[#EAEAEA] p-8 hover:bg-white hover:border-[#95BF47] transition-colors shadow-sm hover:shadow-xl hover:shadow-[#95BF47]/10 duration-300">
              <div className="flex justify-between items-start mb-12">
                <div className="w-12 h-12 rounded-xl bg-[#95BF47] flex items-center justify-center border-4 border-white/50 shadow-sm shrink-0 text-white">
                  <svg role="img" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg"><path d="M15.337 23.979l7.216-1.561s-2.604-17.613-2.625-17.73c-.018-.116-.114-.192-.211-.192s-1.929-.136-1.929-.136-1.275-1.274-1.439-1.411c-.045-.037-.075-.057-.121-.074l-.914 21.104h.023zM11.71 11.305s-.81-.424-1.774-.424c-1.447 0-1.504.906-1.504 1.141 0 1.232 3.24 1.715 3.24 4.629 0 2.295-1.44 3.76-3.406 3.76-2.354 0-3.54-1.465-3.54-1.465l.646-2.086s1.245 1.066 2.28 1.066c.675 0 .975-.545.975-.932 0-1.619-2.654-1.694-2.654-4.359-.034-2.237 1.571-4.416 4.827-4.416 1.257 0 1.875.361 1.875.361l-.945 2.715-.02.01zM11.17.83c.136 0 .271.038.405.135-.984.465-2.064 1.639-2.508 3.992-.656.213-1.293.405-1.889.578C7.697 3.75 8.951.84 11.17.84V.83zm1.235 2.949v.135c-.754.232-1.583.484-2.394.736.466-1.777 1.333-2.645 2.085-2.971.193.501.309 1.176.309 2.1zm.539-2.234c.694.074 1.141.867 1.429 1.755-.349.114-.735.231-1.158.366v-.252c0-.752-.096-1.371-.271-1.871v.002zm2.992 1.289c-.02 0-.06.021-.078.021s-.289.075-.714.21c-.423-1.233-1.176-2.37-2.508-2.37h-.115C12.135.209 11.669 0 11.265 0 8.159 0 6.675 3.877 6.21 5.846c-1.194.365-2.063.636-2.16.674-.675.213-.694.232-.772.87-.075.462-1.83 14.063-1.83 14.063L15.009 24l.927-21.166z"/></svg>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-[10px] font-bold uppercase tracking-wider rounded-full">
                  Desconectado
                </span>
              </div>
              <h3 className="text-xl font-bold text-[#111111] mb-2">Shopify Drop</h3>
              <p className="text-[15px] text-[#666666] leading-relaxed mb-8">
                Exportá productos con un clic hacia tu tienda Shopify y dejá que Nexora gestione todo el Fulfillment.
              </p>
              <button type="button" className="w-full text-sm font-bold text-white bg-[#111111] hover:bg-black rounded-xl py-3.5 transition-colors">
                Instalar Nexora App
              </button>
            </div>

         </div>
      </section>

    </div>
  )
}
