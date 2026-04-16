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
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#EAEAEA] bg-white p-12 text-center">
        <Truck className="h-8 w-8 text-gray-300 mb-3" />
        <h3 className="text-base font-extrabold text-[#111111]">Sin proveedores conectados</h3>
        <p className="mt-1 max-w-sm text-xs font-medium text-[#888888]">
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
          <ShieldCheck className="h-4 w-4 text-[#111111]" />
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#111111]">
            Score de Proveedores
          </h2>
          <span className="bg-[#111111] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
            {s.totalProviders}
          </span>
        </div>

        {/* Tier KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          <TierChip label="Fuerte" count={s.strong} color="emerald" />
          <TierChip label="Estable" count={s.stable} color="blue" />
          <TierChip label="Débil" count={s.weak} color="amber" />
          <TierChip label="Crítico" count={s.critical} color="red" />
          <TierChip label="Sin datos" count={s.noData} color="gray" />
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
          <TrendingUp className="h-4 w-4 text-[#111111]" />
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#111111]">
            Score de Importables
          </h2>
          <span className="bg-[#111111] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
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
          <FilterPill label="Alta" count={s.highPriorityImports} active={importFilter === "high"} onClick={() => setImportFilter(importFilter === "high" ? "all" : "high")} color="emerald" />
          <FilterPill label="Media" count={s.mediumPriorityImports} active={importFilter === "medium"} onClick={() => setImportFilter(importFilter === "medium" ? "all" : "medium")} color="blue" />
          <FilterPill label="Baja" count={s.lowPriorityImports} active={importFilter === "low"} onClick={() => setImportFilter(importFilter === "low" ? "all" : "low")} color="amber" />
          <FilterPill label="Omitir" count={s.skipImports} active={importFilter === "skip"} onClick={() => setImportFilter(importFilter === "skip" ? "all" : "skip")} color="red" />
        </div>

        {/* Import list */}
        {filteredImports.length > 0 ? (
          <div className="rounded-xl border border-[#EAEAEA] bg-white overflow-hidden shadow-sm">
            <div className="divide-y divide-[#F0F0F0]">
              {filteredImports.map((imp) => (
                <ImportRow key={imp.providerProductId} item={imp} />
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-[#EAEAEA] bg-[#FAFAFA] p-8 text-center">
            <p className="text-xs font-bold text-[#888888]">Sin importables en esta categoría.</p>
          </div>
        )}
      </section>

      {/* ─── Scope ─── */}
      <div className="rounded-2xl border border-[#EAEAEA] bg-[#FAFAFA] p-4 shadow-sm">
        <p className="text-sm font-bold text-[#111111]">Provider Score + Import Score v1</p>
        <p className="mt-1 text-xs leading-relaxed text-[#666666]">
          Clasifica proveedores y productos importables por señales observables: conexión, sync, stock, costo, margen y dependencia.
          No incluye reputación comercial, performance de ventas ni historial — el schema no lo soporta aún.
          Los scores se derivan exclusivamente de datos reales de la base de datos.
        </p>
      </div>
    </div>
  );
}

// ─── Sub-components ───

function TierChip({ label, count, color }: { label: string; count: number; color: string }) {
  const border = color === "red" ? "border-red-200" : color === "amber" ? "border-amber-200" : color === "emerald" ? "border-emerald-200" : color === "blue" ? "border-blue-200" : "border-gray-200";
  const bg = color === "red" ? "bg-red-50" : color === "amber" ? "bg-amber-50" : color === "emerald" ? "bg-emerald-50" : color === "blue" ? "bg-blue-50" : "bg-gray-50";
  const valColor = color === "red" ? "text-red-700" : color === "amber" ? "text-amber-700" : color === "emerald" ? "text-emerald-700" : color === "blue" ? "text-blue-700" : "text-gray-500";

  return (
    <div className={cn("rounded-xl border p-3 shadow-sm", border, bg)}>
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#888888]">{label}</p>
      <p className={cn("mt-0.5 text-xl font-black tabular-nums", valColor)}>{count}</p>
    </div>
  );
}

function ProviderCard({ provider: p, expanded, onToggle }: { provider: ProviderScore; expanded: boolean; onToggle: () => void }) {
  const tierStyles: Record<ProviderTier, { border: string; dot: string; bg: string }> = {
    strong: { border: "border-emerald-200", dot: "bg-emerald-500", bg: "bg-emerald-50" },
    stable: { border: "border-blue-200", dot: "bg-blue-400", bg: "bg-blue-50" },
    weak: { border: "border-amber-200", dot: "bg-amber-500", bg: "bg-amber-50" },
    critical: { border: "border-red-200", dot: "bg-red-500", bg: "bg-red-50" },
    no_data: { border: "border-gray-200", dot: "bg-gray-400", bg: "bg-gray-50" },
  };

  const st = tierStyles[p.tier];

  return (
    <div className={cn("rounded-xl border shadow-sm transition-all", st.border)}>
      {/* Header row */}
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 text-left hover:bg-[#FAFAFA] transition-colors rounded-xl">
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", st.dot)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-bold text-[#111111]">{p.providerName}</p>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", st.bg,
              p.tier === "strong" ? "text-emerald-700" : p.tier === "stable" ? "text-blue-700" : p.tier === "weak" ? "text-amber-700" : p.tier === "critical" ? "text-red-700" : "text-gray-500"
            )}>
              {p.tierLabel}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-[#999999]">
            <span>{p.totalProducts} productos</span>
            <span className="text-[#E0E0E0]">&bull;</span>
            <span>{p.productsImported} importados</span>
            {p.avgEstimatedMargin !== null && (
              <>
                <span className="text-[#E0E0E0]">&bull;</span>
                <span className={cn("font-bold", p.avgEstimatedMargin >= 20 ? "text-emerald-600" : p.avgEstimatedMargin >= 10 ? "text-amber-600" : "text-red-500")}>
                  Margen {p.avgEstimatedMargin}%
                </span>
              </>
            )}
            {p.catalogDependencyPercent !== null && (
              <>
                <span className="text-[#E0E0E0]">&bull;</span>
                <span className={cn("font-bold", p.catalogDependencyPercent > 50 ? "text-red-500" : "text-[#999999]")}>
                  {p.catalogDependencyPercent}% catálogo
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:grid grid-cols-3 gap-4 text-right">
            <div>
              <p className="text-[10px] text-[#AAAAAA] font-bold">Con costo</p>
              <p className="text-[12px] font-bold tabular-nums text-[#111111]">{p.productsWithCost}/{p.totalProducts}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#AAAAAA] font-bold">Con stock</p>
              <p className="text-[12px] font-bold tabular-nums text-[#111111]">{p.productsWithStock}/{p.totalProducts}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#AAAAAA] font-bold">Sync</p>
              <p className={cn("text-[12px] font-bold tabular-nums", p.syncJobsFailed > 0 ? "text-red-500" : "text-[#111111]")}>
                {p.syncJobsFailed > 0 ? `${p.syncJobsFailed} fail` : `${p.syncJobsCompleted} ok`}
              </p>
            </div>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-[#AAAAAA]" /> : <ChevronDown className="h-4 w-4 text-[#AAAAAA]" />}
        </div>
      </button>

      {/* Expanded signals */}
      {expanded && (
        <div className="border-t border-[#F0F0F0] px-4 py-3 bg-[#FAFAFA] rounded-b-xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#888888] mb-2">Señales observadas</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {p.signals.map((sig) => (
              <SignalPill key={sig.key} signal={sig} />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            {p.lastSyncedAt && (
              <p className="text-[10px] text-[#AAAAAA]">
                Última sync: {new Date(p.lastSyncedAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            <Link href={p.actionHref} className="flex items-center gap-1 text-[11px] font-bold text-[#AAAAAA] hover:text-[#111111] transition-colors">
              {p.actionLabel} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function SignalPill({ signal: s }: { signal: ProviderSignal }) {
  const colors = {
    positive: "text-emerald-700 bg-emerald-50 border-emerald-200",
    negative: "text-red-700 bg-red-50 border-red-200",
    neutral: "text-[#666666] bg-[#F5F5F5] border-[#E0E0E0]",
  };

  return (
    <div className={cn("flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-[11px]", colors[s.impact])}>
      <span className="shrink-0 mt-0.5">
        {s.impact === "positive" ? <CheckCircle2 className="h-3 w-3" /> : s.impact === "negative" ? <XCircle className="h-3 w-3" /> : <Package className="h-3 w-3" />}
      </span>
      <div>
        <p className="font-bold">{s.label}</p>
        <p className="text-[10px] opacity-80">{s.detail}</p>
      </div>
    </div>
  );
}

function ImportRow({ item: imp }: { item: ImportScore }) {
  const prioStyles: Record<ImportPriority, { dot: string; badge: string; badgeText: string }> = {
    high: { dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700", badgeText: "Alta" },
    medium: { dot: "bg-blue-400", badge: "bg-blue-100 text-blue-700", badgeText: "Media" },
    low: { dot: "bg-amber-500", badge: "bg-amber-100 text-amber-700", badgeText: "Baja" },
    skip: { dot: "bg-red-500", badge: "bg-red-100 text-red-700", badgeText: "Omitir" },
    already_imported: { dot: "bg-gray-400", badge: "bg-gray-100 text-gray-500", badgeText: "Importado" },
  };

  const ps = prioStyles[imp.priority];

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#FAFAFA] transition-colors">
      <span className={cn("h-2 w-2 shrink-0 rounded-full", ps.dot)} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-bold text-[#111111] truncate">{imp.title}</p>
          <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold shrink-0", ps.badge)}>
            {ps.badgeText}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {imp.signals.map((sig) => (
            <span
              key={sig.key}
              className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded",
                sig.impact === "positive" ? "bg-emerald-50 text-emerald-600" :
                sig.impact === "negative" ? "bg-red-50 text-red-600" :
                "bg-gray-50 text-gray-500"
              )}
            >
              {sig.label}
            </span>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="hidden sm:flex items-center gap-6 shrink-0">
        <div className="text-right w-20">
          <p className="text-[10px] text-[#AAAAAA] font-bold">Costo</p>
          <p className={cn("text-[13px] font-bold tabular-nums", imp.cost > 0 ? "text-[#111111]" : "text-red-400")}>
            {imp.cost > 0 ? `$${imp.cost.toLocaleString("es-AR")}` : "—"}
          </p>
        </div>
        <div className="text-right w-20">
          <p className="text-[10px] text-[#AAAAAA] font-bold">Stock</p>
          <p className={cn("text-[13px] font-bold tabular-nums", imp.stock > 0 ? "text-[#111111]" : "text-red-400")}>
            {imp.stock > 0 ? `${imp.stock} u.` : "0"}
          </p>
        </div>
        {imp.estimatedMarginPercent !== null && (
          <div className="text-right w-20">
            <p className="text-[10px] text-[#AAAAAA] font-bold">Margen</p>
            <p className={cn(
              "text-[13px] font-bold tabular-nums",
              imp.estimatedMarginPercent >= 20 ? "text-emerald-600" : imp.estimatedMarginPercent >= 10 ? "text-amber-600" : "text-red-500"
            )}>
              {imp.estimatedMarginPercent}%
            </p>
          </div>
        )}
      </div>

      <Link
        href={imp.actionHref}
        className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-[#AAAAAA] transition-colors hover:text-[#111111]"
      >
        {imp.actionLabel} <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function FilterPill({ label, count, active, onClick, color }: { label: string; count: number; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold transition-all",
        active
          ? "border-[#111111] bg-[#111111] text-white"
          : color === "emerald" ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          : color === "blue" ? "border-blue-200 text-blue-700 hover:bg-blue-50"
          : color === "amber" ? "border-amber-200 text-amber-700 hover:bg-amber-50"
          : color === "red" ? "border-red-200 text-red-700 hover:bg-red-50"
          : "border-[#EAEAEA] text-[#888888] hover:bg-[#F5F5F5]"
      )}
    >
      {label}
      <span className={cn(
        "rounded-full px-1.5 text-[10px]",
        active ? "bg-white/20" : "bg-black/5"
      )}>
        {count}
      </span>
    </button>
  );
}
