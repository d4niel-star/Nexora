import type { ComponentType, ReactNode } from "react";
import { NexoraEmpty } from "@/components/admin/nexora/NexoraTable";

// ─── AdminEmptyState · Studio v4 wrapper ───────────────────────────────
//
// Back-compat shim that delegates to `.nx-empty`. The old icon-led
// horizontal block (with tone-tinted icon chip) is retired in favour
// of a centered, icon-less micro empty state. `icon` and `tone` are
// accepted for source compatibility but no longer rendered — Studio v4
// keeps empty states small and contextual.

type Tone = "neutral" | "success" | "warning" | "info";

interface AdminEmptyStateProps {
  /** @deprecated Studio v4 doesn't render an icon chip. */
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: ReactNode;
  body?: ReactNode;
  primary?: ReactNode;
  secondary?: ReactNode;
  /** @deprecated Studio v4 doesn't tint the empty state. */
  tone?: Tone;
  /** @deprecated Studio v4 ships a single density. */
  compact?: boolean;
  className?: string;
}

export function AdminEmptyState({
  title,
  body,
  primary,
  secondary,
}: AdminEmptyStateProps) {
  // The NexoraEmpty signature only takes string title/body; convert
  // ReactNode by stringifying when possible. In practice every call
  // site uses plain strings so this is safe.
  return (
    <NexoraEmpty
      title={String(title)}
      body={typeof body === "string" ? body : undefined}
      actions={
        primary || secondary ? (
          <>
            {primary}
            {secondary}
          </>
        ) : undefined
      }
    />
  );
}
