import {
  COLOR_MAP,
  SECTION_MAP,
  THEME_MAP,
  TONE_MAP,
  FONT_BY_DESCRIPTOR,
  VISUAL_TONE_PRESETS,
  BUTTON_STYLE_MAP,
  MOVE_POSITION_MAP,
  FONT_OPTIONS,
} from "./vocabulary";

export type IntentType =
  | "change-primary-color"
  | "change-secondary-color"
  | "change-color"
  | "change-font"
  | "change-font-by-style"
  | "change-tone"
  | "change-tone-by-mood"
  | "change-hero-headline"
  | "change-hero-subheadline"
  | "change-hero-cta"
  | "change-hero-image"
  | "hide-section"
  | "show-section"
  | "toggle-section"
  | "move-section"
  | "apply-theme"
  | "apply-visual-tone"
  | "change-button-style"
  | "switch-desktop"
  | "switch-mobile"
  | "switch-preview-surface"
  | "undo"
  | "greeting"
  | "help"
  | "unknown";

export interface DetectedIntent {
  intent: IntentType;
  confidence: number;
  entities: Record<string, string>;
  rawMatch: string;
}

interface IntentDef {
  type: IntentType;
  keywords: string[];
  antiKeywords?: string[];
  weight: number;
  extractEntities: (normalized: string, raw: string) => Record<string, string>;
}

