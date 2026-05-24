"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, Copy, Check, ChevronDown, ChevronRight, Activity, AlertTriangle, AlertOctagon, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { NexoraPageHeader } from "@/components/admin/nexora";
import type { TimelineRow } from "@/lib/observability/timeline";

interface Props {
  rows: TimelineRow[];
  hasMore: boolean;
  currentFilters: {
    severity: string;
    eventType: string;
    actorId: string;
    correlationId: string;
    entityType: string;
    from: string;
    to: string;
  };
}

// ─── Audit Timeline Client ───────────────────────────────────────────
// Filters round-trip through query params so deep links work. Each row
// is expandable to show sanitized metadata + a Copy correlation ID
// button so you can pivot to a grouped trace.

export function TimelineClient({ rows, hasMore, currentFilters }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState(currentFilters);

  const applyFilters = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    router.push(`/admin/operations/timeline?${params.toString()}`);
  };

  const clearFilters = () => {
    setFilters({ severity: "", eventType: "", actorId: "", correlationId: "", entityType: "", from: "", to: "" });
    router.push("/admin/operations/timeline");
  };

  const correlationIdActive = !!currentFilters.correlationId;

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      <NexoraPageHeader
        title="Línea de tiempo"
        subtitle={correlationIdActive ? `Mostrando eventos correlacionados (${currentFilters.correlationId.slice(0, 8)}…)` : "Auditoría operacional. Cada acción quedó registrada con actor, severidad y correlación."}
      />

      {/* ── Filters ─── */}
      <section className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4 sticky top-0 z-10">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-3.5 w-3.5 text-ink-5" />
          <span className="text-[12px] font-medium text-ink-3">Filtros</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          <select value={filters.severity} onChange={(e) => setFilters({ ...filters, severity: e.target.value })} className="rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-paper)] px-2 py-1.5 text-[12px] outline-none">
            <option value="">Severidad</option>
            <option value="info">Info</option>
            <option value="warn">Advertencia</option>
            <option value="error">Error</option>
            <option value="critical">Crítico</option>
          </select>
          <input value={filters.eventType} onChange={(e) => setFilters({ ...filters, eventType: e.target.value })} placeholder="Event type" className="rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-paper)] px-2 py-1.5 text-[12px] outline-none" />
          <input value={filters.entityType} onChange={(e) => setFilters({ ...filters, entityType: e.target.value })} placeholder="Entity type" className="rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-paper)] px-2 py-1.5 text-[12px] outline-none" />
          <input value={filters.actorId} onChange={(e) => setFilters({ ...filters, actorId: e.target.value })} placeholder="Actor ID" className="rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-paper)] px-2 py-1.5 text-[12px] outline-none" />
          <input value={filters.correlationId} onChange={(e) => setFilters({ ...filters, correlationId: e.target.value })} placeholder="Correlation ID" className="rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-paper)] px-2 py-1.5 text-[12px] outline-none" />
          <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className="rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-paper)] px-2 py-1.5 text-[12px] outline-none" />
          <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className="rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-paper)] px-2 py-1.5 text-[12px] outline-none" />
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button type="button" onClick={clearFilters} className="text-[12px] text-ink-5 hover:text-ink-0">Limpiar</button>
          <button type="button" onClick={applyFilters} className="rounded-full bg-ink-0 px-3 py-1.5 text-[12px] font-medium text-ink-12 hover:bg-ink-2">Aplicar</button>
        </div>
      </section>

      {/* ── Timeline ─── */}
      <div className="space-y-1">
        {rows.length === 0 ? (
          <div className="rounded-[var(--r-lg)] border border-dashed border-[color:var(--hairline-strong)] bg-[var(--surface-0)] p-12 text-center">
            <p className="text-[13px] text-ink-5">No hay eventos para los filtros seleccionados.</p>
          </div>
        ) : (
          rows.map((row) => <TimelineRowItem key={row.id} row={row} />)
        )}
      </div>

      {/* ── Pagination ─── */}
      {hasMore && rows.length > 0 && (
        <div className="text-center">
          <Link
            href={`/admin/operations/timeline?${new URLSearchParams({
              ...Object.fromEntries(searchParams.entries()),
              cursorAt: rows[rows.length - 1].createdAt,
              cursorId: rows[rows.length - 1].id,
            }).toString()}`}
            className="inline-flex items-center gap-1.5 text-[12px] text-ink-5 hover:text-ink-0"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Cargar más
          </Link>
        </div>
      )}
    </div>
  );
}

function TimelineRowItem({ row }: { row: TimelineRow }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const sevConfig = {
    info: { icon: Info, color: "text-ink-5" },
    warn: { icon: AlertTriangle, color: "text-[color:var(--signal-warning)]" },
    error: { icon: AlertOctagon, color: "text-[color:var(--signal-danger)]" },
    critical: { icon: AlertOctagon, color: "text-[color:var(--signal-danger)]" },
  } as const;
  const cfg = sevConfig[row.severity as keyof typeof sevConfig] ?? { icon: Activity, color: "text-ink-5" };
  const Icon = cfg.icon;

  const copy = async (val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available */
    }
  };

  return (
    <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--surface-1)]"
      >
        <Icon className={cn("h-3.5 w-3.5 shrink-0", cfg.color)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[11px] text-ink-3">{row.eventType}</span>
            <span className="text-[11px] text-ink-6">·</span>
            <span className="text-[11px] text-ink-5">{row.source}</span>
            {row.actorRole && (
              <>
                <span className="text-[11px] text-ink-6">·</span>
                <span className="text-[11px] font-medium text-ink-3">{row.actorRole}</span>
              </>
            )}
          </div>
          <div className="mt-0.5 truncate text-[12px] text-ink-3">{row.message}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[11px] tabular text-ink-5">{new Date(row.createdAt).toLocaleString()}</div>
          <ChevronRight className={cn("ml-auto h-3.5 w-3.5 text-ink-6 transition-transform", expanded && "rotate-90")} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[color:var(--hairline)] bg-[var(--surface-1)] p-3 text-[12px]">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
            <Field label="ID" value={row.id} />
            <Field label="Entity" value={`${row.entityType}${row.entityId ? `:${row.entityId}` : ""}`} />
            {row.actorId && <Field label="Actor ID" value={row.actorId} />}
            {row.correlationId && (
              <div>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-ink-5">Correlation</dt>
                <dd className="mt-0.5 flex items-center gap-2">
                  <code className="font-mono text-[11px] text-ink-3">{row.correlationId}</code>
                  <button type="button" onClick={() => copy(row.correlationId!)} className="inline-flex items-center gap-1 rounded-[var(--r-xs)] px-1.5 py-0.5 text-[10px] text-ink-5 hover:bg-[var(--surface-2)] hover:text-ink-0">
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Copiar
                  </button>
                  <Link href={`/admin/operations/timeline?correlationId=${encodeURIComponent(row.correlationId)}`} className="text-[10px] text-ink-5 underline-offset-2 hover:underline">
                    Ver trace
                  </Link>
                </dd>
              </div>
            )}
          </dl>
          {row.metadata && (
            <div className="mt-3">
              <p className="mb-1 text-[10px] uppercase tracking-[0.12em] text-ink-5">Metadata (sanitizada)</p>
              <pre className="overflow-x-auto rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-paper)] p-2 font-mono text-[10px] text-ink-3">
                {JSON.stringify(row.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.12em] text-ink-5">{label}</dt>
      <dd className="mt-0.5 font-mono text-[11px] text-ink-3 break-all">{value}</dd>
    </div>
  );
}
