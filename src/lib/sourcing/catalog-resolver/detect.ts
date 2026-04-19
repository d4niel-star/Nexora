import type { DetectedSource } from "./types";

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
