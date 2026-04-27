import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ─── AdminPanel ──────────────────────────────────────────────────────────
// Canonical admin "section card". Replaces the ad-hoc combinations of
// `rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 shadow-[var(--shadow-card)]`
// scattered across 30+ admin hubs. Composition:
//
//   ┌──────────────────────────────────────────────────────────┐
//   │ EYEBROW                              [actions slot]       │
//   │ Title (display)                                           │
//   │ Optional descriptor                                       │
//   ├──────────────────────────────────────────────────────────┤
//   │ children                                                  │
//   ├──────────────────────────────────────────────────────────┤  ← optional
//   │ footer                                                    │
//   └──────────────────────────────────────────────────────────┘
//
// • `tone` switches the visual register: "plain" (default, paper bg
//   + hairline) is for content panels, "raised" (paper + soft shadow)
//   is for hero/section cards, "tinted" (surface-2) is for dim
//   secondary panels.
// • `dense` removes the body padding so the panel can host its own
//   tables/lists with their own paddings (used by AdminTable).
// • `padded` overrides body padding for forms.

type Tone = "plain" | "raised" | "tinted";

interface AdminPanelProps {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  tone?: Tone;
  dense?: boolean;
  padded?: "sm" | "md" | "lg";
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
}

const PADDING_MAP: Record<NonNullable<AdminPanelProps["padded"]>, string> = {
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

const TONE_MAP: Record<Tone, string> = {
  plain: "admin-panel admin-panel--plain",
  raised: "admin-panel admin-panel--raised",
  tinted: "admin-panel admin-panel--tinted",
};

export function AdminPanel({
  eyebrow,
  title,
  description,
  actions,
  footer,
  tone = "plain",
  dense = false,
  padded = "md",
  children,
  className,
  bodyClassName,
}: AdminPanelProps) {
  const hasHeader = Boolean(eyebrow || title || description || actions);

  return (
    <section className={cn(TONE_MAP[tone], className)}>
      {hasHeader && (
        <header className="admin-panel-header">
          <div className="admin-panel-header-text">
            {eyebrow && (
              <span className="admin-panel-eyebrow">{eyebrow}</span>
            )}
            {title && <h2 className="admin-panel-title">{title}</h2>}
            {description && (
              <p className="admin-panel-description">{description}</p>
            )}
          </div>
          {actions && (
            <div className="admin-panel-actions">{actions}</div>
          )}
        </header>
      )}

      <div
        className={cn(
          dense ? "" : PADDING_MAP[padded],
          bodyClassName,
        )}
      >
        {children}
      </div>

      {footer && <footer className="admin-panel-footer">{footer}</footer>}
    </section>
  );
}
