"use server";

// ─── Theme Token Actions ─────────────────────────────────────────────────────
//
// Server actions for theme token management. All operations are safe and
// non-destructive: they modify ONLY the tokensJson field on StoreTheme.
// Sections, blocks, navigation, and branding remain untouched.

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { getAdminStoreId } from "@/lib/store-engine/actions";

import type { ThemeTokens, ThemeVariant } from "./types";
import { findPresetById } from "./presets";
import { DEFAULT_THEME_TOKENS } from "./defaults";

export interface ThemeActionResult {
  ok: boolean;
  errors?: string[];
}

// ─── Apply Preset (non-destructive) ─────────────────────────────────────────

export async function applyThemePresetAction(presetId: string): Promise<ThemeActionResult> {
  const storeId = await getAdminStoreId();
  if (!storeId) return { ok: false, errors: ["Sesión inválida."] };

  const preset = findPresetById(presetId);
  if (!preset) return { ok: false, errors: [`Preset "${presetId}" no existe.`] };

  await prisma.storeTheme.upsert({
    where: { storeId },
    update: {
      activePreset: presetId,
      themeVariant: preset.variant,
      tokensJson: JSON.stringify(preset.tokens),
    },
    create: {
      storeId,
      activeTheme: "custom",
      activePreset: presetId,
      themeVariant: preset.variant,
      themeStatus: "draft",
      isPublished: false,
      tokensJson: JSON.stringify(preset.tokens),
    },
  });

  await revalidateStorefront(storeId);
  return { ok: true };
}

// ─── Save Custom Tokens ──────────────────────────────────────────────────────

export async function saveThemeTokensAction(
  tokensPartial: Partial<ThemeTokens>,
): Promise<ThemeActionResult> {
  const storeId = await getAdminStoreId();
  if (!storeId) return { ok: false, errors: ["Sesión inválida."] };

  // Validate: only accept known token categories
  const allowedKeys: Array<keyof ThemeTokens> = [
    "colors", "typography", "spacing", "radius", "shadows", "layout", "effects",
  ];
  const sanitized: Partial<ThemeTokens> = {};
  for (const key of allowedKeys) {
    if (tokensPartial[key]) {
      (sanitized as Record<string, unknown>)[key] = tokensPartial[key];
    }
  }

  // Merge with existing stored tokens (additive, never destructive)
  const existing = await prisma.storeTheme.findUnique({
    where: { storeId },
    select: { tokensJson: true },
  });

  let merged: Partial<ThemeTokens> = {};
  if (existing?.tokensJson) {
    try {
      merged = JSON.parse(existing.tokensJson);
    } catch {
      merged = {};
    }
  }

  // Deep merge each category
  for (const key of allowedKeys) {
    if (sanitized[key]) {
      (merged as Record<string, unknown>)[key] = {
        ...((merged as Record<string, unknown>)[key] as object ?? {}),
        ...(sanitized[key] as object),
      };
    }
  }

  await prisma.storeTheme.upsert({
    where: { storeId },
    update: {
      tokensJson: JSON.stringify(merged),
      activePreset: null, // Custom edits clear preset association
    },
    create: {
      storeId,
      activeTheme: "custom",
      activePreset: null,
      themeVariant: "light",
      themeStatus: "draft",
      isPublished: false,
      tokensJson: JSON.stringify(merged),
    },
  });

  await revalidateStorefront(storeId);
  return { ok: true };
}

// ─── Change Variant ──────────────────────────────────────────────────────────

export async function setThemeVariantAction(variant: ThemeVariant): Promise<ThemeActionResult> {
  const storeId = await getAdminStoreId();
  if (!storeId) return { ok: false, errors: ["Sesión inválida."] };

  const validVariants: ThemeVariant[] = ["light", "dark", "auto", "custom"];
  if (!validVariants.includes(variant)) {
    return { ok: false, errors: ["Variante inválida."] };
  }

  await prisma.storeTheme.upsert({
    where: { storeId },
    update: { themeVariant: variant },
    create: {
      storeId,
      activeTheme: "custom",
      themeVariant: variant,
      themeStatus: "draft",
      isPublished: false,
    },
  });

  await revalidateStorefront(storeId);
  return { ok: true };
}

// ─── Reset Tokens (with confirmation) ────────────────────────────────────────

export async function resetThemeTokensAction(): Promise<ThemeActionResult> {
  const storeId = await getAdminStoreId();
  if (!storeId) return { ok: false, errors: ["Sesión inválida."] };

  await prisma.storeTheme.upsert({
    where: { storeId },
    update: {
      tokensJson: null,
      activePreset: null,
      themeVariant: "light",
    },
    create: {
      storeId,
      activeTheme: "minimal",
      activePreset: null,
      themeVariant: "light",
      themeStatus: "draft",
      isPublished: false,
    },
  });

  await revalidateStorefront(storeId);
  return { ok: true };
}

// ─── Get Current Token State ─────────────────────────────────────────────────

export async function getThemeTokensAction(): Promise<{
  tokens: ThemeTokens;
  variant: ThemeVariant;
  presetId: string | null;
} | null> {
  const storeId = await getAdminStoreId();
  if (!storeId) return null;

  const [theme, branding] = await Promise.all([
    prisma.storeTheme.findUnique({
      where: { storeId },
      select: { tokensJson: true, themeVariant: true, activePreset: true },
    }),
    prisma.storeBranding.findUnique({
      where: { storeId },
      select: { primaryColor: true, secondaryColor: true, fontFamily: true, buttonStyle: true },
    }),
  ]);

  // Build resolved tokens using the resolver
  const { resolveThemeTokens } = await import("./resolver");
  const config = resolveThemeTokens({
    presetId: theme?.activePreset ?? null,
    variant: (theme?.themeVariant as ThemeVariant) ?? "light",
    brandingPrimary: branding?.primaryColor,
    brandingSecondary: branding?.secondaryColor,
    brandingFont: branding?.fontFamily,
    brandingButtonStyle: branding?.buttonStyle,
    tokensJson: theme?.tokensJson ?? null,
  });

  return {
    tokens: config.tokens,
    variant: config.variant,
    presetId: config.presetId,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function revalidateStorefront(storeId: string) {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { slug: true },
  });

  revalidatePath("/admin/store-ai");
  revalidatePath("/admin/store-ai/branding");
  revalidatePath("/admin/store");
  if (store?.slug) {
    revalidatePath(`/store/${store.slug}`);
  }
}
