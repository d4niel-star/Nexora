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
// IMPORTANT: the chart MUST render even when the store has zero sales in
// the selected window. The empty-state branch lives inside the chart
// itself: a flat zero baseline, a quiet axis at [0, 1], and a single
// discreet caption. We never collapse the canvas into a placeholder card
// — that would defeat the whole "premium analytical surface" feel.

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
}

export function RevenueHeroChart({
  current,
  previous,
  totalRevenue,
  prevTotalRevenue,
  changePercent,
}: RevenueHeroChartProps) {
  const [hover, setHover] = useState<ChartPoint | null>(null);

  const data = useMemo<ChartPoint[]>(() => {
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
    () => data.reduce((m, d) => (d.current > m ? d.current : m), 0),
    [data],
  );
  const meanRevenue = useMemo(() => {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, d) => acc + d.current, 0);
    return sum / data.length;
  }, [data]);

  const xTickInterval = useMemo(() => {
    if (data.length <= 14) return 0;
    if (data.length <= 45) return Math.max(0, Math.floor(data.length / 7));
    return Math.max(0, Math.floor(data.length / 6));
  }, [data]);

  // Detect the neutral / no-sales state. We treat the chart as empty when
  // either there are no buckets at all (defensive) OR every bucket has
  // zero revenue. In that case the hero number reads $0 and the chart
  // renders a flat baseline instead of a placeholder card.
  const isEmpty = data.length === 0 || data.every((d) => d.current === 0);

  const isUp = !isEmpty && (changePercent ?? 0) > 0;
  const isDown = !isEmpty && (changePercent ?? 0) < 0;

  const headlineValue = hover ? hover.current : totalRevenue;
  const headlineSubtitle = hover
    ? `${hover.label} · ${hover.orders} ${hover.orders === 1 ? "pedido" : "pedidos"}`
    : isEmpty
      ? "Sin ventas registradas en este rango."
      : prevTotalRevenue > 0
        ? `vs ${fmtCurrency(prevTotalRevenue)} en el periodo anterior`
        : "Periodo anterior sin movimiento.";

  // When the chart is empty Y-axis to [0, 1] keeps the baseline visible
  // and the gridline stable. Otherwise let recharts auto-scale.
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
            margin={{ top: 8, right: 14, bottom: 6, left: 0 }}
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
              <linearGradient id="heroAreaGradMuted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              vertical={false}
              stroke="#e2e8f0"
              strokeDasharray="0"
              strokeOpacity={isEmpty ? 0.55 : 0.45}
            />

            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: isEmpty ? "#cbd5e1" : "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              interval={xTickInterval}
              minTickGap={16}
              padding={{ left: 4, right: 4 }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: isEmpty ? "#cbd5e1" : "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              width={48}
              domain={yDomain}
              tickFormatter={(v: number) => {
                if (isEmpty) return v === 0 ? "0" : "";
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

            {/* Current-period area — protagonist (or muted baseline when empty). */}
            <Area
              type="monotone"
              dataKey="current"
              stroke={isEmpty ? "#cbd5e1" : "#4338ca"}
              strokeWidth={isEmpty ? 1.25 : 2.25}
              strokeDasharray={isEmpty ? "5 5" : undefined}
              fill={isEmpty ? "url(#heroAreaGradMuted)" : "url(#heroAreaGrad)"}
              dot={false}
              activeDot={
                isEmpty
                  ? false
                  : {
                      r: 4,
                      stroke: "#ffffff",
                      strokeWidth: 2,
                      fill: "#4338ca",
                    }
              }
              isAnimationActive
              animationDuration={isEmpty ? 0 : 620}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-[var(--r-sm)] bg-[var(--surface-0)]/85 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-[2px]">
              Sin ventas en este rango
            </span>
          </div>
        )}
      </div>

      {/* Legend strip — minimal, three slots. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[color:var(--hairline)] pt-3 text-[11px] text-ink-5">
        <span className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              "h-1.5 w-3 rounded-full",
              isEmpty ? "bg-[#cbd5e1]" : "bg-[#4338ca]",
            )}
          />
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
    </div>
  );
}
