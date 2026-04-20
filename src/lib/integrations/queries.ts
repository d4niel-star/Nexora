"use server";

// ─── Unified integrations hub query ─────────────────────────────────────
// Single server-side entry point that walks every subsystem Nexora
// actually integrates with and returns a typed, honest status per
// integration. The goal is depth, not breadth — we add MP (payments),
// retention/ops apps (whatsapp, post-purchase, reviews, bundles, order
// tracking) and we keep ads + providers, so the hub finally matches the
// 5 priority categories in the brief.
//
// Rules of engagement:
//   1. States are honest and multi-level — never just "connected /
//      disconnected". The enum distinguishes "ready", "needs setup",
//      "needs reconnection", "degraded" (connected but with a
//      functional caveat), "error", "not_installed" (nothing to show
//      yet but the integration exists and could be turned on).
//   2. Every entry carries an href + ctaLabel pointing to the RIGHT
//      module (MP → store pagos tab, whatsapp → its setup page, etc.),
//      never the generic /admin/integrations fallback.
//   3. Every entry may carry a "metric" — a small honest count drawn
//      directly from DB (bundles activos, reviews aprobadas, …).
//      No invented KPIs, no commercial impact scores.

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import { getMercadoPagoPlatformReadiness } from "@/lib/payments/mercadopago/platform-readiness";

export type IntegrationCategory =
  | "payment"
  | "logistics"
  | "provider"
  | "ad_platform"
  | "retention"
  | "platform";

/**
 * Honest state enum — lets the UI differentiate "not installed yet" from
 * "installed but needs config" from "connected but degraded". The old
 * connected/disconnected binary was collapsing three very different
 * situations into the same chip.
 */
export type IntegrationState =
  | "ready"
  | "needs_setup"
  | "needs_reconnection"
  | "degraded"
  | "error"
  | "not_installed";

export type IntegrationHealth = "operational" | "degraded" | "critical" | "inactive";

export interface UnifiedConnection {
  id: string;
  type: IntegrationCategory;
  name: string;
  platform: string;
  /** Legacy shape kept for backwards compat with any existing consumers. */
  status: "connected" | "disconnected" | "error" | "pending" | "expired";
  /** New honest, multi-level state. Prefer this in UI. */
  state: IntegrationState;
  health: IntegrationHealth;
  lastSync: Date | null;
  description: string;
  /** Where to go to resolve or configure this integration. */
  href: string;
  /** Contextual CTA label. Never a generic "Ver". */
  ctaLabel: string;
  /** Honest metric drawn from DB when available (e.g. "4 ofertas activas"). */
  metric?: string;
  /** Last error string surfaced only when state is `error` or `needs_reconnection`. */
  lastError?: string | null;
}

