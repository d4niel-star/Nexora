import { redirect } from "next/navigation";
import { resolveActor } from "@/lib/rbac/guard";
import { roleHasPermission } from "@/lib/rbac/permissions";
import { rangeFromPreset, RANGE_PRESETS, type RangePreset } from "@/lib/analytics/dates";
import {
  getRevenueIntelligence,
  getConversionIntelligence,
  getProductIntelligence,
  getCustomerIntelligence,
  getOperationalIntelligence,
} from "@/lib/analytics/queries";
import { logSystemEvent } from "@/lib/observability/audit";
import { AnalyticsHubClient } from "./AnalyticsHubClient";

interface PageProps {
  searchParams: Promise<{ range?: string }>;
}

export default async function AnalyticsHubPage({ searchParams }: PageProps) {
  const actor = await resolveActor();
  if (!actor) redirect("/admin/dashboard");
  if (!roleHasPermission(actor.role, "analytics.view")) {
    redirect("/admin/dashboard");
  }

  const sp = await searchParams;
  const validPresets = RANGE_PRESETS.map((p) => p.value);
  const preset: RangePreset = (validPresets as string[]).includes(sp.range ?? "")
    ? (sp.range as RangePreset)
    : "28d";

  const range = rangeFromPreset(preset);

  const [revenue, conversion, products, customers, operations] = await Promise.all([
    getRevenueIntelligence(actor.storeId, range),
    getConversionIntelligence(actor.storeId, range),
    getProductIntelligence(actor.storeId, range),
    getCustomerIntelligence(actor.storeId, range),
    getOperationalIntelligence(actor.storeId),
  ]);

  // Audit-log access — analytics views can expose aggregated PII so the
  // GDPR-ready architecture treats them as sensitive reads.
  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "analytics",
    entityId: preset,
    eventType: "analytics_viewed",
    severity: "info",
    source: "admin_panel",
    message: `Analytics viewed (range=${preset})`,
    actorId: actor.userId,
    actorRole: actor.role,
  }).catch(() => undefined);

  return (
    <AnalyticsHubClient
      preset={preset}
      revenue={revenue}
      conversion={conversion}
      products={products}
      customers={customers}
      operations={operations}
    />
  );
}
