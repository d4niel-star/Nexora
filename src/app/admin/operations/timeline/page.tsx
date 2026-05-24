import { redirect } from "next/navigation";
import { resolveActor } from "@/lib/rbac/guard";
import { roleHasPermission } from "@/lib/rbac/permissions";
import { listTimelineEvents } from "@/lib/observability/timeline";
import { TimelineClient } from "./TimelineClient";

interface PageProps {
  searchParams: Promise<{
    severity?: string;
    eventType?: string;
    actorId?: string;
    correlationId?: string;
    entityType?: string;
    from?: string;
    to?: string;
  }>;
}

// ─── /admin/operations/timeline ──────────────────────────────────────
// Forensic timeline of every SystemEvent. Gated by `operations.read`.
// Filters round-trip through searchParams so deep links / sharing work
// without client state.

export default async function TimelinePage({ searchParams }: PageProps) {
  const actor = await resolveActor();
  if (!actor) redirect("/admin/dashboard");
  if (!roleHasPermission(actor.role, "operations.read")) {
    redirect("/admin/operations");
  }

  const sp = await searchParams;
  const severity = sp.severity && ["info", "warn", "error", "critical"].includes(sp.severity)
    ? (sp.severity as "info" | "warn" | "error" | "critical")
    : undefined;

  const dateFrom = sp.from ? new Date(sp.from) : undefined;
  const dateTo = sp.to ? new Date(sp.to) : undefined;

  const { rows, nextCursor } = await listTimelineEvents({
    storeId: actor.storeId,
    severity,
    eventType: sp.eventType?.slice(0, 80) || undefined,
    actorId: sp.actorId?.slice(0, 80) || undefined,
    correlationId: sp.correlationId?.slice(0, 80) || undefined,
    entityType: sp.entityType?.slice(0, 80) || undefined,
    dateFrom: dateFrom && !isNaN(dateFrom.getTime()) ? dateFrom : undefined,
    dateTo: dateTo && !isNaN(dateTo.getTime()) ? dateTo : undefined,
    limit: 50,
  });

  return (
    <TimelineClient
      rows={rows}
      hasMore={Boolean(nextCursor)}
      currentFilters={{
        severity: sp.severity ?? "",
        eventType: sp.eventType ?? "",
        actorId: sp.actorId ?? "",
        correlationId: sp.correlationId ?? "",
        entityType: sp.entityType ?? "",
        from: sp.from ?? "",
        to: sp.to ?? "",
      }}
    />
  );
}