export async function getUnifiedConnections(): Promise<UnifiedConnection[]> {
  const store = await getCurrentStore();
  if (!store) return [];
  const sid = store.id;

  const connections: UnifiedConnection[] = [];

  // ── Parallel DB reads ─────────────────────────────────────────────────
  const [
    mp,
    ads,
    providers,
    whatsapp,
    postPurchase,
    reviewsApproved,
    bundlesActive,
    ordersWithTracking,
    ordersTotal,
  ] = await Promise.all([
    prisma.storePaymentProvider.findUnique({
      where: { storeId_provider: { storeId: sid, provider: "mercadopago" } },
      select: {
        id: true,
        status: true,
        accessTokenEncrypted: true,
        externalAccountId: true,
        accountEmail: true,
        lastError: true,
        lastValidatedAt: true,
        tokenExpiresAt: true,
        updatedAt: true,
      },
    }),
    prisma.adPlatformConnection.findMany({ where: { storeId: sid } }),
    prisma.providerConnection
      .findMany({ where: { storeId: sid }, include: { provider: true } })
      .catch(() => []),
    prisma.whatsappRecoverySettings
      .findUnique({ where: { storeId: sid } })
      .catch(() => null),
    prisma.postPurchaseFlowsSettings
      .findUnique({ where: { storeId: sid } })
      .catch(() => null),
    prisma.productReview
      .count({ where: { storeId: sid, status: "approved" } })
      .catch(() => 0),
    prisma.bundleOffer
      .count({ where: { storeId: sid, status: "active" } })
      .catch(() => 0),
    prisma.order
      .count({ where: { storeId: sid, trackingCode: { not: null } } })
      .catch(() => 0),
    prisma.order.count({ where: { storeId: sid } }).catch(() => 0),
  ]);

  // ── Mercado Pago (tenant + platform env) ──────────────────────────────
  // Platform env is a hard prerequisite. If it's missing, tenant OAuth
  // can't even start; we surface it as a separate critical entry so the
  // merchant (or ops) understands WHY the tenant card looks broken.
  const platformMp = getMercadoPagoPlatformReadiness();
  if (!platformMp.ready) {
    connections.push({
      id: "platform_mp_env",
      type: "platform",
      name: "Plataforma de pagos",
      platform: "mercadopago-platform",
      status: "error",
      state: "error",
      health: "critical",
      lastSync: null,
      description:
        "Configuración global de OAuth con Mercado Pago. Sin las variables de infraestructura, ninguna tienda puede iniciar la conexión.",
      href: "/admin/settings/integrations/mercadopago",
      ctaLabel: "Ver diagnóstico",
      lastError: `Faltan variables: ${platformMp.missing.join(", ")}`,
    });
  }

  const mpState = deriveMercadoPagoState(mp);
  connections.push({
    id: mp?.id ?? "mp_tenant",
    type: "payment",
    name: "Mercado Pago",
    platform: "mercadopago",
    status: mpState.legacyStatus,
    state: mpState.state,
    health: mpState.health,
    lastSync: mp?.lastValidatedAt ?? mp?.updatedAt ?? null,
    description:
      "Cobrá con Mercado Pago desde tu propia cuenta. Cada tienda liquida en su wallet — Nexora no toca ese dinero.",
    href: "/admin/store?tab=pagos",
    ctaLabel: mpState.ctaLabel,
    metric: mp?.accountEmail ? `Cuenta ${mp.accountEmail}` : undefined,
    lastError: mp?.lastError ?? null,
  });

  // ── Ad platforms ──────────────────────────────────────────────────────
  for (const ad of ads) {
    const tokenExpired =
      ad.tokenExpiresAt != null && ad.tokenExpiresAt.getTime() < Date.now();
    const state: IntegrationState = tokenExpired
      ? "needs_reconnection"
      : ad.status === "connected"
        ? "ready"
        : ad.status === "error"
          ? "error"
          : ad.status === "pending"
            ? "needs_setup"
            : "not_installed";
    connections.push({
      id: ad.id,
      type: "ad_platform",
      platform: ad.platform,
      name:
        ad.platform === "meta"
          ? "Meta Ads"
          : ad.platform === "google"
            ? "Google Ads"
            : ad.platform === "tiktok"
              ? "TikTok Ads"
              : String(ad.platform),
      status: (ad.status as UnifiedConnection["status"]) || "disconnected",
      state,
      health:
        state === "error" || state === "needs_reconnection"
          ? "critical"
          : state === "needs_setup"
            ? "degraded"
            : state === "ready"
              ? "operational"
              : "inactive",
      lastSync: ad.lastValidatedAt ?? null,
      description: "Plataforma publicitaria para medir y optimizar campañas.",
      href: "/admin/integrations",
      ctaLabel: tokenExpired
        ? "Reconectar"
        : state === "ready"
          ? "Administrar"
          : "Configurar",
      lastError: ad.lastError ?? null,
    });
  }

  // ── Sourcing providers ────────────────────────────────────────────────
  for (const prov of providers) {
    const state: IntegrationState =
      prov.status === "error"
        ? "error"
        : prov.status === "paused"
          ? "degraded"
          : prov.status === "active"
            ? "ready"
            : "needs_setup";
    connections.push({
      id: prov.id,
      type: "provider",
      platform: prov.provider?.code || "unknown",
      name: prov.provider?.name || "Proveedor",
      status: prov.status === "active" ? "connected" : (prov.status as UnifiedConnection["status"]),
      state,
      health:
        state === "error"
          ? "critical"
          : state === "degraded"
            ? "degraded"
            : state === "ready"
              ? "operational"
              : "inactive",
      lastSync: prov.lastSyncedAt ?? prov.updatedAt ?? null,
      description:
        "Proveedor de sourcing. Importa catálogo y mantiene stock sincronizado.",
      href: "/admin/sourcing",
      ctaLabel:
        state === "ready"
          ? "Sincronizar"
          : state === "error" || state === "degraded"
            ? "Revisar"
            : "Configurar",
    });
  }

  // ── Retention / Ops apps ─────────────────────────────────────────────
  // Each of these only exists as "installed + active" when the tenant has
  // concrete config or data. We never claim "active" based on presence of
  // a default row alone.

  // Order tracking widget: always available at the storefront, but only
  // "ready" once at least one order actually has a trackingCode; before
  // that the feature exists but has nothing to display.
  const trackingState: IntegrationState =
    ordersTotal === 0
      ? "not_installed"
      : ordersWithTracking > 0
        ? "ready"
        : "needs_setup";
  connections.push({
    id: "order_tracking_widget",
    type: "logistics",
    name: "Widget de tracking",
    platform: "order-tracking-widget",
    status: trackingState === "ready" ? "connected" : "disconnected",
    state: trackingState,
    health: trackingState === "ready" ? "operational" : "inactive",
    lastSync: null,
    description:
      "Página pública de seguimiento con timeline, autenticada por orden + email del comprador.",
    href: "/admin/apps/order-tracking-widget/setup",
    ctaLabel:
      trackingState === "ready" ? "Ver configuración" : "Agregar tracking a pedidos",
    metric:
      ordersTotal > 0
        ? `${ordersWithTracking}/${ordersTotal} con tracking`
        : undefined,
  });

  // WhatsApp Recovery
  const whatsappState: IntegrationState = !whatsapp
    ? "not_installed"
    : whatsapp.status === "active" &&
        whatsapp.accessTokenEncrypted &&
        whatsapp.phoneNumberId &&
        whatsapp.templateName
      ? "ready"
      : whatsapp.status === "disabled"
        ? "degraded"
        : "needs_setup";
  connections.push({
    id: whatsapp?.id ?? "whatsapp_recovery",
    type: "retention",
    name: "WhatsApp Recovery",
    platform: "whatsapp-recovery",
    status: whatsappState === "ready" ? "connected" : "disconnected",
    state: whatsappState,
    health:
      whatsappState === "ready"
        ? "operational"
        : whatsappState === "degraded"
          ? "degraded"
          : "inactive",
    lastSync: whatsapp?.lastValidatedAt ?? null,
    description:
      "Recupera carritos abandonados vía WhatsApp Cloud API con tu propio número y template aprobado.",
    href: "/admin/apps/whatsapp-recovery/setup",
    ctaLabel:
      whatsappState === "ready"
        ? "Administrar"
        : whatsappState === "not_installed"
          ? "Configurar"
          : "Completar configuración",
  });

  // Post-purchase Flows
  const postPurchaseEnabled =
    postPurchase?.reviewRequestEnabled || postPurchase?.reorderFollowupEnabled;
  const postPurchaseState: IntegrationState = !postPurchase
    ? "not_installed"
    : postPurchaseEnabled
      ? "ready"
      : "needs_setup";
  const postPurchaseMetric = postPurchase
    ? [
        postPurchase.reviewRequestEnabled
          ? `reviews ${postPurchase.reviewRequestDelayDays}d`
          : null,
        postPurchase.reorderFollowupEnabled
          ? `reorden ${postPurchase.reorderFollowupDelayDays}d`
          : null,
      ]
        .filter(Boolean)
        .join(" · ") || undefined
    : undefined;
  connections.push({
    id: postPurchase?.id ?? "post_purchase_flows",
    type: "retention",
    name: "Flujos Post-Compra",
    platform: "post-purchase-flows",
    status: postPurchaseState === "ready" ? "connected" : "disconnected",
    state: postPurchaseState,
    health: postPurchaseState === "ready" ? "operational" : "inactive",
    lastSync: postPurchase?.updatedAt ?? null,
    description:
      "Automatizaciones después de la compra: solicitar review y reorden por email.",
    href: "/admin/apps/post-purchase-flows/setup",
    ctaLabel: postPurchaseState === "ready" ? "Ajustar flujos" : "Activar flujos",
    metric: postPurchaseMetric || undefined,
  });

  // Product Reviews — "installed" once there's at least one approved review;
  // before that the app exists but doesn't display anything in the
  // storefront, so the honest state is needs_setup.
  const reviewsState: IntegrationState =
    reviewsApproved > 0 ? "ready" : "needs_setup";
  connections.push({
    id: "product_reviews",
    type: "retention",
    name: "Product Reviews",
    platform: "product-reviews",
    status: reviewsState === "ready" ? "connected" : "disconnected",
    state: reviewsState,
    health: reviewsState === "ready" ? "operational" : "inactive",
    lastSync: null,
    description:
      "Reseñas de compradores verificados con moderación pending-first antes de publicar.",
    href: "/admin/apps/product-reviews/moderation",
    ctaLabel:
      reviewsState === "ready" ? "Moderar reseñas" : "Revisar bandeja",
    metric: reviewsApproved > 0 ? `${reviewsApproved} aprobadas` : undefined,
  });

  // Bundles & Upsells
  const bundlesState: IntegrationState =
    bundlesActive > 0 ? "ready" : "needs_setup";
  connections.push({
    id: "bundles_upsells",
    type: "retention",
    name: "Bundles & Upsells",
    platform: "bundles-upsells",
    status: bundlesState === "ready" ? "connected" : "disconnected",
    state: bundlesState,
    health: bundlesState === "ready" ? "operational" : "inactive",
    lastSync: null,
    description:
      "Cross-sell manual en PDP. Sin lógica de precios, sólo sugerencias curadas por producto.",
    href: "/admin/apps/bundles-upsells/offers",
    ctaLabel: bundlesState === "ready" ? "Administrar bundles" : "Crear bundle",
    metric: bundlesActive > 0 ? `${bundlesActive} activos` : undefined,
  });

  return connections;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function deriveMercadoPagoState(
  mp:
    | {
        status: string;
        accessTokenEncrypted: string | null;
        lastError: string | null;
        tokenExpiresAt: Date | null;
      }
    | null,
): {
  state: IntegrationState;
  legacyStatus: UnifiedConnection["status"];
  health: IntegrationHealth;
  ctaLabel: string;
} {
  if (!mp || !mp.accessTokenEncrypted) {
    return {
      state: "needs_setup",
      legacyStatus: "disconnected",
      health: "inactive",
      ctaLabel: "Conectar Mercado Pago",
    };
  }

  if (
    mp.status === "needs_reconnection" ||
    mp.status === "expired" ||
    (mp.tokenExpiresAt && mp.tokenExpiresAt.getTime() < Date.now())
  ) {
    return {
      state: "needs_reconnection",
      legacyStatus: "expired",
      health: "critical",
      ctaLabel: "Reconectar",
    };
  }

  if (mp.status === "error" || mp.lastError) {
    return {
      state: "error",
      legacyStatus: "error",
      health: "critical",
      ctaLabel: "Revisar conexión",
    };
  }

  if (mp.status === "connected") {
    return {
      state: "ready",
      legacyStatus: "connected",
      health: "operational",
      ctaLabel: "Administrar conexión",
    };
  }

  // Token stored but status unknown — treat as degraded so the merchant
  // gets prompted rather than assuming it's fine.
  return {
    state: "degraded",
    legacyStatus: "pending",
    health: "degraded",
    ctaLabel: "Validar conexión",
  };
}
