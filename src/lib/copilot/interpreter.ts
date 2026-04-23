// ─── Copilot Interpreter v3 ──────────────────────────────────────────────
//
// Semantic concept matcher — replaces rigid keyword matching with a
// fuzzy, concept-space approach that maps natural language to structured
// intent WITHOUT depending on exact phrases.
//
// Architecture:
//   1. Tokenize input into words
//   2. Score against concept spaces (weighted bag-of-words)
//   3. Resolve entities (colors, sections, fonts, etc.)
//   4. Detect follow-ups using conversation context
//   5. Return InterpretedIntent for the Planner

import { normalize, fixTypos } from "./normalizer";
import {
  COLOR_MAP,
  SECTION_MAP,
  SECTION_LABELS,
  VISUAL_TONE_PRESETS,
  BUTTON_STYLE_MAP,
  FONT_BY_DESCRIPTOR,
  FONT_OPTIONS,
  FONT_LABELS,
  COMPOUND_COLOR_PALETTES,
  THEME_MAP,
  THEME_LABELS,
  type CompoundPalette,
} from "./vocabulary";
import type { ConversationContext } from "./context";

// ─── Types ──────────────────────────────────────────────────────────────

export type Domain = "visual" | "layout" | "copy" | "navigation" | "meta";
export type Direction = "more" | "less" | "change" | "undo" | "show" | "hide" | "move" | "generate" | "preview" | "greeting" | "help" | "reference" | "unknown";
export type Target = "color" | "font" | "image" | "section" | "button" | "tone" | "theme" | "headline" | "subheadline" | "cta" | "preview-device" | "preview-surface" | "full-style" | "none";

export interface InterpretedIntent {
  domain: Domain;
  direction: Direction;
  target: Target;
  qualifiers: string[];       // e.g. ["premium", "clean"]
  specificValues: Record<string, string>; // e.g. { colorHex: "#1A1A2E", colorName: "negro" }
  isFollowUp: boolean;
  followUpType?: "refinement" | "rejection" | "confirmation" | "reference";
  rawText: string;
  confidence: number;         // 0-1
}

// ─── Concept Spaces ─────────────────────────────────────────────────────
//
// Each concept space represents an EDITOR CAPABILITY (not a phrase).
// The interpreter scores input against ALL spaces and picks the best match.
// This means "quiero algo más fino" matches "elegant" even though "fino"
// isn't the word "elegante" — because they're in the same concept space.

interface ConceptWord {
  word: string;
  weight: number;
}

interface ConceptSpace {
  id: string;
  domain: Domain;
  target: Target;
  direction: Direction;
  words: ConceptWord[];
  antiWords?: string[];
}

