"use server";

import { prisma } from "@/lib/db/prisma";
import { PLAN_DEFINITIONS, type PlanConfig, type CreditFeature, CREDIT_COSTS } from "./plans";
import { logSystemEvent } from "@/lib/observability/audit";

// ─── Seed plans (idempotent) ───

export async function seedPlans() {
  for (const def of PLAN_DEFINITIONS) {
    await prisma.plan.upsert({
      where: { code: def.code },
      update: {
        name: def.name,
        monthlyPrice: def.monthlyPrice,
        currency: def.currency,
        configJson: JSON.stringify(def.config),
        sortOrder: def.sortOrder,
      },
      create: {
        code: def.code,
        name: def.name,
        monthlyPrice: def.monthlyPrice,
        currency: def.currency,
        configJson: JSON.stringify(def.config),
        sortOrder: def.sortOrder,
      },
    });
  }
}

// ─── Initialize store on free plan with free credits ───

export async function initializeStoreBilling(storeId: string) {
  await seedPlans();

  const freePlan = await prisma.plan.findUnique({ where: { code: "free" } });
  if (!freePlan) throw new Error("Free plan not found. Run seedPlans first.");

  const config = JSON.parse(freePlan.configJson) as PlanConfig;

  // Create subscription if not exists
  const existing = await prisma.storeSubscription.findUnique({ where: { storeId } });
  if (!existing) {
    await prisma.storeSubscription.create({
      data: {
        storeId,
        planId: freePlan.id,
        status: "active",
      },
    });
  }

  // Create credit balance if not exists
  const existingBalance = await prisma.storeCreditBalance.findUnique({ where: { storeId } });
  if (!existingBalance) {
    await prisma.storeCreditBalance.create({
      data: {
        storeId,
        freeCredits: config.aiCredits,
        paidCredits: 0,
        usedCredits: 0,
      },
    });

    // Log the grant
    await prisma.creditTransaction.create({
      data: {
        storeId,
        type: "grant_free",
        amount: config.aiCredits,
        source: "onboarding",
        metadataJson: JSON.stringify({ plan: "free", initialGrant: true }),
      },
    });

    await logSystemEvent({
      storeId,
      entityType: "billing",
      eventType: "credits_granted",
      severity: "info",
      source: "billing",
      message: `${config.aiCredits} créditos iniciales otorgados (plan Free)`,
      metadata: { credits: config.aiCredits, plan: "free" },
    });
  }
}

// ─── Get store plan + entitlements ───

export async function getStorePlanInfo(storeId: string) {
  // Auto-initialize if needed
  const sub = await prisma.storeSubscription.findUnique({
    where: { storeId },
    include: { plan: true },
  });

  if (!sub) {
    return null;
  }

  const config = JSON.parse(sub.plan.configJson) as PlanConfig;
  const balance = await prisma.storeCreditBalance.findUnique({ where: { storeId } });

  const remaining = balance
    ? (balance.freeCredits + balance.paidCredits) - balance.usedCredits
    : 0;

  return {
    plan: {
      code: sub.plan.code,
      name: sub.plan.name,
      monthlyPrice: sub.plan.monthlyPrice,
      currency: sub.plan.currency,
    },
    subscription: {
      status: sub.status,
      startedAt: sub.startedAt.toISOString(),
      renewsAt: sub.renewsAt?.toISOString() ?? null,
    },
    entitlements: config,
    credits: {
      total: balance ? balance.freeCredits + balance.paidCredits : 0,
      used: balance?.usedCredits ?? 0,
      remaining: Math.max(0, remaining),
    },
  };
}

// ─── Check if a feature is accessible ───

export async function checkFeatureAccess(storeId: string, feature: string): Promise<{ allowed: boolean; reason?: string }> {
  const info = await getStorePlanInfo(storeId);
  if (!info) return { allowed: false, reason: "No hay un plan activo." };

  // Check specific features
  switch (feature) {
    case "custom_domain":
      return info.entitlements.customDomain
        ? { allowed: true }
        : { allowed: false, reason: "Dominios personalizados requieren plan Starter o superior" };

    case "byok":
      return info.entitlements.byokEnabled
        ? { allowed: true }
        : { allowed: false, reason: "Bring Your Own Key requiere plan Pro" };

    case "ai_studio_advanced":
      return info.entitlements.aiStudioAdvanced
        ? { allowed: true }
        : { allowed: false, reason: "AI Studio avanzado requiere plan Starter o superior" };

    case "advanced_carriers":
      return info.entitlements.advancedCarriers
        ? { allowed: true }
        : { allowed: false, reason: "Carriers avanzados requieren plan Growth o superior" };

    case "ai_credits":
      return info.credits.remaining > 0
        ? { allowed: true }
        : { allowed: false, reason: "Sin créditos disponibles. Actualizá tu plan para obtener más." };

    default:
      return { allowed: true };
  }
}

// ─── Consume credits ───

