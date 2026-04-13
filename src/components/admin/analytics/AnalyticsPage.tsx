"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Download,
  Filter,
  Minus,
  Search,
  ShoppingCart,
  Tag,
  TrendingUp,
  Users,
  Zap,
  X,
} from "lucide-react";

import { AnalyticsDrawer } from "@/components/admin/analytics/AnalyticsDrawer";
import { PerformanceBadge, TrendBadge, SeverityBadge, CategoryBadge } from "@/components/admin/analytics/AnalyticsBadge";
import { TableSkeleton } from "@/components/admin/orders/TableSkeleton";
import {
  MOCK_ANALYTICS_SUMMARY,
  MOCK_SALES_DAYS,
  MOCK_TOP_PRODUCTS,
  MOCK_CUSTOMER_SEGMENTS,
  MOCK_MARKETING_METRICS,
  MOCK_FUNNEL,
  MOCK_CHANNELS,
  MOCK_ALERTS,
} from "@/lib/mocks/analytics";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  TopProduct,
  CustomerSegmentMetric,
  MarketingMetric,
  AnalyticsAlert,
  AnalyticsPeriod,
} from "@/types/analytics";

type TabValue = "resumen" | "ventas" | "productos" | "clientes" | "marketing" | "conversion";
type VisualScenario = "live" | "empty" | "error";

type DrawerContent =
  | { kind: "product"; data: TopProduct }
  | { kind: "segment"; data: CustomerSegmentMetric }
  | { kind: "campaign"; data: MarketingMetric }
  | { kind: "alert"; data: AnalyticsAlert };

interface ToastMessage {
  id: string;
  title: string;
  description: string;
}

