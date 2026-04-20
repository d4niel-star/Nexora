// ─── Market Tools · Queries ─────────────────────────────────────────────
// Data layer for /admin/market. Each tool runs real DB queries against
// the tenant's store — no scores, no predictions, no fabricated metrics.
//
// Honesty guarantees:
//   * Every number comes from a Prisma query with explicit WHERE clauses.
//   * Zero Math.random, zero ML, zero opaque heuristics.
//   * When data is missing (no products, no orders), the tool returns
//     an empty state the UI renders honestly — never pads with fakes.

import { prisma } from "@/lib/db/prisma";

// ─── Tool 1: Catalog Health Audit ────────────────────────────────────────
// Finds products that are published but missing critical fields that
// hurt conversion: no image, no description, price ≤ 0, no sellable variant.

export interface CatalogHealthResult {
  totalPublished: number;
  withoutImage: number;
  withoutDescription: number;
  withZeroPrice: number;
  withoutStock: number;
  /** Up to 20 sample product IDs per issue category for the UI to link */
  samples: {
    noImage: Array<{ id: string; title: string; handle: string }>;
    noDescription: Array<{ id: string; title: string; handle: string }>;
    zeroPrice: Array<{ id: string; title: string; handle: string }>;
    noStock: Array<{ id: string; title: string; handle: string }>;
  };
}

