import { cn } from "@/lib/utils";
import type { AppAvailability } from "@/lib/apps/registry";
import type { InstalledAppStatus } from "@/lib/apps/queries";

interface Props {
  availability: AppAvailability;
  installState: {
    installed: boolean;
    status: InstalledAppStatus | null;
  };
}

const chipBase =
  "inline-flex items-center h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-medium uppercase tracking-[0.14em]";

export function AppStatusBadge({ availability, installState }: Props) {
  // Coming-soon supersedes everything else.
  if (availability.kind === "coming-soon") {
    return <span className={cn(chipBase, "text-ink-5")}>Próximamente</span>;
  }
  if (availability.kind === "plan-locked") {
    return (
      <span className={cn(chipBase, "text-[color:var(--signal-warning)]")}>
        Requiere {availability.minPlan}
      </span>
    );
  }
  if (installState.installed && installState.status === "active") {
    return (
      <span className={cn(chipBase, "text-[color:var(--signal-success)]")}>
        Instalada
      </span>
    );
  }
  if (installState.installed && installState.status === "needs_setup") {
    return (
      <span className={cn(chipBase, "text-[color:var(--signal-warning)]")}>
        Requiere setup
      </span>
    );
  }
  if (installState.installed && installState.status === "disabled") {
    return <span className={cn(chipBase, "text-ink-5")}>Desactivada</span>;
  }
  return <span className={cn(chipBase, "text-ink-0")}>Disponible</span>;
}
