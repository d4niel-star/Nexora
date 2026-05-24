"use client";

import { useState, useTransition } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock, RefreshCcw, XCircle, Zap, Database, Mail, Truck, ShoppingCart, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { retryJobAction, cancelJobAction, runDueJobsAction } from "@/lib/jobs/actions";
import type { JobSummary, JobRow } from "@/lib/jobs/queries";
import type { SystemHealthReport } from "@/lib/observability/health";
import { NexoraPageHeader } from "@/components/admin/nexora";

// ─── Operations Center Client ────────────────────────────────────────
// Real-only operational dashboard. Every metric, every job row, every
// retry button is wired to real backend state. No fake data.

interface Props {
  summary: JobSummary;
  recentJobs: JobRow[];
  failedJobs: JobRow[];
  deadJobs: JobRow[];
  health: SystemHealthReport;
  actorRole: string;
}

type Tab = "overview" | "failed" | "dead" | "recent";

export function OperationsCenterClient({ summary, recentJobs, failedJobs, deadJobs, health, actorRole }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const canMutate = actorRole === "owner" || actorRole === "admin" || actorRole === "manager";

  const handleRetry = (id: string) => {
    if (!canMutate) return;
    setBusyId(id);
    startTransition(async () => {
      await retryJobAction(id);
      setBusyId(null);
    });
  };

  const handleCancel = (id: string) => {
    if (!canMutate) return;
    setBusyId(id);
    startTransition(async () => {
      await cancelJobAction(id);
      setBusyId(null);
    });
  };

  const handleDrain = () => {
    if (!canMutate) return;
    startTransition(async () => {
      await runDueJobsAction();
    });
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      <div className="flex items-start justify-between">
        <NexoraPageHeader
          title="Centro de Operaciones"
          subtitle="Salud del sistema, cola de jobs y trazabilidad operacional. Toda la información es real y proviene del backend."
        />
        <a
          href="/admin/operations/timeline"
          className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-3 py-1.5 text-[12px] font-medium text-ink-0 hover:bg-[var(--surface-2)]"
        >
          <Activity className="h-3.5 w-3.5" />
          Línea de tiempo
        </a>
      </div>

      {/* ── System Health Strip ────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SubsystemCard icon={Database} label="Base de datos" status={health.subsystems.database.status} message={health.subsystems.database.message} />
        <SubsystemCard icon={ShoppingCart} label="Pedidos" status={health.subsystems.orders.status} message={health.subsystems.orders.message} />
        <SubsystemCard icon={Zap} label="Pagos" status={health.subsystems.payments.status} message={health.subsystems.payments.message} />
        <SubsystemCard icon={Mail} label="Emails" status={health.subsystems.emails.status} message={health.subsystems.emails.message} />
        <SubsystemCard icon={Truck} label="Logística" status={health.subsystems.logistics.status} message={health.subsystems.logistics.message} />
        <SubsystemCard icon={Layers} label="Cola de jobs" status={health.subsystems.queue.status} message={health.subsystems.queue.message} />
      </section>

      {/* ── Resilience Strip (Phase 7B.5) ────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <ResilienceCard
          label="Lag de cola"
          value={health.queueDetails.oldestPendingMs == null
            ? "—"
            : formatDuration(health.queueDetails.oldestPendingMs)}
          tone={
            health.queueDetails.oldestPendingMs == null ? "muted" :
            health.queueDetails.oldestPendingMs > 5 * 60_000 ? "warn" :
            "default"
          }
          hint={`${health.queueDetails.pending} pendientes / ${health.queueDetails.running} corriendo`}
        />
        <ResilienceCard
          label="Jobs muertos (24h)"
          value={String(health.queueDetails.dead24h)}
          tone={health.queueDetails.dead24h > 0 ? "danger" : "default"}
          hint="Necesitan revisión manual"
        />
        <ResilienceCard
          label="Rate limits"
          value={`${health.rateLimitPressure.triggered24h} / 24h`}
          tone={health.rateLimitPressure.triggered24h > 20 ? "warn" : "default"}
          hint={`${health.rateLimitPressure.activeBuckets} buckets activos`}
        />
        <ResilienceCard
          label="Circuit breakers"
          value={health.circuitBreakers.length === 0 ? "—" : `${health.circuitBreakers.filter(b => b.state !== "closed").length} abiertos`}
          tone={health.circuitBreakers.some(b => b.state !== "closed") ? "warn" : "default"}
          hint={health.circuitBreakers.length === 0
            ? "Sin tráfico aún"
            : health.circuitBreakers.map(b => `${b.name}:${b.state}`).join(" · ")}
        />
      </section>

      {/* ── Queue Summary ──────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[12px] font-medium uppercase tracking-[0.18em] text-ink-5">Cola de jobs</h2>
          {canMutate && (
            <button
              type="button"
              onClick={handleDrain}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-3 py-1.5 text-[12px] font-medium text-ink-0 hover:bg-[var(--surface-2)] disabled:opacity-60"
            >
              <RefreshCcw className={cn("h-3.5 w-3.5", isPending && "animate-spin")} />
              {isPending ? "Procesando..." : "Drenar pendientes"}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <Kpi label="Total" value={summary.total} />
          <Kpi label="Pendientes" value={summary.pending} tone={summary.pending > 100 ? "warn" : "default"} />
          <Kpi label="En proceso" value={summary.running} />
          <Kpi label="OK 24h" value={summary.succeeded24h} tone="success" />
          <Kpi label="Fallidos 24h" value={summary.failed24h} tone={summary.failed24h > 0 ? "warn" : "default"} />
          <Kpi label="Muertos 24h" value={summary.dead24h} tone={summary.dead24h > 0 ? "danger" : "default"} />
          <Kpi label="Cancelados 24h" value={summary.cancelled24h} />
        </div>
      </section>

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-[color:var(--hairline)]">
        <TabButton active={tab === "overview"} onClick={() => setTab("overview")} count={recentJobs.length} label="Recientes" />
        <TabButton active={tab === "failed"} onClick={() => setTab("failed")} count={failedJobs.length} label="Fallidos" tone="warn" />
        <TabButton active={tab === "dead"} onClick={() => setTab("dead")} count={deadJobs.length} label="Muertos" tone="danger" />
      </div>

      {tab === "overview" && <JobsTable rows={recentJobs} onRetry={handleRetry} onCancel={handleCancel} busyId={busyId} canMutate={canMutate} />}
      {tab === "failed" && <JobsTable rows={failedJobs} onRetry={handleRetry} onCancel={handleCancel} busyId={busyId} canMutate={canMutate} />}
      {tab === "dead" && <JobsTable rows={deadJobs} onRetry={handleRetry} onCancel={handleCancel} busyId={busyId} canMutate={canMutate} />}
    </div>
  );
}

// ─── Subcomponents ───

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function ResilienceCard({ label, value, tone, hint }: { label: string; value: string; tone: "default" | "warn" | "danger" | "muted"; hint: string }) {
  const toneCls =
    tone === "danger" ? "text-[color:var(--signal-danger)]" :
    tone === "warn" ? "text-[color:var(--signal-warning)]" :
    tone === "muted" ? "text-ink-5" :
    "text-ink-0";
  return (
    <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-5">{label}</p>
      <p className={cn("mt-1.5 text-[18px] font-semibold tabular tracking-[-0.02em]", toneCls)}>{value}</p>
      <p className="mt-1 text-[11px] text-ink-5 line-clamp-2">{hint}</p>
    </div>
  );
}

function SubsystemCard({ icon: Icon, label, status, message }: { icon: React.ComponentType<{ className?: string }>; label: string; status: "ok" | "warn" | "error"; message: string }) {
  const dotColor = status === "ok" ? "bg-[color:var(--signal-success)]" : status === "warn" ? "bg-[color:var(--signal-warning)]" : "bg-[color:var(--signal-danger)]";
  return (
    <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-ink-5" />
        <span className="text-[11px] font-medium text-ink-5">{label}</span>
        <span className={cn("ml-auto h-1.5 w-1.5 rounded-full", dotColor)} aria-label={status} />
      </div>
      <p className="mt-2 text-[12px] text-ink-3 line-clamp-2">{message}</p>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: "default" | "success" | "warn" | "danger" }) {
  const valueColor =
    tone === "success" ? "text-[color:var(--signal-success)]" :
    tone === "warn" ? "text-[color:var(--signal-warning)]" :
    tone === "danger" ? "text-[color:var(--signal-danger)]" :
    "text-ink-0";
  return (
    <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-5">{label}</p>
      <p className={cn("mt-2 text-[22px] font-semibold tabular tracking-[-0.02em]", valueColor)}>{value}</p>
    </div>
  );
}

function TabButton({ active, onClick, label, count, tone }: { active: boolean; onClick: () => void; label: string; count: number; tone?: "warn" | "danger" }) {
  const toneColor = tone === "danger" ? "text-[color:var(--signal-danger)]" : tone === "warn" ? "text-[color:var(--signal-warning)]" : "text-ink-5";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative px-4 py-3 text-[13px] font-medium transition-colors",
        active ? "text-ink-0" : "text-ink-5 hover:text-ink-0",
      )}
    >
      {label}
      <span className={cn("ml-2 tabular text-[11px]", count > 0 ? toneColor : "text-ink-6")}>{count}</span>
      {active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-ink-0" />}
    </button>
  );
}

function JobsTable({ rows, onRetry, onCancel, busyId, canMutate }: { rows: JobRow[]; onRetry: (id: string) => void; onCancel: (id: string) => void; busyId: string | null; canMutate: boolean }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[var(--r-lg)] border border-dashed border-[color:var(--hairline-strong)] bg-[var(--surface-0)] p-12 text-center">
        <Activity className="mx-auto h-8 w-8 text-ink-6" strokeWidth={1.25} />
        <p className="mt-3 text-[13px] text-ink-5">No hay jobs en este filtro.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] overflow-hidden">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-[color:var(--hairline)] bg-[var(--surface-1)]">
            <th className="px-3 py-2.5 text-left font-medium text-ink-5">Tipo</th>
            <th className="px-3 py-2.5 text-left font-medium text-ink-5">Estado</th>
            <th className="px-3 py-2.5 text-right font-medium text-ink-5">Intentos</th>
            <th className="px-3 py-2.5 text-right font-medium text-ink-5">Duración</th>
            <th className="px-3 py-2.5 text-left font-medium text-ink-5">Error / Próximo run</th>
            <th className="px-3 py-2.5 text-right font-medium text-ink-5">Creado</th>
            {canMutate && <th className="px-3 py-2.5 text-right font-medium text-ink-5">Acciones</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--hairline)]">
          {rows.map((j) => (
            <tr key={j.id} className="hover:bg-[var(--surface-1)] transition-colors">
              <td className="px-3 py-2.5 font-mono text-[11px] text-ink-3">{j.type}</td>
              <td className="px-3 py-2.5">
                <StatusPill status={j.status} />
              </td>
              <td className="px-3 py-2.5 text-right tabular text-ink-4">{j.attempts}/{j.maxAttempts}</td>
              <td className="px-3 py-2.5 text-right tabular text-ink-4">{j.durationMs ? `${j.durationMs}ms` : "—"}</td>
              <td className="px-3 py-2.5 text-ink-4 max-w-[280px] truncate" title={j.lastError ?? ""}>
                {j.lastError || (j.runAt && j.status === "pending" ? new Date(j.runAt).toLocaleString() : "—")}
              </td>
              <td className="px-3 py-2.5 text-right tabular text-ink-5">{new Date(j.createdAt).toLocaleString()}</td>
              {canMutate && (
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  {(j.status === "failed" || j.status === "dead" || j.status === "cancelled") && (
                    <button
                      type="button"
                      onClick={() => onRetry(j.id)}
                      disabled={busyId === j.id}
                      className="inline-flex items-center gap-1 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] px-2 py-1 text-[11px] font-medium text-ink-0 hover:bg-[var(--surface-2)] disabled:opacity-50"
                    >
                      <RefreshCcw className={cn("h-3 w-3", busyId === j.id && "animate-spin")} />
                      Reintentar
                    </button>
                  )}
                  {(j.status === "pending" || j.status === "running") && (
                    <button
                      type="button"
                      onClick={() => onCancel(j.id)}
                      disabled={busyId === j.id}
                      className="ml-1.5 inline-flex items-center gap-1 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] px-2 py-1 text-[11px] font-medium text-[color:var(--signal-danger)] hover:bg-[var(--surface-2)] disabled:opacity-50"
                    >
                      <XCircle className="h-3 w-3" />
                      Cancelar
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
    pending: { label: "Pendiente", className: "bg-[var(--surface-2)] text-ink-3", icon: Clock },
    running: { label: "En curso", className: "bg-[color:var(--accent-100)] text-[color:var(--accent-700)]", icon: Activity },
    succeeded: { label: "OK", className: "bg-[color:var(--signal-success)]/10 text-[color:var(--signal-success)]", icon: CheckCircle2 },
    failed: { label: "Fallido", className: "bg-[color:var(--signal-warning)]/10 text-[color:var(--signal-warning)]", icon: AlertTriangle },
    dead: { label: "Muerto", className: "bg-[color:var(--signal-danger)]/10 text-[color:var(--signal-danger)]", icon: XCircle },
    cancelled: { label: "Cancelado", className: "bg-[var(--surface-2)] text-ink-5", icon: XCircle },
  };
  const c = config[status] ?? { label: status, className: "bg-[var(--surface-2)] text-ink-5", icon: Activity };
  const Icon = c.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-[var(--r-xs)] px-1.5 py-0.5 text-[10px] font-medium", c.className)}>
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}
