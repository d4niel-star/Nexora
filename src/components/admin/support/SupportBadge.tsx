import type { TicketStatus, TicketPriority, SystemStatusType, ActivitySeverity, HelpArticleStatus } from "@/types/support";
import { cn } from "@/lib/utils";

const ticketStatusLabels: Record<TicketStatus, string> = {
  open: "Abierto",
  in_progress: "En progreso",
  pending: "Pendiente",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const ticketStatusStyles: Record<TicketStatus, string> = {
  open: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  in_progress: "bg-blue-50 text-blue-700 ring-blue-600/15",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/15",
  resolved: "bg-gray-100 text-gray-600 ring-gray-500/10",
  closed: "bg-gray-100 text-gray-600 ring-gray-500/10",
};

export function SupportTicketStatusBadge({ status, className }: { status: TicketStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ring-1 ring-inset", ticketStatusStyles[status], className)}>
      {ticketStatusLabels[status]}
    </span>
  );
}

const priorityLabels: Record<TicketPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Critica",
};

export function SupportPriorityBadge({ priority, className }: { priority: TicketPriority; className?: string }) {
  const configs = {
    low: "bg-gray-50 text-gray-600 border-gray-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    high: "bg-orange-50 text-orange-700 border-orange-200",
    critical: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]", configs[priority], className)}>
      {priorityLabels[priority]}
    </span>
  );
}

const systemStatusLabels: Record<SystemStatusType, string> = {
  operational: "Operativo",
  degraded: "Degradado",
  incident: "Incidente",
  maintenance: "Mantenimiento",
};

const systemStatusStyles: Record<SystemStatusType, string> = {
  operational: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  degraded: "bg-amber-50 text-amber-700 ring-amber-600/15",
  incident: "bg-red-50 text-red-600 ring-red-600/10",
  maintenance: "bg-blue-50 text-blue-700 ring-blue-600/15",
};

export function SupportSystemStatusBadge({ status, className }: { status: SystemStatusType; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ring-1 ring-inset", systemStatusStyles[status], className)}>
      {systemStatusLabels[status]}
    </span>
  );
}

const severityLabels: Record<ActivitySeverity, string> = {
  info: "Info",
  warning: "Warning",
  error: "Error",
  critical: "Critico",
};

export function SupportSeverityBadge({ severity, className }: { severity: ActivitySeverity; className?: string }) {
  const configs = {
    info: "bg-gray-100 text-gray-600 ring-gray-500/10",
    warning: "bg-amber-50 text-amber-700 ring-amber-600/15",
    error: "bg-red-50 text-red-600 ring-red-600/10",
    critical: "bg-red-100 text-red-700 ring-red-600/20",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ring-1 ring-inset", configs[severity], className)}>
      {severityLabels[severity]}
    </span>
  );
}

const articleStatusLabels: Record<HelpArticleStatus, string> = {
  published: "Publicado",
  draft: "Borrador",
  archived: "Archivado",
};

export function SupportArticleStatusBadge({ status, className }: { status: HelpArticleStatus; className?: string }) {
  const configs = {
    published: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
    draft: "bg-gray-100 text-gray-600 ring-gray-500/10",
    archived: "bg-amber-50 text-amber-700 ring-amber-600/15",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ring-1 ring-inset", configs[status], className)}>
      {articleStatusLabels[status]}
    </span>
  );
}
