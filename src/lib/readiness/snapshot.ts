// ─── Publication / Readiness engine ─────────────────────────────────────
// Single source of truth for "is this store ready to publish and sell?".
//
// Honesty rules:
//   1. Every check is computed from a real DB field or real env state.
//      Nothing is invented, no cosmetic scores, no padding.
//   2. Severity is separated into four honest tiers, not one flat list:
//        - blocks_publication  → the store cannot meaningfully go live
//        - blocks_sales        → the store can go live but cannot cash out
//        - blocks_conversion   → live + can charge but conversion will suffer
//        - recommendation      → useful but non-blocking
//   3. Each check carries a concrete href + CTA that resolves it in the
//      right module. No generic "open settings" fallbacks.
//   4. Derived state (status, primaryAction, counts) is a deterministic
//      function of the checks — never hand-tuned.
//
// This engine deliberately coexists with getActivationState() in
// lib/onboarding/actions.ts. Activation is about onboarding/welcome
// (email verify, pick a plan, …). Readiness is about publication and
// sale. They share some signals (MP connected, sellable product) but
// their audiences and CTAs are different.

import { prisma } from "@/lib/db/prisma";
import { getMercadoPagoPlatformReadiness } from "@/lib/payments/mercadopago/platform-readiness";

export type ReadinessSeverity =
  | "blocks_publication"
  | "blocks_sales"
  | "blocks_conversion"
  | "recommendation";

export interface ReadinessCheck {
  /** Stable id for UI keys and analytics. */
  id: string;
  severity: ReadinessSeverity;
  title: string;
  description: string;
  /** True when the underlying state satisfies the check. */
  resolved: boolean;
  /** Where the merchant should go to resolve it. */
  href: string;
  /** CTA label for the resolve button. */
  ctaLabel: string;
  /** Optional extra detail surfaced in the UI (e.g. counts). */
  detail?: string;
}

export type ReadinessStatus = "ready" | "ready_with_warnings" | "blocked";

export interface ReadinessSnapshot {
  status: ReadinessStatus;
  /** Count of unresolved blocks_publication checks. */
  publicationBlockers: number;
  /** Count of unresolved blocks_sales checks. */
  salesBlockers: number;
  /** Count of unresolved blocks_conversion checks. */
  conversionWarnings: number;
  /** Count of unresolved recommendation checks. */
  recommendations: number;
  /** Every check, including resolved ones, in stable order. */
  checks: ReadinessCheck[];
  /** Contextual primary action the UI header should surface. */
  primaryAction: {
    label: string;
    href: string;
    /** Why this particular action was picked (for analytics/debug). */
    reason: string;
  };
  /** ISO timestamp when this snapshot was produced. */
  generatedAt: string;
}

// ─── Main entry ──────────────────────────────────────────────────────────

