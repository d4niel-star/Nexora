import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ─── AdminPageHeader ──────────────────────────────────────────────────────
// Single rhythm shared by every admin route. Replaces the per-page eyebrow
// + h1 + subtitle stacks scattered across 30+ surfaces. Composition:
//
//   ┌──────────────────────────────────────────────────────────────┐
//   │ 01 / Sección                                  [actions]      │
//   │ Título grande tipográfico                                    │
//   │ Subtítulo descriptivo, max 56ch                              │
//   ├──────────────────────────────────────────────────────────────┤
//   │ (children for inline below-header content, rare)             │
//   └──────────────────────────────────────────────────────────────┘
//
// • `eyebrow` is rendered through the .section-rule pattern (number +
//   label + trailing hairline) when `index` is provided, otherwise as
//   a plain uppercase label so existing call-sites can adopt this
//   primitive without committing to numbered IA right away.
// • `actions` floats right of the title row at md+; on mobile it wraps
//   below the title so we never crowd narrow viewports.
// • `quiet` removes the bottom hairline + collapses spacing — used in
//   nested surfaces (drawers, dialog headers) that should pick up the
//   same typographic rhythm without claiming a page-level header.
// • All values bind through the .admin-page-header / .admin-page-title /
//   .admin-page-subtitle utilities defined in globals.css so cross-page
//   tweaks land in a single place.

interface AdminPageHeaderProps {
  /** Numeric index ("01", "02"). Renders as a section-rule when set. */
  index?: string;
  /** Eyebrow text (e.g. "Comando comercial", "Pedidos"). */
  eyebrow: string;
  /** Page title — kept short, displayed in display type. */
  title: string;
  /** Optional subtitle, capped to ~56ch by the underlying utility. */
  subtitle?: string;
  /** Right-aligned action cluster (CTA buttons, filters, etc). */
  actions?: ReactNode;
  /** Hide the bottom hairline (used inside drawers / dialogs). */
  quiet?: boolean;
  /** Additional content below the header but above the page body. */
  children?: ReactNode;
  className?: string;
}

export function AdminPageHeader({
  index,
  eyebrow,
  title,
  subtitle,
  actions,
  quiet = false,
  children,
  className,
}: AdminPageHeaderProps) {
  return (
    <header
      className={cn("admin-page-header", className)}
      data-quiet={quiet ? "true" : undefined}
    >
      {/* Top row: eyebrow on the left, actions on the right */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {index ? (
          <div className="section-rule">
            <span>{index}</span>
            <span>{eyebrow}</span>
          </div>
        ) : (
          <span className="eyebrow-label">{eyebrow}</span>
        )}
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>

      {/* Title + subtitle */}
      <div className="mt-3 flex flex-col gap-2">
        <h1 className="admin-page-title">{title}</h1>
        {subtitle && <p className="admin-page-subtitle">{subtitle}</p>}
      </div>

      {children}
    </header>
  );
}
