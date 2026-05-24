"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { TrendingUp, TrendingDown, Users, Package, ShoppingCart, Activity, AlertCircle, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { NexoraPageHeader } from "@/components/admin/nexora";
import { RANGE_PRESETS, type RangePreset } from "@/lib/analytics/dates";
import type {
  RevenueIntelligence,
  ConversionIntelligence,
  ProductIntelligence,
  CustomerIntelligence,
  OperationalIntelligence,
} from "@/lib/analytics/queries";

// ─── Analytics Hub Client (Phase 7C.2) ───────────────────────────────
// Honest analytics. Real metrics get full cards; metrics that need
// telemetry we don't capture (PDP views, add-to-cart) are rendered as
// explicit "Datos no disponibles" cards with the reason from the query.
// No fabricated zeros, no fake percentages.

interface Props {
  preset: RangePreset;
  revenue: RevenueIntelligence;
  conversion: ConversionIntelligence;
  products: ProductIntelligence;
  customers: CustomerIntelligence;
  operations: OperationalIntelligence;
}

export function AnalyticsHubClient({ preset, revenue, conversion, products, customers, operations }: Props) {
  const router = useRouter();

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: revenue.currency || "ARS" }).format(n);
  const fmtPct = (n: number | null) => n === null ? "—" : `${(n * 100).toFixed(1)}%`;
  const fmtDelta = (n: number) => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;
  const fmtMs = (ms: number | null) => {
    if (ms === null) return "—";
    const days = ms / (24 * 60 * 60 * 1000);
    if (days >= 1) return `${days.toFixed(1)}d`;
    return `${(ms / (60 * 60 * 1000)).toFixed(1)}h`;
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      <div className="flex items-start justify-between">
        <NexoraPageHeader
          title="Inteligencia comercial"
          subtitle="Métricas reales basadas en pedidos, pagos y operaciones. Las fuentes que aún no tienen telemetría se marcan explícitamente como no disponibles — nunca inventamos cifras."
        />
        <select
          value={preset}
          onChange={(e) => router.push(`/admin/analytics?range=${e.target.value}`)}
          className="rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-3 py-1.5 text-[12px] text-ink-0 outline-none"
        >
          {RANGE_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* ── Revenue Intelligence ─── */}
      <Section title="Ingresos" icon={TrendingUp}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi label="Ingreso bruto" value={fmtCurrency(revenue.grossRevenue)} delta={revenue.comparison.grossRevenueDelta} fmtDelta={fmtDelta} />
          <Kpi label="Reembolsos" value={fmtCurrency(revenue.refundedTotal)} tone={revenue.refundedTotal > 0 ? "warn" : undefined} />
          <Kpi label="Ingreso neto" value={fmtCurrency(revenue.netRevenue)} />
          <Kpi label="Envíos" value={fmtCurrency(revenue.shippingRevenue)} />
          <Kpi label="Pedidos" value={String(revenue.ordersCount)} delta={revenue.comparison.ordersDelta} fmtDelta={fmtDelta} />
          <Kpi label="AOV" value={fmtCurrency(revenue.averageOrderValue)} />
        </div>
        {revenue.series.length > 0 && (
          <SparkBar title="Ingresos por período" data={revenue.series.map(s => ({ label: s.bucket, value: s.gross }))} fmt={fmtCurrency} />
        )}
      </Section>

      {/* ── Conversion Intelligence ─── */}
      <Section title="Conversión" icon={ShoppingCart}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Unavailable label="Visitas storefront" reason={conversion.storefrontVisits.unavailable.reason} />
          <Unavailable label="Vistas PDP" reason={conversion.pdpViews.unavailable.reason} />
          <Unavailable label="Add-to-cart rate" reason={conversion.addToCartRate.unavailable.reason} />
          <Kpi label="Checkouts iniciados" value={String(conversion.checkoutStart.value)} />
          <Kpi label="Compras completadas" value={String(conversion.checkoutCompletion.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          <Kpi label="Tasa de conversión checkout" value={fmtPct(conversion.completionRate)} hint="completados / (completados + abandonados)" />
          <Kpi label="Abandono de carrito" value={fmtPct(conversion.abandonmentRate)} tone={conversion.abandonmentRate && conversion.abandonmentRate > 0.7 ? "warn" : undefined} />
        </div>
      </Section>

      {/* ── Product Intelligence ─── */}
      <Section title="Productos" icon={Package}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ListCard title="Top vendidos">
            {products.topSellers.length === 0 ? (
              <EmptyText>Sin ventas registradas en este período.</EmptyText>
            ) : (
              <ol className="space-y-1">
                {products.topSellers.map((p, idx) => (
                  <li key={p.productId} className="flex items-center justify-between gap-2 text-[12px]">
                    <Link href={`/admin/products/${p.productId}`} className="flex-1 min-w-0 truncate text-ink-1 hover:text-ink-0">
                      <span className="text-ink-5 mr-2 tabular">{idx + 1}.</span>{p.title}
                    </Link>
                    <span className="shrink-0 tabular text-ink-3">{p.quantity}</span>
                    <span className="shrink-0 tabular text-ink-0">{fmtCurrency(p.revenue)}</span>
                  </li>
                ))}
              </ol>
            )}
          </ListCard>
          <ListCard title="Sin movimiento">
            {products.slowMovers.length === 0 ? (
              <EmptyText>Todos los productos publicados tuvieron al menos una venta.</EmptyText>
            ) : (
              <ul className="space-y-1">
                {products.slowMovers.map((p) => (
                  <li key={p.productId} className="text-[12px] truncate">
                    <Link href={`/admin/products/${p.productId}`} className="text-ink-3 hover:text-ink-0">{p.title}</Link>
                  </li>
                ))}
              </ul>
            )}
          </ListCard>
        </div>
        <Unavailable label="Attach rate" reason={products.attachRateUnavailable.reason} />
      </Section>

      {/* ── Customer Intelligence ─── */}
      <Section title="Clientes" icon={Users}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Nuevos" value={String(customers.newCustomers)} />
          <Kpi label="Recurrentes" value={String(customers.returningCustomers)} />
          <Kpi label="VIP share del ingreso" value={fmtPct(customers.vipShareOfRevenue)} hint="Top 10% por revenue" />
          <Kpi label="Repeat purchase rate" value={fmtPct(customers.repeatPurchaseRate)} />
        </div>
      </Section>

      {/* ── Operational Intelligence ─── */}
      <Section title="Operaciones" icon={Activity}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi label="Fulfillment promedio" value={fmtMs(operations.fulfillmentSlaMs)} hint="Últimos 30d" />
          <Kpi label="Latencia reembolsos" value={fmtMs(operations.refundLatencyMs)} hint="Últimos 30d" />
          <Kpi label="Jobs pendientes" value={String(operations.pendingJobs)} tone={operations.pendingJobs > 100 ? "warn" : undefined} />
          <Kpi label="Jobs fallidos 24h" value={String(operations.failedJobs24h)} tone={operations.failedJobs24h > 0 ? "warn" : undefined} />
          <Kpi label="Jobs muertos 24h" value={String(operations.deadJobs24h)} tone={operations.deadJobs24h > 0 ? "danger" : undefined} />
          <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-3 flex items-center justify-center">
            <Link href="/admin/operations" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-0 hover:text-ink-2">
              <Layers className="h-3.5 w-3.5" /> Centro de operaciones
            </Link>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ─── Subcomponents ───

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.18em] text-ink-5">
        <Icon className="h-3.5 w-3.5" /> {title}
      </h2>
      {children}
    </section>
  );
}

