"use client";

import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── AdminToolbar ────────────────────────────────────────────────────────
// Single horizontal toolbar that hosts the search input, optional filter
// chips, optional bulk-selection counter, and optional right-side action
// buttons. Replaces the ad-hoc "search + chips + buttons" stripes that
// every admin hub re-implemented.
//
//   [🔍 Buscar…           ] [chip] [chip] · 12 seleccionados      [Acción] [Acción]
//
// • `search` is optional; when omitted, the left side renders the
//   `leading` slot (e.g. summary text).
// • `filters` is a free slot for filter chips/dropdowns.
// • `bulk` becomes the highlighted left content when there's a
//   selection; useful for table toolbars.
// • Sticky variant via `sticky` prop pins the toolbar to the top of
//   its scroll container (used inside long form panels).

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
  return (
    <div
      className={cn(
        "admin-toolbar-bar",
        sticky && "admin-toolbar-bar--sticky",
        className,
      )}
    >
      <div className="admin-toolbar-bar-left">
        {bulk ? (
          <div className="admin-toolbar-bulk">{bulk}</div>
        ) : search ? (
          <div className="admin-toolbar-search">
            <Search className="admin-toolbar-search-icon" strokeWidth={1.75} />
            <input
              type="search"
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder ?? "Buscar…"}
              autoFocus={search.autoFocus}
              className="admin-toolbar-search-input"
            />
            {search.value && (
              <button
                type="button"
                onClick={() => search.onChange("")}
                aria-label="Limpiar búsqueda"
                className="admin-toolbar-search-clear"
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            )}
          </div>
        ) : (
          leading
        )}
        {filters && <div className="admin-toolbar-filters">{filters}</div>}
      </div>
      {actions && <div className="admin-toolbar-actions">{actions}</div>}
    </div>
  );
}
