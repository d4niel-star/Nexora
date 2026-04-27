import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ─── AdminPanel · Studio v4 wrapper ─────────────────────────────────────
//
// Back-compat shim that renders a flat `.nx-panel`. The old v3 panel
// (rounded-md card on surface-0 with shadow-card) is gone. Studio v4
// panels are pure hairline frames with no shadow and a denser header.
//
// The shim accepts every legacy prop:
//   · `eyebrow`  → small uppercase tag in the header.
//   · `title`    → bold panel title.
//   · `description` → optional sub-line.
//   · `actions`  → right-aligned action slot.
//   · `dense`    → removes body padding (use when embedding tables).
//   · `padded`   → body padding size (sm/md/lg).
//   · `tone`     → visually flat across the board now (kept for source
//     compat). The `raised` tone no longer adds a shadow because the
//     v4 language is intentionally flat.

type Tone = "plain" | "raised" | "tinted";

interface AdminPanelProps {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  /** @deprecated Studio v4 ships a single flat tone. */
  tone?: Tone;
  dense?: boolean;
  padded?: "sm" | "md" | "lg";
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
}

const PADDING_MAP: Record<NonNullable<AdminPanelProps["padded"]>, string> = {
  sm: "p-3",
  md: "p-4",
  lg: "p-5 sm:p-6",
};

export function AdminPanel({
  eyebrow,
  title,
  description,
  actions,
  footer,
  dense = false,
  padded = "md",
  children,
  className,
  bodyClassName,
}: AdminPanelProps) {
  const hasHeader = Boolean(eyebrow || title || description || actions);

  return (
    <section className={cn("nx-panel", className)}>
      {hasHeader && (
        <header className="nx-panel__header">
          <div>
            {eyebrow ? (
              <span
                style={{
                  display: "block",
                  fontSize: 10.5,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  color: "var(--ink-5)",
                  marginBottom: 4,
                }}
              >
                {eyebrow}
              </span>
            ) : null}
            {title ? <h2 className="nx-panel__title">{title}</h2> : null}
            {description ? <p className="nx-panel__sub">{description}</p> : null}
          </div>
          {actions ? <div style={{ display: "flex", gap: 6 }}>{actions}</div> : null}
        </header>
      )}

      <div
        className={cn(
          dense ? "nx-panel__body--flush" : PADDING_MAP[padded],
          bodyClassName,
        )}
      >
        {children}
      </div>

      {footer ? <div className="nx-panel__footer">{footer}</div> : null}
    </section>
  );
}
