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
  new: "bg-blue-50 text-blue-700 ring-blue-600/15",
  recurring: "bg-gray-100 text-gray-700 ring-gray-500/10",
  vip: "bg-amber-50 text-amber-700 ring-amber-600/15",
  active: "bg-gray-100 text-gray-600 ring-gray-500/10",
  inactive: "bg-gray-100 text-gray-500 ring-gray-500/10",
  risk: "bg-red-50 text-red-700 ring-red-600/10",
  high_value: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
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
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ring-1 ring-inset",
        badgeStyles[tone],
        className
      )}
    >
      {badgeLabels[tone]}
    </span>
  );
}