export async function consumeCredits(
  storeId: string,
  feature: CreditFeature,
  referenceId?: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; remaining: number; reason?: string }> {
  const cost = CREDIT_COSTS[feature];

  const balance = await prisma.storeCreditBalance.findUnique({ where: { storeId } });
  if (!balance) {
    return { success: false, remaining: 0, reason: "No hay un plan activo. Seleccioná un plan primero." };
  }

  const remaining = (balance.freeCredits + balance.paidCredits) - balance.usedCredits;
  if (remaining < cost) {
    return { success: false, remaining: Math.max(0, remaining), reason: "Créditos insuficientes" };
  }

  // Consume
  await prisma.storeCreditBalance.update({
    where: { storeId },
    data: { usedCredits: { increment: cost } },
  });

  await prisma.creditTransaction.create({
    data: {
      storeId,
      type: "consume",
      amount: -cost,
      source: feature,
      referenceId,
      metadataJson: metadata ? JSON.stringify(metadata) : null,
    },
  });

  return { success: true, remaining: remaining - cost };
}

// ─── Grant credits (for upgrades, purchases) ───

export async function grantCredits(
  storeId: string,
  amount: number,
  source: string,
  type: "grant_free" | "grant_paid" = "grant_free",
  referenceId?: string
) {
  const balance = await prisma.storeCreditBalance.findUnique({ where: { storeId } });
  if (!balance) {
    throw new Error("No hay billing inicializado para esta tienda. El usuario debe seleccionar un plan primero.");
  }

  const field = type === "grant_paid" ? "paidCredits" : "freeCredits";

  await prisma.storeCreditBalance.update({
    where: { storeId },
    data: { [field]: { increment: amount } },
  });

  await prisma.creditTransaction.create({
    data: {
      storeId,
      type,
      amount,
      source,
      referenceId,
    },
  });

  await logSystemEvent({
    storeId,
    entityType: "billing",
    eventType: "credits_granted",
    severity: "info",
    source: "billing",
    message: `${amount} créditos ${type === "grant_paid" ? "pagos" : "gratis"} otorgados (${source})`,
    metadata: { amount, type, source },
  });
}

// ─── Refund credits (for failed interactions) ───

export async function refundCredits(
  storeId: string,
  amount: number,
  source: string,
  referenceId?: string
) {
  const balance = await prisma.storeCreditBalance.findUnique({ where: { storeId } });
  if (!balance) return;

  await prisma.storeCreditBalance.update({
    where: { storeId },
    data: { usedCredits: { decrement: amount } }, // Restores the balance natively
  });

  await prisma.creditTransaction.create({
    data: {
      storeId,
      type: "refund",
      amount: amount, // Positive entry logic depending on how UI reads, but usually refund means balance addition
      source,
      referenceId,
    },
  });
}

// ─── Upgrade plan ───

export async function upgradePlan(storeId: string, newPlanCode: string) {
  await seedPlans();

  const newPlan = await prisma.plan.findUnique({ where: { code: newPlanCode } });
  if (!newPlan) throw new Error(`Plan "${newPlanCode}" no encontrado`);

  const sub = await prisma.storeSubscription.findUnique({ where: { storeId } });
  if (!sub) {
    throw new Error("No hay suscripción activa. El usuario debe seleccionar un plan primero.");
  }

  const oldPlanId = sub.planId;
  const newConfig = JSON.parse(newPlan.configJson) as PlanConfig;

  await prisma.storeSubscription.update({
    where: { storeId },
    data: {
      planId: newPlan.id,
      status: "active",
    },
  });

  // Grant additional credits from the new plan
  await grantCredits(storeId, newConfig.aiCredits, "plan_upgrade", "grant_free");

  await logSystemEvent({
    storeId,
    entityType: "billing",
    eventType: "plan_changed",
    severity: "info",
    source: "billing",
    message: `Plan actualizado a "${newPlan.name}"`,
    metadata: { oldPlanId, newPlanId: newPlan.id, newPlanCode },
  });

  return { success: true, plan: newPlan.name };
}

// ─── Get credit transactions ───

export async function getCreditTransactions(storeId: string, limit = 20) {
  return prisma.creditTransaction.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// ─── Get usage summary ───

export async function getStoreUsageSummary(storeId: string) {
  const info = await getStorePlanInfo(storeId);
  if (!info) return null;
  const transactions = await getCreditTransactions(storeId, 10);

  const aiUsage = await prisma.aIUsageLog.aggregate({
    where: { storeId },
    _count: true,
    _sum: { totalTokens: true },
  });

  const productCount = await prisma.product.count({ where: { storeId } });
  const orderCount = await prisma.order.count({ where: { storeId } });

  return {
    plan: info.plan,
    subscription: info.subscription,
    credits: info.credits,
    entitlements: info.entitlements,
    usage: {
      products: productCount,
      orders: orderCount,
      aiInteractions: aiUsage._count,
      aiTokens: aiUsage._sum.totalTokens ?? 0,
    },
    recentTransactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      source: t.source,
      createdAt: t.createdAt.toISOString(),
    })),
  };
}
