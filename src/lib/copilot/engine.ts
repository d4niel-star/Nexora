// ─── Copilot NLU Engine ──────────────────────────────────────────────────
//
// Architecture:
//   1. Normalization (accents, case, whitespace, typos)
//   2. Compound input splitting (y, commas, semicolons, también)
//   3. For each sub-input:
//      a. Context resolution (references: "eso", "esa sección", "el anterior")
//      b. Multi-signal intent detection (verbs + objects + modifiers + patterns)
//      c. Entity extraction (colors, sections, fonts, tones, directions, etc.)
//      d. Validation against real capabilities
//   4. Return structured action plan
//
// Design principles:
//   - Much more flexible than pure regex
//   - Tolerant of natural language variation
//   - Supports compound actions
//   - Tracks conversational context
//   - Validates before execution
//   - Never gives false success

import { normalize, fixTypos, splitCompoundInput } from "./normalizer";
import {
  COLOR_MAP,
  SECTION_MAP,
  SECTION_LABELS,
  THEME_MAP,
  THEME_LABELS,
  TONE_MAP,
  TONE_LABELS,
  FONT_BY_DESCRIPTOR,
  FONT_OPTIONS,
  FONT_LABELS,
  VISUAL_TONE_PRESETS,
  BUTTON_STYLE_MAP,
  MOVE_POSITION_MAP,
  HERO_IMAGE_LIBRARY,
  IMAGE_MOOD_MAP,
  IMAGE_CATEGORY_MAP,
  type HeroImageOption,
} from "./vocabulary";
import type { ConversationContext } from "./context";
import { resolveImageParams } from "@/lib/ai/image-generator";

// ─── Types ──────────────────────────────────────────────────────────────

export type ActionType =
  | "change-primary-color"
  | "change-secondary-color"
  | "change-color"
  | "change-font"
  | "change-font-by-style"
  | "change-tone"
  | "change-tone-by-mood"
  | "apply-visual-tone"
  | "change-button-style"
  | "change-hero-headline"
  | "change-hero-subheadline"
  | "change-hero-cta"
  | "change-hero-image"
  | "hide-section"
  | "show-section"
  | "move-section"
  | "apply-theme"
  | "switch-desktop"
  | "switch-mobile"
  | "switch-preview-surface"
  | "undo"
  | "greeting"
  | "help"
  | "unknown";

export interface PlannedAction {
  id: string;
  intent: ActionType;
  entities: Record<string, string>;
  rawText: string;
  confidence: number;
  status: "ready" | "needs-clarification" | "unsupported";
  clarification?: string;
}

export interface NLUResult {
  actions: PlannedAction[];
  rawInput: string;
  understood: boolean;
}

// ─── Intent signal definitions ──────────────────────────────────────────
//
// Each intent is defined by multiple signal types:
//   verbs:     action words that suggest this intent
//   objects:   target nouns that suggest this intent
//   modifiers: qualifier words that suggest this intent
//   patterns:  high-confidence regex patterns
//   antiSignals: words that contradict this intent
//
// Scoring weights let us tune how much each signal type contributes.

interface IntentSignal {
  type: ActionType;
  verbs: string[];
  objects: string[];
  modifiers: string[];
  patterns: RegExp[];
  antiSignals: string[];
  verbWeight: number;
  objectWeight: number;
  modifierWeight: number;
  patternWeight: number;
  extractEntities: (norm: string, raw: string) => Record<string, string>;
}

