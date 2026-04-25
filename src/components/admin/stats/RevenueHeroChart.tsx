"use client";

import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { fmtCurrency, fmtPercent } from "@/lib/stats/format";
import type { DailyRevenuePoint, PrevDailyRevenuePoint } from "@/lib/stats/types";
import { cn } from "@/lib/utils";

// ─── RevenueHeroChart ───────────────────────────────────────────────────
//
// Protagonist visualisation of the Rendimiento surface. Designed to feel
// editorial rather than dashboard-y: oversized headline number, a single
// fluid current-period area with a dashed previous-period overlay, and
// a thin baseline reference. No grid clutter, no legend chrome — colour
// + dashing carry the meaning.
//
// EMPTY STATE POLICY (no sales in the window):
//   1. The headline number stays honest at $0 (KPI-driven).
//   2. The chart renders a quiet "ghost curve" — an unlabelled,
//      adimensional ease-out shape that suggests latent activity without
//      pretending to be revenue. It uses a synthetic dataKey (`ghost`)
//      that is normalised to [0, 1] and never formatted as currency, so
//      the surface cannot be misread as data.
//   3. There is no overlay text inside the chart, no tooltip, no Y
//      ticks, no grid, no legend. The visual carries the state alone.
// We never collapse the canvas into a placeholder card — that would
// defeat the whole "premium analytical surface" feel.

interface RevenueHeroChartProps {
  current: DailyRevenuePoint[];
  previous: PrevDailyRevenuePoint[];
  totalRevenue: number;
  prevTotalRevenue: number;
  changePercent: number | null;
}

interface ChartPoint {
  index: number;
  label: string;
  date: string;
  current: number;
  previous: number | null;
  orders: number;
  /** Synthetic adimensional value used only by the empty-state ghost
   *  curve. Always undefined for real-data points so it can never be
   *  read as currency by the chart pipeline. */
  ghost?: number;
}

