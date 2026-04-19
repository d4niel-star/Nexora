// ─── Runtime budget for URL catalog resolution ───────────────────────────
// Every extractor shares a single Budget. It enforces hard ceilings on:
// - wall-clock time (prevents the preview/import server action from
//   hanging the UI when a supplier is slow or infinite-redirects)
// - number of pages fetched (prevents crawlers from spidering the web)
// - total bytes (prevents pathological responses from eating RAM)
// - crawl depth (prevents link following from descending forever)
// - number of products emitted (preview must stay small and auditable).
//
// The resolver's promise to the operator is:
// "Either this returns in <= maxTotalMs with products, or it returns an
//  honest diagnosis — it never hangs and never invents data."

export interface Budget {
  startedAt: number;
  maxTotalMs: number;
  maxPages: number;
  maxProducts: number;
  maxDepth: number;
  maxBodyBytes: number;
  pagesFetched: number;
  bytesFetched: number;
}

export interface BudgetOverrides {
  maxTotalMs?: number;
  maxPages?: number;
  maxProducts?: number;
  maxDepth?: number;
  maxBodyBytes?: number;
}

// Defaults sized for the preview action (goal: answer in < 2 min).
const DEFAULTS = {
  maxTotalMs: 90_000,
  maxPages: 30,
  maxProducts: 60,
  maxDepth: 2,
  maxBodyBytes: 4_000_000,
};

export function createBudget(overrides: BudgetOverrides = {}): Budget {
  return {
    startedAt: Date.now(),
    maxTotalMs: overrides.maxTotalMs ?? DEFAULTS.maxTotalMs,
    maxPages: overrides.maxPages ?? DEFAULTS.maxPages,
    maxProducts: overrides.maxProducts ?? DEFAULTS.maxProducts,
    maxDepth: overrides.maxDepth ?? DEFAULTS.maxDepth,
    maxBodyBytes: overrides.maxBodyBytes ?? DEFAULTS.maxBodyBytes,
    pagesFetched: 0,
    bytesFetched: 0,
  };
}

export function budgetElapsed(b: Budget): number {
  return Date.now() - b.startedAt;
}

export function budgetRemainingMs(b: Budget): number {
  return Math.max(0, b.maxTotalMs - budgetElapsed(b));
}

export function budgetExhausted(b: Budget): boolean {
  return (
    budgetRemainingMs(b) <= 0 ||
    b.pagesFetched >= b.maxPages ||
    b.bytesFetched >= b.maxBodyBytes
  );
}

export function budgetCanFetch(b: Budget): boolean {
  return !budgetExhausted(b);
}
