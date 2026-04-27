"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  Minus,
  TrendingDown,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { fmtNumber } from "@/lib/stats/format";
import { DateRangePicker, type DateRangeValue } from "@/components/admin/stats/DateRangePicker";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import type {
  ConversionSnapshot,
  ConversionStage,
} from "@/lib/conversion/snapshot";

// ─── Conversion Page ────────────────────────────────────────────────────
//
// Analytical surface inside Estadísticas. Visualises the cart → paid
// funnel with the real signals we capture today; everything else is
// declared honestly in the "qué falta medir" footer instead of being
// fabricated. There is no readiness checklist here — that lives in
// other parts of the admin and didn't belong inside Estadísticas.

interface ConversionPageProps {
  snapshot: ConversionSnapshot;
}

function fmtRate(rate: number | null): string {
  if (rate === null) return "—";
  const pct = rate * 100;
  if (pct >= 10) return `${pct.toFixed(0)}%`;
  if (pct >= 1) return `${pct.toFixed(1)}%`;
  return `${pct.toFixed(2)}%`;
}

function formatPercentDelta(delta: number): string {
  const pts = delta * 100;
  const sign = pts >= 0 ? "+" : "";
  if (Math.abs(pts) >= 10) return `${sign}${pts.toFixed(0)} pts`;
  return `${sign}${pts.toFixed(1)} pts`;
}

