"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, RotateCcw, Clock, AlertTriangle, User, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { NexoraPageHeader } from "@/components/admin/nexora";
import type { TaskBuckets, TaskRow } from "@/lib/customers/tasks";
import { completeCustomerTask, cancelCustomerTask, reopenCustomerTask } from "@/lib/customers/tasks-actions";

interface Props {
  buckets: TaskBuckets;
  scope: "mine" | "all";
  currentUserId: string;
  canManage: boolean;
}

const PRIORITY_TONE: Record<string, string> = {
  urgent: "bg-[color:var(--signal-danger)]/10 text-[color:var(--signal-danger)]",
  high: "bg-[color:var(--signal-warning)]/10 text-[color:var(--signal-warning)]",
  medium: "bg-blue-50 text-blue-700",
  normal: "bg-[var(--surface-2)] text-ink-3",
  low: "bg-slate-100 text-slate-600",
};

export function TasksHubClient({ buckets, scope, currentUserId, canManage }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const handle = (id: string, op: () => Promise<unknown>) => {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      try { await op(); }
      catch (e) { setError(e instanceof Error ? e.message : "Error"); }
      finally { setBusyId(null); }
    });
  };

  const totalOpen = buckets.counts.overdue + buckets.counts.dueToday + buckets.counts.upcoming + buckets.counts.unscheduled;

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      <div className="flex items-start justify-between">
        <NexoraPageHeader
          title="Tareas de clientes"
          subtitle={`${totalOpen} ${totalOpen === 1 ? "tarea abierta" : "tareas abiertas"}. Cada acción queda en la línea de tiempo.`}
        />
        <div className="flex gap-1 rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] p-0.5">
          <ScopeBtn active={scope === "all"} onClick={() => router.push("/admin/customers/tasks")}>Todas</ScopeBtn>
          <ScopeBtn active={scope === "mine"} onClick={() => router.push("/admin/customers/tasks?scope=mine")}>Mías</ScopeBtn>
        </div>
      </div>

      {error && (
        <div className="rounded-[var(--r-md)] border border-[color:var(--signal-danger)]/30 bg-[color:var(--signal-danger)]/5 px-3 py-2 text-[12px] text-[color:var(--signal-danger)]">
          {error}
        </div>
      )}

      {/* ── Counters ─── */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Counter label="Vencidas" value={buckets.counts.overdue} tone={buckets.counts.overdue > 0 ? "danger" : "default"} />
        <Counter label="Hoy" value={buckets.counts.dueToday} tone={buckets.counts.dueToday > 0 ? "warn" : "default"} />
        <Counter label="Próximas" value={buckets.counts.upcoming} />
        <Counter label="Sin fecha" value={buckets.counts.unscheduled} />
        <Counter label="Completadas" value={buckets.counts.completed} tone="success" />
        <Counter label="Canceladas" value={buckets.counts.cancelled} />
      </section>

      <Bucket title="Vencidas" rows={buckets.overdue} icon={AlertTriangle} tone="danger" busyId={busyId} canManage={canManage} currentUserId={currentUserId} onComplete={(id) => handle(id, () => completeCustomerTask(id))} onCancel={(id) => handle(id, () => cancelCustomerTask(id))} onReopen={(id) => handle(id, () => reopenCustomerTask(id))} />
      <Bucket title="Para hoy" rows={buckets.dueToday} icon={Clock} tone="warn" busyId={busyId} canManage={canManage} currentUserId={currentUserId} onComplete={(id) => handle(id, () => completeCustomerTask(id))} onCancel={(id) => handle(id, () => cancelCustomerTask(id))} onReopen={(id) => handle(id, () => reopenCustomerTask(id))} />
      <Bucket title="Próximas" rows={buckets.upcoming} icon={Clock} tone="default" busyId={busyId} canManage={canManage} currentUserId={currentUserId} onComplete={(id) => handle(id, () => completeCustomerTask(id))} onCancel={(id) => handle(id, () => cancelCustomerTask(id))} onReopen={(id) => handle(id, () => reopenCustomerTask(id))} />
      <Bucket title="Sin fecha" rows={buckets.unscheduled} icon={Clock} tone="default" busyId={busyId} canManage={canManage} currentUserId={currentUserId} onComplete={(id) => handle(id, () => completeCustomerTask(id))} onCancel={(id) => handle(id, () => cancelCustomerTask(id))} onReopen={(id) => handle(id, () => reopenCustomerTask(id))} />
      <Bucket title="Completadas (recientes)" rows={buckets.completed} icon={CheckCircle2} tone="success" busyId={busyId} canManage={canManage} currentUserId={currentUserId} onComplete={(id) => handle(id, () => completeCustomerTask(id))} onCancel={(id) => handle(id, () => cancelCustomerTask(id))} onReopen={(id) => handle(id, () => reopenCustomerTask(id))} />
      {buckets.cancelled.length > 0 && (
        <Bucket title="Canceladas" rows={buckets.cancelled} icon={XCircle} tone="default" busyId={busyId} canManage={canManage} currentUserId={currentUserId} onComplete={(id) => handle(id, () => completeCustomerTask(id))} onCancel={(id) => handle(id, () => cancelCustomerTask(id))} onReopen={(id) => handle(id, () => reopenCustomerTask(id))} />
      )}
    </div>
  );
}

function ScopeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn("rounded-full px-3 py-1 text-[12px] font-medium", active ? "bg-ink-0 text-ink-12" : "text-ink-3 hover:text-ink-0")}>
      {children}
    </button>
  );
}

function Counter({ label, value, tone }: { label: string; value: number; tone?: "danger" | "warn" | "success" | "default" }) {
  const cls = tone === "danger" ? "text-[color:var(--signal-danger)]" :
              tone === "warn" ? "text-[color:var(--signal-warning)]" :
              tone === "success" ? "text-[color:var(--signal-success)]" :
              "text-ink-0";
  return (
    <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-5">{label}</p>
      <p className={cn("mt-1.5 text-[18px] font-semibold tabular tracking-[-0.02em]", cls)}>{value}</p>
    </div>
  );
}

interface BucketProps {
  title: string;
  rows: TaskRow[];
  icon: React.ComponentType<{ className?: string }>;
  tone: "danger" | "warn" | "success" | "default";
  busyId: string | null;
  canManage: boolean;
  currentUserId: string;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  onReopen: (id: string) => void;
}

function Bucket({ title, rows, icon: Icon, tone, busyId, canManage, currentUserId, onComplete, onCancel, onReopen }: BucketProps) {
  if (rows.length === 0) return null;
  const iconCls = tone === "danger" ? "text-[color:var(--signal-danger)]" :
                  tone === "warn" ? "text-[color:var(--signal-warning)]" :
                  tone === "success" ? "text-[color:var(--signal-success)]" :
                  "text-ink-5";
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.18em] text-ink-5">
        <Icon className={cn("h-3.5 w-3.5", iconCls)} /> {title}
        <span className="ml-1 text-ink-6 normal-case tracking-normal text-[11px]">{rows.length}</span>
      </h2>
      <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] divide-y divide-[color:var(--hairline)]">
        {rows.map((t) => (
          <article key={t.id} className="flex items-start gap-3 px-3 py-2.5 hover:bg-[var(--surface-1)]">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className={cn("inline-flex shrink-0 items-center rounded-[var(--r-xs)] px-1.5 py-0.5 text-[10px] font-medium", PRIORITY_TONE[t.priority] ?? PRIORITY_TONE.normal)}>
                  {t.priority}
                </span>
                <p className="truncate text-[13px] font-medium text-ink-0">{t.title}</p>
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-[11px] text-ink-5">
                <Link href={`/admin/customers/${encodeURIComponent(t.customerEmail)}`} className="truncate hover:text-ink-0">
                  {t.customerEmail}
                </Link>
                {t.dueAt && (
                  <span className="tabular">
                    <Clock className="inline h-3 w-3 mr-0.5" />
                    {new Date(t.dueAt).toLocaleDateString()}
                  </span>
                )}
                {t.assignedToId && (
                  <span className="truncate">
                    <User className="inline h-3 w-3 mr-0.5" />
                    {t.assignedToName ?? t.assignedToEmail ?? "—"}
                    {t.assignedToId === currentUserId && <span className="ml-1 text-ink-6">(vos)</span>}
                  </span>
                )}
              </div>
              {t.description && <p className="mt-1 truncate text-[11px] text-ink-3">{t.description}</p>}
            </div>
            {canManage && (
              <div className="shrink-0 flex items-center gap-1">
                {t.status === "open" && (
                  <>
                    <button type="button" onClick={() => onComplete(t.id)} disabled={busyId === t.id} className="inline-flex items-center gap-1 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] px-2 py-1 text-[11px] font-medium text-ink-0 hover:bg-[var(--surface-2)] disabled:opacity-50">
                      <CheckCircle2 className="h-3 w-3" /> Completar
                    </button>
                    <button type="button" onClick={() => onCancel(t.id)} disabled={busyId === t.id} className="inline-flex items-center gap-1 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] px-2 py-1 text-[11px] font-medium text-ink-5 hover:bg-[var(--surface-2)] disabled:opacity-50">
                      <XCircle className="h-3 w-3" /> Cancelar
                    </button>
                  </>
                )}
                {(t.status === "completed" || t.status === "cancelled") && (
                  <button type="button" onClick={() => onReopen(t.id)} disabled={busyId === t.id} className="inline-flex items-center gap-1 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] px-2 py-1 text-[11px] font-medium text-ink-0 hover:bg-[var(--surface-2)] disabled:opacity-50">
                    <RotateCcw className="h-3 w-3" /> Reabrir
                  </button>
                )}
                <Link href={`/admin/customers/${encodeURIComponent(t.customerEmail)}`} className="rounded-[var(--r-sm)] p-1 text-ink-5 hover:bg-[var(--surface-2)] hover:text-ink-0">
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
