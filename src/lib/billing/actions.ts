"use server";

import { revalidatePath } from "next/cache";
import { getDefaultStore } from "@/lib/store-engine/queries";
import {
  getStoreUsageSummary,
  upgradePlan,
  checkFeatureAccess,
  getStorePlanInfo,
} from "@/lib/billing/service";
import { PLAN_DEFINITIONS } from "@/lib/billing/plans";
import { createBillingPaymentIntent } from "@/lib/billing/mercadopago";

export async function getBillingDataAction() {
  const store = await getDefaultStore();
  if (!store) return null;

  const summary = await getStoreUsageSummary(store.id);
  if (!summary) return null;
  return { storeId: store.id, ...summary };
}

export async function getPlansAction() {
  return PLAN_DEFINITIONS;
}

export async function upgradePlanAction(planCode: string) {
  const store = await getDefaultStore();
  if (!store) throw new Error("Tienda no encontrada");

  const plan = PLAN_DEFINITIONS.find(p => p.code === planCode);
  if (!plan) throw new Error("Plan inválido");

  if (plan.monthlyPrice === 0) {
    // Immediate downgrade/upgrade for free
    const result = await upgradePlan(store.id, planCode);
    revalidatePath("/admin/billing");
    return { success: true, redirectUrl: null };
  }

  // Create payment preference for the upgrade
  const redirectUrl = await createBillingPaymentIntent(
     store.id, 
     "plan_upgrade", 
     plan.monthlyPrice, 
     `Suscripción Mensual - Plan ${plan.name}`, 
     { planId: planCode }
  );

  return { success: !!redirectUrl, redirectUrl };
}

export async function buyCreditsAction(packSize: number, priceAmount: number) {
  const store = await getDefaultStore();
  if (!store) throw new Error("Tienda no encontrada");

  const redirectUrl = await createBillingPaymentIntent(
     store.id, 
     "credit_pack", 
     priceAmount, 
     `Pack de ${packSize.toLocaleString()} Créditos IA`, 
     { creditAmount: packSize }
  );

  return { success: !!redirectUrl, redirectUrl };
}

export async function checkFeatureAccessAction(feature: string) {
  const store = await getDefaultStore();
  if (!store) return { allowed: false, reason: "Tienda no encontrada" };

  return checkFeatureAccess(store.id, feature);
}

export async function getCreditsInfoAction() {
  const store = await getDefaultStore();
  if (!store) return null;

  const info = await getStorePlanInfo(store.id);
  if (!info) return { total: 0, used: 0, remaining: 0 };
  return info.credits;
}