function Kpi({ label, value, tone, delta, fmtDelta, hint }: { label: string; value: string; tone?: "warn" | "danger"; delta?: number; fmtDelta?: (n: number) => string; hint?: string }) {
  const cls = tone === "warn" ? "text-[color:var(--signal-warning)]" :
              tone === "danger" ? "text-[color:var(--signal-danger)]" :
              "text-ink-0";
  const showDelta = typeof delta === "number" && fmtDelta && Number.isFinite(delta);
  return (
    <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-5">{label}</p>
      <p className={cn("mt-1.5 text-[18px] font-semibold tabular tracking-[-0.02em] truncate", cls)} title={value}>{value}</p>
      {showDelta && (
        <p className={cn("mt-0.5 inline-flex items-center gap-0.5 text-[10px] tabular", delta! >= 0 ? "text-[color:var(--signal-success)]" : "text-[color:var(--signal-danger)]")}>
          {delta! >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
          {fmtDelta!(delta!)}
        </p>
      )}
      {hint && !showDelta && <p className="mt-0.5 text-[10px] text-ink-6">{hint}</p>}
    </div>
  );
}

function Unavailable({ label, reason }: { label: string; reason: string }) {
  return (
    <div className="rounded-[var(--r-lg)] border border-dashed border-[color:var(--hairline-strong)] bg-[var(--surface-0)] p-3">
      <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-5">
        <AlertCircle className="h-3 w-3" /> {label}
      </p>
      <p className="mt-1.5 text-[12px] font-medium text-ink-3">No disponible</p>
      <p className="mt-1 text-[10px] text-ink-5 leading-relaxed">{reason}</p>
    </div>
  );
}

function ListCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4">
      <h3 className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-5">{title}</h3>
      {children}
    </div>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] text-ink-5">{children}</p>;
}

function SparkBar({ title, data, fmt }: { title: string; data: Array<{ label: string; value: number }>; fmt: (n: number) => string }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-5">{title}</p>
      <div className="flex items-end gap-1 h-24">
        {data.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1 group" title={`${d.label}: ${fmt(d.value)}`}>
            <div
              className="w-full bg-ink-0 rounded-sm transition-opacity group-hover:opacity-80"
              style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] tabular text-ink-6">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
