// ─── Theme Tokens — Type definitions ─────────────────────────────────────────
//
// Professional design token architecture for Nexora storefronts.
// All tokens have safe defaults so existing stores render identically
// when no custom tokens are configured.

export interface ThemeColorTokens {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
}

export interface ThemeTypographyTokens {
  headingFont: string;
  bodyFont: string;
  headingWeight: string;
  bodyWeight: string;
  baseFontSize: string;
  lineHeight: string;
  letterSpacing: string;
}

export interface ThemeSpacingTokens {
  sectionPadding: string;
  containerWidth: string;
  cardGap: string;
  gridGap: string;
  buttonPadding: string;
  inputPadding: string;
}

export interface ThemeRadiusTokens {
  buttons: string;
  cards: string;
  inputs: string;
  pills: string;
  images: string;
}

export interface ThemeShadowTokens {
  cards: string;
  dropdowns: string;
  modals: string;
  elevated: string;
}

export interface ThemeLayoutTokens {
  heroStyle: "default" | "centered" | "split";
  contentDensity: "compact" | "comfortable" | "spacious";
  sectionSpacing: string;
  navbarStyle: "solid" | "transparent" | "blur";
}

export interface ThemeEffectTokens {
  hoverIntensity: number; // 0-1
  imageHoverZoom: number; // 1.0 - 1.1
  cardLift: string; // e.g. "-2px"
  glassmorphism: boolean;
}

export interface ThemeTokens {
  colors: ThemeColorTokens;
  typography: ThemeTypographyTokens;
  spacing: ThemeSpacingTokens;
  radius: ThemeRadiusTokens;
  shadows: ThemeShadowTokens;
  layout: ThemeLayoutTokens;
  effects: ThemeEffectTokens;
}

export type ThemeVariant = "light" | "dark" | "auto" | "custom";

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  tokens: Partial<ThemeTokens>;
  variant: ThemeVariant;
}

export interface StorefrontThemeConfig {
  tokens: ThemeTokens;
  variant: ThemeVariant;
  presetId: string | null;
  customOverrides: Partial<ThemeTokens>;
}
