// ─── Normalization helpers (shared by classifier + interpreter) ─────────
//
// We strip diacritics, collapse whitespace, fix common typos and squash
// repeated chars ("hooolaaa" → "hola"). This is intentionally conservative:
// we never invent words, only normalize the surface so downstream matchers
// work on stable input.

const TYPO_FIXES: Array<[RegExp, string]> = [
  [/\bporfa(vor)?\b/g, "por favor"],
  [/\bxfa\b/g, "por favor"],
  [/\bque\s+onda\b/g, "como va"],
  [/\bque\s+tal\b/g, "como va"],
  [/\bk\b/g, "que"],
  [/\bxq\b/g, "porque"],
  [/\bpq\b/g, "porque"],
  [/\btmb\b/g, "tambien"],
  [/\btb\b/g, "tambien"],
  [/\bbno\b/g, "bueno"],
  [/\bbn\b/g, "bien"],
  [/\bdsp\b/g, "despues"],
  [/\bahre\b/g, ""],
  [/\bd\b/g, "de"],
];

export function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function collapseRepeats(s: string): string {
  // hooolaaaa → hola, jajaja → jaja (kept as cue), siiiiii → si
  return s.replace(/([a-z])\1{2,}/g, "$1$1");
}

export function normalize(input: string): string {
  let s = input.trim().toLowerCase();
  s = stripDiacritics(s);
  s = s.replace(/[¡!¿?.,;:"'`´]+/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  s = collapseRepeats(s);
  for (const [re, rep] of TYPO_FIXES) s = s.replace(re, rep);
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

export function tokens(input: string): string[] {
  return normalize(input).split(" ").filter(Boolean);
}

/** Cheap include-any check on normalized input. */
export function hasAny(input: string, needles: string[]): boolean {
  const n = normalize(input);
  return needles.some((w) => n.includes(w));
}

/** Word-boundary-ish match (avoids "hola" matching "holanda"). */
export function hasWord(input: string, word: string): boolean {
  const n = normalize(input);
  const re = new RegExp(`(^|\\s)${word}(\\s|$)`);
  return re.test(n);
}

export function hasAnyWord(input: string, words: string[]): boolean {
  return words.some((w) => hasWord(input, w));
}
