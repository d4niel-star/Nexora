// ─── Adaptive composer ──────────────────────────────────────────────────
//
// Same Reply structure → many surface phrasings depending on the user's
// detected tone. We never go full chatbot: replies stay product-focused
// and short by default. We just modulate register, brevity and warmth.

import type { Reply, ReplyKind, ToneProfile } from "./types";

interface ComposeInput {
  kind: ReplyKind;
  tone: ToneProfile;
  /** Default phrasing fallback (used as-is when no variants apply). */
  text: string;
  bullets?: string[];
  nextSteps?: string[];
  action?: Reply["action"];
}

export function compose(input: ComposeInput): Reply {
  const { kind, tone } = input;
  let text = input.text;

  // Brevity: trim helper phrases for short-mode users
  if (tone.brevity === "short") {
    text = text
      .replace(/^Listo[, ]+/i, "Listo. ")
      .replace(/\bya está\b\.?/i, "Listo")
      .trim();
    if (input.bullets && input.bullets.length > 3) {
      input = { ...input, bullets: input.bullets.slice(0, 3) };
    }
  }

  // Casual register: lowercase opener, drop "Perfecto."
  if (tone.register === "casual" && tone.mood !== "frustrated") {
    text = text
      .replace(/^Perfecto[, ]+/i, "")
      .replace(/^Excelente[, ]+/i, "")
      .replace(/^Listo[. ]+/i, "Listo. ");
  }

  // Frustrated mood: drop exuberance, lead with empathy
  if (tone.mood === "frustrated") {
    if (kind === "err") text = `Te entiendo. ${stripExclaim(text)}`;
    else if (kind === "ok") text = stripExclaim(text);
  }

  // Playful mood: a small wink, only on social/info replies
  if (tone.isPlayful && (kind === "smalltalk" || kind === "info")) {
    if (!/[😊🙌✨😉]/.test(text)) text = text.replace(/\.$/, ""); // no double-warmth
  }

  return {
    kind,
    text,
    bullets: input.bullets,
    nextSteps: input.nextSteps,
    action: input.action,
  };
}

function stripExclaim(s: string): string {
  return s.replace(/!+/g, ".").replace(/\.\s*\./g, ".");
}

// ─── Tone-aware social opener generators ────────────────────────────────

const GREETING_VARIANTS: Record<ToneProfile["register"], string[]> = {
  casual: ["Hola, ¿qué onda?", "Holi. ¿En qué te ayudo?", "Ey, dale. ¿Qué necesitás?"],
  neutral: ["Hola. ¿En qué te ayudo?", "Hola, ¿qué necesitás?"],
  formal: ["Hola, ¿en qué puedo ayudarte?", "Buenas. ¿Qué necesitás?"],
};

const THANKS_VARIANTS: Record<ToneProfile["register"], string[]> = {
  casual: ["Dale, cuando quieras.", "De una.", "Cuando quieras."],
  neutral: ["Cuando quieras.", "Para eso estoy."],
  formal: ["Por nada. Quedo atento.", "A las órdenes."],
};

const BYE_VARIANTS: Record<ToneProfile["register"], string[]> = {
  casual: ["Chau, suerte.", "Nos vemos."],
  neutral: ["Hasta luego.", "Nos vemos."],
  formal: ["Hasta pronto.", "Que tengas un buen día."],
};

const LAUGH_REPLY: string[] = ["jaja", "je", "okey 🙂", "bien ahí"];

export function pickSocialReply(
  hint: string | undefined,
  tone: ToneProfile,
): string {
  const r = tone.register;
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
  if (hint === "thanks") return pick(THANKS_VARIANTS[r]);
  if (hint === "bye") return pick(BYE_VARIANTS[r]);
  if (hint === "laughter") return pick(LAUGH_REPLY);
  return pick(GREETING_VARIANTS[r]);
}
