"use server";

import { prisma } from "@/lib/db/prisma";
import { getStorePlanInfo, initializeStoreBilling } from "@/lib/billing/service";
import { getCurrentStore } from "@/lib/auth/session";

// Resolve post-auth destination based on user/store state
export async function resolvePostAuthDestination() {
  const store = await getCurrentStore();

  if (!store) {
    return { destination: "/home/login", reason: "no_store" as const };
  }

  const sub = await prisma.storeSubscription.findUnique({
    where: { storeId: store.id },
  });

  if (!sub) {
    // No subscription means they need to pick a plan
    return { destination: "/welcome/plan", reason: "no_plan" as const };
  }

  if (sub.status === "pending" || sub.status === "incomplete") {
    return { destination: "/welcome/plan", reason: "plan_pending" as const };
  }

  // Active or canceled, assume they can enter dashboard
  return { destination: "/admin/dashboard", reason: "active" as const };
}

export async function selectCorePlanAction() {
  const store = await getCurrentStore();

  if (!store) {
    throw new Error("No active store found.");
  }

  const existingSub = await prisma.storeSubscription.findUnique({
    where: { storeId: store.id },
  });

  if (existingSub) {
    throw new Error("Store already has a subscription.");
  }

  // Initialize on Core plan with initial credits
  await initializeStoreBilling(store.id);

  return { success: true };
}

export async function checkoutPaidPlanAction(planCode: string) {
  const store = await getCurrentStore();

  if (!store) {
    throw new Error("No active store found.");
  }
  
  const { PLAN_DEFINITIONS } = await import("@/lib/billing/plans");
  const plan = PLAN_DEFINITIONS.find(p => p.code === planCode);
  if (!plan) throw new Error("Plan inválido");

  const { createBillingPaymentIntent } = await import("@/lib/billing/mercadopago");
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const redirectUrl = await createBillingPaymentIntent(
    store.id,
    "plan_upgrade",
    plan.monthlyPrice,
    `Suscripción Mensual - Plan ${plan.name}`,
    { planId: planCode, returnUrlBase: `${baseUrl}/welcome/confirm` }
  );

  return { redirectUrl };
}
