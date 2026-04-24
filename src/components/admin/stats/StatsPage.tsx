"use client";

import { useCallback, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CircleDollarSign,
  Eye,
  Loader2,
  Minus,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { fmtCurrency, fmtNumber, fmtPercent } from "@/lib/stats/format";
import type {
  AudienceData,
  CommercialData,
  OverviewData,
} from "@/lib/stats/types";

import { DateRangePicker, type DateRangeValue } from "./DateRangePicker";
import { RevenueHeroChart } from "./RevenueHeroChart";

// ─── Stats Page · Rendimiento ────────────────────────────────────────────
//
// Subroute of the Estadísticas family. Two-tab structure:
//   · Rendimiento — date-range driven hero chart + KPI strip + commercial
//                   detail (top products, categories, table).
//   · Clientes    — audience breakdown (segments, top customers, channel).
//
// The header, range picker and tabs all live in one editorial frame so
// the surface reads as a single executive cockpit instead of a dashboard
// of disconnected widgets.

const TABS = [
  { key: "panel", label: "Rendimiento", icon: TrendingUp },
  { key: "clientes", label: "Clientes", icon: Users },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface StatsPageProps {
  overview: OverviewData;
  commercial: CommercialData;
  audience: AudienceData;
  initialTab?: TabKey;
}

export function StatsPage({
  overview,
  commercial,
  audience,
  initialTab = "panel",
}: StatsPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [isPending, startTransition] = useTransition();

  // The active range mirrors what the server produced. Changing it in the
  // picker pushes new searchParams and triggers a server-side refetch
  // (Next handles revalidation thanks to dynamic = "force-dynamic").
  const range: DateRangeValue = { from: overview.range.from, to: overview.range.to };

  const handleRangeChange = useCallback(
    (next: DateRangeValue) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("from", next.from);
      params.set("to", next.to);
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const handleTabChange = useCallback(
    (key: TabKey) => {
      setActiveTab(key);
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("tab", key);
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-7"
    >
      {/* ── Editorial header ─────────────────────────────────────────── */}
      <header className="relative">
        <div className="mb-3 flex items-center gap-2 text-[11px] font-medium text-ink-6">
          <span className="uppercase tracking-[0.16em]">Estadísticas</span>
          <span aria-hidden>›</span>
          <span className="text-ink-0">Rendimiento</span>
          <AnimatePresence>
            {isPending && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="ml-2 inline-flex items-center gap-1 text-[10px] text-ink-5"
              >
                <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
                Actualizando
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-semibold text-[34px] leading-[1.02] tracking-[-0.035em] text-ink-0 sm:text-[42px]">
              Cómo marcha tu negocio.
            </h1>
            <p className="mt-2.5 max-w-xl text-[14px] leading-[1.55] text-ink-5">
              Ingresos, pedidos, clientes y márgenes para el rango elegido. Comparado contra el periodo anterior de igual duración.
            </p>
          </div>
          <DateRangePicker value={range} onChange={handleRangeChange} className="self-start lg:self-end" />
        </div>
      </header>

      {/* ── Tab navigation — animated underline ──────────────────────── */}
      <nav
        role="tablist"
        aria-label="Vista analítica"
        className="flex items-center gap-6 border-b border-[color:var(--hairline)]"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                "relative flex items-center gap-2 pb-3 pt-1 text-[13px] font-medium transition-colors outline-none",
                active ? "text-ink-0" : "text-ink-5 hover:text-ink-0",
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              {tab.label}
              {active && (
                <motion.span
                  layoutId="stats-tab-underline"
                  className="absolute -bottom-px left-0 right-0 h-px bg-ink-0"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Tab content ──────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          {activeTab === "panel" && <PanelTab overview={overview} commercial={commercial} />}
          {activeTab === "clientes" && <ClientesTab data={audience} />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PANEL TAB — Executive Overview + Commercial merged
// ═══════════════════════════════════════════════════════════════════════════

function PanelTab({
  overview,
  commercial,
}: {
  overview: OverviewData;
  commercial: CommercialData;
}) {
  const { kpis, dailyRevenue, prevDailyRevenue, topProducts, revenueByCategory } = overview;
  const hasData = kpis.revenue30d > 0 || kpis.orders30d > 0;

  if (!hasData) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-5 w-5 text-ink-6" strokeWidth={1.5} />}
        title="Aún no hay datos de ventas en este rango."
        description="Probá un rango más amplio (90 días, año en curso) o esperá a que se registren las primeras ventas con pago confirmado."
      />
    );
  }

  // ── Auto-generated insights ──────────────────────────────────────────
  const insights: { icon: React.ReactNode; text: string; tone: "success" | "danger" | "neutral" }[] = [];

  if (kpis.revenueChange !== null) {
    if (kpis.revenueChange > 0) {
      insights.push({
        icon: <TrendingUp className="h-3.5 w-3.5" strokeWidth={2} />,
        text: `Ingresos ${fmtPercent(kpis.revenueChange)} vs periodo anterior`,
        tone: "success",
      });
    } else if (kpis.revenueChange < 0) {
      insights.push({
        icon: <ArrowDownRight className="h-3.5 w-3.5" strokeWidth={2} />,
        text: `Ingresos ${fmtPercent(kpis.revenueChange)} vs periodo anterior`,
        tone: "danger",
      });
    }
  }

  if (topProducts.length > 0) {
    insights.push({
      icon: <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />,
      text: `${topProducts[0].title} lidera con ${fmtCurrency(topProducts[0].revenue)}`,
      tone: "neutral",
    });
  }

  if (kpis.newCustomers30d > 0) {
    insights.push({
      icon: <Users className="h-3.5 w-3.5" strokeWidth={2} />,
      text: `${fmtNumber(kpis.newCustomers30d)} clientes nuevos este mes`,
      tone: "neutral",
    });
  }

  if (kpis.marginPercent !== null && kpis.marginPercent < 15) {
    insights.push({
      icon: <Eye className="h-3.5 w-3.5" strokeWidth={2} />,
      text: `Margen neto bajo (${kpis.marginPercent}%) — revisar costos`,
      tone: "danger",
    });
  }

  return (
    <div className="space-y-7">
      {/* ── Hero chart — protagonist ──────────────────────────────────── */}
      <section className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 lg:p-8">
        {dailyRevenue.length > 0 ? (
          <RevenueHeroChart
            current={dailyRevenue}
            previous={prevDailyRevenue}
            totalRevenue={kpis.revenue30d}
            prevTotalRevenue={kpis.revenuePrev30d}
            changePercent={kpis.revenueChange}
          />
        ) : (
          <div className="flex h-[300px] items-center justify-center text-[13px] text-ink-6">
            Sin datos suficientes para el gráfico.
          </div>
        )}
      </section>

      {/* ── Insight strip ─────────────────────────────────────────────── */}
      {insights.length > 0 && (
        <section className="flex flex-wrap gap-2">
          {insights.slice(0, 4).map((insight, i) => (
            <InsightChip key={i} icon={insight.icon} text={insight.text} tone={insight.tone} />
          ))}
        </section>
      )}

      {/* ── KPI strip ──────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KPICard
          label="Pedidos"
          value={fmtNumber(kpis.orders30d)}
          change={kpis.ordersChange}
          icon={<ShoppingCart className="h-4 w-4" strokeWidth={1.75} />}
        />
        <KPICard
          label="Ticket promedio"
          value={fmtCurrency(kpis.avgTicket)}
          change={kpis.avgTicketChange}
          icon={<TrendingUp className="h-4 w-4" strokeWidth={1.75} />}
        />
        <KPICard
          label="Margen neto"
          value={kpis.marginPercent !== null ? `${kpis.marginPercent}%` : "—"}
          change={null}
          icon={<CircleDollarSign className="h-4 w-4" strokeWidth={1.75} />}
          tone={kpis.marginPercent !== null && kpis.marginPercent < 15 ? "warning" : "neutral"}
        />
        <KPICard
          label="Clientes nuevos"
          value={fmtNumber(kpis.newCustomers30d)}
          change={null}
          icon={<Users className="h-4 w-4" strokeWidth={1.75} />}
        />
        <KPICard
          label="Tasa repetición"
          value={kpis.repeatRate !== null ? `${kpis.repeatRate}%` : "—"}
          change={null}
          icon={<Sparkles className="h-4 w-4" strokeWidth={1.75} />}
        />
      </section>

      {/* ── Top products + categorías ────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 lg:col-span-3">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5 mb-4">
            Productos que más venden
          </h3>
          <div className="space-y-2.5">
            {topProducts.slice(0, 8).map((p, i) => (
              <ProductRow key={i} rank={i + 1} title={p.title} value={fmtCurrency(p.revenue)} meta={`${p.units} uds`} />
            ))}
            {topProducts.length === 0 && (
              <p className="py-8 text-center text-[13px] text-ink-6">Sin ventas en el periodo.</p>
            )}
          </div>
        </div>

        <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 lg:col-span-2">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5 mb-5">
            Ingresos por categoría
          </h3>
          {revenueByCategory.length > 0 ? (
            <CategoryChart data={revenueByCategory} />
          ) : (
            <div className="flex h-[200px] items-center justify-center text-[13px] text-ink-6">
              Sin datos de categorías.
            </div>
          )}
        </div>
      </section>

      {/* ── Product performance table ────────────────────────────────── */}
      <section>
        <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
          <div className="px-5 pt-5 pb-2">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
              Rendimiento de productos
            </h3>
          </div>
          {commercial.topProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-t border-[color:var(--hairline)] text-[10px] font-medium uppercase tracking-[0.12em] text-ink-6">
                    <th className="px-5 py-2.5 text-left">#</th>
                    <th className="px-5 py-2.5 text-left">Producto</th>
                    <th className="px-5 py-2.5 text-right">Ingresos</th>
                    <th className="px-5 py-2.5 text-right">Uds</th>
                    <th className="px-5 py-2.5 text-right">Margen</th>
                    <th className="px-5 py-2.5 text-right">Salud</th>
                  </tr>
                </thead>
                <tbody>
                  {commercial.topProducts.slice(0, 8).map((p, i) => (
                    <tr
                      key={p.id}
                      className="border-t border-[color:var(--hairline)] transition-colors hover:bg-[var(--surface-2)]"
                    >
                      <td className="px-5 py-2.5 tabular-nums text-ink-6">{i + 1}</td>
                      <td className="px-5 py-2.5 font-medium text-ink-0 max-w-[180px] truncate">
                        {p.title}
                      </td>
                      <td className="px-5 py-2.5 tabular-nums text-ink-0 text-right">
                        {fmtCurrency(p.revenue)}
                      </td>
                      <td className="px-5 py-2.5 tabular-nums text-ink-0 text-right">{p.units}</td>
                      <td className="px-5 py-2.5 tabular-nums text-right">
                        <MarginBadge margin={p.marginPercent} />
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <HealthBadge health={p.marginHealth} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-[13px] text-ink-6">
              Sin datos de productos.
            </div>
          )}
        </div>
      </section>

      {/* ── Context strip ──────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ContextPill label="Clientes totales" value={fmtNumber(kpis.totalCustomers)} />
        <ContextPill label="Clientes nuevos" value={fmtNumber(kpis.newCustomers30d)} />
        <ContextPill label="Productos publicados" value={fmtNumber(kpis.productsPublished)} />
        <ContextPill
          label="Conversión catálogo"
          value={
            kpis.productsPublished > 0
              ? `${Math.round((kpis.productsWithSales / kpis.productsPublished) * 100)}%`
              : "—"
          }
        />
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CLIENTES TAB
// ═══════════════════════════════════════════════════════════════════════════

function ClientesTab({ data }: { data: AudienceData }) {
  const hasData = data.totalCustomers > 0;

  if (!hasData) {
    return (
      <EmptyState
        icon={<Users className="h-5 w-5 text-ink-6" strokeWidth={1.5} />}
        title="Sin datos de clientes."
        description="Los clientes y segmentos aparecerán cuando se registren las primeras ventas."
      />
    );
  }

  const segmentData = [
    { name: "Nuevos", value: data.newCustomers30d, color: "#6366f1" },
    { name: "Recurrentes", value: data.recurringCustomers, color: "#10b981" },
    { name: "VIP", value: data.vipCustomers, color: "#4338ca" },
    { name: "Inactivos", value: data.inactiveCustomers, color: "#94a3b8" },
  ].filter((s) => s.value > 0);

  return (
    <div className="space-y-7">
      {/* KPI strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KPICard
          label="Clientes totales"
          value={fmtNumber(data.totalCustomers)}
          icon={<Users className="h-4 w-4" strokeWidth={1.75} />}
        />
        <KPICard
          label="Nuevos 30d"
          value={fmtNumber(data.newCustomers30d)}
          icon={<Users className="h-4 w-4" strokeWidth={1.75} />}
        />
        <KPICard
          label="Recurrentes"
          value={fmtNumber(data.recurringCustomers)}
          icon={<TrendingUp className="h-4 w-4" strokeWidth={1.75} />}
        />
        <KPICard
          label="Ø Pedidos/cliente"
          value={fmtNumber(data.avgOrdersPerCustomer)}
          icon={<ShoppingCart className="h-4 w-4" strokeWidth={1.75} />}
        />
        <KPICard
          label="Ø Gasto/cliente"
          value={fmtCurrency(data.avgRevenuePerCustomer)}
          icon={<CircleDollarSign className="h-4 w-4" strokeWidth={1.75} />}
        />
      </section>

      {/* Segment chart + Top customers */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* Segment donut */}
        <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 lg:col-span-2">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5 mb-4">
            Segmentos
          </h3>
          {segmentData.length > 0 ? (
            <>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={segmentData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {segmentData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [val, "Clientes"]}
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        background: "#fff",
                        fontSize: 13,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
                {segmentData.map((s) => (
                  <div key={s.name} className="flex items-center gap-2 text-[12px]">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-ink-5">{s.name}</span>
                    <span className="tabular-nums font-medium text-ink-0 ml-auto">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-[13px] text-ink-6">
              Sin datos de segmentos.
            </div>
          )}
        </div>

        {/* Top customers table */}
        {data.topCustomers.length > 0 ? (
          <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] lg:col-span-3">
            <div className="px-5 pt-5 pb-2">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
                Mejores clientes
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-t border-[color:var(--hairline)] text-[10px] font-medium uppercase tracking-[0.12em] text-ink-6">
                    <th className="px-5 py-2.5 text-left">#</th>
                    <th className="px-5 py-2.5 text-left">Email</th>
                    <th className="px-5 py-2.5 text-right">Pedidos</th>
                    <th className="px-5 py-2.5 text-right">Gasto total</th>
                    <th className="px-5 py-2.5 text-right">Última compra</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topCustomers.map((c, i) => (
                    <tr
                      key={c.email}
                      className="border-t border-[color:var(--hairline)] transition-colors hover:bg-[var(--surface-2)]"
                    >
                      <td className="px-5 py-2.5 tabular-nums text-ink-6">{i + 1}</td>
                      <td className="px-5 py-2.5 text-ink-0 truncate max-w-[200px]">{c.email}</td>
                      <td className="px-5 py-2.5 tabular-nums text-ink-0 text-right">
                        {c.ordersCount}
                      </td>
                      <td className="px-5 py-2.5 tabular-nums text-ink-0 text-right">
                        {fmtCurrency(c.totalSpent)}
                      </td>
                      <td className="px-5 py-2.5 text-ink-5 text-right">
                        {relativeTime(c.lastPurchaseAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] flex items-center justify-center text-[13px] text-ink-6 lg:col-span-3">
            Sin datos de clientes destacados.
          </div>
        )}
      </section>

      {/* Channel chart */}
      {data.ordersByChannel.length > 0 && (
        <section className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
              Pedidos por canal
            </h3>
            <span className="text-[10px] text-ink-6">
              {data.ordersByChannel.length} canal{data.ordersByChannel.length !== 1 ? "es" : ""}
            </span>
          </div>
          <ChannelChart data={data.ordersByChannel} />
        </section>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════

type KPITone = "neutral" | "warning" | "danger";

function KPICard({
  label,
  value,
  change,
  icon,
  tone = "neutral",
  hero = false,
}: {
  label: string;
  value: string;
  change?: number | null;
  icon?: React.ReactNode;
  tone?: KPITone;
  hero?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--r-lg)] border bg-[var(--surface-0)] p-4 transition-shadow hover:shadow-sm",
        hero
          ? "border-[color:var(--accent-200)] bg-gradient-to-br from-[var(--accent-50)] to-transparent"
          : "border-[color:var(--hairline)]",
      )}
    >
      <div className="flex items-center justify-between mb-2.5">
        <p
          className={cn(
            "text-[10px] font-medium uppercase tracking-[0.14em]",
            hero ? "text-[var(--accent-600)]" : "text-ink-5",
          )}
        >
          {label}
        </p>
        <span className={cn(hero ? "text-[var(--accent-500)]" : "text-ink-6")}>{icon}</span>
      </div>
      <p
        className={cn(
          "tabular-nums font-medium tracking-[-0.01em]",
          hero ? "text-[26px]" : "text-[22px]",
          tone === "warning"
            ? "text-[color:var(--signal-warning)]"
            : tone === "danger"
              ? "text-[color:var(--signal-danger)]"
              : "text-ink-0",
        )}
      >
        {value}
      </p>
      {change !== undefined && change !== null && <ChangeIndicator change={change} />}
    </div>
  );
}

function ChangeIndicator({ change }: { change: number }) {
  const isUp = change > 0;
  const isDown = change < 0;
  return (
    <div
      className={cn(
        "mt-1.5 flex items-center gap-1 text-[11px] font-medium",
        isUp
          ? "text-[color:var(--signal-success)]"
          : isDown
            ? "text-[color:var(--signal-danger)]"
            : "text-ink-5",
      )}
    >
      {isUp ? (
        <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
      ) : isDown ? (
        <ArrowDownRight className="h-3 w-3" strokeWidth={2} />
      ) : (
        <Minus className="h-3 w-3" strokeWidth={2} />
      )}
      <span className="tabular-nums">{fmtPercent(change)}</span>
      <span className="text-ink-6">vs prev.</span>
    </div>
  );
}

function InsightChip({
  icon,
  text,
  tone,
}: {
  icon: React.ReactNode;
  text: string;
  tone: "success" | "danger" | "neutral";
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-[var(--r-md)] border px-3 py-1.5 text-[12px] font-medium",
        tone === "success" &&
          "border-[color:var(--signal-success)]/20 bg-[color:var(--signal-success)]/5 text-[color:var(--signal-success)]",
        tone === "danger" &&
          "border-[color:var(--signal-danger)]/20 bg-[color:var(--signal-danger)]/5 text-[color:var(--signal-danger)]",
        tone === "neutral" && "border-[color:var(--hairline)] bg-[var(--surface-0)] text-ink-5",
      )}
    >
      {icon}
      {text}
    </div>
  );
}

function ProductRow({
  rank,
  title,
  value,
  meta,
}: {
  rank: number;
  title: string;
  value: string;
  meta: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums",
          rank <= 3
            ? "bg-[var(--accent-500)]/10 text-[var(--accent-600)]"
            : "bg-[var(--surface-2)] text-ink-6",
        )}
      >
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-ink-0 truncate">{title}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="tabular-nums text-[13px] font-medium text-ink-0">{value}</p>
        <p className="text-[10px] text-ink-5">{meta}</p>
      </div>
    </div>
  );
}

function ContextPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-6 mb-1">
        {label}
      </p>
      <p className="tabular-nums text-[15px] font-medium text-ink-0">{value}</p>
    </div>
  );
}

function MarginBadge({ margin }: { margin: number | null }) {
  if (margin === null) return <span className="text-ink-6">—</span>;
  const tone =
    margin < 0
      ? "text-[color:var(--signal-danger)]"
      : margin < 15
        ? "text-[color:var(--signal-warning)]"
        : "text-[color:var(--signal-success)]";
  return <span className={cn("tabular-nums font-medium", tone)}>{margin}%</span>;
}

function HealthBadge({ health }: { health: string }) {
  const styles: Record<string, string> = {
    saludable: "bg-[color:var(--signal-success)]/10 text-[color:var(--signal-success)]",
    fino: "bg-[color:var(--signal-warning)]/10 text-[color:var(--signal-warning)]",
    riesgo: "bg-[color:var(--signal-danger)]/10 text-[color:var(--signal-danger)]",
    negativo: "bg-[color:var(--signal-danger)]/10 text-[color:var(--signal-danger)]",
    "sin datos": "bg-[var(--surface-2)] text-ink-5",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-[var(--r-xs)] px-2 py-0.5 text-[10px] font-medium",
        styles[health] || styles["sin datos"],
      )}
    >
      {health}
    </span>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[var(--r-lg)] border border-dashed border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-6 py-20 text-center">
      <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
        {icon}
      </div>
      <h3 className="font-semibold text-[22px] tracking-[-0.02em] text-ink-0">{title}</h3>
      <p className="mt-2 max-w-md text-[14px] leading-[1.55] text-ink-5">{description}</p>
    </div>
  );
}

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mes`;
}

// ─── Charts ──────────────────────────────────────────────────────────────

const CHART_COLORS = [
  "#6366f1",
  "#4338ca",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];

function CategoryChart({ data }: { data: { category: string; revenue: number; units: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
        />
        <YAxis
          type="category"
          dataKey="category"
          tick={{ fontSize: 11, fill: "#1e293b" }}
          tickLine={false}
          axisLine={false}
          width={100}
        />
        <Tooltip
          formatter={(val) => [fmtCurrency(Number(val)), "Ingresos"]}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            background: "#fff",
            fontSize: 12,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        />
        <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={18}>
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ChannelChart({ data }: { data: { channel: string; count: number; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="channel"
          tick={{ fontSize: 11, fill: "#1e293b" }}
          tickLine={false}
          axisLine={{ stroke: "#e2e8f0" }}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
        />
        <Tooltip
          formatter={(val, name) => [
            name === "revenue" ? fmtCurrency(Number(val)) : val,
            name === "revenue" ? "Ingresos" : "Pedidos",
          ]}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            background: "#fff",
            fontSize: 12,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        />
        <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}