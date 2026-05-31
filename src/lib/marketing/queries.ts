"use server";

import { requirePermission } from "@/lib/rbac/guard";
import { logSystemEvent } from "@/lib/observability/audit";
import { previewAudience, type AudienceFilter, type AudiencePreview } from "./audiences";
import { getTemplateById } from "./templates";

// ─── Marketing Server Actions (Phase 7D.5) ───────────────────────────
// Read-only marketing operations: audience preview + template preview.
// Both are RBAC-gated (marketing.read) and audit-logged. No send path
// exists — see eligibility.ts for why.

export async function previewAudienceAction(filter: AudienceFilter): Promise<AudiencePreview> {
  const actor = await requirePermission("marketing.read");

  const preview = await previewAudience(actor.storeId, filter);

  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "marketing",
    eventType: "marketing_audience_viewed",
    severity: "info",
    source: "admin_panel",
    message: `Audiencia previsualizada: ${preview.count} destinatarios`,
    actorId: actor.userId,
    actorRole: actor.role,
    metadata: {
      count: preview.count,
      truncated: preview.truncated,
      filterKeys: Object.keys(filter).filter((k) => (filter as Record<string, unknown>)[k] !== undefined),
    },
  }).catch(() => undefined);

  return preview;
}

export async function previewTemplateAction(templateId: string): Promise<{ id: string; name: string; status: string; note: string }> {
  const actor = await requirePermission("marketing.read");
  const tpl = getTemplateById(templateId);
  if (!tpl) throw new Error("Template no encontrado.");

  await logSystemEvent({
    storeId: actor.storeId,
    entityType: "marketing",
    entityId: templateId,
    eventType: "marketing_template_previewed",
    severity: "info",
    source: "admin_panel",
    message: `Template previsualizado: ${tpl.name}`,
    actorId: actor.userId,
    actorRole: actor.role,
    metadata: { templateId, status: tpl.status },
  }).catch(() => undefined);

  return { id: tpl.id, name: tpl.name, status: tpl.status, note: tpl.note };
}
