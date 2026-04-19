import type { SourcingImportPreview, SupplierProductInput } from "../import-parsers";

// ─── Catalog resolver contracts ───────────────────────────────────────────
// The resolver accepts an arbitrary URL (store root, category listing, feed,
// etc.), detects what kind of source it is, and tries a sequence of
// extractors to produce a normalized preview. It is deliberately
// "fail-honest": when nothing yields products we return a structured
// diagnosis rather than inventing data.

export type DetectedSource =
  | "feed-csv"
  | "feed-xml"
  | "feed-json"
  | "shopify"
  | "structured-data"
  | "sitemap"
  | "html-catalog"
  | "unknown";

export type ExtractorId =
  | "feed"
  | "shopify"
  | "structured-data"
  | "sitemap"
  | "html-catalog";

export interface DiagnosticStep {
  step: string;
  status: "ok" | "warn" | "error" | "info";
  message: string;
  detail?: Record<string, unknown>;
  elapsedMs: number;
}

export interface BudgetSnapshot {
  elapsedMs: number;
  pagesFetched: number;
  bytesFetched: number;
  maxTotalMs: number;
  maxPages: number;
  maxBodyBytes: number;
}

export interface CatalogResolution {
  sourceUrl: string;
  detectedSource: DetectedSource;
  extractorUsed: ExtractorId | null;
  preview: SourcingImportPreview;
  diagnostics: DiagnosticStep[];
  budget: BudgetSnapshot;
}

export interface ExtractorContext {
  sourceUrl: string;
  rootHtml?: string;
  rootFetch?: {
    url: string;
    status: number;
    contentType: string;
    body: string;
  };
}

export interface ExtractorOutcome {
  products: SupplierProductInput[];
  note?: string;
}
