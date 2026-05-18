"use client";

// ─── Merchant Cockpit Pro ────────────────────────────────────────────────
// Commerce operating system dashboard. Real metrics, real actions, real links.

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Clock,
  DollarSign,
  ExternalLink,
  Globe,
  Layers,
  Package,
  Plus,
  Server,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Zap,
  XCircle,
  Mail,
  Download,
  Palette,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MerchantCockpitData, CockpitActivityItem, CockpitPriorityItem, CockpitStatusItem } from "@/lib/dashboard/cockpit-queries";

// ─── Main ────────────────────────────────────────────────────────────────

export function MerchantCockpit({ data }: { data: MerchantCockpitData }) {
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-5 pb-16 animate-in fade-in duration-300">
      {/* ── Health Bar ────────────────────────────────── */}
      <HealthBar health={data.health} formatCurrency={formatCurrency} />

      {/* ── Priority Center + Quick Ops ───────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <PriorityCenter items={data.priorities} />
        </div>
        <div className="lg:col-span-4">
          <QuickOpsHub />
        </div>
      </div>

      {/* ── Revenue Snapshot + Status Grid ─────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <RevenueSnapshot revenue={data.revenue} formatCurrency={formatCurrency} />
        </div>
        <div className="lg:col-span-4">
          <StatusGrid items={data.statusGrid} />
        </div>
      </div>

      {/* ── Live Activity Feed ─────────────────────────── */}
      <ActivityFeed items={data.activity} />
    </div>
  );
}

// ─── 1. Health Bar ───────────────────────────────────────────────────────

