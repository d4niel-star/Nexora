import type { SourcingImportPreview, SupplierProductInput } from "../import-parsers";
import {
  budgetElapsed,
  createBudget,
  type Budget,
  type BudgetOverrides,
} from "./budget";
import { budgetedFetch } from "./fetcher";
import { ResolverLogger } from "./logger";
import { detectSourceType } from "./detect";
import { extractFromFeed } from "./extractors/feed";
import { detectShopify, extractFromShopify } from "./extractors/shopify";
import { extractStructuredDataFromHtml } from "./extractors/structured-data";
import { extractFromSitemap } from "./extractors/sitemap";
import { extractFromHtmlCatalog } from "./extractors/html-catalog";
import { dedupeByExternalId } from "./normalize";
import type {
  BudgetSnapshot,
  CatalogResolution,
  DetectedSource,
  ExtractorId,
} from "./types";

// ─── Orchestrator ────────────────────────────────────────────────────────
// Pipeline:
// 1. Reject non-http(s) URLs.
// 2. Detect format from URL extension when obvious and run that extractor.
// 3. Otherwise fetch the URL once, then:
//    a. if response is a feed → feed extractor
//    b. if response is HTML → try (in order) structured-data, shopify,
//       sitemap, html-catalog; first extractor that produces > 0 products
//       wins.
// 4. Every attempt is logged. If none yields products, we return an
//    empty preview plus full diagnostics — never invented data.

export interface ResolveInput {
  url: string;
  budget?: BudgetOverrides;
}

export async function resolveCatalogFromUrl(input: ResolveInput): Promise<CatalogResolution> {
  const rawUrl = (input.url ?? "").trim();
  const budget = createBudget(input.budget);
  const logger = new ResolverLogger(budget.startedAt);

  if (!/^https?:\/\//i.test(rawUrl)) {
    logger.error("validate", "URL must be http(s)");
    return buildResolution(rawUrl, "unknown", null, [], [
      { row: 1, field: "url", message: "La URL debe comenzar con http:// o https://." },
    ], budget, logger);
  }

  let url: string;
  try {
    url = new URL(rawUrl).toString();
  } catch {
    logger.error("validate", "URL is not parseable");
    return buildResolution(rawUrl, "unknown", null, [], [
      { row: 1, field: "url", message: "La URL no es válida." },
    ], budget, logger);
  }

  logger.info("resolve", `Starting catalog resolution for ${url}`);

  // Fast path: URL extension clearly indicates a feed / sitemap.
  const pathOnly = url.toLowerCase().split("?")[0];
  if (pathOnly.endsWith(".csv") || pathOnly.endsWith(".json") || pathOnly.endsWith(".xml")) {
    const detectedSource: DetectedSource = pathOnly.endsWith(".csv")
      ? "feed-csv"
      : pathOnly.endsWith(".json")
        ? "feed-json"
        : pathOnly.endsWith("sitemap.xml") || pathOnly.endsWith("sitemap_index.xml")
          ? "sitemap"
          : "feed-xml";
    logger.info("detect", `Extension hint → ${detectedSource}`);

    if (detectedSource === "sitemap") {
      const products = await extractFromSitemap(url, budget, logger);
      return finalize(url, detectedSource, products ? "sitemap" : null, products ?? [], [], budget, logger);
    }
    const feed = await extractFromFeed(url, budget, logger);
    if (!feed) {
      return buildResolution(url, detectedSource, null, [], [
        { row: 1, field: "feed", message: "No se pudo leer el feed indicado por la URL." },
      ], budget, logger);
    }
    return buildResolution(url, detectedSource, "feed", feed.products, feed.errors, budget, logger);
  }

  // Generic path: fetch once, then route based on what we actually got.
  const rootResp = await budgetedFetch(url, budget, logger, { label: "resolve.root" });
  if (!rootResp.ok) {
    logger.error("resolve.root", `Root URL unreachable: ${rootResp.error ?? rootResp.status}`);
    return buildResolution(url, "unknown", null, [], [
      {
        row: 1,
        field: "url",
        message: rootResp.error === "timeout"
          ? "La URL no respondió a tiempo."
          : `El sitio respondió HTTP ${rootResp.status || "?"}.`,
      },
    ], budget, logger);
  }

  const detectedSource = detectSourceType({
    url,
    contentType: rootResp.contentType,
    body: rootResp.body,
  });
  logger.info("detect", `Detected source type: ${detectedSource}`, {
    contentType: rootResp.contentType,
  });

  // Feed-shaped responses (even when served at a store root for some reason).
  if (
    detectedSource === "feed-csv" ||
    detectedSource === "feed-json" ||
    detectedSource === "feed-xml"
  ) {
    const feed = await extractFromFeed(url, budget, logger, {
      body: rootResp.body,
      contentType: rootResp.contentType,
    });
    if (feed && feed.products.length > 0) {
      return buildResolution(url, detectedSource, "feed", feed.products, feed.errors, budget, logger);
    }
    logger.warn("feed", "Feed parsed but returned zero products");
  }

  if (detectedSource === "sitemap") {
    const products = await extractFromSitemap(url, budget, logger);
    if (products && products.length > 0) {
      return finalize(url, "sitemap", "sitemap", products, [], budget, logger);
    }
  }

  // HTML path — try extractors in order, return first non-empty.
  let finalDetected: DetectedSource = detectedSource === "unknown" ? "html-catalog" : detectedSource;

  // 1. Structured data on the landing page itself (also catches
  //    single-product detail pages).
  const direct = extractStructuredDataFromHtml(rootResp.body, rootResp.url);
  if (direct.length > 0) {
    logger.ok("structured-data", `Root page exposed ${direct.length} Product node(s)`);
    return finalize(url, "structured-data", "structured-data", dedupeByExternalId(direct), [], budget, logger);
  }

  // 2. Shopify-like stores.
  const shopify = detectShopify(rootResp.body, rootResp.url);
  if (shopify.likely) {
    finalDetected = "shopify";
    const items = await extractFromShopify(rootResp.url, budget, logger);
    if (items && items.length > 0) {
      return finalize(url, "shopify", "shopify", items, [], budget, logger);
    }
  }

  // 3. Sitemap fallback even on HTML sites.
  if (!budgetExhaustedGuard(budget)) {
    const fromSitemap = await extractFromSitemap(rootResp.url, budget, logger);
    if (fromSitemap && fromSitemap.length > 0) {
      return finalize(url, "sitemap", "sitemap", fromSitemap, [], budget, logger);
    }
  }

  // 4. Generic HTML catalog crawl.
  if (!budgetExhaustedGuard(budget)) {
    const fromHtml = await extractFromHtmlCatalog(rootResp.url, rootResp.body, budget, logger);
    if (fromHtml && fromHtml.length > 0) {
      return finalize(url, "html-catalog", "html-catalog", fromHtml, [], budget, logger);
    }
  }

  logger.error(
    "resolve",
    "Ningún extractor devolvió productos. La URL probablemente requiere JS, login o no expone catálogo.",
  );
  return buildResolution(url, finalDetected, null, [], [
    {
      row: 1,
      field: "catalog",
      message:
        "No se pudo extraer un catálogo utilizable desde esta URL. Probá una URL de categoría, de producto individual, un feed CSV/XML/JSON o un sitemap.",
    },
  ], budget, logger);
}

