import type { DetectedSource, PageKind } from "./types";
import { looksLikeProductUrl } from "./html-utils";

// ─── Source type detection ───────────────────────────────────────────────
// Tries, in this order:
// 1. URL extension hints (.csv, .xml, .json)
// 2. Content-Type header
// 3. Body sniffing
// Falls back to "html-catalog" which means "treat this as a page and try
// to harvest product links".

export interface DetectInput {
  url: string;
  contentType?: string;
  body?: string;
}

export function detectSourceType(input: DetectInput): DetectedSource {
  const urlLower = input.url.toLowerCase();
  const ct = (input.contentType ?? "").toLowerCase();
  const body = (input.body ?? "").trim();

  // Extension / query hints.
  const pathOnly = urlLower.split("?")[0];
  if (pathOnly.endsWith(".csv")) return "feed-csv";
  if (pathOnly.endsWith(".json")) return "feed-json";
  if (pathOnly.endsWith(".xml")) {
    return pathOnly.endsWith("sitemap.xml") || pathOnly.endsWith("sitemap_index.xml")
      ? "sitemap"
      : "feed-xml";
  }

  // Content-Type hints.
  if (ct.includes("application/json") || ct.includes("+json")) return "feed-json";
  if (ct.includes("text/csv") || ct.includes("application/csv")) return "feed-csv";
  if (ct.includes("application/xml") || ct.includes("text/xml")) {
    if (/<sitemap(index)?[\s>]/i.test(body)) return "sitemap";
    if (/<rss[\s>]|<feed[\s>]|<urlset[\s>]/i.test(body)) {
      return /<urlset[\s>]/i.test(body) ? "sitemap" : "feed-xml";
    }
    return "feed-xml";
  }

  // Body sniffing for HTML pages.
  if (ct.includes("text/html") || body.startsWith("<!") || body.startsWith("<html")) {
    if (
      /<script[^>]+application\/ld\+json[^>]*>[\s\S]{0,4000}"@type"\s*:\s*"Product"/i.test(body)
    ) {
      return "structured-data";
    }
    if (/cdn\.shopify\.com|Shopify\.(theme|shop|routes)/i.test(body)) return "shopify";
    return "html-catalog";
  }

  // Best-effort body sniffing when Content-Type is missing.
  if (body.startsWith("{") || body.startsWith("[")) return "feed-json";
  if (body.startsWith("<")) return "feed-xml";
  if (body.length > 0) return "feed-csv";

  return "unknown";
}

// ─── Page-kind classification ────────────────────────────────────────────
// Higher-level than detectSourceType: answers the question "what kind of
// page did the user paste?". Combines URL heuristics with body signals.
//
// Precedence:
//   1. feed / sitemap classifications from detectSourceType()
//   2. "strong" body signals (JSON-LD Product, og:type=product,
//       itemtype=*Product) → kind=product, signal=html
//   3. URL-path heuristic → kind=product, signal=url (WEAK; the resolver
//      should try the single-product extractor but fall through to catalog
//      extraction on failure, because generic paths like /productos/ can
//      match category URLs too).
//   4. fallback → catalog
export interface PageKindResult {
  kind: PageKind;
  /**
   * How confident we are. "html" means the HTML itself advertises a product
   * (schema.org / og). "url" means only the URL path hinted at it.
   */
  signal: "html" | "url" | "format" | "none";
}

export function detectPageKind(input: DetectInput): PageKindResult {
  const source = detectSourceType(input);
  if (source === "feed-csv" || source === "feed-xml" || source === "feed-json") {
    return { kind: "feed", signal: "format" };
  }
  if (source === "sitemap") return { kind: "sitemap", signal: "format" };

  const body = input.body ?? "";

  // Strong HTML signals that the page is a PDP. We deliberately look at
  // the whole body (not just the first 4KB) so we don't miss JSON-LD
  // blocks that sites render right before </body>.
  const hasJsonLdProduct =
    /<script[^>]+application\/ld\+json[^>]*>[\s\S]*?"@type"\s*:\s*("Product"|\["?Product"?)/i.test(
      body,
    );
  const hasMicrodataProduct = /itemtype=["'][^"']*schema\.org\/Product/i.test(body);
  const hasOgProduct = /<meta[^>]+property=["']og:type["'][^>]+content=["']product["']/i.test(body);

  if (hasJsonLdProduct || hasMicrodataProduct || hasOgProduct) {
    return { kind: "product", signal: "html" };
  }

  // URL-path heuristic. Triggers the single-product extractor but the
  // resolver treats failure as "fall through to catalog" instead of a
  // hard PDP error, because this signal is intentionally broad.
  if (looksLikeProductUrl(input.url)) return { kind: "product", signal: "url" };

  if (source === "unknown") return { kind: "unknown", signal: "none" };
  return { kind: "catalog", signal: "none" };
}
