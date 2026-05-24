"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Phone, Mail, Calendar, ShoppingCart, RotateCcw, AlertTriangle, MessageSquare, Edit2, Trash2, Plus, Activity, CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { NexoraPageHeader } from "@/components/admin/nexora";
import type { CustomerProfile } from "@/lib/customers/profile";
import type { TimelineEntry, TimelineEntryType } from "@/lib/customers/timeline";
import type { SegmentId } from "@/lib/customers/segments";
import { SEGMENT_DEFINITIONS } from "@/lib/customers/segments";
import { HEALTH_LABELS, type HealthVerdict } from "@/lib/customers/health";
import { createCustomerNote, updateCustomerNote, deleteCustomerNote, type CustomerNoteRow } from "@/lib/customers/notes-actions";

interface Props {
  profile: CustomerProfile;
  segments: SegmentId[];
  health: HealthVerdict;
  timeline: TimelineEntry[];
  notes: CustomerNoteRow[];
  capabilities: { canManageNotes: boolean };
}

export function CustomerProfileClient({ profile, segments, health, timeline, notes, capabilities }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");

  const handle = (op: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try { await op(); }
      catch (e) { setError(e instanceof Error ? e.message : "Error desconocido"); }
    });
  };

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: profile.commercial.currency || "ARS" }).format(n);
  const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const fmtFulfillment = (ms: number | null) => {
    if (ms === null) return "—";
    const days = ms / (24 * 60 * 60 * 1000);
    if (days >= 1) return `${days.toFixed(1)}d`;
    return `${(ms / (60 * 60 * 1000)).toFixed(1)}h`;
  };

  const healthMeta = HEALTH_LABELS[health.level];

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-[12px] text-ink-5 hover:text-ink-0">
        <ArrowLeft className="h-3.5 w-3.5" /> Clientes
      </Link>

      <NexoraPageHeader
        title={profile.identity.name}
        subtitle={profile.email}
      />

      {/* ── Health + Segments strip ─── */}
      <section className="flex flex-wrap items-center gap-2">
        <HealthPill verdict={health} label={healthMeta.label} tone={healthMeta.tone} />
        {segments.map((s) => {
          const def = SEGMENT_DEFINITIONS[s];
          return <SegmentPill key={s} label={def.label} color={def.color} title={def.description} />;
        })}
        {segments.length === 0 && (
          <span className="text-[11px] text-ink-5">Sin segmentos asignados aún.</span>
        )}
      </section>

      {error && (
        <div className="rounded-[var(--r-md)] border border-[color:var(--signal-danger)]/30 bg-[color:var(--signal-danger)]/5 px-3 py-2 text-[12px] text-[color:var(--signal-danger)]">
          {error}
        </div>
      )}

      {/* ── Identity row ─── */}
      <section className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4">
        <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.18em] text-ink-5">Identidad</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[12px] sm:grid-cols-3 lg:grid-cols-6">
          <Field icon={Mail} label="Email" value={profile.email} />
          <Field icon={Phone} label="Teléfono" value={profile.identity.phone || "—"} />
          <Field icon={Calendar} label="Primer pedido" value={fmtDate(profile.identity.firstOrderAt)} />
          <Field icon={Calendar} label="Último pedido" value={fmtDate(profile.identity.lastOrderAt)} />
          <Field icon={ShoppingCart} label="Origen" value={profile.identity.acquisitionChannel || "Storefront"} />
        </dl>
      </section>

      {/* ── KPIs ─── */}
      <section>
        <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.18em] text-ink-5">Métricas comerciales</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <Kpi label="LTV" value={fmtCurrency(profile.commercial.lifetimeValue)} />
          <Kpi label="Pedidos" value={String(profile.commercial.totalOrders)} />
          <Kpi label="AOV" value={fmtCurrency(profile.commercial.averageOrderValue)} />
          <Kpi label="Reembolsado" value={fmtCurrency(profile.commercial.refundedTotal)} tone={profile.commercial.refundedTotal > 0 ? "warn" : "default"} />
          <Kpi label="Cancelaciones" value={fmtPct(profile.commercial.cancellationRate)} tone={profile.commercial.cancellationRate > 0.2 ? "warn" : "default"} />
          <Kpi label="Net" value={fmtCurrency(profile.commercial.netRevenue)} />
        </div>
      </section>

      {/* ── Operational ─── */}
      <section>
        <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.18em] text-ink-5">Comportamiento operacional</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Kpi label="Tiempo entrega prom." value={fmtFulfillment(profile.operational.averageFulfillmentMs)} />
          <Kpi label="Carritos abandon." value={String(profile.operational.abandonedCarts)} />
          <Kpi label="Métodos pago" value={profile.operational.paymentMethods.length === 0 ? "—" : profile.operational.paymentMethods.join(", ")} />
          <Kpi label="Métodos envío" value={profile.operational.shippingMethods.length === 0 ? "—" : profile.operational.shippingMethods.join(", ")} />
          <Kpi label="Reseñas" value="—" hint="Telemetría no disponible" />
        </div>
      </section>

      {/* ── Two-column: Timeline + Notes ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* Timeline */}
        <section>
          <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.18em] text-ink-5">Línea de tiempo</h2>
          {timeline.length === 0 ? (
            <div className="rounded-[var(--r-lg)] border border-dashed border-[color:var(--hairline-strong)] bg-[var(--surface-0)] p-8 text-center text-[12px] text-ink-5">
              Sin actividad registrada aún.
            </div>
          ) : (
            <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] divide-y divide-[color:var(--hairline)]">
              {timeline.map((e) => <TimelineRow key={e.id} entry={e} />)}
            </div>
          )}
        </section>

        {/* Notes */}
        <section>
          <h2 className="mb-3 flex items-center justify-between text-[12px] font-medium uppercase tracking-[0.18em] text-ink-5">
            <span>Notas internas</span>
            <span className="text-ink-6 normal-case tracking-normal text-[10px]">{notes.length}</span>
          </h2>
          {capabilities.canManageNotes && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!draftBody.trim()) return;
                handle(async () => {
                  await createCustomerNote({ customerEmail: profile.email, body: draftBody });
                  setDraftBody("");
                });
              }}
              className="mb-3 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-2"
            >
              <textarea
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                rows={3}
                maxLength={4000}
                placeholder="Agregar una nota interna…"
                className="w-full resize-none bg-transparent text-[12px] text-ink-0 outline-none placeholder:text-ink-6"
              />
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[10px] text-ink-6">{draftBody.length}/4000</span>
                <button
                  type="submit"
                  disabled={isPending || !draftBody.trim()}
                  className="inline-flex items-center gap-1 rounded-full bg-ink-0 px-3 py-1 text-[11px] font-medium text-ink-12 hover:bg-ink-2 disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" /> Guardar
                </button>
              </div>
            </form>
          )}
          {notes.length === 0 ? (
            <div className="rounded-[var(--r-lg)] border border-dashed border-[color:var(--hairline-strong)] bg-[var(--surface-0)] p-6 text-center text-[12px] text-ink-5">
              <MessageSquare className="mx-auto h-5 w-5 text-ink-6" strokeWidth={1.25} />
              <p className="mt-2">Sin notas todavía.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map((n) => (
                <article key={n.id} className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-3">
                  <header className="mb-1 flex items-baseline justify-between gap-2">
                    <div className="text-[11px] text-ink-3">
                      <span className="font-medium">{n.authorName ?? n.authorEmail}</span>
                      <span className="text-ink-6"> · {n.authorRole}</span>
                    </div>
                    <time className="text-[10px] tabular text-ink-5">{new Date(n.createdAt).toLocaleString()}</time>
                  </header>
                  {editingId === n.id ? (
                    <div>
                      <textarea
                        value={editingBody}
                        onChange={(e) => setEditingBody(e.target.value)}
                        rows={3}
                        maxLength={4000}
                        className="w-full resize-none rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-paper)] p-1.5 text-[12px] outline-none"
                      />
                      <div className="mt-1.5 flex justify-end gap-1.5">
                        <button type="button" onClick={() => { setEditingId(null); setEditingBody(""); }} className="text-[11px] text-ink-5 hover:text-ink-0">Cancelar</button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handle(async () => {
                            await updateCustomerNote({ noteId: n.id, body: editingBody });
                            setEditingId(null);
                            setEditingBody("");
                          })}
                          className="rounded-[var(--r-sm)] bg-ink-0 px-2 py-0.5 text-[11px] font-medium text-ink-12 disabled:opacity-50"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-[12px] text-ink-1">{n.body}</p>
                  )}
                  {n.canMutate && editingId !== n.id && (
                    <div className="mt-1.5 flex justify-end gap-1">
                      <button type="button" onClick={() => { setEditingId(n.id); setEditingBody(n.body); }} className="inline-flex items-center gap-1 rounded-[var(--r-sm)] px-1.5 py-0.5 text-[10px] text-ink-5 hover:bg-[var(--surface-2)] hover:text-ink-0">
                        <Edit2 className="h-3 w-3" /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("¿Eliminar esta nota? Queda registrada en auditoría.")) {
                            handle(() => deleteCustomerNote(n.id));
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-[var(--r-sm)] px-1.5 py-0.5 text-[10px] text-[color:var(--signal-danger)] hover:bg-[var(--surface-2)]"
                      >
                        <Trash2 className="h-3 w-3" /> Borrar
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Subcomponents ───

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

function Field({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-ink-5">
        <Icon className="h-3 w-3" /> {label}
      </dt>
      <dd className="mt-0.5 text-[12px] text-ink-1 truncate" title={value}>{value}</dd>
    </div>
  );
}

function Kpi({ label, value, tone, hint }: { label: string; value: string; tone?: "warn" | "danger" | "default"; hint?: string }) {
  const cls = tone === "warn" ? "text-[color:var(--signal-warning)]" :
              tone === "danger" ? "text-[color:var(--signal-danger)]" :
              "text-ink-0";
  return (
    <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-5">{label}</p>
      <p className={cn("mt-1.5 text-[16px] font-semibold tabular tracking-[-0.02em] truncate", cls)} title={value}>{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-ink-6">{hint}</p>}
    </div>
  );
}

function HealthPill({ verdict, label, tone }: { verdict: HealthVerdict; label: string; tone: "ok" | "neutral" | "warn" | "danger" }) {
  const toneCls =
    tone === "ok" ? "bg-[color:var(--signal-success)]/10 text-[color:var(--signal-success)] border-[color:var(--signal-success)]/30" :
    tone === "warn" ? "bg-[color:var(--signal-warning)]/10 text-[color:var(--signal-warning)] border-[color:var(--signal-warning)]/30" :
    tone === "danger" ? "bg-[color:var(--signal-danger)]/10 text-[color:var(--signal-danger)] border-[color:var(--signal-danger)]/30" :
    "bg-[var(--surface-2)] text-ink-3 border-[color:var(--hairline)]";
  return (
    <span title={verdict.rationale} className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", toneCls)}>
      <Activity className="h-3 w-3" /> {label}
    </span>
  );
}

function SegmentPill({ label, color, title }: { label: string; color: "violet" | "blue" | "amber" | "rose" | "slate" | "emerald" | "indigo"; title: string }) {
  const map: Record<typeof color, string> = {
    violet: "bg-violet-50 text-violet-700 border-violet-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <span title={title} className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", map[color])}>
      {label}
    </span>
  );
}

function TimelineRow({ entry }: { entry: TimelineEntry }) {
  const Icon = iconForType(entry.type);
  const colorCls = colorForType(entry.type);
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 hover:bg-[var(--surface-1)]">
      <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", colorCls)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[12px] text-ink-0">{entry.title}</p>
          <time className="shrink-0 text-[10px] tabular text-ink-5">{new Date(entry.occurredAt).toLocaleString()}</time>
        </div>
        {entry.description && <p className="mt-0.5 text-[11px] text-ink-5 truncate">{entry.description}</p>}
        {entry.href && (
          <Link href={entry.href} className="mt-0.5 inline-block text-[10px] text-ink-5 underline-offset-2 hover:text-ink-0 hover:underline">
            Abrir →
          </Link>
        )}
      </div>
    </div>
  );
}

function iconForType(t: TimelineEntryType): React.ComponentType<{ className?: string }> {
  switch (t) {
    case "order_placed": return ShoppingCart;
    case "order_delivered": return CheckCircle2;
    case "order_cancelled": return XCircle;
    case "order_refunded": return RotateCcw;
    case "email_sent": return Mail;
    case "email_failed": return AlertTriangle;
    case "cart_abandoned": return Clock;
    case "note_added": return MessageSquare;
    case "task_created":
    case "task_completed":
    case "system_event":
    default: return Activity;
  }
}

function colorForType(t: TimelineEntryType): string {
  switch (t) {
    case "order_placed":
    case "order_delivered":
    case "task_completed":
      return "text-[color:var(--signal-success)]";
    case "order_cancelled":
    case "email_failed":
      return "text-[color:var(--signal-danger)]";
    case "order_refunded":
    case "cart_abandoned":
      return "text-[color:var(--signal-warning)]";
    default:
      return "text-ink-5";
  }
}
