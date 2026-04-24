// ─── Ads Provider Registry ──────────────────────────────────────────────
//
// Single source of truth for the three paid-media providers Nexora
// supports today: Meta, TikTok and Google. Drives both the per-provider
// surfaces (/admin/ads/{provider}) and the Píxeles y tags hub
// (/admin/ads/pixels). Everything the UI needs to render a coherent
// connection card or a pixel-config form lives here — no per-provider
// branches scattered across components.
//
// Pixel field schema notes:
//   · Each field is *non-secret*. We store these values in
//     AdPlatformConnection.configJson, which is plain JSON. Secrets
//     (access tokens, refresh tokens) keep living on the dedicated
//     encrypted columns (accessToken / refreshToken).
//   · `pattern` is purely a client-side hint for HTML validation; the
//     server still revalidates type/length before persisting.

export type AdsProviderId = "meta" | "tiktok" | "google";

export interface AdsPixelField {
  /** Stable key used inside configJson (snake_case). */
  readonly key: string;
  /** Label rendered in the form. */
  readonly label: string;
  /** One-line helper text shown beneath the field. */
  readonly helper: string;
  /** Placeholder for the input. */
  readonly placeholder: string;
  /** Optional regex (as string) for HTML pattern validation. */
  readonly pattern?: string;
  /** Hard cap for length — enforced both client and server. */
  readonly maxLength: number;
  /** Whether the merchant must fill it for the integration to be useful. */
  readonly required: boolean;
}

export interface AdsProviderMeta {
  readonly id: AdsProviderId;
  readonly label: string;
  readonly tagline: string;
  /** External docs the merchant can open from the page header. */
  readonly docsUrl: string;
  /** Surfaces the human-readable scope list under the connection card. */
  readonly oauthScopes: readonly string[];
  /** Required env keys for the OAuth flow. The UI uses this to render
   *  honest "configuration not ready" notices instead of pretending. */
  readonly requiredEnv: readonly string[];
  /** Pixel / tag fields exposed in the Píxeles y tags hub. */
  readonly pixelFields: readonly AdsPixelField[];
  /** Hex used for accent strokes in cards / dots. Token-friendly. */
  readonly accent: string;
}

export const ADS_PROVIDERS: Readonly<Record<AdsProviderId, AdsProviderMeta>> = {
  meta: {
    id: "meta",
    label: "Meta Ads",
    tagline: "Facebook · Instagram · Messenger · Audience Network.",
    docsUrl: "https://developers.facebook.com/docs/marketing-apis/",
    oauthScopes: ["ads_management", "ads_read"],
    requiredEnv: ["FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET"],
    accent: "#1877F2",
    pixelFields: [
      {
        key: "pixel_id",
        label: "Pixel ID",
        helper: "Identificador numérico del Meta Pixel asociado a tu Business Manager.",
        placeholder: "1234567890123456",
        pattern: "[0-9]{6,20}",
        maxLength: 32,
        required: true,
      },
      {
        key: "conversion_api_token",
        label: "Token de Conversions API",
        helper: "Si usás CAPI server-side, pegá aquí el token generado en Events Manager.",
        placeholder: "EAAB…",
        maxLength: 256,
        required: false,
      },
      {
        key: "test_event_code",
        label: "Test Event Code",
        helper: "Solo para depurar eventos en el Test Events de Events Manager.",
        placeholder: "TEST12345",
        maxLength: 64,
        required: false,
      },
    ],
  },
  tiktok: {
    id: "tiktok",
    label: "TikTok Ads",
    tagline: "TikTok For Business · Spark Ads · Shop Ads.",
    docsUrl: "https://business-api.tiktok.com/portal/docs",
    oauthScopes: ["advertiser_management", "campaign_management", "report_basic"],
    requiredEnv: ["TIKTOK_APP_ID", "TIKTOK_APP_SECRET"],
    accent: "#FE2C55",
    pixelFields: [
      {
        key: "pixel_code",
        label: "Pixel Code",
        helper: "Código del TikTok Pixel (formato CXXXXXXXXXXXXXXXXXXX).",
        placeholder: "C1A2B3C4D5E6F7G8H9I0",
        pattern: "[A-Z0-9]{16,32}",
        maxLength: 32,
        required: true,
      },
      {
        key: "events_api_token",
        label: "Token de Events API",
        helper: "Token long-lived generado en Events Manager para envío server-side.",
        placeholder: "abc123…",
        maxLength: 256,
        required: false,
      },
    ],
  },
  google: {
    id: "google",
    label: "Google Ads",
    tagline: "Search · Performance Max · Shopping · YouTube.",
    docsUrl: "https://developers.google.com/google-ads/api/docs/start",
    oauthScopes: ["https://www.googleapis.com/auth/adwords"],
    requiredEnv: ["GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET", "GOOGLE_DEVELOPER_TOKEN"],
    accent: "#4285F4",
    pixelFields: [
      {
        key: "gtag_id",
        label: "Google Tag (GT-/AW-)",
        helper: "Identificador del Google Tag instalado en tu sitio (ej: AW-123456789).",
        placeholder: "AW-123456789",
        pattern: "(AW|GT|G|UA)-[A-Z0-9-]{4,32}",
        maxLength: 48,
        required: true,
      },
      {
        key: "conversion_label",
        label: "Conversion Label",
        helper: "Etiqueta de conversión del evento principal (ej: abc1d2efgHIJklm).",
        placeholder: "abc1d2efgHIJklm",
        maxLength: 64,
        required: false,
      },
      {
        key: "merchant_center_id",
        label: "Merchant Center ID",
        helper: "Solo si usás Performance Max o Shopping con feed propio.",
        placeholder: "1234567890",
        pattern: "[0-9]{6,15}",
        maxLength: 24,
        required: false,
      },
    ],
  },
};

export const ADS_PROVIDER_IDS: readonly AdsProviderId[] = ["meta", "tiktok", "google"];

export function isAdsProvider(value: string): value is AdsProviderId {
  return value === "meta" || value === "tiktok" || value === "google";
}

/** Reads the provider metadata, throwing on unknown ids — lets routes
 *  fail loudly instead of silently rendering empty surfaces. */
export function getAdsProvider(id: string): AdsProviderMeta {
  if (!isAdsProvider(id)) throw new Error(`Unknown ads provider: ${id}`);
  return ADS_PROVIDERS[id];
}
