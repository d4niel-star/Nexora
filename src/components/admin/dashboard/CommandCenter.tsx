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
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminMetric } from "@/components/admin/primitives/AdminMetric";
import { AdminPanel } from "@/components/admin/primitives/AdminPanel";
import { AdminEmptyState } from "@/components/admin/primitives/AdminEmptyState";

// ─── Command Center · v3 ───
// Structural rebuild on top of the new admin primitives:
// • The 6-col KPI strip is replaced by an AdminMetric grid with delta
//   indicators and direct links to the variant on critical signals
//   (clickable tile → inventory).
// • DirectiveGroups are re-housed inside AdminPanel cards with proper
//   eyebrow + count chip headers and clean divider rows (no more
//   floating section titles + ad-hoc list items).
// • EmptyCommandState is a compact AdminEmptyState (success tone) with
//   3 quick navigation chips, replacing the 360px-tall placeholder.

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
    <div className="animate-in fade-in duration-500">
      <AdminPageHeader
        eyebrow="Comando comercial"
        title="Decisiones priorizadas para hoy."
        subtitle="Basado en ventas, margen, stock y operación real."
      />

      <div className="space-y-8">
        {/* KPI strip — denser, with deltas and direct critical links */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <AdminMetric
            label="Revenue 30d"
            value={formatCurrency(kpis.revenue30d)}
            tone={kpis.revenue30d > 0 ? "accent" : "neutral"}
          />
          <AdminMetric
            label="Unidades 30d"
            value={String(kpis.unitsSold30d)}
          />
          <AdminMetric
            label="Margen neto"
            value={kpis.avgMarginPercent !== null ? `${kpis.avgMarginPercent}%` : "—"}
            tone={
              kpis.avgMarginPercent !== null && kpis.avgMarginPercent < 15
                ? "warning"
                : "neutral"
            }
          />
          <AdminMetric
            label="Stock crítico"
            value={String(kpis.criticalStock)}
            tone={kpis.criticalStock > 0 ? "danger" : "neutral"}
          />
          <CriticalVariantsTile
            label="Variantes críticas"
            value={kpis.criticalVariants}
            variantId={kpis.firstCriticalVariantId}
            action="adjust"
          />
          <CriticalVariantsTile
            label="Riesgo oculto"
            value={kpis.hiddenVariantRiskProducts}
            variantId={kpis.firstHiddenVariantId}
            tone="warning"
          />
        </section>

        {/* Directive groups */}
        {hasDirectives ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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
    </div>
  );
}

// ─── Sub-components ───

function CriticalVariantsTile({
  label,
  value,
  variantId,
  tone = "danger",
  action,
}: {
  label: string;
  value: number;
  variantId?: string | null;
  tone?: "danger" | "warning";
  action?: "adjust" | "reorder";
}) {
  const router = useRouter();
  const isClickable = Boolean(variantId);
  const resolvedTone = value > 0 ? tone : "neutral";

  return (
    <AdminMetric
      label={label}
      value={String(value)}
      tone={resolvedTone}
      onClick={
        isClickable && variantId
          ? () => router.push(buildVariantHref(variantId, action))
          : undefined
      }
      hint={isClickable ? "Ver en inventario" : undefined}
    />
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
    <AdminPanel
      eyebrow={
        <>
          <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
          <span className={meta.label}>{label}</span>
        </>
      }
      title={`${directives.length} ${directives.length === 1 ? "acción" : "acciones"}`}
      dense
      tone="plain"
    >
      <ul className="divide-y divide-[color:var(--hairline)]">
        {directives.map((d) => (
          <li key={d.id}>
            <DirectiveRow directive={d} />
          </li>
        ))}
      </ul>
    </AdminPanel>
  );
}

function DirectiveRow({ directive }: { directive: CommandDirective }) {
  const d = directive;
  const meta = PRIORITY_META[d.priority];

  return (
    <Link
      href={d.href}
      className="group flex items-start gap-3 px-5 py-4 transition-colors hover:bg-[var(--surface-1)]"
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-1)]">
        <DomainIcon domain={d.domain} tint={meta.iconTint} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13.5px] font-medium text-ink-0">{d.title}</p>
          {d.productCount && d.productCount > 0 && (
            <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-[var(--surface-2)] px-2 text-[10.5px] font-medium tabular-nums text-ink-5">
              {d.productCount} SKU{d.productCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <p className="mt-1 text-[12.5px] leading-[1.55] text-ink-5">{d.reason}</p>
        {d.evidence && (
          <p className="mt-1 text-[11.5px] italic text-ink-6">{d.evidence}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 self-center text-[12px] font-medium text-ink-5 transition-colors group-hover:text-ink-0">
        {d.actionLabel}
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
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
    <AdminEmptyState
      icon={CheckCircle2}
      tone="success"
      title="Sin decisiones pendientes."
      body="No hay acciones comerciales urgentes. Cuando algo requiera atención, aparecerá acá automáticamente."
      primary={
        <EmptyChip
          href="/admin/catalog"
          icon={<Package className="h-3.5 w-3.5" strokeWidth={1.75} />}
          label="Catálogo"
        />
      }
      secondary={
        <>
          <EmptyChip
            href="/admin/ai"
            icon={<Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />}
            label="Nexora AI"
          />
          <EmptyChip
            href="/admin/finances?tab=rentabilidad"
            icon={<BarChart3 className="h-3.5 w-3.5" strokeWidth={1.75} />}
            label="Márgenes"
          />
        </>
      }
    />
  );
}

function EmptyChip({
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
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[color:var(--hairline)] bg-[var(--surface-paper)] px-3 text-[12px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)]"
    >
      {icon}
      {label}
    </Link>
  );
}
