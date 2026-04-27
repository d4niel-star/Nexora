// ─── Nexora Studio v4 · DataBoard (table + cmd bar joined) ──────────────
//
// Core data surface. Replaces the v3 pattern of three separate components
// (toolbar div, bulk strip div, table card div) stacked with margins.
// Studio v4 fuses them under a single hairline frame: the command bar,
// the bulk action strip and the table all share borders so they read as
// one unit.
//
// Composition:
//
//   <NexoraTableShell>
//     <NexoraCmdBar>
//       <NexoraSearch ... />
//       <NexoraFilters>{chips}</NexoraFilters>
//       <NexoraActions>{buttons}</NexoraActions>
//     </NexoraCmdBar>
//     <NexoraBulkBar selected={n}>{actions}</NexoraBulkBar>?  // optional
//     <table className="nx-table"> ... </table>
//   </NexoraTableShell>
//
// Helpers below keep the JSX call sites tidy without adding abstraction.

"use client";

import type { ReactNode, InputHTMLAttributes } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function NexoraTableShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("nx-table-shell", className)}>{children}</div>;
}

export function NexoraCmdBar({ children }: { children: ReactNode }) {
  return <div className="nx-cmd-bar">{children}</div>;
}

export function NexoraSearch({
  value,
  onChange,
  placeholder = "Buscar…",
  ...rest
}: {
  value: string;
  onChange: (next: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <div className="nx-cmd-bar__search">
      <Search className="nx-cmd-bar__search-icon" size={14} strokeWidth={1.75} />
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
      {value ? (
        <button
          type="button"
          aria-label="Limpiar búsqueda"
          onClick={() => onChange("")}
          style={{
            position: "absolute",
            right: 6,
            top: "50%",
            transform: "translateY(-50%)",
            height: 22,
            width: 22,
            borderRadius: 4,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink-5)",
            cursor: "pointer",
            background: "transparent",
            border: "none",
          }}
        >
          <X size={12} strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}

export function NexoraFilters({ children }: { children: ReactNode }) {
  return <div className="nx-cmd-bar__filters">{children}</div>;
}

export function NexoraActions({ children }: { children: ReactNode }) {
  return <div className="nx-cmd-bar__actions">{children}</div>;
}

export function NexoraChip({
  active,
  onClick,
  children,
  count,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      className="nx-chip"
      data-active={active ? "true" : undefined}
      onClick={onClick}
    >
      {children}
      {typeof count === "number" ? (
        <span className="nx-chip__count">{count}</span>
      ) : null}
    </button>
  );
}

export function NexoraBulkBar({
  selected,
  onClear,
  children,
}: {
  selected: number;
  onClear?: () => void;
  children: ReactNode;
}) {
  if (selected <= 0) return null;
  return (
    <div className="nx-bulk-bar">
      <span className="nx-bulk-bar__label">
        {selected} seleccionad{selected === 1 ? "o" : "os"}
      </span>
      <div className="nx-bulk-bar__actions">
        {children}
        {onClear ? (
          <button type="button" className="nx-action nx-action--ghost nx-action--sm" onClick={onClear}>
            Limpiar
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function NexoraEmpty({
  title,
  body,
  actions,
}: {
  title: string;
  body?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="nx-empty">
      <div className="nx-empty__title">{title}</div>
      {body ? <div className="nx-empty__body">{body}</div> : null}
      {actions ? <div style={{ display: "inline-flex", gap: 6 }}>{actions}</div> : null}
    </div>
  );
}
