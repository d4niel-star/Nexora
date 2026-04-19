import type { AIStoreProjectStatus, ProposalStyleType } from "@/types/ai-store-builder";
import { cn } from "@/lib/utils";

// ─── AI Store Badges ───
// Rectangular hairline chips with tokenized signal tints. No pills, no
// pastel wash — status is carried by a single ink-3/signal text color
// over a neutral hairline surface.

const projectStatusLabels: Record<AIStoreProjectStatus, string> = {
  draft: "Borrador",
  in_progress: "En progreso",
  generated: "Generado",
  ready_to_publish: "Listo para publicar",
  active: "Activo",
  inactive: "Inactivo",
};

const projectStatusStyles: Record<AIStoreProjectStatus, string> = {
  draft:
    "border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-5",
  in_progress:
    "border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-3",
  generated:
    "border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-3",
  ready_to_publish:
    "border-[color:var(--hairline)] bg-[var(--surface-1)] text-[color:var(--signal-warning)]",
  active:
    "border-[color:var(--hairline)] bg-[var(--surface-1)] text-[color:var(--signal-success)]",
  inactive:
    "border-[color:var(--hairline)] bg-[var(--surface-1)] text-[color:var(--signal-danger)]",
};

export function AIProjectStatusBadge({
  status,
  className,
}: {
  status: AIStoreProjectStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center h-6 rounded-[var(--r-xs)] border px-2 text-[10px] font-medium uppercase tracking-[0.14em]",
        projectStatusStyles[status],
        className,
      )}
    >
      {projectStatusLabels[status]}
    </span>
  );
}

const styleTypeLabels: Record<ProposalStyleType, string> = {
  minimal_premium: "Minimal Premium",
  high_conversion: "Alta Conversión",
  editorial: "Editorial",
};

export function AIStyleBadge({
  style,
  className,
}: {
  style: ProposalStyleType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-3",
        className,
      )}
    >
      {styleTypeLabels[style]}
    </span>
  );
}

export function AIRecommendationBadge({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--signal-warning)]",
        className,
      )}
    >
      {label}
    </span>
  );
}