export function RevenueHeroChart({
  current,
  previous,
  totalRevenue,
  prevTotalRevenue,
  changePercent,
}: RevenueHeroChartProps) {
  const [hover, setHover] = useState<ChartPoint | null>(null);

  const realData = useMemo<ChartPoint[]>(() => {
    return current.map((row, i) => ({
      index: i,
      label: row.label,
      date: row.date,
      current: row.revenue,
      previous: previous[i] ? previous[i].revenue : null,
      orders: row.orders,
    }));
  }, [current, previous]);

  const peakRevenue = useMemo(
    () => realData.reduce((m, d) => (d.current > m ? d.current : m), 0),
    [realData],
  );
  const meanRevenue = useMemo(() => {
    if (realData.length === 0) return 0;
    const sum = realData.reduce((acc, d) => acc + d.current, 0);
    return sum / realData.length;
  }, [realData]);

  // Detect the neutral / no-sales state. Treat as empty when there are
  // no buckets at all OR every bucket reports zero revenue.
  const isEmpty = realData.length === 0 || realData.every((d) => d.current === 0);

  // Synthetic ghost curve — only used when the chart has no real data.
  // Adimensional values normalised to [0, 1] so the canvas feels alive
  // and signals "latent capacity / waiting for activity" without ever
  // being read as currency. Length matches the requested window or
  // falls back to 30 buckets if there are no buckets at all. Each
  // point is shaped as a full `ChartPoint` (with current=0, previous=null)
  // so the recharts pipeline keeps a stable data type — the only field
  // actually rendered is `ghost`.
  const ghostData = useMemo<ChartPoint[]>(() => {
    if (!isEmpty) return [];
    const n = realData.length > 0 ? realData.length : 30;
    const points: ChartPoint[] = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 1 : i / (n - 1);
      // Ease-out cubic with a touch of head-room — keeps the curve
      // visibly arching towards the upper portion of the canvas.
      const eased = 1 - Math.pow(1 - t, 3);
      const y = 0.08 + 0.78 * eased;
      points.push({
        index: i,
        label: realData[i]?.label ?? "",
        date: realData[i]?.date ?? "",
        current: 0,
        previous: null,
        orders: 0,
        ghost: y,
      });
    }
    return points;
  }, [isEmpty, realData]);

  const data: ChartPoint[] = isEmpty ? ghostData : realData;

  const xTickInterval = useMemo(() => {
    if (data.length <= 14) return 0;
    if (data.length <= 45) return Math.max(0, Math.floor(data.length / 7));
    return Math.max(0, Math.floor(data.length / 6));
  }, [data.length]);

  const isUp = !isEmpty && (changePercent ?? 0) > 0;
  const isDown = !isEmpty && (changePercent ?? 0) < 0;

  const headlineValue = hover ? hover.current : totalRevenue;
  const headlineSubtitle = hover
    ? `${hover.label} · ${hover.orders} ${hover.orders === 1 ? "pedido" : "pedidos"}`
    : isEmpty
      ? "Listo para medir actividad en este periodo."
      : prevTotalRevenue > 0
        ? `vs ${fmtCurrency(prevTotalRevenue)} en el periodo anterior`
        : "Periodo anterior sin movimiento.";

  // Y axis: real data auto-scales; ghost canvas pinned to [0, 1] but the
  // ticks are hidden so the values cannot be misread.
  const yDomain: [number | string, number | string] = isEmpty ? [0, 1] : [0, "auto"];

  return (
    <div className="space-y-5">
      {/* Headline strip — oversized, editorial. */}
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-6">
            Ingresos del periodo
          </p>
          <p className="mt-1 tabular-nums text-[44px] font-semibold leading-[1] tracking-[-0.035em] text-ink-0 sm:text-[56px]">
            {fmtCurrency(headlineValue)}
          </p>
          <p className="mt-1.5 text-[12px] leading-[1.4] text-ink-5">{headlineSubtitle}</p>
        </div>
        {!isEmpty && changePercent !== null && (
          <div className="flex items-center gap-2 pb-1">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-[var(--r-md)] px-2.5 py-1 text-[12px] font-semibold tabular-nums",
                isUp
                  ? "bg-[color:var(--signal-success)]/10 text-[color:var(--signal-success)]"
                  : isDown
                    ? "bg-[color:var(--signal-danger)]/10 text-[color:var(--signal-danger)]"
                    : "bg-[var(--surface-2)] text-ink-5",
              )}
            >
              <span>{fmtPercent(changePercent)}</span>
            </span>
            <span className="text-[11px] text-ink-6">vs periodo anterior</span>
          </div>
        )}
      </div>

      {/* Chart canvas — oversized so it owns the surface. */}
      <div className="relative -mx-1 h-[360px] sm:h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 12, right: 14, bottom: 6, left: 0 }}
            onMouseMove={(state) => {
              if (isEmpty) return;
              // recharts v3 narrows the public type but still emits the
              // active payload at runtime — read it through a structural
              // cast instead of `any`.
              const payload = (state as unknown as {
                activePayload?: { payload: ChartPoint }[];
              })?.activePayload;
              if (payload && payload[0]) setHover(payload[0].payload);
            }}
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              <linearGradient id="heroAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.22} />
                <stop offset="55%" stopColor="#6366f1" stopOpacity={0.06} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="heroGhostGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.10} />
                <stop offset="60%" stopColor="#94a3b8" stopOpacity={0.03} />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
              </linearGradient>
            </defs>

            {!isEmpty && (
              <CartesianGrid
                vertical={false}
                stroke="#e2e8f0"
                strokeDasharray="0"
                strokeOpacity={0.4}
              />
            )}

            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: isEmpty ? "#e2e8f0" : "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              interval={xTickInterval}
              minTickGap={isEmpty ? 32 : 16}
              padding={{ left: 4, right: 4 }}
            />
            <YAxis
              hide={isEmpty}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              width={48}
              domain={yDomain}
              tickFormatter={(v: number) => {
                if (isEmpty) return "";
                return v >= 1_000_000
                  ? `${(v / 1_000_000).toFixed(1).replace(".0", "")}M`
                  : v >= 1000
                    ? `${Math.round(v / 1000)}k`
                    : String(v);
              }}
            />

            {!isEmpty && meanRevenue > 0 && (
              <ReferenceLine
                y={meanRevenue}
                stroke="#cbd5e1"
                strokeDasharray="3 4"
                strokeWidth={1}
                ifOverflow="hidden"
                label={{
                  value: `Promedio ${fmtCurrency(Math.round(meanRevenue))}`,
                  position: "right",
                  fill: "#94a3b8",
                  fontSize: 10,
                }}
              />
            )}

            {!isEmpty && (
              <Tooltip
                cursor={{ stroke: "#6366f1", strokeWidth: 1, strokeOpacity: 0.35 }}
                content={() => null}
              />
            )}

            {/* Previous-period overlay — quiet, dashed, behind. */}
            {!isEmpty && (
              <Line
                type="monotone"
                dataKey="previous"
                stroke="#94a3b8"
                strokeWidth={1.25}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive
                animationDuration={520}
              />
            )}

            {/* Real current-period area — only rendered when there are
                actual sales. Never reuses the synthetic ghost dataset. */}
            {!isEmpty && (
              <Area
                type="monotone"
                dataKey="current"
                stroke="#4338ca"
                strokeWidth={2.25}
                fill="url(#heroAreaGrad)"
                dot={false}
                activeDot={{
                  r: 4,
                  stroke: "#ffffff",
                  strokeWidth: 2,
                  fill: "#4338ca",
                }}
                isAnimationActive
                animationDuration={620}
              />
            )}

            {/* Ghost curve — adimensional ease-out shape used only when
                the window has no real activity. The dataKey (`ghost`)
                is a normalised 0..1 value so it cannot be misread as
                revenue, and there is no tooltip / Y label to leak
                synthetic numbers to the merchant. */}
            {isEmpty && (
              <Area
                type="monotone"
                dataKey="ghost"
                stroke="#cbd5e1"
                strokeWidth={1.25}
                fill="url(#heroGhostGrad)"
                dot={false}
                activeDot={false}
                isAnimationActive
                animationDuration={720}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend strip — only meaningful when there is real data; when the
          window is empty we hide the legend so the canvas reads as a
          single quiet visual instead of a labelled placeholder. */}
      {!isEmpty && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[color:var(--hairline)] pt-3 text-[11px] text-ink-5">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-3 rounded-full bg-[#4338ca]" />
            Periodo actual
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-px w-3 border-t border-dashed border-[#94a3b8]" />
            Periodo anterior
          </span>
          {peakRevenue > 0 && (
            <span className="ml-auto tabular-nums text-ink-6">
              Pico {fmtCurrency(peakRevenue)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
