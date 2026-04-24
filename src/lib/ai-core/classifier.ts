// ─── Shared message classifier ──────────────────────────────────────────
//
// Decides what FAMILY of conversation move the user just made. It does NOT
// decide which intent to run — that is the assistant's job. We keep the
// classifier surface-agnostic so the same logic powers the global chat and
// the editor chat.

import type { Classification, MessageCategory } from "./types";
import { hasAny, hasAnyWord, normalize } from "./normalize";

const SOCIAL_GREETINGS = [
  "hola", "holi", "ey", "hey", "buenas", "buen dia", "buenos dias",
  "buenas tardes", "buenas noches", "que tal", "como va", "como andas",
  "todo bien", "saludos",
];
const SOCIAL_THANKS = ["gracias", "ok gracias", "muchas gracias", "genial", "buenisimo"];
const SOCIAL_BYE = ["chau", "adios", "nos vemos", "hasta luego"];
const LAUGH_TOKENS = ["jaja", "jeje", "lol", "xd"];

const HELP_CUES = [
  "ayuda", "ayudame", "que podes hacer", "que sabes hacer", "como funciona",
  "para que sirve", "que hace", "menu", "opciones", "como uso",
];

const STATUS_CUES = [
  "como va", "como vamos", "estado", "como esta la tienda",
  "que falta", "que tengo que hacer", "que me falta", "cuanto vendi",
  "como estoy", "resumen", "panorama", "donde estoy",
];

const FOLLOWUP_CUES = [
  "no eso no", "el anterior", "lo anterior", "como antes", "deshacer",
  "anda atras", "volver", "no ese", "ese no", "el otro", "mas asi",
  "asi no", "mejor el otro", "el primero", "el ultimo",
];

const NOISE_TINY = new Set(["a", "o", "u", "e", "...", ".", "?", "!"]);

export function classifyMessage(raw: string): Classification {
  const n = normalize(raw);
  if (!n) return { category: "noise", confidence: 1, hint: "empty" };
  if (NOISE_TINY.has(n)) return { category: "noise", confidence: 0.9 };

  // Pure laughter / emoji
  if (LAUGH_TOKENS.some((t) => n.includes(t)) && n.split(" ").length <= 3) {
    return { category: "social", confidence: 0.95, hint: "laughter" };
  }

  if (hasAny(n, SOCIAL_GREETINGS) && n.split(" ").length <= 6) {
    return { category: "social", confidence: 0.9, hint: "greeting" };
  }
  if (hasAny(n, SOCIAL_THANKS)) {
    return { category: "social", confidence: 0.9, hint: "thanks" };
  }
  if (hasAny(n, SOCIAL_BYE)) {
    return { category: "social", confidence: 0.9, hint: "bye" };
  }

  if (hasAny(n, FOLLOWUP_CUES)) {
    return { category: "follow_up", confidence: 0.85 };
  }

  if (hasAnyWord(n, HELP_CUES) || hasAny(n, ["que podes hacer", "que sabes hacer"])) {
    return { category: "ask_help", confidence: 0.8 };
  }

  if (hasAny(n, STATUS_CUES)) {
    return { category: "ask_status", confidence: 0.75 };
  }

  // "todo bien?" / "como estas?" → smalltalk
  if (n.split(" ").length <= 4 && (n.includes("bien") || n.includes("como estas"))) {
    return { category: "smalltalk", confidence: 0.7 };
  }

  // Default: assume the user means a domain action; the assistant's
  // interpreter will downgrade to "ambiguous" if it can't match anything.
  return { category: "domain_action" as MessageCategory, confidence: 0.5 };
}
