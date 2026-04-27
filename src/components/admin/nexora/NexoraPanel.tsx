// ─── Nexora Studio v4 · Panel ───────────────────────────────────────────
//
// Flat, unshadowed panel with a hairline border. Replaces v3 ad-hoc
// `bg-surface-0 rounded-md shadow-card` cards. Tokens live in
// .nx-panel{,__header,__title,__sub,__body,__footer}.

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface NexoraPanelProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  /** When true, body has 0 padding (used to embed tables/lists). */
  flush?: boolean;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function NexoraPanel({
  title,
  subtitle,
  actions,
  flush,
  footer,
  children,
  className,
}: NexoraPanelProps) {
  const hasHeader = Boolean(title || actions);
  return (
    <section className={cn("nx-panel", className)}>
      {hasHeader ? (
        <header className="nx-panel__header">
          <div>
            {title ? <h2 className="nx-panel__title">{title}</h2> : null}
            {subtitle ? <p className="nx-panel__sub">{subtitle}</p> : null}
          </div>
          {actions ? <div style={{ display: "flex", gap: 6 }}>{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn("nx-panel__body", flush ? "nx-panel__body--flush" : "")}>
        {children}
      </div>
      {footer ? <div className="nx-panel__footer">{footer}</div> : null}
    </section>
  );
}