const INTENT_DEFS: IntentDef[] = [
  {
    type: "undo",
    keywords: ["deshace", "volver atras", "deshacer", "reverti", "revertir", "undo", "cancela el ultimo", "cancelar ultimo", "ultimo cambio", "anterior", "volvamos", "volve atras", "no me gusto", "eso no me gusto", "no me convence", "devolve", "devuelve"],
    weight: 10,
    extractEntities: () => ({}),
  },
  {
    type: "change-primary-color",
    keywords: ["color principal", "color primario", "color de marca", "primary color", "color principal a", "color principal por"],
    antiKeywords: ["secundario", "fondo"],
    weight: 8,
    extractEntities: (norm) => ({ raw: norm }),
  },
  {
    type: "change-secondary-color",
    keywords: ["color secundario", "color de fondo", "secondary color", "fondo a", "color de fondo a", "color secundario a"],
    antiKeywords: ["principal", "primario"],
    weight: 8,
    extractEntities: (norm) => ({ raw: norm }),
  },
  {
    type: "change-color",
    keywords: ["color a", "color por", "colores a", "colores por", "pone color", "cambia color", "usa color", "color", "colores", "paleta", "pone tonos", "usa tonos"],
    antiKeywords: ["tono de copy", "tono de voz", "fuente", "font", "tipografia"],
    weight: 5,
    extractEntities: (norm) => ({ raw: norm }),
  },
  {
    type: "change-font",
    keywords: ["tipografia a", "fuente a", "font a", "tipografia por", "fuente por", "font por", "cambia la tipografia", "cambia la fuente", "usa la tipografia", "usa la fuente", "pone tipografia", "pone fuente", "tipografia", "fuente"],
    weight: 6,
    extractEntities: (norm) => ({ raw: norm }),
  },
  {
    type: "change-font-by-style",
    keywords: ["tipografia mas", "fuente mas", "font mas", "letra mas", "tipo de letra mas", "quiero una tipografia", "quiero una fuente", "busco una tipografia"],
    weight: 7,
    extractEntities: (norm) => ({ raw: norm }),
  },
  {
    type: "change-tone",
    keywords: ["tono a", "tono por", "cambia el tono", "pone el tono", "usa el tono", "tono de copy a", "tono de voz a"],
    antiKeywords: ["mas", "premium", "sobrio", "elegante", "tecnico", "cercano", "calido", "editorial", "minimalista"],
    weight: 6,
    extractEntities: (norm) => ({ raw: norm }),
  },
  {
    type: "change-tone-by-mood",
    keywords: ["mas sobrio", "mas premium", "mas elegante", "mas tecnico", "mas cercano", "mas calido", "mas formal", "mas casual", "mas aspiracional", "tono mas", "voz mas"],
    antiKeywords: ["color", "colores", "fuente", "tipografia"],
    weight: 7,
    extractEntities: (norm) => ({ raw: norm }),
  },
  {
    type: "change-hero-headline",
    keywords: ["titular del hero", "titulo del hero", "headline", "hero titulo", "hero titular", "encabezado del hero", "h1 del hero", "texto principal del hero"],
    antiKeywords: ["subtitulo", "sub", "boton", "cta", "imagen"],
    weight: 8,
    extractEntities: (norm, raw) => ({ raw, normalized: norm }),
  },
  {
    type: "change-hero-subheadline",
    keywords: ["subtitulo del hero", "sub del hero", "subheadline", "hero subtitulo", "texto secundario del hero", "bajada del hero"],
    weight: 8,
    extractEntities: (norm, raw) => ({ raw, normalized: norm }),
  },
  {
    type: "change-hero-cta",
    keywords: ["boton del hero", "cta del hero", "texto del boton", "cta principal", "boton principal", "accion del hero", "cta a", "boton a", "texto del cta"],
    weight: 8,
    extractEntities: (norm, raw) => ({ raw, normalized: norm }),
  },
  {
    type: "change-hero-image",
    keywords: ["imagen del hero", "fondo del hero", "hero imagen", "hero fondo", "imagen de fondo del hero", "banner imagen"],
    weight: 8,
    extractEntities: (norm, raw) => ({ raw, normalized: norm }),
  },
  {
    type: "hide-section",
    keywords: ["oculta", "esconde", "desactiva", "saca", "quita", "elimina", "borra", "remueve", "sacar seccion", "quitar seccion"],
    antiKeywords: ["mostra", "activa", "muestra", "habilita"],
    weight: 6,
    extractEntities: (norm) => ({ raw: norm }),
  },
  {
    type: "show-section",
    keywords: ["mostra seccion", "muestra seccion", "activa seccion", "habilita seccion", "agrega seccion", "pone seccion", "volver a mostra", "vuelve a mostra"],
    weight: 6,
    extractEntities: (norm) => ({ raw: norm }),
  },
  {
    type: "toggle-section",
    keywords: ["seccion visible", "toggle seccion", "activa o desactiva"],
    weight: 4,
    extractEntities: (norm) => ({ raw: norm }),
  },
  {
    type: "move-section",
    keywords: ["mueve", "move", "movi", "subi", "baja", "pone arriba", "pone abajo", "pon antes", "pon despues", "reordena", "reordenar", "cambia el orden", "arriba de", "abajo de", "al principio", "al final", "primero", "ultimo"],
    antiKeywords: ["color", "fuente", "tipografia"],
    weight: 7,
    extractEntities: (norm) => ({ raw: norm }),
  },
  {
    type: "apply-theme",
    keywords: ["aplica tema", "aplica el tema", "cambia tema", "usa tema", "poner tema", "theme", "template", "plantilla"],
    antiKeywords: ["color", "fuente"],
    weight: 6,
    extractEntities: (norm) => ({ raw: norm }),
  },
  {
    type: "apply-visual-tone",
    keywords: ["mas sobrio", "mas premium", "mas elegante", "mas editorial", "mas minimalista", "mas tecnico", "mas moderno", "mas comercial", "mas calido", "mas cercano", "algo mas", "quiero algo mas", "deja mas", "dejalo mas", "hace mas", "hacelo mas", "pon algo", "pone algo", "estilo mas", "visual mas", "mejor estilo", "tonos mas", "colores mas", "paleta mas", "nego y beige", "negro y beige", "beige y negro", "tono negro", "tono beige", "dark mode", "modo oscuro", "minimalista", "minimal"],
    weight: 8,
    extractEntities: (norm) => ({ raw: norm }),
  },
  {
    type: "change-button-style",
    keywords: ["boton redondeado", "boton cuadrado", "boton pill", "boton pastilla", "boton capsula", "estilo de boton", "forma del boton", "cta redondeado", "boton mas redondo", "borde del boton"],
    weight: 7,
    extractEntities: (norm) => ({ raw: norm }),
  },
  {
    type: "switch-desktop",
    keywords: ["escritorio", "desktop", "pantalla grande", "version desktop", "ver en pc", "vista escritorio", "ver en computadora"],
    weight: 9,
    extractEntities: () => ({}),
  },
  {
    type: "switch-mobile",
    keywords: ["celular", "celu", "mobile", "movil", "telefono", "version mobile", "ver en celu", "vista mobile", "ver en celular", "como queda en celu", "como se ve en celu", "previsualiza mobile"],
    weight: 9,
    extractEntities: () => ({}),
  },
  {
    type: "switch-preview-surface",
    keywords: ["ver home", "ver listado", "ver productos", "ver carrito", "ver carta", "ver pdp", "ver pagina de producto", "muestra home", "muestra listado", "muestra carrito", "preview home", "preview listado", "preview carrito"],
    weight: 7,
    extractEntities: (norm) => ({ raw: norm }),
  },
  {
    type: "greeting",
    keywords: ["hola", "buenas", "que tal", "hey", "hi", "hello", "buen dia", "buenos dias", "buenas tardes", "buenas noches"],
    weight: 2,
    extractEntities: () => ({}),
  },
  {
    type: "help",
    keywords: ["que podes hacer", "que haces", "ayuda", "help", "que puedo pedirte", "como funciona", "que comandos", "que opciones", "que cosas puedo", "lista de comandos", "menu de opciones"],
    weight: 3,
    extractEntities: () => ({}),
  },
];

function scoreIntent(norm: string, def: IntentDef): number {
  let score = 0;
  for (const kw of def.keywords) {
    if (norm.includes(kw)) {
      score += def.weight;
    }
  }
  if (def.antiKeywords) {
    for (const ak of def.antiKeywords) {
      if (norm.includes(ak)) {
        score -= def.weight * 1.5;
      }
    }
  }
  return score;
}

