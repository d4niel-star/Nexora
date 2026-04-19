// ─── Nexora Apps V1 · Registry ───
//
// Single source of truth for every app surfaced in /admin/apps. No
// third-party code, no install scripts, no SDK. Each entry either (a) wires a
// capability that already exists elsewhere in the codebase, or (b) is marked
// `isComingSoon` to be honest about roadmap without inventing availability.
//
// Curation rule (hard): every app must justify itself on one concrete ROI
// axis (sales, conversion, recovered revenue, time saved, errors reduced,
// retention, control). No filler entries.

import type { PlanConfig } from "@/lib/billing/plans";

// ─── Types ───

export type AppCategory =
  | "conversion"
  | "marketing"
  | "retention"
  | "analytics"
  | "payments"
  | "shipping"
  | "inventory"
  | "sourcing"
  | "ai"
  | "automation"
  | "trust"
  | "operations";

export const APP_CATEGORIES: { key: AppCategory; label: string }[] = [
  { key: "conversion", label: "Conversión" },
  { key: "marketing", label: "Marketing" },
  { key: "retention", label: "Retención" },
  { key: "analytics", label: "Analytics" },
  { key: "payments", label: "Pagos" },
  { key: "shipping", label: "Envíos" },
  { key: "inventory", label: "Inventario" },
  { key: "sourcing", label: "Sourcing" },
  { key: "ai", label: "IA" },
  { key: "automation", label: "Automatización" },
  { key: "trust", label: "Confianza" },
  { key: "operations", label: "Operación" },
];

/**
 * `builtin` apps install in a single DB write. Their capability is already
 * wired (cron, page, server action, etc.) and only needs a tenant-level
 * toggle to be considered "active".
 *
 * `deep-link` apps represent capabilities that live in another admin screen.
 * Installing them is just marking them as "in use"; the CTA deep-links to
 * the configuration screen owned by that subsystem.
 *
 * We explicitly do not model remote/third-party apps in V1.
 */
export type InstallMode = "builtin" | "deep-link";

export type AppAvailability =
  | { kind: "available" }
  | { kind: "plan-locked"; minPlan: string }
  | { kind: "coming-soon" };

export interface AppDefinition {
  slug: string;
  name: string;
  /** Key into `APP_ICONS` (client-side map). String-only so the registry is
   *  serializable across the server→client boundary. */
  iconName: string;
  category: AppCategory;
  /** One-line ROI hook — shown on cards. Max ~90 chars. */
  shortDescription: string;
  /** Problem statement surfaced on detail page. */
  problem: string;
  /** Value proposition (what the merchant gains). */
  outcome: string;
  /** Bulleted capabilities shown on the detail page. */
  capabilities: string[];
  /** Deep-link or internal setup route for the configuration screen. */
  setupRoute: string | null;
  /** Deep-link or internal management route once active. */
  manageRoute: string | null;
  installMode: InstallMode;
  /** Optional static estimate shown in the detail card. */
  setupTime?: string;
  /**
   * Gating predicate against the active plan config. Return true when the
   * app is included in the plan, false when it requires an upgrade. If
   * omitted, the app is considered universally included.
   */
  planGate?: (cfg: PlanConfig) => boolean;
  /** Minimum plan name displayed to the user when locked. */
  minPlanLabel?: string;
  /** When true, the app is modelled for discovery but not installable yet. */
  isComingSoon?: boolean;
  /** Hidden from the catalogue even if defined. */
  isHidden?: boolean;
  tags?: string[];
}

// ─── Definitions ───
//
// Existing, shippable capabilities are listed first. Coming-soon entries are
// kept intentionally short and honest.

