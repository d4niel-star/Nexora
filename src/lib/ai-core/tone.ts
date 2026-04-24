// ─── Tone detector ──────────────────────────────────────────────────────
//
// Reads cues from the raw user message (not the normalized one — we need
// punctuation, casing, length and emoji density) and produces a ToneProfile.
// The composer uses this profile to phrase replies in a register that
// matches the user's style: short ↔ short, casual ↔ casual, etc.

import type { Brevity, Energy, Mood, Register, ToneProfile } from "./types";
import { normalize, hasAnyWord } from "./normalize";

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const LAUGH_RE = /\b(j[aeiou]){2,}\b|\b(ha){2,}\b|\blo+l\b/i;

const FORMAL_CUES = ["por favor", "podria", "podrian", "estimado", "buenas tardes", "buenos dias"];
const CASUAL_CUES = ["dale", "che", "amigo", "loco", "ahre", "posta", "buenisimo", "copado", "groso", "joya", "bien ahi"];
const FRUSTRATED_CUES = ["no anda", "no funciona", "no sirve", "no entiende", "harto", "horrible", "feo", "mal", "pesimo", "rompiste", "mierda", "carajo"];
const DECISIVE_CUES = ["hacelo", "ya", "ahora", "rapido", "ejecuta", "aplicalo", "vamos", "directamente"];
const PLAYFUL_CUES = ["jaja", "jeje", "lol", "xd"];

export function detectTone(raw: string): ToneProfile {
  const text = raw.trim();
  const norm = normalize(text);
  const wordCount = norm.split(/\s+/).filter(Boolean).length;
  const exclamations = (text.match(/!/g) || []).length;
  const upperRatio = upperRatioOf(text);
  const hasEmoji = EMOJI_RE.test(text);
  const isLaughing = LAUGH_RE.test(text);

  // Brevity
  let brevity: Brevity = "medium";
  if (wordCount <= 4) brevity = "short";
  else if (wordCount >= 22) brevity = "long";

  // Register
  let register: Register = "neutral";
  if (hasAnyWord(norm, FORMAL_CUES)) register = "formal";
  else if (hasAnyWord(norm, CASUAL_CUES) || isLaughing || hasEmoji) register = "casual";
  else if (brevity === "short" && wordCount <= 2) register = "casual";

  // Energy
  let energy: Energy = "neutral";
  if (exclamations >= 2 || upperRatio > 0.4) energy = "excited";
  else if (brevity === "short" && exclamations === 0 && !isLaughing) energy = "calm";

  // Mood
  let mood: Mood = "neutral";
  if (hasAnyWord(norm, FRUSTRATED_CUES)) mood = "frustrated";
  else if (isLaughing || hasEmoji) mood = "playful";
  else if (hasAnyWord(norm, DECISIVE_CUES)) mood = "decisive";

  return {
    register,
    brevity,
    energy,
    mood,
    isPlayful: isLaughing || hasAnyWord(norm, PLAYFUL_CUES) || hasEmoji,
    isSocial: false, // filled by classifier
  };
}

function upperRatioOf(text: string): number {
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 4) return 0;
  const upper = letters.replace(/[^A-Z]/g, "").length;
  return upper / letters.length;
}
