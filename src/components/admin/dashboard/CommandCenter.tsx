"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Box,
  CheckCircle2,
  CircleDollarSign,
  Package,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CommandCenterData,
  CommandDirective,
  CommandDomain,
  CommandPriority,
} from "@/types/command-center";
import { buildVariantHref } from "@/lib/navigation/hrefs";

// ─── Command Center ───
// Visual rewrite unified into the token system. The prior rainbow of
// red/amber/blue/orange/emerald pastels is replaced by a single signal
// palette expressed via `priorityTone`: critical=danger, high=warning,
// medium=accent, low=neutral. Every surface is a hairline card; numbers
// go tabular; no drop shadows.

export function CommandCenter({ data }: { data: CommandCenterData }) {
  const { directives, kpis } = data;
  const hasDirectives = directives.length > 0;

  const criticals = directives.filter((d) => d.priority === "critical");
  const highs = directives.filter((d) => d.priority === "high");
  const mediums = directives.filter((d) => d.priority === "medium");
  const lows = directives.filter((d) => d.priority === "low");

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(v);

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      {/* Header */}
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
          Comando comercial
        </p>
        <h1 className="mt-2 font-semibold text-[34px] leading-[1.02] tracking-[-0.035em] text-ink-0 sm:text-[42px]">
          Decisiones priorizadas para hoy.
        </h1>
        <p className="mt-3 max-w-xl text-[14px] leading-[1.55] text-ink-5">
          Basado en ventas, margen, stock y operación real.
        </p>
      </header>

      {/* KPI strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label="Revenue 30d"
          value={formatCurrency(kpis.revenue30d)}
          tone={kpis.revenue30d > 0 ? "accent" : "neutral"}
        />
        <KpiCard label="Unidades 30d" value={String(kpis.unitsSold30d)} tone="neutral" />
        <KpiCard
          label="Margen neto"
          value={
            kpis.avgMarginPercent !== null ? `${kpis.avgMarginPercent}%` : "—"
          }
          tone={
            kpis.avgMarginPercent !== null && kpis.avgMarginPercent < 15
              ? "warning"
              : "neutral"
          }
        />
        <KpiCard
          label="Stock crítico"
          value={String(kpis.criticalStock)}
          tone={kpis.criticalStock > 0 ? "danger" : "neutral"}
        />
        <KpiCard
          label="Variantes críticas"
          value={String(kpis.criticalVariants)}
          tone={kpis.criticalVariants > 0 ? "danger" : "neutral"}
          variantId={kpis.firstCriticalVariantId}
          action="adjust"
        />
        <KpiCard
          label="Riesgo oculto"
          value={String(kpis.hiddenVariantRiskProducts)}
          tone={kpis.hiddenVariantRiskProducts > 0 ? "warning" : "neutral"}
          variantId={kpis.firstHiddenVariantId}
        />
      </section>

      {/* Directive groups */}
      {hasDirectives ? (
        <div className="space-y-10">
          {criticals.length > 0 && (
            <DirectiveGroup directives={criticals} label="Acción inmediata" priority="critical" />
          )}
          {highs.length > 0 && (
            <DirectiveGroup directives={highs} label="Prioridad alta" priority="high" />
          )}
          {mediums.length > 0 && (
            <DirectiveGroup directives={mediums} label="Oportunidades" priority="medium" />
          )}
          {lows.length > 0 && (
            <DirectiveGroup directives={lows} label="Para evaluar" priority="low" />
          )}
        </div>
      ) : (
        <EmptyCommandState />
      )}
    </div>
  );
}

// ─── Sub-components ───

type KpiTone = "neutral" | "accent" | "warning" | "danger";

function KpiCard({
  label,
  value,
  tone = "neutral",
  variantId,
  action,
}: {
  label: string;
  value: string;
  tone?: KpiTone;
  variantId?: string | null;
  action?: "adjust" | "reorder";
}) {
  const router = useRouter();
  const isClickable = !!variantId;

  const toneClass: Record<KpiTone, string> = {
    neutral: "text-ink-0",
    accent: "text-[color:var(--accent-700)]",
    warning: "text-[color:var(--signal-warning)]",
    danger: "text-[color:var(--signal-danger)]",
  };

  return (
    <div
      onClick={
        isClickable
          ? () => router.push(buildVariantHref(variantId!, action))
          : undefined
      }
      title={isClickable ? "Ver en inventario" : undefined}
      className={cn(
        "rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4 shadow-[var(--shadow-card)] transition-colors",
        isClickable &&
          "cursor-pointer hover:border-[color:var(--hairline-strong)] hover:bg-[var(--surface-2)]",
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 tabular text-[22px] font-medium tracking-[-0.01em]",
          toneClass[tone],
        )}
      >
        {value}
      </p>
    </div>
  );
}

const PRIORITY_META: Record<
  CommandPriority,
  { dot: string; label: string; chipBg: string; chipText: string; iconTint: string }