const SIGNALS: IntentSignal[] = [
  // ── Undo ───────────────────────────────────────────────────────────
  {
    type: "undo",
    verbs: ["deshace", "reverti", "cancela", "volvamos", "volve atras", "devolve", "devuelve", "deshacer", "revertir", "undo"],
    objects: ["ultimo cambio", "cambio anterior", "lo anterior", "eso"],
    modifiers: ["no me gusto", "no me convence", "esa no me gusto", "ese no me gusto", "no me gusta"],
    patterns: [
      /deshac[eé]\s+(eso|el(?:ultimo)?\s*cambio|lo\s*que|todo)/,
      /volv[aé]\s+(atras|atras|como\s+estaba)/,
      /revert[ií]\s+(eso|el\s*ultimo|el\s*cambio)/,
      /no\s+me\s+gust[oó]\s+(eso|ese|esa|este|esta)/,
      /cancela[r]?\s+el\s+ultimo/,
    ],
    antiSignals: [],
    verbWeight: 6,
    objectWeight: 8,
    modifierWeight: 9,
    patternWeight: 12,
    extractEntities: () => ({}),
  },

  // ── Switch mobile ──────────────────────────────────────────────────
  {
    type: "switch-mobile",
    verbs: ["veamos", "mostrame", "previsualiza", "ver"],
    objects: ["celular", "celu", "mobile", "movil", "telefono", "version mobile"],
    modifiers: ["como queda en celu", "como se ve en celu", "en el celu"],
    patterns: [
      /(?:quiero\s+)?ver\s+(?:como\s+(?:queda|se ve)\s+)?(?:en\s+)?(?:el\s+)?(?:celu|celular|mobile|movil)/,
      /(?:mostr|previsual|vea)[a-z]*\s+(?:en\s+)?(?:celu|celular|mobile)/,
      /version\s+mobile/,
      /vista\s+mobile/,
    ],
    antiSignals: ["desktop", "escritorio", "pc", "computadora"],
    verbWeight: 4,
    objectWeight: 8,
    modifierWeight: 9,
    patternWeight: 12,
    extractEntities: () => ({}),
  },

  // ── Switch desktop ─────────────────────────────────────────────────
  {
    type: "switch-desktop",
    verbs: ["veamos", "mostrame", "previsualiza", "ver"],
    objects: ["escritorio", "desktop", "pantalla grande", "pc", "computadora", "version desktop"],
    modifiers: ["como queda en pc", "como se ve en desktop"],
    patterns: [
      /(?:quiero\s+)?ver\s+(?:como\s+(?:queda|se ve)\s+)?(?:en\s+)?(?:escritorio|desktop|pc|computadora)/,
      /(?:mostr|previsual|vea)[a-z]*\s+(?:en\s+)?(?:escritorio|desktop|pc)/,
      /version\s+desktop/,
      /vista\s+(?:escritorio|desktop)/,
    ],
    antiSignals: ["celu", "celular", "mobile", "movil"],
    verbWeight: 4,
    objectWeight: 8,
    modifierWeight: 9,
    patternWeight: 12,
    extractEntities: () => ({}),
  },

  // ── Switch preview surface ─────────────────────────────────────────
  {
    type: "switch-preview-surface",
    verbs: ["veamos", "mostrame", "muestra", "ver", "veo"],
    objects: ["home", "listado", "productos", "carrito", "cart", "pdp", "pagina de producto"],
    modifiers: [],
    patterns: [
      /(?:ver|mostr|veamos|veo)\s+(?:la\s+)?(?:home|inicio|principal)/,
      /(?:ver|mostr|veamos|veo)\s+(?:el\s+)?(?:listado|catalogo|productos)/,
      /(?:ver|mostr|veamos|veo)\s+(?:el\s+)?(?:carrito|cart)/,
      /(?:ver|mostr|veamos|veo)\s+(?:la\s+)?(?:pdp|pagina\s+de\s+producto)/,
      /preview\s+(?:home|listado|carrito|pdp|producto)/,
    ],
    antiSignals: ["color", "fuente", "tipografia", "font", "seccion"],
    verbWeight: 3,
    objectWeight: 7,
    modifierWeight: 0,
    patternWeight: 10,
    extractEntities: (norm) => {
      if (norm.includes("carrito") || norm.includes("cart")) return { surface: "cart" };
      if (norm.includes("pdp") || norm.includes("pagina de producto")) return { surface: "product" };
      if (norm.includes("listado") || norm.includes("catalogo") || norm.includes("productos")) return { surface: "listing" };
      return { surface: "home" };
    },
  },

  // ── Apply visual tone ──────────────────────────────────────────────
  {
    type: "apply-visual-tone",
    verbs: ["deja", "dejalo", "hace", "hacelo", "pon", "pone", "usa", "quiero", "busco", "probemos", "proba"],
    objects: ["estilo", "visual", "look", "onda", "vibracion", "tonos", "colores", "paleta"],
    modifiers: [
      "mas sobrio", "mas premium", "mas elegante", "mas editorial", "mas minimalista",
      "mas tecnico", "mas moderno", "mas comercial", "mas calido", "mas cercano",
      "mas neutro", "mas oscuro", "algo mas", "mas minimal", "mas aspiracional",
      "mas limpio", "mas sofisticado", "mas simple", "mas rustico", "mas natural",
      "negro y beige", "beige y negro", "nego y beige", "dark mode", "modo oscuro",
      "minimalista", "minimal", "premium", "sobrio", "elegante",
    ],
    patterns: [
      /(?:algo|dejalo|hacelo|pon\s*algo|dej[aé]|hac[eé]|pone\s*algo)[^.]*(?:mas\s+)?(?:sobrio|premium|elegante|editorial|minimalista|tecnico|moderno|comercial|calido|cercano|neutro|oscuro|minimal|aspiracional|limpio|sofisticado|simple)/,
      /(?:quiero|busco|prob[aé]|proba)[^.]*(?:mas\s+)?(?:sobrio|premium|elegante|editorial|minimalista|tecnico|moderno|comercial|calido)/,
      /(?:nego|negro)\s+y\s+beige/,
      /beige\s+y\s+(?:nego|negro)/,
      /dark\s*mode/,
      /modo\s+oscuro/,
      /(?:colores|paleta|tonos)\s+mas\s+(?:neutro|calido|oscuro|premium|sobrio)/,
      /(?:mas\s+)?(?:minimalista|minimal)\s*$/,
    ],
    antiSignals: ["fuente", "tipografia", "font", "seccion", "boton", "cta", "titulo", "headline"],
    verbWeight: 3,
    objectWeight: 4,
    modifierWeight: 9,
    patternWeight: 12,
    extractEntities: (norm) => {
      // Try to match the visual tone preset
      let bestMatch: string | null = null;
      let bestLen = 0;
      for (const key of Object.keys(VISUAL_TONE_PRESETS)) {
        if (norm.includes(key) && key.length > bestLen) {
          bestLen = key.length;
          bestMatch = key;
        }
      }
      // Also check common phrases that map to presets
      if (!bestMatch) {
        if (norm.includes("negro y beige") || norm.includes("nego y beige") || norm.includes("beige y negro")) bestMatch = "negro beige";
        if (norm.includes("dark mode") || norm.includes("modo oscuro")) bestMatch = "dark";
      }
      return { raw: norm, toneKey: bestMatch ?? "" };
    },
  },

  // ── Change primary color ───────────────────────────────────────────
  {
    type: "change-primary-color",
    verbs: ["cambia", "change", "pon", "pone", "usa", "actualiza", "modifica"],
    objects: ["color principal", "color primario", "color de marca", "primary color", "color principal a", "color principal por"],
    modifiers: [],
    patterns: [
      /(?:cambi|pon|us|actualiz|modific)[a-z]*\s+(?:el\s+)?color\s+(?:principal|primario|de marca)/,
    ],
    antiSignals: ["secundario", "fondo", "fuente", "tipografia", "font", "seccion"],
    verbWeight: 3,
    objectWeight: 10,
    modifierWeight: 0,
    patternWeight: 12,
    extractEntities: (norm) => ({ raw: norm }),
  },

  // ── Change secondary color ─────────────────────────────────────────
  {
    type: "change-secondary-color",
    verbs: ["cambia", "pon", "pone", "usa", "actualiza", "modifica"],
    objects: ["color secundario", "color de fondo", "secondary color", "fondo a", "fondo por"],
    modifiers: [],
    patterns: [
      /(?:cambi|pon|us|actualiz|modific)[a-z]*\s+(?:el\s+)?(?:color\s+)?(?:secundario|de fondo)/,
      /(?:cambi|pon)[a-z]*\s+(?:el\s+)?fondo\s+(?:a|por)/,
    ],
    antiSignals: ["principal", "primario"],
    verbWeight: 3,
    objectWeight: 10,
    modifierWeight: 0,
    patternWeight: 12,
    extractEntities: (norm) => ({ raw: norm }),
  },

  // ── Change color (generic) ─────────────────────────────────────────
  {
    type: "change-color",
    verbs: ["cambia", "pon", "pone", "usa", "cambiar", "poner", "usar"],
    objects: ["color", "colores", "paleta", "tonos"],
    modifiers: [],
    patterns: [
      /(?:cambi|pon|us)[a-z]*\s+(?:(?:el|los|la|las)\s+)?(?:color|colores|paleta|tonos)/,
      /(?:colores|paleta|tonos)\s+(?:a|por)\s+/,
    ],
    antiSignals: ["fuente", "tipografia", "font", "seccion", "tono de copy", "tono de voz", "texto", "titulo"],
    verbWeight: 3,
    objectWeight: 6,
    modifierWeight: 0,
    patternWeight: 9,
    extractEntities: (norm) => ({ raw: norm }),
  },

  // ── Change font by style ───────────────────────────────────────────
  {
    type: "change-font-by-style",
    verbs: ["cambia", "pon", "pone", "usa", "probemos", "proba", "quiero", "busco"],
    objects: ["tipografia", "fuente", "font", "letra", "tipo de letra"],
    modifiers: [
      "mas editorial", "mas moderna", "mas elegante", "mas tecnica", "mas limpia",
      "mas sobria", "mas legible", "mas redondeada", "mas clasica",
      "tipografia mas", "fuente mas", "font mas", "letra mas",
    ],
    patterns: [
      /(?:tipografia|fuente|font|letra|tipo de letra)\s+mas/,
      /(?:mas\s+)?(?:editorial|moderna|elegante|tecnica|limpia|sobria|legible|redondeada|clasica|cercana|amigable|premium|aspiracional|boutique|consumo|b2c|mono|minimalista)\s*(?:tipografia|fuente|font)?/,
      /quiero\s+(?:una\s+)?(?:tipografia|fuente)\s+mas/,
      /(?:probemos|proba)\s+(?:tipograf|fuent)/,
    ],
    antiSignals: ["color", "colores", "seccion"],
    verbWeight: 3,
    objectWeight: 5,
    modifierWeight: 8,
    patternWeight: 11,
    extractEntities: (norm) => ({ raw: norm }),
  },

  // ── Change font (specific) ─────────────────────────────────────────
  {
    type: "change-font",
    verbs: ["cambia", "pon", "pone", "usa", "cambiar", "poner"],
    objects: ["tipografia", "fuente", "font"],
    modifiers: [],
    patterns: [
      /(?:cambi|pon|us)[a-z]*\s+(?:la\s+)?(?:tipografia|fuente|font)\s+(?:a|por)\s+/,
      /(?:cambi|pon|us)[a-z]*\s+(?:la\s+)?(?:tipografia|fuente|font)\s*$/,
      /usa\s+(?:la\s+)?(?:tipografia|fuente|font)\s+/,
    ],
    antiSignals: ["mas", "color", "colores", "seccion"],
    verbWeight: 4,
    objectWeight: 7,
    modifierWeight: 0,
    patternWeight: 10,
    extractEntities: (norm) => ({ raw: norm }),
  },

  // ── Change tone ────────────────────────────────────────────────────
  {
    type: "change-tone",
    verbs: ["cambia", "pon", "pone", "usa"],
    objects: ["tono de copy", "tono de voz", "tono", "voz"],
    modifiers: [],
    patterns: [
      /(?:cambi|pon|us)[a-z]*\s+(?:el\s+)?tono\s+(?:de\s+(?:copy|voz)\s+)?(?:a|por)\s+/,
      /(?:cambi|pon|us)[a-z]*\s+(?:el\s+)?tono\s+(?:a|por)\s+\w/,
    ],
    antiSignals: ["mas", "premium", "sobrio", "elegante", "tecnico", "cercano", "calido", "editorial", "minimalista", "visual", "color"],
    verbWeight: 4,
    objectWeight: 7,
    modifierWeight: 0,
    patternWeight: 10,
    extractEntities: (norm) => ({ raw: norm }),
  },

  // ── Change tone by mood ────────────────────────────────────────────
  {
    type: "change-tone-by-mood",
    verbs: ["cambia", "pon", "pone", "usa"],
    objects: ["tono", "voz"],
    modifiers: [
      "mas premium", "mas sobrio", "mas elegante", "mas tecnico", "mas cercano",
      "mas calido", "mas formal", "mas casual", "mas aspiracional", "tono mas", "voz mas",
    ],
    patterns: [
      /(?:tono|voz)\s+mas\s+(?:premium|sobrio|elegante|tecnico|cercano|calido|formal|casual|aspiracional)/,
      /mas\s+(?:premium|sobrio|elegante|tecnico|cercano|calido|formal|casual|aspiracional)\s*(?:tono|voz)?/,
    ],
    antiSignals: ["color", "colores", "fuente", "tipografia", "font", "visual"],
    verbWeight: 3,
    objectWeight: 4,
    modifierWeight: 8,
    patternWeight: 11,
    extractEntities: (norm) => ({ raw: norm }),
  },

  // ── Change button style ────────────────────────────────────────────
  {
    type: "change-button-style",
    verbs: ["hace", "hacelo", "pon", "pone", "cambia", "modifica", "quiero", "busco"],
    objects: ["boton", "button", "cta", "borde del boton", "estilo de boton", "forma del boton", "botones", "botones del hero", "boton del hero"],
    modifiers: [
      "redondeado", "cuadrado", "pill", "pastilla", "capsula", "mas redondo",
      "mas visible", "mas grande", "redondo total", "completamente redondeado",
      "circular", "mas circular", "algo mas circular", "redondo",
      "muy redondeado", "totalmente redondeado", "bordes redondos",
      "forma de pastilla",
    ],
    patterns: [
      /(?:hac|pon|cambi|modific|quiero|busco)[a-z]*\s+(?:el\s+)?(?:boton|button|cta|botones)\s+(?:mas\s+)?(?:redondeado|cuadrado|pill|pastilla|capsula|redondo|visible|grande|circular)/,
      /(?:boton|cta|botones)\s+(?:redondeado|cuadrado|pill|pastilla|capsula|circular|redondo)/,
      /(?:estilo|forma)\s+(?:del|de)\s+(?:boton|cta|los?\s*botones)/,
      /(?:mas\s+)?(?:visible|redondo|grande|circular)\s*(?:boton|cta|botones)/,
      /(?:hac|pon|quiero|busco)[a-z]*\s+(?:el\s+)?(?:boton|cta|botones)\s+mas/,
      /(?:quiero|busco|hace|hacelo|pon)[a-z]*\s+(?:los?\s+)?(?:boton|cta|botones)\s+(?:a\s+)?(?:algo\s+)?(?:mas\s+)?(?:circular|redondo|redondeado|pill)/,
      /(?:quiero|hace|pon)[a-z]*\s+(?:un\s+)?(?:boton|cta)\s+(?:mas\s+)?(?:circular|redondo|redondeado)/,
      /(?:algo|un\s+poco)\s+mas\s+(?:circular|redondo|redondeado)\s*(?:boton|cta)?/,
      /(?:circular|redondo|pill)\s*(?:boton|cta)/,
      /(?:bordes|border)\s+(?:redondos|circulares)/,
    ],
    antiSignals: ["color", "fuente", "seccion", "titulo"],
    verbWeight: 3,
    objectWeight: 7,
    modifierWeight: 7,
    patternWeight: 10,
    extractEntities: (norm) => ({ raw: norm }),
  },

  // ── Change hero headline ───────────────────────────────────────────
  {
    type: "change-hero-headline",
    verbs: ["cambia", "pon", "edita", "reescribi", "modifica", "cambiar", "editar"],
    objects: ["titular del hero", "titulo del hero", "headline", "hero titulo", "hero titular", "encabezado del hero", "h1 del hero", "texto principal del hero", "titulo principal"],
    modifiers: [],
    patterns: [
      /(?:cambi|pon|edit|reescrib|modific)[a-z]*\s+(?:el\s+)?(?:titular|titulo|headline|h1|encabezado|texto principal)\s+(?:del\s+)?hero/,
      /(?:cambi|pon|edit)[a-z]*\s+(?:el\s+)?headline\s+(?:a|por)\s+/,
    ],
    antiSignals: ["subtitulo", "sub", "boton", "cta", "imagen", "fondo"],
    verbWeight: 3,
    objectWeight: 9,
    modifierWeight: 0,
    patternWeight: 12,
    extractEntities: (_norm, raw) => ({ raw }),
  },

  // ── Change hero subheadline ────────────────────────────────────────
  {
    type: "change-hero-subheadline",
    verbs: ["cambia", "pon", "edita", "reescribi", "modifica"],
    objects: ["subtitulo del hero", "sub del hero", "subheadline", "hero subtitulo", "texto secundario del hero", "bajada del hero", "subtitulo"],
    modifiers: [],
    patterns: [
      /(?:cambi|pon|edit|reescrib|modific)[a-z]*\s+(?:el\s+)?(?:subtitulo|sub|subheadline|bajada|texto secundario)\s+(?:del\s+)?hero/,
      /(?:cambi|pon|edit)[a-z]*\s+(?:la\s+)?bajada/,
    ],
    antiSignals: ["titulo", "titular", "headline", "boton", "cta"],
    verbWeight: 3,
    objectWeight: 9,
    modifierWeight: 0,
    patternWeight: 12,
    extractEntities: (_norm, raw) => ({ raw }),
  },

  // ── Change hero CTA ────────────────────────────────────────────────
  {
    type: "change-hero-cta",
    verbs: ["cambia", "pon", "edita", "modifica"],
    objects: ["boton del hero", "cta del hero", "texto del boton", "cta principal", "boton principal", "accion del hero", "boton", "cta"],
    modifiers: [],
    patterns: [
      /(?:cambi|pon|edit|modific)[a-z]*\s+(?:el\s+)?(?:texto\s+del\s+)?(?:boton|cta)\s+(?:del\s+)?hero/,
      /(?:cambi|pon|edit)[a-z]*\s+(?:el\s+)?(?:cta|boton)\s+(?:principal|del hero)\s+(?:a|por)\s+/,
      /(?:cambi|pon|edit)[a-z]*\s+(?:el\s+)?(?:texto\s+del\s+)?(?:cta|boton)\s+(?:a|por)\s+/,
    ],
    antiSignals: ["color", "fuente", "seccion", "estilo", "redondeado", "cuadrado", "pill"],
    verbWeight: 3,
    objectWeight: 7,
    modifierWeight: 0,
    patternWeight: 10,
    extractEntities: (_norm, raw) => ({ raw }),
  },

  // ── Change hero image ──────────────────────────────────────────────
  {
    type: "change-hero-image",
    verbs: ["cambia", "pon", "pone", "reemplaza", "actualiza", "usa", "genera", "crea", "generame", "creame", "haceme"],
    objects: ["imagen del hero", "fondo del hero", "hero imagen", "hero fondo", "imagen de fondo", "banner imagen", "imagen", "foto", "foto del hero", "portada", "imagen premium", "imagen para el hero", "imagen para esta parte", "una imagen", "una foto", "imagen mejor", "imagen mas", "banner"],
    modifiers: ["mas aspiracional", "mas comercial", "mas moderna", "otra imagen", "premium", "lifestyle", "aspiracional", "luxury", "minimalista", "oscuro", "calido", "elegante", "sofisticado", "mejor imagen", "otra imagen", "reemplaza la imagen", "imagen para skincare", "imagen para moda", "imagen para beauty", "imagen para tech", "imagen para food"],
    patterns: [
      /(?:cambi|pon|reemplaz|actualiz|us|gener|cre|hac)[a-z]*\s+(?:la\s+)?(?:imagen|foto)\s+(?:del\s+)?(?:hero|fondo|banner)/,
      /(?:cambi|pon|reemplaz)[a-z]*\s+(?:el\s+)?fondo\s+del\s+hero/,
      /(?:esa|esta|la)\s+(?:imagen|foto)\s+(?:no|no me)/,
      /(?:gener|cre)[a-z]*\s+(?:una\s+)?(?:imagen|foto|banner|portada)/,
      /(?:pon|poné|pone)[a-z]*\s+(?:una\s+)?(?:imagen|foto)\s+(?:mas\s+)?(?:premium|aspiracional|elegante|mejor|lifestyle|luxury|minimalista)/,
      /(?:quiero|busco|necesito)\s+(?:una\s+)?(?:imagen|foto|banner|portada)/,
      /(?:imagen|foto|banner)\s+(?:mas\s+)?(?:premium|aspiracional|mejor|lifestyle|luxury|elegante|sofisticada)/,
      /(?:mejor|otra|nueva)\s+(?:imagen|foto|banner)/,
      /(?:pon|cambi|reemplaz)[a-z]*\s+(?:(?:la|una)\s+)?(?:imagen|foto)\s+(?:por\s+)?(?:algo|una)\s+mas/,
      /(?:haceme|creame|generame)\s+(?:una\s+)?(?:imagen|foto|banner|portada)/,
    ],
    antiSignals: ["titulo", "titular", "texto", "headline", "subtitulo"],
    verbWeight: 3,
    objectWeight: 7,
    modifierWeight: 5,
    patternWeight: 10,
    extractEntities: (_norm, raw) => ({ raw }),
  },

  // ── Hide section ───────────────────────────────────────────────────
  {
    type: "hide-section",
    verbs: ["oculta", "esconde", "desactiva", "saca", "quita", "elimina", "borra", "remueve", "ocultar", "sacar", "quitar", "eliminar"],
    objects: ["seccion", "testimonios", "beneficios", "faq", "preguntas", "newsletter", "hero", "productos", "categorias", "colecciones"],
    modifiers: [],
    patterns: [
      /(?:ocult|escond|desactiv|sac|quit|elimin|borr|remuev)[a-z]*\s+(?:(?:la\s+)?(?:seccion\s+(?:de\s+)?)|(?:los?\s+))?(?:hero|productos?\s*destacados?|categor[ií]as?|beneficios?|testimonios?|faq|preguntas?\s*frecuentes?|newsletter|boletin|suscripcion)/,
    ],
    antiSignals: ["mostr", "activ", "muestra", "habilit", "agreg", "pon"],
    verbWeight: 6,
    objectWeight: 5,
    modifierWeight: 0,
    patternWeight: 11,
    extractEntities: (norm) => ({ raw: norm }),
  },

  // ── Show section ───────────────────────────────────────────────────
  {
    type: "show-section",
    verbs: ["mostra", "muestra", "activa", "habilita", "agrega", "pon", "agreg", "mostrar", "activar", "habilitar"],
    objects: ["seccion", "testimonios", "beneficios", "faq", "preguntas", "newsletter", "hero", "productos", "categorias"],
    modifiers: [],
    patterns: [
      /(?:mostr|activ|habilit|agreg|pon)[a-z]*\s+(?:(?:la\s+)?(?:seccion\s+(?:de\s+)?)|(?:los?\s+))?(?:hero|productos?\s*destacados?|categor[ií]as?|beneficios?|testimonios?|faq|preguntas?\s*frecuentes?|newsletter|boletin|suscripcion)/,
      /(?:vuelve|volver)\s+a\s+(?:mostr|activ|habilit)/,
    ],
    antiSignals: ["ocult", "escond", "desactiv", "sac", "quit", "elimin", "borr"],
    verbWeight: 6,
    objectWeight: 5,
    modifierWeight: 0,
    patternWeight: 11,
    extractEntities: (norm) => ({ raw: norm }),
  },

  // ── Move section ───────────────────────────────────────────────────
  {
    type: "move-section",
    verbs: ["mueve", "move", "movi", "subi", "baja", "reordena", "reordenar", "subir", "bajar"],
    objects: ["seccion", "testimonios", "beneficios", "faq", "newsletter", "hero", "productos", "categorias", "arriba", "abajo"],
    modifiers: [],
    patterns: [
      /(?:muev|mov|sub|baj|reorden)[a-z]*\s+(?:(?:la\s+)?(?:seccion\s+(?:de\s+)?)|(?:los?\s+))?(?:hero|productos?\s*destacados?|categor[ií]as?|beneficios?|testimonios?|faq|preguntas?\s*frecuentes?|newsletter)/,
      /(?:arriba|abajo)\s+de/,
      /(?:al\s+)?(?:principio|final|comienzo|fondo)/,
    ],
    antiSignals: ["color", "fuente", "tipografia", "font"],
    verbWeight: 6,
    objectWeight: 4,
    modifierWeight: 0,
    patternWeight: 10,
    extractEntities: (norm) => ({ raw: norm }),
  },

  // ── Apply theme ────────────────────────────────────────────────────
  {
    type: "apply-theme",
    verbs: ["aplica", "aplicar", "cambia", "usar", "pon", "pone"],
    objects: ["tema", "theme", "template", "plantilla"],
    modifiers: [],
    patterns: [
      /(?:aplic|us|cambi|pon)[a-z]*\s+(?:el\s+)?(?:tema|theme|template|plantilla)/,
    ],
    antiSignals: ["color", "fuente", "seccion"],
    verbWeight: 4,
    objectWeight: 8,
    modifierWeight: 0,
    patternWeight: 10,
    extractEntities: (norm) => ({ raw: norm }),
  },

  // ── Greeting ───────────────────────────────────────────────────────
  {
    type: "greeting",
    verbs: [],
    objects: [],
    modifiers: [],
    patterns: [
      /^(?:hola|buenas|que tal|hey|hi|hello|buen dia|buenos dias|buenas tardes|buenas noches)[\s!.?]*$/i,
    ],
    antiSignals: ["cambia", "pon", "saca", "mueve", "oculta", "mostra"],
    verbWeight: 0,
    objectWeight: 0,
    modifierWeight: 0,
    patternWeight: 15,
    extractEntities: () => ({}),
  },

  // ── Help ───────────────────────────────────────────────────────────
  {
    type: "help",
    verbs: [],
    objects: ["que podes hacer", "que haces", "ayuda", "help", "que puedo pedirte", "como funciona", "lista de comandos", "menu de opciones"],
    modifiers: [],
    patterns: [
      /(?:que\s+(?:podes|puedo)\s+(?:hacer|pedirte?)|ayuda|help|como\s+funciona|lista\s+de\s+comandos|menu\s+de\s+opciones|que\s+(?:cosas\s+)?puedo)/,
    ],
    antiSignals: [],
    verbWeight: 0,
    objectWeight: 10,
    modifierWeight: 0,
    patternWeight: 15,
    extractEntities: () => ({}),
  },
];