const CONCEPT_SPACES: ConceptSpace[] = [
  // ── Visual Tone / Mood ──────────────────────────────────────────────
  {
    id: "tone-premium",
    domain: "visual",
    target: "full-style",
    direction: "change",
    words: [
      { word: "premium", weight: 1.0 },
      { word: "caro", weight: 0.7 },
      { word: "lujoso", weight: 0.8 },
      { word: "lujo", weight: 0.8 },
      { word: "aspiracional", weight: 0.7 },
      { word: "exclusivo", weight: 0.7 },
      { word: "sofisticado", weight: 0.7 },
      { word: "refinado", weight: 0.7 },
      { word: "fino", weight: 0.6 },
      { word: "alto", weight: 0.3 },
      { word: "gama", weight: 0.3 },
      { word: "cheto", weight: 0.5 },
      { word: "pijo", weight: 0.4 },
      { word: "bonito", weight: 0.3 },
      { word: "lindo", weight: 0.2 },
      { word: "mejor", weight: 0.2 },
      { word: "vendedor", weight: 0.4 },
      { word: "vender", weight: 0.3 },
      { word: "venta", weight: 0.3 },
    ],
    antiWords: ["barato", "economico", "simple", "basico"],
  },
  {
    id: "tone-elegant",
    domain: "visual",
    target: "full-style",
    direction: "change",
    words: [
      { word: "elegante", weight: 1.0 },
      { word: "elegancia", weight: 0.9 },
      { word: "clase", weight: 0.6 },
      { word: "clasico", weight: 0.5 },
      { word: "distinto", weight: 0.3 },
      { word: "sobrio", weight: 0.6 },
      { word: "serio", weight: 0.4 },
      { word: "formal", weight: 0.4 },
      { word: "chic", weight: 0.7 },
      { word: "belle", weight: 0.4 },
    ],
    antiWords: ["informal", "casual", "divertido", "colorido"],
  },
  {
    id: "tone-minimal",
    domain: "visual",
    target: "full-style",
    direction: "change",
    words: [
      { word: "minimalista", weight: 1.0 },
      { word: "minimal", weight: 1.0 },
      { word: "limpio", weight: 0.8 },
      { word: "simple", weight: 0.6 },
      { word: "sencillo", weight: 0.5 },
      { word: "despejado", weight: 0.5 },
      { word: "ordenado", weight: 0.4 },
      { word: "sin", weight: 0.1 },
      { word: "ruido", weight: 0.3 },
      { word: "cargado", weight: -0.5 }, // "no tan cargado" → doble negativo = positivo
      { word: "recargado", weight: -0.5 },
      { word: "sobrio", weight: 0.4 },
      { word: "basico", weight: 0.3 },
      { word: "esencial", weight: 0.5 },
    ],
    antiWords: ["complejo", "recargado", "exagerado", "mucho"],
  },
  {
    id: "tone-modern",
    domain: "visual",
    target: "full-style",
    direction: "change",
    words: [
      { word: "moderno", weight: 1.0 },
      { word: "moderna", weight: 1.0 },
      { word: "actual", weight: 0.7 },
      { word: "contemporaneo", weight: 0.7 },
      { word: "futurista", weight: 0.5 },
      { word: "innovador", weight: 0.5 },
      { word: "nuevo", weight: 0.3 },
      { word: "fresco", weight: 0.5 },
      { word: "fresh", weight: 0.5 },
      { word: "tendencia", weight: 0.4 },
      { word: "in", weight: 0.3 },
    ],
    antiWords: ["viejo", "antiguo", "clasico", "retro"],
  },
  {
    id: "tone-warm",
    domain: "visual",
    target: "full-style",
    direction: "change",
    words: [
      { word: "calido", weight: 1.0 },
      { word: "caliente", weight: 0.4 },
      { word: "acogedor", weight: 0.8 },
      { word: "cercano", weight: 0.7 },
      { word: "humano", weight: 0.5 },
      { word: "amigable", weight: 0.6 },
      { word: "amable", weight: 0.5 },
      { word: "suave", weight: 0.6 },
      { word: "tierno", weight: 0.4 },
      { word: "cariño", weight: 0.3 },
      { word: "hogar", weight: 0.3 },
      { word: "natural", weight: 0.4 },
    ],
    antiWords: ["frio", "distante", "formal", "seco"],
  },
  {
    id: "tone-editorial",
    domain: "visual",
    target: "full-style",
    direction: "change",
    words: [
      { word: "editorial", weight: 1.0 },
      { word: "revista", weight: 0.7 },
      { word: "magazine", weight: 0.7 },
      { word: "publicacion", weight: 0.4 },
      { word: "periodistico", weight: 0.4 },
      { word: "periodismo", weight: 0.3 },
    ],
    antiWords: [],
  },
  {
    id: "tone-technical",
    domain: "visual",
    target: "full-style",
    direction: "change",
    words: [
      { word: "tecnico", weight: 1.0 },
      { word: "tecno", weight: 0.7 },
      { word: "tecnologia", weight: 0.6 },
      { word: "digital", weight: 0.5 },
      { word: "startup", weight: 0.5 },
      { word: "saas", weight: 0.5 },
      { word: "informatico", weight: 0.4 },
      { word: "geek", weight: 0.3 },
    ],
    antiWords: ["artesanal", "manual", "organico"],
  },
  {
    id: "tone-dark",
    domain: "visual",
    target: "full-style",
    direction: "change",
    words: [
      { word: "oscuro", weight: 1.0 },
      { word: "dark", weight: 1.0 },
      { word: "noche", weight: 0.6 },
      { word: "negro", weight: 0.4 },
      { word: "sombrio", weight: 0.7 },
      { word: "sombrío", weight: 0.7 },
      { word: "mode", weight: 0.3 }, // "dark mode"
    ],
    antiWords: ["claro", "luminoso", "brillante", "light"],
  },
  {
    id: "tone-luxury",
    domain: "visual",
    target: "full-style",
    direction: "change",
    words: [
      { word: "luxury", weight: 1.0 },
      { word: "luxe", weight: 1.0 },
      { word: "boutique", weight: 0.8 },
      { word: "designer", weight: 0.7 },
      { word: "disenador", weight: 0.6 },
      { word: "alta", weight: 0.3 },
      { word: "costura", weight: 0.4 },
      { word: "haute", weight: 0.5 },
      { word: "couture", weight: 0.5 },
      { word: "exclusive", weight: 0.6 },
    ],
    antiWords: ["masivo", "popular", "comun"],
  },
  {
    id: "tone-commercial",
    domain: "visual",
    target: "full-style",
    direction: "change",
    words: [
      { word: "comercial", weight: 1.0 },
      { word: "ventas", weight: 0.7 },
      { word: "venta", weight: 0.5 },
      { word: "negocio", weight: 0.4 },
      { word: "tienda", weight: 0.2 },
      { word: "shop", weight: 0.3 },
      { word: "retail", weight: 0.5 },
      { word: "ecommerce", weight: 0.4 },
    ],
    antiWords: [],
  },
  {
    id: "tone-rustic",
    domain: "visual",
    target: "full-style",
    direction: "change",
    words: [
      { word: "rustico", weight: 1.0 },
      { word: "campestre", weight: 0.7 },
      { word: "organico", weight: 0.6 },
      { word: "natural", weight: 0.5 },
      { word: "artesanal", weight: 0.6 },
      { word: "handmade", weight: 0.6 },
      { word: "manual", weight: 0.4 },
      { word: "terra", weight: 0.4 },
      { word: "tierra", weight: 0.4 },
    ],
    antiWords: ["moderno", "digital", "tecnologico"],
  },

  // ── Color Change ────────────────────────────────────────────────────
  {
    id: "change-color",
    domain: "visual",
    target: "color",
    direction: "change",
    words: [
      { word: "color", weight: 0.8 },
      { word: "colores", weight: 0.8 },
      { word: "paleta", weight: 0.7 },
      { word: "tono", weight: 0.4 },
      { word: "tonos", weight: 0.5 },
      { word: "beige", weight: 0.4 },
      { word: "negro", weight: 0.3 },
      { word: "blanco", weight: 0.3 },
      { word: "azul", weight: 0.3 },
      { word: "rojo", weight: 0.3 },
      { word: "dorado", weight: 0.3 },
      { word: "gris", weight: 0.3 },
      { word: "verde", weight: 0.3 },
      { word: "rosa", weight: 0.3 },
      { word: "marron", weight: 0.3 },
      { word: "oliva", weight: 0.3 },
      { word: "terracota", weight: 0.3 },
      { word: "amarillo", weight: 0.3 },
      { word: "naranja", weight: 0.3 },
      { word: "violeta", weight: 0.3 },
      { word: "celeste", weight: 0.3 },
      { word: "turquesa", weight: 0.3 },
      { word: "arena", weight: 0.3 },
    ],
    antiWords: ["fuente", "tipografia", "font", "seccion", "boton"],
  },

  // ── Font / Typography ───────────────────────────────────────────────
  {
    id: "change-font",
    domain: "visual",
    target: "font",
    direction: "change",
    words: [
      { word: "fuente", weight: 0.9 },
      { word: "tipografia", weight: 0.9 },
      { word: "font", weight: 0.9 },
      { word: "letra", weight: 0.8 },
      { word: "letras", weight: 0.7 },
      { word: "texto", weight: 0.3 },
      { word: "tipografia", weight: 0.9 },
    ],
    antiWords: ["color", "imagen", "seccion"],
  },

  // ── Image ───────────────────────────────────────────────────────────
  {
    id: "change-image",
    domain: "visual",
    target: "image",
    direction: "change",
    words: [
      { word: "imagen", weight: 0.9 },
      { word: "foto", weight: 0.9 },
      { word: "portada", weight: 0.7 },
      { word: "banner", weight: 0.7 },
      { word: "fondo", weight: 0.5 },
      { word: "picture", weight: 0.7 },
      { word: "photo", weight: 0.7 },
    ],
    antiWords: ["titulo", "texto", "headline", "boton"],
  },

  // ── Section Hide ────────────────────────────────────────────────────
  {
    id: "hide-section",
    domain: "layout",
    target: "section",
    direction: "hide",
    words: [
      { word: "oculta", weight: 0.8 },
      { word: "esconde", weight: 0.8 },
      { word: "saca", weight: 0.6 },
      { word: "quita", weight: 0.6 },
      { word: "elimina", weight: 0.5 },
      { word: "borra", weight: 0.5 },
      { word: "desactiva", weight: 0.5 },
      { word: "sacar", weight: 0.6 },
      { word: "quitar", weight: 0.6 },
      { word: "ocultar", weight: 0.7 },
      { word: "no", weight: 0.1 },
      { word: "saque", weight: 0.5 },
    ],
    antiWords: ["mostra", "muestra", "activa", "habilita", "agrega", "pon"],
  },

  // ── Section Show ────────────────────────────────────────────────────
  {
    id: "show-section",
    domain: "layout",
    target: "section",
    direction: "show",
    words: [
      { word: "mostra", weight: 0.8 },
      { word: "muestra", weight: 0.8 },
      { word: "activa", weight: 0.6 },
      { word: "habilita", weight: 0.6 },
      { word: "agrega", weight: 0.5 },
      { word: "pon", weight: 0.2 },
      { word: "mostrar", weight: 0.7 },
      { word: "activar", weight: 0.5 },
    ],
    antiWords: ["ocult", "escond", "sac", "quit", "elimin", "borr"],
  },

  // ── Section Move ────────────────────────────────────────────────────
  {
    id: "move-section",
    domain: "layout",
    target: "section",
    direction: "move",
    words: [
      { word: "mueve", weight: 0.8 },
      { word: "move", weight: 0.8 },
      { word: "subi", weight: 0.7 },
      { word: "baja", weight: 0.7 },
      { word: "arriba", weight: 0.6 },
      { word: "abajo", weight: 0.6 },
      { word: "reordena", weight: 0.7 },
      { word: "subir", weight: 0.6 },
      { word: "bajar", weight: 0.6 },
      { word: "principio", weight: 0.5 },
      { word: "final", weight: 0.5 },
    ],
    antiWords: ["color", "fuente", "font"],
  },

  // ── Button Style ────────────────────────────────────────────────────
  {
    id: "change-button",
    domain: "visual",
    target: "button",
    direction: "change",
    words: [
      { word: "boton", weight: 0.9 },
      { word: "button", weight: 0.9 },
      { word: "cta", weight: 0.8 },
      { word: "botones", weight: 0.8 },
      { word: "redondeado", weight: 0.5 },
      { word: "cuadrado", weight: 0.5 },
      { word: "pill", weight: 0.5 },
      { word: "redondo", weight: 0.5 },
      { word: "circular", weight: 0.5 },
    ],
    antiWords: ["color", "fuente", "imagen", "titulo"],
  },

  // ── Copy / Text edits ───────────────────────────────────────────────
  {
    id: "edit-headline",
    domain: "copy",
    target: "headline",
    direction: "change",
    words: [
      { word: "titulo", weight: 0.8 },
      { word: "titular", weight: 0.8 },
      { word: "headline", weight: 0.9 },
      { word: "h1", weight: 0.7 },
      { word: "encabezado", weight: 0.7 },
    ],
    antiWords: ["subtitulo", "sub", "boton", "imagen"],
  },
  {
    id: "edit-subheadline",
    domain: "copy",
    target: "subheadline",
    direction: "change",
    words: [
      { word: "subtitulo", weight: 0.9 },
      { word: "sub", weight: 0.5 },
      { word: "subheadline", weight: 0.9 },
      { word: "bajada", weight: 0.7 },
    ],
    antiWords: ["titulo", "titular", "headline"],
  },
  {
    id: "edit-cta",
    domain: "copy",
    target: "cta",
    direction: "change",
    words: [
      { word: "cta", weight: 0.7 },
      { word: "accion", weight: 0.4 },
    ],
    antiWords: ["redondeado", "cuadrado", "pill", "estilo"],
  },

  // ── Theme ───────────────────────────────────────────────────────────
  {
    id: "apply-theme",
    domain: "visual",
    target: "theme",
    direction: "change",
    words: [
      { word: "tema", weight: 0.9 },
      { word: "theme", weight: 0.9 },
      { word: "template", weight: 0.8 },
      { word: "plantilla", weight: 0.8 },
    ],
    antiWords: ["color", "fuente", "seccion"],
  },

  // ── Preview / Navigation ────────────────────────────────────────────
  {
    id: "preview-mobile",
    domain: "navigation",
    target: "preview-device",
    direction: "preview",
    words: [
      { word: "celu", weight: 0.9 },
      { word: "celular", weight: 0.9 },
      { word: "mobile", weight: 0.9 },
      { word: "movil", weight: 0.9 },
      { word: "telefono", weight: 0.7 },
    ],
    antiWords: ["desktop", "escritorio", "pc"],
  },
  {
    id: "preview-desktop",
    domain: "navigation",
    target: "preview-device",
    direction: "preview",
    words: [
      { word: "desktop", weight: 0.9 },
      { word: "escritorio", weight: 0.9 },
      { word: "pc", weight: 0.7 },
      { word: "computadora", weight: 0.7 },
    ],
    antiWords: ["celu", "celular", "mobile"],
  },
  {
    id: "preview-surface",
    domain: "navigation",
    target: "preview-surface",
    direction: "preview",
    words: [
      { word: "home", weight: 0.5 },
      { word: "listado", weight: 0.6 },
      { word: "productos", weight: 0.4 },
      { word: "carrito", weight: 0.6 },
      { word: "cart", weight: 0.6 },
      { word: "pdp", weight: 0.6 },
    ],
    antiWords: [],
  },

  // ── Undo ────────────────────────────────────────────────────────────
  {
    id: "undo",
    domain: "meta",
    target: "none",
    direction: "undo",
    words: [
      { word: "deshace", weight: 0.9 },
      { word: "reverti", weight: 0.9 },
      { word: "cancela", weight: 0.5 },
      { word: "atras", weight: 0.7 },
      { word: "anterior", weight: 0.5 },
      { word: "antes", weight: 0.5 },
      { word: "volamos", weight: 0.4 },
      { word: "volve", weight: 0.6 },
      { word: "devolve", weight: 0.6 },
      { word: "deshacer", weight: 0.8 },
      { word: "undo", weight: 0.9 },
    ],
    antiWords: [],
  },

  // ── Greeting ────────────────────────────────────────────────────────
  {
    id: "greeting",
    domain: "meta",
    target: "none",
    direction: "greeting",
    words: [
      { word: "hola", weight: 0.7 },
      { word: "buenas", weight: 0.7 },
      { word: "hey", weight: 0.6 },
      { word: "hi", weight: 0.6 },
      { word: "hello", weight: 0.6 },
      { word: "que", weight: 0.1 },
      { word: "tal", weight: 0.3 },
      { word: "como", weight: 0.1 },
      { word: "va", weight: 0.2 },
    ],
    antiWords: ["cambia", "pon", "saca", "mueve", "oculta", "mostra", "color", "fuente", "seccion", "boton", "imagen", "titulo"],
  },

  // ── Help ────────────────────────────────────────────────────────────
  {
    id: "help",
    domain: "meta",
    target: "none",
    direction: "help",
    words: [
      { word: "ayuda", weight: 0.9 },
      { word: "help", weight: 0.9 },
      { word: "puedo", weight: 0.3 },
      { word: "haces", weight: 0.4 },
      { word: "funciona", weight: 0.4 },
    ],
    antiWords: [],
  },
];

