"use server";

import { revalidatePath } from "next/cache";
import {
  generateAIStudioDraft,
  regenerateAISection,
  selectAIProposal,
  applyAIProposalToStore,
  getLatestAIDraft,
} from "@/lib/ai/generator";
import { publishStore } from "@/lib/store-engine/mutations";
import { getDefaultStore } from "@/lib/store-engine/queries";
import { logSystemEvent } from "@/lib/observability/audit";
import { consumeCredits, checkFeatureAccess, getStorePlanInfo } from "@/lib/billing/service";
import type { AIBrief, AISectionType } from "@/types/ai";

export async function generateStudioDraftAction(brief: AIBrief) {
  const store = await getDefaultStore();
  if (!store) throw new Error("No se encontró tienda activa");

  const { checkStoreBillingGate } = await import("@/lib/billing/service");
  const gate = await checkStoreBillingGate(store.id);
  if (!gate.allowed) {
    throw new Error(gate.reason || "Acceso denegado a las funcionalidades de IA.");
  }

  // Check credits
  const { CREDIT_COSTS } = await import("@/lib/billing/plans");
  const creditResult = await consumeCredits(store.id, "ai_studio_generation");
  if (!creditResult.success) {
    throw new Error(creditResult.reason || "Créditos insuficientes para generar tienda");
  }

  let result;
  try {
     result = await generateAIStudioDraft(store.id, brief);
  } catch(e: any) {
     const { refundCredits } = await import("@/lib/billing/service");
     await refundCredits(store.id, CREDIT_COSTS.ai_studio_generation, "ai_generation_failed");
     throw new Error("Fallo la IA. Creditos reembolsados. Detalles: " + e.message);
  }

  revalidatePath("/admin/ai-store-builder");
  return result;
}

export async function regenerateSectionAction(
  draftId: string,
  proposalId: string,
  section: AISectionType
) {
  const store = await getDefaultStore();
  if (store) {
    const { checkStoreBillingGate } = await import("@/lib/billing/service");
    const gate = await checkStoreBillingGate(store.id);
    if (!gate.allowed) {
      throw new Error(gate.reason || "Acceso denegado a las funcionalidades de IA.");
    }

    const { CREDIT_COSTS } = await import("@/lib/billing/plans");
    const creditResult = await consumeCredits(store.id, "ai_studio_section_regen");
    if (!creditResult.success) {
      throw new Error(creditResult.reason || "Créditos insuficientes para regenerar sección");
    }

    try {
      const result = await regenerateAISection(draftId, proposalId, section);
      revalidatePath("/admin/ai-store-builder");
      return result;
    } catch(e: any) {
      const { refundCredits } = await import("@/lib/billing/service");
      await refundCredits(store.id, CREDIT_COSTS.ai_studio_section_regen, "ai_regen_failed");
      throw new Error("Fallo regeneración IA. Créditos reembolsados. " + e.message);
    }
  }

  const result = await regenerateAISection(draftId, proposalId, section);
  revalidatePath("/admin/ai-store-builder");
  return result;
}

export async function selectProposalAction(draftId: string, proposalId: string) {
  await selectAIProposal(draftId, proposalId);
  revalidatePath("/admin/ai-store-builder");
}

export async function applyProposalAction(draftId: string, proposalId: string) {
  const result = await applyAIProposalToStore(draftId, proposalId);
  revalidatePath("/admin/ai-store-builder");
  revalidatePath("/admin/store");
  return result;
}

export async function applyAndPublishAction(draftId: string, proposalId: string) {
  const result = await applyAIProposalToStore(draftId, proposalId);
  await publishStore(result.storeId);

  await logSystemEvent({
    storeId: result.storeId,
    entityType: "ai_draft",
    entityId: draftId,
    eventType: "ai_apply_and_publish",
    severity: "info",
    source: "ai_studio",
    message: "Propuesta IA aplicada y tienda publicada",
  });

  revalidatePath("/admin/ai-store-builder");
  revalidatePath("/admin/store");
  return result;
}

export async function getStudioDataAction() {
  const store = await getDefaultStore();
  if (!store) return null;

  const draft = await getLatestAIDraft(store.id);
  const planInfo = await getStorePlanInfo(store.id);
  const credits = planInfo?.credits || { total: 0, used: 0, remaining: 0 };
  const plan = planInfo?.plan || { code: 'core', name: 'Core', monthlyPrice: 59900, currency: 'ARS' };

  return {
    storeId: store.id,
    storeName: store.name,
    storeSlug: store.slug,
    draft,
    credits,
    plan,
  };
}
