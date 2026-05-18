"use client";

// ─── Automation Center — Client ──────────────────────────────────────────
// Real operational dashboard for all background automations.
// Shows cards with metrics, activity logs, and health warnings.

import { useState, useMemo } from "react";
import {
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Activity,
  ChevronDown,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AutomationDashboardData, AutomationCard, AutomationLogEntry } from "@/lib/automations/queries";
import {
  NexoraPageHeader,
  NexoraTableShell,
} from "@/components/admin/nexora";

interface AutomationsClientProps {
  data: AutomationDashboardData;
}

type LogFilter = "all" | "success" | "failure";

export function AutomationsClient({ data }: AutomationsClientProps) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<LogFilter>("all");
  const [showAllLogs, setShowAllLogs] = useState(false);

  const filteredLogs = useMemo(() => {
    const base = logFilter === "all" ? data.recentLogs : data.recentLogs.filter((l) => l.status === logFilter);
    return showAllLogs ? base : base.slice(0, 20);
  }, [data.recentLogs, logFilter, showAllLogs]);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      <NexoraPageHeader
        title="Automatizaciones"
        subtitle="Centro de control de tareas automáticas: carritos abandonados, cobros, alertas de stock, reseñas y más."
      />

      {/* ── Health Warnings ────────────────────────────────────────── */}
      {data.healthWarnings.length > 0 && (
        <div className="rounded-[var(--r-lg)] border border-[color:var(--signal-warning)]/30 bg-[color:var(--signal-warning)]/5 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--signal-warning)]" strokeWidth={1.75} />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[color:var(--signal-warning)]">Atención</p>
              {data.healthWarnings.map((w, i) => (
                <p key={i} className="mt-0.5 text-[11px] text-ink-3">{w}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Automation Cards ───────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.cards.map((card) => (
          <AutomationCardView
            key={card.id}
            card={card}
            expanded={expandedCard === card.id}
            onToggle={() => setExpandedCard((prev) => (prev === card.id ? null : card.id))}
          />
        ))}
      </div>

      {/* ── Activity Logs ──────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-ink-0 flex items-center gap-2">
            <Activity className="h-4 w-4" strokeWidth={1.75} />
            Actividad reciente
          </h2>
          <div className="flex gap-1">
            {(["all", "success", "failure"] as LogFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setLogFilter(f)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors",
                  logFilter === f
                    ? "bg-ink-0 text-ink-12"
                    : "bg-[var(--surface-1)] text-ink-5 hover:bg-[var(--surface-2)]",
                )}
              >
                {f === "all" ? "Todos" : f === "success" ? "Éxito" : "Errores"}
              </button>
            ))}
          </div>
        </div>

        <NexoraTableShell>
          {filteredLogs.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12px] text-ink-5">
              Sin eventos {logFilter !== "all" ? `de tipo "${logFilter}"` : ""} en los últimos 30 días.
            </div>
          ) : (
            <table className="nx-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th>Fecha</th>
                  <th>Origen</th>
                  <th>Tipo</th>
                  <th>Mensaje</th>
                  <th>Entidad</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <LogRow key={log.id} log={log} />
                ))}
              </tbody>
            </table>
          )}

          {data.recentLogs.length > 20 && !showAllLogs && (
            <div className="border-t border-[color:var(--hairline)] px-4 py-2 text-center">
              <button
                type="button"
                onClick={() => setShowAllLogs(true)}
                className="text-[11px] font-medium text-ink-3 hover:text-ink-0 transition-colors"
              >
                Ver todos ({data.recentLogs.length} eventos)
              </button>
            </div>
          )}
        </NexoraTableShell>
      </div>
    </div>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────

function AutomationCardView({
  card,
  expanded,
  onToggle,
}: {
  card: AutomationCard;
  expanded: boolean;
  onToggle: () => void;
}) {
  const successRate = card.totalProcessed > 0 ? Math.round((card.successCount / card.totalProcessed) * 100) : null;
  const lastRunDate = card.lastRun ? new Date(card.lastRun) : null;
  const timeAgo = lastRunDate ? formatTimeAgo(lastRunDate) : null;

  return (
    <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-soft)] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-[var(--surface-1)] transition-colors"
      >
        <div className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-md)] border",
          card.enabled
            ? "border-[color:var(--signal-success)]/30 bg-[color:var(--signal-success)]/10 text-[color:var(--signal-success)]"
            : "border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-5",
        )}>
          <Zap className="h-3.5 w-3.5" strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-semibold text-ink-0 truncate">{card.label}</p>
            <span className={cn(
              "inline-flex items-center h-[18px] rounded-full px-1.5 text-[9px] font-semibold uppercase tracking-wider",
              card.enabled
                ? "bg-[color:var(--signal-success)]/10 text-[color:var(--signal-success)]"
                : "bg-[var(--surface-2)] text-ink-5",
            )}>
              {card.enabled ? "activo" : "inactivo"}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-ink-5 line-clamp-1">{card.description}</p>
        </div>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-ink-5 transition-transform", expanded && "rotate-180")} strokeWidth={1.75} />
      </button>

      {expanded && (
        <div className="border-t border-[color:var(--hairline)] px-4 py-3 space-y-2 bg-[var(--surface-1)]/50">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[16px] font-bold text-ink-0 tabular-nums">{card.totalProcessed}</p>
              <p className="text-[9px] text-ink-5 uppercase tracking-wider">Procesados</p>
            </div>
            <div>
              <p className="text-[16px] font-bold text-[color:var(--signal-success)] tabular-nums">{card.successCount}</p>
              <p className="text-[9px] text-ink-5 uppercase tracking-wider">Éxito</p>
            </div>
            <div>
              <p className="text-[16px] font-bold tabular-nums" style={{ color: card.failureCount > 0 ? "var(--signal-danger)" : "var(--ink-5)" }}>{card.failureCount}</p>
              <p className="text-[9px] text-ink-5 uppercase tracking-wider">Fallos</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-ink-5 pt-1 border-t border-[color:var(--hairline)]">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" strokeWidth={1.75} />
              {timeAgo ? `Último: ${timeAgo}` : "Sin ejecuciones"}
            </span>
            {successRate !== null && (
              <span className="flex items-center gap-1">
                {successRate >= 90 ? (
                  <CheckCircle2 className="h-3 w-3 text-[color:var(--signal-success)]" strokeWidth={1.75} />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-[color:var(--signal-warning)]" strokeWidth={1.75} />
                )}
                {successRate}% tasa de éxito
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Log Row ─────────────────────────────────────────────────────────────

function LogRow({ log }: { log: AutomationLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(log.timestamp);

  return (
    <>
      <tr onClick={() => log.metadata && setExpanded(!expanded)} style={{ cursor: log.metadata ? "pointer" : undefined }}>
        <td>
          {log.status === "success" ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-[color:var(--signal-success)]" strokeWidth={1.75} />
          ) : log.status === "failure" ? (
            <XCircle className="h-3.5 w-3.5 text-[color:var(--signal-danger)]" strokeWidth={1.75} />
          ) : (
            <Info className="h-3.5 w-3.5 text-ink-5" strokeWidth={1.75} />
          )}
        </td>
        <td className="nx-cell-meta" style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
          {date.toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </td>
        <td><span className="nx-chip" style={{ pointerEvents: "none", height: 20, fontSize: 10 }}>{log.automation}</span></td>
        <td className="nx-cell-meta">{log.entityType}</td>
        <td className="nx-cell-meta" style={{ maxWidth: 300 }}>
          <span className="truncate block">{log.message}</span>
        </td>
        <td className="nx-cell-meta">{log.entityId ? log.entityId.slice(0, 8) + "…" : "—"}</td>
      </tr>
      {expanded && log.metadata && (
        <tr>
          <td colSpan={6} style={{ padding: 0 }}>
            <pre className="bg-[var(--surface-1)] px-4 py-2 text-[10px] text-ink-3 font-mono overflow-x-auto border-t border-b border-[color:var(--hairline)]">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}
