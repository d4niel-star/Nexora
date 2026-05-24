// ─── Analytics Date Engine (Phase 7C.2) ──────────────────────────────
// Centralized, timezone-aware date utilities for analytics queries.
// All grouping/comparison logic lives here so individual modules don't
// re-implement subtly different week/month boundaries.
//
// Timezone strategy: tenant time zones aren't first-class today, so we
// default to the server's local zone (Render: UTC; dev: machine local).
// When tenants get configurable TZs, every callsite below should accept
// a `timezone` arg and use Intl.DateTimeFormat to compute boundaries.

export type RangePreset = "today" | "7d" | "28d" | "90d" | "180d" | "365d" | "mtd" | "qtd" | "ytd";

export interface DateRange {
  /** Inclusive lower bound. */
  from: Date;
  /** Exclusive upper bound. */
  to: Date;
  /** Length in milliseconds — used to compute the comparison period. */
  ms: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function rangeFromPreset(preset: RangePreset, now: Date = new Date()): DateRange {
  const to = new Date(now.getTime());
  let from: Date;

  switch (preset) {
    case "today":
      from = startOfDay(now);
      break;
    case "7d":
      from = new Date(to.getTime() - 7 * DAY_MS);
      break;
    case "28d":
      from = new Date(to.getTime() - 28 * DAY_MS);
      break;
    case "90d":
      from = new Date(to.getTime() - 90 * DAY_MS);
      break;
    case "180d":
      from = new Date(to.getTime() - 180 * DAY_MS);
      break;
    case "365d":
      from = new Date(to.getTime() - 365 * DAY_MS);
      break;
    case "mtd":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "qtd":
      from = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      break;
    case "ytd":
      from = new Date(now.getFullYear(), 0, 1);
      break;
  }

  return { from, to, ms: to.getTime() - from.getTime() };
}

/**
 * Comparison range: same length, immediately preceding `range`.
 * For weekly periods this gives "this 7d vs previous 7d".
 */
export function previousRange(range: DateRange): DateRange {
  const to = new Date(range.from.getTime());
  const from = new Date(to.getTime() - range.ms);
  return { from, to, ms: range.ms };
}

export function startOfDay(d: Date): Date {
  const x = new Date(d.getTime());
  x.setHours(0, 0, 0, 0);
  return x;
}
export function endOfDay(d: Date): Date {
  const x = new Date(d.getTime());
  x.setHours(23, 59, 59, 999);
  return x;
}

export type GroupingKey = "hour" | "day" | "week" | "month";

/**
 * Bucket key for a Date — stable string form so we can group in JS
 * without DB-specific date_trunc. Format:
 *   hour  → "YYYY-MM-DDTHH"
 *   day   → "YYYY-MM-DD"
 *   week  → "YYYY-WW" (ISO week)
 *   month → "YYYY-MM"
 */
export function bucketKey(d: Date, grouping: GroupingKey): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  const h = d.getHours().toString().padStart(2, "0");
  switch (grouping) {
    case "hour": return `${y}-${m}-${day}T${h}`;
    case "day": return `${y}-${m}-${day}`;
    case "month": return `${y}-${m}`;
    case "week": return `${y}-W${isoWeek(d).toString().padStart(2, "0")}`;
  }
}

function isoWeek(d: Date): number {
  // ISO 8601 week number — Thursday in current week decides the year.
  const tmp = new Date(d.getTime());
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  return 1 + Math.round(((tmp.getTime() - week1.getTime()) / DAY_MS - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

/**
 * Auto-pick a grouping appropriate for the range duration. Used when
 * the caller hasn't specified one — keeps charts readable across very
 * different windows.
 */
export function defaultGrouping(range: DateRange): GroupingKey {
  const days = range.ms / DAY_MS;
  if (days <= 2) return "hour";
  if (days <= 60) return "day";
  if (days <= 365) return "week";
  return "month";
}

/**
 * Cohort bucket: the year-month of a customer's first order. Used by
 * customer-retention queries.
 */
export function cohortKey(firstOrderAt: Date): string {
  return bucketKey(firstOrderAt, "month");
}

export function formatRange(range: DateRange): string {
  const fmt = (d: Date) => d.toLocaleDateString();
  return `${fmt(range.from)} – ${fmt(range.to)}`;
}

export const RANGE_PRESETS: Array<{ value: RangePreset; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "28d", label: "Últimos 28 días" },
  { value: "90d", label: "Últimos 90 días" },
  { value: "180d", label: "Últimos 180 días" },
  { value: "365d", label: "Últimos 365 días" },
  { value: "mtd", label: "Mes actual" },
  { value: "qtd", label: "Trimestre actual" },
  { value: "ytd", label: "Año actual" },
];
