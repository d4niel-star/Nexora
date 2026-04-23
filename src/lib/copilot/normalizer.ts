// ─── Copilot Normalizer v2 ────────────────────────────────────────────────
// Text normalization, accent stripping, typo correction, and smart compound splitting.
//
// CRITICAL: All downstream intent matching depends on this producing
// clean, accent-free, lowercase text. The SIGNALS in engine.ts are all
// written without accents ("mas premium", "sofisticado", etc.).

// ─── Accent stripping ────────────────────────────────────────────────────

const ACCENT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/[áàäâ]/g, "a"],
  [/[éèëê]/g, "e"],
  [/[íìïî]/g, "i"],
  [/[óòöô]/g, "o"],
  [/[úùüû]/g, "u"],
  [/[ñ]/g, "n"],  // Normalize ñ → n for simpler matching
];

function stripAccents(text: string): string {
  let result = text;
  for (const [regex, replacement] of ACCENT_REPLACEMENTS) {
    result = result.replace(regex, replacement);
  }
  return result;
}

// ─── Typo / variant correction ────────────────────────────────────────────
//
// Maps common misspellings, subjunctive forms, and regional variants
// to the canonical forms that SIGNALS in engine.ts expect.

const TYPO_MAP: Array<[RegExp, string]> = [
  // Common misspellings
  [/\bponel\b/g, "poner"],
  [/\btibografia\b/g, "tipografia"],
  [/\bcamiba\b/g, "cambiar"],
  [/\bcamviar\b/g, "cambiar"],
  [/\bocular\b/g, "ocultar"],
  [/\bmibimalista\b/g, "minimalista"],
  [/\bmimimalista\b/g, "minimalista"],
  [/\btestimonioa\b/g, "testimonios"],
  [/\bbenebicios\b/g, "beneficios"],
  [/\btipoografia\b/g, "tipografia"],
  [/\btipogravia\b/g, "tipografia"],
  [/\bminialista\b/g, "minimalista"],
  [/\bminiimalista\b/g, "minimalista"],
  [/\bprienda\b/g, "prenda"],
  [/\btestimoniso\b/g, "testimonios"],
  [/\bbeneficois\b/g, "beneficios"],
  [/\bcateogoria\b/g, "categoria"],
  [/\bcategorias\b/g, "categorias"],
  [/\bcolores\b/g, "colores"],

  // Subjunctive → imperative (rioplatense speakers mix these)
  [/\bcambie\b/g, "cambia"],
  [/\bponga\b/g, "pon"],
  [/\bmueva\b/g, "mueve"],
  [/\boculte\b/g, "oculta"],
  [/\bmuestre\b/g, "muestra"],
  [/\bedite\b/g, "edita"],
  [/\breescriba\b/g, "reescribi"],
  [/\baplique\b/g, "aplica"],
  [/\bmodifique\b/g, "modifica"],
  [/\bactive\b/g, "activa"],
  [/\bhabilite\b/g, "habilita"],
  [/\bagregue\b/g, "agrega"],
  [/\bquite\b/g, "quita"],
  [/\bsaque\b/g, "saca"],
  [/\besconda\b/g, "esconde"],
  [/\bborre\b/g, "borra"],
  [/\belimine\b/g, "elimina"],
  [/\bremueva\b/g, "remueve"],
  [/\bactualice\b/g, "actualiza"],
  [/\buso\b/g, "usa"],
  [/\bpones\b/g, "pon"],
  [/\bhaces\b/g, "hace"],
  [/\bhaga\b/g, "hace"],
  [/\bponeme\b/g, "pon"],
  [/\bhaceme\b/g, "hace"],

  // Formal/usted forms → informal
  [/\bcoloque\b/g, "pon"],
  [/\bmodifiquemos\b/g, "modifica"],
  [/\bcambiemos\b/g, "cambia"],

  // Informal "pone" → imperative
  [/\bpone\b/g, "pon"],

  // "hará" → imperative
  [/\bhara\b/g, "hace"],
];

// ─── Phrase-level normalizations ───────────────────────────────────────────
// These convert common natural phrases into forms the engine can parse.

const PHRASE_NORMALIZATIONS: Array<[RegExp, string]> = [
  // "quiero que tenga X color" → "pon color X"
  [/quiero\s+que\s+(?:tenga|sea|lleve|use)\s+(?:un\s+)?(?:color\s+)?/g, "pon "],
  // "me gustaría X" → "X"
  [/me\s+gustaria\s+/g, ""],
  // "estaria bueno X" → "X"
  [/estaria\s+bueno\s+(?:que\s+)?/g, ""],
  // "podrias X" → "X"
  [/podrias\s+/g, ""],
  // "podes X" → "X"
  [/\bpodes\b/g, "podes"],
  // "necesito que X" → "X"
  [/necesito\s+que\s+/g, ""],
  // "te pido que X" → "X"
  [/te\s+pido\s+que\s+/g, ""],
  // "lo que quiero es X" → "X"
  [/lo\s+que\s+quiero\s+(?:es\s+)?/g, ""],
  // "estoy buscando X" → "busco X"
  [/estoy\s+buscando\s+/g, "busco "],
  // "se puede X?" → "X"
  [/se\s+puede\s+/g, ""],
  // "hay forma de X" → "X"
  [/hay\s+forma\s+de\s+/g, ""],
  // "como hago para X" → "X"
  [/como\s+hago\s+para\s+/g, ""],
  // "quisiera X" → "quiero X"
  [/quisiera\s+/g, "quiero "],
  // "darle X" → "hace X" (e.g. "darle un look mas premium")
  [/darle\s+/g, "hace "],
  // "hacer que X sea" → "hace X"
  [/hacer\s+que\s+(?:la\s+|el\s+|los?\s+)?(?:.*)\s+sea\s+/g, "hace "],
  // "cambiame X" → "cambia X"
  [/\bcambiame\b/g, "cambia"],
  // "poneme X" → "pon X"
  [/\bponeme\b/g, "pon"],
  // "sacame X" → "saca X"
  [/\bsacame\b/g, "saca"],
];

