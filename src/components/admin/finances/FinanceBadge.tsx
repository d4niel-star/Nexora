import type { FinanceStatus } from "@/types/finances";
import { cn } from "@/lib/utils";

const statusLabels: Record<FinanceStatus, string> = {
  collected: "Cobrado",
  pending: "Pendiente",
  refunded: "Reembolsado",
  partial: "Parcial",
  failed: "Fallido",
  review: "En revision",
  exported: "Exportado",
  scheduled: "Programado",
  critical: "Critico",
  stable: "Estable",
};

const statusTone: Record<FinanceStatus, string> = {
  collected: "text-[color:var(--signal-success)]",
  pending: "text-[color:var(--signal-warning)]",
  refunded: "text-ink-5",
  partial: "text-[color:var(--signal-warning)]",
  failed: "text-[color:var(--signal-danger)]",
  review: "text-ink-3",
  exported: "text-[color:var(--signal-success)]",
  scheduled: "text-ink-3",
  critical: "text-[color:var(--signal-danger)]",
  stable: "text-[color:var(--signal-success)]",
};

const chipBase = "inline-flex items-center h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-medium uppercase tracking-[0.14em]";

export function FinanceStatusBadge({ status, className }: { status: FinanceStatus; className?: string }) {
  return (
    <span className={cn(chipBase, statusTone[status], className)}>
      {statusLabels[status]}
    </span>
  );
}

export function MarginHealthBadge({ health, className }: { health: "stable" | "warning" | "critical"; className?: string }) {
  const tone = {
    stable: "text-[color:var(--signal-success)]",
    warning: "text-[color:var(--signal-warning)]",
    critical: "text-[color:var(--signal-danger)]",
  };
  const labels = { stable: "Estable", warning: "Bajo", critical: "Crítico" };
  return (
    <span className={cn(chipBase, tone[health], className)}>
      {labels[health]}
    </span>
  );
}

export function ChannelBadge({ channel, className }: { channel: string; className?: string }) {
  return (
    <span className={cn(chipBase, "text-ink-5", className)}>
      {channel}
    </span>
  );
}

export function ExportTypeBadge({ type, className }: { type: string; className?: string }) {
  return (
    <span className={cn(chipBase, "text-ink-5", className)}>
      {type}
    </span>
  );
}
