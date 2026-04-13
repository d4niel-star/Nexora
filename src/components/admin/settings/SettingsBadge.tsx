import type { SettingsStatus, UserRole } from "@/types/settings";
import { cn } from "@/lib/utils";

const statusLabels: Record<SettingsStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  pending: "Pendiente",
  verified: "Verificado",
  error: "Error",
  attention: "Atencion",
  configured: "Configurado",
  not_configured: "No configurado",
  secure: "Seguro",
  risk: "Riesgo",
};

const statusStyles: Record<SettingsStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  inactive: "bg-gray-100 text-gray-600 ring-gray-500/10",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/15",
  verified: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  error: "bg-red-50 text-red-600 ring-red-600/10",
  attention: "bg-amber-50 text-amber-700 ring-amber-600/15",
  configured: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  not_configured: "bg-gray-100 text-gray-600 ring-gray-500/10",
  secure: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  risk: "bg-red-50 text-red-600 ring-red-600/10",
};

export function SettingsStatusBadge({ status, className }: { status: SettingsStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ring-1 ring-inset", statusStyles[status], className)}>
      {statusLabels[status]}
    </span>
  );
}

const roleLabels: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  operations: "Operaciones",
  marketing: "Marketing",
  support: "Soporte",
};

export function RoleBadge({ role, className }: { role: UserRole; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-600", className)}>
      {roleLabels[role]}
    </span>
  );
}

export function FrequencyBadge({ frequency, className }: { frequency: string; className?: string }) {
  const labels: Record<string, string> = { instant: "Inmediata", daily: "Diaria", weekly: "Semanal" };
  return (
    <span className={cn("inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-600", className)}>
      {labels[frequency] || frequency}
    </span>
  );
}

export function StrengthBadge({ strength }: { strength: "weak" | "medium" | "strong" }) {
  const configs = {
    weak: { label: "Debil", style: "bg-red-50 text-red-600 ring-red-600/10" },
    medium: { label: "Media", style: "bg-amber-50 text-amber-700 ring-amber-600/15" },
    strong: { label: "Fuerte", style: "bg-emerald-50 text-emerald-700 ring-emerald-600/15" },
  };
  const c = configs[strength];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ring-1 ring-inset", c.style)}>
      {c.label}
    </span>
  );
}
