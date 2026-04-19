import type { SupplierProductInput } from "../../import-parsers";
import { budgetedFetch } from "../fetcher";
import type { Budget } from "../budget";
import type { ResolverLogger } from "../logger";
import { isClearlyNonProduct, looksLikeProductUrl, originOf, sameHost } from "../html-utils";
import { extractStructuredDataFromHtml } from "./structured-data";
import { dedupeByExternalId } from "../normalize";

// ─── Sitemap extractor ───────────────────────────────────────────────────
// Fetches /sitemap.xml and any linked sub-sitemaps, collects URLs that
// look like product detail pages, then scrapes structured data from a
// bounded number of them.

export async function extractFromSitemap(
  rootUrl: string,
  budget: Budget,
  logger: ResolverLogger,
): Promise<SupplierProductInput[] | null> {
  const origin = originOf(rootUrl);
  if (!origin) return null;

  const entrypoints = [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`];
  const productUrls = new Set<string>();
  const visited = new Set<string>();

  for (const entry of entrypoints) {
    if (productUrls.size >= budget.maxProducts) break;
    await crawlSitemap(entry, origin, budget, logger, productUrls, visited, 0);
    if (productUrls.size > 0) break;
  }

  if (productUrls.size === 0) {
    logger.warn("sitemap", "No product URLs found in sitemap");
    return null;
  }

  logger.ok("sitemap", `Collected ${productUrls.size} candidate product URL(s)`);

  const products = await fetchProductPages(Array.from(productUrls), budget, logger);
  return products.length > 0 ? dedupeByExternalId(products) : null;
}

async function crawlSitemap(
  url: string,
  origin: string,
  budget: Budget,
  logger: ResolverLogger,
  productUrls: Set<string>,
  visited: Set<string>,
  depth: number,
): Promise<void> {
  if (visited.has(url)) return;
  visited.add(url);
  if (depth > 2) return;
  if (productUrls.size >= budget.maxProducts) return;

  const resp = await budgetedFetch(url, budget, logger, { label: "sitemap.fetch" });
  if (!resp.ok) return;
  const body = resp.body;

  // Collect <loc> entries. If the content contains <sitemapindex>, each
  // <loc> points to a child sitemap. Otherwise <loc>s are page URLs.
  const isIndex = /<sitemapindex[\s>]/i.test(body);
  const locs = [...body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);

  if (isIndex) {
    for (const childUrl of locs.slice(0, 20)) {
      if (productUrls.size >= budget.maxProducts) break;
      if (!sameHost(childUrl, origin)) continue;
      // Prefer sub-sitemaps that look product-related.
      await crawlSitemap(childUrl, origin, budget, logger, productUrls, visited, depth + 1);
    }
    return;
  }

  for (const pageUrl of locs) {
    if (productUrls.size >= budget.maxProducts) break;
    if (!sameHost(pageUrl, origin)) continue;
    if (isClearlyNonProduct(pageUrl)) continue;
    if (!looksLikeProductUrl(pageUrl)) continue;
    productUrls.add(pageUrl);
  }
}

async function fetchProductPages(
  urls: string[],
  budget: Budget,
  logger: ResolverLogger,
): Promise<SupplierProductInput[]> {
  const out: SupplierProductInput[] = [];
  const limit = Math.min(urls.length, budget.maxProducts);

  for (let i = 0; i < limit; i += 1) {
    if (out.length >= budget.maxProducts) break;
    const pageUrl = urls[i];
    const resp = await budgetedFetch(pageUrl, budget, logger, { label: "sitemap.page" });
    if (!resp.ok) continue;
    const extracted = extractStructuredDataFromHtml(resp.body, resp.url);
    for (const product of extracted) {
      if (out.length >= budget.maxProducts) break;
      out.push(product);
    }
  }
  logger.info("sitemap.scrape", `Scraped ${out.length} product(s) from ${limit} URL(s)`);
  return out;
}
