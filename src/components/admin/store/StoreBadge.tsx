import type { StoreStatus } from "@/types/store";
import { cn } from "@/lib/utils";

const statusLabels: Record<StoreStatus, string> = {
  published: "Publicado",
  draft: "Borrador",
  hidden: "Oculto",
  active: "Activo",
  inactive: "Inactivo",
  verified: "Verificado",
  pending: "Pendiente",
  error: "Error",
  connected: "Conectado",
  disconnected: "Desconectado",
};

const statusStyles: Record<StoreStatus, string> = {
  published: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  draft: "bg-amber-50 text-amber-700 ring-amber-600/15",
  hidden: "bg-gray-100 text-gray-600 ring-gray-500/10",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  inactive: "bg-gray-100 text-gray-600 ring-gray-500/10",
  verified: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/15",
  error: "bg-red-50 text-red-600 ring-red-600/10",
  connected: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  disconnected: "bg-red-50 text-red-600 ring-red-600/10",
};

export function StoreStatusBadge({ status, className }: { status: StoreStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ring-1 ring-inset", statusStyles[status], className)}>
      {statusLabels[status]}
    </span>
  );
}

export function SectionTypeBadge({ type, className }: { type: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-600", className)}>
      {type}
    </span>
  );
}

export function PageTypeBadge({ type, className }: { type: "system" | "custom"; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-600", className)}>
      {type === "system" ? "Sistema" : "Personalizada"}
    </span>
  );
}

export function NavGroupBadge({ group, className }: { group: string; className?: string }) {
  const labels: Record<string, string> = { main: "Menu principal", footer: "Footer", "quick-links": "Links rapidos" };
  return (
    <span className={cn("inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-600", className)}>
      {labels[group] || group}
    </span>
  );
}

export function ColorDot({ color, size = "md" }: { color: string; size?: "sm" | "md" }) {
  return (
    <span
      className={cn("inline-block shrink-0 rounded-full border border-gray-200 shadow-sm", size === "sm" ? "h-4 w-4" : "h-5 w-5")}
      style={{ backgroundColor: color }}
      aria-label={`Color ${color}`}
    />
  );
}