// ─── Scoring function ────────────────────────────────────────────────────

function scoreIntent(norm: string, signal: IntentSignal): number {
  let score = 0;

  // Pattern matches (highest confidence)
  for (const pattern of signal.patterns) {
    if (pattern.test(norm)) score += signal.patternWeight;
  }

  // Verb signals
  for (const verb of signal.verbs) {
    if (norm.includes(verb)) score += signal.verbWeight;
  }

  // Object signals
  for (const obj of signal.objects) {
    if (norm.includes(obj)) score += signal.objectWeight;
  }

  // Modifier signals
  for (const mod of signal.modifiers) {
    if (norm.includes(mod)) score += signal.modifierWeight;
  }

  // Anti-signals (penalty)
  for (const anti of signal.antiSignals) {
    if (norm.includes(anti)) score -= signal.patternWeight * 1.2;
  }

  return score;
}

// ─── Entity resolvers ────────────────────────────────────────────────────

export function resolveColorFromText(text: string): { hex: string; name: string } | null {
  const hexMatch = text.match(/#[0-9a-fA-F]{6}/);
  if (hexMatch) return { hex: hexMatch[0], name: hexMatch[0] };

  const normalized = text.toLowerCase().trim();
  // Sort by key length descending so "arena" matches before "are"
  const sorted = Object.entries(COLOR_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [name, hex] of sorted) {
    if (normalized.includes(name)) return { hex, name };
  }
  return null;
}

export function resolveSectionFromText(text: string): { key: string; label: string } | null {
  const normalized = text.toLowerCase().trim();
  // Sort by key length descending for best match
  const sorted = Object.entries(SECTION_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [name, key] of sorted) {
    if (normalized.includes(name)) {
      return { key, label: SECTION_LABELS[key] ?? key };
    }
  }
  return null;
}

export function resolveThemeFromText(text: string): { id: string; label: string } | null {
  const normalized = text.toLowerCase().trim();
  const sorted = Object.entries(THEME_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [name, id] of sorted) {
    if (normalized.includes(name)) {
      return { id, label: THEME_LABELS[id] ?? id };
    }
  }
  return null;
}

export function resolveToneFromText(text: string): { value: string; label: string } | null {
  const normalized = text.toLowerCase().trim();
  const sorted = Object.entries(TONE_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [name, value] of sorted) {
    if (normalized.includes(name)) {
      return { value, label: TONE_LABELS[value] ?? value };
    }
  }
  return null;
}

export function resolveFontFromText(text: string): { value: string; label: string } | null {
  const normalized = text.toLowerCase().trim();

  // First try descriptor matching (longest match first)
  const sortedDesc = Object.entries(FONT_BY_DESCRIPTOR).sort((a, b) => b[0].length - a[0].length);
  let bestMatch: string | null = null;
  let bestLen = 0;
  for (const [desc, font] of sortedDesc) {
    if (normalized.includes(desc) && desc.length > bestLen) {
      bestLen = desc.length;
      bestMatch = font;
    }
  }
  if (bestMatch) return { value: bestMatch, label: FONT_LABELS[bestMatch] ?? bestMatch };

  // Then try exact font name
  for (const font of FONT_OPTIONS) {
    if (normalized.includes(font.toLowerCase())) {
      return { value: font, label: FONT_LABELS[font] ?? font };
    }
  }
  return null;
}

export function resolveVisualTonePreset(text: string) {
  const normalized = text.toLowerCase().trim();
  let bestMatch: string | null = null;
  let bestLen = 0;
  const sortedKeys = Object.keys(VISUAL_TONE_PRESETS).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (normalized.includes(key) && key.length > bestLen) {
      bestLen = key.length;
      bestMatch = key;
    }
  }
  return bestMatch ? VISUAL_TONE_PRESETS[bestMatch] : null;
}

