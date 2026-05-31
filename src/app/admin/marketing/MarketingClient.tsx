"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, XCircle, AlertCircle, Users, Mail, Lock, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { NexoraPageHeader } from "@/components/admin/nexora";
import { SEGMENT_DEFINITIONS, type SegmentId } from "@/lib/customers/segments";
import type { MarketingReadiness } from "@/lib/marketing/eligibility";
import type { MarketingTemplate } from "@/lib/marketing/templates";
import type { AudienceFilter, AudiencePreview } from "@/lib/marketing/audiences";
import { previewAudienceAction } from "@/lib/marketing/queries";

interface Props {
  readiness: MarketingReadiness;
  templates: MarketingTemplate[];
  canManage: boolean;
}

const SEGMENT_OPTIONS: SegmentId[] = ["vip", "high_value", "at_risk", "repeat_buyer", "one_time_buyer", "recently_active", "churned", "high_refund_risk", "wholesale_candidate"];

export function MarketingClient({ readiness, templates, canManage }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AudiencePreview | null>(null);

  const [filter, setFilter] = useState<AudienceFilter>({ segments: [] });
  const [minSpent, setMinSpent] = useState("");
  const [minOrders, setMinOrders] = useState("");
  const [inactiveDays, setInactiveDays] = useState("");

  const toggleSegment = (s: SegmentId) => {
    setFilter((f) => {
      const cur = f.segments ?? [];
      return { ...f, segments: cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s] };
    });
  };

  const runPreview = () => {
    setError(null);
    const built: AudienceFilter = {
      segments: filter.segments,
      minSpent: minSpent ? Number(minSpent) : undefined,
      minOrders: minOrders ? Number(minOrders) : undefined,
      inactiveDays: inactiveDays ? Number(inactiveDays) : undefined,
    };
    startTransition(async () => {
      try { setPreview(await previewAudienceAction(built)); }
      catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    });
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      <NexoraPageHeader
        title="Marketing"
        subtitle="Construí audiencias reales y revisá qué falta para habilitar campañas. Sin botones falsos."
      />

      {/* ── Honest disabled-send banner ─── */}
      {!readiness.canSend && (
        <div className="rounded-[var(--r-lg)] border border-[color:var(--signal-warning)]/30 bg-[color:var(--signal-warning)]/5 p-4">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--signal-warning)]" />
            <div>
              <p className="text-[13px] font-semibold text-ink-0">Envío de campañas no habilitado todavía</p>
              <p className="mt-1 text-[12px] text-ink-3">{readiness.disabledReason}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Readiness card ─── */}
      <section>
        <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.18em] text-ink-5">Estado de preparación</h2>
        <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] divide-y divide-[color:var(--hairline)]">
          {readiness.checks.map((c) => (
            <div key={c.id} className="flex items-start gap-3 px-4 py-3">
              {c.status === "ok" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--signal-success)]" />}
              {c.status === "missing" && <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--signal-danger)]" />}
              {c.status === "unknown" && <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-ink-5" />}
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink-0">{c.label}</p>
                <p className="mt-0.5 text-[11px] text-ink-5">{c.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* ── Audience Builder ─── */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.18em] text-ink-5">
            <Filter className="h-3.5 w-3.5" /> Constructor de audiencia
          </h2>
          <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4 space-y-4">
            <div>
              <p className="mb-2 text-[11px] font-medium text-ink-3">Segmentos (OR)</p>
              <div className="flex flex-wrap gap-2">
                {SEGMENT_OPTIONS.map((s) => {
                  const def = SEGMENT_DEFINITIONS[s];
                  const active = filter.segments?.includes(s);
                  return (
                    <button key={s} type="button" onClick={() => toggleSegment(s)} title={def.description}
                      className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                        active ? "border-ink-0 bg-ink-0 text-ink-12" : "border-[color:var(--hairline-strong)] bg-[var(--surface-paper)] text-ink-3 hover:text-ink-0")}>
                      {def.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Gastó más de ($)">
                <input type="number" min="0" value={minSpent} onChange={(e) => setMinSpent(e.target.value)} className="w-full rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-paper)] px-2 py-1 text-[12px] outline-none focus-visible:shadow-[var(--shadow-focus)]" />
              </Field>
              <Field label="Pedidos mínimos">
                <input type="number" min="0" value={minOrders} onChange={(e) => setMinOrders(e.target.value)} className="w-full rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-paper)] px-2 py-1 text-[12px] outline-none focus-visible:shadow-[var(--shadow-focus)]" />
              </Field>
              <Field label="Inactivo (días)">
                <input type="number" min="0" value={inactiveDays} onChange={(e) => setInactiveDays(e.target.value)} className="w-full rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-paper)] px-2 py-1 text-[12px] outline-none focus-visible:shadow-[var(--shadow-focus)]" />
              </Field>
            </div>

            <button type="button" onClick={runPreview} disabled={isPending} className="inline-flex items-center gap-2 rounded-full bg-ink-0 px-4 py-2 text-[12px] font-medium text-ink-12 disabled:opacity-50">
              <Users className="h-3.5 w-3.5" /> {isPending ? "Calculando…" : "Previsualizar audiencia"}
            </button>

            {error && <p className="text-[12px] text-[color:var(--signal-danger)]">{error}</p>}
          </div>

          {/* ── Audience Preview ─── */}
          {preview && (
            <div className="mt-4 rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-[24px] font-semibold tabular tracking-[-0.02em] text-ink-0">{preview.count.toLocaleString()}</p>
                <p className="text-[11px] text-ink-5">destinatarios estimados{preview.truncated && " (muestra acotada a 10k)"}</p>
              </div>

              {preview.segmentBreakdown.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-[11px] font-medium text-ink-3">Composición por segmento</p>
                  <div className="space-y-1">
                    {preview.segmentBreakdown.map((b) => (
                      <div key={b.segment} className="flex items-center gap-2 text-[11px]">
                        <span className="w-40 shrink-0 truncate text-ink-3">{SEGMENT_DEFINITIONS[b.segment]?.label ?? b.segment}</span>
                        <div className="h-2 flex-1 rounded-full bg-[var(--surface-2)]">
                          <div className="h-full rounded-full bg-ink-0" style={{ width: `${preview.count > 0 ? (b.count / preview.count) * 100 : 0}%` }} />
                        </div>
                        <span className="w-10 shrink-0 text-right tabular text-ink-5">{b.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preview.sample.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-[11px] font-medium text-ink-3">Muestra ({preview.sample.length})</p>
                  <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] divide-y divide-[color:var(--hairline)]">
                    {preview.sample.map((m) => (
                      <div key={m.email} className="flex items-center justify-between px-3 py-1.5 text-[11px]">
                        <span className="truncate text-ink-2">{m.name} · {m.email}</span>
                        <span className="shrink-0 tabular text-ink-5">${m.lifetimeValue.toFixed(0)} · {m.totalOrders}p</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="mt-3 text-[11px] text-ink-6">
                {canManage
                  ? "Para enviar a esta audiencia falta el motor de campañas (ver estado arriba). No hay botón de envío porque no sería real."
                  : "Solo lectura. El envío de campañas no está habilitado."}
              </p>
            </div>
          )}
        </section>

        {/* ── Template Registry ─── */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.18em] text-ink-5">
            <Mail className="h-3.5 w-3.5" /> Plantillas
          </h2>
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium text-ink-0">{t.name}</p>
                  <span className={cn("rounded-[var(--r-xs)] px-1.5 py-0.5 text-[10px] font-medium",
                    t.status === "renderable" ? "bg-[color:var(--signal-success)]/10 text-[color:var(--signal-success)]" : "bg-[var(--surface-2)] text-ink-5")}>
                    {t.status === "renderable" ? "Lista" : "Borrador"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-ink-3">{t.description}</p>
                <p className="mt-1.5 text-[10px] text-ink-6">{t.note}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-ink-3">{label}</span>
      {children}
    </label>
  );
}
