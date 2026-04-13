import type { AIStoreProjectStatus, ProposalStyleType } from "@/types/ai-store-builder";
import { cn } from "@/lib/utils";

const projectStatusLabels: Record<AIStoreProjectStatus, string> = {
  draft: "Borrador",
  in_progress: "En Progreso",
  generated: "Generado",
  ready_to_publish: "Listo para publicar",
  active: "Activo",
  inactive: "Inactivo",
};

const projectStatusStyles: Record<AIStoreProjectStatus, string> = {
  draft: "bg-gray-100 text-gray-600 ring-gray-500/10",
  in_progress: "bg-blue-50 text-blue-700 ring-blue-600/15",
  generated: "bg-purple-50 text-purple-700 ring-purple-600/15",
  ready_to_publish: "bg-amber-50 text-amber-700 ring-amber-600/15",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  inactive: "bg-red-50 text-red-600 ring-red-600/10",
};

export function AIProjectStatusBadge({ status, className }: { status: AIStoreProjectStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ring-1 ring-inset", projectStatusStyles[status], className)}>
      {projectStatusLabels[status]}
    </span>
  );
}

const styleTypeLabels: Record<ProposalStyleType, string> = {
  minimal_premium: "Minimal Premium",
  high_conversion: "Conversion Alta",
  editorial: "Editorial / Marca",
};

export function AIStyleBadge({ style, className }: { style: ProposalStyleType; className?: string }) {
  const configs = {
    minimal_premium: "bg-gray-50 text-gray-800 border-gray-200",
    high_conversion: "bg-emerald-50 text-emerald-700 border-emerald-200",
    editorial: "bg-purple-50 text-purple-700 border-purple-200",
  };
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]", configs[style], className)}>
      {styleTypeLabels[style]}
    </span>
  );
}

export function AIRecommendationBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700", className)}>
      {label}
    </span>
  );
}
