import { cn } from "@/lib/utils";

export type CustomerLifecycleStatus = "active" | "inactive" | "risk";
export type CustomerSegment = "new" | "recurring" | "vip";

type CustomerBadgeTone =
  | CustomerSegment
  | CustomerLifecycleStatus
  | "high_value";

const badgeLabels: Record<CustomerBadgeTone, string> = {
  new: "Nuevo",
  recurring: "Recurrente",
  vip: "VIP",
  active: "Activo",
  inactive: "Inactivo",
  risk: "Riesgo",
  high_value: "Alto valor",
};

const badgeStyles: Record<CustomerBadgeTone, string> = {
  new: "bg-[var(--surface-2)] text-accent-500 border-[color:var(--hairline)]",
  recurring: "bg-[var(--surface-2)] text-ink-4 border-[color:var(--hairline)]",
  vip: "bg-[var(--surface-2)] text-[color:var(--signal-warning)] border-[color:var(--hairline)]",
  active: "bg-[var(--surface-2)] text-ink-4 border-[color:var(--hairline)]",
  inactive: "bg-[var(--surface-2)] text-ink-6 border-[color:var(--hairline)]",
  risk: "bg-[var(--surface-2)] text-[color:var(--signal-danger)] border-[color:var(--hairline)]",
  high_value: "bg-[var(--surface-2)] text-[color:var(--signal-success)] border-[color:var(--hairline)]",
};

export function CustomerBadge({
  tone,
  className,
}: {
  tone: CustomerBadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--r-xs)] border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
        badgeStyles[tone],
        className
      )}
    >
      {badgeLabels[tone]}
    </span>
  );
}