export function resolveMoveDirection(text: string): { direction: "up" | "down" | "top" | "bottom"; reference?: string } | null {
  const normalized = text.toLowerCase().trim();
  const sorted = Object.entries(MOVE_POSITION_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [keyword, direction] of sorted) {
    if (normalized.includes(keyword)) {
      // Try to extract reference section ("arriba de productos" → reference = products)
      const afterPattern = /(?:arriba|abajo|antes|despues|encima|debajo)\s+de\s+(.+)/;
      const match = normalized.match(afterPattern);
      return { direction, reference: match?.[1]?.trim() };
    }
  }
  if (normalized.includes("arriba")) return { direction: "up" };
  if (normalized.includes("abajo")) return { direction: "down" };
  return null;
}

export function resolveButtonStyle(text: string): string | null {
  const normalized = text.toLowerCase().trim();
  const sorted = Object.entries(BUTTON_STYLE_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [keyword, value] of sorted) {
    if (normalized.includes(keyword)) return value;
  }
  // "mas visible" → pill (most prominent)
  if (normalized.includes("mas visible") || normalized.includes("mas grande") || normalized.includes("mas notorio")) return "pill";
  return null;
}

// ─── Hero image resolver ──────────────────────────────────────────────────

export function resolveHeroImage(text: string, ctx?: ConversationContext): HeroImageOption | null {
  const normalized = text.toLowerCase().trim();

  // 1. Try to resolve mood from text
  let resolvedMood: string | null = null;
  const sortedMoods = Object.entries(IMAGE_MOOD_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [keyword, mood] of sortedMoods) {
    if (normalized.includes(keyword)) {
      resolvedMood = mood;
      break;
    }
  }

  // 2. Try to resolve category from text
  let resolvedCategory: string | null = null;
  const sortedCats = Object.entries(IMAGE_CATEGORY_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [keyword, cat] of sortedCats) {
    if (normalized.includes(keyword)) {
      resolvedCategory = cat;
      break;
    }
  }

  // 3. If user said "otra" or "reemplaza" and last action was hero-image, pick a different one
  const isRepeat = normalized.includes("otra") || normalized.includes("reemplaza") || normalized.includes("mejor");

  // 4. Filter library
  let candidates = HERO_IMAGE_LIBRARY;

  if (resolvedMood) {
    const moodMatches = candidates.filter((img) => img.mood === resolvedMood);
    if (moodMatches.length > 0) candidates = moodMatches;
  }

  if (resolvedCategory) {
    const catMatches = candidates.filter((img) => img.category === resolvedCategory);
    if (catMatches.length > 0) candidates = catMatches;
  }

  // If no mood/category was resolved and no visual tone, default to premium
  if (!resolvedMood && !resolvedCategory) {
    // Check if there's a visual tone in context or text
    const preset = resolveVisualTonePreset(normalized);
    if (preset) {
      // Map tone to mood
      if (normalized.includes("premium") || normalized.includes("elegante") || normalized.includes("aspiracional")) {
        candidates = candidates.filter((img) => img.mood === "premium" || img.mood === "luxury");
      } else if (normalized.includes("oscuro") || normalized.includes("dark")) {
        candidates = candidates.filter((img) => img.mood === "oscuro");
      } else if (normalized.includes("minimalista") || normalized.includes("minimal") || normalized.includes("limpio")) {
        candidates = candidates.filter((img) => img.mood === "minimalista" || img.mood === "sobrio");
      }
    }

    // If still no filter, use all images
    if (candidates.length === 0) candidates = HERO_IMAGE_LIBRARY;
  }

  // 5. Pick a random image from candidates (avoid same if repeat)
  if (candidates.length === 0) return null;
  
  const randomIdx = Math.floor(Math.random() * candidates.length);
  const pick = candidates[randomIdx];
  return pick;
}

