// ─── Nexora AI Core — Message Classifier ────────────────────────────────
//
// CAPA 1 del AI Core unificado.
// Clasifica todo mensaje entrante en una de estas categorías:
//   social        → saludos, gracias, básicos sociales
//   noise         → irrelevante, fuera de dominio
//   domain_action → pedido real sobre la tienda
//   follow_up     → referencia a algo previo (refinamiento, rechazo)
//   undo          → deshacer, revertir
//   ask_status    → preguntar por estado de la tienda
//   ask_help      → preguntar qué puede hacer la IA
//   ambiguous     → no se puede determinar con confianza

export type MessageCategory =
  | "social"
  | "noise"
  | "domain_action"
  | "follow_up"
  | "undo"
  | "ask_status"
  | "ask_help"
  | "ambiguous";

export interface ClassificationResult {
  category: MessageCategory;
  confidence: number; // 0–1
  reasoning?: string;
}

// ─── Social patterns ────────────────────────────────────────────────────
const SOCIAL_PATTERNS: RegExp[] = [
  /^(?:hola|buenas|hey|hi|hello|buen dia|buenos dias|buenas tardes|buenas noches)[\s!.?]*$/i,
  /^(?:hola|buenas|hey|hi|hello)\s+(?:como\s+(?:te\s+)?va|que\s+(?:tal|haces|onda)|todo\s+bien|estas)/i,
  /^(?:como\s+(?:te\s+)?va|que\s+(?:tal|haces|onda)|todo\s+bien)[\s!.?]*$/i,
  /^(?:gracias|thanks|thank you|genial|perfecto|ok|oka|dale|buenisimo|excelente|re bien)[\s!.?]*$/i,
  /^(?:jajaja|jajaj|jaja|lol|lmao|asd|asdasd)[\s!.?]*$/i,
  /^(?:bien|todo bien|aca andamos|por aca|nada)\s*[!.?]*$/i,
];

// ─── Noise patterns (clearly out of domain) ────────────────────────────
const NOISE_KEYWORDS: string[] = [
  "pepsi", "coca cola", "pizza", "hamburguesa", "helado", "cerveza",
  "clima", "tiempo", "llueve", "futbol", "messi", "partido",
  "pelicula", "netflix", "serie", "spotify",
  "banana", "manzana", "pera", "naranja",
];

// ─── Domain action keywords (strong signal of real intent) ──────────────
const DOMAIN_KEYWORDS: string[] = [
  "color", "colores", "paleta", "fuente", "tipografia", "font",
  "boton", "button", "cta", "imagen", "foto", "portada", "banner",
  "seccion", "hero", "titulo", "titular", "headline",
  "tema", "theme", "plantilla", "template",
  "premium", "elegante", "minimalista", "moderno", "calido",
  "editorial", "oscuro", "luxury", "sobrio", "tecnico",
  "redondeado", "pill", "cuadrado", "redondo",
  "celu", "celular", "mobile", "desktop", "escritorio",
  "testimonios", "beneficios", "faq", "newsletter", "productos",
  "headline", "subtitulo", "bajada",
];

// ─── Domain action verb signals ─────────────────────────────────────────
const DOMAIN_VERBS: string[] = [
  "cambia", "cambiar", "pon", "poner", "poné", "saca", "mueve", "mové",
  "oculta", "mostra", "mostrar", "edita", "modifica", "reemplaza",
  "genera", "crea", "hace", "hacé", "hacelo", "mejora", "mejorá",
  "aplica", "aplicar", "usar", "usa", "probemos", "proba",
  "quiero", "busco", "necesito",
  "dejalo", "deja",
];

// ─── Undo keywords ─────────────────────────────────────────────────────
const UNDO_KEYWORDS: string[] = [
  "deshace", "deshacé", "deshacer", "reverti", "revertir", "cancela",
  "volve atras", "volvé atras", "volvamos atras", "atras",
  "anterior", "antes", "como estaba",
];

// ─── Ask-status keywords ───────────────────────────────────────────────
const ASK_STATUS_KEYWORDS: string[] = [
  "que me falta", "como esta", "como está", "que falta", "estado",
  "readiness", "que tengo", "que necesito", "faltan", "completo",
];

// ─── Ask-help keywords ─────────────────────────────────────────────────
const ASK_HELP_KEYWORDS: string[] = [
  "que podes hacer", "que puedo pedir", "que haces", "ayuda", "help",
  "como funciona", "lista de comandos", "menu", "opciones",
  "que puedo hacer", "que cosas podes",
];

