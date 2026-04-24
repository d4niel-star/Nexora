// ─── Payment provider registry ─────────────────────────────────────────────
// Single source of truth for every payment provider Nexora supports for
// Argentina (ARS). Each entry is a *real* provider with public merchant
// documentation. We never invent providers, and we declare honestly which
// ones are fully wired into the storefront checkout (today only Mercado
// Pago) and which ones are persisted-and-validated but still pending the
// final checkout wiring (those are marked `checkoutWired: false`).
//
// The registry mirrors the shape of `lib/shipping/registry.ts` so the
// admin surface can render a uniform provider grid.

export type PaymentProviderId =
  | "mercadopago"
  | "modo"
  | "uala-bis"
  | "dlocal"
  | "payu"
  | "payway";

export type PaymentConnectionStyle = "oauth" | "api_keys";

export type PaymentCapabilityKey =
  | "checkout_pro"
  | "card_payments"
  | "wallet_qr"
  | "transfer_3_0"
  | "installments"
  | "refunds"
  | "webhooks"
  | "multi_currency";

export interface PaymentCredentialField {
  key: string;
  label: string;
  description: string;
  /** When true, the value is treated as a secret and stored encrypted. */
  secret: boolean;
  /** Optional placeholder shown in the connect dialog. */
  placeholder?: string;
  /** Optional regex hint (purely for UI guidance, never enforced server-side). */
  exampleHint?: string;
}

export interface PaymentProviderMetadata {
  id: PaymentProviderId;
  label: string;
  /** Short, merchant-facing tagline. */
  tagline: string;
  /** Long-form explanation rendered in the provider drawer / detail page. */
  description: string;
  /** Argentina is the home market today; copy reflects that. */
  countries: string[];
  currencies: string[];
  connectionStyle: PaymentConnectionStyle;
  /** OAuth providers expose a start endpoint instead of a credential form. */
  oauthStartPath?: string;
  /** API-key providers describe each input field they require. */
  credentialFields?: PaymentCredentialField[];
  capabilities: PaymentCapabilityKey[];
  /** Honest note about what works in this codebase right now. */
  capabilityNotes: string[];
  /** Official documentation entry point. Always a real URL. */
  docsUrl: string;
  /**
   * `true` only if the provider is wired into the storefront checkout
   * (preference creation, redirect, webhook). `false` when the provider
   * can be persisted+validated but the storefront still routes payments
   * through Mercado Pago. Surfaced honestly in the UI.
   */
  checkoutWired: boolean;
  /**
   * Some providers require a contractual onboarding (KYC, signed
   * agreement, sandbox approval) before any API call works. We surface
   * this so merchants understand what they need before clicking
   * "Conectar".
   */
  requiresContractualOnboarding: boolean;
  /** Brand accent used in the provider tile (ink-token compatible). */
  accent: { from: string; to: string };
  /** One-line helper text that appears above the connect button. */
  connectHelper?: string;
}