export function resolveColorFromText(text: string): { hex: string; name: string } | null {
  const hexMatch = text.match(/#[0-9a-fA-F]{6}/);
  if (hexMatch) return { hex: hexMatch[0], name: hexMatch[0] };

  const normalized = text.toLowerCase().trim();
  for (const [name, hex] of Object.entries(COLOR_MAP)) {
    if (normalized.includes(name)) return { hex, name };
  }
  return null;
}

export function resolveSectionFromText(text: string): { key: string; label: string } | null {
  const normalized = text.toLowerCase().trim();

  for (const [name, key] of Object.entries(SECTION_MAP)) {
    if (normalized.includes(name)) {
      const labels: Record<string, string> = {
        hero: "Hero",
        featured_products: "Productos destacados",
        featured_categories: "Categorías",
        benefits: "Beneficios",
        testimonials: "Testimonios",
        faq: "FAQ",
        newsletter: "Newsletter",
      };
      return { key, label: labels[key] ?? key };
    }
  }
  return null;
}

export function resolveThemeFromText(text: string): { id: string; label: string } | null {
  const normalized = text.toLowerCase().trim();
  for (const [name, id] of Object.entries(THEME_MAP)) {
    if (normalized.includes(name)) {
      const labels: Record<string, string> = {
        "minimal-essentials": "Minimal Essentials",
        "bold-commerce": "Bold Commerce",
        "classic-elegance": "Classic Elegance",
        "fresh-catalog": "Fresh Catalog",
        "moda-urban": "Urban Fashion",
        "tech-showcase": "Tech Showcase",
        "belleza-ritual": "Beauty Ritual",
        "editorial-lifestyle": "Lifestyle Editorial",
      };
      return { id, label: labels[id] ?? id };
    }
  }
  return null;
}

export function resolveToneFromText(text: string): { value: string; label: string } | null {
  const normalized = text.toLowerCase().trim();
  for (const [name, value] of Object.entries(TONE_MAP)) {
    if (normalized.includes(name)) {
      const labels: Record<string, string> = {
        professional: "Profesional",
        premium: "Premium",
        technical: "Técnico",
        warm: "Cercano",
      };
      return { value, label: labels[value] ?? value };
    }
  }
  return null;
}

export function resolveFontFromDescriptor(text: string): { value: string; label: string } | null {
  const normalized = text.toLowerCase().trim();
  let bestMatch: string | null = null;
  let bestLen = 0;

  for (const [desc, font] of Object.entries(FONT_BY_DESCRIPTOR)) {
    if (normalized.includes(desc) && desc.length > bestLen) {
      bestLen = desc.length;
      bestMatch = font;
    }
  }

  if (bestMatch) {
    return { value: bestMatch, label: bestMatch };
  }

  for (const font of FONT_OPTIONS) {
    if (normalized.includes(font.toLowerCase())) {
      return { value: font, label: font };
    }
  }
  return null;
}

export function resolveVisualToneFromText(text: string) {
  const normalized = text.toLowerCase().trim();
  let bestMatch: string | null = null;
  let bestLen = 0;

  for (const key of Object.keys(VISUAL_TONE_PRESETS)) {
    if (normalized.includes(key) && key.length > bestLen) {
      bestLen = key.length;
      bestMatch = key;
    }
  }
  return bestMatch ? VISUAL_TONE_PRESETS[bestMatch] : null;
}

export function resolveMoveDirection(text: string): { direction: "up" | "down" | "top" | "bottom"; reference?: string } | null {
  const normalized = text.toLowerCase().trim();
  for (const [keyword, direction] of Object.entries(MOVE_POSITION_MAP)) {
    if (normalized.includes(keyword)) {
      return { direction };
    }
  }
  if (normalized.includes("arriba")) return { direction: "up" };
  if (normalized.includes("abajo")) return { direction: "down" };
  return null;
}

export function resolveButtonStyle(text: string): string | null {
  const normalized = text.toLowerCase().trim();
  for (const [keyword, value] of Object.entries(BUTTON_STYLE_MAP)) {
    if (normalized.includes(keyword)) return value;
  }
  return null;
}

export function resolvePreviewSurface(text: string): "home" | "listing" | "product" | "cart" | null {
  const normalized = text.toLowerCase().trim();
  if (normalized.includes("carrito") || normalized.includes("cart")) return "cart";
  if (normalized.includes("producto") || normalized.includes("pdp")) return "product";
  if (normalized.includes("listado") || normalized.includes("catalogo") || normalized.includes("productos")) return "listing";
  if (normalized.includes("home") || normalized.includes("inicio") || normalized.includes("principal")) return "home";
  return null;
}

export function detectIntent(raw: string): DetectedIntent {
  const normalized = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

  let bestIntent: IntentType = "unknown";
  let bestScore = 0;
  let bestEntities: Record<string, string> = {};

  for (const def of INTENT_DEFS) {
    const score = scoreIntent(normalized, def);
    if (score > bestScore) {
      bestScore = score;
      bestIntent = def.type;
      bestEntities = def.extractEntities(normalized, raw);
    }
  }

  const confidence = Math.min(bestScore / 10, 1);

  return {
    intent: bestIntent,
    confidence,
    entities: bestEntities,
    rawMatch: raw,
  };
}