// ─── Anti-word scoring boost words ──────────────────────────────────────
// These words in the input suggest a DIRECTION change even without explicit verbs

const MORE_WORDS = ["mas", "mucho", "muy", "super", "ultra", "bien", "bastante", "re", "mega"];
const LESS_WORDS = ["menos", "poco", "poca", "suave", "suavizar", "bajar", "reducir", "no tan", "poco"];
const NO_WORDS = ["no", "nunca", "nada", "ni", "tampoco", "para"];
const CHANGE_WORDS = ["cambia", "cambiar", "pon", "poner", "usa", "usar", "hace", "hacer", "quiero", "busco", "necesito", "damelo", "dame", "aplica", "aplicar", "probemos", "proba", "veamos", "dejalo", "deja", "mejora", "mejore", "mejorá"];

// ─── Main Interpreter ───────────────────────────────────────────────────

export function interpretInput(raw: string, ctx: ConversationContext): InterpretedIntent {
  const normalized = normalize(raw);
  const fixed = fixTypos(normalized);
  const words = tokenize(fixed);

  // Step 0: High-confidence direct patterns (bypass concept scoring)
  if (fixed.includes("portada") && (fixed.includes("no me convence") || fixed.includes("no me gusta"))) {
    return {
      domain: "visual",
      direction: "change",
      target: "image",
      qualifiers: ["better"],
      specificValues: {},
      isFollowUp: false,
      rawText: raw,
      confidence: 0.85,
    };
  }

  // Step 1: Check for follow-up first (short messages referencing context)
  const followUp = detectFollowUp(fixed, words, ctx);
  if (followUp) return followUp;

  // Step 2: Score against all concept spaces
  const scores = scoreAllConcepts(words, fixed);

  // Step 3: Pick best match
  const best = scores.length > 0 ? scores[0] : null;

  if (!best || best.score < 1.5) {
    // Low confidence — try abstract interpretation as fallback
    const abstract = tryAbstractInterpretation(fixed, words, ctx);
    if (abstract) return abstract;

    return {
      domain: "meta",
      direction: "unknown",
      target: "none",
      qualifiers: [],
      specificValues: {},
      isFollowUp: false,
      rawText: raw,
      confidence: 0,
    };
  }

  // Step 4: Build interpreted intent
  const space = best.space;
  const confidence = Math.min(best.score / 10, 1);

  // Step 5: Extract entities
  const specificValues = extractEntities(fixed, space);

  // Step 6: Extract qualifiers
  const qualifiers = extractQualifiers(words);

  return {
    domain: space.domain,
    direction: space.direction,
    target: space.target,
    qualifiers,
    specificValues,
    isFollowUp: false,
    rawText: raw,
    confidence,
  };
}

