"use server";

// ─── Activation Engine v1 ───
// Signal-based activation state derived from real DB queries.
// No cosmetic progress — every step is measured against observable state.

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser, getCurrentStore } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import type { ActivationState, ActivationStep, ActivationStepStatus } from "@/types/activation";

export async function getActivationState(): Promise<ActivationState | null> {
  const [user, store] = await Promise.all([getCurrentUser(), getCurrentStore()]);
  if (!user || !store) return null;

  const sid = store.id;

  // ─── All signal queries in parallel ───
  const [
    subscription,
    productCount,
    publishedProductCount,
    productsWithCost,
    channelCount,
    providerCount,
    storeStatus,
  ] = await Promise.all([
    prisma.storeSubscription.findUnique({ where: { storeId: sid }, select: { status: true, planId: true } }),
    prisma.product.count({ where: { storeId: sid } }),
    prisma.product.count({ where: { storeId: sid, isPublished: true } }),
    prisma.product.count({ where: { storeId: sid, cost: { gt: 0 } } }),
    prisma.channelConnection.count({ where: { storeId: sid, status: "connected" } }),
    prisma.providerConnection.count({ where: { storeId: sid, status: "active" } }),
    Promise.resolve(store.status),
  ]);

  const emailVerified = user.emailVerified;
  const hasPlan = !!subscription && ["active", "trialing"].includes(subscription.status);
  const hasProducts = productCount > 0;
  const hasPublished = publishedProductCount > 0;
  const hasCosts = productsWithCost > 0 && (productCount === 0 || productsWithCost / productCount >= 0.5);
  const hasChannel = channelCount > 0;
  const isStoreActive = storeStatus === "active";

  // ─── Build steps ───
  const steps: ActivationStep[] = [];

  // TIER 1: BLOCKERS — Must resolve to sell

  steps.push({
    id: "verify_email",
    tier: "blocker",
    title: "Verificá tu email",
    description: "Necesario para operar la cuenta y recibir notificaciones.",
    status: emailVerified ? "completed" : "pending",
    href: "/admin/settings",
    actionLabel: emailVerified ? "Verificado" : "Verificar email",
    detail: emailVerified ? `${user.email} verificado` : `${user.email} sin verificar`,
  });

  steps.push({
    id: "select_plan",
    tier: "blocker",
    title: "Activá tu plan",
    description: "Sin plan activo la cuenta tiene funcionalidad limitada.",
    status: hasPlan ? "completed" : "pending",
    href: hasPlan ? "/admin/settings" : "/welcome/plan",
    actionLabel: hasPlan ? "Plan activo" : "Elegir plan",
    detail: hasPlan ? `Plan activo` : "Sin plan",
  });

  steps.push({
    id: "first_product",
    tier: "blocker",
    title: "Cargá tu primer producto",
    description: "Creá manualmente, generá con IA, o importá desde un proveedor.",
    status: hasProducts ? "completed" : (!hasPlan ? "blocked" : "pending"),
    href: hasProducts ? "/admin/catalog" : "/admin/ai-store-builder",
    actionLabel: hasProducts ? `${productCount} producto${productCount !== 1 ? "s" : ""}` : "Crear producto",
    detail: hasProducts ? `${productCount} en catálogo, ${publishedProductCount} publicado${publishedProductCount !== 1 ? "s" : ""}` : undefined,
  });

  // TIER 2: ACCELERATORS — Needed to sell effectively

  steps.push({
    id: "complete_costs",
    tier: "accelerator",
    title: "Completá costos del catálogo",
    description: "Sin costo, Nexora no puede calcular márgenes ni alertar rentabilidad.",
    status: !hasProducts ? "blocked" : hasCosts ? "completed" : "in_progress",
    href: "/admin/catalog",
    actionLabel: hasCosts ? "Costos completos" : "Completar costos",
    detail: hasProducts ? `${productsWithCost} de ${productCount} con costo cargado` : undefined,
  });

  steps.push({
    id: "publish_store",
    tier: "accelerator",
    title: "Publicá tu tienda",
    description: "Tu tienda propia con dominio Nexora, lista para recibir tráfico.",
    status: !hasProducts ? "blocked" : isStoreActive ? "completed" : "pending",
    href: "/admin/store",
    actionLabel: isStoreActive ? "Tienda activa" : "Publicar tienda",
  });

  steps.push({
    id: "connect_channel",
    tier: "accelerator",
    title: "Conectá un canal de venta",
    description: "Mercado Libre, Shopify u otro canal para vender donde ya hay tráfico.",
    status: hasChannel ? "completed" : "pending",
    href: "/admin/integrations",
    actionLabel: hasChannel ? `${channelCount} canal${channelCount !== 1 ? "es" : ""}` : "Conectar canal",
  });

  // TIER 3: RECOMMENDED — Optimize and scale

  steps.push({
    id: "connect_provider",
    tier: "recommended",
    title: "Conectá un proveedor de sourcing",
    description: "Dropshipping B2B: importá productos de proveedores sin manejar inventario.",
    status: providerCount > 0 ? "completed" : "pending",
    href: "/admin/sourcing",
    actionLabel: providerCount > 0 ? `${providerCount} proveedor${providerCount !== 1 ? "es" : ""}` : "Explorar proveedores",
  });

  steps.push({
    id: "review_operations",
    tier: "recommended",
    title: "Revisá tu centro operativo",
    description: "Nexora AI genera alertas y recomendaciones sobre tu negocio en tiempo real.",
    status: hasProducts && hasPlan ? "pending" : "blocked",
    href: "/admin/ai",
    actionLabel: "Ver Nexora AI",
  });

  // ─── Score ───
  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const totalSteps = steps.length;
  const score = Math.round((completedSteps / totalSteps) * 100);
  const blockers = steps.filter((s) => s.tier === "blocker" && s.status !== "completed").length;

  // ─── Persist score to StoreOnboarding (idempotent) ───
  await prisma.storeOnboarding.upsert({
    where: { storeId: sid },
    create: { storeId: sid, activationScore: score, currentStage: score === 100 ? "completed" : "welcome" },
    update: {
      activationScore: score,
      currentStage: score === 100 ? "completed" : undefined,
      hasImportedProduct: providerCount > 0 || undefined,
      hasPublished: hasPublished || undefined,
      hasConnectedOAuth: hasChannel || undefined,
    },
  });

  return {
    steps,
    score,
    totalSteps,
    completedSteps,
    blockers,
    isActivated: score === 100,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Legacy compat ───
export async function getStoreOnboardingState() {
  const state = await getActivationState();
  if (!state) return null;
  return {
    onboarding: null,
    stepsCompleted: state.steps.filter((s) => s.status === "completed").map((s) => s.id),
    score: state.score,
    metrics: {},
  };
}

export async function dismissWelcomeStageAction() {
   const store = await getCurrentStore();
   if (!store) return;
   await prisma.storeOnboarding.updateMany({
      where: { storeId: store.id },
      data: { currentStage: "creating_store" }
   });
   revalidatePath("/admin");
}
