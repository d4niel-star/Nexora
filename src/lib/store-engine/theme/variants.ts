// ─── Theme Variants ──────────────────────────────────────────────────────────
//
// Real dark mode — not color inversion. Each variant defines a semantically
// appropriate mapping of surfaces, text, and borders.

import type { ThemeTokens, ThemeVariant } from "./types";

/**
 * Apply variant-specific adjustments to resolved tokens.
 * For "dark" variant, transforms the color palette for dark backgrounds.
 * For "auto", returns the light tokens (client handles prefers-color-scheme).
 * For "custom", tokens are used as-is (merchant controls everything).
 */
export function applyVariant(tokens: ThemeTokens, variant: ThemeVariant): ThemeTokens {
  switch (variant) {
    case "dark":
      return applyDarkVariant(tokens);
    case "auto":
      // Auto mode uses light tokens at SSR time; client JS toggles via
      // prefers-color-scheme media query class switching.
      return tokens;
    case "custom":
      // Custom means the merchant has full control; no transformation.
      return tokens;
    case "light":
    default:
      return tokens;
  }
}

/**
 * Transform light tokens into a proper dark palette.
 * NOT simple color inversion — semantically correct dark mode:
 * - Background becomes dark
 * - Surfaces get progressively lighter (but still dark)
 * - Text becomes light
 * - Borders become translucent white
 * - Accent/signal colors shift to lighter variants for contrast
 */
function applyDarkVariant(tokens: ThemeTokens): ThemeTokens {
  // If the merchant already configured dark colors (background is dark),
  // don't double-transform.
  if (isDarkColor(tokens.colors.background)) {
    return tokens;
  }

  return {
    ...tokens,
    colors: {
      primary: invertForDark(tokens.colors.primary),
      secondary: darken(tokens.colors.secondary),
      accent: lightenForDark(tokens.colors.accent),
      background: "#09090b",
      surface: "#18181b",
      text: "#fafafa",
      muted: "#a1a1aa",
      border: "rgba(255, 255, 255, 0.10)",
      success: "#4ade80",
      warning: "#fbbf24",
      danger: "#f87171",
    },
  };
}

/** Check if a hex color is "dark" (luminance < 0.3) */
function isDarkColor(color: string): boolean {
  const hex = color.replace("#", "");
  if (hex.length < 6) return false;
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance < 0.3;
}

/** For dark mode: if primary was dark, make it light (and vice versa) */
function invertForDark(color: string): string {
  if (isDarkColor(color)) return "#ffffff";
  return color;
}

/** Lighten a color for visibility on dark backgrounds */
function lightenForDark(color: string): string {
  const hex = color.replace("#", "");
  if (hex.length < 6) return color;
  const r = Math.min(255, parseInt(hex.slice(0, 2), 16) + 60);
  const g = Math.min(255, parseInt(hex.slice(2, 4), 16) + 60);
  const b = Math.min(255, parseInt(hex.slice(4, 6), 16) + 60);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** Make a light color dark for surface use */
function darken(color: string): string {
  if (color.startsWith("rgba")) return "rgba(255, 255, 255, 0.05)";
  const hex = color.replace("#", "");
  if (hex.length < 6) return "#27272a";
  const r = Math.max(0, Math.round(parseInt(hex.slice(0, 2), 16) * 0.12));
  const g = Math.max(0, Math.round(parseInt(hex.slice(2, 4), 16) * 0.12));
  const b = Math.max(0, Math.round(parseInt(hex.slice(4, 6), 16) * 0.12));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Get CSS class for auto variant (used by client component).
 * The storefront root gets `data-theme-variant="auto"` and JS toggles
 * a `dark` class based on prefers-color-scheme.
 */
export function getAutoVariantScript(): string {
  return `(function(){var m=window.matchMedia('(prefers-color-scheme:dark)');function a(){document.documentElement.classList.toggle('dark',m.matches)}a();m.addEventListener('change',a)})()`;
}
