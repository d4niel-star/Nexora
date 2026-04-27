// ─── Nexora Studio v4 · Page Header ─────────────────────────────────────
//
// Compact, single-row page header. Replaces the v3 AdminPageHeader stack
// (eyebrow + 30px display title + subtitle paragraph + actions block on
// the right) which produced a tall, magazine-style banner that felt
// editorial rather than operational.
//
// Studio v4 takes after Shopify Admin: the page header is one short row
// — H1 medium + optional status pill + actions on the right — followed
// by a single hairline that separates header from workspace. An optional
// short subtitle sits below the row at 13px ink-5.
//
// All visuals come from the .nx-page-header* tokens defined in
// src/app/globals.css. There are no inline colors here.

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type NexoraStatusTone = "neutral" | "success" | "warning" | "danger";

export interface NexoraPageHeaderProps {
  /** Page title — kept short, sentence case. */
  title: string;
  /** Optional one-line description shown below the row. */
  subtitle?: string;
  /** Optional status pill rendered next to the title (e.g. "Borrador"). */
  status?: { label: string; tone?: NexoraStatusTone };
  /** Optional actions slot, rendered right-aligned. Keep to 1–3 buttons. */
  actions?: ReactNode;
  /** Extra class on the wrapper if a page needs to override spacing. */
  className?: string;
}

const TONE_CLASS: Record<NexoraStatusTone, string> = {
  neutral: "",
  success: "nx-page-header__status--success",
  warning: "nx-page-header__status--warning",
  danger: "nx-page-header__status--danger",
};

export function NexoraPageHeader({
  title,
  subtitle,
  status,
  actions,
  className,
}: NexoraPageHeaderProps) {
  return (
    <header className={cn("nx-page-header", className)}>
      <div className="nx-page-header__row">
        <div className="nx-page-header__main">
          <h1 className="nx-page-header__title">{title}</h1>
          {status ? (
            <span
              className={cn(
                "nx-page-header__status",
                status.tone ? TONE_CLASS[status.tone] : "",
              )}
            >
              {status.label}
            </span>
          ) : null}
        </div>
        {actions ? <div className="nx-page-header__actions">{actions}</div> : null}
      </div>
      {subtitle ? <p className="nx-page-header__sub">{subtitle}</p> : null}
    </header>
  );
}