export const PAYMENT_PROVIDER_REGISTRY: Record<PaymentProviderId, PaymentProviderMetadata> = {
  mercadopago: {
    id: "mercadopago",
    label: "Mercado Pago",
    tagline: "Checkout líder en Argentina. Tarjetas, dinero en cuenta, QR y cuotas.",
    description:
      "Integración OAuth oficial de Mercado Pago para Argentina. Cada tienda conecta su propia cuenta MP y Nexora guarda el access/refresh token cifrado. Los pagos viajan al checkout de MP y la confirmación llega por webhook firmado.",
    countries: ["AR"],
    currencies: ["ARS"],
    connectionStyle: "oauth",
    oauthStartPath: "/api/payments/mercadopago/oauth/start",
    capabilities: [
      "checkout_pro",
      "card_payments",
      "wallet_qr",
      "installments",
      "refunds",
      "webhooks",
    ],
    capabilityNotes: [
      "Checkout Pro con redirect: el comprador paga en MP y vuelve confirmado.",
      "Webhook firmado: la orden recién pasa a `paid` cuando MP confirma el pago.",
      "Refresh automático: el token se renueva 24 h antes de expirar.",
    ],
    docsUrl: "https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/landing",
    checkoutWired: true,
    requiresContractualOnboarding: false,
    accent: { from: "#00B1EA", to: "#0A4A8F" },
    connectHelper:
      "Te redirigimos a Mercado Pago para que autorices a Nexora a cobrar en tu nombre.",
  },
  modo: {
    id: "modo",
    label: "MODO",
    tagline: "Billetera bancaria interoperable. Adoptada por +50 bancos del país.",
    description:
      "MODO es la red de pagos bancarios de Argentina (Banelco + Red Link + bancos socios). El alta como comercio se gestiona con MODO Business; una vez aprobado, MODO entrega un client_id y client_secret que Nexora usa para generar intentos de pago y recibir webhooks.",
    countries: ["AR"],
    currencies: ["ARS"],
    connectionStyle: "api_keys",
    credentialFields: [
      {
        key: "clientId",
        label: "Client ID",
        description: "Identificador del comercio entregado por MODO Business.",
        secret: false,
        placeholder: "01HXXXXXXXXXXXXXXXXXXXXXXX",
      },
      {
        key: "clientSecret",
        label: "Client Secret",
        description: "Secreto de autenticación. Se guarda cifrado y nunca se vuelve a mostrar.",
        secret: true,
        placeholder: "********",
      },
      {
        key: "merchantId",
        label: "Merchant ID",
        description: "ID del comercio dentro de MODO. Suele coincidir con el CUIT/CUIL formateado.",
        secret: false,
        placeholder: "30-12345678-9",
      },
    ],
    capabilities: ["wallet_qr", "transfer_3_0", "card_payments", "webhooks", "refunds"],
    capabilityNotes: [
      "Soporta pagos QR interoperables y débito desde cuenta bancaria.",
      "El cobro a la tienda se acredita en la cuenta bancaria asociada al alta MODO.",
      "Disponibilidad real depende del alta comercial firmada con MODO.",
    ],
    docsUrl: "https://business.modo.com.ar",
    checkoutWired: false,
    requiresContractualOnboarding: true,
    accent: { from: "#0A1A36", to: "#1F47C7" },
    connectHelper:
      "Cargá las credenciales que te entregó MODO Business. Las guardamos cifradas y validamos el comercio contra la API.",
  },
  "uala-bis": {
    id: "uala-bis",
    label: "Ualá Bis",
    tagline: "Cobros con link de pago, QR y tarjetas para emprendedores.",
    description:
      "Ualá Bis es la solución de cobros para comercios de Ualá. Permite cobros con tarjeta, QR interoperable y links de pago. La integración se hace con un API key emitido desde el panel de Ualá Bis.",
    countries: ["AR"],
    currencies: ["ARS"],
    connectionStyle: "api_keys",
    credentialFields: [
      {
        key: "apiKey",
        label: "API Key de Ualá Bis",
        description:
          "Token privado que se genera desde el panel de Ualá Bis (Configuración → Integraciones).",
        secret: true,
        placeholder: "ualabis_live_********",
      },
      {
        key: "merchantId",
        label: "ID de comercio",
        description: "Identificador público del comercio en Ualá Bis.",
        secret: false,
        placeholder: "uala_merchant_id",
      },
    ],
    capabilities: ["card_payments", "wallet_qr", "installments", "webhooks"],
    capabilityNotes: [
      "Cobro con tarjeta y QR interoperable Transferencias 3.0.",
      "Acreditación a la cuenta Ualá del comercio.",
      "Necesitás cuenta Ualá Bis activa y validada.",
    ],
    docsUrl: "https://bis.uala.com.ar",
    checkoutWired: false,
    requiresContractualOnboarding: true,
    accent: { from: "#7B5BFF", to: "#3B1FA8" },
    connectHelper:
      "Pegá el API key generado en el panel de Ualá Bis. Lo guardamos cifrado por tienda.",
  },
  dlocal: {
    id: "dlocal",
    label: "dLocal",
    tagline: "Procesador internacional con soporte completo en Argentina.",
    description:
      "dLocal es el gateway que usan Shopify, Spotify y Amazon para cobrar en LATAM. Soporta tarjetas locales, transferencias y métodos alternativos en pesos argentinos. La integración usa la API Smart Payments con credenciales del Merchant Dashboard.",
    countries: ["AR", "BR", "CL", "CO", "MX", "PE", "UY"],
    currencies: ["ARS", "USD"],
    connectionStyle: "api_keys",
    credentialFields: [
      {
        key: "xLogin",
        label: "X-Login",
        description: "Identificador público del merchant. Lo encontrás en Settings → API Keys.",
        secret: false,
        placeholder: "ABC123",
      },
      {
        key: "xTransKey",
        label: "X-Trans-Key",
        description: "Trans Key privada del merchant. Se guarda cifrada.",
        secret: true,
        placeholder: "********",
      },
      {
        key: "secretKey",
        label: "Secret Key",
        description: "Secret usado para firmar webhooks. Indispensable para validar callbacks.",
        secret: true,
        placeholder: "********",
      },
      {
        key: "environment",
        label: "Entorno",
        description: 'Usá "sandbox" para pruebas o "live" cuando el merchant esté aprobado.',
        secret: false,
        placeholder: "live",
        exampleHint: "sandbox | live",
      },
    ],
    capabilities: [
      "card_payments",
      "installments",
      "refunds",
      "webhooks",
      "multi_currency",
    ],
    capabilityNotes: [
      "Procesador internacional habilitado en Argentina con liquidación local.",
      "Sandbox completamente funcional para validar credenciales antes de operar.",
      "Requiere alta comercial con dLocal y aprobación KYC.",
    ],
    docsUrl: "https://docs.dlocal.com",
    checkoutWired: false,
    requiresContractualOnboarding: true,
    accent: { from: "#16C784", to: "#0E7C50" },
    connectHelper:
      "Cargá las credenciales del Merchant Dashboard de dLocal. Validamos el ping de autenticación contra la API.",
  },
  payu: {
    id: "payu",
    label: "PayU LATAM",
    tagline: "Plataforma de pagos regional con APIs robustas.",
    description:
      "PayU LATAM opera en Argentina con liquidación local y soporte de tarjetas + cuotas. La integración usa API Key + API Login del Merchant Dashboard y permite cobrar en ARS desde la API REST de PayU Payments.",
    countries: ["AR", "BR", "CL", "CO", "MX", "PE"],
    currencies: ["ARS"],
    connectionStyle: "api_keys",
    credentialFields: [
      {
        key: "apiKey",
        label: "API Key",
        description: "API Key privada del merchant. Se guarda cifrada.",
        secret: true,
        placeholder: "********",
      },
      {
        key: "apiLogin",
        label: "API Login",
        description: "Login público del merchant.",
        secret: false,
        placeholder: "pRRXKOl8ikMmt9u",
      },
      {
        key: "merchantId",
        label: "Merchant ID",
        description: "ID numérico de la cuenta merchant.",
        secret: false,
        placeholder: "508029",
      },
      {
        key: "accountId",
        label: "Account ID Argentina",
        description: "Account ID específico de la cuenta argentina.",
        secret: false,
        placeholder: "512327",
      },
      {
        key: "environment",
        label: "Entorno",
        description: 'Usá "sandbox" para pruebas o "live" cuando el merchant esté aprobado.',
        secret: false,
        placeholder: "live",
        exampleHint: "sandbox | live",
      },
    ],
    capabilities: ["card_payments", "installments", "refunds", "webhooks"],
    capabilityNotes: [
      "Tarjetas locales en pesos argentinos con cuotas.",
      "Sandbox público disponible para test sin alta productiva.",
      "Requiere cuenta aprobada por PayU para operar en producción.",
    ],
    docsUrl: "https://developers.payulatam.com",
    checkoutWired: false,
    requiresContractualOnboarding: true,
    accent: { from: "#A6C307", to: "#5A6C00" },
    connectHelper:
      "Pegá las credenciales del Merchant Dashboard de PayU. Validamos el ping de autenticación contra el sandbox o live según corresponda.",
  },
  payway: {
    id: "payway",
    label: "Payway (Decidir)",
    tagline: "Gateway bancario de Prisma Medios de Pago. Adoptado por la banca local.",
    description:
      "Payway es la plataforma de Prisma Medios de Pago (ex Decidir). Es el gateway predeterminado de muchos bancos argentinos. La integración usa Public Key (frontend) + Private Key (server) emitidas en el portal Payway.",
    countries: ["AR"],
    currencies: ["ARS"],
    connectionStyle: "api_keys",
    credentialFields: [
      {
        key: "publicApiKey",
        label: "Public API Key",
        description: "Llave pública usada en el SDK de tokenización.",
        secret: false,
        placeholder: "e9cdb99fff374b5f91da4480c8dca741",
      },
      {
        key: "privateApiKey",
        label: "Private API Key",
        description: "Llave privada usada en server-side. Se guarda cifrada.",
        secret: true,
        placeholder: "********",
      },
      {
        key: "siteId",
        label: "Site ID",
        description: "Identificador de sitio asignado por Payway.",
        secret: false,
        placeholder: "00021123",
      },
      {
        key: "environment",
        label: "Entorno",
        description: 'Usá "sandbox" o "live".',
        secret: false,
        placeholder: "live",
        exampleHint: "sandbox | live",
      },
    ],
    capabilities: ["card_payments", "installments", "refunds", "webhooks"],
    capabilityNotes: [
      "Gateway bancario con cuotas locales.",
      "El alta y el riesgo lo gestiona Prisma Medios de Pago.",
      "Operación productiva requiere contrato firmado con Payway.",
    ],
    docsUrl: "https://www.payway.com.ar",
    checkoutWired: false,
    requiresContractualOnboarding: true,
    accent: { from: "#FF6B00", to: "#B43F00" },
    connectHelper:
      "Cargá las llaves emitidas por el portal Payway. La pública se usa en el SDK del checkout y la privada queda cifrada server-side.",
  },
};

export const PAYMENT_PROVIDER_ORDER: PaymentProviderId[] = [
  "mercadopago",
  "modo",
  "uala-bis",
  "dlocal",
  "payu",
  "payway",
];

export function getPaymentProviderMetadata(id: string): PaymentProviderMetadata | null {
  return (PAYMENT_PROVIDER_REGISTRY as Record<string, PaymentProviderMetadata>)[id] ?? null;
}

export function isKnownPaymentProvider(id: string): id is PaymentProviderId {
  return id in PAYMENT_PROVIDER_REGISTRY;
}

export const PAYMENT_CAPABILITY_LABELS: Record<PaymentCapabilityKey, string> = {
  checkout_pro: "Checkout Pro",
  card_payments: "Tarjetas",
  wallet_qr: "QR / Wallet",
  transfer_3_0: "Transferencias 3.0",
  installments: "Cuotas",
  refunds: "Reintegros",
  webhooks: "Webhooks",
  multi_currency: "Multimoneda",
};
