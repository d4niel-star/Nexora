"use server";

import { prisma } from "@/lib/db/prisma";
import { PLAN_DEFINITIONS, TRIAL_DURATION_DAYS, type PlanConfig, type CreditFeature, CREDIT_COSTS } from "./plans";
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

// ─── Initialize store on Core plan with initial credits ───

export async function initializeStoreBilling(storeId: string) {
  await seedPlans();

  // New stores start on Growth-level entitlements under a 14-day trial. After
  // trial expiry, expireTrialsIfNeeded() (called lazily by getStorePlanInfo)
  // transitions them to Core. This lets the owner test every capability
  // (including AI Builder) without a hard wall in the first 14 days.
  const trialPlan = await prisma.plan.findUnique({ where: { code: "growth" } });
  const corePlan = await prisma.plan.findUnique({ where: { code: "core" } });
  if (!trialPlan || !corePlan) throw new Error("Plans not seeded. Run seedPlans first.");

  const trialConfig = JSON.parse(trialPlan.configJson) as PlanConfig;

  const existing = await prisma.storeSubscription.findUnique({ where: { storeId } });
  if (!existing) {
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + TRIAL_DURATION_DAYS * 86400000);
    await prisma.storeSubscription.create({
      data: {
        storeId,
        planId: trialPlan.id,
        status: "trialing",
        trialEndsAt,
      },
    });

    await logSystemEvent({
      storeId,
      entityType: "billing",
      eventType: "trial_started",
      severity: "info",
      source: "billing",
      message: `Trial de ${TRIAL_DURATION_DAYS} días iniciado`,
      metadata: { trialEndsAt: trialEndsAt.toISOString(), plan: trialPlan.code },
    });
  }

  // Use trial plan config for initial credits so the owner can actually
  // experience AI Builder during the trial.
  const config = trialConfig;

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
        metadataJson: JSON.stringify({ plan: "core", initialGrant: true }),
      },
    });

    await logSystemEvent({
      storeId,
      entityType: "billing",
      eventType: "credits_granted",
      severity: "info",
      source: "billing",
      message: `${config.aiCredits} créditos iniciales otorgados (plan Core)`,
      metadata: { credits: config.aiCredits, plan: "core" },
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

  if (info.subscription.status !== "active" && info.subscription.status !== "trialing") {
    return { allowed: false, reason: "La suscripción se encuentra inactiva o con pagos pendientes." };
  }

  // Check specific features
  switch (feature) {
    case "custom_domain":
      return info.entitlements.customDomain
        ? { allowed: true }
        : { allowed: false, reason: "Dominios personalizados incluidos en todos los planes" };

    case "byok":
      return info.entitlements.byokEnabled
        ? { allowed: true }
        : { allowed: false, reason: "Bring Your Own Key requiere plan Scale o superior" };

    case "ai_studio_advanced":
      return info.entitlements.aiStudioAdvanced
        ? { allowed: true }
        : { allowed: false, reason: "AI Studio avanzado requiere plan Growth o superior" };

    case "advanced_carriers":
      return info.entitlements.advancedCarriers
        ? { allowed: true }
        : { allowed: false, reason: "Carriers avanzados requieren plan Growth o superior" };

    case "sourcing_advanced":
      return info.entitlements.sourcingAdvanced
        ? { allowed: true }
        : { allowed: false, reason: "Sourcing predictivo y operaciones cross-provider requieren plan Scale." };

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

// ─── Trial lifecycle ───

/**
 * Transitions a store from `trialing` → `active` on plan "core" when the
 * 14-day trial window has closed. Called lazily on every read through
 * getStoreBillingGate so we never serve stale trial state without a cron job.
 * Returns the new subscription if a transition happened, else null.
 */
export async function expireTrialIfNeeded(storeId: string) {
  const sub = await prisma.storeSubscription.findUnique({
    where: { storeId },
    include: { plan: true },
  });
  if (!sub) return null;

  const now = new Date();
  if (
    sub.status === "trialing" &&
    sub.trialEndsAt !== null &&
    sub.trialEndsAt.getTime() <= now.getTime()
  ) {
    const corePlan = await prisma.plan.findUnique({ where: { code: "core" } });
    if (!corePlan) return null;

    await prisma.storeSubscription.update({
      where: { storeId },
      data: {
        planId: corePlan.id,
        status: "trial_expired",
      },
    });

    await logSystemEvent({
      storeId,
      entityType: "billing",
      eventType: "trial_expired",
      severity: "info",
      source: "billing",
      message: "Trial de 14 días venció. Plan transicionado a Core con gating limitado.",
      metadata: { previousPlanCode: sub.plan.code },
    });

    return { newPlanCode: "core", previousStatus: sub.status };
  }

  return null;
}

// ─── Limit gates ───
//
// These are thin read-only checks intended to be called right before a
// mutation (creating a product, accepting an order, etc.). They return a
// `{ allowed, reason }` pair with a Spanish reason so the UI can show the
// owner exactly why the action was blocked and what plan unblocks it.

export interface GateResult {
  allowed: boolean;
  reason?: string;
  code?: "trial_expired" | "limit_reached" | "feature_locked" | "no_subscription";
  upgradeSuggestion?: "growth" | "scale";
}

/**
 * Master gate: call this at the top of any sensitive admin action.
 * Runs trial expiry first so downstream callers always see fresh state.
 */
export async function checkStoreBillingGate(storeId: string): Promise<GateResult> {
  await expireTrialIfNeeded(storeId);

  const sub = await prisma.storeSubscription.findUnique({
    where: { storeId },
    include: { plan: true },
  });
  if (!sub) {
    return {
      allowed: false,
      code: "no_subscription",
      reason: "No hay un plan activo. Elegí un plan para seguir usando la plataforma.",
    };
  }

  if (sub.status === "trial_expired") {
    return {
      allowed: false,
      code: "trial_expired",
      reason: "Tu trial de 14 días terminó. Activá un plan para seguir operando tu tienda.",
      upgradeSuggestion: "growth",
    };
  }

  if (sub.status === "cancelled") {
    return {
      allowed: false,
      code: "no_subscription",
      reason: "Tu suscripción ha sido cancelada. Reactivá tu plan para seguir operando.",
    };
  }

  if (sub.status === "past_due" || sub.status === "unpaid") {
    return {
      allowed: false,
      code: "no_subscription",
      reason: "Tu suscripción presenta un pago pendiente. Actualizá tu método de pago para restablecer el acceso.",
    };
  }

  return { allowed: true };
}

/** Enforces maxProducts by current plan. 0 = unlimited. */
export async function checkProductLimit(storeId: string): Promise<GateResult> {
  const gate = await checkStoreBillingGate(storeId);
  if (!gate.allowed) return gate;

  const sub = await prisma.storeSubscription.findUnique({
    where: { storeId },
    include: { plan: true },
  });
  if (!sub) return { allowed: false, code: "no_subscription", reason: "Sin plan activo." };

  const config = JSON.parse(sub.plan.configJson) as PlanConfig;
  if (config.maxProducts === 0) return { allowed: true };

  const count = await prisma.product.count({ where: { storeId } });
  if (count >= config.maxProducts) {
    return {
      allowed: false,
      code: "limit_reached",
      reason:
        `Llegaste al límite de ${config.maxProducts} productos del plan ${sub.plan.name}. ` +
        `Actualizá tu plan para cargar más productos.`,
      upgradeSuggestion: sub.plan.code === "core" ? "growth" : "scale",
    };
  }

  return { allowed: true };
}

/** Enforces maxOrdersPerMonth by current plan. 0 = unlimited. */
export async function checkMonthlyOrderLimit(storeId: string): Promise<GateResult> {
  const gate = await checkStoreBillingGate(storeId);
  if (!gate.allowed) return gate;

  const sub = await prisma.storeSubscription.findUnique({
    where: { storeId },
    include: { plan: true },
  });
  if (!sub) return { allowed: false, code: "no_subscription", reason: "Sin plan activo." };

  const config = JSON.parse(sub.plan.configJson) as PlanConfig;
  if (config.maxOrdersPerMonth === 0) return { allowed: true };

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const count = await prisma.order.count({
    where: {
      storeId,
      createdAt: { gte: startOfMonth },
      paymentStatus: { in: ["approved", "paid"] },
    },
  });

  if (count >= config.maxOrdersPerMonth) {
    return {
      allowed: false,
      code: "limit_reached",
      reason:
        `Llegaste al límite de ${config.maxOrdersPerMonth} órdenes mensuales del plan ${sub.plan.name}. ` +
        `Actualizá tu plan para seguir recibiendo pedidos este mes.`,
      upgradeSuggestion: sub.plan.code === "core" ? "growth" : "scale",
    };
  }

  return { allowed: true };
}

/** Returns true if the current plan includes AI Builder capabilities. */
export async function checkAIBuilderAccess(storeId: string): Promise<GateResult> {
  const gate = await checkStoreBillingGate(storeId);
  if (!gate.allowed) return gate;

  const sub = await prisma.storeSubscription.findUnique({
    where: { storeId },
    include: { plan: true },
  });
  if (!sub) return { allowed: false, code: "no_subscription", reason: "Sin plan activo." };

  const config = JSON.parse(sub.plan.configJson) as PlanConfig;
  if (!config.aiBuilder) {
    return {
      allowed: false,
      code: "feature_locked",
      reason: "AI Builder requiere plan Growth o superior.",
      upgradeSuggestion: "growth",
    };
  }

  return { allowed: true };
}
