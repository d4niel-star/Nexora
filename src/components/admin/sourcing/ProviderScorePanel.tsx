"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Download,
  Package,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Truck,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ImportPriority,
  ImportScore,
  ProviderScore,
  ProviderScoreReport,
  ProviderSignal,
  ProviderTier,
} from "@/types/provider-score";

type ImportFilter = "all" | ImportPriority;

export function ProviderScorePanel({ report }: { report: ProviderScoreReport }) {
  const [importFilter, setImportFilter] = useState<ImportFilter>("all");
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  const s = report.summary;

  const filteredImports = useMemo(() => {
    if (importFilter === "all") return report.imports.filter((i) => i.priority !== "already_imported");
    return report.imports.filter((i) => i.priority === importFilter);
  }, [report.imports, importFilter]);

  if (report.providers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[var(--r-md)] border border-dashed border-[color:var(--hairline)] bg-[var(--surface-1)] p-12 text-center">
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
          <Truck className="h-5 w-5 text-ink-5" strokeWidth={1.5} />
        </div>
        <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-ink-0">Sin proveedores conectados</h3>
        <p className="mt-2 max-w-sm text-[13px] leading-[1.55] text-ink-5">
          Conectá un proveedor en la pestaña &ldquo;Descubrir&rdquo; para ver el análisis de scoring.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ─── Provider Score Cards ─── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-4 w-4 text-ink-4" strokeWidth={1.75} />
          <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
            Score de proveedores
          </h2>
          <span className="inline-flex items-center h-5 px-1.5 rounded-[var(--r-xs)] bg-[var(--surface-2)] text-ink-0 text-[10px] font-medium uppercase tracking-[0.14em]">
            {s.totalProviders}
          </span>
        </div>

        {/* Tier KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          <TierChip label="Fuerte" count={s.strong} tone="success" />
          <TierChip label="Estable" count={s.stable} tone="neutral" />
          <TierChip label="Débil" count={s.weak} tone="warning" />
          <TierChip label="Crítico" count={s.critical} tone="danger" />
          <TierChip label="Sin datos" count={s.noData} tone="muted" />
        </div>

        {/* Provider cards */}
        <div className="space-y-3">
          {report.providers.map((p) => (
            <ProviderCard
              key={p.connectionId}
              provider={p}
              expanded={expandedProvider === p.connectionId}
              onToggle={() => setExpandedProvider(expandedProvider === p.connectionId ? null : p.connectionId)}
            />
          ))}
        </div>
      </section>

      {/* ─── Import Score ─── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-ink-4" strokeWidth={1.75} />
          <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
            Score de importables
          </h2>
          <span className="inline-flex items-center h-5 px-1.5 rounded-[var(--r-xs)] bg-[var(--surface-2)] text-ink-0 text-[10px] font-medium uppercase tracking-[0.14em]">
            {report.imports.filter((i) => i.priority !== "already_imported").length}
          </span>
        </div>

        {/* Priority filter pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          <FilterPill
            label="Todos"
            count={report.imports.filter((i) => i.priority !== "already_imported").length}
            active={importFilter === "all"}
            onClick={() => setImportFilter("all")}
          />
          <FilterPill label="Alta" count={s.highPriorityImports} active={importFilter === "high"} onClick={() => setImportFilter(importFilter === "high" ? "all" : "high")} tone="success" />
          <FilterPill label="Media" count={s.mediumPriorityImports} active={importFilter === "medium"} onClick={() => setImportFilter(importFilter === "medium" ? "all" : "medium")} tone="neutral" />
          <FilterPill label="Baja" count={s.lowPriorityImports} active={importFilter === "low"} onClick={() => setImportFilter(importFilter === "low" ? "all" : "low")} tone="warning" />
          <FilterPill label="Omitir" count={s.skipImports} active={importFilter === "skip"} onClick={() => setImportFilter(importFilter === "skip" ? "all" : "skip")} tone="danger" />
        </div>

        {/* Import list */}
        {filteredImports.length > 0 ? (
          <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] overflow-hidden">
            <div className="divide-y divide-[color:var(--hairline)]">
              {filteredImports.map((imp) => (
                <ImportRow key={imp.providerProductId} item={imp} />
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-8 text-center">
            <p className="text-[12px] font-medium text-ink-5">Sin importables en esta categoría.</p>
          </div>
        )}
      </section>

      {/* ─── Scope ─── */}
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-4">
        <p className="text-[13px] font-semibold text-ink-0">Provider Score + Import Score v1</p>
        <p className="mt-1 text-[12px] leading-[1.55] text-ink-5">
          Clasifica proveedores y productos importables por señales observables: conexión, sync, stock, costo, margen y dependencia.
          No incluye reputación comercial, performance de ventas ni historial — el schema no lo soporta aún.
          Los scores se derivan exclusivamente de datos reales de la base de datos.
        </p>
      </div>
    </div>
  );
}

// ─── Sub-components ───

type Tone = "success" | "warning" | "danger" | "neutral" | "muted";

const toneText: Record<Tone, string> = {
  success: "text-[color:var(--signal-success)]",
  warning: "text-[color:var(--signal-warning)]",
  danger: "text-[color:var(--signal-danger)]",
  neutral: "text-ink-0",
  muted: "text-ink-5",
};

const toneDot: Record<Tone, string> = {
  success: "bg-[var(--signal-success)]",
  warning: "bg-[var(--signal-warning)]",
  danger: "bg-[var(--signal-danger)]",
  neutral: "bg-ink-3",
  muted: "bg-ink-6",
};

function TierChip({ label, count, tone }: { label: string; count: number; tone: Tone }) {
  return (
    <div className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">{label}</p>
      <p className={cn("mt-1 text-[20px] font-semibold tabular-nums tracking-[-0.02em]", toneText[tone])}>{count}</p>
    </div>
  );
}

const tierTone: Record<ProviderTier, Tone> = {
  strong: "success",
  stable: "neutral",
  weak: "warning",
  critical: "danger",
  no_data: "muted",
};

function ProviderCard({ provider: p, expanded, onToggle }: { provider: ProviderScore; expanded: boolean; onToggle: () => void }) {
  const tone = tierTone[p.tier];
  const chipBase = "inline-flex items-center h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-medium uppercase tracking-[0.14em]";

  return (
    <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] overflow-hidden">
      {/* Header row */}
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 text-left hover:bg-[var(--surface-1)] transition-colors">
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", toneDot[tone])} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-medium text-ink-0">{p.providerName}</p>
            <span className={cn(chipBase, toneText[tone])}>
              {p.tierLabel}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-ink-5">
            <span>{p.totalProducts} productos</span>
            <span className="text-ink-7">&bull;</span>
            <span>{p.productsImported} importados</span>
            {p.avgEstimatedMargin !== null && (
              <>
                <span className="text-ink-7">&bull;</span>
                <span className={cn("font-semibold", p.avgEstimatedMargin >= 20 ? "text-[color:var(--signal-success)]" : p.avgEstimatedMargin >= 10 ? "text-[color:var(--signal-warning)]" : "text-[color:var(--signal-danger)]")}>
                  Margen {p.avgEstimatedMargin}%
                </span>
              </>
            )}
            {p.catalogDependencyPercent !== null && (
              <>
                <span className="text-ink-7">&bull;</span>
                <span className={cn("font-semibold", p.catalogDependencyPercent > 50 ? "text-[color:var(--signal-danger)]" : "text-ink-5")}>
                  {p.catalogDependencyPercent}% catálogo
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:grid grid-cols-3 gap-4 text-right">
            <div>
              <p className="text-[10px] text-ink-5 font-medium uppercase tracking-[0.14em]">Con costo</p>
              <p className="text-[12px] font-semibold tabular-nums text-ink-0">{p.productsWithCost}/{p.totalProducts}</p>
            </div>
            <div>
              <p className="text-[10px] text-ink-5 font-medium uppercase tracking-[0.14em]">Con stock</p>
              <p className="text-[12px] font-semibold tabular-nums text-ink-0">{p.productsWithStock}/{p.totalProducts}</p>
            </div>
            <div>
              <p className="text-[10px] text-ink-5 font-medium uppercase tracking-[0.14em]">Sync</p>
              <p className={cn("text-[12px] font-semibold tabular-nums", p.syncJobsFailed > 0 ? "text-[color:var(--signal-danger)]" : "text-ink-0")}>
                {p.syncJobsFailed > 0 ? `${p.syncJobsFailed} fail` : `${p.syncJobsCompleted} ok`}
              </p>
            </div>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-ink-5" strokeWidth={1.75} /> : <ChevronDown className="h-4 w-4 text-ink-5" strokeWidth={1.75} />}
        </div>
      </button>

      {/* Expanded signals */}
      {expanded && (
        <div className="border-t border-[color:var(--hairline)] px-4 py-3 bg-[var(--surface-1)]">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 mb-2">Señales observadas</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {p.signals.map((sig) => (
              <SignalPill key={sig.key} signal={sig} />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            {p.lastSyncedAt && (
              <p className="text-[10px] text-ink-5">
                Última sync: {new Date(p.lastSyncedAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            <Link href={p.actionHref} className="flex items-center gap-1 text-[11px] font-medium text-ink-5 hover:text-ink-0 transition-colors">
              {p.actionLabel} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function SignalPill({ signal: s }: { signal: ProviderSignal }) {
  const impactTone: Record<ProviderSignal["impact"], string> = {
    positive: "text-[color:var(--signal-success)]",
    negative: "text-[color:var(--signal-danger)]",
    neutral: "text-ink-5",
  };

  return (
    <div className="flex items-start gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-2.5 py-1.5 text-[11px]">
      <span className={cn("shrink-0 mt-0.5", impactTone[s.impact])}>
        {s.impact === "positive" ? <CheckCircle2 className="h-3 w-3" strokeWidth={1.75} /> : s.impact === "negative" ? <XCircle className="h-3 w-3" strokeWidth={1.75} /> : <Package className="h-3 w-3" strokeWidth={1.75} />}
      </span>
      <div>
        <p className="font-medium text-ink-0">{s.label}</p>
        <p className="text-[10px] text-ink-5">{s.detail}</p>
      </div>
    </div>
  );
}

const priorityTone: Record<ImportPriority, Tone> = {
  high: "success",
  medium: "neutral",
  low: "warning",
  skip: "danger",
  already_imported: "muted",
};

const priorityLabel: Record<ImportPriority, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
  skip: "Omitir",
  already_imported: "Importado",
};

function ImportRow({ item: imp }: { item: ImportScore }) {
  const tone = priorityTone[imp.priority];
  const chipBase = "inline-flex items-center h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-medium uppercase tracking-[0.14em]";

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--surface-1)] transition-colors">
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", toneDot[tone])} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-medium text-ink-0 truncate">{imp.title}</p>
          <span className={cn(chipBase, toneText[tone], "shrink-0")}>
            {priorityLabel[imp.priority]}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {imp.signals.map((sig) => {
            const sigTone = sig.impact === "positive" ? "text-[color:var(--signal-success)]" : sig.impact === "negative" ? "text-[color:var(--signal-danger)]" : "text-ink-5";
            return (
              <span key={sig.key} className={cn("inline-flex items-center h-5 px-1.5 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-0)] text-[10px] font-medium", sigTone)}>
                {sig.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Metrics */}
      <div className="hidden sm:flex items-center gap-6 shrink-0">
        <div className="text-right w-20">
          <p className="text-[10px] text-ink-5 font-medium uppercase tracking-[0.14em]">Costo</p>
          <p className={cn("text-[13px] font-semibold tabular-nums", imp.cost > 0 ? "text-ink-0" : "text-[color:var(--signal-danger)]")}>
            {imp.cost > 0 ? `$${imp.cost.toLocaleString("es-AR")}` : "—"}
          </p>
        </div>
        <div className="text-right w-20">
          <p className="text-[10px] text-ink-5 font-medium uppercase tracking-[0.14em]">Stock</p>
          <p className={cn("text-[13px] font-semibold tabular-nums", imp.stock > 0 ? "text-ink-0" : "text-[color:var(--signal-danger)]")}>
            {imp.stock > 0 ? `${imp.stock} u.` : "0"}
          </p>
        </div>
        {imp.estimatedMarginPercent !== null && (
          <div className="text-right w-20">
            <p className="text-[10px] text-ink-5 font-medium uppercase tracking-[0.14em]">Margen</p>
            <p className={cn(
              "text-[13px] font-semibold tabular-nums",
              imp.estimatedMarginPercent >= 20 ? "text-[color:var(--signal-success)]" : imp.estimatedMarginPercent >= 10 ? "text-[color:var(--signal-warning)]" : "text-[color:var(--signal-danger)]"
            )}>
              {imp.estimatedMarginPercent}%
            </p>
          </div>
        )}
      </div>

      <Link
        href={imp.actionHref}
        className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-ink-5 transition-colors hover:text-ink-0"
      >
        {imp.actionLabel} <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function FilterPill({ label, count, active, onClick, tone }: { label: string; count: number; active: boolean; onClick: () => void; tone?: Tone }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 h-8 rounded-[var(--r-sm)] border px-3 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
        active
          ? "border-transparent bg-ink-0 text-ink-12"
          : cn("border-[color:var(--hairline)] bg-[var(--surface-0)] hover:bg-[var(--surface-1)]", tone ? toneText[tone] : "text-ink-5")
      )}
    >
      {label}
      <span className={cn(
        "inline-flex items-center h-4 px-1 rounded-[var(--r-xs)] text-[10px] font-semibold",
        active ? "bg-ink-12/15 text-ink-12" : "bg-[var(--surface-2)] text-ink-0"
      )}>
        {count}
      </span>
    </button>
  );
}