function finalize(
  sourceUrl: string,
  detected: DetectedSource,
  extractorUsed: ExtractorId | null,
  products: SupplierProductInput[],
  extraErrors: SourcingImportPreview["errors"],
  budget: Budget,
  logger: ResolverLogger,
): CatalogResolution {
  return buildResolution(sourceUrl, detected, extractorUsed, products, extraErrors, budget, logger);
}

function buildResolution(
  sourceUrl: string,
  detected: DetectedSource,
  extractorUsed: ExtractorId | null,
  products: SupplierProductInput[],
  extraErrors: SourcingImportPreview["errors"],
  budget: Budget,
  logger: ResolverLogger,
): CatalogResolution {
  const diagnostics = logger.all();
  const preview: SourcingImportPreview = {
    sourceFormat: formatHint(detected),
    totalRows: products.length,
    validRows: products.length,
    products,
    errors: extraErrors,
    detectedSource: detected,
    extractorUsed,
    diagnostics,
  };
  const snapshot: BudgetSnapshot = {
    elapsedMs: budgetElapsed(budget),
    pagesFetched: budget.pagesFetched,
    bytesFetched: budget.bytesFetched,
    maxTotalMs: budget.maxTotalMs,
    maxPages: budget.maxPages,
    maxBodyBytes: budget.maxBodyBytes,
  };
  return {
    sourceUrl,
    detectedSource: detected,
    extractorUsed,
    preview,
    diagnostics,
    budget: snapshot,
  };
}

function formatHint(detected: DetectedSource): SourcingImportPreview["sourceFormat"] {
  if (detected === "feed-json") return "json";
  if (detected === "feed-xml" || detected === "sitemap") return "xml";
  if (detected === "feed-csv") return "csv";
  // Structured-data / shopify / html-catalog: report as json since the
  // canonical payload was JSON-shaped.
  return "json";
}

function budgetExhaustedGuard(budget: Budget): boolean {
  return (
    budgetElapsed(budget) >= budget.maxTotalMs ||
    budget.pagesFetched >= budget.maxPages ||
    budget.bytesFetched >= budget.maxBodyBytes
  );
}