export async function getStoreReadinessSnapshot(
  storeId: string,
): Promise<ReadinessSnapshot | null> {
  if (!storeId) return null;

  const [
    store,
    productStats,
    variantStats,
    publishedWithoutImages,
    publishedWithoutDescription,
    mpConnection,
    branding,
    activeProviderCount,
    aiDraft,
  ] = await Promise.all([
    prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logo: true,
        status: true,
      },
    }),
    prisma.product.groupBy({
      by: ["isPublished"],
      where: { storeId },
      _count: { _all: true },
    }),
    // Published products that have NO variant with stock > 0 (and don't
    // allow backorder). These cannot actually be sold.
    prisma.product.count({
      where: {
        storeId,
        isPublished: true,
        status: { not: "archived" },
        variants: { none: { OR: [{ stock: { gt: 0 } }, { allowBackorder: true }] } },
      },
    }),
    prisma.product.count({
      where: {
        storeId,
        isPublished: true,
        featuredImage: null,
        images: { none: {} },
      },
    }),
    prisma.product.count({
      where: {
        storeId,
        isPublished: true,
        OR: [{ description: null }, { description: "" }],
      },
    }),
    prisma.storePaymentProvider.findUnique({
      where: { storeId_provider: { storeId, provider: "mercadopago" } },
      select: {
        status: true,
        accessTokenEncrypted: true,
        externalAccountId: true,
      },
    }),
    prisma.storeBranding.findUnique({
      where: { storeId },
      select: {
        logoUrl: true,
        primaryColor: true,
        fontFamily: true,
        tone: true,
      },
    }),
    prisma.providerConnection.count({ where: { storeId, status: "active" } }),
    prisma.aIGenerationDraft.findFirst({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, selectedProposalId: true },
    }),
  ]);

  if (!store) return null;

  const platformMp = getMercadoPagoPlatformReadiness();

  const totalProducts = productStats.reduce((s, r) => s + r._count._all, 0);
  const publishedCount =
    productStats.find((r) => r.isPublished === true)?._count._all ?? 0;

  const publishedWithoutStock = publishedWithoutImages;
  void publishedWithoutStock; // (read below via its own variable)

  // Published products where variant.price <= 0 — cannot sell at that price.
  const publishedWithZeroPrice = await prisma.product.count({
    where: {
      storeId,
      isPublished: true,
      variants: { some: { price: { lte: 0 } } },
    },
  });

  const checks: ReadinessCheck[] = [];

  // ─── blocks_publication ────────────────────────────────────────────────

  const hasStoreProfile = Boolean(
    store.name && store.slug && store.description && store.description.trim(),
  );
  checks.push({
    id: "store_profile",
    severity: "blocks_publication",
    title: "Perfil de tienda completo",
    description:
      "Nombre, slug público y descripción visible para los compradores.",
    resolved: hasStoreProfile,
    href: "/admin/store?tab=branding",
    ctaLabel: hasStoreProfile ? "Revisar perfil" : "Completar perfil",
    detail: hasStoreProfile
      ? `/${store.slug}`
      : store.description
        ? "Falta descripción pública"
        : "Falta descripción pública",
  });

  const storeIsActive = store.status === "active";
  checks.push({
    id: "store_active",
    severity: "blocks_publication",
    title: "Tienda publicada",
    description:
      "Aplicá los cambios al storefront público. Hasta entonces, nadie ve tu tienda.",
    resolved: storeIsActive,
    href: "/admin/store",
    ctaLabel: storeIsActive ? "Ver storefront" : "Publicar",
    detail: storeIsActive ? "Estado: active" : `Estado actual: ${store.status}`,
  });

  const hasSellableProduct =
    publishedCount > 0 && publishedCount - publishedWithoutStock > 0;
  checks.push({
    id: "sellable_product",
    severity: "blocks_publication",
    title: "Al menos un producto vendible",
    description:
      "Un producto publicado con variante disponible (stock o backorder habilitado).",
    resolved: hasSellableProduct,
    href: totalProducts > 0 ? "/admin/catalog" : "/admin/sourcing",
    ctaLabel: hasSellableProduct
      ? "Administrar catálogo"
      : totalProducts > 0
        ? "Publicar producto"
        : "Cargar productos",
    detail:
      totalProducts === 0
        ? "Sin productos en catálogo"
        : `${publishedCount} de ${totalProducts} publicados`,
  });

  // Platform MP readiness is a strict prerequisite for the tenant MP
  // connection step. If platform envs are missing, the "connect MP" CTA
  // wouldn't even load the auth URL — so we surface this honestly.
  if (!platformMp.ready) {
    checks.push({
      id: "platform_mp_env",
      severity: "blocks_publication",
      title: "Plataforma de pagos configurada",
      description:
        "Nexora aún no puede iniciar la conexión de Mercado Pago porque faltan variables a nivel infraestructura.",
      resolved: false,
      href: "/admin/settings/integrations/mercadopago",
      ctaLabel: "Contactar soporte",
      detail: `Faltan: ${platformMp.missing.join(", ")}`,
    });
  }

  // ─── blocks_sales ──────────────────────────────────────────────────────

  const mpConnected =
    mpConnection?.status === "connected" &&
    Boolean(mpConnection.accessTokenEncrypted);
  checks.push({
    id: "mp_connected",
    severity: "blocks_sales",
    title: "Mercado Pago conectado",
    description:
      "Sin cuenta conectada, el checkout queda desactivado y los pedidos no se cobran.",
    resolved: mpConnected,
    href: "/admin/store?tab=pagos",
    ctaLabel: mpConnected ? "Ver conexión" : "Conectar Mercado Pago",
    detail: mpConnected
      ? `Cuenta ${mpConnection?.externalAccountId ?? "conectada"}`
      : mpConnection?.status
        ? `Estado: ${mpConnection.status}`
        : "Sin token tenant",
  });

  checks.push({
    id: "products_with_price",
    severity: "blocks_sales",
    title: "Productos con precio real",
    description:
      "Las variantes publicadas deben tener un precio mayor a 0 para poder ser vendidas.",
    resolved: publishedWithZeroPrice === 0 && publishedCount > 0,
    href: "/admin/catalog",
    ctaLabel:
      publishedWithZeroPrice > 0 ? "Corregir precios" : "Revisar catálogo",
    detail:
      publishedCount === 0
        ? "Sin productos publicados todavía"
        : publishedWithZeroPrice > 0
          ? `${publishedWithZeroPrice} con variantes a $0`
          : `${publishedCount} OK`,
  });

  // ─── blocks_conversion ─────────────────────────────────────────────────

  checks.push({
    id: "products_have_images",
    severity: "blocks_conversion",
    title: "Productos con imágenes",
    description:
      "Productos sin imagen convierten mucho peor que los que tienen al menos una foto real.",
    resolved: publishedWithoutImages === 0 && publishedCount > 0,
    href: "/admin/catalog",
    ctaLabel:
      publishedWithoutImages > 0 ? "Agregar imágenes" : "Revisar catálogo",
    detail:
      publishedCount === 0
        ? "Sin productos publicados"
        : publishedWithoutImages > 0
          ? `${publishedWithoutImages} sin imagen`
          : `${publishedCount} OK`,
  });

  checks.push({
    id: "products_have_description",
    severity: "blocks_conversion",
    title: "Productos con descripción",
    description:
      "Una descripción honesta reduce devoluciones y mejora el SEO de tu tienda.",
    resolved: publishedWithoutDescription === 0 && publishedCount > 0,
    href: "/admin/catalog",
    ctaLabel:
      publishedWithoutDescription > 0 ? "Completar descripciones" : "Revisar catálogo",
    detail:
      publishedCount === 0
        ? "Sin productos publicados"
        : publishedWithoutDescription > 0
          ? `${publishedWithoutDescription} sin descripción`
          : `${publishedCount} OK`,
  });

  const hasBrandingLogo = Boolean(branding?.logoUrl || store.logo);
  checks.push({
    id: "branding_logo",
    severity: "blocks_conversion",
    title: "Logo cargado",
    description:
      "Un logo propio da credibilidad al storefront y al email de post-compra.",
    resolved: hasBrandingLogo,
    href: "/admin/store?tab=branding",
    ctaLabel: hasBrandingLogo ? "Revisar branding" : "Subir logo",
  });

  // ─── recommendations ───────────────────────────────────────────────────

  const brandingCustomized = Boolean(
    branding &&
      (branding.primaryColor !== "#0F172A" ||
        branding.fontFamily !== "Inter" ||
        branding.tone !== "professional"),
  );
  checks.push({
    id: "branding_customized",
    severity: "recommendation",
    title: "Identidad visual personalizada",
    description:
      "Cambiá colores, tipografía y tono para que el storefront no parezca una plantilla.",
    resolved: brandingCustomized,
    href: "/admin/store?tab=branding",
    ctaLabel: brandingCustomized ? "Ajustar branding" : "Personalizar",
  });

  checks.push({
    id: "sourcing_connected",
    severity: "recommendation",
    title: "Proveedor de sourcing conectado",
    description:
      "Conectá un proveedor real o importá un feed para mantener el catálogo actualizado automáticamente.",
    resolved: activeProviderCount > 0,
    href: "/admin/sourcing",
    ctaLabel:
      activeProviderCount > 0 ? "Ver proveedores" : "Explorar proveedores",
    detail:
      activeProviderCount > 0
        ? `${activeProviderCount} activo${activeProviderCount !== 1 ? "s" : ""}`
        : undefined,
  });

  // If an AI draft exists and hasn't been applied, surface it as a
  // recommendation (never as a blocker — a store can publish without ever
  // using the AI builder).
  if (aiDraft && aiDraft.status !== "applied") {
    const hasSelection = Boolean(aiDraft.selectedProposalId);
    checks.push({
      id: "ai_draft_apply",
      severity: "recommendation",
      title: hasSelection
        ? "Aplicar propuesta IA seleccionada"
        : "Elegir propuesta IA",
      description: hasSelection
        ? "Volcá el diseño generado al storefront para dejar la tienda lista para publicar."
        : "Elegí una variante del constructor IA para avanzar a publicación.",
      resolved: false,
      href: "/admin/store-ai",
      ctaLabel: hasSelection ? "Aplicar propuesta" : "Elegir propuesta",
    });
  }

  // ─── Derived state ─────────────────────────────────────────────────────

  const publicationBlockers = checks.filter(
    (c) => c.severity === "blocks_publication" && !c.resolved,
  ).length;
  const salesBlockers = checks.filter(
    (c) => c.severity === "blocks_sales" && !c.resolved,
  ).length;
  const conversionWarnings = checks.filter(
    (c) => c.severity === "blocks_conversion" && !c.resolved,
  ).length;
  const recommendations = checks.filter(
    (c) => c.severity === "recommendation" && !c.resolved,
  ).length;

  let status: ReadinessStatus;
  if (publicationBlockers > 0 || salesBlockers > 0) {
    status = "blocked";
  } else if (conversionWarnings > 0) {
    status = "ready_with_warnings";
  } else {
    status = "ready";
  }

  // Primary action: first unresolved check by severity order.
  const severityOrder: ReadinessSeverity[] = [
    "blocks_publication",
    "blocks_sales",
    "blocks_conversion",
    "recommendation",
  ];
  let primary: ReadinessCheck | undefined;
  for (const sev of severityOrder) {
    primary = checks.find((c) => c.severity === sev && !c.resolved);
    if (primary) break;
  }
  const primaryAction = primary
    ? { label: primary.ctaLabel, href: primary.href, reason: primary.id }
    : {
        label: "Ver storefront",
        href: "/admin/store",
        reason: "all_checks_resolved",
      };

  return {
    status,
    publicationBlockers,
    salesBlockers,
    conversionWarnings,
    recommendations,
    checks,
    primaryAction,
    generatedAt: new Date().toISOString(),
  };
}
