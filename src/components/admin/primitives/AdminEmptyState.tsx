import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

// ─── AdminEmptyState ─────────────────────────────────────────────────────
// Compact, contextual empty state. Replaces the previous 360px-tall
// dashed-border placeholders that dominated whole pages whenever a
// table or list happened to be empty. The new pattern is a balanced
// inline block:
//
//   [icon]  Title
//           Body line — short and useful.
//           [Primary CTA] [Secondary CTA]
//
// • `icon` accepts any Lucide component.
// • `tone` switches the icon tint: "neutral" (default), "success",
//   "warning", "info".
// • `compact` removes outer padding so the empty state can sit inside
//   a table cell.

type Tone = "neutral" | "success" | "warning" | "info";

interface AdminEmptyStateProps {
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: ReactNode;
  body?: ReactNode;
  primary?: ReactNode;
  secondary?: ReactNode;
  tone?: Tone;
  compact?: boolean;
  className?: string;
}

const TONE_MAP: Record<Tone, string> = {
  neutral: "admin-empty-icon admin-empty-icon--neutral",
  success: "admin-empty-icon admin-empty-icon--success",
  warning: "admin-empty-icon admin-empty-icon--warning",
  info: "admin-empty-icon admin-empty-icon--info",
};

export function AdminEmptyState({
  icon: Icon,
  title,
  body,
  primary,
  secondary,
  tone = "neutral",
  compact = false,
  className,
}: AdminEmptyStateProps) {
  return (
    <div
      className={cn(
        "admin-empty-block",
        compact && "admin-empty-block--compact",
        className,
      )}
    >
      {Icon && (
        <div className={TONE_MAP[tone]}>
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
      )}
      <div className="admin-empty-text">
        <p className="admin-empty-title">{title}</p>
        {body && <p className="admin-empty-body">{body}</p>}
        {(primary || secondary) && (
          <div className="admin-empty-actions">
            {primary}
            {secondary}
          </div>
        )}
      </div>
    </div>
  );
}
