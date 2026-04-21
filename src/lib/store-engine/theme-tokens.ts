export type StoreFontOption = {
  value: string;
  label: string;
  description: string;
  bodyStack: string;
  displayStack: string;
};

const sansFallback =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const STORE_FONT_OPTIONS: StoreFontOption[] = [
  {
    value: "Inter",
    label: "Inter",
    description: "SaaS limpio, neutral y preciso.",
    bodyStack: `var(--font-inter), "Inter", ${sansFallback}`,
    displayStack: `var(--font-inter), "Inter", ${sansFallback}`,
  },
  {
    value: "System",
    label: "Sistema Apple",
    description: "Nativo, sobrio y muy legible.",
    bodyStack: sansFallback,
    displayStack: sansFallback,
  },
  {
    value: "Editorial Serif",
    label: "Editorial serif",
    description: "Más boutique, premium y editorial.",
    bodyStack: 'Georgia, "Times New Roman", Times, serif',
    displayStack: 'Georgia, "Times New Roman", Times, serif',
  },
  {
    value: "Rounded Commerce",
    label: "Rounded commerce",
    description: "Más cercano, moderno y de consumo.",
    bodyStack: '"Trebuchet MS", "Avenir Next", Avenir, Verdana, sans-serif',
    displayStack: '"Trebuchet MS", "Avenir Next", Avenir, Verdana, sans-serif',
  },
  {
    value: "Technical Mono",
    label: "Mono técnico",
    description: "Preciso, tecnológico y distintivo.",
    bodyStack: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
    displayStack: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  },
];

const legacyFontMap: Record<string, StoreFontOption> = {
  Roboto: STORE_FONT_OPTIONS[1],
  Outfit: STORE_FONT_OPTIONS[3],
  Montserrat: STORE_FONT_OPTIONS[3],
  Poppins: STORE_FONT_OPTIONS[3],
  Manrope: STORE_FONT_OPTIONS[3],
  "DM Sans": STORE_FONT_OPTIONS[1],
  "Source Sans 3": STORE_FONT_OPTIONS[1],
  "Space Grotesk": STORE_FONT_OPTIONS[4],
  "Playfair Display": STORE_FONT_OPTIONS[2],
  Lora: STORE_FONT_OPTIONS[2],
};

export function resolveStoreFontOption(fontFamily?: string | null): StoreFontOption {
  if (!fontFamily) return STORE_FONT_OPTIONS[0];

  return (
    STORE_FONT_OPTIONS.find((font) => font.value === fontFamily) ??
    legacyFontMap[fontFamily] ??
    STORE_FONT_OPTIONS[0]
  );
}

export const STORE_BUTTON_STYLES = [
  { value: "rounded-sm", label: "Recto suave", radius: "6px" },
  { value: "square", label: "Cuadrado", radius: "2px" },
  { value: "pill", label: "Pildora", radius: "9999px" },
] as const;

export function getStoreButtonRadius(buttonStyle?: string | null): string {
  return (
    STORE_BUTTON_STYLES.find((style) => style.value === buttonStyle)?.radius ??
    STORE_BUTTON_STYLES[0].radius
  );
}

export const STORE_TONES = [
  { value: "professional", label: "Profesional", description: "Sobrio y confiable." },
  { value: "premium", label: "Premium", description: "Más editorial y aspiracional." },
  { value: "technical", label: "Técnico", description: "Preciso y operativo." },
  { value: "warm", label: "Cercano", description: "Más humano sin perder orden." },
] as const;

export function normalizeThemeColor(color: string | null | undefined, fallback: string): string {
  const value = color?.trim();
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}
