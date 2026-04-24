// ─── Concept-space interpreter ──────────────────────────────────────────
//
// Given a normalized message and a catalog of intents (each with a list of
// "concept words" and optional "anti-words"), pick the best match. This is
// the same idea as the previous v3 interpreter but generalized so any
// assistant can plug its own intents without modifying the core.

import { normalize, tokens } from "./normalize";

export interface ConceptIntent<TId extends string = string> {
  id: TId;
  /** Words that strongly signal this intent (any match contributes). */
  words: string[];
  /** Multi-word phrases that score higher when matched verbatim. */
  phrases?: string[];
  /** Words that DISQUALIFY this intent if present. */
  antiWords?: string[];
  /** Optional weight multiplier. */
  weight?: number;
  /** Optional: only matchable if at least one of these is present. */
  requireAny?: string[];
}

export interface InterpretResult<TId extends string = string> {
  id: TId | null;
  score: number;
  matched: string[];
}

/**
 * Score a single intent against the input. Returns 0 if disqualified.
 */
function scoreIntent<TId extends string>(
  intent: ConceptIntent<TId>,
  norm: string,
  toks: string[],
): { score: number; matched: string[] } {
  if (intent.antiWords?.some((w) => norm.includes(w))) {
    return { score: 0, matched: [] };
  }
  if (intent.requireAny && !intent.requireAny.some((w) => norm.includes(w))) {
    return { score: 0, matched: [] };
  }

  const tokSet = new Set(toks);
  const matched: string[] = [];
  let score = 0;

  for (const w of intent.words) {
    if (w.includes(" ")) {
      if (norm.includes(w)) {
        score += 1.6;
        matched.push(w);
      }
    } else if (tokSet.has(w)) {
      score += 1;
      matched.push(w);
    } else if (norm.includes(w)) {
      score += 0.6;
      matched.push(w);
    }
  }

  for (const p of intent.phrases ?? []) {
    if (norm.includes(p)) {
      score += 2.4;
      matched.push(p);
    }
  }

  return { score: score * (intent.weight ?? 1), matched };
}

export function interpret<TId extends string>(
  raw: string,
  intents: ConceptIntent<TId>[],
): InterpretResult<TId> {
  const norm = normalize(raw);
  const toks = tokens(raw);
  let best: InterpretResult<TId> = { id: null, score: 0, matched: [] };

  for (const intent of intents) {
    const { score, matched } = scoreIntent(intent, norm, toks);
    if (score > best.score) {
      best = { id: intent.id, score, matched };
    }
  }

  return best;
}

/**
 * Threshold helper: returns the intent id only if the score crosses the
 * confidence floor. Otherwise null (caller should treat as ambiguous).
 */
export function interpretWithFloor<TId extends string>(
  raw: string,
  intents: ConceptIntent<TId>[],
  floor = 1.2,
): InterpretResult<TId> {
  const r = interpret(raw, intents);
  if (r.score < floor) return { id: null, score: r.score, matched: r.matched };
  return r;
}
