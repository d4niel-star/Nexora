import { budgetRemainingMs, type Budget } from "./budget";
import type { ResolverLogger } from "./logger";

// ─── Budgeted fetcher ────────────────────────────────────────────────────
// Wraps `fetch` with:
// - hard per-request timeout bounded by the global budget
// - page + byte counters that feed back into the budget
// - streaming body truncation at maxBodyBytes (never load >N MB)
// - a stable non-misleading User-Agent so operators can audit server logs.
//
// We deliberately do NOT: bypass robots.txt, execute JS, rotate headers to
// impersonate browsers, or negotiate anti-bot challenges. If a site needs
// a real browser, we report that honestly via the resolver diagnostics.

const USER_AGENT = "NexoraSourcingBot/1.0 (+contact admin of store)";
const DEFAULT_TIMEOUT_MS = 15_000;

export interface FetchResult {
  ok: boolean;
  status: number;
  url: string;
  contentType: string;
  body: string;
  bytes: number;
  truncated: boolean;
  error?: string;
}

export async function budgetedFetch(
  url: string,
  budget: Budget,
  logger: ResolverLogger,
  opts: { headers?: Record<string, string>; timeoutMs?: number; label?: string } = {},
): Promise<FetchResult> {
  const label = opts.label ?? "fetch";

  if (budget.pagesFetched >= budget.maxPages) {
    logger.warn(label, "Page budget exhausted", { url });
    return emptyResult(url, "page_budget_exhausted");
  }
  const remainingMs = budgetRemainingMs(budget);
  const timeoutMs = Math.max(1_000, Math.min(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS, remainingMs));
  if (remainingMs <= 500) {
    logger.warn(label, "Time budget exhausted", { url });
    return emptyResult(url, "time_budget_exhausted");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const t0 = Date.now();
  budget.pagesFetched += 1;

  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.9,text/csv;q=0.9,*/*;q=0.5",
        "Accept-Language": "es-AR,es;q=0.9,en;q=0.7",
        ...opts.headers,
      },
    });

    const contentType = resp.headers.get("content-type") ?? "";
    const { body, bytes, truncated } = await readBoundedBody(resp, budget, controller);

    logger.info(label, `HTTP ${resp.status} ${resp.url || url}`, {
      contentType,
      bytes,
      truncated,
      ms: Date.now() - t0,
    });

    return {
      ok: resp.ok,
      status: resp.status,
      url: resp.url || url,
      contentType,
      body,
      bytes,
      truncated,
    };
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    const msg = isAbort ? "timeout" : error instanceof Error ? error.message : "unknown";
    logger.warn(label, `Fetch failed: ${msg}`, { url, ms: Date.now() - t0 });
    return emptyResult(url, msg);
  } finally {
    clearTimeout(timer);
  }
}

async function readBoundedBody(
  resp: Response,
  budget: Budget,
  controller: AbortController,
): Promise<{ body: string; bytes: number; truncated: boolean }> {
  const reader = resp.body?.getReader();
  if (!reader) {
    const text = await resp.text();
    const byteLen = Buffer.byteLength(text, "utf8");
    budget.bytesFetched += byteLen;
    return { body: text, bytes: byteLen, truncated: false };
  }

  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let truncated = false;

  for (;;) {
    const remainingBytes = budget.maxBodyBytes - budget.bytesFetched;
    if (remainingBytes <= 0) {
      truncated = true;
      try { controller.abort(); } catch { /* ignore */ }
      break;
    }

    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    if (value.length > remainingBytes) {
      const slice = value.slice(0, remainingBytes);
      chunks.push(slice);
      bytes += slice.length;
      budget.bytesFetched += slice.length;
      truncated = true;
      try { controller.abort(); } catch { /* ignore */ }
      break;
    }

    chunks.push(value);
    bytes += value.length;
    budget.bytesFetched += value.length;
  }

  const merged = concatChunks(chunks);
  const body = new TextDecoder("utf-8", { fatal: false }).decode(merged);
  return { body, bytes, truncated };
}

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function emptyResult(url: string, error: string): FetchResult {
  return {
    ok: false,
    status: 0,
    url,
    contentType: "",
    body: "",
    bytes: 0,
    truncated: false,
    error,
  };
}
