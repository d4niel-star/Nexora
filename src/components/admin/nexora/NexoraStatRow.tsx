// ─── Nexora Studio v4 · Stat row ────────────────────────────────────────
//
// Replaces the v3 metric-tile / AdminMetric grid (132px boxes with
// border + shadow per tile) with a single horizontal band: hairline
// border once around the whole row, vertical hairlines between stats.
// The result is much denser and reads as one piece of information,
// not as four separate cards.
//
// Tokens: .nx-stat-row, .nx-stat (see src/app/globals.css).

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface NexoraStat {
  label: string;
  value: string;
  /** Optional delta (e.g. "+12.4%") with semantic direction. */
  delta?: { value: string; direction?: "up" | "down" | "neutral" };
  /** Optional small hint below the value, like "vs. semana anterior". */
  hint?: string;
  /** Optional click target — when set, the stat reads as actionable. */
  onClick?: () => void;
  /** Optional href, exclusive with onClick — handled by parent if needed. */
  href?: string;
  /** Optional icon rendered inline with the label. */
  icon?: ReactNode;
}

export interface NexoraStatRowProps {
  stats: NexoraStat[];
  /** Grid columns; defaults to the number of stats (capped at 4 in CSS). */
  cols?: number;
  className?: string;
}

export function NexoraStatRow({ stats, cols, className }: NexoraStatRowProps) {
  return (
    <div
      className={cn("nx-stat-row", className)}
      style={{ ["--nx-cols" as string]: String(cols ?? Math.min(stats.length, 4)) }}
    >
      {stats.map((s, i) => {
        const inner = (
          <>
            <span className="nx-stat__label">
              {s.icon ? <span style={{ marginRight: 6 }}>{s.icon}</span> : null}
              {s.label}
            </span>
            <span className="nx-stat__row">
              <span className="nx-stat__value">{s.value}</span>
              {s.delta ? (
                <span
                  className={cn(
                    "nx-stat__delta",
                    s.delta.direction === "up"
                      ? "nx-stat__delta--up"
                      : s.delta.direction === "down"
                        ? "nx-stat__delta--down"
                        : "nx-stat__delta--neutral",
                  )}
                >
                  {s.delta.value}
                </span>
              ) : null}
            </span>
            {s.hint ? <span className="nx-stat__hint">{s.hint}</span> : null}
          </>
        );

        if (s.onClick) {
          return (
            <button
              key={i}
              type="button"
              onClick={s.onClick}
              className={cn("nx-stat", "nx-stat--clickable")}
              style={{ textAlign: "left" }}
            >
              {inner}
            </button>
          );
        }
        return (
          <div key={i} className="nx-stat">
            {inner}
          </div>
        );
      })}
    </div>
  );
}