export function ConversionPage({ snapshot }: ConversionPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const range: DateRangeValue = { from: snapshot.range.from, to: snapshot.range.to };

  const handleRangeChange = useCallback(
    (next: DateRangeValue) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("from", next.from);
      params.set("to", next.to);
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const overallRate = snapshot.overallRate;
  const prevOverallRate = snapshot.prevOverallRate;
  const overallDelta =
    overallRate !== null && prevOverallRate !== null ? overallRate - prevOverallRate : null;

  const headValue = snapshot.stages[0]?.value ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-7"
    >
      <AdminPageHeader
        eyebrow={isPending ? "Conversión · actualizando" : "Conversión"}
        title="Conversión"
        subtitle="Carrito → checkout → pago confirmado. Embudo construido sobre las señales reales del storefront."
        actions={<DateRangePicker value={range} onChange={handleRangeChange} />}
      />

      {/* ── Headline strip ───────────────────────────────────────────── */}
      <section className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 shadow-[var(--shadow-elevated)] lg:p-8">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-6">
              Conversión global
            </p>
            <p className="mt-1 tabular-nums text-[44px] font-semibold leading-[1] tracking-[-0.035em] text-ink-0 sm:text-[56px]">
              {fmtRate(overallRate)}
            </p>
            <p className="mt-1.5 max-w-md text-[12px] leading-[1.5] text-ink-5">
              {overallRate === null
                ? "Todavía no hay carritos con ítems en este rango. Cuando empiecen a entrar visitas con intención de compra el embudo se llena solo."
                : `${fmtNumber(snapshot.stages[3].value)} pagos confirmados sobre ${fmtNumber(headValue)} carritos con ítems.`}
            </p>
          </div>

          {overallDelta !== null && (
            <div className="flex items-center gap-2 pb-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold tabular-nums",
                  overallDelta > 0.001
                    ? "bg-[color:var(--signal-success)]/10 text-[color:var(--signal-success)]"
                    : overallDelta < -0.001
                      ? "bg-[color:var(--signal-danger)]/10 text-[color:var(--signal-danger)]"
                      : "bg-[var(--surface-2)] text-ink-5",
                )}
              >
                {overallDelta > 0.001 ? (
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
                ) : overallDelta < -0.001 ? (
                  <ArrowDownRight className="h-3.5 w-3.5" strokeWidth={2} />
                ) : (
                  <Minus className="h-3.5 w-3.5" strokeWidth={2} />
                )}
                <span>{formatPercentDelta(overallDelta)}</span>
              </span>
              <span className="text-[11px] text-ink-6">vs periodo anterior</span>
            </div>
          )}
        </div>

        {/* Funnel bars */}
        <div className="mt-7">
          <FunnelBars stages={snapshot.stages} />
        </div>
      </section>

      {/* ── Friction + payment failures ──────────────────────────────── */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 shadow-[var(--shadow-card)] lg:col-span-3">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
            Mayor fricción del embudo
          </h3>
          {snapshot.primaryFriction ? (
            <div className="mt-4 space-y-3">
              <p className="text-[18px] font-medium tracking-[-0.01em] text-ink-0">
                {snapshot.primaryFriction.label}
              </p>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--signal-danger)]/10 px-3 py-1 text-[12px] font-semibold tabular-nums text-[color:var(--signal-danger)]">
                  <TrendingDown className="h-3.5 w-3.5" strokeWidth={2} />
                  −{fmtNumber(snapshot.primaryFriction.drop)} ({fmtRate(snapshot.primaryFriction.ratio)})
                </span>
                <span className="text-[12px] text-ink-5">
                  no avanzaron a la siguiente etapa.
                </span>
              </div>
              <p className="text-[12px] leading-[1.55] text-ink-5">
                Es la transición donde más usuarios se caen. Revisar costos de envío,
                obligatoriedad de campos del checkout, métodos de pago disponibles y
                tiempos de respuesta del procesador.
              </p>
              <div className="pt-2">
                <Link
                  href="/admin/recovery"
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--accent-700)] hover:underline"
                >
                  Ir a Recuperación →
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-[var(--r-md)] border border-dashed border-[color:var(--hairline)] bg-[var(--surface-1)] p-5 text-[12px] leading-[1.55] text-ink-5">
              Sin caídas significativas en el embudo para este rango. Cuando aparezcan
              carritos con ítems el sistema marcará el paso con más fricción.
            </div>
          )}
        </div>

        <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 shadow-[var(--shadow-card)] lg:col-span-2">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
            Pagos no aprobados
          </h3>
          {snapshot.paymentFailures.length > 0 ? (
            <ul className="mt-4 divide-y divide-[color:var(--hairline)]">
              {snapshot.paymentFailures.map((row) => (
                <li
                  key={row.status}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="text-[13px] font-medium text-ink-0">{row.label}</span>
                  <span className="tabular-nums text-[13px] font-semibold text-ink-0">
                    {fmtNumber(row.count)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-[12px] leading-[1.55] text-ink-5">
              No se registraron pedidos con pago caído, rechazado o pendiente en este rango.
            </p>
          )}
          {snapshot.paymentFailures.length > 0 && (
            <div className="mt-4 border-t border-[color:var(--hairline)] pt-3">
              <Link
                href="/admin/recovery"
                className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--accent-700)] hover:underline"
              >
                Recuperar pagos →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Data limitations footer ───────────────────────────────────── */}
      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-ink-5" strokeWidth={1.75} />
          <div className="space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
              Qué todavía no medimos
            </p>
            <ul className="space-y-2">
              {snapshot.dataLimitations.map((limit) => (
                <li key={limit.title} className="text-[12px] leading-[1.55] text-ink-5">
                  <span className="font-medium text-ink-0">{limit.title}.</span>{" "}
                  {limit.description}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Funnel visualisation
// ═══════════════════════════════════════════════════════════════════════════

function FunnelBars({ stages }: { stages: readonly ConversionStage[] }) {
  const head = stages[0]?.value ?? 0;

  return (
    <ol className="space-y-3.5">
      {stages.map((stage, idx) => {
        const widthPct = head > 0 ? Math.max(2, (stage.value / head) * 100) : 0;
        const dropFromPrev = stage.dropFromPrev ?? 0;
        const showDrop = idx > 0 && dropFromPrev > 0;
        return (
          <li key={stage.id}>
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] tabular-nums font-medium uppercase tracking-[0.14em] text-ink-6">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="text-[13px] font-medium text-ink-0">{stage.label}</span>
                {stage.rateFromPrev !== null && (
                  <span className="text-[11px] tabular-nums text-ink-5">
                    · {fmtRate(stage.rateFromPrev)} de la etapa previa
                  </span>
                )}
              </div>
              <span className="tabular-nums text-[14px] font-semibold text-ink-0">
                {fmtNumber(stage.value)}
              </span>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${widthPct}%` }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: idx * 0.05 }}
                className={cn(
                  "h-full rounded-full",
                  idx === stages.length - 1
                    ? "bg-[var(--accent-600)]"
                    : "bg-[var(--accent-500)]",
                )}
              />
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[11px] leading-[1.4] text-ink-5">
              <span>{stage.description}</span>
              {showDrop && (
                <span className="inline-flex items-center gap-1 text-[color:var(--signal-danger)]">
                  <TrendingDown className="h-3 w-3" strokeWidth={2} />
                  −{fmtNumber(dropFromPrev)}
                </span>
              )}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