// ─── Follow-up indicators (requires context) ───────────────────────────
const FOLLOW_UP_PHRASES: string[] = [
  "eso no", "el anterior", "esa imagen", "esa seccion", "ese color",
  "esa fuente", "esa tipografia", "la portada", "esa parte",
  "mas asi", "asi mismo", "mas de lo mismo",
  "dejalo como antes", "no me gusto", "no me gusta", "no me convence",
  "eso mismo", "aplicalo", "dale", "confirmo",
];

// ─── Main classifier ───────────────────────────────────────────────────

export function classifyMessage(raw: string, hasContext: boolean): ClassificationResult {
  const normalized = raw.toLowerCase().trim()
    .replace(/[áàä]/g, "a").replace(/[éèë]/g, "e").replace(/[íìï]/g, "i")
    .replace(/[óòö]/g, "o").replace(/[úùü]/g, "u")
    .replace(/[ñ]/g, "n");

  // Empty or very short
  if (normalized.length === 0) {
    return { category: "noise", confidence: 0.9, reasoning: "empty input" };
  }

  // ── Check social first (highest priority for exact matches) ────────
  for (const pattern of SOCIAL_PATTERNS) {
    if (pattern.test(normalized)) {
      return { category: "social", confidence: 0.95, reasoning: "social pattern match" };
    }
  }

  // ── Check noise (obvious out-of-domain) ────────────────────────────
  const noiseMatch = NOISE_KEYWORDS.find(kw => normalized === kw || normalized.includes(kw));
  if (noiseMatch && !hasDomainSignal(normalized)) {
    return { category: "noise", confidence: 0.85, reasoning: `noise keyword: ${noiseMatch}` };
  }

  // ── Check ask-help ─────────────────────────────────────────────────
  for (const kw of ASK_HELP_KEYWORDS) {
    if (normalized.includes(kw)) {
      return { category: "ask_help", confidence: 0.9, reasoning: `ask-help: ${kw}` };
    }
  }

  // ── Check ask-status ───────────────────────────────────────────────
  for (const kw of ASK_STATUS_KEYWORDS) {
    if (normalized.includes(kw)) {
      return { category: "ask_status", confidence: 0.85, reasoning: `ask-status: ${kw}` };
    }
  }

  // ── Check undo (strong signals) ────────────────────────────────────
  if (hasContext) {
    for (const kw of UNDO_KEYWORDS) {
      if (normalized.includes(kw)) {
        return { category: "undo", confidence: 0.85, reasoning: `undo: ${kw}` };
      }
    }
  }

  // ── Check follow-up (context-dependent) ────────────────────────────
  if (hasContext) {
    for (const phrase of FOLLOW_UP_PHRASES) {
      if (normalized.includes(phrase)) {
        return { category: "follow_up", confidence: 0.8, reasoning: `follow-up: ${phrase}` };
      }
    }
  }

  // ── Check domain action ────────────────────────────────────────────
  if (hasDomainSignal(normalized)) {
    return { category: "domain_action", confidence: 0.85, reasoning: "domain keyword/verb detected" };
  }

  // ── Ambiguous — short input with no clear signal ───────────────────
  if (normalized.split(/\s+/).length <= 3) {
    return { category: "ambiguous", confidence: 0.4, reasoning: "short input, no domain signal" };
  }

  // ── Longer input with no domain signal → likely noise ──────────────
  return { category: "noise", confidence: 0.5, reasoning: "no domain signal detected" };
}

// ─── Helper: does the input contain domain signals? ────────────────────

function hasDomainSignal(normalized: string): boolean {
  const words = normalized.split(/\s+/);

  // Check for domain keywords
  for (const kw of DOMAIN_KEYWORDS) {
    if (normalized.includes(kw)) return true;
  }

  // Check for domain verbs + any qualifier (e.g. "hacelo mas ...")
  const hasVerb = words.some(w => DOMAIN_VERBS.includes(w));
  const hasQualifier = words.some(w =>
    ["mas", "menos", "mejor", "otro", "otra", "nuevo", "nueva"].includes(w)
  );

  if (hasVerb && hasQualifier) return true;

  // "quiero mejorar" / "quiero cambiar" etc.
  if (normalized.includes("quiero mejorar") || normalized.includes("quiero cambiar") ||
      normalized.includes("quiero algo") || normalized.includes("quiero que")) {
    return true;
  }

  return false;
}