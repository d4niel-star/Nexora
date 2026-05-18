// ─── Theme Token Resolver ────────────────────────────────────────────────────
//
// Merges stored token overrides with safe defaults. Ensures every storefront
// always has a complete set of tokens, even if the merchant only edited a few.
// Backward-compatible: stores with no tokens get DEFAULT_THEME_TOKENS.

import type { ThemeTokens, ThemeVariant, StorefrontThemeConfig } from "./types";
import { DEFAULT_THEME_TOKENS } from "./defaults";
import { findPresetById } from "./presets";

/**
 * Deep-merge partial token objects into a complete ThemeTokens.
 * Only overrides defined keys; undefined/null values fall through to defaults.
 */
function deepMergeTokens(
  base: ThemeTokens,
  overrides: Partial<ThemeTokens>,
): ThemeTokens {
  return {
    colors: { ...base.colors, ...overrides.colors },
    typography: { ...base.typography, ...overrides.typography },
    spacing: { ...base.spacing, ...overrides.spacing },
    radius: { ...base.radius, ...overrides.radius },
    shadows: { ...base.shadows, ...overrides.shadows },
    layout: { ...base.layout, ...overrides.layout },
    effects: { ...base.effects, ...overrides.effects },
  };
}

/**
 * Resolve a full theme config from stored data.
 *
 * Priority (highest wins):
 *   1. customOverrides (merchant edits)
 *   2. preset tokens (if a preset is active)
 *   3. branding-derived tokens (from StoreBranding row)
 *   4. DEFAULT_THEME_TOKENS
 */
export function resolveThemeTokens(opts: {
  presetId?: string | null;
  variant?: ThemeVariant | null;
  brandingPrimary?: string | null;
  brandingSecondary?: string | null;
  brandingFont?: string | null;
  brandingButtonStyle?: string | null;
  customOverrides?: Partial<ThemeTokens> | null;
  tokensJson?: string | null;
}): StorefrontThemeConfig {
  const variant: ThemeVariant = (opts.variant as ThemeVariant) ?? "light";
  const presetId = opts.presetId ?? null;

  // Start from defaults
  let tokens = { ...DEFAULT_THEME_TOKENS };

  // Layer 1: branding-derived overrides (backward compat with StoreBranding)
  const brandingOverrides: Partial<ThemeTokens> = {};
  if (opts.brandingPrimary || opts.brandingSecondary || opts.brandingFont) {
    brandingOverrides.colors = {
      ...tokens.colors,
      ...(opts.brandingPrimary ? { primary: opts.brandingPrimary, text: opts.brandingPrimary } : {}),
      ...(opts.brandingSecondary ? { secondary: opts.brandingSecondary, surface: opts.brandingSecondary } : {}),
    };
    if (opts.brandingFont) {
      brandingOverrides.typography = {
        ...tokens.typography,
        headingFont: opts.brandingFont,
        bodyFont: opts.brandingFont,
      };
    }
  }
  if (opts.brandingButtonStyle) {
    const radiusMap: Record<string, string> = {
      "rounded-sm": "6px",
      square: "2px",
      pill: "9999px",
    };
    brandingOverrides.radius = {
      ...tokens.radius,
      buttons: radiusMap[opts.brandingButtonStyle] ?? "6px",
    };
  }
  tokens = deepMergeTokens(tokens, brandingOverrides);

  // Layer 2: preset tokens
  if (presetId) {
    const preset = findPresetById(presetId);
    if (preset?.tokens) {
      tokens = deepMergeTokens(tokens, preset.tokens);
    }
  }

  // Layer 3: stored custom tokens from DB (tokensJson)
  if (opts.tokensJson) {
    try {
      const parsed = JSON.parse(opts.tokensJson) as Partial<ThemeTokens>;
      tokens = deepMergeTokens(tokens, parsed);
    } catch {
      // Invalid JSON — ignore, use tokens as-is
    }
  }

  // Layer 4: runtime custom overrides
  const customOverrides = opts.customOverrides ?? {};
  if (Object.keys(customOverrides).length > 0) {
    tokens = deepMergeTokens(tokens, customOverrides);
  }

  return {
    tokens,
    variant,
    presetId,
    customOverrides,
  };
}
