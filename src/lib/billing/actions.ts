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

  // H2 — tell the client whether the current session may see ops-only
  // UI (e.g. the link to /admin/billing/observability). Never expose the
  // allowlist itself.
  const { isCurrentUserOps } = await import("@/lib/auth/ops");
  const isOps = await isCurrentUserOps();

  return { storeId: store.id, isOps, ...summary };
}

export async function getPlansAction() {
  return PLAN_DEFINITIONS;
}

export async function upgradePlanAction(planCode: string) {
  const store = await getDefaultStore();
  if (!store) throw new Error("Tienda no encontrada");

  const plan = PLAN_DEFINITIONS.find(p => p.code === planCode);
  if (!plan) throw new Error("Plan inválido");

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

/**
 * Recovery action: creates a payment intent for the current plan when
 * subscription is in a failed state (past_due, unpaid, cancelled).
 * On successful payment, the billing webhook calls upgradePlan which
 * transitions the subscription back to active.
 */
export async function resolvePaymentAction() {
  const store = await getDefaultStore();
  if (!store) throw new Error("Tienda no encontrada");

  const { prisma } = await import("@/lib/db/prisma");
  const sub = await prisma.storeSubscription.findUnique({
    where: { storeId: store.id },
    include: { plan: true },
  });

  if (!sub) throw new Error("No hay suscripción activa");

  // Only allow resolve for troubled states
  const troubledStates = ["past_due", "unpaid", "cancelled", "trial_expired"];
  if (!troubledStates.includes(sub.status)) {
    throw new Error("Tu suscripción está al día — no hay pago pendiente");
  }

  const plan = PLAN_DEFINITIONS.find((p) => p.code === sub.plan.code);
  if (!plan) throw new Error("Plan no encontrado");

  const redirectUrl = await createBillingPaymentIntent(
    store.id,
    "plan_upgrade",
    plan.monthlyPrice,
    `Regularización - Plan ${plan.name}`,
    { planId: plan.code },
  );

  return { success: !!redirectUrl, redirectUrl };
}

export async function getBillingObservabilityAction() {
  // H2 — cross-tenant aggregates. Must never be callable from a non-ops
  // session. requireOpsUser throws a generic error so non-ops sessions
  // cannot distinguish "forbidden" from "not found".
  const { requireOpsUser } = await import("@/lib/auth/ops");
  await requireOpsUser();
  const { getBillingObservability } = await import("@/lib/billing/observability");
  return getBillingObservability();
}