const periodLabels: Record<AnalyticsPeriod, string> = { "7d": "7 dias", "30d": "30 dias", "90d": "90 dias" };

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("resumen");
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const [visualScenario, setVisualScenario] = useState<VisualScenario>("live");
  const [isLoading, setIsLoading] = useState(true);
  const [drawerContent, setDrawerContent] = useState<DrawerContent | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    if (!isLoading) return;
    const timer = window.setTimeout(() => setIsLoading(false), 720);
    return () => window.clearTimeout(timer);
  }, [isLoading]);

  const tabs: Array<{ label: string; value: TabValue; icon: React.ReactNode }> = [
    { label: "Resumen", value: "resumen", icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { label: "Ventas", value: "ventas", icon: <ShoppingCart className="h-3.5 w-3.5" /> },
    { label: "Productos", value: "productos", icon: <Tag className="h-3.5 w-3.5" /> },
    { label: "Clientes", value: "clientes", icon: <Users className="h-3.5 w-3.5" /> },
    { label: "Marketing", value: "marketing", icon: <Zap className="h-3.5 w-3.5" /> },
    { label: "Conversion", value: "conversion", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  ];

  const handleTabChange = (value: TabValue) => {
    if (value === activeTab) return;
    setActiveTab(value);
    setVisualScenario("live");
    setIsLoading(true);
  };

  const pushToast = (title: string, description: string) => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
    setToasts((c) => [...c, { id, title, description }]);
    window.setTimeout(() => {
      setToasts((c) => c.filter((t) => t.id !== id));
    }, 3200);
  };

  const openDrawer = (content: DrawerContent) => setDrawerContent(content);
  const closeDrawer = () => setDrawerContent(null);
  const resetFilters = () => { setPeriod("30d"); setVisualScenario("live"); };

  const showToolbar = activeTab !== "resumen";

  return (
    <div className="animate-in fade-in space-y-8 pb-32 duration-700">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#111111]">Analiticas</h1>
          <p className="mt-1 text-[15px] font-medium text-[#666666]">
            Metricas, rendimiento y estado del negocio en un solo lugar.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-5 py-2.5 text-[13px] font-bold text-[#111111] shadow-sm transition-all hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
            onClick={() => pushToast("Exportacion simulada", "Datos preparados para descarga (mock).")}
            type="button"
          >
            <Download className="h-4 w-4" />
            Exportar
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-sm">
        <div
          aria-label="Secciones de analiticas"
          className="flex items-center gap-8 overflow-x-auto border-b border-[#EAEAEA] bg-[#FAFAFA]/50 px-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
        >
          {tabs.map((tab) => (
            <button
              key={tab.value}
              aria-selected={activeTab === tab.value}
              className={cn(
                "group relative whitespace-nowrap py-4 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
                activeTab === tab.value ? "text-[#111111]" : "text-[#888888] hover:text-[#111111]",
              )}
              onClick={() => handleTabChange(tab.value)}
              role="tab"
              type="button"
            >
              <span className="flex items-center gap-2">
                {tab.icon}
                {tab.label}
              </span>
              {activeTab === tab.value ? (
                <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-[#111111]" />
              ) : null}
            </button>
          ))}
        </div>

        {showToolbar ? (
          <div className="flex flex-col gap-4 border-b border-[#EAEAEA] bg-white p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center">
              <ToolbarSelect
                icon={<Filter className="h-4 w-4" />}
                label="Periodo"
                onChange={(v) => setPeriod(v as AnalyticsPeriod)}
                options={["7d", "30d", "90d"]}
                value={period}
              />
              <ToolbarSelect
                icon={<AlertTriangle className="h-4 w-4" />}
                label="Escenario"
                onChange={(v) => setVisualScenario(v as VisualScenario)}
                options={["live", "empty", "error"]}
                value={visualScenario}
              />
            </div>
          </div>
        ) : null}

        <div className="min-h-[420px] bg-[#FAFAFA]/30">
          {isLoading ? (
            <TableSkeleton />
          ) : visualScenario === "error" && activeTab !== "resumen" ? (
            <ErrorState onRetry={() => setVisualScenario("live")} />
          ) : visualScenario === "empty" && activeTab !== "resumen" ? (
            <EmptyState onReset={() => setVisualScenario("live")} />
          ) : activeTab === "resumen" ? (
            <SummaryView onNavigate={handleTabChange} openDrawer={openDrawer} />
          ) : activeTab === "ventas" ? (
            <SalesView period={period} />
          ) : activeTab === "productos" ? (
            <ProductsView openDrawer={openDrawer} />
          ) : activeTab === "clientes" ? (
            <CustomersView openDrawer={openDrawer} />
          ) : activeTab === "marketing" ? (
            <MarketingView openDrawer={openDrawer} />
          ) : (
            <ConversionView openDrawer={openDrawer} />
          )}
        </div>
      </div>

      <AnalyticsDrawer content={drawerContent} isOpen={drawerContent !== null} onClose={closeDrawer} />

      <ToastViewport
        onDismiss={(id) => setToasts((c) => c.filter((t) => t.id !== id))}
        toasts={toasts}
      />
    </div>
  );
}

/* ─── Summary ─── */

function SummaryView({ onNavigate, openDrawer }: { onNavigate: (tab: TabValue) => void; openDrawer: (c: DrawerContent) => void }) {
  const s = MOCK_ANALYTICS_SUMMARY;
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Ingresos totales" value={formatCurrency(s.totalRevenue)} change={s.revenueChange} accent />
        <KpiCard label="Pedidos" value={s.totalOrders.toString()} change={s.ordersChange} />
        <KpiCard label="Ticket promedio" value={formatCurrency(s.avgTicket)} change={4.2} />
        <KpiCard label="Tasa de conversion" value={`${s.conversionRate}%`} change={0.3} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Clientes nuevos" value={s.newCustomers.toString()} change={15.2} />
        <KpiCard label="Recurrentes" value={s.returningCustomers.toString()} change={3.1} />
        <KpiCard label="Recuperacion carritos" value={`${s.cartRecoveryRate}%`} change={2.4} />
        <KpiCard label="Promos activas" value={s.activePromotions.toString()} change={0} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NavCard icon={<ShoppingCart className="h-5 w-5 text-blue-500" />} title="Ventas" description="Desglose diario, tendencias y ticket promedio" onClick={() => onNavigate("ventas")} />
        <NavCard icon={<Tag className="h-5 w-5 text-purple-500" />} title="Productos" description={`${MOCK_TOP_PRODUCTS.filter(p => p.performance === "critical").length} productos en estado critico`} onClick={() => onNavigate("productos")} />
        <NavCard icon={<Users className="h-5 w-5 text-emerald-500" />} title="Clientes" description={`${s.newCustomers} nuevos, ${MOCK_CUSTOMER_SEGMENTS.find(s => s.segment === "VIP")?.count ?? 0} VIP`} onClick={() => onNavigate("clientes")} />
        <NavCard icon={<Zap className="h-5 w-5 text-amber-500" />} title="Marketing" description={`${s.activePromotions} promos generando ingresos`} onClick={() => onNavigate("marketing")} />
        <NavCard icon={<BarChart3 className="h-5 w-5 text-pink-500" />} title="Conversion" description={`Embudo: ${MOCK_FUNNEL[MOCK_FUNNEL.length - 1].value.toLocaleString("es-AR")} compras de ${MOCK_FUNNEL[0].value.toLocaleString("es-AR")} sesiones`} onClick={() => onNavigate("conversion")} />
        <NavCard icon={<AlertTriangle className="h-5 w-5 text-red-400" />} title="Alertas" description={`${MOCK_ALERTS.filter(a => a.severity === "critical").length} criticas, ${MOCK_ALERTS.filter(a => a.severity === "warning").length} advertencias`} muted />
      </div>

      {/* Alerts */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Alertas activas</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {MOCK_ALERTS.slice(0, 4).map((alert) => (
            <button
              key={alert.id}
              className="flex items-start gap-3 rounded-2xl border border-[#EAEAEA] bg-white p-4 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
              onClick={() => openDrawer({ kind: "alert", data: alert })}
              type="button"
            >
              <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", alert.severity === "critical" ? "bg-red-50" : alert.severity === "warning" ? "bg-amber-50" : "bg-blue-50")}>
                <AlertTriangle className={cn("h-4 w-4", alert.severity === "critical" ? "text-red-500" : alert.severity === "warning" ? "text-amber-500" : "text-blue-500")} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#111111]">{alert.title}</p>
                <p className="mt-1 line-clamp-1 text-xs font-medium text-gray-500">{alert.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Sales ─── */

function SalesView({ period }: { period: AnalyticsPeriod }) {
  const s = MOCK_ANALYTICS_SUMMARY;
  const days = period === "7d" ? MOCK_SALES_DAYS.slice(0, 7) : MOCK_SALES_DAYS;
  const totalRevenue = days.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = days.reduce((sum, d) => sum + d.orders, 0);
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const dateFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" });

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Ingresos del periodo" value={formatCurrency(totalRevenue)} change={s.revenueChange} accent />
        <KpiCard label="Pedidos" value={totalOrders.toString()} change={s.ordersChange} />
        <KpiCard label="Ticket promedio" value={formatCurrency(avgTicket)} change={4.2} />
        <KpiCard label="Conversion" value={`${s.conversionRate}%`} change={0.3} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#EAEAEA] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead>
              <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]/70">
                <TableHead label="Fecha" />
                <TableHead label="Pedidos" align="right" />
                <TableHead label="Ingresos" align="right" />
                <TableHead label="Ticket Prom." align="right" />
                <TableHead label="Conversion" align="right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA]/80">
              {days.map((day) => (
                <tr key={day.id} className="bg-white transition-colors hover:bg-gray-50/60">
                  <td className="px-6 py-4 text-sm font-bold text-[#111111]">{dateFormatter.format(new Date(day.date))}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold tabular-nums text-[#111111]">{day.orders}</td>
                  <td className="px-6 py-4 text-right text-[15px] font-black tracking-tight tabular-nums text-[#111111]">{formatCurrency(day.revenue)}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold tabular-nums text-[#111111]">{formatCurrency(day.avgTicket)}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold tabular-nums text-[#111111]">{day.conversionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[#EAEAEA] bg-[#FAFAFA]/50 px-6 py-4">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#888888]">
            Mostrando <b className="px-1 text-[#111111]">{days.length}</b> dias
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Products ─── */

function ProductsView({ openDrawer }: { openDrawer: (c: DrawerContent) => void }) {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total productos" value={MOCK_TOP_PRODUCTS.length.toString()} />
        <SummaryCard label="Stock critico" value={MOCK_TOP_PRODUCTS.filter(p => p.stock <= 5).length.toString()} />
        <SummaryCard label="Alto rendimiento" value={MOCK_TOP_PRODUCTS.filter(p => p.performance === "high").length.toString()} />
        <SummaryCard label="Baja conversion" value={MOCK_TOP_PRODUCTS.filter(p => p.conversionRate < 2.5).length.toString()} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#EAEAEA] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]/70">
                <TableHead label="Producto" />
                <TableHead label="Categoria" />
                <TableHead label="Uds. vendidas" align="right" />
                <TableHead label="Ingresos" align="right" />
                <TableHead label="Vistas" align="right" />
                <TableHead label="Conv." align="right" />
                <TableHead label="Stock" align="right" />
                <TableHead label="Rendimiento" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA]/80">
              {MOCK_TOP_PRODUCTS.map((product) => (
                <tr
                  key={product.id}
                  className="group cursor-pointer bg-white transition-colors hover:bg-gray-50/60 focus-within:bg-gray-50/80"
                  onClick={() => openDrawer({ kind: "product", data: product })}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrawer({ kind: "product", data: product }); } }}
                >
                  <td className="px-6 py-5 text-sm font-bold text-[#111111]">{product.name}</td>
                  <td className="px-6 py-5"><CategoryBadge category={product.category} /></td>
                  <td className="px-6 py-5 text-right text-sm font-bold tabular-nums text-[#111111]">{product.unitsSold}</td>
                  <td className="px-6 py-5 text-right text-[15px] font-black tracking-tight tabular-nums text-[#111111]">{formatCurrency(product.revenue)}</td>
                  <td className="px-6 py-5 text-right text-sm font-bold tabular-nums text-gray-500">{product.views.toLocaleString("es-AR")}</td>
                  <td className="px-6 py-5 text-right text-sm font-bold tabular-nums text-[#111111]">{product.conversionRate}%</td>
                  <td className={cn("px-6 py-5 text-right text-sm font-bold tabular-nums", product.stock === 0 ? "text-red-600" : product.stock <= 5 ? "text-amber-600" : "text-[#111111]")}>
                    {product.stock === 0 ? "Agotado" : product.stock}
                  </td>
                  <td className="px-6 py-5"><PerformanceBadge level={product.performance} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TableFooter count={MOCK_TOP_PRODUCTS.length} total={MOCK_TOP_PRODUCTS.length} />
      </div>
    </div>
  );
}

/* ─── Customers ─── */

function CustomersView({ openDrawer }: { openDrawer: (c: DrawerContent) => void }) {
  const totalCustomers = MOCK_CUSTOMER_SEGMENTS.reduce((sum, s) => sum + s.count, 0);
  const totalRevenue = MOCK_CUSTOMER_SEGMENTS.reduce((sum, s) => sum + s.revenue, 0);

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total clientes" value={totalCustomers.toString()} />
        <SummaryCard label="Ingresos totales" value={formatCurrency(totalRevenue)} accent />
        <SummaryCard label="VIP activos" value={MOCK_CUSTOMER_SEGMENTS.find(s => s.segment === "VIP")?.count.toString() ?? "0"} />
        <SummaryCard label="En riesgo" value={MOCK_CUSTOMER_SEGMENTS.find(s => s.segment === "Riesgo de churn")?.count.toString() ?? "0"} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#EAEAEA] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead>
              <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]/70">
                <TableHead label="Segmento" />
                <TableHead label="Clientes" align="right" />
                <TableHead label="Ingresos" align="right" />
                <TableHead label="Ticket Prom." align="right" />
                <TableHead label="Frecuencia" align="right" />
                <TableHead label="Tendencia" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA]/80">
              {MOCK_CUSTOMER_SEGMENTS.map((seg) => (
                <tr
                  key={seg.id}
                  className="group cursor-pointer bg-white transition-colors hover:bg-gray-50/60 focus-within:bg-gray-50/80"
                  onClick={() => openDrawer({ kind: "segment", data: seg })}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrawer({ kind: "segment", data: seg }); } }}
                >
                  <td className="px-6 py-5 text-sm font-bold text-[#111111]">{seg.segment}</td>
                  <td className="px-6 py-5 text-right text-sm font-bold tabular-nums text-[#111111]">{seg.count}</td>
                  <td className="px-6 py-5 text-right text-[15px] font-black tracking-tight tabular-nums text-[#111111]">{seg.revenue > 0 ? formatCurrency(seg.revenue) : "—"}</td>
                  <td className="px-6 py-5 text-right text-sm font-bold tabular-nums text-[#111111]">{seg.avgTicket > 0 ? formatCurrency(seg.avgTicket) : "—"}</td>
                  <td className="px-6 py-5 text-right text-sm font-bold tabular-nums text-[#111111]">{seg.frequency > 0 ? `${seg.frequency}x` : "—"}</td>
                  <td className="px-6 py-5"><TrendBadge trend={seg.trend} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TableFooter count={MOCK_CUSTOMER_SEGMENTS.length} total={MOCK_CUSTOMER_SEGMENTS.length} />
      </div>
    </div>
  );
}

/* ─── Marketing ─── */

function MarketingView({ openDrawer }: { openDrawer: (c: DrawerContent) => void }) {
  const totalRevenue = MOCK_MARKETING_METRICS.reduce((sum, m) => sum + m.revenue, 0);
  const totalConversions = MOCK_MARKETING_METRICS.reduce((sum, m) => sum + m.conversions, 0);
  const avgRoi = Math.round(MOCK_MARKETING_METRICS.filter(m => m.roi > 0).reduce((sum, m) => sum + m.roi, 0) / MOCK_MARKETING_METRICS.filter(m => m.roi > 0).length);

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Ingresos atribuidos" value={formatCurrency(totalRevenue)} accent />
        <SummaryCard label="Conversiones" value={totalConversions.toLocaleString("es-AR")} />
        <SummaryCard label="ROI promedio" value={`${avgRoi}%`} />
        <SummaryCard label="Campañas activas" value={MOCK_MARKETING_METRICS.length.toString()} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#EAEAEA] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead>
              <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]/70">
                <TableHead label="Campaña" />
                <TableHead label="Tipo" />
                <TableHead label="Conversiones" align="right" />
                <TableHead label="Ingresos" align="right" />
                <TableHead label="ROI" align="right" />
                <TableHead label="Rendimiento" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA]/80">
              {MOCK_MARKETING_METRICS.map((metric) => (
                <tr
                  key={metric.id}
                  className="group cursor-pointer bg-white transition-colors hover:bg-gray-50/60 focus-within:bg-gray-50/80"
                  onClick={() => openDrawer({ kind: "campaign", data: metric })}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrawer({ kind: "campaign", data: metric }); } }}
                >
                  <td className="px-6 py-5 text-sm font-bold text-[#111111]">{metric.name}</td>
                  <td className="px-6 py-5"><CategoryBadge category={metric.type} /></td>
                  <td className="px-6 py-5 text-right text-sm font-bold tabular-nums text-[#111111]">{metric.conversions.toLocaleString("es-AR")}</td>
                  <td className="px-6 py-5 text-right text-[15px] font-black tracking-tight tabular-nums text-[#111111]">{formatCurrency(metric.revenue)}</td>
                  <td className="px-6 py-5 text-right text-sm font-bold tabular-nums text-[#111111]">{metric.roi > 0 ? `${metric.roi}%` : "—"}</td>
                  <td className="px-6 py-5"><PerformanceBadge level={metric.performance} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TableFooter count={MOCK_MARKETING_METRICS.length} total={MOCK_MARKETING_METRICS.length} />
      </div>
    </div>
  );
}

/* ─── Conversion ─── */

function ConversionView({ openDrawer }: { openDrawer: (c: DrawerContent) => void }) {
  const funnel = MOCK_FUNNEL;
  const firstStep = funnel[0].value;
  const lastStep = funnel[funnel.length - 1].value;
  const overallRate = firstStep > 0 ? ((lastStep / firstStep) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Sesiones totales" value={firstStep.toLocaleString("es-AR")} />
        <SummaryCard label="Compras completadas" value={lastStep.toLocaleString("es-AR")} />
        <SummaryCard label="Tasa global" value={`${overallRate}%`} accent />
        <SummaryCard label="Abandono carrito" value={`${funnel[2].dropoff}%`} />
      </div>

      {/* Funnel */}
      <div className="overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-sm">
        <div className="border-b border-[#EAEAEA] bg-[#FAFAFA]/50 px-6 py-4">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Embudo de conversion</h3>
        </div>
        <div className="divide-y divide-[#EAEAEA]">
          {funnel.map((step, i) => {
            const widthPct = firstStep > 0 ? Math.max((step.value / firstStep) * 100, 8) : 100;
            return (
              <div key={step.label} className="flex items-center gap-6 px-6 py-5">
                <div className="w-40 shrink-0">
                  <p className="text-sm font-bold text-[#111111]">{step.label}</p>
                  {i > 0 ? (
                    <p className="mt-0.5 text-[11px] font-medium text-gray-500">-{step.dropoff}% abandono</p>
                  ) : null}
                </div>
                <div className="flex-1">
                  <div className="h-8 w-full overflow-hidden rounded-lg bg-gray-50">
                    <div
                      className={cn("flex h-full items-center rounded-lg px-3 transition-all", i === 0 ? "bg-[#111111]" : i === funnel.length - 1 ? "bg-emerald-500" : "bg-gray-300")}
                      style={{ width: `${widthPct}%` }}
                    >
                      <span className={cn("text-xs font-bold tabular-nums", i === 0 || i === funnel.length - 1 ? "text-white" : "text-[#111111]")}>
                        {step.value.toLocaleString("es-AR")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Channels */}
      <div className="overflow-hidden rounded-2xl border border-[#EAEAEA] shadow-sm">
        <div className="border-b border-[#EAEAEA] bg-[#FAFAFA]/50 px-6 py-4">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Rendimiento por canal</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead>
              <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]/70">
                <TableHead label="Canal" />
                <TableHead label="Sesiones" align="right" />
                <TableHead label="Conversiones" align="right" />
                <TableHead label="Tasa" align="right" />
                <TableHead label="Ingresos" align="right" />
                <TableHead label="Tendencia" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA]/80">
              {MOCK_CHANNELS.map((ch) => (
                <tr key={ch.id} className="bg-white transition-colors hover:bg-gray-50/60">
                  <td className="px-6 py-4 text-sm font-bold text-[#111111]">{ch.name}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold tabular-nums text-[#111111]">{ch.sessions.toLocaleString("es-AR")}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold tabular-nums text-[#111111]">{ch.conversions}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold tabular-nums text-[#111111]">{ch.conversionRate}%</td>
                  <td className="px-6 py-4 text-right text-[15px] font-black tracking-tight tabular-nums text-[#111111]">{formatCurrency(ch.revenue)}</td>
                  <td className="px-6 py-4"><TrendBadge trend={ch.trend} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Shared Components ─── */

function KpiCard({ label, value, change, accent = false }: { label: string; value: string; change: number; accent?: boolean }) {
  const isPositive = change > 0;
  const isNeutral = change === 0;
  return (
    <div className={cn("rounded-2xl border border-[#EAEAEA] p-5 shadow-sm", accent ? "bg-[#111111]" : "bg-white")}>
      <p className={cn("text-[11px] font-bold uppercase tracking-[0.18em]", accent ? "text-gray-400" : "text-[#888888]")}>{label}</p>
      <p className={cn("mt-2 text-2xl font-black tracking-tight", accent ? "text-white" : "text-[#111111]")}>{value}</p>
      <div className="mt-2 flex items-center gap-1.5">
        {isNeutral ? (
          <Minus className={cn("h-3 w-3", accent ? "text-gray-500" : "text-gray-400")} />
        ) : isPositive ? (
          <ArrowUp className={cn("h-3 w-3", accent ? "text-emerald-400" : "text-emerald-600")} />
        ) : (
          <ArrowDown className={cn("h-3 w-3", accent ? "text-red-400" : "text-red-500")} />
        )}
        <span className={cn("text-xs font-bold tabular-nums", accent ? (isPositive ? "text-emerald-400" : isNeutral ? "text-gray-500" : "text-red-400") : (isPositive ? "text-emerald-600" : isNeutral ? "text-gray-400" : "text-red-500"))}>
          {isNeutral ? "Sin cambio" : `${isPositive ? "+" : ""}${change}%`}
        </span>
        <span className={cn("text-[11px] font-medium", accent ? "text-gray-500" : "text-gray-400")}>vs periodo ant.</span>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl border border-[#EAEAEA] p-5 shadow-sm", accent ? "bg-[#111111]" : "bg-white")}>
      <p className={cn("text-[11px] font-bold uppercase tracking-[0.18em]", accent ? "text-gray-400" : "text-[#888888]")}>{label}</p>
      <p className={cn("mt-2 text-2xl font-black tracking-tight", accent ? "text-white" : "text-[#111111]")}>{value}</p>
    </div>
  );
}

function NavCard({ icon, title, description, onClick, muted = false }: { icon: React.ReactNode; title: string; description: string; onClick?: () => void; muted?: boolean }) {
  return (
    <button
      className={cn(
        "group flex items-start gap-4 rounded-2xl border border-[#EAEAEA] bg-white p-5 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
        muted && "opacity-60",
      )}
      onClick={onClick}
      type="button"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 transition-colors group-hover:bg-gray-100">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-[#111111]">{title}</p>
        <p className="mt-1 text-xs font-medium text-gray-500">{description}</p>
      </div>
      {onClick ? <span className="ml-auto shrink-0 text-gray-300 transition-colors group-hover:text-[#111111]">→</span> : null}
    </button>
  );
}

function ToolbarSelect({ icon, label, onChange, options, value }: { icon: React.ReactNode; label: string; onChange: (value: string) => void; options: string[]; value: string }) {
  return (
    <label className="flex min-w-[170px] items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-3 py-2.5 text-[13px] font-bold text-gray-600 shadow-sm">
      <span className="shrink-0 text-gray-400">{icon}</span>
      <span className="text-[#666666]">{label}</span>
      <select
        className="w-full bg-transparent text-right font-semibold text-[#111111] outline-none"
        onChange={(e) => onChange(e.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {selectLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function TableHead({ label, align = "left" }: { label: string; align?: "left" | "right" }) {
  return (
    <th className={cn("px-6 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]", align === "right" ? "text-right" : "text-left")}>
      {label}
    </th>
  );
}

function TableFooter({ count, total }: { count: number; total: number }) {
  return (
    <div className="flex items-center justify-between border-t border-[#EAEAEA] bg-[#FAFAFA]/50 px-6 py-4">
      <span className="block text-xs font-bold uppercase tracking-[0.18em] text-[#888888]">
        Mostrando <b className="px-1 text-[#111111]">{count}</b> de {total}
      </span>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-gray-100 bg-gray-50 shadow-sm">
        <BarChart3 className="h-8 w-8 text-gray-300" />
      </div>
      <h3 className="text-xl font-extrabold text-[#111111]">Todavia no hay datos en esta vista</h3>
      <p className="mt-2 max-w-md text-[15px] font-medium text-[#888888]">
        Estado vacio simulado para QA. Regresa a la vista operativa para ver datos.
      </p>
      <button
        className="mt-6 rounded-xl border border-[#EAEAEA] bg-white px-6 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        onClick={onReset}
        type="button"
      >
        Volver a la muestra
      </button>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-red-100 bg-red-50 shadow-sm">
        <AlertTriangle className="h-8 w-8 text-red-400" />
      </div>
      <h3 className="text-xl font-extrabold text-[#111111]">No pudimos cargar los datos</h3>
      <p className="mt-2 max-w-md text-[15px] font-medium text-[#888888]">
        Estado simulado para QA visual. El retry vuelve a la vista operativa sin tocar datos.
      </p>
      <button
        className="mt-6 rounded-xl bg-[#111111] px-6 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        onClick={onRetry}
        type="button"
      >
        Reintentar
      </button>
    </div>
  );
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div aria-live="polite" className="fixed right-6 top-6 z-[60] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div key={toast.id} className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-xl animate-in slide-in-from-right-5 fade-in duration-300">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#111111]">{toast.title}</p>
              <p className="mt-1 text-sm font-medium text-gray-500">{toast.description}</p>
            </div>
            <button
              aria-label="Cerrar notificacion"
              className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#111111]"
              onClick={() => onDismiss(toast.id)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function selectLabel(value: string): string {
  switch (value) {
    case "7d": return "7 dias";
    case "30d": return "30 dias";
    case "90d": return "90 dias";
    case "live": return "Operativa";
    case "empty": return "Vacio";
    case "error": return "Error";
    default: return value;
  }
}
