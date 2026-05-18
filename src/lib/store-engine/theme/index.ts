// ─── Theme System — barrel export ────────────────────────────────────────────

export type {
  ThemeTokens,
  ThemeColorTokens,
  ThemeTypographyTokens,
  ThemeSpacingTokens,
  ThemeRadiusTokens,
  ThemeShadowTokens,
  ThemeLayoutTokens,
  ThemeEffectTokens,
  ThemeVariant,
  ThemePreset,
  StorefrontThemeConfig,
} from "./types";

export { DEFAULT_THEME_TOKENS } from "./defaults";
export { THEME_PRESETS, findPresetById } from "./presets";
export { resolveThemeTokens } from "./resolver";
export { tokensToCSSVariables, sanitizeCSSVariables, cssVariablesToStyle } from "./css-variables";
export { applyVariant, getAutoVariantScript } from "./variants";