// ─── Main normalize function ──────────────────────────────────────────────

export function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function fixTypos(normalized: string): string {
  let result = normalized;

  // Strip accents FIRST so all subsequent matching is accent-free
  result = stripAccents(result);

  // Apply phrase-level normalizations
  for (const [regex, replacement] of PHRASE_NORMALIZATIONS) {
    result = result.replace(regex, replacement);
  }

  // Apply typo corrections
  for (const [regex, replacement] of TYPO_MAP) {
    result = result.replace(regex, replacement);
  }

  // Clean up extra whitespace
  result = result.replace(/\s+/g, " ").trim();

  return result;
}

// ─── Smart compound splitting ─────────────────────────────────────────────
//
// Splits compound inputs like:
//   "poné tonos beige, cambiá la fuente y ocultá testimonios"
// into:
//   ["poné tonos beige", "cambiá la fuente", "ocultá testimonios"]
//
// But preserves phrases that use "y" as a connector within a single intent:
//   "algo más sobrio y elegante" → kept together (visual tone)
//   "colores negro y beige" → kept together (visual tone "negro y beige")
//   "poné azul y dorado" → split (two separate color changes)

const COMPOUND_SPLITTERS = /\s*,\s*|\s*;\s*/;

// Phrases where "y" should NOT cause a split (single-intent connectors)
const Y_PRESERVE_PATTERNS = [
  /y\s+(?:beige|negro|blanco|dorado|gris|rojo|azul|verde|rosa|marron|oliva|terracota|arena|celeste|turquesa|naranja|amarillo|violeta)/,  // color combos
  /(?:sobrio|premium|elegante|editorial|minimalista|tecnico|moderno|comercial|calido|oscuro|luxury|luxe|limpio|suave|rustico)\s+y\s+(?:sobrio|premium|elegante|editorial|minimalista|tecnico|moderno|comercial|calido|oscuro|luxury|limpio|suave|rustico)/,  // tone combos only
  /(?:mas\s+)?(?:limpio|elegante|claro|oscuro|calido|suave|premium)\s*,\s*(?:mas\s+)?(?:limpio|elegante|claro|oscuro|calido|suave|premium)/,  // comma-separated modifier combos
];

export function splitCompoundInput(text: string): string[] {
  // First split on commas and semicolons
  const commaParts = text.split(COMPOUND_SPLITTERS);
  const finalParts: string[] = [];

  for (const part of commaParts) {
    const trimmed = part.trim();
    if (trimmed.length < 3) continue;

    // Check if "y" should be preserved
    const shouldPreserveY = Y_PRESERVE_PATTERNS.some(p => p.test(trimmed));

    if (shouldPreserveY) {
      finalParts.push(trimmed);
    } else {
      // Split on "y" but only when it's a conjunction between complete phrases
      const yParts = smartSplitOnY(trimmed);
      finalParts.push(...yParts);
    }
  }

  return finalParts.length > 0 ? finalParts : [text];
}

function smartSplitOnY(text: string): string[] {
  // Split on " y " but check each part has enough content to be an intent
  const parts = text.split(/\s+y\s+/);
  const result: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length < 3) continue;

    // If a part is just an adjective/modifier without a verb or domain noun,
    // it might belong to the previous part
    if (result.length > 0 && !hasVerb(trimmed) && !hasDomainNoun(trimmed)) {
      // Merge with previous
      result[result.length - 1] = result[result.length - 1] + " y " + trimmed;
    } else {
      result.push(trimmed);
    }
  }

  return result.length > 0 ? result : [text];
}

const COMMON_VERBS = [
  "pon", "cambia", "pon", "oculta", "esconde", "saca", "muestra", "activa",
  "habilita", "agrega", "mueve", "subi", "baja", "edita", "reescribi",
  "modifica", "aplica", "usa", "deja", "hace", "quiero", "busco",
  "probemos", "proba", "veamos", "mostrame", "reemplaza", "actualiza",
  "genera", "crea", "desactiva", "quita", "elimina", "borra", "remueve",
  "reverti", "deshace", "cancela", "volvamos", "volve", "devolve",
  "poneme", "haceme", "cambiar", "poner", "ocultar", "mostrar", "mover",
];

function hasVerb(text: string): boolean {
  const lower = text.toLowerCase();
  return COMMON_VERBS.some(v => lower.includes(v));
}

// Domain nouns indicate a separate intent even without a verb
const DOMAIN_NOUNS = [
  "boton", "button", "botones", "cta",
  "fuente", "tipografia", "font", "letra",
  "imagen", "foto", "portada", "banner",
  "color", "colores", "paleta", "tonos",
  "seccion", "testimonios", "beneficios", "faq", "newsletter",
  "titulo", "titular", "headline", "subtitulo",
  "tema", "theme", "template", "plantilla",
  "celu", "celular", "mobile", "desktop",
];

function hasDomainNoun(text: string): boolean {
  const lower = text.toLowerCase();
  return DOMAIN_NOUNS.some(n => lower.includes(n));
}
