import type { SupplierProductInput } from "../../import-parsers";
import type { Budget } from "../budget";
import { budgetedFetch } from "../fetcher";
import type { ResolverLogger } from "../logger";
import {
  absoluteUrl,
  extractHrefs,
  isClearlyNonProduct,
  looksLikeProductUrl,
  sameHost,
} from "../html-utils";
import { extractProductsFromHtmlPage } from "./single-product";
import { dedupeByExternalId } from "../normalize";

// ─── HTML catalog extractor ──────────────────────────────────────────────
// Fallback path: given an HTML page (homepage, category, listing) we
// harvest anchors that look like product detail pages, fetch a bounded
// set, and apply the structured-data extractor to each.
// Depth is capped by budget.maxDepth. We never leave the origin host.

export async function extractFromHtmlCatalog(
  rootUrl: string,
  rootHtml: string,
  budget: Budget,
  logger: ResolverLogger,
): Promise<SupplierProductInput[] | null> {
  // First, does the landing page itself declare Product structured data?
  const directProducts = extractProductsFromHtmlPage(rootHtml, rootUrl);
  if (directProducts.length > 0) {
    logger.ok("html-catalog.root", `Root page is a product: ${directProducts.length}`);
    return dedupeByExternalId(directProducts);
  }

  const productCandidates = new Set<string>();
  const listingQueue: { url: string; depth: number }[] = [];

  collectLinksInto(rootHtml, rootUrl, productCandidates, listingQueue, budget, 0);

  // BFS through category/listing pages until we have enough candidates or
  // the budget is spent.
  while (
    listingQueue.length > 0 &&
    productCandidates.size < budget.maxProducts &&
    budget.pagesFetched < budget.maxPages
  ) {
    const { url, depth } = listingQueue.shift()!;
    if (depth > budget.maxDepth) continue;
    const resp = await budgetedFetch(url, budget, logger, { label: "html.listing" });
    if (!resp.ok) continue;
    collectLinksInto(resp.body, resp.url, productCandidates, listingQueue, budget, depth + 1);
  }

  if (productCandidates.size === 0) {
    logger.warn("html-catalog", "No product-looking links found on root or listings");
    return null;
  }

  logger.info("html-catalog", `Candidate product URLs: ${productCandidates.size}`);

  const products: SupplierProductInput[] = [];
  const urls = Array.from(productCandidates).slice(0, budget.maxProducts);
  for (const productUrl of urls) {
    if (products.length >= budget.maxProducts) break;
    if (budget.pagesFetched >= budget.maxPages) break;
    const resp = await budgetedFetch(productUrl, budget, logger, { label: "html.product" });
    if (!resp.ok) continue;
    const extracted = extractProductsFromHtmlPage(resp.body, resp.url);
    for (const product of extracted) {
      if (products.length >= budget.maxProducts) break;
      products.push(product);
    }
  }

  if (products.length === 0) {
    logger.warn(
      "html-catalog",
      "Visited product-looking pages but none exposed structured data. Site probably requires JS rendering.",
    );
    return null;
  }
  return dedupeByExternalId(products);
}

function collectLinksInto(
  html: string,
  baseUrl: string,
  productCandidates: Set<string>,
  listingQueue: { url: string; depth: number }[],
  budget: Budget,
  currentDepth: number,
): void {
  const seenListings = new Set<string>(listingQueue.map((e) => e.url));
  for (const href of extractHrefs(html)) {
    const abs = absoluteUrl(href, baseUrl);
    if (!abs) continue;
    if (!sameHost(abs, baseUrl)) continue;
    if (isClearlyNonProduct(abs)) continue;
    const normalized = abs.split("#")[0];
    if (looksLikeProductUrl(normalized)) {
      if (productCandidates.size < budget.maxProducts) productCandidates.add(normalized);
      continue;
    }
    // Candidate listing page: add to queue if we have depth budget.
    if (
      currentDepth < budget.maxDepth &&
      listingQueue.length < budget.maxPages &&
      !seenListings.has(normalized)
    ) {
      seenListings.add(normalized);
      listingQueue.push({ url: normalized, depth: currentDepth });
    }
  }
}
