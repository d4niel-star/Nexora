// ─── Marketplace · External apps registry ───────────────────────────────
//
// Catálogo de apps de terceros para el Marketplace.
//
// Política de honestidad (regla dura):
//
//   1. NO HAY INSTALACIÓN FALSA. Una app externa solo puede aparecer como
//      "available" si tiene una integración real disponible (deep-link a
//      una pantalla nuestra que la conecta o documentación oficial). El
//      resto se modela como "coming-soon" o "review".
//
//   2. Los scopes / permisos / dataAccess listados son lo que la app
//      necesitará si llega a habilitarse — NO los pedimos de forma
//      anticipada y no almacenamos credenciales aquí. Son metadata para
//      que el merchant lea antes de aceptar conectar.
//
//   3. No exponemos secretos. Los CTAs externos hoy van a:
//        - una pantalla nuestra que ya conecta el provider (deep-link),
//        - la documentación / sitio oficial del vendor (open-website),
//        - o no van a ningún lado si la availability es coming-soon /
//          review.
//
//   4. Multi-tenant: este archivo es 100% estático. La instalación real,
//      cuando exista, vivirá en `prisma.installedApp` (ya scoped por
//      storeId) o en una tabla equivalente para apps externas.

export type ExternalAppCategory =
  | "analytics"
  | "marketing"
  | "email"
  | "automation"
  | "support"
  | "crm"
  | "experience";

export const EXTERNAL_APP_CATEGORIES: { key: ExternalAppCategory; label: string }[] = [
  { key: "analytics", label: "Analytics" },
  { key: "marketing", label: "Marketing" },
  { key: "email", label: "Email & SMS" },
  { key: "automation", label: "Automatización" },
  { key: "support", label: "Soporte" },
  { key: "crm", label: "CRM" },
  { key: "experience", label: "Experiencia" },
];

/**
 * - `available`     → tiene una integración real lista (deep-link a una
 *                     pantalla nuestra) o documentación oficial usable.
 * - `coming-soon`   → en roadmap; el modelo está pero no se puede instalar.
 * - `review`        → publicación en progreso (revisión legal / vendor).
 */
export type ExternalAppAvailability = "available" | "coming-soon" | "review";

export interface ExternalAppPermission {
  /** Slug interno de permiso para auditar y matchear con scopes futuros. */
  key: string;
  /** Etiqueta en español para el merchant. */
  label: string;
}

export interface ExternalAppDefinition {
  appId: string;
  name: string;
  vendor: string;
  vendorUrl: string;
  category: ExternalAppCategory;
  iconName: string;
  shortDescription: string;
  longDescription: string;
  capabilities: string[];

  // ── Estado y disponibilidad ──
  availability: ExternalAppAvailability;
  /** Mensaje opcional explicando coming-soon / review. */
  availabilityNote?: string;

  // ── Acción (qué hace el botón) ──
  /**
   * `deep-link`     → CTA va a una pantalla nuestra que ya configura este
   *                   provider (ej: Meta Pixel ya está como interno via
   *                   /admin/ads). En ese caso usamos deep-link y aclaramos
   *                   "Configurar en Nexora".
   * `open-website`  → CTA abre el sitio oficial del vendor en una tab nueva
   *                   con `rel="noopener"`. Útil cuando la integración es
   *                   un script que el merchant pega en su tienda o se
   *                   contrata externamente.
   * `none`          → coming-soon / review: no hay CTA accionable.
   */
  action:
    | { kind: "deep-link"; href: string; label: string }
    | { kind: "open-website"; href: string; label: string }
    | { kind: "none" };

  // ── Permisos / datos (qué pide la app si llega a usarse) ──
  permissions: ExternalAppPermission[];
  dataAccess: string[]; // qué datos lee/escribe (lectura humana)
  modifiesStorefront: boolean; // ¿agrega scripts/widgets al storefront?
  sendsDataExternal: boolean; // ¿envía datos del cliente fuera de Nexora?

  // ── Legales / compliance ──
  privacyUrl?: string;
  termsUrl?: string;

  tags?: string[];
}

// ─── Definitions ─────────────────────────────────────────────────────────
//
// Lista corta y honesta. Cada entrada justifica su utilidad real para un
// merchant ecommerce y declara el costo (datos, scripts) con claridad.