// ─── Tokenization ───────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

// ─── Concept Scoring ────────────────────────────────────────────────────

interface ConceptScore {
  space: ConceptSpace;
  score: number;
}

function scoreAllConcepts(words: string[], fullText: string): ConceptScore[] {
  // Domain anchors: when these words are present, boost their domain significantly
  const DOMAIN_ANCHORS: Record<string, string> = {
    "tipografia": "change-font", "fuente": "change-font", "font": "change-font", "letra": "change-font",
    "boton": "change-button", "button": "change-button", "botones": "change-button",
    "imagen": "change-image", "foto": "change-image", "portada": "change-image", "banner": "change-image",
    "color": "change-color", "colores": "change-color", "paleta": "change-color",
    "titulo": "edit-headline", "titular": "edit-headline", "headline": "edit-headline",
    "seccion": "hide-section",
    "celu": "preview-mobile", "celular": "preview-mobile", "mobile": "preview-mobile",
  };
  const activeAnchors = new Set<string>();
  for (const word of words) {
    if (DOMAIN_ANCHORS[word]) activeAnchors.add(DOMAIN_ANCHORS[word]);
  }

  const scores: ConceptScore[] = [];

  for (const space of CONCEPT_SPACES) {
    let score = 0;

    // Word-level matching
    for (const word of words) {
      for (const conceptWord of space.words) {
        if (word === conceptWord.word) {
          score += conceptWord.weight * 2;
        } else if (word.includes(conceptWord.word) || conceptWord.word.includes(word)) {
          score += conceptWord.weight * 0.8;
        }
      }
    }

    // Multi-word phrase matching (higher confidence)
    for (const conceptWord of space.words) {
      if (conceptWord.word.includes(" ") && fullText.includes(conceptWord.word)) {
        score += conceptWord.weight * 3;
      }
    }

    // Domain anchor boost: if a specific domain word is present, boost that space
    if (activeAnchors.has(space.id)) {
      score += 5; // Strong boost for domain-specific matches
    }

    // Anti-word penalty
    if (space.antiWords) {
      for (const anti of space.antiWords) {
        if (fullText.includes(anti)) {
          score -= 3;
        }
      }
    }

    if (score > 0) {
      scores.push({ space, score });
    }
  }

  scores.sort((a, b) => b.score - a.score);
  return scores;
}

