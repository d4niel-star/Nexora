"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

// ─── DateRangePicker ────────────────────────────────────────────────────
//
// Premium, dependency-free range selector for the Rendimiento surface.
// Visually it is a single editorial inline rail — no segmented bar,
// no boxed wrapper, no shadow. Presets read as ghost tabs, the custom
// trigger sits next to them separated by a hairline divider, and the
// calendar opens on demand in a floating popover. The intent is to
// stop looking like a generic dashboard control and behave like part
// of the chart itself.
//
// All dates are handled in **local YYYY-MM-DD** strings so they round
// trip cleanly via URL searchParams. The component is fully controlled
// from the parent.

export interface DateRangeValue {
  from: string;
  to: string;
}

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  className?: string;
  /** Hide the calendar trigger when not needed. Defaults to true. */
  enableCustom?: boolean;
}

const PRESETS: ReadonlyArray<{
  id: string;
  label: string;
  /** Returns YYYY-MM-DD strings (today and N days back, inclusive). */
  resolve: () => DateRangeValue;
}> = [
  {
    id: "7d",
    label: "7 días",
    resolve: () => buildTrailingRange(7),
  },
  {
    id: "30d",
    label: "30 días",
    resolve: () => buildTrailingRange(30),
  },
  {
    id: "90d",
    label: "90 días",
    resolve: () => buildTrailingRange(90),
  },
  {
    id: "ytd",
    label: "Año en curso",
    resolve: () => {
      const now = startOfTodayUTC();
      const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      return { from: toISODate(yearStart), to: toISODate(now) };
    },
  },
  {
    id: "365d",
    label: "12 meses",
    resolve: () => buildTrailingRange(365),
  },
];

export function DateRangePicker({
  value,
  onChange,
  className,
  enableCustom = true,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const activePresetId = useMemo(() => detectActivePreset(value), [value]);

  // Close popover on outside click / escape.
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className={cn("relative inline-flex items-center", className)}>
      {/* Preset rail — ghost tabs, no border/shadow. On narrow viewports
          we collapse to the calendar trigger only, which exposes the
          presets inside the popover. */}
      <div
        role="tablist"
        aria-label="Rangos predefinidos"
        className="hidden items-center sm:inline-flex"
      >
        {PRESETS.map((preset) => {
          const active = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(preset.resolve())}
              className={cn(
                "relative rounded-[var(--r-sm)] px-2.5 py-1.5 text-[12px] font-medium leading-none tabular-nums outline-none transition-colors focus-visible:shadow-[var(--shadow-focus)]",
                active ? "text-ink-0" : "text-ink-5 hover:text-ink-0",
              )}
            >
              {active && (
                <motion.span
                  layoutId="stats-range-pill"
                  className="absolute inset-0 rounded-[var(--r-sm)] bg-[var(--surface-2)]"
                  transition={{ type: "spring", stiffness: 480, damping: 38 }}
                />
              )}
              <span className="relative">{preset.label}</span>
            </button>
          );
        })}
      </div>

      {/* Custom range trigger — separated by a hairline divider so the
          calendar feels like an extension of the preset rail rather
          than a competing control. */}
      {enableCustom && (
        <>
          <span
            aria-hidden
            className="mx-2 hidden h-4 w-px bg-[color:var(--hairline)] sm:inline-block"
          />
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="dialog"
            className={cn(
              "group inline-flex items-center gap-1.5 rounded-[var(--r-sm)] px-2 py-1.5 text-[12px] font-medium leading-none tabular-nums outline-none transition-colors focus-visible:shadow-[var(--shadow-focus)]",
              activePresetId === null
                ? "text-ink-0"
                : "text-ink-5 hover:text-ink-0",
            )}
          >
            <Calendar
              className={cn(
                "h-3.5 w-3.5 transition-colors",
                activePresetId === null ? "text-ink-2" : "text-ink-6 group-hover:text-ink-2",
              )}
              strokeWidth={1.75}
            />
            <span>
              {activePresetId === null ? formatRangeLabel(value) : "Personalizado"}
            </span>
          </button>
        </>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            ref={popoverRef}
            role="dialog"
            aria-label="Selector de fechas personalizado"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-[calc(100%+8px)] z-30 w-[min(560px,92vw)] rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)]"
          >
            {/* Mobile-only preset bar inside the popover so users on
                narrow viewports keep one-tap access to the canonical
                ranges without the inline bar wrapping. */}
            <div className="mb-3 flex flex-wrap gap-1.5 border-b border-[color:var(--hairline)] pb-3 sm:hidden">
              {PRESETS.map((preset) => {
                const active = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      onChange(preset.resolve());
                      setOpen(false);
                    }}
                    className={cn(
                      "rounded-[var(--r-sm)] px-2.5 py-1.5 text-[12px] font-medium leading-none tabular-nums transition-colors",
                      active
                        ? "bg-[var(--accent-500)] text-white"
                        : "bg-[var(--surface-2)] text-ink-5 hover:text-ink-0",
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <CalendarRange
              value={value}
              onChange={(next) => {
                onChange(next);
              }}
              onClose={() => setOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Calendar (two-month view) ──────────────────────────────────────────

interface CalendarRangeProps {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  onClose: () => void;
}

function CalendarRange({ value, onChange, onClose }: CalendarRangeProps) {
  const initial = parseISODate(value.to) ?? startOfTodayUTC();
  const [cursor, setCursor] = useState<Date>(
    new Date(Date.UTC(initial.getUTCFullYear(), initial.getUTCMonth(), 1)),
  );
  const [pendingFrom, setPendingFrom] = useState<string | null>(null);

  const left = cursor;
  const right = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));

  const handleDayClick = (iso: string) => {
    if (!pendingFrom) {
      setPendingFrom(iso);
      return;
    }
    const fromDate = parseISODate(pendingFrom)!;
    const toDate = parseISODate(iso)!;
    const next: DateRangeValue =
      fromDate <= toDate
        ? { from: pendingFrom, to: iso }
        : { from: iso, to: pendingFrom };
    setPendingFrom(null);
    onChange(next);
    onClose();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Mes anterior"
          onClick={() => setCursor((c) => new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth() - 1, 1)))}
          className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--r-sm)] text-ink-5 transition-colors hover:bg-[var(--surface-2)] hover:text-ink-0"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <div className="flex items-center gap-6 text-[12px] font-medium text-ink-0">
          <span className="capitalize tabular-nums">{formatMonthLabel(left)}</span>
          <span className="capitalize tabular-nums">{formatMonthLabel(right)}</span>
        </div>
        <button
          type="button"
          aria-label="Mes siguiente"
          onClick={() => setCursor((c) => new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth() + 1, 1)))}
          className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--r-sm)] text-ink-5 transition-colors hover:bg-[var(--surface-2)] hover:text-ink-0"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MonthGrid
          monthStart={left}
          range={value}
          pendingFrom={pendingFrom}
          onDayClick={handleDayClick}
        />
        <MonthGrid
          monthStart={right}
          range={value}
          pendingFrom={pendingFrom}
          onDayClick={handleDayClick}
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[color:var(--hairline)] pt-3">
        <p className="text-[11px] text-ink-6">
          {pendingFrom
            ? "Elegí la fecha final del rango."
            : "Elegí la fecha inicial. Cliqueá una segunda fecha para cerrar el rango."}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[var(--r-sm)] px-2.5 py-1 text-[11px] font-medium text-ink-5 hover:text-ink-0"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

