"use server";

// Activation Engine v1
// Signal-based activation state derived from real DB queries.
// No cosmetic progress: every step is measured against observable state.

import { revalidatePath } from "next/cache";

import { getCurrentStore, getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import type { ActivationState, ActivationStep } from "@/types/activation";

export async function getActivationState(): Promise<ActivationState | null> {
  const [user, store] = await Promise.all([getCurrentUser(), getCurrentStore()]);
  if (!user || !store) return null;

  const sid = store.id;

  const [
    subscription,
    productCount,
    publishedProductCount,
    sellableProductCount,
    productsWithCost,
    providerCount,
    mercadoPagoConnection,
    storeStatus,
  ] = await Promise.all([
    prisma.storeSubscription.findUnique({ where: { storeId: sid }, select: { status: true, planId: true } }),
    prisma.product.count({ where: { storeId: sid } }),
    prisma.product.count({ where: { storeId: sid, isPublished: true } }),
    prisma.product.count({
      where: {
        storeId: sid,
        isPublished: true,
        status: { not: "archived" },
        variants: { some: { stock: { gt: 0 } } },
      },
    }),
    prisma.product.count({ where: { storeId: sid, cost: { gt: 0 } } }),
    prisma.providerConnection.count({ where: { storeId: sid, status: "active" } }),
    prisma.storePaymentProvider.findUnique({
      where: { storeId_provider: { storeId: sid, provider: "mercadopago" } },
      select: { status: true, accessTokenEncrypted: true, externalAccountId: true },
    }),
    Promise.resolve(store.status),
  ]);

  const emailVerified = user.emailVerified;
  const hasPlan = !!subscription && ["active", "trialing"].includes(subscription.status);
  const hasProducts = productCount > 0;
  const hasPublished = publishedProductCount > 0;
  const hasSellableProduct = sellableProductCount > 0;
  const hasCosts = productsWithCost > 0 && (productCount === 0 || productsWithCost / productCount >= 0.5);
  const isStoreActive = storeStatus === "active";
  const hasStoreProfile = Boolean(store.name && store.slug && store.description);
  const hasMercadoPago = mercadoPagoConnection?.status === "connected" && Boolean(mercadoPagoConnection.accessTokenEncrypted);

  const steps: ActivationStep[] = [];

  steps.push({
    id: "verify_email",
    tier: "blocker",
    title: "Verifica tu email",
    description: "Necesario para operar la cuenta y recibir notificaciones.",
    status: emailVerified ? "completed" : "pending",
    href: "/admin/settings",
    actionLabel: emailVerified ? "Verificado" : "Verificar email",
    detail: emailVerified ? `${user.email} verificado` : `${user.email} sin verificar`,
  });

  steps.push({
    id: "select_plan",
    tier: "blocker",
    title: "Activa tu plan",
    description: "Sin plan activo la cuenta tiene funcionalidad limitada.",
    status: hasPlan ? "completed" : "pending",
    href: hasPlan ? "/admin/settings" : "/welcome/plan",
    actionLabel: hasPlan ? "Plan activo" : "Elegir plan",
    detail: hasPlan ? "Plan activo" : "Sin plan",
  });

  steps.push({
    id: "create_store",
    tier: "blocker",
    title: "Configura tu tienda",
    description: "Nombre, slug unico, descripcion y marca publica.",
    status: hasStoreProfile ? "completed" : (!hasPlan ? "blocked" : "pending"),
    href: "/admin/store-ai/editor",
    actionLabel: hasStoreProfile ? "Tienda creada" : "Configurar tienda",
    detail: hasStoreProfile ? `/store/${store.slug}` : "Falta descripcion publica",
  });

  steps.push({
    id: "first_product",
    tier: "blocker",
    title: "Carga tu primer producto vendible",
    description: "Crea un producto real con variante, precio y stock disponible.",
    status: hasSellableProduct ? "completed" : (!hasPlan ? "blocked" : "pending"),
    href: hasProducts ? "/admin/catalog" : "/admin/store?tab=resumen",
    actionLabel: hasSellableProduct ? `${sellableProductCount} vendible${sellableProductCount !== 1 ? "s" : ""}` : "Crear producto",
    detail: hasProducts ? `${productCount} en catalogo, ${publishedProductCount} publicado${publishedProductCount !== 1 ? "s" : ""}` : undefined,
  });

  steps.push({
    id: "complete_costs",
    tier: "accelerator",
    title: "Completa costos del catalogo",
    description: "Sin costo, Nexora no puede calcular margenes ni alertar rentabilidad.",
    status: !hasProducts ? "blocked" : hasCosts ? "completed" : "in_progress",
    href: "/admin/catalog",
    actionLabel: hasCosts ? "Costos completos" : "Completar costos",
    detail: hasProducts ? `${productsWithCost} de ${productCount} con costo cargado` : undefined,
  });

  steps.push({
    id: "publish_store",
    tier: "accelerator",
    title: "Publica tu tienda",
    description: "Tu tienda propia con dominio Nexora, lista para recibir trafico.",
    status: !hasSellableProduct ? "blocked" : isStoreActive ? "completed" : "pending",
    href: "/admin/store",
    actionLabel: isStoreActive ? "Tienda activa" : "Publicar tienda",
  });

  steps.push({
    id: "connect_mercadopago",
    tier: "blocker",
    title: "Conecta Mercado Pago propio",
    description: "Cada tienda cobra en su propia cuenta. Sin token real, el checkout queda desactivado.",
    status: hasMercadoPago ? "completed" : (!hasPlan ? "blocked" : "pending"),
    href: "/admin/store?tab=pagos",
    actionLabel: hasMercadoPago ? "MP conectado" : "Conectar MP",
    detail: hasMercadoPago ? `Cuenta ${mercadoPagoConnection?.externalAccountId ?? "conectada"}` : "No hay token tenant guardado",
  });

  steps.push({
    id: "connect_provider",
    tier: "recommended",
    title: "Conecta un proveedor de sourcing",
    description: "Importa productos reales desde proveedores sin depender de marketplaces.",
    status: providerCount > 0 ? "completed" : "pending",
    href: "/admin/sourcing",
    actionLabel: providerCount > 0 ? `${providerCount} proveedor${providerCount !== 1 ? "es" : ""}` : "Explorar proveedores",
  });

  steps.push({
    id: "review_operations",
    tier: "recommended",
    title: "Revisa tu centro operativo",
    description: "Nexora AI genera alertas y recomendaciones sobre tu negocio en tiempo real.",
    status: hasProducts && hasPlan ? "pending" : "blocked",
    href: "/admin/ai",
    actionLabel: "Ver Nexora AI",
  });

  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const totalSteps = steps.length;
  const score = Math.round((completedSteps / totalSteps) * 100);
  const blockers = steps.filter((s) => s.tier === "blocker" && s.status !== "completed").length;

  await prisma.storeOnboarding.upsert({
    where: { storeId: sid },
    create: { storeId: sid, activationScore: score, currentStage: score === 100 ? "completed" : "welcome" },
    update: {
      activationScore: score,
      currentStage: score === 100 ? "completed" : undefined,
      hasImportedProduct: providerCount > 0 || undefined,
      hasPublished: hasPublished || undefined,
      hasConnectedOAuth: hasMercadoPago || undefined,
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
    data: { currentStage: "creating_store" },
  });
  revalidatePath("/admin");
}
