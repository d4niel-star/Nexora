import type { StoreStatus } from "@/types/store";
import { cn } from "@/lib/utils";

// ─── Store status/color primitives ───────────────────────────────────────
// After the Mi-tienda simplification only two consumers remain:
//   · StoreStatusBadge → used by DomainSettingsView
//   · ColorDot         → used by StorePage SummaryView
// Section/Page/Nav badges were only used by the old StoreDrawer that
// backed the Branding/Navegación/Páginas tabs and were removed along
// with those surfaces.

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

const chipBase = "inline-flex items-center h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-medium uppercase tracking-[0.14em]";

const statusTone: Record<StoreStatus, string> = {
  published: "text-[color:var(--signal-success)]",
  draft: "text-[color:var(--signal-warning)]",
  hidden: "text-ink-5",
  active: "text-[color:var(--signal-success)]",
  inactive: "text-ink-5",
  verified: "text-[color:var(--signal-success)]",
  pending: "text-[color:var(--signal-warning)]",
  error: "text-[color:var(--signal-danger)]",
  connected: "text-[color:var(--signal-success)]",
  disconnected: "text-[color:var(--signal-danger)]",
};

export function StoreStatusBadge({ status, className }: { status: StoreStatus; className?: string }) {
  return (
    <span className={cn(chipBase, statusTone[status], className)}>
      {statusLabels[status]}
    </span>
  );
}

export function ColorDot({ color, size = "md" }: { color: string; size?: "sm" | "md" }) {
  return (
    <span
      className={cn("inline-block shrink-0 rounded-[var(--r-xs)] border border-[color:var(--hairline)]", size === "sm" ? "h-4 w-4" : "h-5 w-5")}
      style={{ backgroundColor: color }}
      aria-label={`Color ${color}`}
    />
  );
}
