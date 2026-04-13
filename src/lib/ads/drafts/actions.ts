"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

export async function createCampaignDraft(storeId: string, recommendationId: string) {
  const recommendation = await prisma.adRecommendation.findUnique({
    where: { id: recommendationId }
  });

  if (!recommendation) throw new Error("Recomendación no encontrada");
  if (recommendation.storeId !== storeId) throw new Error("Acceso denegado");

  // Mark as dismissed so it leaves the recommendations queue
  await prisma.adRecommendation.update({
    where: { id: recommendation.id },
    data: { dismissedAt: new Date() }
  });

  const parsed = JSON.parse(recommendation.recommendationJson);

  // Link to existing connection if exists
  const connection = await prisma.adPlatformConnection.findFirst({
    where: { storeId, platform: recommendation.platform }
  });

  const draft = await prisma.adCampaignDraft.create({
    data: {
      storeId,
      connectionId: connection?.id,
      platform: recommendation.platform,
      objective: parsed.objective || "sales",
      budgetDaily: parsed.budgetSuggestion || 5000,
      audienceJson: JSON.stringify({ description: parsed.audience }),
      copyJson: JSON.stringify({ primaryText: parsed.primaryText, hook: parsed.hook, cta: parsed.cta }),
      creativeJson: JSON.stringify({ angles: parsed.creativeAngles }),
      sourceProductIds: parsed.suggestedProducts ? parsed.suggestedProducts.join(",") : null,
      aiSummary: recommendation.summary,
      aiScore: 92
    }
  });

  const { logSystemEvent } = await import("@/lib/observability/audit");
  await logSystemEvent({
     storeId,
     entityType: "ads_draft",
     entityId: draft.id,
     eventType: "ads_draft_created",
     source: "ads_copilot",
     message: `Borrador de campaña creado para ${recommendation.platform}`
  });

  revalidatePath("/admin/ads");
  return draft;
}

export async function getCampaignDrafts(storeId: string) {
  return prisma.adCampaignDraft.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" }
  });
}

// Minimal insight snapshot mock logic
export async function getInsightSnapshots(storeId: string) {
  return prisma.adInsightSnapshot.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    include: { connection: true }
  });
}
