// ─── Theme Tokens — Safe defaults ────────────────────────────────────────────
//
// These defaults produce the EXACT same visual output as the current storefront.
// If a store has no custom tokens configured, these are used.
// Backward-compatible by design: zero visual regression.

import type {
  ThemeTokens,
  ThemeColorTokens,
  ThemeTypographyTokens,
  ThemeSpacingTokens,
  ThemeRadiusTokens,
  ThemeShadowTokens,
  ThemeLayoutTokens,
  ThemeEffectTokens,
} from "./types";

export const DEFAULT_COLOR_TOKENS: ThemeColorTokens = {
  primary: "#0F172A",
  secondary: "#E2E8F0",
  accent: "#3f4f9a",
  background: "#f7f9fa",
  surface: "#e9eef3",
  text: "#0F172A",
  muted: "#5c6274",
  border: "rgba(15, 23, 42, 0.13)",
  success: "#15956a",
  warning: "#b37400",
  danger: "#c93636",
};

export const DEFAULT_TYPOGRAPHY_TOKENS: ThemeTypographyTokens = {
  headingFont: "Inter",
  bodyFont: "Inter",
  headingWeight: "600",
  bodyWeight: "400",
  baseFontSize: "15px",
  lineHeight: "1.6",
  letterSpacing: "-0.011em",
};

export const DEFAULT_SPACING_TOKENS: ThemeSpacingTokens = {
  sectionPadding: "5rem 0",
  containerWidth: "80rem",
  cardGap: "1.5rem",
  gridGap: "1.5rem",
  buttonPadding: "0.75rem 2rem",
  inputPadding: "0.75rem 1rem",
};

export const DEFAULT_RADIUS_TOKENS: ThemeRadiusTokens = {
  buttons: "9999px",
  cards: "12px",
  inputs: "12px",
  pills: "9999px",
  images: "12px",
};

export const DEFAULT_SHADOW_TOKENS: ThemeShadowTokens = {
  cards:
    "inset 0 1px 0 0 rgba(255,255,255,0.95), 0 1px 2px rgba(15,23,42,0.06), 0 4px 12px -2px rgba(15,23,42,0.07), 0 14px 32px -8px rgba(15,23,42,0.05)",
  dropdowns:
    "0 4px 8px rgba(15,23,42,0.08), 0 16px 32px -8px rgba(15,23,42,0.14), 0 40px 80px -20px rgba(15,23,42,0.10)",
  modals:
    "0 4px 8px rgba(15,23,42,0.08), 0 16px 32px -8px rgba(15,23,42,0.14), 0 40px 80px -20px rgba(15,23,42,0.10)",
  elevated:
    "inset 0 1px 0 0 rgba(255,255,255,0.95), 0 2px 4px rgba(15,23,42,0.07), 0 10px 24px -4px rgba(15,23,42,0.11), 0 28px 56px -16px rgba(15,23,42,0.09)",
};

export const DEFAULT_LAYOUT_TOKENS: ThemeLayoutTokens = {
  heroStyle: "default",
  contentDensity: "comfortable",
  sectionSpacing: "5rem",
  navbarStyle: "solid",
};

export const DEFAULT_EFFECT_TOKENS: ThemeEffectTokens = {
  hoverIntensity: 0.7,
  imageHoverZoom: 1.03,
  cardLift: "-2px",
  glassmorphism: false,
};

export const DEFAULT_THEME_TOKENS: ThemeTokens = {
  colors: DEFAULT_COLOR_TOKENS,
  typography: DEFAULT_TYPOGRAPHY_TOKENS,
  spacing: DEFAULT_SPACING_TOKENS,
  radius: DEFAULT_RADIUS_TOKENS,
  shadows: DEFAULT_SHADOW_TOKENS,
  layout: DEFAULT_LAYOUT_TOKENS,
  effects: DEFAULT_EFFECT_TOKENS,
};
