"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CircleDollarSign,
  Minus,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
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
  DailyRevenuePoint,
  OverviewData,
} from "@/lib/stats/types";

// ─── Stats Page ──────────────────────────────────────────────────────────
// Three-tab statistics module: Resumen · Comercial · Audiencia.
// Token-based styling matches Nexora's design system. Charts via recharts.
// Every metric comes from real DB data — no fabricated numbers.

const TABS = [
  { key: "resumen", label: "Resumen" },
  { key: "comercial", label: "Comercial" },
  { key: "audiencia", label: "Audiencia" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface StatsPageProps {
  overview: OverviewData;
  commercial: CommercialData;
  audience: AudienceData;
  initialTab?: TabKey;
}

export function StatsPage({ overview, commercial, audience, initialTab = "resumen" }: StatsPageProps) {
  const activeTab = initialTab;

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Header */}
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
          Estadísticas
        </p>
        <h1 className="mt-2 font-semibold text-[34px] leading-[1.02] tracking-[-0.035em] text-ink-0 sm:text-[42px]">
          Cómo marcha tu negocio.
        </h1>
        <p className="mt-3 max-w-xl text-[14px] leading-[1.55] text-ink-5">
          Datos reales de ventas, productos y clientes. Últimos 30 días comparados con el periodo anterior.
        </p>
      </header>

      {/* Tab navigation */}
      <nav className="flex gap-1 rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-1">
        {TABS.map((tab) => (
          <a
            key={tab.key}
            href={`/admin/stats?tab=${tab.key}`}
            className={cn(
              "flex-1 rounded-[var(--r-md)] py-2 text-center text-[13px] font-medium transition-colors",
              activeTab === tab.key
                ? "bg-[var(--surface-2)] text-ink-0"
                : "text-ink-5 hover:text-ink-0",
            )}
          >
            {tab.label}
          </a>
        ))}
      </nav>

      {/* Tab content */}
      {activeTab === "resumen" && <OverviewTab data={overview} />}
      {activeTab === "comercial" && <CommercialTab data={commercial} />}
      {activeTab === "audiencia" && <AudienceTab data={audience} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════

function OverviewTab({ data }: { data: OverviewData }) {
  const { kpis, dailyRevenue, topProducts, revenueByCategory } = data;
  const hasData = kpis.revenue30d > 0 || kpis.orders30d > 0;

  if (!hasData) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-[var(--r-lg)] border border-dashed border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-6 py-20 text-center">
        <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
          <BarChart3 className="h-5 w-5 text-ink-6" strokeWidth={1.5} />
        </div>
        <h3 className="font-semibold text-[22px] tracking-[-0.02em] text-ink-0">
          Aún no hay datos de ventas.
        </h3>
        <p className="mt-2 max-w-md text-[14px] leading-[1.55] text-ink-5">
          Las estadísticas aparecerán automáticamente cuando se registren las primeras ventas con pago confirmado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* KPI strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KPICard
          label="Ingresos 30d"
          value={fmtCurrency(kpis.revenue30d)}
          change={kpis.revenueChange}
          icon={<CircleDollarSign className="h-4 w-4" strokeWidth={1.75} />}
        />
        <KPICard
          label="Pedidos 30d"
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
          icon={<BarChart3 className="h-4 w-4" strokeWidth={1.75} />}
          tone={kpis.marginPercent !== null && kpis.marginPercent < 15 ? "warning" : "neutral"}
        />
        <KPICard
          label="Repetición"
          value={kpis.repeatRate !== null ? `${kpis.repeatRate}%` : "—"}
          change={null}
          icon={<Users className="h-4 w-4" strokeWidth={1.75} />}
        />
      </section>

      {/* Revenue chart + Top products */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Revenue area chart — 3 cols */}
        <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 lg:col-span-3">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5 mb-5">
            Evolución de ingresos
          </h3>
          {dailyRevenue.length > 0 ? (
            <RevenueChart data={dailyRevenue} />
          ) : (
            <div className="flex h-[200px] items-center justify-center text-[13px] text-ink-6">
              Sin datos suficientes para el gráfico.
            </div>
          )}
        </div>

        {/* Top products — 2 cols */}
        <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 lg:col-span-2">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5 mb-4">
            Productos que más venden
          </h3>
          <div className="space-y-3">
            {topProducts.slice(0, 6).map((p, i) => (
              <ProductRow key={i} rank={i + 1} title={p.title} value={fmtCurrency(p.revenue)} meta={`${p.units} uds`} />
            ))}
            {topProducts.length === 0 && (
              <p className="py-8 text-center text-[13px] text-ink-6">Sin ventas en el periodo.</p>
            )}
          </div>
        </div>
      </section>

      {/* Categories + Quick stats */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Category breakdown */}
        <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 lg:col-span-2">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5 mb-5">
            Ingresos por categoría
          </h3>
          {revenueByCategory.length > 0 ? (
            <CategoryChart data={revenueByCategory} />
          ) : (
            <div className="flex h-[180px] items-center justify-center text-[13px] text-ink-6">
              Sin datos de categorías.
            </div>
          )}
        </div>

        {/* Quick stats panel */}
        <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5 mb-4">
            Contexto
          </h3>
          <div className="space-y-4">
            <ContextRow label="Clientes totales" value={fmtNumber(kpis.totalCustomers)} />
            <ContextRow label="Nuevos clientes 30d" value={fmtNumber(kpis.newCustomers30d)} />
            <ContextRow label="Productos publicados" value={fmtNumber(kpis.productsPublished)} />
            <ContextRow label="Productos con ventas" value={fmtNumber(kpis.productsWithSales)} />
            <ContextRow
              label="Conversión catálogo"
              value={
                kpis.productsPublished > 0
                  ? `${Math.round((kpis.productsWithSales / kpis.productsPublished) * 100)}%`
                  : "—"
              }
            />
          </div>
        </div>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMERCIAL TAB
// ═══════════════════════════════════════════════════════════════════════════

function CommercialTab({ data }: { data: CommercialData }) {
  const { topProducts, topCategories, bottomProducts } = data;
  const hasData = topProducts.length > 0;

  if (!hasData) {
    return (
      <EmptyTab
        title="Sin datos comerciales."
        description="Los productos y categorías aparecerán cuando se registren ventas con pago confirmado."
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Top products table */}
      <section className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
            Productos por ingreso
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-t border-[color:var(--hairline)] text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">
                <th className="px-5 py-3 text-left">#</th>
                <th className="px-5 py-3 text-left">Producto</th>
                <th className="px-5 py-3 text-left">Categoría</th>
                <th className="px-5 py-3 text-right">Ingresos</th>
                <th className="px-5 py-3 text-right">Unidades</th>
                <th className="px-5 py-3 text-right">Margen</th>
                <th className="px-5 py-3 text-right">Salud</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, i) => (
                <tr key={p.id} className="border-t border-[color:var(--hairline)] transition-colors hover:bg-[var(--surface-2)]">
                  <td className="px-5 py-3 tabular text-ink-6">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-ink-0 max-w-[200px] truncate">{p.title}</td>
                  <td className="px-5 py-3 text-ink-5">{p.category}</td>
                  <td className="px-5 py-3 tabular text-ink-0 text-right">{fmtCurrency(p.revenue)}</td>
                  <td className="px-5 py-3 tabular text-ink-0 text-right">{p.units}</td>
                  <td className="px-5 py-3 tabular text-right">
                    <MarginBadge margin={p.marginPercent} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <HealthBadge health={p.marginHealth} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Categories + Bottom products */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category performance */}
        <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5 mb-4">
            Rendimiento por categoría
          </h3>
          <div className="space-y-3">
            {topCategories.map((cat) => (
              <div key={cat.category} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-ink-0 truncate">{cat.category}</p>
                  <p className="text-[11px] text-ink-5">{cat.productCount} productos · {fmtNumber(cat.units)} uds</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="tabular text-[14px] font-medium text-ink-0">{fmtCurrency(cat.revenue)}</p>
                  {cat.avgMargin !== null && (
                    <p className="text-[11px] text-ink-5">Margen {cat.avgMargin}%</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom products */}
        <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5 mb-4">
            Productos con menor salida
          </h3>
          <div className="space-y-3">
            {bottomProducts.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-ink-0 truncate">{p.title}</p>
                  <p className="text-[11px] text-ink-5">{p.category}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="tabular text-[14px] font-medium text-ink-0">{fmtCurrency(p.revenue)}</p>
                  <p className="text-[11px] text-ink-5">{p.units} uds</p>
                </div>
              </div>
            ))}
            {bottomProducts.length === 0 && (
              <p className="py-6 text-center text-[13px] text-ink-6">Todos los productos tienen buen rendimiento.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIENCE TAB
// ═══════════════════════════════════════════════════════════════════════════

function AudienceTab({ data }: { data: AudienceData }) {
  const hasData = data.totalCustomers > 0;

  if (!hasData) {
    return (
      <EmptyTab
        title="Sin datos de audiencia."
        description="Los clientes y canales aparecerán cuando se registren las primeras ventas."
      />
    );
  }

  const segmentData = [
    { name: "Nuevos", value: data.newCustomers30d, color: "var(--accent-500)" },
    { name: "Recurrentes", value: data.recurringCustomers, color: "var(--signal-success)" },
    { name: "VIP", value: data.vipCustomers, color: "var(--accent-700)" },
    { name: "Inactivos", value: data.inactiveCustomers, color: "var(--hairline-strong)" },
  ].filter((s) => s.value > 0);

  return (
    <div className="space-y-8">
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

      {/* Segment chart + Channel breakdown */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Segment pie */}
        <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5 mb-4">
            Segmentos
          </h3>
          {segmentData.length > 0 ? (
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
                      <Cell key={i} fill={`var(--chart-${i + 1})`} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [val, "Clientes"]}
                    contentStyle={{
                      borderRadius: "var(--r-md)",
                      border: "1px solid var(--hairline)",
                      background: "var(--surface-0)",
                      fontSize: 13,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-[13px] text-ink-6">
              Sin datos.
            </div>
          )}
          {/* Legend */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {segmentData.map((s) => (
              <div key={s.name} className="flex items-center gap-2 text-[12px]">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-ink-5">{s.name}</span>
                <span className="tabular font-medium text-ink-0 ml-auto">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Channel breakdown */}
        <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 lg:col-span-2">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5 mb-4">
            Pedidos por canal
          </h3>
          {data.ordersByChannel.length > 0 ? (
            <ChannelChart data={data.ordersByChannel} />
          ) : (
            <div className="flex h-[200px] items-center justify-center text-[13px] text-ink-6">
              Sin datos de canales.
            </div>
          )}
        </div>
      </section>

      {/* Top customers table */}
      {data.topCustomers.length > 0 && (
        <section className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
          <div className="px-5 pt-5 pb-3">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
              Mejores clientes
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-t border-[color:var(--hairline)] text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">
                  <th className="px-5 py-3 text-left">#</th>
                  <th className="px-5 py-3 text-left">Email</th>
                  <th className="px-5 py-3 text-right">Pedidos</th>
                  <th className="px-5 py-3 text-right">Gasto total</th>
                  <th className="px-5 py-3 text-right">Última compra</th>
                </tr>
              </thead>
              <tbody>
                {data.topCustomers.map((c, i) => (
                  <tr key={c.email} className="border-t border-[color:var(--hairline)] transition-colors hover:bg-[var(--surface-2)]">
                    <td className="px-5 py-3 tabular text-ink-6">{i + 1}</td>
                    <td className="px-5 py-3 text-ink-0 truncate max-w-[220px]">{c.email}</td>
                    <td className="px-5 py-3 tabular text-ink-0 text-right">{c.ordersCount}</td>
                    <td className="px-5 py-3 tabular text-ink-0 text-right">{fmtCurrency(c.totalSpent)}</td>
                    <td className="px-5 py-3 text-ink-5 text-right">{relativeTime(c.lastPurchaseAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
}: {
  label: string;
  value: string;
  change?: number | null;
  icon?: React.ReactNode;
  tone?: KPITone;
}) {
  return (
    <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">{label}</p>
        {icon && <span className="text-ink-6">{icon}</span>}
      </div>
      <p
        className={cn(
          "tabular text-[22px] font-medium tracking-[-0.01em]",
          tone === "warning" ? "text-[color:var(--signal-warning)]" : tone === "danger" ? "text-[color:var(--signal-danger)]" : "text-ink-0",
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
    <div className={cn("mt-1 flex items-center gap-1 text-[11px] font-medium", isUp ? "text-[color:var(--signal-success)]" : isDown ? "text-[color:var(--signal-danger)]" : "text-ink-5")}>
      {isUp ? <ArrowUpRight className="h-3 w-3" strokeWidth={2} /> : isDown ? <ArrowDownRight className="h-3 w-3" strokeWidth={2} /> : <Minus className="h-3 w-3" strokeWidth={2} />}
      <span className="tabular">{fmtPercent(change)}</span>
      <span className="text-ink-6">vs prev.</span>
    </div>
  );
}

function ProductRow({ rank, title, value, meta }: { rank: number; title: string; value: string; meta: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="tabular text-[12px] text-ink-6 w-5 text-right">{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-ink-0 truncate">{title}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="tabular text-[13px] font-medium text-ink-0">{value}</p>
        <p className="text-[10px] text-ink-5">{meta}</p>
      </div>
    </div>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-ink-5">{label}</span>
      <span className="tabular text-[13px] font-medium text-ink-0">{value}</span>
    </div>
  );
}

function MarginBadge({ margin }: { margin: number | null }) {
  if (margin === null) return <span className="text-ink-6">—</span>;
  const tone = margin < 0 ? "text-[color:var(--signal-danger)]" : margin < 15 ? "text-[color:var(--signal-warning)]" : "text-[color:var(--signal-success)]";
  return <span className={cn("tabular font-medium", tone)}>{margin}%</span>;
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
    <span className={cn("inline-flex rounded-[var(--r-xs)] px-2 py-0.5 text-[10px] font-medium", styles[health] || styles["sin datos"])}>
      {health}
    </span>
  );
}

function EmptyTab({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-[var(--r-lg)] border border-dashed border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-6 py-20 text-center">
      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
        <Package className="h-5 w-5 text-ink-6" strokeWidth={1.5} />
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
  "var(--accent-500)",
  "var(--accent-700)",
  "var(--signal-success)",
  "var(--signal-warning)",
  "var(--signal-danger)",
  "#8b5cf6",
];

function RevenueChart({ data }: { data: DailyRevenuePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-500)" stopOpacity={0.2} />
            <stop offset="100%" stopColor="var(--accent-500)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--ink-5)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--hairline)" }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--ink-5)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
        />
        <Tooltip
          formatter={(val, name) => [
            name === "revenue" ? fmtCurrency(Number(val)) : val,
            name === "revenue" ? "Ingresos" : "Pedidos",
          ]}
          contentStyle={{
            borderRadius: "var(--r-md)",
            border: "1px solid var(--hairline)",
            background: "var(--surface-0)",
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="var(--accent-500)"
          strokeWidth={2}
          fill="url(#revenueGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function CategoryChart({ data }: { data: { category: string; revenue: number; units: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: "var(--ink-5)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
        />
        <YAxis
          type="category"
          dataKey="category"
          tick={{ fontSize: 11, fill: "var(--ink-0)" }}
          tickLine={false}
          axisLine={false}
          width={100}
        />
        <Tooltip
          formatter={(val) => [fmtCurrency(Number(val)), "Ingresos"]}
          contentStyle={{
            borderRadius: "var(--r-md)",
            border: "1px solid var(--hairline)",
            background: "var(--surface-0)",
            fontSize: 12,
          }}
        />
        <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={16}>
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
        <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" vertical={false} />
        <XAxis
          dataKey="channel"
          tick={{ fontSize: 11, fill: "var(--ink-0)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--hairline)" }}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--ink-5)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
        />
        <Tooltip
          formatter={(val, name) => [
            name === "revenue" ? fmtCurrency(Number(val)) : val,
            name === "revenue" ? "Ingresos" : "Pedidos",
          ]}
          contentStyle={{
            borderRadius: "var(--r-md)",
            border: "1px solid var(--hairline)",
            background: "var(--surface-0)",
            fontSize: 12,
          }}
        />
        <Bar dataKey="revenue" fill="var(--accent-500)" radius={[4, 4, 0, 0]} barSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}