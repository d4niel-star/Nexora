"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  ExternalLink,
  HelpCircle,
  Loader2,
  Package,
  RefreshCw,
  ShieldAlert,
  Type,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { syncChannelListingAction } from "@/lib/channels/actions";
import { batchResyncListings, type BatchResult } from "@/app/admin/ai/execution-actions";
import type {
  DiffEntry,
  DiffField,
  DiffFieldKey,
  DiffReport,
  DiffSeverity,
} from "@/types/sync-diff";

type SeverityFilter = "all" | DiffSeverity;

export function DiffCenter({ report, onRefresh }: { report: DiffReport; onRefresh: () => void }) {
  const [sevFilter, setSevFilter] = useState<SeverityFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [batchFeedback, setBatchFeedback] = useState<string | null>(null);

  const s = report.summary;

  const filtered = useMemo(() => {
    if (sevFilter === "all") return report.entries;
    return report.entries.filter((e) => e.overallSeverity === sevFilter);
  }, [report.entries, sevFilter]);

  const handleSync = (listingId: string) => {
    startTransition(async () => {
      try {
        await syncChannelListingAction(listingId);
        onRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  const handleBatchResync = () => {
    setBatchFeedback(null);
    startTransition(async () => {
      const result = await batchResyncListings();
      if (result.processed > 0) {
        setBatchFeedback(`${result.processed} resincronizado(s)${result.failed > 0 ? `, ${result.failed} fallido(s)` : ""}`);
        setTimeout(() => setBatchFeedback(null), 3000);
      }
      onRefresh();
    });
  };

  if (s.totalListings === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="h-10 w-10 text-gray-300" />
        <p className="mt-4 text-sm font-bold text-[#111111]">Sin publicaciones activas</p>
        <p className="mt-1 text-xs text-[#888888]">Publicá productos en canales para que el Diff Engine pueda detectar diferencias.</p>
        <Link href="/admin/publications" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline">
          Ir a Publicaciones <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  if (s.withDiffs === 0 && s.withErrors === 0) {
    return (
      <div className="space-y-4">
        <DiffHeader summary={s} onBatchResync={handleBatchResync} isPending={isPending} batchFeedback={batchFeedback} />
        <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 py-12 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          <p className="mt-4 text-sm font-bold text-emerald-800">Todo sincronizado</p>
          <p className="mt-1 text-xs text-emerald-600">
            {s.totalListings} publicación{s.totalListings !== 1 ? "es" : ""} verificada{s.totalListings !== 1 ? "s" : ""}, sin diferencias detectadas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DiffHeader summary={s} onBatchResync={handleBatchResync} isPending={isPending} batchFeedback={batchFeedback} />

      {/* Severity filter pills */}
      <div className="flex flex-wrap gap-2">
        <FilterPill label="Todos" count={s.withDiffs} active={sevFilter === "all"} onClick={() => setSevFilter("all")} />
        {s.bySeverity.map((bs) => (
          <FilterPill
            key={bs.severity}
            label={sevLabel(bs.severity)}
            count={bs.count}
            active={sevFilter === bs.severity}
            onClick={() => setSevFilter(sevFilter === bs.severity ? "all" : bs.severity)}
            color={sevColor(bs.severity)}
          />
        ))}
      </div>

      {/* Field breakdown */}
      {s.byField.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {s.byField.map((bf) => (
            <span key={bf.field} className="inline-flex items-center gap-1.5 rounded-full border border-[#EAEAEA] bg-white px-3 py-1 text-[10px] font-bold text-[#888888]">
              <FieldIcon field={bf.field} />
              {bf.label}: {bf.count}
            </span>
          ))}
          {s.byChannel.map((bc) => (
            <span key={bc.channel} className="inline-flex items-center gap-1.5 rounded-full border border-[#EAEAEA] bg-white px-3 py-1 text-[10px] font-bold text-[#888888]">
              {bc.channelLabel}: {bc.count}
            </span>
          ))}
        </div>
      )}

      {/* Diff entries */}
      <div className="space-y-2">
        {filtered.map((entry) => (
          <DiffRow
            key={entry.listingId}
            entry={entry}
            expanded={expandedId === entry.listingId}
            onToggle={() => setExpandedId(expandedId === entry.listingId ? null : entry.listingId)}
            onSync={() => handleSync(entry.listingId)}
            isPending={isPending}
          />
        ))}
      </div>

      {/* Scope note */}
      <div className="rounded-xl border border-[#EAEAEA] bg-[#FAFAFA] p-4">
        <p className="text-[11px] text-[#888888] leading-relaxed">
          <strong>Diff Engine v2</strong> — Compara precio, stock y título internos contra los snapshots sincronizados en cada canal.
          Campos no soportados aún: descripción, imágenes, atributos (el schema no persiste snapshots remotos de esos campos).
        </p>
      </div>
    </div>
  );
}

// ─── Sub-components ───

function DiffHeader({ summary, onBatchResync, isPending, batchFeedback }: { summary: DiffReport["summary"]; onBatchResync: () => void; isPending: boolean; batchFeedback: string | null }) {
  const hasCritical = summary.bySeverity.some((s) => s.severity === "critical");
  const hasHigh = summary.bySeverity.some((s) => s.severity === "high");

  return (
    <div className={cn(
      "rounded-2xl border p-5 shadow-sm",
      hasCritical ? "border-red-200 bg-red-50" : hasHigh ? "border-amber-200 bg-amber-50" : "border-[#EAEAEA] bg-white",
    )}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className={cn("h-5 w-5", hasCritical ? "text-red-600" : hasHigh ? "text-amber-600" : "text-[#888888]")} />
            <h2 className="text-sm font-bold text-[#111111]">Centro de Diferencias</h2>
          </div>
          <p className="mt-1 text-xs text-[#666666]">
            {summary.withDiffs} de {summary.totalListings} publicaciones con diferencias detectadas.
            {summary.withErrors > 0 && ` ${summary.withErrors} con errores de sync.`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
        {batchFeedback && (
          <span className="text-[11px] font-bold text-emerald-600 animate-in fade-in">{batchFeedback}</span>
        )}
        <button
          onClick={onBatchResync}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#111111] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-black disabled:opacity-50 transition-colors"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Resincronizar todo
        </button>
        <div className="grid grid-cols-3 gap-4 text-right">
          <div>
            <p className="text-[10px] font-bold uppercase text-[#AAAAAA]">Total</p>
            <p className="text-lg font-black text-[#111111]">{summary.totalListings}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-[#AAAAAA]">Diffs</p>
            <p className="text-lg font-black text-amber-600">{summary.withDiffs}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-[#AAAAAA]">Errores</p>
            <p className="text-lg font-black text-red-600">{summary.withErrors}</p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

function DiffRow({ entry, expanded, onToggle, onSync, isPending }: {
  entry: DiffEntry;
  expanded: boolean;
  onToggle: () => void;
  onSync: () => void;
  isPending: boolean;
}) {
  const sev = entry.overallSeverity;

  return (
    <div className={cn(
      "rounded-xl border transition-all",
      expanded ? "border-[#CCCCCC] bg-white shadow-sm" : "border-[#EAEAEA] bg-white",
    )}>
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        {/* Severity dot */}
        <span className={cn(
          "h-2.5 w-2.5 shrink-0 rounded-full",
          sev === "critical" ? "bg-red-500" : sev === "high" ? "bg-amber-500" : sev === "normal" ? "bg-blue-400" : "bg-gray-300",
        )} />

        {/* Product */}
        {entry.productImage ? (
          <img src={entry.productImage} alt="" className="h-8 w-8 rounded-lg border border-gray-100 object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-100 bg-gray-50">
            <Package className="h-4 w-4 text-gray-300" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#111111]">{entry.productTitle}</p>
          <p className="mt-0.5 text-[10px] text-[#AAAAAA]">
            {entry.channelLabel}
            {entry.diffs.length > 0 && ` · ${entry.diffs.map((d) => d.label).join(", ")}`}
          </p>
        </div>

        {/* Diff count badge */}
        <div className="flex items-center gap-2">
          {entry.diffs.length > 0 && (
            <span className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
              sev === "critical" ? "bg-red-100 text-red-700" : sev === "high" ? "bg-amber-100 text-amber-700" : "bg-blue-50 text-blue-600",
            )}>
              {entry.diffs.length} diff{entry.diffs.length !== 1 ? "s" : ""}
            </span>
          )}
          {entry.lastError && !entry.diffs.length && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
              <XCircle className="h-3 w-3" /> Error
            </span>
          )}
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-[#AAAAAA]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#AAAAAA]" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#EAEAEA] px-4 py-4 space-y-4">
          {/* Field-level diffs */}
          {entry.diffs.length > 0 && (
            <div className="space-y-2">
              {entry.diffs.map((d) => (
                <DiffFieldRow key={d.field} diff={d} />
              ))}
            </div>
          )}

          {/* Error details */}
          {entry.lastError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-[10px] font-bold uppercase text-red-500">Último error</p>
              <p className="mt-1 text-[11px] text-red-700 break-words">{entry.lastError}</p>
              {entry.retryCount > 0 && (
                <p className="mt-1 text-[10px] text-red-400">Reintentos: {entry.retryCount}</p>
              )}
            </div>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#AAAAAA]">
            <span>Estado: <strong className="text-[#888888]">{entry.listingStatus}</strong></span>
            <span>Sync: <strong className="text-[#888888]">{entry.syncStatus}</strong></span>
            {entry.lastSyncedAt && (
              <span>Último sync: <strong className="text-[#888888]">{new Date(entry.lastSyncedAt).toLocaleDateString("es-AR")}</strong></span>
            )}
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-2">
            <button
              onClick={onSync}
              disabled={isPending}
              className="inline-flex items-center gap-1 rounded-full bg-[#111111] px-3 py-1.5 text-[10px] font-bold text-white hover:bg-[#333333] transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Resincronizar
            </button>
            {entry.externalUrl && (
              <a
                href={entry.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-[#EAEAEA] px-3 py-1.5 text-[10px] font-bold text-[#888888] hover:text-[#111111] hover:border-[#CCCCCC] transition-colors"
              >
                <ExternalLink className="h-3 w-3" /> Ver en canal
              </a>
            )}
            <Link
              href="/admin/catalog"
              className="text-[10px] font-bold text-blue-600 hover:underline"
            >
              Ver producto
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function DiffFieldRow({ diff }: { diff: DiffField }) {
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-lg border p-3",
      diff.severity === "critical" ? "border-red-200 bg-red-50" :
      diff.severity === "high" ? "border-amber-200 bg-amber-50" :
      "border-[#EAEAEA] bg-[#FAFAFA]",
    )}>
      <FieldIcon field={diff.field} />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#888888]">{diff.label}</p>
        <div className="mt-1 flex items-center gap-2 text-[12px]">
          <span className="font-bold text-emerald-700 truncate" title={diff.localValue}>
            Local: {diff.localValue}
          </span>
          <ArrowRight className="h-3 w-3 shrink-0 text-[#CCCCCC]" />
          <span className={cn(
            "font-bold truncate",
            diff.severity === "critical" ? "text-red-700" : diff.severity === "high" ? "text-amber-700" : "text-[#888888]",
          )} title={diff.syncedValue}>
            Canal: {diff.syncedValue}
          </span>
        </div>
      </div>
      <SeverityBadge severity={diff.severity} />
    </div>
  );
}

function SeverityBadge({ severity }: { severity: DiffSeverity }) {
  const config = sevConfig(severity);
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider", config.cls)}>
      {config.icon}
      {config.label}
    </span>
  );
}

function FilterPill({ label, count, active, onClick, color }: {
  label: string; count: number; active: boolean; onClick: () => void; color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold transition-all",
        active ? "bg-[#111111] text-white" : "bg-white border border-[#EAEAEA] text-[#888888] hover:text-[#111111]",
      )}
    >
      {label} <span className={cn("tabular-nums", active ? "text-white/70" : color || "text-[#AAAAAA]")}>{count}</span>
    </button>
  );
}

function FieldIcon({ field }: { field: DiffFieldKey }) {
  const cls = "h-3.5 w-3.5 text-[#888888]";
  switch (field) {
    case "price": return <DollarSign className={cls} />;
    case "stock": return <Package className={cls} />;
    case "title": return <Type className={cls} />;
    default: return <HelpCircle className={cls} />;
  }
}

function sevConfig(s: DiffSeverity) {
  switch (s) {
    case "critical": return { label: "Crítico", icon: <XCircle className="h-3 w-3" />, cls: "bg-red-100 text-red-700 border border-red-200" };
    case "high": return { label: "Alto", icon: <AlertTriangle className="h-3 w-3" />, cls: "bg-amber-100 text-amber-700 border border-amber-200" };
    case "normal": return { label: "Normal", icon: <CheckCircle2 className="h-3 w-3" />, cls: "bg-blue-50 text-blue-600 border border-blue-200" };
    case "info": return { label: "Info", icon: <HelpCircle className="h-3 w-3" />, cls: "bg-gray-100 text-gray-500 border border-gray-200" };
  }
}

function sevLabel(s: DiffSeverity): string {
  switch (s) {
    case "critical": return "Crítico";
    case "high": return "Alto";
    case "normal": return "Normal";
    case "info": return "Info";
  }
}

function sevColor(s: DiffSeverity): string {
  switch (s) {
    case "critical": return "text-red-600";
    case "high": return "text-amber-600";
    case "normal": return "text-blue-600";
    case "info": return "text-gray-400";
  }
}
