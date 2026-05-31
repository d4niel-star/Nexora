import type { SearchEntityType } from "./types";

// ─── Search Ranking (Phase 7D.1) ─────────────────────────────────────
// Pure deterministic scoring. No vectors, no AI. The score is a
// weighted sum of: prefix-match boost + exact-match boost + recency
// decay + entity-type weight. Higher = more relevant.

const TYPE_WEIGHTS: Record<SearchEntityType, number> = {
  order: 1.0,       // most-searched
  customer: 0.95,
  product: 0.9,
  variant: 0.7,
  inventory: 0.65,
  staff: 0.6,
  job: 0.5,
  event: 0.4,
};

/**
 * Score a candidate hit. All inputs are normalized (lowercased) by the
 * caller — this function is pure math.
 */
export function score(input: {
  type: SearchEntityType;
  primary: string;
  secondaries?: string[];
  query: string;
  recencyMs?: number; // age in ms; 0 = right now
}): number {
  const q = input.query.toLowerCase();
  const primary = input.primary.toLowerCase();
  const allFields = [primary, ...(input.secondaries ?? []).map((s) => s.toLowerCase())];

  let textScore = 0;
  for (const field of allFields) {
    if (!field) continue;
    if (field === q) textScore = Math.max(textScore, 100); // exact
    else if (field.startsWith(q)) textScore = Math.max(textScore, 70); // prefix
    else if (field.includes(q)) textScore = Math.max(textScore, 40); // substring
    else {
      // Fuzzy: count contiguous-character runs of the query in the field
      const fuzzy = fuzzyOverlap(field, q);
      if (fuzzy > 0) textScore = Math.max(textScore, fuzzy);
    }
  }

  // Recency decay: hits that touched recently rank higher. Half-life
  // 30d. We cap the bonus at 20 so a stale hit can still win on text.
  const recency = input.recencyMs !== undefined
    ? 20 * Math.exp(-(input.recencyMs) / (30 * 24 * 60 * 60 * 1000))
    : 0;

  const typeWeight = TYPE_WEIGHTS[input.type] ?? 0.5;
  return (textScore + recency) * typeWeight;
}

/**
 * Lightweight fuzzy match: walks the query and the field side-by-side,
 * scoring contiguous matches. Returns 0–35.
 */
function fuzzyOverlap(field: string, query: string): number {
  if (query.length === 0) return 0;
  let qi = 0;
  let lastMatchIdx = -2;
  let runs = 0;
  for (let i = 0; i < field.length && qi < query.length; i++) {
    if (field[i] === query[qi]) {
      if (i === lastMatchIdx + 1) runs += 1;
      else runs = Math.max(runs, 1);
      lastMatchIdx = i;
      qi += 1;
    }
  }
  if (qi < query.length) return 0; // not all query chars matched
  // Score scales with run length (contiguous char streak)
  return Math.min(35, 10 + runs * 5);
}

export { TYPE_WEIGHTS };
