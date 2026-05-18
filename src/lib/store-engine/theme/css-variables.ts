// ─── Theme Tokens → CSS Variables ────────────────────────────────────────────
//
// Converts resolved ThemeTokens into a flat Record<string, string> of CSS
// custom properties ready to inject as inline styles on the storefront root.
//
// All variables use the `--theme-*` namespace to avoid collisions with the
// admin design system tokens (`--ink-*`, `--surface-*`, etc.).
//
// Performance: pure function, no side effects, SSR-safe. The resulting object
// is applied as `style` on the storefront layout wrapper, meaning CSS variables
// are available immediately at paint time without any client JS.

import type { ThemeTokens, ThemeVariant } from "./types";
import { resolveStoreFontOption } from "../theme-tokens";

export interface CSSVariableMap {
  [key: string]: string;
}

/**
 * Convert a complete ThemeTokens object into CSS custom properties.
 * Every storefront component consumes these via `var(--theme-*)`.
 */
export function tokensToCSSVariables(tokens: ThemeTokens, variant: ThemeVariant): CSSVariableMap {
  const vars: CSSVariableMap = {};

  // ─── Colors ────────────────────────────────────────────────────────────
  vars["--theme-primary"] = tokens.colors.primary;
  vars["--theme-secondary"] = tokens.colors.secondary;
  vars["--theme-accent"] = tokens.colors.accent;
  vars["--theme-background"] = tokens.colors.background;
  vars["--theme-surface"] = tokens.colors.surface;
  vars["--theme-text"] = tokens.colors.text;
  vars["--theme-muted"] = tokens.colors.muted;
  vars["--theme-border"] = tokens.colors.border;
  vars["--theme-success"] = tokens.colors.success;
  vars["--theme-warning"] = tokens.colors.warning;
  vars["--theme-danger"] = tokens.colors.danger;

  // ─── Typography ────────────────────────────────────────────────────────
  const headingFontOption = resolveStoreFontOption(tokens.typography.headingFont);
  const bodyFontOption = resolveStoreFontOption(tokens.typography.bodyFont);
  vars["--theme-font-heading"] = headingFontOption.displayStack;
  vars["--theme-font-body"] = bodyFontOption.bodyStack;
  vars["--theme-font-heading-weight"] = tokens.typography.headingWeight;
  vars["--theme-font-body-weight"] = tokens.typography.bodyWeight;
  vars["--theme-font-size-base"] = tokens.typography.baseFontSize;
  vars["--theme-line-height"] = tokens.typography.lineHeight;
  vars["--theme-letter-spacing"] = tokens.typography.letterSpacing;

  // ─── Spacing ───────────────────────────────────────────────────────────
  vars["--theme-section-padding"] = tokens.spacing.sectionPadding;
  vars["--theme-container-width"] = tokens.spacing.containerWidth;
  vars["--theme-card-gap"] = tokens.spacing.cardGap;
  vars["--theme-grid-gap"] = tokens.spacing.gridGap;
  vars["--theme-button-padding"] = tokens.spacing.buttonPadding;
  vars["--theme-input-padding"] = tokens.spacing.inputPadding;

  // ─── Radius ────────────────────────────────────────────────────────────
  vars["--theme-radius-buttons"] = tokens.radius.buttons;
  vars["--theme-radius-cards"] = tokens.radius.cards;
  vars["--theme-radius-inputs"] = tokens.radius.inputs;
  vars["--theme-radius-pills"] = tokens.radius.pills;
  vars["--theme-radius-images"] = tokens.radius.images;

  // ─── Shadows ───────────────────────────────────────────────────────────
  vars["--theme-shadow-cards"] = tokens.shadows.cards;
  vars["--theme-shadow-dropdowns"] = tokens.shadows.dropdowns;
  vars["--theme-shadow-modals"] = tokens.shadows.modals;
  vars["--theme-shadow-elevated"] = tokens.shadows.elevated;

  // ─── Layout ────────────────────────────────────────────────────────────
  vars["--theme-hero-style"] = tokens.layout.heroStyle;
  vars["--theme-content-density"] = tokens.layout.contentDensity;
  vars["--theme-section-spacing"] = tokens.layout.sectionSpacing;
  vars["--theme-navbar-style"] = tokens.layout.navbarStyle;

  // ─── Effects ───────────────────────────────────────────────────────────
  vars["--theme-hover-intensity"] = String(tokens.effects.hoverIntensity);
  vars["--theme-image-hover-zoom"] = String(tokens.effects.imageHoverZoom);
  vars["--theme-card-lift"] = tokens.effects.cardLift;
  vars["--theme-glassmorphism"] = tokens.effects.glassmorphism ? "1" : "0";

  // ─── Variant-specific overrides ────────────────────────────────────────
  vars["--theme-variant"] = variant;
  if (variant === "dark") {
    vars["--theme-color-scheme"] = "dark";
  } else {
    vars["--theme-color-scheme"] = "light";
  }

  // ─── Backward-compat bridge ────────────────────────────────────────────
  // Map theme tokens back to the variables that existing storefront components
  // already consume (--store-primary, --surface-0, etc.) so no existing
  // component breaks even before we migrate them to --theme-* prefixed vars.
  vars["--store-primary"] = tokens.colors.primary;
  vars["--store-secondary"] = tokens.colors.secondary;
  vars["--store-button-radius"] = tokens.radius.buttons;
  vars["--store-font-sans"] = bodyFontOption.bodyStack;
  vars["--store-font-display"] = headingFontOption.displayStack;
  vars["--font-sans"] = "var(--store-font-sans)";
  vars["--font-display"] = "var(--store-font-display)";

  // Surface bridge: use theme tokens for the storefront surfaces
  vars["--surface-0"] = tokens.colors.background;
  vars["--surface-1"] = tokens.colors.surface;
  vars["--surface-2"] = `color-mix(in srgb, ${tokens.colors.secondary} 20%, ${tokens.colors.background})`;

  return vars;
}

/**
 * Sanitize a token value to prevent CSS injection.
 * Strips anything that looks like a CSS expression, url(), or JS injection.
 */
export function sanitizeTokenValue(value: string): string {
  if (typeof value !== "string") return "";
  // Remove any expression(), url(), javascript:, and semicolons
  return value
    .replace(/expression\s*\(/gi, "")
    .replace(/url\s*\(/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/;/g, "")
    .replace(/}/g, "")
    .replace(/{/g, "")
    .trim();
}

/**
 * Sanitize all values in a CSS variable map.
 */
export function sanitizeCSSVariables(vars: CSSVariableMap): CSSVariableMap {
  const sanitized: CSSVariableMap = {};
  for (const [key, value] of Object.entries(vars)) {
    sanitized[key] = sanitizeTokenValue(value);
  }
  return sanitized;
}

/**
 * Convert CSS variable map to a CSSProperties object for React inline styles.
 */
export function cssVariablesToStyle(vars: CSSVariableMap): React.CSSProperties {
  return vars as unknown as React.CSSProperties;
}
