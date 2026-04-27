import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ─── AdminPageHeader v3 ──────────────────────────────────────────────────
// Single rhythm shared by every admin route. The previous version rendered
// a numbered editorial section-rule ("01 / Sección · ─────") that pushed
// every admin page into a magazine layout. v3 ships the clean Shopify-
// style stack:
//
//   ┌──────────────────────────────────────────────────────────────┐
//   │ EYEBROW · uppercase                          [actions]        │
//   │ Título display                                                │
//   │ Subtítulo descriptivo, max 64ch                               │
//   ├──────────────────────────────────────────────────────────────┤
//   │ (children, rare)                                              │
//   └──────────────────────────────────────────────────────────────┘
//
// • `index` is preserved on the props for back-compat but is now ignored
//   visually. Old call-sites passing `index="01"` keep working without
//   changes; they simply lose the giant numeric anchor that no longer
//   matches the new admin language.
// • Actions slot floats right at md+, wraps below at small viewports.
// • `quiet` removes the hairline; used in drawers / nested surfaces.

interface AdminPageHeaderProps {
  /** @deprecated Kept for back-compat; v3 ignores it visually. */
  index?: string;
  /** Eyebrow text (e.g. "Comando comercial", "Pedidos"). */
  eyebrow: string;
  /** Page title — kept short, displayed in display type. */
  title: string;
  /** Optional subtitle, capped to ~64ch by the underlying utility. */
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="admin-page-eyebrow">{eyebrow}</span>
          <h1 className="admin-page-title">{title}</h1>
          {subtitle && <p className="admin-page-subtitle">{subtitle}</p>}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>

      {children}
    </header>
  );
}