export const EXTERNAL_APP_REGISTRY: ExternalAppDefinition[] = [
  // ─── Analytics ────────────────────────────────────────────────────────
  {
    appId: "google-analytics-4",
    name: "Google Analytics 4",
    vendor: "Google",
    vendorUrl: "https://analytics.google.com/",
    category: "analytics",
    iconName: "BarChart3",
    shortDescription:
      "Medí tráfico, comportamiento y conversiones de tu tienda con la suite oficial de Google.",
    longDescription:
      "GA4 mide visitas, embudos, conversiones y atribución. Nexora ya conecta server-side eventos a Google Ads, pero GA4 propio te da reporting completo en la plataforma de Google y comparativas con tus campañas.",
    capabilities: [
      "Pageviews y eventos automáticos en el storefront",
      "Embudo de conversión y tasa por device/source",
      "Compatible con Google Ads (la pantalla de Ads sigue siendo la fuente para conversions)",
    ],
    availability: "review",
    availabilityNote:
      "Estamos validando la inyección automática del Measurement ID en el storefront. Mientras tanto, podés configurarlo manualmente.",
    action: {
      kind: "open-website",
      href: "https://support.google.com/analytics/answer/9304153",
      label: "Ver instrucciones",
    },
    permissions: [
      { key: "storefront:script", label: "Insertar tag GA4 en el storefront" },
      { key: "events:read", label: "Lectura de eventos del storefront" },
    ],
    dataAccess: [
      "URLs visitadas y referrers",
      "User-agent y device del visitante",
      "Eventos de carrito y compra (sin datos personales)",
    ],
    modifiesStorefront: true,
    sendsDataExternal: true,
    privacyUrl: "https://policies.google.com/privacy",
    termsUrl: "https://marketingplatform.google.com/about/analytics/terms/us/",
    tags: ["ga4", "google", "analytics", "tracking"],
  },
  {
    appId: "hotjar",
    name: "Hotjar",
    vendor: "Hotjar (Contentsquare)",
    vendorUrl: "https://www.hotjar.com/",
    category: "experience",
    iconName: "Activity",
    shortDescription:
      "Heatmaps, session recordings y encuestas in-page para entender por qué la gente no compra.",
    longDescription:
      "Hotjar graba sesiones anónimas y arma heatmaps por página. Útil para detectar fricción concreta en PDP, checkout o navegación.",
    capabilities: [
      "Heatmaps de scroll y click por página",
      "Session replays anonimizados",
      "Encuestas y feedback con CSS-targeting",
    ],
    availability: "coming-soon",
    availabilityNote: "Soporte para inyección de script desde el panel de Nexora en evaluación.",
    action: { kind: "none" },
    permissions: [
      { key: "storefront:script", label: "Insertar tag Hotjar en el storefront" },
      { key: "session:record", label: "Grabar sesiones anónimas (sin form fields sensibles)" },
    ],
    dataAccess: [
      "Movimiento de mouse y clicks",
      "Scroll y viewport por página",
      "Inputs no sensibles (con masking obligatorio)",
    ],
    modifiesStorefront: true,
    sendsDataExternal: true,
    privacyUrl: "https://www.hotjar.com/legal/policies/privacy/",
    termsUrl: "https://www.hotjar.com/legal/policies/terms-of-service/",
    tags: ["heatmap", "ux", "session"],
  },

  // ─── Email & SMS ──────────────────────────────────────────────────────
  {
    appId: "klaviyo",
    name: "Klaviyo",
    vendor: "Klaviyo",
    vendorUrl: "https://www.klaviyo.com/",
    category: "email",
    iconName: "Mail",
    shortDescription:
      "Email marketing y SMS con segmentación basada en comportamiento de compra.",
    longDescription:
      "Klaviyo es la plataforma de referencia para email/SMS en ecommerce. Nexora ya cubre transaccionales y recovery; Klaviyo agrega segmentación avanzada, flujos de marketing y campañas masivas.",
    capabilities: [
      "Sync de clientes y pedidos via Klaviyo API",
      "Segmentación por comportamiento (LTV, RFM)",
      "Flujos de welcome, browse-abandon y win-back",
    ],
    availability: "coming-soon",
    availabilityNote:
      "Necesita conector OAuth + sync de pedidos. Sin esa pieza, una integración manual con API key no es segura para multi-tenant.",
    action: { kind: "none" },
    permissions: [
      { key: "customers:read", label: "Leer clientes de la tienda" },
      { key: "orders:read", label: "Leer pedidos de la tienda" },
      { key: "events:write", label: "Empujar eventos de comportamiento a Klaviyo" },
    ],
    dataAccess: [
      "Email, nombre y teléfono de clientes que aceptaron marketing",
      "Histórico de pedidos y montos",
      "Eventos de carrito y navegación",
    ],
    modifiesStorefront: false,
    sendsDataExternal: true,
    privacyUrl: "https://www.klaviyo.com/legal/privacy",
    termsUrl: "https://www.klaviyo.com/legal/terms",
    tags: ["email", "sms", "marketing", "automation"],
  },
  {
    appId: "mailchimp",
    name: "Mailchimp",
    vendor: "Intuit Mailchimp",
    vendorUrl: "https://mailchimp.com/",
    category: "email",
    iconName: "Send",
    shortDescription:
      "Newsletters y campañas de email para audiencias generales o de e-commerce.",
    longDescription:
      "Mailchimp cubre newsletters, landings y campañas. En e-commerce queda corto frente a Klaviyo, pero sigue siendo la herramienta más adoptada por equipos chicos y agencias.",
    capabilities: [
      "Sync de lista de clientes",
      "Campañas y newsletters",
      "Templates editables",
    ],
    availability: "coming-soon",
    availabilityNote: "Sync de audiencia + automations en evaluación.",
    action: { kind: "none" },
    permissions: [
      { key: "customers:read", label: "Leer lista de clientes que aceptaron marketing" },
      { key: "orders:read", label: "Leer pedidos para segmentación básica" },
    ],
    dataAccess: ["Email y nombre de clientes con consent", "Estado básico de pedidos"],
    modifiesStorefront: false,
    sendsDataExternal: true,
    privacyUrl: "https://www.intuit.com/privacy/statement/",
    termsUrl: "https://mailchimp.com/legal/terms/",
    tags: ["email", "newsletter"],
  },

  // ─── Automation ───────────────────────────────────────────────────────
  {
    appId: "zapier",
    name: "Zapier",
    vendor: "Zapier",
    vendorUrl: "https://zapier.com/",
    category: "automation",
    iconName: "Zap",
    shortDescription:
      "Conectá Nexora con 5.000+ apps mediante triggers y acciones sin código.",
    longDescription:
      "Zapier permite armar workflows entre Nexora y cualquier servicio externo (Sheets, Slack, Notion, CRM, etc.) sin escribir código. Necesita un conector oficial y un endpoint de webhook autenticado.",
    capabilities: [
      "Triggers de pedido creado, pago aprobado, envío despachado",
      "Actions de actualizar inventario y crear pedido",
      "Filtros y formatters de Zapier estándar",
    ],
    availability: "coming-soon",
    availabilityNote:
      "Estamos evaluando publicar un conector oficial. Mientras, podés usar webhooks REST si tenés un Zap custom.",
    action: { kind: "none" },
    permissions: [
      { key: "events:webhook", label: "Recibir eventos via webhook firmado" },
      { key: "inventory:write", label: "Actualizar stock por SKU" },
      { key: "orders:read", label: "Leer pedidos para sync externo" },
    ],
    dataAccess: ["Eventos de pedido y pago", "SKUs e inventario", "Datos de cliente del pedido"],
    modifiesStorefront: false,
    sendsDataExternal: true,
    privacyUrl: "https://zapier.com/privacy",
    termsUrl: "https://zapier.com/legal/terms-of-service",
    tags: ["webhooks", "automation", "no-code"],
  },

  // ─── CRM / Support ────────────────────────────────────────────────────
  {
    appId: "hubspot",
    name: "HubSpot CRM",
    vendor: "HubSpot",
    vendorUrl: "https://www.hubspot.com/",
    category: "crm",
    iconName: "Users",
    shortDescription:
      "Sync de clientes y deals para equipos B2B / wholesale que ya usan HubSpot.",
    longDescription:
      "Mantené tu CRM actualizado con cada cliente y pedido relevante. Tiene sentido si vendés a empresas o tenés un equipo de ventas que sigue oportunidades en HubSpot.",
    capabilities: [
      "Sync de contactos y empresas",
      "Creación de deals al crearse un pedido",
      "Mapeo de etapas de pipeline",
    ],
    availability: "coming-soon",
    availabilityNote: "OAuth oficial + mapeo de pipelines en roadmap.",
    action: { kind: "none" },
    permissions: [
      { key: "customers:read", label: "Leer clientes y contactos" },
      { key: "orders:read", label: "Leer pedidos para crear deals" },
      { key: "crm:write", label: "Escribir deals y contactos en HubSpot" },
    ],
    dataAccess: [
      "Datos de contacto de clientes B2B",
      "Histórico de pedidos y montos",
      "Notas y etapas asignadas",
    ],
    modifiesStorefront: false,
    sendsDataExternal: true,
    privacyUrl: "https://legal.hubspot.com/privacy-policy",
    termsUrl: "https://legal.hubspot.com/terms-of-service",
    tags: ["crm", "b2b", "sales"],
  },
  {
    appId: "tidio",
    name: "Tidio",
    vendor: "Tidio",
    vendorUrl: "https://www.tidio.com/",
    category: "support",
    iconName: "MessageSquare",
    shortDescription:
      "Chat en vivo + bots para responder a clientes mientras navegan tu storefront.",
    longDescription:
      "Tidio agrega un widget de chat al storefront. Útil cuando recibís consultas pre-compra que no se resuelven con FAQ.",
    capabilities: [
      "Chat en vivo desde el storefront",
      "Bots con flujos preconfigurados",
      "Integración con email y Messenger",
    ],
    availability: "coming-soon",
    availabilityNote: "Widget de chat externo aún no expuesto desde el panel de Nexora.",
    action: { kind: "none" },
    permissions: [
      { key: "storefront:script", label: "Insertar widget de Tidio en el storefront" },
      { key: "session:cookie", label: "Cookie de sesión de chat" },
    ],
    dataAccess: ["Mensajes que el cliente escribe en el chat", "Datos de contacto que comparta"],
    modifiesStorefront: true,
    sendsDataExternal: true,
    privacyUrl: "https://www.tidio.com/privacy-policy/",
    termsUrl: "https://www.tidio.com/terms-and-conditions/",
    tags: ["chat", "support", "widget"],
  },

  // ─── Marketing — duplicaciones honestas ──────────────────────────────
  // Meta Pixel y Google Ads YA viven como apps internas de Nexora vía
  // /admin/ads (OAuth oficial + CAPI server-side). Las exponemos también
  // en el catálogo externo con un deep-link para que el merchant que
  // viene buscando "Meta Pixel app" no se pierda.
  {
    appId: "meta-pixel-passthrough",
    name: "Meta Pixel & CAPI",
    vendor: "Meta Platforms",
    vendorUrl: "https://www.facebook.com/business/help/952192354843755",
    category: "marketing",
    iconName: "Target",
    shortDescription:
      "Tracking de conversiones para Meta. Ya disponible en Nexora — esto es un acceso directo.",
    longDescription:
      "Si buscás conectar Meta para tracking de conversiones, Nexora ya lo expone como herramienta interna con OAuth oficial y CAPI server-side. Esta tarjeta te lleva ahí.",
    capabilities: [
      "Pixel del lado del cliente",
      "Conversions API server-to-server",
      "Atribución resistente a ad-blockers",
    ],
    availability: "available",
    action: {
      kind: "deep-link",
      href: "/admin/ads",
      label: "Configurar en Nexora",
    },
    permissions: [
      { key: "ads:oauth", label: "OAuth con Meta Business Manager" },
      { key: "events:write", label: "Empujar eventos de compra a Meta" },
    ],
    dataAccess: [
      "Eventos de compra (monto, productos)",
      "Hash de email/teléfono cuando el cliente lo dio",
    ],
    modifiesStorefront: true,
    sendsDataExternal: true,
    privacyUrl: "https://www.facebook.com/privacy/policy/",
    termsUrl: "https://www.facebook.com/legal/terms",
    tags: ["meta", "facebook", "instagram", "pixel", "capi"],
  },
];

// ─── Lookups ─────────────────────────────────────────────────────────────

export function listExternalApps(): ExternalAppDefinition[] {
  return EXTERNAL_APP_REGISTRY;
}

export function getExternalAppById(appId: string): ExternalAppDefinition | null {
  return EXTERNAL_APP_REGISTRY.find((a) => a.appId === appId) ?? null;
}
