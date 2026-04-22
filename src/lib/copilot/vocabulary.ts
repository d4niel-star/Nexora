// ─── Copilot Vocabulary ──────────────────────────────────────────────────
// All resolved entities: colors, sections, themes, tones, fonts, visual presets.

export const COLOR_MAP: Record<string, string> = {
  negro: "#111111", black: "#111111",
  blanco: "#FFFFFF", white: "#FFFFFF",
  beige: "#F5F0E8", arena: "#F5F0E8", crema: "#F5F0E8",
  rojo: "#DC2626", red: "#DC2626",
  azul: "#2563EB", blue: "#2563EB",
  verde: "#16A34A", green: "#16A34A",
  dorado: "#B8860B", gold: "#B8860B",
  gris: "#6B7280", gray: "#6B7280", grey: "#6B7280",
  rosa: "#EC4899", pink: "#EC4899",
  naranja: "#EA580C", orange: "#EA580C",
  violeta: "#7C3AED", purple: "#7C3AED",
  celeste: "#87CEEB",
  turquesa: "#06B6D4", teal: "#06B6D4",
  "celeste oscuro": "#1E3A5F",
  marino: "#1E3A5F", "azul marino": "#1E3A5F",
  bordo: "#7F1D1D", burdeos: "#7F1D1D",
  salmon: "#FA8072",
  mostaza: "#D4A017",
  terracota: "#CC5500",
  oscuro: "#1A1A1A",
  claro: "#F8F8F8",
  "gris oscuro": "#374151",
  "gris claro": "#F3F4F6",
  plata: "#C0C0C0", silver: "#C0C0C0",
};

export const SECTION_MAP: Record<string, string> = {
  hero: "hero",
  "producto destacado": "featured_products",
  "productos destacados": "featured_products",
  "producto": "featured_products",
  "productos": "featured_products",
  "categoria": "featured_categories",
  "categorias": "featured_categories",
  "colecciones": "featured_categories",
  "coleccion": "featured_categories",
  "beneficio": "benefits",
  "beneficios": "benefits",
  "testimonio": "testimonials",
  "testimonios": "testimonials",
  "faq": "faq",
  "preguntas frecuentes": "faq",
  "pregunta frecuente": "faq",
  "preguntas": "faq",
  "newsletter": "newsletter",
  "boletin": "newsletter",
  "suscripcion": "newsletter",
  "suscribirse": "newsletter",
};

export const SECTION_LABELS: Record<string, string> = {
  hero: "Hero principal",
  featured_products: "Productos destacados",
  featured_categories: "Categorías",
  benefits: "Beneficios",
  testimonials: "Testimonios",
  faq: "Preguntas frecuentes",
  newsletter: "Newsletter",
};

export const THEME_MAP: Record<string, string> = {
  minimal: "minimal-essentials",
  "minimal essentials": "minimal-essentials",
  bold: "bold-commerce",
  "bold commerce": "bold-commerce",
  classic: "classic-elegance",
  "classic elegance": "classic-elegance",
  fresh: "fresh-catalog",
  "fresh catalog": "fresh-catalog",
  urban: "moda-urban",
  "urban fashion": "moda-urban",
  "moda urban": "moda-urban",
  tech: "tech-showcase",
  "tech showcase": "tech-showcase",
  beauty: "belleza-ritual",
  "beauty ritual": "belleza-ritual",
  "belleza ritual": "belleza-ritual",
  editorial: "editorial-lifestyle",
  lifestyle: "editorial-lifestyle",
  "lifestyle editorial": "editorial-lifestyle",
  "editorial lifestyle": "editorial-lifestyle",
};

export const THEME_LABELS: Record<string, string> = {
  "minimal-essentials": "Minimal Essentials",
  "bold-commerce": "Bold Commerce",
  "classic-elegance": "Classic Elegance",
  "fresh-catalog": "Fresh Catalog",
  "moda-urban": "Urban Fashion",
  "tech-showcase": "Tech Showcase",
  "belleza-ritual": "Beauty Ritual",
  "editorial-lifestyle": "Lifestyle Editorial",
};

export const TONE_MAP: Record<string, string> = {
  profesional: "professional",
  professional: "professional",
  premium: "premium",
  tecnico: "technical",
  technical: "technical",
  calido: "warm",
  calida: "warm",
  cercano: "warm",
  cercana: "warm",
  amigable: "warm",
  warm: "warm",
  formal: "professional",
  casual: "warm",
  aspiracional: "premium",
};

export const TONE_LABELS: Record<string, string> = {
  professional: "Profesional",
  premium: "Premium",
  technical: "Técnico",
  warm: "Cercano",
};

export const FONT_OPTIONS = [
  "Inter",
  "System",
  "Editorial Serif",
  "Rounded Commerce",
  "Technical Mono",
];

export const FONT_LABELS: Record<string, string> = {
  Inter: "Inter",
  System: "Sistema Apple",
  "Editorial Serif": "Editorial Serif",
  "Rounded Commerce": "Rounded Commerce",
  "Technical Mono": "Technical Mono",
};

