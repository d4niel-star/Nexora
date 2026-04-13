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

const statusStyles: Record<FinanceStatus, string> = {
  collected: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/15",
  refunded: "bg-gray-100 text-gray-600 ring-gray-500/10",
  partial: "bg-amber-50 text-amber-700 ring-amber-600/15",
  failed: "bg-red-50 text-red-600 ring-red-600/10",
  review: "bg-blue-50 text-blue-700 ring-blue-600/15",
  exported: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  scheduled: "bg-blue-50 text-blue-700 ring-blue-600/15",
  critical: "bg-red-50 text-red-600 ring-red-600/10",
  stable: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
};



export function FinanceStatusBadge({ status, className }: { status: FinanceStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ring-1 ring-inset", statusStyles[status], className)}>
      {statusLabels[status]}
    </span>
  );
}

export function MarginHealthBadge({ health, className }: { health: "stable" | "warning" | "critical"; className?: string }) {
  const styles = { stable: "bg-emerald-50 text-emerald-700 ring-emerald-600/15", warning: "bg-amber-50 text-amber-700 ring-amber-600/15", critical: "bg-red-50 text-red-600 ring-red-600/10" };
  const labels = { stable: "Estable", warning: "Bajo", critical: "Critico" };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ring-1 ring-inset", styles[health], className)}>
      {labels[health]}
    </span>
  );
}

export function ChannelBadge({ channel, className }: { channel: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-600", className)}>
      {channel}
    </span>
  );
}

export function ExportTypeBadge({ type, className }: { type: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-600", className)}>
      {type}
    </span>
  );
}
