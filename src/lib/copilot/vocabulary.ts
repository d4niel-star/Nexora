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
  // ── Previously missing colors ──────────────────────────────────────
  marron: "#6B4423", brown: "#6B4423",
  cafe: "#6B4423", chocolate: "#3E2723",
  oliva: "#6B8E23", "verde oliva": "#6B8E23", "olive": "#6B8E23",
  nude: "#E8C9A0", "rosa nude": "#E8C9A0",
  tierra: "#8B6914", "tono tierra": "#8B6914",
  bronce: "#CD7F32", bronze: "#CD7F32",
  cobre: "#B87333", copper: "#B87333",
  marfil: "#FFFFF0", ivory: "#FFFFF0",
  lino: "#FAF0E6", linen: "#FAF0E6",
  carbon: "#36454F",
  "gris medio": "#9CA3AF",
  lavanda: "#B57EDC",
  vino: "#722F37",
  esmeralda: "#046307",
  coral: "#FF7F50",
  arena2: "#C2B280",
};

// ─── Compound color palettes ──────────────────────────────────────────────
// Maps multi-color requests to a resolved primary + secondary pair.
// Key = normalized phrase (accent-free, lowercase), value = {primary, secondary}.

export interface CompoundPalette {
  primary: string;
  primaryName: string;
  secondary: string;
  secondaryName: string;
}