// ─── Follow-up Detection ────────────────────────────────────────────────

function detectFollowUp(text: string, words: string[], ctx: ConversationContext): InterpretedIntent | null {
  if (!ctx.lastAction) return null;

  const short = words.length <= 5;

  // ── Rejection / Undo follow-ups ────────────────────────────────────
  const rejectionPatterns = [
    "eso no", "no me gusto", "no me gusta", "no va", "no era eso",
    "reverti", "deshace", "volamos atras", "volvamos atras", "volve atras",
    "dejalo como antes", "como estaba", "como estaba antes", "el anterior",
    "no estaba asi", "eso no me convence",
  ];
  for (const pattern of rejectionPatterns) {
    if (text.includes(pattern)) {
      return {
        domain: "meta",
        direction: "undo",
        target: "none",
        qualifiers: [],
        specificValues: {},
        isFollowUp: true,
        followUpType: "rejection",
        rawText: text,
        confidence: 0.9,
      };
    }
  }

  // ── "no" as standalone rejection ────────────────────────────────────
  if (words.length === 1 && words[0] === "no") {
    return {
      domain: "meta",
      direction: "undo",
      target: "none",
      qualifiers: [],
      specificValues: {},
      isFollowUp: true,
      followUpType: "rejection",
      rawText: text,
      confidence: 0.85,
    };
  }

  // ── Reference follow-ups ("esa seccion", "esa imagen") ─────────────
  const referencePatterns: Array<{ pattern: string; target: Target; action: string }> = [
    { pattern: "esa seccion", target: "section", action: "move-section" },
    { pattern: "ese bloque", target: "section", action: "move-section" },
    { pattern: "esa parte", target: "section", action: "move-section" },
    { pattern: "esa imagen", target: "image", action: "change-hero-image" },
    { pattern: "esa foto", target: "image", action: "change-hero-image" },
    { pattern: "ese color", target: "color", action: "change-color" },
    { pattern: "esa fuente", target: "font", action: "change-font" },
    { pattern: "esa tipografia", target: "font", action: "change-font" },
    { pattern: "la portada", target: "image", action: "change-hero-image" },
  ];

  for (const ref of referencePatterns) {
    if (text.includes(ref.pattern)) {
      // If there's a direction, it's a refinement on that reference
      const hasDirection = words.some(w => ["arriba", "abajo", "mejor", "otra", "mas", "menos", "cambia", "pon"].includes(w));

      return {
        domain: ref.target === "image" ? "visual" : ref.target === "section" ? "layout" : "visual",
        direction: hasDirection ? "change" : "reference" as Direction,
        target: ref.target,
        qualifiers: extractQualifiers(words),
        specificValues: { referencedEntity: ref.pattern },
        isFollowUp: true,
        followUpType: "reference",
        rawText: text,
        confidence: 0.8,
      };
    }
  }

  // ── Context-dependent short inputs ──────────────────────────────────
  // "mas asi" → more of the same (refinement of last tone)
  if (text.includes("mas asi") || text.includes("asi mismo") || text.includes("mas de lo mismo")) {
    if (ctx.lastAction) {
      return {
        domain: "visual",
        direction: "change",
        target: "full-style",
        qualifiers: ["more"],
        specificValues: {},
        isFollowUp: true,
        followUpType: "refinement",
        rawText: text,
        confidence: 0.6,
      };
    }
  }

  // ── Short refinement follow-ups ─────────────────────────────────────
  // "mas premium", "mas claro", "mas suave", "mas beige", etc.
  if (short && ctx.lastAction) {
    const hasMore = words.some(w => MORE_WORDS.includes(w));
    const hasLess = words.some(w => LESS_WORDS.includes(w));

    if (hasMore || hasLess) {
      // Check if it's a color refinement
      const color = resolveColorFromText(text);
      if (color) {
        return {
          domain: "visual",
          direction: "change",
          target: "color",
          qualifiers: hasMore ? ["more"] : ["less"],
          specificValues: { colorHex: color.hex, colorName: color.name },
          isFollowUp: true,
          followUpType: "refinement",
          rawText: text,
          confidence: 0.85,
        };
      }

      // Check if it's a visual tone refinement
      const tone = resolveToneQualifier(words);
      if (tone) {
        return {
          domain: "visual",
          direction: "change",
          target: "full-style",
          qualifiers: [tone, hasMore ? "more" : "less"],
          specificValues: {},
          isFollowUp: true,
          followUpType: "refinement",
          rawText: text,
          confidence: 0.8,
        };
      }
    }

    // "aplicalo", "dale", "si", "ok" → confirmation
    const confirmWords = ["aplicalo", "aplica", "dale", "hacelo", "confirmo", "si", "ok", "dalo"];
    if (words.some(w => confirmWords.includes(w))) {
      return {
        domain: "meta",
        direction: "unknown",
        target: "none",
        qualifiers: [],
        specificValues: {},
        isFollowUp: true,
        followUpType: "confirmation",
        rawText: text,
        confidence: 0.5,
      };
    }

    // "mostrame como queda" → preview
    if (text.includes("mostrame") || text.includes("como queda") || text.includes("como se ve") || text.includes("preview")) {
      return {
        domain: "navigation",
        direction: "preview",
        target: "preview-device",
        qualifiers: [],
        specificValues: {},
        isFollowUp: true,
        followUpType: "reference",
        rawText: text,
        confidence: 0.7,
      };
    }
  }

  return null;
}