interface MonthGridProps {
  monthStart: Date;
  range: DateRangeValue;
  pendingFrom: string | null;
  onDayClick: (iso: string) => void;
}

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

function MonthGrid({ monthStart, range, pendingFrom, onDayClick }: MonthGridProps) {
  const year = monthStart.getUTCFullYear();
  const month = monthStart.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  // Monday-based offset (UTC). getUTCDay returns 0=Sun…6=Sat.
  const firstWeekday = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = toISODate(new Date(Date.UTC(year, month, d)));
    cells.push(iso);
  }

  const today = toISODate(startOfTodayUTC());
  const fromDate = parseISODate(range.from);
  const toDate = parseISODate(range.to);
  const pendingDate = parseISODate(pendingFrom ?? "");

  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7 gap-y-1 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-ink-6">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-[12px]">
        {cells.map((iso, idx) => {
          if (!iso) return <span key={`empty-${idx}`} className="h-7" />;
          const dayDate = parseISODate(iso)!;
          const inRange =
            !pendingDate &&
            fromDate &&
            toDate &&
            dayDate >= fromDate &&
            dayDate <= toDate;
          const isStart = !pendingDate && fromDate && iso === range.from;
          const isEnd = !pendingDate && toDate && iso === range.to;
          const isPending = pendingDate && iso === pendingFrom;
          const isToday = iso === today;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onDayClick(iso)}
              className={cn(
                "relative h-7 rounded-[var(--r-sm)] tabular-nums leading-none transition-colors",
                isStart || isEnd || isPending
                  ? "bg-[var(--accent-500)] font-semibold text-white"
                  : inRange
                    ? "bg-[var(--accent-50)] text-[var(--accent-700)]"
                    : "text-ink-0 hover:bg-[var(--surface-2)]",
                isToday && !(isStart || isEnd || isPending) && "ring-1 ring-inset ring-[color:var(--hairline-strong)]",
              )}
            >
              {Number(iso.slice(8, 10))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────

function startOfTodayUTC(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseISODate(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildTrailingRange(days: number): DateRangeValue {
  const today = startOfTodayUTC();
  const from = new Date(today.getTime() - (days - 1) * 86_400_000);
  return { from: toISODate(from), to: toISODate(today) };
}

function detectActivePreset(value: DateRangeValue): string | null {
  for (const preset of PRESETS) {
    const candidate = preset.resolve();
    if (candidate.from === value.from && candidate.to === value.to) {
      return preset.id;
    }
  }
  return null;
}

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatMonthLabel(d: Date): string {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatRangeLabel(value: DateRangeValue): string {
  const from = parseISODate(value.from);
  const to = parseISODate(value.to);
  if (!from || !to) return "Personalizado";
  const fromLabel = `${from.getUTCDate()} ${MONTHS_SHORT[from.getUTCMonth()]}`;
  const toLabel = `${to.getUTCDate()} ${MONTHS_SHORT[to.getUTCMonth()]}`;
  if (from.getUTCFullYear() !== to.getUTCFullYear()) {
    return `${fromLabel} ${from.getUTCFullYear()} → ${toLabel} ${to.getUTCFullYear()}`;
  }
  return `${fromLabel} → ${toLabel}`;
}