export const COMPOUND_COLOR_PALETTES: Record<string, CompoundPalette> = {
  "marron beige": { primary: "#6B4423", primaryName: "marrón", secondary: "#F5F0E8", secondaryName: "beige" },
  "beige marron": { primary: "#6B4423", primaryName: "marrón", secondary: "#F5F0E8", secondaryName: "beige" },
  "beige y negro": { primary: "#111111", primaryName: "negro", secondary: "#F5F0E8", secondaryName: "beige" },
  "negro y beige": { primary: "#111111", primaryName: "negro", secondary: "#F5F0E8", secondaryName: "beige" },
  "beige y dorado": { primary: "#B8860B", primaryName: "dorado", secondary: "#F5F0E8", secondaryName: "beige" },
  "dorado y beige": { primary: "#B8860B", primaryName: "dorado", secondary: "#F5F0E8", secondaryName: "beige" },
  "negro y dorado": { primary: "#111111", primaryName: "negro", secondary: "#B8860B", secondaryName: "dorado" },
  "dorado y negro": { primary: "#B8860B", primaryName: "dorado", secondary: "#111111", secondaryName: "negro" },
  "blanco y negro": { primary: "#111111", primaryName: "negro", secondary: "#FFFFFF", secondaryName: "blanco" },
  "negro y blanco": { primary: "#111111", primaryName: "negro", secondary: "#FFFFFF", secondaryName: "blanco" },
  "tonos tierra": { primary: "#8B6914", primaryName: "tierra", secondary: "#F5F0E8", secondaryName: "beige" },
  "tierra": { primary: "#8B6914", primaryName: "tierra", secondary: "#F5F0E8", secondaryName: "beige" },
  "luxury beige": { primary: "#B8860B", primaryName: "dorado", secondary: "#F5F0E8", secondaryName: "beige" },
  "mas neutro": { primary: "#374151", primaryName: "gris oscuro", secondary: "#F3F4F6", secondaryName: "gris claro" },
  "neutro": { primary: "#374151", primaryName: "gris oscuro", secondary: "#F3F4F6", secondaryName: "gris claro" },
  "mas calido": { primary: "#B8860B", primaryName: "dorado", secondary: "#FFFBEB", secondaryName: "crema cálida" },
  "mas oscuro": { primary: "#0A0A0A", primaryName: "negro profundo", secondary: "#1A1A1A", secondaryName: "oscuro" },
  "mas suave": { primary: "#6B7280", primaryName: "gris", secondary: "#F9FAFB", secondaryName: "gris muy claro" },
  "menos saturado": { primary: "#6B7280", primaryName: "gris", secondary: "#F3F4F6", secondaryName: "gris claro" },
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

// ─── Hero Image Library ────────────────────────────────────────────────────
// Curated Unsplash images organized by mood/category for real hero image
// generation. When the user asks for "una imagen premium" or "algo más
// aspiracional", we pick from here and apply to the hero block.

export interface HeroImageOption {
  url: string;
  alt: string;
  mood: string;
  category: string;
}

export const HERO_IMAGE_LIBRARY: HeroImageOption[] = [
  // ── Premium / Luxury ──────────────────────────────────────────────────
  { url: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=2000", alt: "Interior elegante con luz natural", mood: "premium", category: "lifestyle" },
  { url: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&q=80&w=2000", alt: "Espacio de diseño minimalista premium", mood: "premium", category: "interior" },
  { url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2000", alt: "Oficina corporativa moderna", mood: "premium", category: "corporate" },
  { url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=2000", alt: "Hotel lujo lobby elegante", mood: "luxury", category: "hospitality" },
  { url: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=2000", alt: "Interior sofisticado con tonos cálidos", mood: "luxury", category: "interior" },

  // ── Fashion / Moda ────────────────────────────────────────────────────
  { url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=2000", alt: "Tienda de moda con ropa colgada", mood: "comercial", category: "fashion" },
  { url: "https://images.unsplash.com/photo-1558171813-4c088753af8f?auto=format&fit=crop&q=80&w=2000", alt: "Accesorios de moda elegantes", mood: "premium", category: "fashion" },
  { url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=2000", alt: "Shopping fashion lifestyle", mood: "comercial", category: "fashion" },
  { url: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&q=80&w=2000", alt: "Moda urbana contemporánea", mood: "moderno", category: "fashion" },

  // ── Beauty / Skincare ──────────────────────────────────────────────────
  { url: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=2000", alt: "Productos de belleza minimalistas", mood: "premium", category: "beauty" },
  { url: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=2000", alt: "Skincare ritual elegante", mood: "luxury", category: "beauty" },
  { url: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&q=80&w=2000", alt: "Productos beauty organizados", mood: "minimalista", category: "beauty" },

  // ── Technology / Tech ──────────────────────────────────────────────────
  { url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=2000", alt: "Circuito tecnológico abstracto", mood: "tecnico", category: "tech" },
  { url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2000", alt: "Red de datos tecnológicos", mood: "tecnico", category: "tech" },
  { url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=2000", alt: "Workspace tecnológico moderno", mood: "moderno", category: "tech" },

  // ── Food / Restaurant ──────────────────────────────────────────────────
  { url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=2000", alt: "Plato gourmet premium", mood: "premium", category: "food" },
  { url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=2000", alt: "Cena elegante restaurant", mood: "luxury", category: "food" },
  { url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=2000", alt: "Café artesanal", mood: "calido", category: "food" },

  // ── Nature / Lifestyle ─────────────────────────────────────────────────
  { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&q=80&w=2000", alt: "Paisaje montañoso aspiracional", mood: "aspiracional", category: "nature" },
  { url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=2000", alt: "Playa paradisiaca", mood: "calido", category: "nature" },
  { url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=2000", alt: "Bosque con luz natural", mood: "natural", category: "nature" },

  // ── Minimal / Clean ────────────────────────────────────────────────────
  { url: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&q=80&w=2000", alt: "Fondo blanco minimalista", mood: "minimalista", category: "minimal" },
  { url: "https://images.unsplash.com/photo-1553356084-58ef4a67b2a7?auto=format&fit=crop&q=80&w=2000", alt: "Textura beige suave", mood: "calido", category: "minimal" },
  { url: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&q=80&w=2000", alt: "Geometría abstracta limpia", mood: "sobrio", category: "minimal" },

  // ── Dark / Noir ────────────────────────────────────────────────────────
  { url: "https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&q=80&w=2000", alt: "Gradiente oscuro abstracto", mood: "oscuro", category: "dark" },
  { url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=2000", alt: "Gradiente negro profundo", mood: "oscuro", category: "dark" },
];

export const IMAGE_MOOD_MAP: Record<string, string> = {
  premium: "premium",
  luxury: "luxury",
  lujo: "luxury",
  lujoso: "luxury",
  elegante: "premium",
  sofisticado: "premium",
  aspiracional: "aspiracional",
  comercial: "comercial",
  moderno: "moderno",
  calido: "calido",
  cálido: "calido",
  tecnico: "tecnico",
  técnico: "tecnico",
  minimalista: "minimalista",
  minimal: "minimalista",
  sobrio: "sobrio",
  oscuro: "oscuro",
  natural: "natural",
  rustico: "natural",
  rústico: "natural",
};

export const IMAGE_CATEGORY_MAP: Record<string, string> = {
  skincare: "beauty",
  belleza: "beauty",
  cosmetics: "beauty",
  cosmeticos: "beauty",
  maquillaje: "beauty",
  moda: "fashion",
  fashion: "fashion",
  ropa: "fashion",
  indumentaria: "fashion",
  accesorios: "fashion",
  tech: "tech",
  tecnologia: "tech",
  software: "tech",
  comida: "food",
  restaurant: "food",
  restaurante: "food",
  gastronomia: "food",
  gastronomía: "food",
  cafe: "food",
  naturaleza: "nature",
  lifestyle: "lifestyle",
  hogar: "interior",
  decoracion: "interior",
  interior: "interior",
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