function HealthBar({ health, formatCurrency }: { health: MerchantCockpitData["health"]; formatCurrency: (v: number) => string }) {
  const statusColor = health.storeStatus === "critical" ? "var(--signal-danger)" : health.storeStatus === "warning" ? "var(--signal-warning)" : "var(--signal-success)";
  const statusLabel = health.storeStatus === "critical" ? "Atención urgente" : health.storeStatus === "warning" ? "Requiere acción" : "Operando bien";

  const cells = [
    { label: "Ventas hoy", value: formatCurrency(health.salesToday), sub: health.salesYesterday > 0 ? `Ayer: ${formatCurrency(health.salesYesterday)}` : undefined },
    { label: "Pedidos hoy", value: String(health.ordersToday) },
    { label: "Por preparar", value: String(health.pendingOrders), warn: health.pendingOrders > 5 },
    { label: "En preparación", value: String(health.fulfillmentBacklog), warn: health.fulfillmentBacklog > 10 },
    { label: "Stock crítico", value: String(health.criticalStock), warn: health.criticalStock > 0 },
    { label: "Estado", value: statusLabel, color: statusColor },
  ];

  return (
    <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-soft)] overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-[color:var(--hairline)]">
        {cells.map((cell) => (
          <div key={cell.label} className="px-4 py-3.5">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">{cell.label}</p>
            <p className={cn("mt-1 text-[18px] font-bold tabular-nums leading-none", cell.warn ? "text-[color:var(--signal-danger)]" : "text-ink-0")} style={cell.color ? { color: cell.color } : undefined}>
              {cell.value}
            </p>
            {cell.sub && <p className="mt-1 text-[10px] text-ink-6 tabular-nums">{cell.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 2. Priority Center ─────────────────────────────────────────────────

function PriorityCenter({ items }: { items: CockpitPriorityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-soft)] p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--r-md)] bg-[color:var(--signal-success)]/10 text-[color:var(--signal-success)]">
            <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-ink-0">Todo en orden</p>
            <p className="text-[11px] text-ink-5">No hay acciones prioritarias pendientes.</p>
          </div>
        </div>
      </div>
    );
  }

  const levelColors = {
    blocking: { bg: "bg-[color:var(--signal-danger)]/8", border: "border-[color:var(--signal-danger)]/20", dot: "var(--signal-danger)" },
    warning: { bg: "bg-[color:var(--signal-warning)]/8", border: "border-[color:var(--signal-warning)]/20", dot: "var(--signal-warning)" },
    recommendation: { bg: "bg-[var(--surface-1)]", border: "border-[color:var(--hairline)]", dot: "var(--accent-500)" },
  };

  return (
    <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-soft)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--hairline)]">
        <h2 className="text-[12px] font-semibold text-ink-0 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.75} />
          Prioridades
        </h2>
        <span className="text-[10px] font-medium text-ink-5 tabular-nums">{items.length} acción{items.length !== 1 ? "es" : ""}</span>
      </div>
      <ul>
        {items.map((item, i) => {
          const colors = levelColors[item.level];
          return (
            <li key={item.id} className={cn("border-b border-[color:var(--hairline)] last:border-b-0")}>
              <Link href={item.href} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-1)] group">
                <div className="mt-0.5 flex h-2 w-2 shrink-0 rounded-full" style={{ background: colors.dot }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-ink-0">{item.title}</p>
                  <p className="mt-0.5 text-[11px] text-ink-5 line-clamp-1">{item.description}</p>
                </div>
                <span className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-ink-5 group-hover:text-ink-0 transition-colors">
                  {item.actionLabel} <ArrowRight className="h-3 w-3" strokeWidth={1.75} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── 3. Quick Operations Hub ─────────────────────────────────────────────

const QUICK_OPS = [
  { label: "Nuevo producto", href: "/admin/catalog?action=new", icon: Plus },
  { label: "Exportar pedidos", href: "/admin/orders", icon: Download },
  { label: "Stock bajo", href: "/admin/inventory", icon: Package },
  { label: "Automatizaciones", href: "/admin/automations", icon: Zap },
  { label: "Visual Editor", href: "/admin/store-ai/visual-editor", icon: Palette },
  { label: "Borradores", href: "/admin/catalog?status=draft", icon: FileText },
  { label: "Pendientes", href: "/admin/orders?status=processing", icon: ShoppingCart },
  { label: "Branding", href: "/admin/store-ai", icon: Palette },
] as const;

function QuickOpsHub() {
  return (
    <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-soft)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[color:var(--hairline)]">
        <h2 className="text-[12px] font-semibold text-ink-0 flex items-center gap-2">
          <Zap className="h-3.5 w-3.5" strokeWidth={1.75} />
          Acceso rápido
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-px bg-[color:var(--hairline)]">
        {QUICK_OPS.map((op) => {
          const Icon = op.icon;
          return (
            <Link key={op.label} href={op.href} className="flex items-center gap-2.5 bg-[var(--surface-0)] px-3.5 py-3 text-[11px] font-medium text-ink-3 transition-colors hover:bg-[var(--surface-1)] hover:text-ink-0">
              <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              {op.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── 4. Revenue Snapshot ─────────────────────────────────────────────────

function RevenueSnapshot({ revenue, formatCurrency }: { revenue: MerchantCockpitData["revenue"]; formatCurrency: (v: number) => string }) {
  return (
    <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-soft)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--hairline)]">
        <h2 className="text-[12px] font-semibold text-ink-0 flex items-center gap-2">
          <BarChart3 className="h-3.5 w-3.5" strokeWidth={1.75} />
          Revenue
        </h2>
        <span className="text-[10px] text-ink-5">Últimos 30 días</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[color:var(--hairline)] border-b border-[color:var(--hairline)]">
        <MetricCell label="24 horas" value={formatCurrency(revenue.revenue24h)} />
        <MetricCell label="7 días" value={formatCurrency(revenue.revenue7d)} />
        <MetricCell label="30 días" value={formatCurrency(revenue.revenue30d)} />
        <MetricCell label="Ticket promedio" value={formatCurrency(revenue.aov)} />
      </div>

      <div className="grid grid-cols-2 divide-x divide-[color:var(--hairline)] border-b border-[color:var(--hairline)]">
        <MetricCell label="Pedidos 30d" value={String(revenue.orders30d)} />
        <MetricCell label="Reembolsos 30d" value={String(revenue.refunds30d)} warn={revenue.refunds30d > 0} />
      </div>

      {revenue.topProducts.length > 0 && (
        <div className="px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5 mb-2">Top productos</p>
          <ul className="space-y-1.5">
            {revenue.topProducts.map((p, i) => (
              <li key={p.id} className="flex items-center gap-2 text-[11px]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-1)] text-[9px] font-bold text-ink-5 tabular-nums shrink-0">{i + 1}</span>
                <span className="flex-1 truncate text-ink-0 font-medium">{p.title}</span>
                <span className="tabular-nums text-ink-5 shrink-0">{p.units}u · {formatCurrency(p.revenue)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MetricCell({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">{label}</p>
      <p className={cn("mt-1 text-[16px] font-bold tabular-nums leading-none", warn ? "text-[color:var(--signal-danger)]" : "text-ink-0")}>{value}</p>
    </div>
  );
}

// ─── 5. Live Activity Feed ───────────────────────────────────────────────

function ActivityFeed({ items }: { items: CockpitActivityItem[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, 10);

  if (items.length === 0) return null;

  const typeIcons: Record<CockpitActivityItem["type"], typeof Activity> = {
    order: ShoppingCart,
    payment: DollarSign,
    fulfillment: Truck,
    stock: Package,
    automation: Zap,
    email: Mail,
    refund: XCircle,
    review: CheckCircle2,
  };

  const severityColors: Record<CockpitActivityItem["severity"], string> = {
    info: "text-ink-5",
    success: "text-[color:var(--signal-success)]",
    warning: "text-[color:var(--signal-warning)]",
    error: "text-[color:var(--signal-danger)]",
  };

  return (
    <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-soft)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--hairline)]">
        <h2 className="text-[12px] font-semibold text-ink-0 flex items-center gap-2">
          <Activity className="h-3.5 w-3.5" strokeWidth={1.75} />
          Actividad reciente
        </h2>
        <span className="text-[10px] text-ink-5 tabular-nums">{items.length} eventos</span>
      </div>
      <ul>
        {visible.map((item, i) => {
          const Icon = typeIcons[item.type] ?? Activity;
          const date = new Date(item.timestamp);
          const inner = (
            <>
              <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", severityColors[item.severity])} strokeWidth={1.75} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-ink-0 line-clamp-1">{item.title}</p>
                <p className="text-[10px] text-ink-6">{item.detail}</p>
              </div>
              <time className="shrink-0 text-[10px] text-ink-6 tabular-nums whitespace-nowrap">{formatTimeAgo(date)}</time>
            </>
          );
          return (
            <li key={item.id} className="border-b border-[color:var(--hairline)] last:border-b-0">
              {item.href ? (
                <Link href={item.href} className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--surface-1)]">{inner}</Link>
              ) : (
                <div className="flex items-start gap-3 px-4 py-2.5">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
      {items.length > 10 && !showAll && (
        <div className="border-t border-[color:var(--hairline)] px-4 py-2 text-center">
          <button type="button" onClick={() => setShowAll(true)} className="text-[11px] font-medium text-ink-3 hover:text-ink-0 transition-colors">
            Ver todos ({items.length} eventos)
          </button>
        </div>
      )}
    </div>
  );
}

// ─── 6. Operational Status Grid ──────────────────────────────────────────

function StatusGrid({ items }: { items: CockpitStatusItem[] }) {
  if (items.length === 0) return null;

  const statusDot: Record<CockpitStatusItem["status"], string> = {
    ok: "var(--signal-success)",
    warning: "var(--signal-warning)",
    error: "var(--signal-danger)",
    unknown: "var(--ink-6)",
  };

  return (
    <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-soft)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[color:var(--hairline)]">
        <h2 className="text-[12px] font-semibold text-ink-0 flex items-center gap-2">
          <Server className="h-3.5 w-3.5" strokeWidth={1.75} />
          Estado operativo
        </h2>
      </div>
      <ul>
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[color:var(--hairline)] last:border-b-0">
            <div className="h-2 w-2 rounded-full shrink-0" style={{ background: statusDot[item.status] }} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-ink-0">{item.label}</p>
            </div>
            <span className="text-[10px] text-ink-5 shrink-0">{item.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
