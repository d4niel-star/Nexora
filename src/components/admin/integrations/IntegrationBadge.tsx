import type { IntegrationStatus, IntegrationHealth, LogSeverity, LogStatus } from "@/types/integrations";
import { cn } from "@/lib/utils";

const statusLabels: Record<IntegrationStatus, string> = {
  connected: "Conectado",
  pending: "Pendiente",
  disconnected: "Desconectado",
  error: "Error",
  verifying: "Verificando",
  syncing: "Sincronizando",
  paused: "Pausado",
};

const statusStyles: Record<IntegrationStatus, string> = {
  connected: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/15",
  disconnected: "bg-gray-100 text-gray-600 ring-gray-500/10",
  error: "bg-red-50 text-red-600 ring-red-600/10",
  verifying: "bg-blue-50 text-blue-700 ring-blue-600/15",
  syncing: "bg-blue-50 text-blue-700 ring-blue-600/15",
  paused: "bg-gray-100 text-gray-500 ring-gray-500/10",
};

const healthLabels: Record<IntegrationHealth, string> = {
  operational: "Operativo",
  degraded: "Degradado",
  critical: "Critico",
};

const healthStyles: Record<IntegrationHealth, string> = {
  operational: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  degraded: "bg-amber-50 text-amber-700 ring-amber-600/15",
  critical: "bg-red-50 text-red-600 ring-red-600/10",
};

const severityLabels: Record<LogSeverity, string> = {
  info: "Info",
  warning: "Warning",
  error: "Error",
  critical: "Critico",
};

const severityStyles: Record<LogSeverity, string> = {
  info: "bg-blue-50 text-blue-700 ring-blue-600/15",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/15",
  error: "bg-red-50 text-red-600 ring-red-600/10",
  critical: "bg-red-50 text-red-600 ring-red-600/10",
};

const logStatusLabels: Record<LogStatus, string> = {
  success: "OK",
  failed: "Fallido",
  pending: "Pendiente",
};

const logStatusStyles: Record<LogStatus, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  failed: "bg-red-50 text-red-600 ring-red-600/10",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/15",
};

export function StatusBadge({ status, className }: { status: IntegrationStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ring-1 ring-inset", statusStyles[status], className)}>
      {statusLabels[status]}
    </span>
  );
}

export function HealthBadge({ health, className }: { health: IntegrationHealth; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ring-1 ring-inset", healthStyles[health], className)}>
      {healthLabels[health]}
    </span>
  );
}

export function LogSeverityBadge({ severity, className }: { severity: LogSeverity; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ring-1 ring-inset", severityStyles[severity], className)}>
      {severityLabels[severity]}
    </span>
  );
}

export function LogStatusBadge({ status, className }: { status: LogStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ring-1 ring-inset", logStatusStyles[status], className)}>
      {logStatusLabels[status]}
    </span>
  );
}

export function CategoryLabel({ category, className }: { category: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-600", className)}>
      {category}
    </span>
  );
}

export function HealthDot({ health }: { health: IntegrationHealth }) {
  return (
    <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full", health === "operational" ? "bg-emerald-500" : health === "degraded" ? "bg-amber-500" : "bg-red-500")} />
  );
}