// ─── Abstract Interpretation ─────────────────────────────────────────────
//
// When no concept space scores high enough, try to infer intent from
// abstract patterns. This is the key to handling "quiero algo más fino",
// "esto se siente muy duro", "hace que se vea mejor", etc.

function tryAbstractInterpretation(text: string, words: string[], ctx: ConversationContext): InterpretedIntent | null {
  // ── Pattern: "menos X" / "no tan X" → opposite tone direction ──────
  const menosMatch = text.match(/(?:menos|no\s+tan|poco)\s+(\w+)/);
  if (menosMatch) {
    const qualifier = menosMatch[1];
    const menosMap: Record<string, string> = {
      "duro": "calido", "oscuro": "calido", "cargado": "minimalista",
      "recargado": "minimalista", "formal": "calido", "serio": "calido",
      "simple": "premium", "basico": "premium", "frio": "calido",
      "grande": "minimalista", "comercial": "elegante", "ruidoso": "minimalista",
      "colorido": "minimalista", "llamativo": "minimalista",
    };
    const tone = menosMap[qualifier];
    if (tone) {
      return {
        domain: "visual",
        direction: "change",
        target: "full-style",
        qualifiers: [tone],
        specificValues: { toneKey: tone },
        isFollowUp: ctx.lastAction ? true : false,
        followUpType: ctx.lastAction ? "refinement" : undefined,
        rawText: text,
        confidence: 0.7,
      };
    }
  }

  // ── Pattern: "la portada no me convence" → image change ────────────
  if (text.includes("portada") && (text.includes("no") || text.includes("convence") || text.includes("gusta"))) {
    return {
      domain: "visual",
      direction: "change",
      target: "image",
      qualifiers: ["better"],
      specificValues: {},
      isFollowUp: false,
      rawText: text,
      confidence: 0.7,
    };
  }

  // ── Pattern: "mejorá esta parte" / "mejora X" → visual improvement ─
  if (words.some(w => ["mejora", "mejorá", "mejore", "mejorar"].includes(w)) && !text.includes("imagen") && !text.includes("color")) {
    return {
      domain: "visual",
      direction: "change",
      target: "full-style",
      qualifiers: ["premium"],
      specificValues: { toneKey: "premium" },
      isFollowUp: false,
      rawText: text,
      confidence: 0.55,
    };
  }

  // ── Pattern: "quiero algo mas X" / "algo mas X" / "mas X" ──────────
  const abstractToneMatch = text.match(/(?:quiero\s+(?:algo\s+)?)?mas\s+(\w+)/);
  if (abstractToneMatch) {
    const qualifier = abstractToneMatch[1];
    // Try to map to a visual tone
    const toneMap: Record<string, string> = {
      "premium": "premium", "elegante": "elegante", "sobrio": "sobrio",
      "moderno": "moderno", "calido": "calido", "limpio": "minimalista",
      "minimalista": "minimalista", "minimal": "minimalista",
      "tecnico": "tecnico", "comercial": "comercial", "editorial": "editorial",
      "rustico": "rustico", "natural": "rustico", "oscuro": "dark",
      "luxury": "luxury", "luxe": "luxury", "aspiracional": "premium",
      "sofisticado": "elegante", "refinado": "elegante", "fino": "elegante",
      "vendedor": "comercial", "caro": "premium", "lujoso": "luxury",
      "suave": "calido", "cercano": "calido", "amigable": "calido",
      "serio": "sobrio", "formal": "sobrio",
      "chic": "elegante", "bonito": "premium", "lindo": "calido",
      "fresco": "moderno", "actual": "moderno",
      "simple": "minimalista", "sencillo": "minimalista",
      "despejado": "minimalista", "basico": "minimalista",
    };
    const tone = toneMap[qualifier];
    if (tone) {
      return {
        domain: "visual",
        direction: "change",
        target: "full-style",
        qualifiers: [tone, "more"],
        specificValues: { toneKey: tone },
        isFollowUp: false,
        rawText: text,
        confidence: 0.75,
      };
    }

    // Maybe it's a color: "mas beige", "mas azul"
    const color = resolveColorFromText(text);
    if (color) {
      return {
        domain: "visual",
        direction: "change",
        target: "color",
        qualifiers: ["more"],
        specificValues: { colorHex: color.hex, colorName: color.name },
        isFollowUp: false,
        rawText: text,
        confidence: 0.8,
      };
    }
  }

  // ── Pattern: "esto pero mas X" / "eso mismo pero mas X" ────────────
  const peroMasMatch = text.match(/(?:esto|eso|ese)\s*(?:mismo|misma)?\s*pero\s+mas\s+(\w+)/);
  if (peroMasMatch) {
    const qualifier = peroMasMatch[1];
    const toneMap: Record<string, string> = {
      "premium": "premium", "elegante": "elegante", "luxury": "luxury",
      "moderno": "moderno", "calido": "calido", "limpio": "minimalista",
      "caro": "premium", "lujoso": "luxury", "suave": "calido",
      "sofisticado": "elegante", "fino": "elegante",
    };
    const tone = toneMap[qualifier];
    if (tone) {
      return {
        domain: "visual",
        direction: "change",
        target: "full-style",
        qualifiers: [tone, "more"],
        specificValues: { toneKey: tone },
        isFollowUp: ctx.lastAction ? true : false,
        followUpType: ctx.lastAction ? "refinement" : undefined,
        rawText: text,
        confidence: 0.75,
      };
    }
  }

  // ── Pattern: "poneme X" / "dame X" / "quiero X" (no verb-object) ───
  const hasChangeVerb = CHANGE_WORDS.some(v => text.includes(v));
  if (hasChangeVerb) {
    // Try to resolve what they want to change
    const color = resolveColorFromText(text);
    if (color) {
      return {
        domain: "visual",
        direction: "change",
        target: "color",
        qualifiers: [],
        specificValues: { colorHex: color.hex, colorName: color.name },
        isFollowUp: false,
        rawText: text,
        confidence: 0.7,
      };
    }

    // Try section
    const section = resolveSectionFromText(text);
    if (section) {
      const isHide = text.includes("saca") || text.includes("quita") || text.includes("oculta") || text.includes("esconde");
      const isShow = text.includes("mostra") || text.includes("muestra") || text.includes("activa");
      return {
        domain: "layout",
        direction: isHide ? "hide" : isShow ? "show" : "change",
        target: "section",
        qualifiers: [],
        specificValues: { sectionKey: section.key, sectionLabel: section.label },
        isFollowUp: false,
        rawText: text,
        confidence: 0.7,
      };
    }

    // "hace que se vea mejor" / "quiero que se vea mejor" → visual improvement
    const improvementWords = ["mejor", "bien", "lindo", "bonito", "distinto", "diferente"];
    if (words.some(w => improvementWords.includes(w))) {
      return {
        domain: "visual",
        direction: "change",
        target: "full-style",
        qualifiers: ["premium"],
        specificValues: { toneKey: "premium" },
        isFollowUp: false,
        rawText: text,
        confidence: 0.5,
      };
    }

    // "quiero cambiar la tienda" / "quiero cambiar algo" → generic change intent
    if (text.includes("cambiar") || text.includes("cambia")) {
      return {
        domain: "visual",
        direction: "change",
        target: "full-style",
        qualifiers: ["premium"],
        specificValues: { toneKey: "premium" },
        isFollowUp: false,
        rawText: text,
        confidence: 0.4,
      };
    }
  }

  // ── Pattern: "la portada no me convence" → image change ────────────
  if (text.includes("portada") && (text.includes("no") || text.includes("convence") || text.includes("gusta"))) {
    return {
      domain: "visual",
      direction: "change",
      target: "image",
      qualifiers: ["better"],
      specificValues: {},
      isFollowUp: false,
      rawText: text,
      confidence: 0.7,
    };
  }

  // ── Pattern: "esto esta muy X" / "se siente muy X" ─────────────────
  const feelMatch = text.match(/(?:esto\s+)?(?:esta|esta|se\s+siente)\s+(?:muy\s+)?(\w+)/);
  if (feelMatch) {
    const adj = feelMatch[1];
    // Map adjectives to opposite improvements
    const oppositeMap: Record<string, string> = {
      "oscuro": "calido", "apagado": "premium", "cargado": "minimalista",
      "simple": "premium", "aburrido": "moderno", "viejo": "moderno",
      "feo": "premium", "duro": "calido", "frio": "calido",
      "chico": "comercial", "grande": "minimalista", "desordenado": "minimalista",
    };
    const tone = oppositeMap[adj];
    if (tone) {
      return {
        domain: "visual",
        direction: "change",
        target: "full-style",
        qualifiers: [tone],
        specificValues: { toneKey: tone },
        isFollowUp: false,
        rawText: text,
        confidence: 0.6,
      };
    }
  }

  // ── Pattern: short input with only a qualifier ──────────────────────
  if (words.length <= 3) {
    const qualifier = words.find(w => !MORE_WORDS.includes(w) && !LESS_WORDS.includes(w) && !NO_WORDS.includes(w));
    if (qualifier) {
      const toneMap: Record<string, string> = {
        "premium": "premium", "elegante": "elegante", "sobrio": "sobrio",
        "moderno": "moderno", "calido": "calido", "limpio": "minimalista",
        "minimalista": "minimalista", "luxury": "luxury",
      };
      const tone = toneMap[qualifier];
      if (tone) {
        return {
          domain: "visual",
          direction: "change",
          target: "full-style",
          qualifiers: [tone],
          specificValues: { toneKey: tone },
          isFollowUp: ctx.lastAction ? true : false,
          followUpType: ctx.lastAction ? "refinement" : undefined,
          rawText: text,
          confidence: 0.65,
        };
      }
    }
  }

  return null;
}

