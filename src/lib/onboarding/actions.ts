"use server";

import { prisma } from "@/lib/db/prisma";
import { getDefaultStore } from "@/lib/store-engine/queries";
import { revalidatePath } from "next/cache";

export async function getStoreOnboardingState(storeId?: string) {
  let targetId = storeId;
  if (!targetId) {
    const defaultStore = await getDefaultStore();
    if (!defaultStore) return null;
    targetId = defaultStore.id;
  }

  // Idempotently create onboarding record
  let onboarding = await prisma.storeOnboarding.findUnique({ where: { storeId: targetId } });
  if (!onboarding) {
    onboarding = await prisma.storeOnboarding.create({
      data: { storeId: targetId }
    });
  }

  // Calculate live state (True State representation)
  const productCount = await prisma.product.count({ where: { storeId: targetId } });
  const aiDrafts = await prisma.aIGenerationDraft.count({ where: { storeId: targetId } });
  const channels = await prisma.channelConnection.count({ where: { storeId: targetId, status: "connected" } });
  const published = await prisma.channelListing.count({ where: { storeId: targetId, status: "published" } });
  const suppliers = await prisma.catalogMirrorProduct.count({ where: { internalProduct: { storeId: targetId } } });
  const domains = await prisma.storeDomain.count({ where: { storeId: targetId, type: "custom" } });

  // Update activation flags
  const updates: any = {};
  if (aiDrafts > 0 && !onboarding.hasUsedAI) updates.hasUsedAI = true;
  if (suppliers > 0 && !onboarding.hasImportedProduct) updates.hasImportedProduct = true;
  if (published > 0 && !onboarding.hasPublished) updates.hasPublished = true;
  if (channels > 0 && !onboarding.hasConnectedOAuth) updates.hasConnectedOAuth = true;

  if (Object.keys(updates).length > 0) {
    onboarding = await prisma.storeOnboarding.update({
      where: { id: onboarding.id },
      data: updates
    });
  }

  // Calculate activation score and completed steps
  const stepsCompleted = new Set(JSON.parse(onboarding.completedStepsJson));
  
  if (aiDrafts > 0 || productCount > 0) stepsCompleted.add("create_products");
  if (channels > 0) stepsCompleted.add("connect_channel");
  if (published > 0) stepsCompleted.add("publish_channel");
  if (suppliers > 0) stepsCompleted.add("import_supplier");
  if (domains > 0) stepsCompleted.add("custom_domain");

  const newCompletedStepsJson = JSON.stringify(Array.from(stepsCompleted));
  if (newCompletedStepsJson !== onboarding.completedStepsJson) {
     onboarding = await prisma.storeOnboarding.update({
       where: { id: onboarding.id },
       data: { completedStepsJson: newCompletedStepsJson }
     });
  }

  // Score 0-100 logic
  const totalSteps = 5;
  const score = Math.round((stepsCompleted.size / totalSteps) * 100);

  if (score !== onboarding.activationScore) {
     onboarding = await prisma.storeOnboarding.update({
        where: { id: onboarding.id },
        data: {
           activationScore: score,
           firstValueAt: score > 0 && !onboarding.firstValueAt ? new Date() : onboarding.firstValueAt,
           currentStage: score === 100 ? "completed" : onboarding.currentStage
        }
     });
  }

  return {
    onboarding,
    stepsCompleted: Array.from(stepsCompleted),
    score,
    metrics: { aiDrafts, productCount, channels, published, suppliers, domains }
  };
}

export async function dismissWelcomeStageAction() {
   const store = await getDefaultStore();
   if (!store) return;
   await prisma.storeOnboarding.updateMany({
      where: { storeId: store.id },
      data: { currentStage: "creating_store" }
   });
   revalidatePath("/admin");
}
