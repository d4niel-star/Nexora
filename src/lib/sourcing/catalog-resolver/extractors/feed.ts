import { parseSupplierPayload, type SupplierProductInput } from "../../import-parsers";
import type { Budget } from "../budget";
import { budgetedFetch } from "../fetcher";
import type { ResolverLogger } from "../logger";

// ─── Feed extractor ──────────────────────────────────────────────────────
// Handles explicit CSV / XML / JSON feeds. Delegates to the existing
// parseSupplierPayload pipeline which already knows how to map many
// header aliases into SupplierProductInput.

export interface FeedExtractResult {
  products: SupplierProductInput[];
  format: "csv" | "json" | "xml";
  totalRows: number;
  validRows: number;
  errors: { row: number; field: string; message: string; value?: string }[];
}

export async function extractFromFeed(
  url: string,
  budget: Budget,
  logger: ResolverLogger,
  prefetched?: { body: string; contentType: string },
): Promise<FeedExtractResult | null> {
  let body: string;
  let contentType: string;

  if (prefetched) {
    body = prefetched.body;
    contentType = prefetched.contentType;
  } else {
    const resp = await budgetedFetch(url, budget, logger, { label: "feed.fetch" });
    if (!resp.ok || !resp.body) {
      logger.error("feed.fetch", `Feed unreachable: ${resp.error ?? resp.status}`);
      return null;
    }
    body = resp.body;
    contentType = resp.contentType;
  }

  const preview = parseSupplierPayload(body, { contentType, url });
  logger.ok("feed.parse", `Parsed ${preview.products.length} product(s) from ${preview.sourceFormat.toUpperCase()} feed`, {
    totalRows: preview.totalRows,
    validRows: preview.validRows,
    errors: preview.errors.length,
  });

  return {
    products: preview.products,
    format: preview.sourceFormat,
    totalRows: preview.totalRows,
    validRows: preview.validRows,
    errors: preview.errors,
  };
}
