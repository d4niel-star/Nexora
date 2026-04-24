"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import {
  ADS_PROVIDERS,
  isAdsProvider,
  type AdsProviderId,
} from "@/lib/ads/registry";

// ─── Pixel / Tag Configuration ──────────────────────────────────────────
//
// Non-secret per-provider configuration (Pixel ID, Conversion API token,
// Google Tag, Merchant Center ID, etc) is stored as JSON inside the
// existing `AdPlatformConnection.configJson` column. We deliberately
// keep secrets (access tokens) on their dedicated encrypted columns —
// these values here are public-ish identifiers a merchant copy-pastes
// from the platform's UI. The shape per provider is constrained by
// the field schema declared in `lib/ads/registry.ts`.
//
// If the merchant has not connected the platform yet (no row in
// AdPlatformConnection), we still let them save the pixel config: we
// upsert a row with status="pending" so the values survive until OAuth
// happens. This mirrors the spirit of `addAdsConnection` (manual /
// pre-OAuth registration) without lying about the connection status.

export type PixelConfig = Record<string, string>;

export interface PixelConfigSnapshot {
  readonly provider: AdsProviderId;
  readonly config: PixelConfig;
  readonly hasConnection: boolean;
  readonly updatedAt: string | null;
}

function safeParseConfig(raw: string | null | undefined): PixelConfig {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: PixelConfig = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export async function getPixelConfig(
  storeId: string,
  provider: string
): Promise<PixelConfigSnapshot> {
  if (!isAdsProvider(provider)) {
    throw new Error(`Plataforma desconocida: ${provider}`);
  }
  const connection = await prisma.adPlatformConnection.findFirst({
    where: { storeId, platform: provider },
  });
  return {
    provider,
    config: safeParseConfig(connection?.configJson),
    hasConnection: !!connection,
    updatedAt: connection?.updatedAt ? connection.updatedAt.toISOString() : null,
  };
}

export async function getAllPixelConfigs(
  storeId: string
): Promise<PixelConfigSnapshot[]> {
  const rows = await prisma.adPlatformConnection.findMany({
    where: { storeId, platform: { in: ["meta", "tiktok", "google"] } },
  });
  const byPlatform = new Map(rows.map((r) => [r.platform, r]));
  return (Object.keys(ADS_PROVIDERS) as AdsProviderId[]).map((provider) => {
    const row = byPlatform.get(provider);
    return {
      provider,
      config: safeParseConfig(row?.configJson),
      hasConnection: !!row,
      updatedAt: row?.updatedAt ? row.updatedAt.toISOString() : null,
    };
  });
}

export async function savePixelConfig(
  storeId: string,
  provider: string,
  rawValues: Record<string, string>
): Promise<PixelConfigSnapshot> {
  if (!isAdsProvider(provider)) {
    throw new Error(`Plataforma desconocida: ${provider}`);
  }

  const meta = ADS_PROVIDERS[provider];
  const cleaned: PixelConfig = {};

  // Validate against the registry schema. Fields not declared in the
  // schema are dropped silently so the API can't be turned into a
  // free-form key/value bag.
  for (const field of meta.pixelFields) {
    const raw = rawValues[field.key];
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.length > field.maxLength) {
      throw new Error(
        `${field.label} excede el largo máximo (${field.maxLength}).`
      );
    }
    if (field.pattern) {
      const re = new RegExp(`^(?:${field.pattern})$`);
      if (!re.test(trimmed)) {
        throw new Error(`${field.label} no tiene un formato válido.`);
      }
    }
    cleaned[field.key] = trimmed;
  }

  for (const field of meta.pixelFields) {
    if (field.required && !cleaned[field.key]) {
      throw new Error(`${field.label} es requerido.`);
    }
  }

  const existing = await prisma.adPlatformConnection.findFirst({
    where: { storeId, platform: provider },
  });

  const configJson = JSON.stringify(cleaned);

  let connection;
  if (!existing) {
    connection = await prisma.adPlatformConnection.create({
      data: {
        storeId,
        platform: provider,
        status: "pending",
        configJson,
        lastError: "Configuración técnica guardada. OAuth pendiente para activar la integración.",
      },
    });
  } else {
    connection = await prisma.adPlatformConnection.update({
      where: { id: existing.id },
      data: { configJson },
    });
  }

  await prisma.systemEvent.create({
    data: {
      storeId,
      entityType: "ads_pixel_config",
      entityId: connection.id,
      eventType: "ads_pixel_config_saved",
      source: "admin_ads_pixels",
      message: `Píxeles/tags actualizados para ${meta.label}`,
      severity: "info",
    },
  });

  revalidatePath(`/admin/ads/${provider}`);
  revalidatePath("/admin/ads/pixels");
  revalidatePath("/admin/integrations");

  return {
    provider,
    config: cleaned,
    hasConnection: true,
    updatedAt: connection.updatedAt.toISOString(),
  };
}

export async function clearPixelConfig(
  storeId: string,
  provider: string
): Promise<PixelConfigSnapshot> {
  if (!isAdsProvider(provider)) {
    throw new Error(`Plataforma desconocida: ${provider}`);
  }
  const existing = await prisma.adPlatformConnection.findFirst({
    where: { storeId, platform: provider },
  });
  if (!existing) {
    return {
      provider,
      config: {},
      hasConnection: false,
      updatedAt: null,
    };
  }
  const updated = await prisma.adPlatformConnection.update({
    where: { id: existing.id },
    data: { configJson: null },
  });

  await prisma.systemEvent.create({
    data: {
      storeId,
      entityType: "ads_pixel_config",
      entityId: existing.id,
      eventType: "ads_pixel_config_cleared",
      source: "admin_ads_pixels",
      message: `Píxeles/tags borrados para ${ADS_PROVIDERS[provider].label}`,
      severity: "info",
    },
  });

  revalidatePath(`/admin/ads/${provider}`);
  revalidatePath("/admin/ads/pixels");

  return {
    provider,
    config: {},
    hasConnection: true,
    updatedAt: updated.updatedAt.toISOString(),
  };
}
