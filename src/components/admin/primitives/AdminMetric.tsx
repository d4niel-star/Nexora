import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── AdminMetric ─────────────────────────────────────────────────────────
// Dense KPI tile for analytics rows. Replaces the previous `metric-tile`
// (which was 132px tall, very airy) with a denser, premium tile that
// fits 4–6 across without crowding:
//
//   LABEL UPPERCASE 11px            ┌──────┐
//   $ 184.420            ↑ 12,4%   │spark │
//                                  └──────┘
//
// • `delta` accepts a numeric percent: positive renders ↑ + success,
//   negative renders ↓ + danger, zero/null renders ─ + neutral.
// • `trend` accepts an inline ReactNode (sparkline, mini-chart…).
// • `tone` overrides the value color regardless of delta.
// • `href` makes the whole tile a link with hover affordance.

type Tone = "neutral" | "accent" | "warning" | "danger" | "success";

interface AdminMetricProps {
  label: string;
  value: ReactNode;
  delta?: number | null;
  deltaSuffix?: string;
  hint?: ReactNode;
  trend?: ReactNode;
  tone?: Tone;
  href?: string;
  onClick?: () => void;
  className?: string;
  size?: "sm" | "md";
}

const TONE_MAP: Record<Tone, string> = {
  neutral: "text-ink-0",
  accent: "text-[color:var(--accent-700)]",
  warning: "text-[color:var(--signal-warning)]",
  danger: "text-[color:var(--signal-danger)]",
  success: "text-[color:var(--signal-success)]",
};

export function AdminMetric({
  label,
  value,
  delta,
  deltaSuffix = "%",
  hint,
  trend,
  tone = "neutral",
  href,
  onClick,
  className,
  size = "md",
}: AdminMetricProps) {
  const isInteractive = Boolean(href || onClick);
  const Tag = href ? ("a" as const) : ("div" as const);

  return (
    <Tag
      href={href}
      onClick={onClick}
      className={cn(
        "admin-metric-tile",
        `admin-metric-tile--${size}`,
        isInteractive && "admin-metric-tile--interactive",
        className,
      )}
    >
      <p className="admin-metric-label">{label}</p>
      <div className="admin-metric-row">
        <p className={cn("admin-metric-value tabular", TONE_MAP[tone])}>
          {value}
        </p>
        {trend && <div className="admin-metric-trend">{trend}</div>}
      </div>
      {(delta !== undefined && delta !== null) || hint ? (
        <div className="admin-metric-meta">
          {delta !== undefined && delta !== null && (
            <DeltaPill value={delta} suffix={deltaSuffix} />
          )}
          {hint && <span className="admin-metric-hint">{hint}</span>}
        </div>
      ) : null}
    </Tag>
  );
}

function DeltaPill({ value, suffix }: { value: number; suffix: string }) {
  if (value === 0) {
    return (
      <span className="admin-metric-delta admin-metric-delta--neutral">
        <Minus className="h-3 w-3" strokeWidth={2} />
        0{suffix}
      </span>
    );
  }
  const positive = value > 0;
  return (
    <span
      className={cn(
        "admin-metric-delta",
        positive
          ? "admin-metric-delta--up"
          : "admin-metric-delta--down",
      )}
    >
      {positive ? (
        <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
      ) : (
        <ArrowDownRight className="h-3 w-3" strokeWidth={2} />
      )}
      {Math.abs(value).toFixed(1).replace(/\.0$/, "")}
      {suffix}
    </span>
  );
}