export async function getCatalogHealthAudit(
  storeId: string,
): Promise<CatalogHealthResult> {
  const published = { storeId, isPublished: true, status: { not: "archived" as const } };
  const sampleSelect = { id: true, title: true, handle: true } as const;
  const take = 20;

  const [
    totalPublished,
    withoutImage,
    withoutDescription,
    withZeroPrice,
    withoutStock,
    noImageSamples,
    noDescriptionSamples,
    zeroPriceSamples,
    noStockSamples,
  ] = await Promise.all([
    prisma.product.count({ where: published }),
    prisma.product.count({
      where: { ...published, featuredImage: null, images: { none: {} } },
    }),
    prisma.product.count({
      where: { ...published, OR: [{ description: null }, { description: "" }] },
    }),
    prisma.product.count({
      where: { ...published, variants: { some: { price: { lte: 0 } } } },
    }),
    prisma.product.count({
      where: {
        ...published,
        variants: { none: { OR: [{ stock: { gt: 0 } }, { allowBackorder: true }] } },
      },
    }),
    prisma.product.findMany({
      where: { ...published, featuredImage: null, images: { none: {} } },
      select: sampleSelect,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: { ...published, OR: [{ description: null }, { description: "" }] },
      select: sampleSelect,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: { ...published, variants: { some: { price: { lte: 0 } } } },
      select: sampleSelect,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: {
        ...published,
        variants: { none: { OR: [{ stock: { gt: 0 } }, { allowBackorder: true }] } },
      },
      select: sampleSelect,
      take,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    totalPublished,
    withoutImage,
    withoutDescription,
    withZeroPrice,
    withoutStock,
    samples: {
      noImage: noImageSamples,
      noDescription: noDescriptionSamples,
      zeroPrice: zeroPriceSamples,
      noStock: noStockSamples,
    },
  };
}

// ─── Tool 2: Storefront Content Audit ────────────────────────────────────
// Checks homepage section health: empty sections, hidden sections,
// missing hero content, weak CTAs.

export interface StorefrontContentResult {
  totalSections: number;
  hiddenSections: number;
  sectionsWithIssues: Array<{
    blockType: string;
    issue: string;
    severity: "warning" | "info";
  }>;
  hasHero: boolean;
  heroHasHeadline: boolean;
  heroHasCTA: boolean;
  heroHasBackground: boolean;
  hasBenefits: boolean;
  hasFeaturedProducts: boolean;
}

export async function getStorefrontContentAudit(
  storeId: string,
): Promise<StorefrontContentResult> {
  const blocks = await prisma.storeBlock.findMany({
    where: { storeId, pageType: "home" },
    orderBy: { sortOrder: "asc" },
  });

  const totalSections = blocks.length;
  const hiddenSections = blocks.filter((b) => !b.isVisible).length;
  const sectionsWithIssues: StorefrontContentResult["sectionsWithIssues"] = [];

  let hasHero = false;
  let heroHasHeadline = false;
  let heroHasCTA = false;
  let heroHasBackground = false;
  let hasBenefits = false;
  let hasFeaturedProducts = false;

  for (const block of blocks) {
    let settings: Record<string, unknown> = {};
    try {
      settings = JSON.parse(block.settingsJson);
    } catch {
      sectionsWithIssues.push({
        blockType: block.blockType,
        issue: "Settings JSON inválido",
        severity: "warning",
      });
      continue;
    }

    if (block.blockType === "hero") {
      hasHero = true;
      heroHasHeadline = Boolean(settings.headline && String(settings.headline).trim());
      heroHasCTA = Boolean(settings.primaryActionLabel && String(settings.primaryActionLabel).trim());
      heroHasBackground = Boolean(settings.backgroundImageUrl && String(settings.backgroundImageUrl).trim());
      if (!heroHasHeadline) sectionsWithIssues.push({ blockType: "hero", issue: "Sin titular principal", severity: "warning" });
      if (!heroHasCTA) sectionsWithIssues.push({ blockType: "hero", issue: "Sin botón de acción", severity: "warning" });
      if (!heroHasBackground) sectionsWithIssues.push({ blockType: "hero", issue: "Sin imagen de fondo", severity: "info" });
    }

    if (block.blockType === "benefits") {
      hasBenefits = true;
      const items = Array.isArray(settings.benefits) ? settings.benefits : [];
      if (items.length === 0) sectionsWithIssues.push({ blockType: "benefits", issue: "Sin beneficios cargados", severity: "warning" });
    }

    if (block.blockType === "featured_products") {
      hasFeaturedProducts = true;
      const handles = Array.isArray(settings.productHandles) ? settings.productHandles : [];
      if (handles.length === 0) sectionsWithIssues.push({ blockType: "featured_products", issue: "Sin productos seleccionados", severity: "info" });
    }

    if (block.blockType === "testimonials") {
      const items = Array.isArray(settings.testimonials) ? settings.testimonials : [];
      if (items.length === 0) sectionsWithIssues.push({ blockType: "testimonials", issue: "Sin testimonios cargados", severity: "info" });
    }

    if (block.blockType === "faq") {
      const items = Array.isArray(settings.questions) ? settings.questions : [];
      if (items.length === 0) sectionsWithIssues.push({ blockType: "faq", issue: "Sin preguntas cargadas", severity: "info" });
    }

    if (!block.isVisible) {
      sectionsWithIssues.push({
        blockType: block.blockType,
        issue: "Sección oculta — no visible en storefront",
        severity: "info",
      });
    }
  }

  if (!hasHero) sectionsWithIssues.push({ blockType: "hero", issue: "No hay sección hero en el home", severity: "warning" });

  return {
    totalSections,
    hiddenSections,
    sectionsWithIssues,
    hasHero,
    heroHasHeadline,
    heroHasCTA,
    heroHasBackground,
    hasBenefits,
    hasFeaturedProducts,
  };
}

// ─── Tool 3: Orders Attention ────────────────────────────────────────────
// Orders needing merchant action: unpaid, unfulfilled for >48h, no tracking.

export interface OrdersAttentionResult {
  unfulfilled: number;
  unfulfilledOver48h: number;
  withoutTracking: number;
  unpaid: number;
  samples: {
    unfulfilled: Array<{ id: string; orderNumber: string; createdAt: Date }>;
    noTracking: Array<{ id: string; orderNumber: string; shippedAt: Date | null }>;
  };
}

export async function getOrdersAttentionAudit(
  storeId: string,
): Promise<OrdersAttentionResult> {
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const sampleSelect = { id: true, orderNumber: true, createdAt: true } as const;

  const [unfulfilled, unfulfilledOver48h, withoutTracking, unpaid, unfulfilledSamples, noTrackingSamples] =
    await Promise.all([
      prisma.order.count({
        where: { storeId, shippingStatus: "unfulfilled", status: { not: "cancelled" } },
      }),
      prisma.order.count({
        where: {
          storeId,
          shippingStatus: "unfulfilled",
          status: { not: "cancelled" },
          createdAt: { lte: fortyEightHoursAgo },
        },
      }),
      prisma.order.count({
        where: {
          storeId,
          shippingStatus: "shipped",
          trackingUrl: null,
          status: { not: "cancelled" },
        },
      }),
      prisma.order.count({
        where: { storeId, paymentStatus: "pending", status: { not: "cancelled" } },
      }),
      prisma.order.findMany({
        where: { storeId, shippingStatus: "unfulfilled", status: { not: "cancelled" } },
        select: sampleSelect,
        take: 10,
        orderBy: { createdAt: "asc" },
      }),
      prisma.order.findMany({
        where: {
          storeId,
          shippingStatus: "shipped",
          trackingUrl: null,
          status: { not: "cancelled" },
        },
        select: { id: true, orderNumber: true, shippedAt: true },
        take: 10,
        orderBy: { createdAt: "asc" },
      }),
    ]);

  return {
    unfulfilled,
    unfulfilledOver48h,
    withoutTracking,
    unpaid,
    samples: { unfulfilled: unfulfilledSamples, noTracking: noTrackingSamples },
  };
}

// ─── Tool 4: Growth Opportunities ────────────────────────────────────────
// Surfaces real retention signals: delivered orders without review request,
// recurring customers ready for reorder, apps not activated.

export interface GrowthOpportunitiesResult {
  deliveredWithoutReviewRequest: number;
  customersReadyForReorder: number;
  appsNotInstalled: string[];
  reviewsPendingModeration: number;
  /** Concrete next actions derived from real state */
  actions: Array<{
    id: string;
    title: string;
    description: string;
    href: string;
    ctaLabel: string;
    priority: "high" | "medium" | "low";
  }>;
}

export async function getGrowthOpportunities(
  storeId: string,
): Promise<GrowthOpportunitiesResult> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    deliveredOrders,
    reviewSentOrderIds,
    recurringCustomerEmails,
    reviewsPending,
    installedApps,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { storeId, deliveredAt: { not: null }, email: { not: "" } },
      select: { id: true },
    }),
    prisma.emailLog.findMany({
      where: {
        storeId,
        eventType: "POST_PURCHASE_REVIEW_REQUEST",
        entityType: "order",
        status: "sent",
      },
      select: { entityId: true },
    }),
    prisma.order.groupBy({
      by: ["email"],
      where: { storeId, status: { not: "cancelled" }, paymentStatus: "paid" },
      _count: { _all: true },
      having: { email: { _count: { gte: 2 } } },
    }),
    prisma.productReview.count({ where: { storeId, status: "pending" } }),
    prisma.installedApp.findMany({
      where: { storeId },
      select: { appSlug: true, status: true },
    }),
  ]);

  const sentSet = new Set(reviewSentOrderIds.map((r) => r.entityId));
  const deliveredWithoutReviewRequest = deliveredOrders.filter(
    (o) => !sentSet.has(o.id),
  ).length;

  const lastOrderByEmail = await prisma.order.groupBy({
    by: ["email"],
    where: { storeId, status: { not: "cancelled" }, paymentStatus: "paid" },
    _max: { createdAt: true },
  });

  const customersReadyForReorder = lastOrderByEmail.filter((row) => {
    const isRecurring = recurringCustomerEmails.some(
      (rc) => rc.email === row.email,
    );
    const lastDate = row._max.createdAt;
    return isRecurring && lastDate && lastDate < thirtyDaysAgo;
  }).length;

  const installedSlugs = new Set(installedApps.map((a) => a.appSlug));
  const valuableApps = [
    "abandoned-cart-recovery",
    "product-reviews",
    "bundles-upsells",
    "order-tracking-widget",
    "post-purchase-flows",
  ];
  const appsNotInstalled = valuableApps.filter((s) => !installedSlugs.has(s));

  // Build actions from real state
  const actions: GrowthOpportunitiesResult["actions"] = [];

  if (reviewsPending > 0) {
    actions.push({
      id: "moderate-reviews",
      title: `${reviewsPending} reseñas pendientes de moderación`,
      description: "Aprobá o rechazá las reseñas para mostrarlas en tu tienda.",
      href: "/admin/apps/product-reviews/moderation",
      ctaLabel: "Moderar",
      priority: "high",
    });
  }

  if (deliveredWithoutReviewRequest > 0) {
    actions.push({
      id: "review-requests",
      title: `${deliveredWithoutReviewRequest} pedidos entregados sin pedido de reseña`,
      description: "Activá el flujo de post-compra para pedir reseñas automáticamente.",
      href: "/admin/apps/post-purchase-flows/setup",
      ctaLabel: "Configurar",
      priority: "medium",
    });
  }

  if (customersReadyForReorder > 0) {
    actions.push({
      id: "reorder-customers",
      title: `${customersReadyForReorder} clientes listos para recompra`,
      description: "Clientes recurrentes cuya última compra supera los 30 días.",
      href: "/admin/growth",
      ctaLabel: "Ver clientes",
      priority: "medium",
    });
  }

  if (appsNotInstalled.length > 0) {
    actions.push({
      id: "install-apps",
      title: `${appsNotInstalled.length} apps de retención sin instalar`,
      description: `Instalá: ${appsNotInstalled.map(humanizeAppSlug).join(", ")}.`,
      href: "/admin/apps",
      ctaLabel: "Ver apps",
      priority: "low",
    });
  }

  return {
    deliveredWithoutReviewRequest,
    customersReadyForReorder,
    appsNotInstalled,
    reviewsPendingModeration: reviewsPending,
    actions,
  };
}

