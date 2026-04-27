"use client";

import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── AdminToolbar · Studio v4 wrapper ───────────────────────────────────
//
// Back-compat shim that renders a `.nx-cmd-bar` (the same command bar
// used inside `NexoraTableShell`). Existing call sites stop being
// distinct toolbar strips and adopt the new flat command bar look.
// `sticky` is preserved with a thin position:sticky wrapper because a
// few long forms relied on it.

interface AdminToolbarProps {
  search?: {
    value: string;
    onChange: (next: string) => void;
    placeholder?: string;
    autoFocus?: boolean;
  };
  filters?: ReactNode;
  actions?: ReactNode;
  bulk?: ReactNode;
  leading?: ReactNode;
  sticky?: boolean;
  className?: string;
}

export function AdminToolbar({
  search,
  filters,
  actions,
  bulk,
  leading,
  sticky = false,
  className,
}: AdminToolbarProps) {
  const stickyStyle: React.CSSProperties | undefined = sticky
    ? { position: "sticky", top: 0, zIndex: 5 }
    : undefined;
  return (
    <div className={cn("nx-cmd-bar", className)} style={stickyStyle}>
      {bulk ? (
        <div style={{ flex: 1 }}>{bulk}</div>
      ) : search ? (
        <div className="nx-cmd-bar__search">
          <Search className="nx-cmd-bar__search-icon" size={14} strokeWidth={1.75} />
          <input
            type="search"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? "Buscar…"}
            autoFocus={search.autoFocus}
          />
          {search.value ? (
            <button
              type="button"
              onClick={() => search.onChange("")}
              aria-label="Limpiar búsqueda"
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
      ) : (
        <div style={{ flex: 1 }}>{leading}</div>
      )}
      {filters ? <div className="nx-cmd-bar__filters">{filters}</div> : null}
      {actions ? <div className="nx-cmd-bar__actions">{actions}</div> : null}
    </div>
  );
}
