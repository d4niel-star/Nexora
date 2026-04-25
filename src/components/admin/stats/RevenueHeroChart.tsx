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
//   1. The overlay number stays honest at $0 (KPI-driven).
//   2. The chart renders a quiet "ghost curve" — an unlabelled,
//      adimensional ease-out shape that suggests latent activity without
//      pretending to be revenue. It uses a synthetic dataKey (`ghost`)
//      that is normalised to [0, 1] and never formatted as currency, so
//      the surface cannot be misread as data.
//   3. There is no neutral tooltip, no Y ticks, no legend, and no large
//      empty-state copy. The visual carries the state alone.
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
      ? "Periodo actual, esperando ventas confirmadas."
      : prevTotalRevenue > 0
        ? `vs ${fmtCurrency(prevTotalRevenue)} en el periodo anterior`
        : "Periodo anterior sin movimiento.";

  // Y axis: real data auto-scales; ghost canvas pinned to [0, 1] but the
  // ticks are hidden so the values cannot be misread.
  const yDomain: [number | string, number | string] = isEmpty ? [0, 1] : [0, "auto"];

  return (
    // The whole module is a single editorial canvas: the headline lives
    // INSIDE the chart area as an overlay, not as a separate KPI block
    // above. The `relative` wrapper anchors the overlay; the chart fills
    // the rest. We avoid any hard border on the SVG — the parent card
    // owns the framing.
    <div className="relative h-[430px] w-full sm:h-[500px] lg:h-[540px]">
      {/* Decorative background veil — a very low-contrast gradient that
          sits behind the chart and removes the "blank rectangle" feel
          without competing with real data. Pointer-events disabled so
          it can never block tooltips when data exists. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[var(--r-lg)]",
          isEmpty
            ? "bg-[radial-gradient(90%_70%_at_85%_82%,rgba(63,79,154,0.12),transparent_58%),radial-gradient(70%_55%_at_12%_18%,rgba(21,149,106,0.08),transparent_60%),linear-gradient(135deg,var(--surface-0)_0%,var(--surface-1)_48%,var(--surface-2)_100%)]"
            : "bg-[radial-gradient(95%_75%_at_88%_88%,rgba(63,79,154,0.10),transparent_58%),linear-gradient(135deg,var(--surface-0)_0%,var(--surface-1)_55%,var(--surface-2)_100%)]",
        )}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-12 top-[118px] bg-[repeating-linear-gradient(0deg,rgba(63,79,154,0.052)_0px,rgba(63,79,154,0.052)_1px,transparent_1px,transparent_54px),repeating-linear-gradient(90deg,rgba(63,79,154,0.034)_0px,rgba(63,79,154,0.034)_1px,transparent_1px,transparent_160px)] [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)] sm:bottom-14 sm:top-[136px]"
      />

      {/* Editorial overlay — lives inside the chart frame. The amount is
          driven by `totalRevenue` (real KPI) or by the hovered bucket
          when there is real data; never by the synthetic ghost series. */}
      <div className="pointer-events-none absolute left-5 top-5 z-10 max-w-[calc(100%-2.5rem)] sm:left-8 sm:top-7 sm:max-w-[78%]">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-6">
          Ingresos del periodo
        </p>
        <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-2">
          <p className="tabular-nums text-[38px] font-semibold leading-[1] tracking-[-0.035em] text-ink-0 sm:text-[56px]">
            {fmtCurrency(headlineValue)}
          </p>
          {!isEmpty && changePercent !== null && (
            <span
              className={cn(
                "mb-1 inline-flex items-center gap-1 rounded-[var(--r-md)] px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                isUp
                  ? "bg-[color:var(--signal-success)]/10 text-[color:var(--signal-success)]"
                  : isDown
                    ? "bg-[color:var(--signal-danger)]/10 text-[color:var(--signal-danger)]"
                    : "bg-[var(--surface-2)] text-ink-5",
              )}
            >
              {fmtPercent(changePercent)}
            </span>
          )}
          {isEmpty && (
            <span className="mb-1 inline-flex items-center rounded-[var(--r-md)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-6">
              Listo para medir
            </span>
          )}
        </div>
        <p className="mt-2 text-[12px] leading-[1.4] text-ink-5">{headlineSubtitle}</p>
      </div>

      {/* Chart canvas — oversized; the SVG carries no outline of its own.
          We strip any focus ring that recharts may emit on the underlying
          surface elements so no "black outline" can appear around it. */}
      <div className="absolute inset-0 -mx-1 [&_.recharts-layer]:outline-none [&_.recharts-surface]:outline-none [&_.recharts-wrapper]:outline-none [&_svg]:outline-none">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          minHeight={320}
          initialDimension={{ width: 800, height: 430 }}
        >
          <ComposedChart
            data={data}
            margin={{ top: isEmpty ? 146 : 136, right: 22, bottom: 10, left: 8 }}
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
                <stop offset="0%" stopColor="#3f4f9a" stopOpacity={0.30} />
                <stop offset="58%" stopColor="#3f4f9a" stopOpacity={0.10} />
                <stop offset="100%" stopColor="#3f4f9a" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="heroGhostGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3f4f9a" stopOpacity={0.24} />
                <stop offset="52%" stopColor="#15956a" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              vertical={isEmpty}
              horizontal={!isEmpty}
              stroke={isEmpty ? "var(--ink-8)" : "var(--surface-3)"}
              strokeDasharray={isEmpty ? "2 6" : "0"}
              strokeOpacity={isEmpty ? 0.58 : 0.42}
            />

            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: isEmpty ? "#cbd5e1" : "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              interval={xTickInterval}
              minTickGap={isEmpty ? 36 : 16}
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
                cursor={{ stroke: "#3f4f9a", strokeWidth: 1, strokeOpacity: 0.32 }}
                content={<RevenueTooltip />}
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
                stroke="#3f4f9a"
                strokeWidth={2.5}
                fill="url(#heroAreaGrad)"
                dot={false}
                activeDot={{
                  r: 4,
                  stroke: "#ffffff",
                  strokeWidth: 2,
                  fill: "#3f4f9a",
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
              <>
                <Line
                  type="monotone"
                  dataKey="ghost"
                  stroke="#3f4f9a"
                  strokeOpacity={0.12}
                  strokeWidth={9}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="ghost"
                  stroke="#3f4f9a"
                  strokeOpacity={0.72}
                  strokeWidth={2}
                  fill="url(#heroGhostGrad)"
                  dot={false}
                  activeDot={false}
                  isAnimationActive
                  animationDuration={720}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer chip strip — only when there is real data. Sits inside
          the canvas (absolute, bottom-right) so the legend never adds
          extra vertical chrome and never reads as a divider line. */}
      {!isEmpty && (
        <div className="pointer-events-none absolute bottom-4 right-5 z-10 hidden items-center gap-x-4 text-[11px] text-ink-5 sm:flex">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-3 rounded-full bg-[#3f4f9a]" />
            Periodo actual
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-px w-3 border-t border-dashed border-[color:var(--ink-6)]" />
            Periodo anterior
          </span>
          {peakRevenue > 0 && (
            <span className="tabular-nums text-ink-6">
              Pico {fmtCurrency(peakRevenue)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function RevenueTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    dataKey?: string | number;
    value?: number | null;
    payload?: ChartPoint;
  }>;
}) {
  if (!active || !payload?.length) return null;

  const point = payload.find((item) => item.dataKey === "current")?.payload;
  if (!point) return null;

  const previous = payload.find((item) => item.dataKey === "previous")?.value;

  return (
    <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3 py-2 text-[12px] shadow-[0_16px_36px_-18px_rgba(7,8,13,0.28)]">
      <p className="mb-1 font-medium text-ink-0">{point.label}</p>
      <div className="space-y-0.5 tabular-nums text-ink-5">
        <p>
          <span className="text-ink-6">Ingresos</span>{" "}
          <span className="font-medium text-ink-0">{fmtCurrency(point.current)}</span>
        </p>
        <p>
          <span className="text-ink-6">Pedidos</span>{" "}
          <span className="font-medium text-ink-0">{point.orders}</span>
        </p>
        {typeof previous === "number" && previous > 0 && (
          <p>
            <span className="text-ink-6">Periodo anterior</span>{" "}
            <span className="font-medium text-ink-0">{fmtCurrency(previous)}</span>
          </p>
        )}
      </div>
    </div>
  );
}