// ─── Entity Extraction ───────────────────────────────────────────────────

function extractEntities(text: string, space: ConceptSpace): Record<string, string> {
  const entities: Record<string, string> = {};

  switch (space.target) {
    case "color": {
      const color = resolveColorFromText(text);
      if (color) {
        entities.colorHex = color.hex;
        entities.colorName = color.name;
      }
      // Check compound
      const compound = resolveCompoundPalette(text);
      if (compound) {
        entities.colorHex = compound.primary;
        entities.colorName = compound.primaryName;
        entities.secondaryColorHex = compound.secondary;
        entities.secondaryColorName = compound.secondaryName;
        entities.isCompoundPalette = "true";
      }
      break;
    }
    case "section": {
      const section = resolveSectionFromText(text);
      if (section) {
        entities.sectionKey = section.key;
        entities.sectionLabel = section.label;
      }
      break;
    }
    case "font": {
      const font = resolveFontFromText(text);
      if (font) {
        entities.fontValue = font.value;
        entities.fontLabel = font.label;
      }
      break;
    }
    case "button": {
      const style = resolveButtonStyleFromText(text);
      if (style) {
        entities.buttonStyle = style;
      }
      break;
    }
    case "image": {
      entities.imageMood = "premium";
      entities.imageCategory = "lifestyle";
      entities.targetBlock = "hero";
      // Try to resolve mood hints
      if (text.includes("premium") || text.includes("aspiracional")) entities.imageMood = "premium";
      if (text.includes("elegante") || text.includes("luxury")) entities.imageMood = "luxury";
      if (text.includes("minimalista") || text.includes("minimal") || text.includes("limpio")) entities.imageMood = "minimalista";
      if (text.includes("oscuro") || text.includes("dark")) entities.imageMood = "oscuro";
      if (text.includes("calido") || text.includes("natural")) entities.imageMood = "calido";
      if (text.includes("moda") || text.includes("fashion")) entities.imageCategory = "fashion";
      if (text.includes("skincare") || text.includes("beauty") || text.includes("belleza")) entities.imageCategory = "beauty";
      if (text.includes("tech") || text.includes("tecnologia")) entities.imageCategory = "tech";
      if (text.includes("food") || text.includes("comida") || text.includes("gastronomia")) entities.imageCategory = "food";
      break;
    }
    case "preview-device": {
      if (text.includes("celu") || text.includes("celular") || text.includes("mobile") || text.includes("movil")) {
        entities.device = "mobile";
      } else {
        entities.device = "desktop";
      }
      break;
    }
    case "preview-surface": {
      if (text.includes("carrito") || text.includes("cart")) entities.surface = "cart";
      else if (text.includes("pdp") || text.includes("producto")) entities.surface = "product";
      else if (text.includes("listado") || text.includes("catalogo")) entities.surface = "listing";
      else entities.surface = "home";
      break;
    }
    case "headline":
    case "subheadline":
    case "cta": {
      // Extract quoted or free text
      const quoted = text.match(/["""'](.+?)["""']/);
      if (quoted) entities.textValue = quoted[1].trim();
      else {
        const afterKeyword = text.match(/(?:a|por|que\s+(?:diga|tenga|sea))\s+(.+?)$/i);
        if (afterKeyword) entities.textValue = afterKeyword[1].trim().replace(/["""']/g, "");
      }
      break;
    }
    case "theme": {
      const theme = resolveThemeFromText(text);
      if (theme) {
        entities.themeId = theme.id;
        entities.themeLabel = theme.label;
      }
      break;
    }
  }

  return entities;
}

// ─── Qualifier Extraction ────────────────────────────────────────────────

function extractQualifiers(words: string[]): string[] {
  const qualifiers: string[] = [];
  const qualityWords = [
    "premium", "elegante", "sobrio", "moderno", "calido", "limpio",
    "minimalista", "minimal", "tecnico", "comercial", "editorial",
    "rustico", "natural", "oscuro", "luxury", "aspiracional",
    "sofisticado", "refinado", "fino", "suave", "redondeado",
    "cuadrado", "pill", "redondo", "circular", "visible",
    "mejor", "otra", "nuevo", "grande", "chico",
  ];
  for (const word of words) {
    if (qualityWords.includes(word)) {
      qualifiers.push(word);
    }
  }
  return qualifiers;
}

function resolveToneQualifier(words: string[]): string | null {
  const toneMap: Record<string, string> = {
    "premium": "premium", "elegante": "elegante", "sobrio": "sobrio",
    "moderno": "moderno", "calido": "calido", "limpio": "minimalista",
    "minimalista": "minimalista", "minimal": "minimalista",
    "luxury": "luxury", "sofisticado": "elegante",
    "refinado": "elegante", "fino": "elegante",
    "oscuro": "dark", "claro": "calido", "suave": "calido",
  };
  for (const word of words) {
    const tone = toneMap[word];
    if (tone) return tone;
  }
  return null;
}

// ─── Entity Resolvers (reuse from vocabulary) ────────────────────────────

function resolveColorFromText(text: string): { hex: string; name: string } | null {
  const hexMatch = text.match(/#[0-9a-fA-F]{6}/);
  if (hexMatch) return { hex: hexMatch[0], name: hexMatch[0] };

  const normalized = text.toLowerCase().trim();
  const sorted = Object.entries(COLOR_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [name, hex] of sorted) {
    if (normalized.includes(name)) return { hex, name };
  }
  return null;
}

function resolveCompoundPalette(text: string): CompoundPalette | null {
  const normalized = text.toLowerCase().trim();
  const sorted = Object.entries(COMPOUND_COLOR_PALETTES).sort((a, b) => b[0].length - a[0].length);
  for (const [phrase, palette] of sorted) {
    if (normalized.includes(phrase)) return palette;
  }
  return null;
}

function resolveSectionFromText(text: string): { key: string; label: string } | null {
  const normalized = text.toLowerCase().trim();
  const sorted = Object.entries(SECTION_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [name, key] of sorted) {
    if (normalized.includes(name)) {
      return { key, label: SECTION_LABELS[key] ?? key };
    }
  }
  return null;
}

function resolveFontFromText(text: string): { value: string; label: string } | null {
  const normalized = text.toLowerCase().trim();
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
  for (const font of FONT_OPTIONS) {
    if (normalized.includes(font.toLowerCase())) {
      return { value: font, label: FONT_LABELS[font] ?? font };
    }
  }
  return null;
}

function resolveButtonStyleFromText(text: string): string | null {
  const normalized = text.toLowerCase().trim();
  const sorted = Object.entries(BUTTON_STYLE_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [keyword, value] of sorted) {
    if (normalized.includes(keyword)) return value;
  }
  if (normalized.includes("mas visible") || normalized.includes("mas grande")) return "pill";
  return null;
}

function resolveThemeFromText(text: string): { id: string; label: string } | null {
  const normalized = text.toLowerCase().trim();
  const sorted = Object.entries(THEME_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [name, id] of sorted) {
    if (normalized.includes(name)) {
      return { id, label: THEME_LABELS[id] ?? id };
    }
  }
  return null;
}