export const APP_REGISTRY: AppDefinition[] = [
  // ── Retention ──────────────────────────────────────────────────────────
  {
    slug: "abandoned-cart-recovery",
    name: "Recuperación de carritos",
    iconName: "Mail",
    category: "retention",
    shortDescription:
      "Recuperá ingresos perdidos enviando un email automático a los carritos abandonados con email capturado.",
    problem:
      "Entre el 60 % y el 80 % de los carritos se abandonan antes de pagar. Sin una acción automática, ese ingreso se pierde.",
    outcome:
      "Nexora envía un email de recuperación único a cada carrito inactivo con email capturado y marca el carrito como abandonado para no duplicar contactos.",
    capabilities: [
      "Cron interno cada 15–30 min sobre carritos con email.",
      "Template tokenizado con link directo al carrito.",
      "Un solo envío por carrito — sin spam.",
    ],
    setupRoute: "/admin/settings",
    manageRoute: "/admin/settings",
    installMode: "builtin",
    setupTime: "2 minutos",
    tags: ["email", "recovery"],
  },

  // ── Marketing ──────────────────────────────────────────────────────────
  {
    slug: "ads-meta",
    name: "Meta Ads (Pixel + CAPI)",
    iconName: "Target",
    category: "marketing",
    shortDescription:
      "Conectá Meta Ads para medir conversiones reales, disparar retargeting y optimizar campañas con CAPI.",
    problem:
      "Sin el pixel y la Conversions API, Meta no puede atribuir ventas reales y las campañas optimizan con datos ruidosos.",
    outcome:
      "Conectás tu cuenta de Meta Ads vía OAuth, Nexora reporta eventos de compra server-side y deja las campañas viendo tu tráfico.",
    capabilities: [
      "OAuth oficial con Meta, sin tokens manuales.",
      "Tracking server-to-server (resistente a bloqueadores).",
      "Panel de recomendaciones en Ads & Performance.",
    ],
    setupRoute: "/admin/ai/ads",
    manageRoute: "/admin/ai/ads",
    installMode: "deep-link",
    setupTime: "5 minutos",
    tags: ["meta", "facebook", "instagram", "pixel", "capi"],
  },
  {
    slug: "ads-google",
    name: "Google Ads",
    iconName: "BarChart3",
    category: "marketing",
    shortDescription:
      "Conversions API para Google Ads y medición confiable sin depender solo de cookies.",
    problem:
      "Google Ads sin conversiones confirmadas consume presupuesto sin aprender de las ventas reales.",
    outcome:
      "Nexora empuja eventos server-side al Measurement Protocol para que tus campañas optimicen con señales reales de compra.",
    capabilities: [
      "OAuth oficial con Google Ads.",
      "Eventos de compra vía Measurement Protocol.",
      "Recomendaciones asistidas de campaña.",
    ],
    setupRoute: "/admin/ai/ads",
    manageRoute: "/admin/ai/ads",
    installMode: "deep-link",
    setupTime: "5 minutos",
    tags: ["google", "ads"],
  },
  {
    slug: "ads-tiktok",
    name: "TikTok Ads",
    iconName: "Rocket",
    category: "marketing",
    shortDescription:
      "Conectá TikTok Ads para trackear conversiones con Events API y escalar creativos que venden.",
    problem:
      "TikTok sin Events API no entiende qué creativos generan ventas y reparte presupuesto mal.",
    outcome:
      "Nexora conecta tu cuenta vía OAuth y empuja eventos server-side a la Events API de TikTok.",
    capabilities: [
      "OAuth oficial con TikTok Business.",
      "Eventos server-side con Events API.",
      "Integrado al panel de Ads & Performance.",
    ],
    setupRoute: "/admin/ai/ads",
    manageRoute: "/admin/ai/ads",
    installMode: "deep-link",
    setupTime: "5 minutos",
    tags: ["tiktok", "ads"],
  },

  // ── Payments ───────────────────────────────────────────────────────────
  {
    slug: "mercado-pago",
    name: "Mercado Pago",
    iconName: "Wallet",
    category: "payments",
    shortDescription:
      "Procesá pagos en Argentina con Mercado Pago: tarjetas, transferencias y cuenta MP, sin fricción para tus clientes.",
    problem:
      "Sin un medio de pago argentino nativo, el checkout pierde conversión por desconfianza y rechazos de tarjeta.",
    outcome:
      "Conectás tu cuenta vía OAuth oficial y Nexora procesa pagos con split, webhooks y reconciliación automática.",
    capabilities: [
      "OAuth oficial con Mercado Pago.",
      "Webhooks de pago y reconciliación.",
      "Soporte para split de cuentas (multi-tenant).",
    ],
    setupRoute: "/admin/integrations",
    manageRoute: "/admin/integrations",
    installMode: "deep-link",
    setupTime: "5 minutos",
    tags: ["mercadopago", "argentina", "checkout"],
  },

  // ── Operations / Fiscal ────────────────────────────────────────────────
  {
    slug: "fiscal-arca",
    name: "Facturación ARCA (AFIP)",
    iconName: "ReceiptText",
    category: "operations",
    shortDescription:
      "Emití comprobantes electrónicos ARCA (AFIP) directo desde cada venta, con alias de WebService.",
    problem:
      "Emitir facturas manualmente por cada venta es lento, propenso a errores y frena el scale.",
    outcome:
      "Configurás tu perfil ARCA una vez y Nexora emite los comprobantes con tu CUIT en cada venta, respetando homologación o producción.",
    capabilities: [
      "Perfil ARCA con IVA, punto de venta y entorno.",
      "Homologación / testing sin riesgo fiscal.",
      "Textos legales obligatorios del storefront.",
    ],
    setupRoute: "/admin/fiscal/settings",
    manageRoute: "/admin/fiscal",
    installMode: "deep-link",
    setupTime: "10 minutos",
    tags: ["afip", "arca", "facturas"],
  },

  // ── Trust ──────────────────────────────────────────────────────────────
  {
    slug: "custom-domain",
    name: "Dominio personalizado",
    iconName: "Globe2",
    category: "trust",
    shortDescription:
      "Servís tu tienda en tu propio dominio. Más confianza, mejor SEO y control total de marca.",
    problem:
      "Un subdominio compartido corta la percepción de marca y lastra el SEO.",
    outcome:
      "Apuntás tu DNS una vez y Nexora emite certificados y enruta el tráfico a tu tienda.",
    capabilities: [
      "Apex + sub verificados con DNS checks.",
      "Certificados gestionados.",
      "Dominio primario configurable.",
    ],
    setupRoute: "/admin/store?tab=dominio",
    manageRoute: "/admin/store?tab=dominio",
    installMode: "deep-link",
    setupTime: "15 minutos (propagación DNS)",
    planGate: (cfg) => cfg.customDomain,
    minPlanLabel: "Core",
    tags: ["dns", "ssl"],
  },
  {
    slug: "advanced-branding",
    name: "Branding avanzado",
    iconName: "Palette",
    category: "trust",
    shortDescription:
      "Logo, tipografía, paleta, favicon y meta preview. Consistencia visual completa en storefront y mails.",
    problem:
      "Una tienda con branding parcial se ve genérica y pierde autoridad.",
    outcome:
      "Todos los assets de marca en un único lugar, aplicados al storefront, checkout y mails transaccionales.",
    capabilities: [
      "Logo, favicon y preview social.",
      "Paleta primaria/secundaria tokenizada.",
      "Tipografía consistente en todo el producto.",
    ],
    setupRoute: "/admin/store?tab=branding",
    manageRoute: "/admin/store?tab=branding",
    installMode: "deep-link",
    setupTime: "5 minutos",
    planGate: (cfg) => cfg.advancedBranding,
    minPlanLabel: "Core",
    tags: ["branding", "visual"],
  },

  // ── IA ────────────────────────────────────────────────────────────────
  {
    slug: "ai-store-builder",
    name: "AI Store Builder",
    iconName: "Sparkles",
    category: "ai",
    shortDescription:
      "Generá una tienda completa (home, páginas, navegación) a partir de un brief, con IA y editor controlado.",
    problem:
      "Arrancar una tienda desde cero implica semanas de copy, layout y navegación.",
    outcome:
      "Nexora arma una tienda publicable en minutos respetando tu brief, branding y categorías reales.",
    capabilities: [
      "Generación de home, páginas y navegación.",
      "Drafts revisables antes de publicar.",
      "Editor integrado al store-engine.",
    ],
    setupRoute: "/admin/ai/store-builder",
    manageRoute: "/admin/ai/store-builder",
    installMode: "deep-link",
    setupTime: "10 minutos",
    planGate: (cfg) => cfg.aiBuilder,
    minPlanLabel: "Growth",
    tags: ["ai", "generator"],
  },
  {
    slug: "ai-product-copy",
    name: "IA para copys de producto",
    iconName: "PenLine",
    category: "ai",
    shortDescription:
      "Generá títulos, bullets y descripciones SEO-ready en segundos, revisables antes de publicar.",
    problem:
      "Escribir copys para cada producto se vuelve el cuello de botella cuando sumás SKUs.",
    outcome:
      "La IA propone copy por producto, vos revisás y publicás. Nada se publica sin tu OK.",
    capabilities: [
      "Drafts revisables (AIGenerationDraft).",
      "Bullets SEO-friendly.",
      "Integración con el catálogo interno.",
    ],
    setupRoute: "/admin/catalog",
    manageRoute: "/admin/catalog",
    installMode: "deep-link",
    setupTime: "1 minuto",
    tags: ["ai", "copy", "seo"],
  },

  // ── Sourcing / Inventory ───────────────────────────────────────────────
  {
    slug: "sourcing-insights",
    name: "Supplier & sourcing insights",
    iconName: "Search",
    category: "sourcing",
    shortDescription:
      "Scoring real por proveedor y detección de productos listos para importar o que requieren revisión.",
    problem:
      "Sin scoring, elegís proveedor a ciegas y terminás importando productos débiles o sin stock real.",
    outcome:
      "Nexora puntúa proveedores conectados y te muestra qué productos están listos para importar, cuáles requieren revisión y cuáles son riesgo.",
    capabilities: [
      "Scoring multi-proveedor (fuerte/estable/débil/crítico).",
      "Readiness por producto (ready/review/risk).",
      "Historial de imports y sync.",
    ],
    setupRoute: "/admin/sourcing",
    manageRoute: "/admin/sourcing",
    installMode: "deep-link",
    setupTime: "Inmediato (requiere proveedor conectado)",
    planGate: (cfg) => cfg.sourcingAdvanced,
    minPlanLabel: "Scale",
    tags: ["sourcing", "score"],
  },
  {
    slug: "inventory-velocity",
    name: "Velocidad de inventario",
    iconName: "Boxes",
    category: "inventory",
    shortDescription:
      "Detectá productos lentos, quiebres inminentes y reposición sugerida antes de que la venta se caiga.",
    problem:
      "Sin una lectura de velocidad, se quiebra stock en los productos que venden y se acumula en los que no.",
    outcome:
      "Nexora lee velocidad por SKU y variante y prioriza reposición con señal temprana.",
    capabilities: [
      "Velocidad por variante.",
      "Riesgo de quiebre con fecha estimada.",
      "Sugerencias de reposición.",
    ],
    setupRoute: "/admin/inventory",
    manageRoute: "/admin/inventory",
    installMode: "deep-link",
    setupTime: "Inmediato",
    tags: ["inventory", "stock", "velocity"],
  },

  // ── Coming soon — honestos, pocos ─────────────────────────────────────
  {
    slug: "whatsapp-recovery",
    name: "WhatsApp Cart Recovery",
    iconName: "MessageCircle",
    category: "retention",
    shortDescription:
      "Recuperación de carritos por WhatsApp con template aprobado para el mercado argentino.",
    problem:
      "El mail tiene tasas de apertura bajas. WhatsApp sigue siendo el canal directo en Argentina.",
    outcome:
      "Mensaje único, plantilla aprobada y link directo al carrito. Sin spam, sin abuso.",
    capabilities: [
      "Plantilla WABA oficial.",
      "Un solo envío por carrito.",
      "Integración con el cron existente.",
    ],
    setupRoute: null,
    manageRoute: null,
    installMode: "builtin",
    isComingSoon: true,
    tags: ["whatsapp", "waba"],
  },
  {
    slug: "product-reviews",
    name: "Reseñas de productos",
    iconName: "Star",
    category: "trust",
    shortDescription:
      "Reseñas verificadas post-compra. Prueba social sin depender de Google ni Trustpilot.",
    problem:
      "Sin reseñas visibles, la conversión cae especialmente en categorías nuevas.",
    outcome:
      "Invitaciones post-compra, moderación liviana y widget en PDP.",
    capabilities: [
      "Solicitud automática post-entrega.",
      "Moderación por tenant.",
      "Widget en PDP nativo del storefront.",
    ],
    setupRoute: null,
    manageRoute: null,
    installMode: "builtin",
    isComingSoon: true,
    tags: ["reviews", "social-proof"],
  },
  {
    slug: "bundles-upsells",
    name: "Bundles y upsells",
    iconName: "BadgePercent",
    category: "conversion",
    shortDescription:
      "Aumentá el ticket con combos y upsells sugeridos en PDP y cart.",
    problem:
      "El ticket promedio se estanca si no ofrecés combinaciones ni up-sell.",
    outcome:
      "Configurás bundles y reglas de upsell, y el storefront los muestra en el contexto correcto.",
    capabilities: [
      "Bundles fijos y dinámicos.",
      "Reglas de upsell por categoría.",
      "Visibilidad en PDP y cart.",
    ],
    setupRoute: null,
    manageRoute: null,
    installMode: "builtin",
    isComingSoon: true,
    tags: ["bundles", "upsell", "aov"],
  },
  {
    slug: "order-tracking-widget",
    name: "Widget de tracking de pedidos",
    iconName: "Truck",
    category: "trust",
    shortDescription:
      "Página de tracking de marca para reducir consultas de “dónde está mi pedido”.",
    problem:
      "El 30–40 % de los tickets de soporte son sobre el estado del envío.",
    outcome:
      "Página de tracking con tu branding y estado del envío en tiempo real a partir de los webhooks del carrier.",
    capabilities: [
      "Estado por número de pedido.",
      "Integrado con CarrierWebhookLog.",
      "Branded theme.",
    ],
    setupRoute: null,
    manageRoute: null,
    installMode: "builtin",
    isComingSoon: true,
    tags: ["tracking", "post-purchase"],
  },
  {
    slug: "post-purchase-flows",
    name: "Flujos de post-compra",
    iconName: "ShoppingBag",
    category: "retention",
    shortDescription:
      "Secuencia de mails post-compra: confirmación, seguimiento, upsell y segunda compra.",
    problem:
      "Una sola compra no construye LTV. Sin flujo de post-compra, el cliente no vuelve.",
    outcome:
      "Secuencia tokenizada con tiempos y condiciones por tenant.",
    capabilities: [
      "Secuencia configurable.",
      "Gatillos basados en eventos reales.",
      "Un solo envío por evento.",
    ],
    setupRoute: null,
    manageRoute: null,
    installMode: "builtin",
    isComingSoon: true,
    tags: ["email", "lifecycle"],
  },
];

// ─── Lookups ───

export function getAppBySlug(slug: string): AppDefinition | null {
  return APP_REGISTRY.find((a) => a.slug === slug) ?? null;
}

export function listVisibleApps(): AppDefinition[] {
  return APP_REGISTRY.filter((a) => !a.isHidden);
}

/**
 * Pure, plan-aware availability resolution. Does NOT touch the DB.
 *
 * Fail-closed: if the app declares a `planGate` and the tenant has no
 * active plan config (missing / deactivated subscription), treat it as
 * `plan-locked` rather than silently allowing installation. This covers
 * trial-expired tenants and any edge case where plan data is unavailable.
 */
export function resolveAvailability(
  app: AppDefinition,
  planConfig: PlanConfig | null,
): AppAvailability {
  if (app.isComingSoon) return { kind: "coming-soon" };
  if (app.planGate) {
    if (!planConfig || !app.planGate(planConfig)) {
      return { kind: "plan-locked", minPlan: app.minPlanLabel ?? "Growth" };
    }
  }
  return { kind: "available" };
}

