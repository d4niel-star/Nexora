// ─── HTML parsing primitives (regex-based, no DOM) ───────────────────────
// We intentionally avoid a full HTML parser / headless browser. These
// helpers are enough to pull JSON-LD, basic meta tags, title, and anchor
// hrefs — which is what every extractor needs. If a site hides everything
// behind client-side JS, we can't see it and report that honestly.

export function absoluteUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

export function sameHost(a: string, b: string): boolean {
  try {
    return new URL(a).host === new URL(b).host;
  } catch {
    return false;
  }
}

export function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function extractJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const re = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const raw = match[1].trim();
    if (!raw) continue;
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      // Some sites emit trailing junk / multiple objects; best-effort only.
    }
  }
  return blocks;
}

export function collectProductNodes(
  payload: unknown,
  acc: Record<string, unknown>[] = [],
): Record<string, unknown>[] {
  if (payload == null) return acc;
  if (Array.isArray(payload)) {
    for (const item of payload) collectProductNodes(item, acc);
    return acc;
  }
  if (typeof payload !== "object") return acc;
  const obj = payload as Record<string, unknown>;

  const rawType = obj["@type"];
  const typeStr = Array.isArray(rawType)
    ? rawType.filter((v) => typeof v === "string").join(",")
    : typeof rawType === "string"
      ? rawType
      : "";

  if (/Product/i.test(typeStr)) acc.push(obj);

  const graph = obj["@graph"];
  if (Array.isArray(graph)) collectProductNodes(graph, acc);

  const itemListElement = obj["itemListElement"];
  if (Array.isArray(itemListElement)) {
    for (const entry of itemListElement) {
      if (entry && typeof entry === "object") {
        const item = (entry as Record<string, unknown>).item;
        if (item) collectProductNodes(item, acc);
      }
    }
  }
  return acc;
}

export function extractHrefs(html: string): string[] {
  const out: string[] = [];
  const re = /<a\b[^>]*?\bhref=["']([^"'#\s]+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    out.push(decodeHtmlEntities(match[1]));
  }
  return out;
}

export function extractMetaContent(html: string, property: string): string | null {
  const safe = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${safe}["'][^>]*content=["']([^"']*)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${safe}["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return decodeHtmlEntities(m[1]);
  }
  return null;
}

export function extractPageTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return null;
  return decodeHtmlEntities(m[1]).replace(/\s+/g, " ").trim();
}

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    });
}

// Heuristic: does this URL "look like" a product detail page?
// Intentionally generic — we bias toward recall; per-platform extractors
// can be stricter.
const PRODUCT_PATH_HINTS = [
  /\/products\//i,
  /\/product\//i,
  /\/producto\//i,
  /\/productos\//i,
  /\/p\/[^/]+/i,
  /\/item\//i,
  /\/articulo\//i,
  /-p-\d+/i,
  /\?pid=/i,
  /\/MLA-?\d+/i,
];

export function looksLikeProductUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    return PRODUCT_PATH_HINTS.some((re) => re.test(path));
  } catch {
    return false;
  }
}

const NON_PRODUCT_HINTS = [
  /\/cart/i,
  /\/checkout/i,
  /\/login/i,
  /\/account/i,
  /\/policies?\//i,
  /\/blog/i,
  /\/about/i,
  /\/contact/i,
  /\/search/i,
  /\.(css|js|png|jpe?g|gif|svg|webp|ico|pdf|zip|woff2?)($|\?)/i,
];

export function isClearlyNonProduct(url: string): boolean {
  try {
    const u = new URL(url);
    return NON_PRODUCT_HINTS.some((re) => re.test(u.pathname + u.search));
  } catch {
    return true;
  }
}
