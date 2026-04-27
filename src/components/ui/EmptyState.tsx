import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// ─── Shared EmptyState primitive ─────────────────────────────────────────
// Before this component existed, 28+ admin screens each rolled their own
// empty-state layout. Four different heading sizes (text-xl bold, text-
// [16px] semibold, text-[18px] semibold, …), four different icon tiles,
// four different spacing scales, and a handful of "No hay datos" one-
// liners with nothing actionable. This primitive enforces a single
// visual grammar + the "useful empty" rule: every empty state must
// explain what's missing, why it matters, and the next step.
//
// Design rules (non-negotiable):
//   - One icon tile size (56x56) and one heading size (text-[17px]).
//   - Description is required. Lone "No hay X" titles are banned.
//   - Either `action`, `secondaryAction` or nothing — but if you pass an
//     action, its label must be a concrete verb ("Crear bundle",
//     "Cargar productos") — never "Ver más" or "Continuar".
//   - No emoji, no accent colours on the icon tile. Neutral by default
//     because the empty state itself is not a failure; severity cues
//     belong on status chips, not on whitespace.

export type EmptyStateTone = "neutral" | "muted";

export interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  /** True for the primary CTA style (solid). */
  primary?: boolean;
}

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  /** Padding variant — "compact" for in-card empties, "default" for page-level. */
  size?: "compact" | "default";
  tone?: EmptyStateTone;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  size = "default",
  tone = "neutral",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "compact" ? "py-12 px-6" : "py-20 px-6",
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "mb-5 inline-flex h-14 w-14 items-center justify-center rounded-[var(--r-sm)] border",
            tone === "muted"
              ? "border-transparent bg-[var(--surface-1)]"
              : "border-[color:var(--hairline)] bg-[var(--surface-1)]",
          )}
        >
          <Icon className="h-5 w-5 text-ink-5" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="max-w-md text-[17px] font-semibold leading-[1.2] tracking-[-0.02em] text-ink-0">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-[13px] leading-[1.55] text-ink-5">
        {description}
      </p>
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {action && <EmptyStateButton action={action} isPrimary />}
          {secondaryAction && (
            <EmptyStateButton action={secondaryAction} isPrimary={false} />
          )}
        </div>
      )}
    </div>
  );
}

function EmptyStateButton({
  action,
  isPrimary,
}: {
  action: EmptyStateAction;
  isPrimary: boolean;
}) {
  const base = "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition-colors focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none";
  const primary = "bg-ink-0 text-ink-12 hover:bg-ink-2";
  const secondary = "border border-[color:var(--hairline)] bg-[var(--surface-0)] text-ink-0 hover:bg-[var(--surface-2)]";
  const cls = cn(base, action.primary ?? isPrimary ? primary : secondary);

  const content = (
    <>
      {action.label}
      <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
    </>
  );

  if (action.href) {
    return (
      <Link href={action.href} className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={action.onClick} className={cls}>
      {content}
    </button>
  );
}