// ─── Tool 5: Payment & Checkout Status ───────────────────────────────────
// Real checkout readiness: is MP connected, are there recent failures, etc.

export interface PaymentCheckoutResult {
  mpConnected: boolean;
  mpAccountId: string | null;
  mpNeedsReconnection: boolean;
  storePublished: boolean;
  hasCheckoutCapability: boolean;
}

export async function getPaymentCheckoutStatus(
  storeId: string,
): Promise<PaymentCheckoutResult> {
  const [store, provider] = await Promise.all([
    prisma.store.findUnique({
      where: { id: storeId },
      select: { status: true },
    }),
    prisma.storePaymentProvider.findUnique({
      where: { storeId_provider: { storeId, provider: "mercadopago" } },
      select: { status: true, externalAccountId: true, accessTokenEncrypted: true },
    }),
  ]);

  const mpConnected =
    provider?.status === "connected" && Boolean(provider.accessTokenEncrypted);
  const storePublished = store?.status === "active";

  return {
    mpConnected,
    mpAccountId: provider?.externalAccountId ?? null,
    mpNeedsReconnection: provider?.status === "needs_reconnection",
    storePublished,
    hasCheckoutCapability: mpConnected && storePublished,
  };
}

// ─── Aggregated hub data ─────────────────────────────────────────────────

export interface MarketToolsSnapshot {
  catalogHealth: CatalogHealthResult;
  storefrontContent: StorefrontContentResult;
  ordersAttention: OrdersAttentionResult;
  growthOpportunities: GrowthOpportunitiesResult;
  paymentCheckout: PaymentCheckoutResult;
}

export async function getMarketToolsSnapshot(
  storeId: string,
): Promise<MarketToolsSnapshot> {
  const [catalogHealth, storefrontContent, ordersAttention, growthOpportunities, paymentCheckout] =
    await Promise.all([
      getCatalogHealthAudit(storeId),
      getStorefrontContentAudit(storeId),
      getOrdersAttentionAudit(storeId),
      getGrowthOpportunities(storeId),
      getPaymentCheckoutStatus(storeId),
    ]);

  return { catalogHealth, storefrontContent, ordersAttention, growthOpportunities, paymentCheckout };
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function humanizeAppSlug(slug: string): string {
  const map: Record<string, string> = {
    "abandoned-cart-recovery": "Recuperación de carritos",
    "product-reviews": "Reseñas",
    "bundles-upsells": "Bundles",
    "order-tracking-widget": "Seguimiento",
    "post-purchase-flows": "Post-compra",
  };
  return map[slug] ?? slug;
}