export function resolvePreviewSurface(text: string): "home" | "listing" | "product" | "cart" | null {
  const normalized = text.toLowerCase().trim();
  if (normalized.includes("carrito") || normalized.includes("cart")) return "cart";
  if (normalized.includes("pdp") || normalized.includes("pagina de producto")) return "product";
  if (normalized.includes("listado") || normalized.includes("catalogo")) return "listing";
  // "productos" alone could mean listing, but be careful not to match "productos destacados"
  if (normalized.includes("productos") && !normalized.includes("destacados")) return "listing";
  if (normalized.includes("home") || normalized.includes("inicio") || normalized.includes("principal")) return "home";
  return null;
}

// ─── Extract quoted or free text for hero edits ──────────────────────────

export function extractTextValue(text: string): string | null {
  // Try quoted text first
  const quoted = text.match(/["""'](.+?)["""']/);
  if (quoted) return quoted[1].trim();

  // Try "a <text>" or "por <text>" pattern
  const afterKeyword = text.match(/(?:a|por|que\s+(?:diga|tenga|sea))\s+(.+?)$/i);
  if (afterKeyword) return afterKeyword[1].trim().replace(/["""']/g, "");

  return null;
}

// ─── Main NLU pipeline ───────────────────────────────────────────────────

export function processInput(raw: string, ctx: ConversationContext): NLUResult {
  // Step 1: Normalize
  const normalized = normalize(raw);

  // Step 2: Fix common typos
  const fixed = fixTypos(normalized);

  // Step 3: Split compound inputs
  const parts = splitCompoundInput(fixed);

  // Step 4: Process each part
  const actions: PlannedAction[] = [];
  for (const part of parts) {
    actions.push(processPart(part, raw, ctx));
  }

  return {
    actions,
    rawInput: raw,
    understood: actions.some((a) => a.status !== "unsupported" && a.intent !== "unknown"),
  };
}

function processPart(part: string, originalRaw: string, ctx: ConversationContext): PlannedAction {
  const norm = normalize(part);
  const id = `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Step 4a: Check for context references and special cases
  const refResolved = tryResolveReference(norm, ctx);
  if (refResolved) return refResolved;

  // Step 4b: Score all intents, collecting all scores
  const scores: Array<{ intent: ActionType; score: number; entities: Record<string, string> }> = [];

  for (const signal of SIGNALS) {
    const score = scoreIntent(norm, signal);
    if (score > 0) {
      scores.push({
        intent: signal.type,
        score,
        entities: signal.extractEntities(norm, part),
      });
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  // Step 4c: Resolve intent conflicts
  const resolved = resolveConflict(scores, norm);

  if (!resolved || resolved.score < 3) {
    return {
      id,
      intent: "unknown",
      entities: {},
      rawText: part,
      confidence: 0,
      status: "unsupported",
    };
  }

  const bestIntent = resolved.intent;
  const bestScore = resolved.score;
  const bestEntities = resolved.entities;
  const confidence = Math.min(bestScore / 12, 1);

  // Step 4d: Validate and check for clarification needs
  const validation = validateAction(bestIntent, bestEntities, norm);
  if (validation.needsClarification) {
    return {
      id,
      intent: bestIntent,
      entities: bestEntities,
      rawText: part,
      confidence,
      status: "needs-clarification",
      clarification: validation.clarification,
    };
  }

  return {
    id,
    intent: bestIntent,
    entities: validation.enrichedEntities ?? bestEntities,
    rawText: part,
    confidence,
    status: "ready",
  };
}

// ─── Intent conflict resolution ──────────────────────────────────────────
//
// When multiple intents score similarly, use heuristics to pick the right one.
// Critical cases:
//   - "poné tonos beige" → apply-visual-tone vs change-color → should be change-color (specific color named)
//   - "algo más premium" → apply-visual-tone vs change-tone-by-mood → apply-visual-tone (visual)
//   - "mostrame en celu" → switch-mobile vs switch-preview-surface → switch-mobile

function resolveConflict(
  scores: Array<{ intent: ActionType; score: number; entities: Record<string, string> }>,
  norm: string,
): { intent: ActionType; score: number; entities: Record<string, string> } | null {
  if (scores.length === 0) return null;

  const top = scores[0];
  if (scores.length === 1) return top;

  const second = scores[1];

  // If top score is clearly dominant (>40% higher), use it
  if (top.score > second.score * 1.4) return top;

  // ── Specific conflict rules ─────────────────────────────────────────

  // If change-color and apply-visual-tone both score high, but a specific color is named → change-color
  const colorIdx = scores.findIndex(s => s.intent === "change-color" || s.intent === "change-primary-color" || s.intent === "change-secondary-color");
  const vtoneIdx = scores.findIndex(s => s.intent === "apply-visual-tone");
  if (colorIdx !== -1 && vtoneIdx !== -1) {
    const color = resolveColorFromText(norm);
    // If a specific color was found AND it's not part of a preset phrase, prefer change-color
    if (color && !norm.includes("negro y beige") && !norm.includes("beige y negro") && !norm.includes("dark mode") && !norm.includes("modo oscuro")) {
      const colorScore = scores[colorIdx];
      return { ...colorScore, score: Math.max(colorScore.score, scores[vtoneIdx].score) + 2 };
    }
    // Otherwise prefer apply-visual-tone
    return scores[vtoneIdx];
  }

  // If change-tone-by-mood and apply-visual-tone both score high:
  // - "visual", "estilo", "tonos", "paleta" in text → apply-visual-tone
  // - "tono de voz", "tono de copy" → change-tone-by-mood
  if (scores.some(s => s.intent === "change-tone-by-mood") && scores.some(s => s.intent === "apply-visual-tone")) {
    if (norm.includes("visual") || norm.includes("estilo") || norm.includes("tonos") || norm.includes("paleta") || norm.includes("look")) {
      return scores.find(s => s.intent === "apply-visual-tone") ?? top;
    }
  }

  // switch-mobile vs switch-preview-surface: mobile/desktop terms win
  if (scores.some(s => s.intent === "switch-mobile") && scores.some(s => s.intent === "switch-preview-surface")) {
    if (norm.includes("celu") || norm.includes("celular") || norm.includes("mobile") || norm.includes("movil")) {
      return scores.find(s => s.intent === "switch-mobile") ?? top;
    }
  }

  return top;
}

// ─── Context reference resolution ────────────────────────────────────────

function tryResolveReference(norm: string, ctx: ConversationContext): PlannedAction | null {
  const id = `act-${Date.now()}-ref`;

  // ── Undo via negative feedback ─────────────────────────────────────
  // "eso no me gustó", "no me convence", "el anterior me gustaba más", etc.
  const isNegativeFeedback =
    (norm.includes("no me gusto") || norm.includes("no me convence") ||
     norm.includes("no me gusta") || norm.includes("eso no") ||
     norm.includes("me gustaba mas el anterior") || norm.includes("el anterior me gustaba") ||
     norm.includes("volamos atras") || norm.includes("volvamos atras") ||
     norm.includes("volve atras") || norm.includes("reverti") ||
     norm.includes("deshace") || norm.includes("cancela el ultimo") ||
     norm.includes("no estaba asi") || norm.includes("dejalo como estaba") ||
     norm.includes("como estaba antes") || norm.includes("dejalo como antes") ||
     (norm.includes("anterior") && (norm.includes("gustaba") || norm.includes("mejor"))) ||
     (norm === "deshace") || (norm === "deshacer") || (norm === "undo") ||
     (norm === "reverti") || (norm === "volve atras"));

  if (isNegativeFeedback) {
    return {
      id,
      intent: "undo",
      entities: {},
      rawText: norm,
      confidence: 0.95,
      status: "ready",
    };
  }

  // ── Section references ─────────────────────────────────────────────
  // "esa sección" / "ese bloque" referring to last section touched
  if (
    (norm.includes("esa seccion") || norm.includes("ese bloque") || norm.includes("esa seccion") ||
     norm.includes("esa parte") || norm === "esa") &&
    ctx.lastBlockType
  ) {
    // Expand the reference into a concrete section name and re-process
    const expanded = norm
      .replace(/es[ao]\s+(?:seccion|bloque|parte)/, ctx.lastBlockType)
      .replace(/^esa$/, ctx.lastBlockType);
    // Re-process with expanded text (recursive but with null ctx.lastBlockType to avoid loops)
    const expandedCtx = { ...ctx, lastBlockType: null };
    return processPart(expanded, norm, expandedCtx);
  }

  // ── Color references ───────────────────────────────────────────────
  // "ese color" / "ese mismo color" / "el color de antes" — no-op or repeat
  if (
    (norm.includes("ese color") || norm.includes("el mismo color") || norm.includes("ese mismo")) &&
    ctx.lastColorChanged
  ) {
    // User is referring to the last color — if they say "poné ese color de nuevo" etc,
    // expand to the actual color
    if (norm.includes("otra vez") || norm.includes("de nuevo") || norm.includes("tambien")) {
      const expanded = norm.replace(/(?:ese|el mismo)\s+(?:color\s+)?(?:de nuevo|otra vez|tambien)?/, ctx.lastColorChanged);
      const expandedCtx = { ...ctx, lastColorChanged: null };
      return processPart(expanded, norm, expandedCtx);
    }
  }

  // ── "eso no" / "eso sí" patterns ───────────────────────────────────
  if (norm === "eso no" || norm === "no eso") {
    return {
      id,
      intent: "undo",
      entities: {},
      rawText: norm,
      confidence: 0.9,
      status: "ready",
    };
  }

  // ── "la imagen anterior no me gusta" / "esa imagen" ────────────────
  if (
    (norm.includes("imagen anterior") || norm.includes("esa imagen") || norm.includes("la imagen no")) &&
    !norm.includes("genera") && !norm.includes("crea")
  ) {
    return {
      id,
      intent: "undo",
      entities: {},
      rawText: norm,
      confidence: 0.85,
      status: "ready",
    };
  }

  // ── "esa sección arriba/abajo" — section reference + move direction ─
  if (
    (norm.includes("esa seccion") || norm.includes("ese bloque") || norm.includes("esa parte")) &&
    ctx.lastBlockType &&
    (norm.includes("arriba") || norm.includes("abajo") || norm.includes("principio") || norm.includes("final"))
  ) {
    const direction = resolveMoveDirection(norm);
    const sectionLabel = SECTION_LABELS[ctx.lastBlockType] ?? ctx.lastBlockType;
    return {
      id,
      intent: "move-section",
      entities: {
        sectionKey: ctx.lastBlockType,
        sectionLabel,
        direction: direction?.direction ?? "up",
      },
      rawText: norm,
      confidence: 0.9,
      status: "ready",
    };
  }

  // ── Short follow-up with last context ──────────────────────────────
  // "eso" alone when there's a last action — re-trigger last action type
  if ((norm === "eso" || norm === "dale" || norm === "si" || norm === "ok") && ctx.lastAction) {
    // These are confirmations, not new actions. Return unknown to let the chat handle naturally.
    return {
      id,
      intent: "unknown",
      entities: {},
      rawText: norm,
      confidence: 0,
      status: "unsupported",
    };
  }

  return null;
}

// ─── Action validation ───────────────────────────────────────────────────

function validateAction(
  intent: ActionType,
  entities: Record<string, string>,
  norm: string,
): { needsClarification: boolean; clarification?: string; enrichedEntities?: Record<string, string> } {
  const enriched = { ...entities };

  switch (intent) {
    case "change-color":
    case "change-primary-color":
    case "change-secondary-color": {
      const color = resolveColorFromText(norm);
      if (color) {
        enriched.colorHex = color.hex;
        enriched.colorName = color.name;
      } else {
        return {
          needsClarification: true,
          clarification: `No reconocí el color. Podés usar nombres como "negro", "beige", "dorado", "azul" o un HEX como #1A1A2E.`,
        };
      }
      // If generic "change-color", default to primary
      if (intent === "change-color") {
        enriched.target = "primary";
      }
      return { needsClarification: false, enrichedEntities: enriched };
    }

    case "change-font": {
      const font = resolveFontFromText(norm);
      if (font) {
        enriched.fontValue = font.value;
        enriched.fontLabel = font.label;
      } else {
        return {
          needsClarification: true,
          clarification: `No reconocí la tipografía. Opciones: ${FONT_OPTIONS.join(", ")}. También podés pedir "más editorial", "más moderna", etc.`,
        };
      }
      return { needsClarification: false, enrichedEntities: enriched };
    }

    case "change-font-by-style": {
      const font = resolveFontFromText(norm);
      if (font) {
        enriched.fontValue = font.value;
        enriched.fontLabel = font.label;
      } else {
        return {
          needsClarification: true,
          clarification: `¿Qué estilo de tipografía buscás? Probá: "más editorial", "más moderna", "más técnica", "más limpia", "más elegante".`,
        };
      }
      return { needsClarification: false, enrichedEntities: enriched };
    }

    case "change-tone":
    case "change-tone-by-mood": {
      const tone = resolveToneFromText(norm);
      if (tone) {
        enriched.toneValue = tone.value;
        enriched.toneLabel = tone.label;
      } else {
        return {
          needsClarification: true,
          clarification: `No reconocí el tono. Opciones: Profesional, Premium, Técnico, Cercano.`,
        };
      }
      return { needsClarification: false, enrichedEntities: enriched };
    }

    case "apply-visual-tone": {
      const preset = resolveVisualTonePreset(norm);
      if (preset) {
        enriched.primaryColor = preset.primaryColor;
        enriched.secondaryColor = preset.secondaryColor;
        enriched.fontFamily = preset.fontFamily;
        enriched.tone = preset.tone;
        enriched.toneLabel = preset.label;
        enriched.toneDescription = preset.description;
      } else {
        return {
          needsClarification: true,
          clarification: `No reconocí el estilo visual. Probá: "más premium", "más sobrio", "más elegante", "más minimalista", "más técnico", "más moderno", "más cálido", "negro y beige", "dark mode".`,
        };
      }
      return { needsClarification: false, enrichedEntities: enriched };
    }

    case "change-button-style": {
      const style = resolveButtonStyle(norm);
      if (style) {
        enriched.buttonStyle = style;
        enriched.buttonStyleLabel = style === "rounded-sm" ? "Redondeado suave" : style === "square" ? "Cuadrado" : "Píldora";
      } else {
        return {
          needsClarification: true,
          clarification: `No reconocí el estilo de botón. Opciones: "redondeado", "cuadrado", "pill" (pastilla). También "más visible" para pill.`,
        };
      }
      return { needsClarification: false, enrichedEntities: enriched };
    }

    case "hide-section":
    case "show-section": {
      const section = resolveSectionFromText(norm);
      if (section) {
        enriched.sectionKey = section.key;
        enriched.sectionLabel = section.label;
      } else {
        return {
          needsClarification: true,
          clarification: `No reconocí la sección. Opciones: Hero, Productos destacados, Categorías, Beneficios, Testimonios, FAQ, Newsletter.`,
        };
      }
      return { needsClarification: false, enrichedEntities: enriched };
    }

    case "move-section": {
      const section = resolveSectionFromText(norm);
      const direction = resolveMoveDirection(norm);
      if (section && direction) {
        enriched.sectionKey = section.key;
        enriched.sectionLabel = section.label;
        enriched.direction = direction.direction;
        if (direction.reference) enriched.reference = direction.reference;
      } else if (!section) {
        return {
          needsClarification: true,
          clarification: `No reconocí qué sección mover. Opciones: Hero, Productos destacados, Categorías, Beneficios, Testimonios, FAQ, Newsletter.`,
        };
      } else {
        return {
          needsClarification: true,
          clarification: `¿Hacia dónde? Decime "arriba", "abajo", "al principio" o "al final".`,
        };
      }
      return { needsClarification: false, enrichedEntities: enriched };
    }

    case "apply-theme": {
      const theme = resolveThemeFromText(norm);
      if (theme) {
        enriched.themeId = theme.id;
        enriched.themeLabel = theme.label;
      } else {
        return {
          needsClarification: true,
          clarification: `No reconocí el tema. Opciones: Minimal Essentials, Bold Commerce, Classic Elegance, Fresh Catalog, Urban Fashion, Tech Showcase, Beauty Ritual, Lifestyle Editorial.`,
        };
      }
      return { needsClarification: false, enrichedEntities: enriched };
    }

    case "switch-preview-surface": {
      const surface = resolvePreviewSurface(norm);
      if (surface) {
        enriched.surface = surface;
      } else {
        return { needsClarification: true, clarification: `¿Qué superficie? Opciones: home, listado, producto, carrito.` };
      }
      return { needsClarification: false, enrichedEntities: enriched };
    }

    case "change-hero-headline":
    case "change-hero-subheadline":
    case "change-hero-cta": {
      const textValue = extractTextValue(norm);
      if (textValue) {
        enriched.textValue = textValue;
      } else {
        return {
          needsClarification: true,
          clarification: `¿Qué texto querés poner? Podés escribirlo entre comillas o después de "a". Ejemplo: cambiá el titular a "Mi nuevo título".`,
        };
      }
      return { needsClarification: false, enrichedEntities: enriched };
    }

    case "change-hero-image": {
      // Resolve mood/category/style — actual image resolution happens async
      // in the executor (generateOrSelectImage) which can call Imagen 3
      const { mood, category, styleHints } = resolveImageParams(norm);
      enriched.imageMood = mood;
      enriched.imageCategory = category;
      enriched.imageStyleHints = styleHints.join(",");
      enriched.targetBlock = "hero";
      return { needsClarification: false, enrichedEntities: enriched };
    }

    default:
      return { needsClarification: false };
  }
}