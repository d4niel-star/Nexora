import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ─── AdminMetric · Studio v4 wrapper ────────────────────────────────────
//
// Back-compat shim that renders a single Studio v4 stat tile. The old
// .admin-metric-tile look (132px / shadow / hover-elevation) is gone —
// a tile here is now visually identical to a single .nx-stat from
// `NexoraStatRow`, just standalone.
//
// We render a one-cell `.nx-stat-row` wrapper so spacing, typography
// and click affordance match the new flat KPI band exactly. `tone`,
// `delta` and `trend` are accepted for source compatibility:
//   · `delta` is rendered as a colored inline % next to the value.
//   · `trend` is rendered next to the value (e.g. inline sparkline).
//   · `tone` is intentionally not honored; Studio v4 expresses tone
//     through hint/delta colors, not full-tile tinting.

type Tone = "neutral" | "accent" | "warning" | "danger" | "success";

interface AdminMetricProps {
  label: string;
  value: ReactNode;
  delta?: number | null;
  deltaSuffix?: string;
  hint?: ReactNode;
  trend?: ReactNode;
  /** @deprecated Studio v4 doesn't tint the whole tile. */
  tone?: Tone;
  href?: string;
  onClick?: () => void;
  className?: string;
  /** @deprecated Studio v4 ships a single density. */
  size?: "sm" | "md";
}

export function AdminMetric({
  label,
  value,
  delta,
  deltaSuffix = "%",
  hint,
  trend,
  href,
  onClick,
  className,
}: AdminMetricProps) {
  const isInteractive = Boolean(href || onClick);
  const innerStyle = { ["--nx-cols" as string]: "1" };

  const inner = (
    <div className="nx-stat-row" style={innerStyle}>
      {isInteractive ? (
        <button
          type="button"
          onClick={onClick}
          className={cn("nx-stat", "nx-stat--clickable", className)}
          style={{ textAlign: "left" }}
        >
          <span className="nx-stat__label">{label}</span>
          <span className="nx-stat__row">
            <span className="nx-stat__value">{value}</span>
            {delta !== undefined && delta !== null ? (
              <DeltaText value={delta} suffix={deltaSuffix} />
            ) : null}
            {trend ? <span style={{ marginLeft: 4 }}>{trend}</span> : null}
          </span>
          {hint ? <span className="nx-stat__hint">{hint}</span> : null}
        </button>
      ) : (
        <div className={cn("nx-stat", className)}>
          <span className="nx-stat__label">{label}</span>
          <span className="nx-stat__row">
            <span className="nx-stat__value">{value}</span>
            {delta !== undefined && delta !== null ? (
              <DeltaText value={delta} suffix={deltaSuffix} />
            ) : null}
            {trend ? <span style={{ marginLeft: 4 }}>{trend}</span> : null}
          </span>
          {hint ? <span className="nx-stat__hint">{hint}</span> : null}
        </div>
      )}
    </div>
  );

  if (href && !onClick) {
    return (
      <a href={href} style={{ textDecoration: "none" }}>
        {inner}
      </a>
    );
  }
  return inner;
}

function DeltaText({ value, suffix }: { value: number; suffix: string }) {
  if (value === 0) {
    return (
      <span className="nx-stat__delta nx-stat__delta--neutral">
        0{suffix}
      </span>
    );
  }
  const positive = value > 0;
  return (
    <span
      className={cn(
        "nx-stat__delta",
        positive ? "nx-stat__delta--up" : "nx-stat__delta--down",
      )}
    >
      {positive ? "+" : "−"}
      {Math.abs(value).toFixed(1).replace(/\.0$/, "")}
      {suffix}
    </span>
  );
}
