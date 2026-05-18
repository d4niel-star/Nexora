// ─── Theme Registry — Enterprise Foundation ─────────────────────────────
// Extensible theme metadata system. Supports versioning, compatibility,
// screenshots, and preview generation for the theme marketplace.
//
// This is the architectural foundation — no full marketplace yet, but
// the data model is enterprise-ready and extensible.

import { THEME_PRESETS } from "./presets";
import type { ThemePreset, ThemeVariant } from "./types";

// ─── Registry Entry ──────────────────────────────────────────────────────

export interface ThemeRegistryEntry {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  tags: string[];
  variant: ThemeVariant;
  compatibility: {
    minAppVersion: string;
    requiredFeatures: string[];
  };
  preview: {
    thumbnailUrl: string | null;
    desktopUrl: string | null;
    mobileUrl: string | null;
  };
  preset: ThemePreset;
  createdAt: string;
  updatedAt: string;
}

// ─── Built-in Registry ───────────────────────────────────────────────────

export function getThemeRegistry(): ThemeRegistryEntry[] {
  return THEME_PRESETS.map((preset) => ({
    id: preset.id,
    name: preset.name,
    description: preset.description,
    version: "1.0.0",
    author: "Nexora",
    tags: derivePresetTags(preset),
    variant: preset.variant,
    compatibility: {
      minAppVersion: "1.0.0",
      requiredFeatures: [],
    },
    preview: {
      thumbnailUrl: null,
      desktopUrl: null,
      mobileUrl: null,
    },
    preset,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  }));
}

export function getRegistryEntry(id: string): ThemeRegistryEntry | null {
  return getThemeRegistry().find((e) => e.id === id) ?? null;
}

// ─── Preview Summary ─────────────────────────────────────────────────────
// Non-destructive preview metadata for showing a before/after diff

export interface ThemePreviewSummary {
  presetId: string;
  presetName: string;
  changes: {
    category: string;
    label: string;
    from: string;
    to: string;
  }[];
  impactLevel: "minimal" | "moderate" | "significant";
}

export function buildPreviewSummary(
  currentPresetId: string | null,
  targetPresetId: string,
): ThemePreviewSummary | null {
  const registry = getThemeRegistry();
  const target = registry.find((e) => e.id === targetPresetId);
  if (!target) return null;

  const current = currentPresetId
    ? registry.find((e) => e.id === currentPresetId)
    : null;

  const changes: ThemePreviewSummary["changes"] = [];

  // Compare color tokens
  const targetColors = target.preset.tokens.colors;
  const currentColors = current?.preset.tokens.colors;
  if (targetColors) {
    for (const [key, value] of Object.entries(targetColors)) {
      const prev = currentColors?.[key as keyof typeof currentColors] ?? "default";
      if (prev !== value) {
        changes.push({ category: "Color", label: key, from: String(prev), to: String(value) });
      }
    }
  }

  // Compare typography
  const targetTypo = target.preset.tokens.typography;
  const currentTypo = current?.preset.tokens.typography;
  if (targetTypo) {
    for (const [key, value] of Object.entries(targetTypo)) {
      const prev = currentTypo?.[key as keyof typeof currentTypo] ?? "default";
      if (prev !== value) {
        changes.push({ category: "Tipografía", label: key, from: String(prev), to: String(value) });
      }
    }
  }

  // Compare radius
  const targetRadius = target.preset.tokens.radius;
  const currentRadius = current?.preset.tokens.radius;
  if (targetRadius) {
    for (const [key, value] of Object.entries(targetRadius)) {
      const prev = currentRadius?.[key as keyof typeof currentRadius] ?? "default";
      if (prev !== value) {
        changes.push({ category: "Bordes", label: key, from: String(prev), to: String(value) });
      }
    }
  }

  const impactLevel: ThemePreviewSummary["impactLevel"] =
    changes.length > 10 ? "significant" : changes.length > 4 ? "moderate" : "minimal";

  return {
    presetId: targetPresetId,
    presetName: target.name,
    changes,
    impactLevel,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function derivePresetTags(preset: ThemePreset): string[] {
  const tags: string[] = [preset.variant];
  const colors = preset.tokens.colors;
  if (colors) {
    const bg = colors.background?.toLowerCase() ?? "";
    if (bg === "#ffffff" || bg === "#fff" || bg.includes("f8f")) tags.push("light");
    if (bg.startsWith("#0") || bg.startsWith("#1") || bg.startsWith("#2")) tags.push("dark");
  }
  const radius = preset.tokens.radius;
  if (radius) {
    if (radius.buttons === "9999px") tags.push("pill");
    if (radius.cards === "0" || radius.cards === "0px") tags.push("sharp");
    if (parseInt(radius.cards || "0") >= 16) tags.push("rounded");
  }
  const layout = preset.tokens.layout;
  if (layout) {
    if (layout.contentDensity === "spacious") tags.push("spacious");
    if (layout.contentDensity === "compact") tags.push("dense");
  }
  return tags;
}
