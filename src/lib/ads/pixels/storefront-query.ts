import { prisma } from "@/lib/db/prisma";

// ─── Storefront Analytics Config ────────────────────────────────────────
//
// Returns **only public tracking IDs** for a given store. Never exposes
// access tokens, refresh tokens, API secrets, or conversion API tokens.
//
// Consumers: StorefrontAnalyticsScripts component in the store layout.

export interface StorefrontAnalyticsConfig {
  /** GA4/Google Tag IDs — format G-XXXX or AW-XXXXXXX */
  ga4MeasurementIds: string[];
  /** Meta (Facebook) Pixel IDs — numeric strings */
  metaPixelIds: string[];
  /** TikTok Pixel Codes — alphanumeric strings */
  tiktokPixelIds: string[];
}

const EMPTY_CONFIG: StorefrontAnalyticsConfig = {
  ga4MeasurementIds: [],
  metaPixelIds: [],
  tiktokPixelIds: [],
};

/**
 * Fetch public tracking pixel IDs for a storefront.
 * - Reads from AdPlatformConnection.configJson
 * - Only returns non-secret IDs (pixel_id, pixel_code, gtag_id)
 * - Filters by storeId — strict tenant isolation
 * - Deduplicates IDs within each provider
 * - Returns empty config if no connections or no valid IDs
 */
export async function getStorefrontAnalyticsConfig(
  storeId: string,
): Promise<StorefrontAnalyticsConfig> {
  if (!storeId) return EMPTY_CONFIG;

  const connections = await prisma.adPlatformConnection.findMany({
    where: {
      storeId,
      platform: { in: ["meta", "tiktok", "google"] },
    },
    select: {
      platform: true,
      configJson: true,
    },
  });

  if (connections.length === 0) return EMPTY_CONFIG;

  const ga4Ids = new Set<string>();
  const metaIds = new Set<string>();
  const tiktokIds = new Set<string>();

  for (const conn of connections) {
    const config = safeParseJson(conn.configJson);
    if (!config) continue;

    switch (conn.platform) {
      case "google": {
        const id = extractString(config, "gtag_id");
        if (id && isValidGtagId(id)) ga4Ids.add(id);
        break;
      }
      case "meta": {
        const id = extractString(config, "pixel_id");
        if (id && isValidMetaPixelId(id)) metaIds.add(id);
        break;
      }
      case "tiktok": {
        const id = extractString(config, "pixel_code");
        if (id && isValidTikTokPixelId(id)) tiktokIds.add(id);
        break;
      }
    }
  }

  return {
    ga4MeasurementIds: [...ga4Ids],
    metaPixelIds: [...metaIds],
    tiktokPixelIds: [...tiktokIds],
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function safeParseJson(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function extractString(obj: Record<string, unknown>, key: string): string | null {
  const val = obj[key];
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** GA4: G-XXXX, AW-XXXX, GT-XXXX, UA-XXXX */
function isValidGtagId(id: string): boolean {
  return /^(G|AW|GT|UA)-[A-Z0-9-]{4,32}$/i.test(id);
}

/** Meta Pixel: numeric string, 6-20 digits */
function isValidMetaPixelId(id: string): boolean {
  return /^[0-9]{6,20}$/.test(id);
}

/** TikTok Pixel: alphanumeric, 16-32 chars */
function isValidTikTokPixelId(id: string): boolean {
  return /^[A-Z0-9]{8,32}$/i.test(id);
}
