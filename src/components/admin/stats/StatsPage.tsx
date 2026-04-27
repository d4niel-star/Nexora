"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { fmtCurrency, fmtNumber, fmtPercent } from "@/lib/stats/format";
import type { CommercialData, OverviewData } from "@/lib/stats/types";

import { DateRangePicker, type DateRangeValue } from "./DateRangePicker";
import { RevenueHeroChart } from "./RevenueHeroChart";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";

// ─── Stats Page · Rendimiento (minimalist redesign) ─────────────────────
//
// Single-stream analytical surface focused on visual analysis. The page
// no longer carries an editorial title, a long subtitle, or internal
// tabs — those competed with the chart and made the surface feel like
// a generic dashboard. The audience/segment lens lives in /admin/customers
// (sidebar leaf), and the conversion lens lives in /admin/conversion;
// duplicating either of them here would just dilute focus.
//
// Layout precedence:
//   1. Top bar — date range right-aligned, no chrome
//   2. Hero chart — protagonist, always renders (neutral state included)
//   3. KPI strip — compact, secondary
//   4. Top products + categories — supportive detail
//
// Empty state policy: never collapse the surface into a placeholder
// card. The hero chart renders its own neutral state (flat baseline +
// discreet caption); KPIs read $0 / 0 honestly; product/category sections
// degrade into thin neutral rows instead of giant "no hay datos" boxes.

interface StatsPageProps {
  overview: OverviewData;
  commercial: CommercialData;
}

export function StatsPage({ overview, commercial }: StatsPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-7"
    >
      <AdminPageHeader
        index="01"
        eyebrow={
          isPending ? "Rendimiento · actualizando" : "Rendimiento · estadísticas"
        }
        title="Rendimiento"
        subtitle="Ingresos, conversión y comportamiento de catálogo sobre tu rango activo. Datos reales del backend."
        actions={<DateRangePicker value={range} onChange={handleRangeChange} />}
      />

      <PanelStream overview={overview} commercial={commercial} />
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Single stream — chart-first, KPIs second, supporting detail third
// ═══════════════════════════════════════════════════════════════════════════

function PanelStream({
  overview,
  commercial,
}: {
  overview: OverviewData;
  commercial: CommercialData;
}) {
  const { kpis, dailyRevenue, prevDailyRevenue, topProducts, revenueByCategory } = overview;
  const hasSales = kpis.revenue30d > 0 || kpis.orders30d > 0;

  return (
    <div className="space-y-7">
      {/* ── Hero chart — protagonist, always renders ──────────────────── */}
      {/* Uses the global .elev-card-strong utility so the framing comes
          from the design system (cool border + multi-layer shadow with
          inset top sheen + subtle vertical surface gradient) rather
          than per-page hardcodes. */}
      <section className="elev-card-strong relative isolate overflow-hidden rounded-[var(--r-xl)]">
        <RevenueHeroChart
          current={dailyRevenue}
          previous={prevDailyRevenue}
          totalRevenue={kpis.revenue30d}
          prevTotalRevenue={kpis.revenuePrev30d}
          changePercent={kpis.revenueChange}
        />
      </section>

      {/* ── KPI strip — compact, secondary ────────────────────────────── */}
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

      {/* ── Top products + categories ────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 shadow-[var(--shadow-card)] lg:col-span-3">
          <h3 className="mb-4 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
            Productos que más venden
          </h3>
          {topProducts.length > 0 ? (
            <div className="space-y-2.5">
              {topProducts.slice(0, 8).map((p, i) => (
                <ProductRow
                  key={i}
                  rank={i + 1}
                  title={p.title}
                  value={fmtCurrency(p.revenue)}
                  meta={`${p.units} uds`}
                />
              ))}
            </div>
          ) : (
            <NeutralRow text="Sin productos vendidos en el rango." />
          )}
        </div>

        <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 shadow-[var(--shadow-card)] lg:col-span-2">
          <h3 className="mb-5 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
            Ingresos por categoría
          </h3>
          {revenueByCategory.length > 0 ? (
            <CategoryChart data={revenueByCategory} />
          ) : (
            <NeutralRow text="Sin movimientos por categoría." />
          )}
        </div>
      </section>

      {/* ── Product performance table — only shown when there is data ── */}
      {commercial.topProducts.length > 0 && (
        <section>
          <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-card)]">
            <div className="px-5 pb-2 pt-5">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
                Rendimiento de productos
              </h3>
            </div>
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
                      <td className="max-w-[180px] truncate px-5 py-2.5 font-medium text-ink-0">
                        {p.title}
                      </td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-ink-0">
                        {fmtCurrency(p.revenue)}
                      </td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-ink-0">{p.units}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums">
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
          </div>
        </section>
      )}

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

      {!hasSales && (
        // Honest single-line note, replaces the giant empty state. The
        // chart, KPIs and tables already convey the "no movement" status
        // visually; we just add a one-line rationale at the bottom so
        // the surface doesn't look broken.
        <p className="text-center text-[11px] text-ink-6">
          Aún no hay ventas con pago confirmado en este rango.
          {" "}
          Probá un periodo más amplio o esperá a que entren los primeros pedidos.
        </p>
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
    <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-elevated)]">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
          {label}
        </p>
        <span className="text-ink-6">{icon}</span>
      </div>
      <p
        className={cn(
          "tabular-nums text-[22px] font-medium tracking-[-0.01em]",
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
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-ink-0">{title}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="tabular-nums text-[13px] font-medium text-ink-0">{value}</p>
        <p className="text-[10px] text-ink-5">{meta}</p>
      </div>
    </div>
  );
}

function ContextPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-4 py-3">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-6">
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

function NeutralRow({ text }: { text: string }) {
  return (
    <div className="rounded-[var(--r-md)] border border-dashed border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-6 text-center text-[12px] leading-[1.5] text-ink-5">
      {text}
    </div>
  );
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

function CategoryChart({
  data,
}: {
  data: { category: string; revenue: number; units: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-3)" horizontal={false} />
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
            border: "1px solid var(--hairline)",
            background: "var(--surface-0)",
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
