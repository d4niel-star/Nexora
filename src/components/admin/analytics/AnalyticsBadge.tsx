import type { AnalyticsTrend, PerformanceLevel } from "@/types/analytics";
import { cn } from "@/lib/utils";

const trendLabels: Record<AnalyticsTrend, string> = {
  up: "En crecimiento",
  down: "En caida",
  stable: "Estable",
};

const trendStyles: Record<AnalyticsTrend, string> = {
  up: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  down: "bg-red-50 text-red-600 ring-red-600/10",
  stable: "bg-gray-100 text-gray-600 ring-gray-500/10",
};

const performanceLabels: Record<PerformanceLevel, string> = {
  high: "Alto",
  medium: "Medio",
  low: "Bajo",
  critical: "Critico",
};

const performanceStyles: Record<PerformanceLevel, string> = {
  high: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  medium: "bg-gray-100 text-gray-600 ring-gray-500/10",
  low: "bg-amber-50 text-amber-700 ring-amber-600/15",
  critical: "bg-red-50 text-red-600 ring-red-600/10",
};

const severityStyles: Record<string, string> = {
  critical: "bg-red-50 text-red-600 ring-red-600/10",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/15",
  info: "bg-blue-50 text-blue-700 ring-blue-600/15",
};

const severityLabels: Record<string, string> = {
  critical: "Critico",
  warning: "Alerta",
  info: "Info",
};

export function TrendBadge({ trend, className }: { trend: AnalyticsTrend; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ring-1 ring-inset",
        trendStyles[trend],
        className,
      )}
    >
      {trendLabels[trend]}
    </span>
  );
}

export function PerformanceBadge({ level, className }: { level: PerformanceLevel; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ring-1 ring-inset",
        performanceStyles[level],
        className,
      )}
    >
      {performanceLabels[level]}
    </span>
  );
}

export function SeverityBadge({ severity, className }: { severity: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ring-1 ring-inset",
        severityStyles[severity] ?? "bg-gray-100 text-gray-600 ring-gray-500/10",
        className,
      )}
    >
      {severityLabels[severity] ?? severity}
    </span>
  );
}

export function CategoryBadge({ category, className }: { category: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-600",
        className,
      )}
    >
      {category}
    </span>
  );
}