export const FONT_BY_DESCRIPTOR: Record<string, string> = {
  editorial: "Editorial Serif",
  serif: "Editorial Serif",
  boutique: "Editorial Serif",
  clasica: "Editorial Serif",
  clasico: "Editorial Serif",
  premium: "Editorial Serif",
  elegante: "Editorial Serif",
  aspiracional: "Editorial Serif",
  moderna: "Rounded Commerce",
  moderno: "Rounded Commerce",
  redondeada: "Rounded Commerce",
  redondeado: "Rounded Commerce",
  cercana: "Rounded Commerce",
  cercano: "Rounded Commerce",
  amigable: "Rounded Commerce",
  consumo: "Rounded Commerce",
  b2c: "Rounded Commerce",
  tecnica: "Technical Mono",
  tecnico: "Technical Mono",
  precisa: "Technical Mono",
  preciso: "Technical Mono",
  mono: "Technical Mono",
  tech: "Technical Mono",
  limpia: "Inter",
  limpio: "Inter",
  neutra: "Inter",
  neutro: "Inter",
  minimalista: "Inter",
  minimal: "Inter",
  sobria: "Inter",
  sobrio: "Inter",
  legible: "Inter",
  sans: "Inter",
};

export interface VisualTonePreset {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  tone: string;
  label: string;
  description: string;
}

export const VISUAL_TONE_PRESETS: Record<string, VisualTonePreset> = {
  premium: {
    primaryColor: "#111111", secondaryColor: "#FAFAF8", fontFamily: "Editorial Serif",
    tone: "premium", label: "Premium",
    description: "Colores oscuros + serif editorial + tono premium",
  },
  elegante: {
    primaryColor: "#1A1A2E", secondaryColor: "#F5F0E8", fontFamily: "Editorial Serif",
    tone: "premium", label: "Elegante",
    description: "Paleta profunda + serif editorial + tono premium",
  },
  sobrio: {
    primaryColor: "#374151", secondaryColor: "#F3F4F6", fontFamily: "Inter",
    tone: "professional", label: "Sobrio",
    description: "Colores neutros + Inter limpia + tono profesional",
  },
  minimalista: {
    primaryColor: "#111111", secondaryColor: "#FAFAFA", fontFamily: "Inter",
    tone: "professional", label: "Minimalista",
    description: "Blanco y negro + Inter + tono profesional",
  },
  minimal: {
    primaryColor: "#111111", secondaryColor: "#FAFAFA", fontFamily: "Inter",
    tone: "professional", label: "Minimal",
    description: "Blanco y negro + Inter + tono profesional",
  },
  tecnico: {
    primaryColor: "#0F172A", secondaryColor: "#F1F5F9", fontFamily: "Technical Mono",
    tone: "technical", label: "Técnico",
    description: "Oscuro + mono técnica + tono técnico",
  },
  moderno: {
    primaryColor: "#2563EB", secondaryColor: "#EFF6FF", fontFamily: "Rounded Commerce",
    tone: "warm", label: "Moderno",
    description: "Azul vibrante + rounded + tono cercano",
  },
  calido: {
    primaryColor: "#B8860B", secondaryColor: "#FFFBEB", fontFamily: "Rounded Commerce",
    tone: "warm", label: "Cálido",
    description: "Dorado suave + rounded + tono cercano",
  },
  comercial: {
    primaryColor: "#EA580C", secondaryColor: "#FFF7ED", fontFamily: "Rounded Commerce",
    tone: "warm", label: "Comercial",
    description: "Naranja energético + rounded + tono cercano",
  },
  "negro beige": {
    primaryColor: "#111111", secondaryColor: "#F5F0E8", fontFamily: "Editorial Serif",
    tone: "premium", label: "Negro y Beige",
    description: "Paleta negro/beige + serif editorial + tono premium",
  },
  dark: {
    primaryColor: "#0A0A0A", secondaryColor: "#1A1A1A", fontFamily: "Inter",
    tone: "technical", label: "Dark Mode",
    description: "Modo oscuro completo + Inter + tono técnico",
  },
};

export const BUTTON_STYLE_MAP: Record<string, string> = {
  redondeado: "rounded-sm",
  "redondeado suave": "rounded-sm",
  suave: "rounded-sm",
  recto: "square",
  cuadrado: "square",
  pill: "pill",
  pastilla: "pill",
  capsula: "pill",
  "redondo total": "pill",
  "completamente redondeado": "pill",
  circular: "pill",
  "mas circular": "pill",
  "algo mas circular": "pill",
  "mas redondo": "pill",
  "forma de pastilla": "pill",
  "bordes redondos": "pill",
  "totalmente redondeado": "pill",
  "muy redondeado": "pill",
  redondo: "pill",
};

export const MOVE_POSITION_MAP: Record<string, "up" | "down" | "top" | "bottom"> = {
  arriba: "up",
  "arriba de todo": "top",
  "al principio": "top",
  "al inicio": "top",
  "al comienzo": "top",
  subi: "up",
  abajo: "down",
  "abajo de todo": "bottom",
  "al final": "bottom",
  "al fondo": "bottom",
  baja: "down",
  antes: "up",
  despues: "down",
};