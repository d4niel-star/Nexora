"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logSystemEvent } from "@/lib/observability/audit";
import { getDefaultStore } from "@/lib/store-engine/queries";
import { prisma } from "@/lib/db/prisma";

// ─── Intent Registry ───
const INTENT_REGISTRY = [
  {
    id: "ads",
    keywords: ["ad", "ads", "campaña", "pauta", "roas", "vender", "publicidad", "performance", "meta", "google ads", "tiktok"],
    route: "/admin/ai/ads",
  },
  {
    id: "finances",
    keywords: ["finanza", "plata", "cobro", "margen", "ingreso", "dinero", "revenue", "comision", "reembolso", "factura", "neto"],
    route: "/admin/ai/finances",
  },
  {
    id: "catalog",
    keywords: ["catalogo", "producto", "stock", "inventario", "precio", "sku", "variante"],
    route: "/admin/ai/catalog",
  },
  {
    id: "orders",
    keywords: ["pedido", "orden", "envio", "fulfillment", "tracking", "entrega"],
    route: "/admin/ai/operations",
  },
] as const;

function resolveIntent(input: string): string {
  const cmd = input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  for (const intent of INTENT_REGISTRY) {
    if (intent.keywords.some(kw => cmd.includes(kw))) {
      return intent.route;
    }
  }
  
  return "/admin/ai/ads";
}

export async function processGlobalCommand(input: string) {
  if (!input || !input.trim()) return { error: "Input vacío" };

  const store = await getDefaultStore();
  const resolvedRoute = resolveIntent(input);

  if (store) {
    await logSystemEvent({
      storeId: store.id,
      entityType: "ai_command",
      entityId: "hub",
      eventType: "ai_command_executed",
      severity: "info",
      source: "ai_hub",
      message: `Comando recibido: "${input}"`,
      metadata: { resolvedRoute },
    });
  }

  redirect(resolvedRoute);
}

// ─── Recent Activity Query ───
export async function getRecentAICommands(limit = 5) {
  try {
    const events = await prisma.systemEvent.findMany({
      where: { source: "ai_hub", eventType: "ai_command_executed" },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, message: true, metadataJson: true, createdAt: true },
    });
    return events.map(e => ({
      id: e.id,
      message: e.message,
      route: e.metadataJson ? (JSON.parse(e.metadataJson) as any).resolvedRoute || null : null,
      createdAt: e.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

// ─── Inline Task Actions ───

export async function dismissRecommendation(recoId: string) {
  // Guard: verify exists and not already dismissed
  const reco = await prisma.adRecommendation.findUnique({ where: { id: recoId } });
  if (!reco) return { success: false, error: "Recomendación no encontrada" };
  if (reco.dismissedAt) return { success: true }; // idempotent

  await prisma.adRecommendation.update({
    where: { id: recoId },
    data: { dismissedAt: new Date() },
  });

  await logSystemEvent({
    storeId: reco.storeId,
    entityType: "ai_ads",
    entityId: recoId,
    eventType: "ads_recommendation_dismissed",
    source: "ai_hub",
    message: `Recomendación "${reco.title}" descartada desde el hub`,
  });

  revalidatePath("/admin/ai");
  revalidatePath("/admin/ai/ads");
  return { success: true };
}

export async function promoteToDraft(recoId: string) {
  // Guard: verify exists and not already dismissed (promotion dismisses it)
  const reco = await prisma.adRecommendation.findUnique({ where: { id: recoId } });
  if (!reco) return { success: false, error: "Recomendación no encontrada" };
  if (reco.dismissedAt) return { success: false, error: "Ya fue procesada" };

  const { createCampaignDraft } = await import("@/lib/ads/drafts/actions");
  const draft = await createCampaignDraft(reco.storeId, recoId);

  revalidatePath("/admin/ai");
  revalidatePath("/admin/ai/ads");
  return { success: true, draftId: draft.id };
}

export async function archiveDraft(draftId: string) {
  // Guard: verify exists and is in draft status
  const existing = await prisma.adCampaignDraft.findUnique({ where: { id: draftId } });
  if (!existing) return { success: false, error: "Borrador no encontrado" };
  if (existing.status === "archived") return { success: true }; // idempotent

  await prisma.adCampaignDraft.update({
    where: { id: draftId },
    data: { status: "archived" },
  });

  await logSystemEvent({
    storeId: existing.storeId,
    entityType: "ads_draft",
    entityId: draftId,
    eventType: "ads_draft_archived",
    source: "ai_hub",
    message: `Borrador de campaña archivado desde el hub`,
  });

  revalidatePath("/admin/ai");
  revalidatePath("/admin/ai/ads");
  return { success: true };
}