> = {
  critical: {
    dot: "bg-[color:var(--signal-danger)]",
    label: "text-[color:var(--signal-danger)]",
    chipBg: "bg-[var(--surface-2)]",
    chipText: "text-[color:var(--signal-danger)]",
    iconTint: "text-[color:var(--signal-danger)]",
  },
  high: {
    dot: "bg-[color:var(--signal-warning)]",
    label: "text-[color:var(--signal-warning)]",
    chipBg: "bg-[var(--surface-2)]",
    chipText: "text-[color:var(--signal-warning)]",
    iconTint: "text-[color:var(--signal-warning)]",
  },
  medium: {
    dot: "bg-[var(--accent-500)]",
    label: "text-[color:var(--accent-700)]",
    chipBg: "bg-[var(--accent-50)]",
    chipText: "text-[color:var(--accent-700)]",
    iconTint: "text-[color:var(--accent-700)]",
  },
  low: {
    dot: "bg-ink-6",
    label: "text-ink-5",
    chipBg: "bg-[var(--surface-2)]",
    chipText: "text-ink-5",
    iconTint: "text-ink-4",
  },
};

function DirectiveGroup({
  directives,
  label,
  priority,
}: {
  directives: CommandDirective[];
  label: string;
  priority: CommandPriority;
}) {
  const meta = PRIORITY_META[priority];
  return (
    <section>
      <div className="mb-4 flex items-center gap-2.5">
        <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
        <h2
          className={cn(
            "text-[11px] font-medium uppercase tracking-[0.14em]",
            meta.label,
          )}
        >
          {label}
        </h2>
        <span
          className={cn(
            "inline-flex h-5 items-center rounded-[var(--r-xs)] px-2 text-[10px] font-medium tabular",
            meta.chipBg,
            meta.chipText,
          )}
        >
          {directives.length}
        </span>
      </div>
      <div className="space-y-2.5">
        {directives.map((d) => (
          <DirectiveCard key={d.id} directive={d} />
        ))}
      </div>
    </section>
  );
}

function DirectiveCard({ directive }: { directive: CommandDirective }) {
  const d = directive;
  const meta = PRIORITY_META[d.priority];

  return (
    <Link
      href={d.href}
      className="group flex items-start gap-4 rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 shadow-[var(--shadow-card)] transition-[colors,box-shadow] hover:border-[color:var(--hairline-strong)] hover:shadow-[var(--shadow-elevated)]"
    >
      <div
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)]",
        )}
      >
        <DomainIcon domain={d.domain} tint={meta.iconTint} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[14px] font-medium text-ink-0">{d.title}</p>
          {d.productCount && d.productCount > 0 && (
            <span className="inline-flex h-5 shrink-0 items-center rounded-[var(--r-xs)] bg-[var(--surface-2)] px-2 text-[10px] font-medium text-ink-5">
              {d.productCount} SKU{d.productCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <p className="mt-1 text-[13px] leading-[1.55] text-ink-5">{d.reason}</p>
        {d.evidence && (
          <p className="mt-1.5 text-[12px] italic text-ink-6">{d.evidence}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 self-center text-[12px] font-medium text-ink-5 transition-colors group-hover:text-ink-0">
        {d.actionLabel}
        <ArrowRight className="h-3 w-3" strokeWidth={1.75} />
      </div>
    </Link>
  );
}

function DomainIcon({ domain, tint }: { domain: CommandDomain; tint: string }) {
  const cls = cn("h-4 w-4", tint);
  switch (domain) {
    case "revenue":
      return <TrendingUp className={cls} strokeWidth={1.75} />;
    case "margin":
      return <CircleDollarSign className={cls} strokeWidth={1.75} />;
    case "stock":
      return <Box className={cls} strokeWidth={1.75} />;
    case "sourcing":
      return <Truck className={cls} strokeWidth={1.75} />;
    case "operations":
      return <ShoppingCart className={cls} strokeWidth={1.75} />;
    default:
      return <Sparkles className={cls} strokeWidth={1.75} />;
  }
}

function EmptyCommandState() {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[var(--r-lg)] border border-dashed border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-6 py-16 text-center">
      <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
        <CheckCircle2
          className="h-5 w-5 text-[color:var(--signal-success)]"
          strokeWidth={1.5}
        />
      </div>
      <h3 className="font-semibold text-[26px] leading-[1.05] tracking-[-0.03em] text-ink-0">
        Sin decisiones pendientes.
      </h3>
      <p className="mt-3 max-w-md text-[14px] leading-[1.55] text-ink-5">
        No hay acciones comerciales urgentes. Cuando algo requiera atención,
        aparecerá acá automáticamente.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
        <EmptyCTA href="/admin/catalog" icon={<Package className="h-3.5 w-3.5" strokeWidth={1.75} />} label="Catálogo" />
        <EmptyCTA href="/admin/ai" icon={<Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />} label="Nexora AI" />
        <EmptyCTA href="/admin/finances?tab=rentabilidad" icon={<BarChart3 className="h-3.5 w-3.5" strokeWidth={1.75} />} label="Márgenes" />
      </div>
    </div>
  );
}

function EmptyCTA({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center gap-1.5 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-4 text-[13px] font-medium text-ink-0 transition-colors hover:bg-ink-11"
    >
      {icon}
      {label}
    </Link>
  );
}
