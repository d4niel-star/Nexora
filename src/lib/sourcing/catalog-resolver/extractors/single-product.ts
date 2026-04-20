import type { SupplierProductInput } from "../../import-parsers";
import {
  absoluteUrl,
  decodeHtmlEntities,
  extractMetaContent,
  extractPageTitle,
} from "../html-utils";
import { parsePriceText, toSupplierProduct, type RawProductCandidate } from "../normalize";
import { extractStructuredDataFromHtml } from "./structured-data";

// ─── Single-product (PDP) extractor ──────────────────────────────────────
// Resolves exactly ONE product from a Product Detail Page in three layers:
//
//   1. schema.org JSON-LD Product + OpenGraph product meta
//      (delegated to extractStructuredDataFromHtml; same behavior that
//      already worked for well-structured PDPs).
//   2. HTML microdata (itemprop="name|image|price|priceCurrency|sku|
//      brand|availability|description"). Many e-commerce themes emit
//      microdata without JSON-LD.
//   3. Heuristic HTML fallback (h1 + price regex + og:image / first img).
//
// Never invents data: if none of the three layers produces a product with
// at least a title, returns null with a machine-readable reason so the
// resolver can raise an honest diagnostic ("PDP detected but no price",
// "requires JS", etc.).

export type SingleProductFailure =
  | "no_title"
  | "no_price_no_image"
  | "probably_js_rendered";

export interface SingleProductResult {
  product: SupplierProductInput | null;
  failure?: SingleProductFailure;
  usedLayer?: "structured-data" | "microdata" | "heuristic";
}

export function extractSingleProductFromHtml(
  html: string,
  sourceUrl: string,
): SingleProductResult {
  // Layer 1 — JSON-LD / OpenGraph product. Re-uses the existing path so
  // PDPs that already work keep working byte-for-byte identically.
  const structured = extractStructuredDataFromHtml(html, sourceUrl);
  if (structured.length > 0) {
    return { product: structured[0], usedLayer: "structured-data" };
  }

  // Layer 2 — schema.org microdata.
  const fromMicrodata = extractMicrodataProduct(html, sourceUrl);
  if (fromMicrodata) return { product: fromMicrodata, usedLayer: "microdata" };

  // Layer 3 — heuristic HTML read.
  const heuristic = extractHeuristicProduct(html, sourceUrl);
  if (heuristic.product) return heuristic;

  return heuristic;
}

// ─── Layer 2: microdata ──────────────────────────────────────────────────
// Matches the common schema.org microdata pattern:
//   <div itemscope itemtype="http://schema.org/Product">
//     <span itemprop="name">...</span>
//     <meta itemprop="sku" content="...">
//     <span itemprop="price">...</span> or <meta itemprop="price" content="...">
//     ...
//   </div>
// We do NOT require a specific container; we scan the whole document for
// itemprop attributes and stop at the first Product cluster. Most PDPs
// emit at most one.
function extractMicrodataProduct(html: string, sourceUrl: string): SupplierProductInput | null {
  const hasProductContainer = /itemtype=["'][^"']*schema\.org\/Product/i.test(html);
  if (!hasProductContainer) return null;

  const name = readItemProp(html, "name");
  if (!name) return null;

  const priceRaw = readItemProp(html, "price");
  const priceNumber = parsePriceText(priceRaw);
  const currency = readItemProp(html, "priceCurrency");
  const sku = readItemProp(html, "sku") ?? readItemProp(html, "mpn");
  const brand = readItemProp(html, "brand");
  const description = readItemProp(html, "description");
  const availability = readItemProp(html, "availability");
  const imageProp = readItemProp(html, "image");

  const images: string[] = [];
  if (imageProp) {
    const abs = absoluteUrl(imageProp, sourceUrl);
    if (abs) images.push(abs);
  }
  const ogImage = extractMetaContent(html, "og:image");
  if (ogImage) {
    const abs = absoluteUrl(ogImage, sourceUrl);
    if (abs && !images.includes(abs)) images.push(abs);
  }

  const candidate: RawProductCandidate = {
    externalId: sku ?? "",
    title: name,
    description: description ?? extractMetaContent(html, "description"),
    priceNumber,
    priceText: priceRaw,
    currency,
    images,
    sourceUrl,
    sku,
    brand,
    stock: availability && /InStock/i.test(availability) ? 1 : null,
  };
  return toSupplierProduct(candidate);
}

// ─── Layer 3: heuristic HTML ─────────────────────────────────────────────
// Last resort when the site emits neither JSON-LD nor microdata. Uses
// patterns every serious PDP template has: an <h1>, a price string near
// a "price" class/data attribute, and at least one image.
//
// Reasoning: if even these can't find a price, it's honest to tell the
// user "the PDP doesn't expose product data server-side" instead of
// continuing to the catalog extractor.
function extractHeuristicProduct(html: string, sourceUrl: string): SingleProductResult {
  const title =
    extractH1(html) ??
    extractMetaContent(html, "og:title") ??
    extractPageTitle(html);

  if (!title) {
    return { product: null, failure: "no_title" };
  }

  // Price — try several patterns, bail on the first match.
  const priceNumber = findPriceInHtml(html);

  const images: string[] = [];
  const ogImage = extractMetaContent(html, "og:image");
  if (ogImage) {
    const abs = absoluteUrl(ogImage, sourceUrl);
    if (abs) images.push(abs);
  }
  // Fallback: first reasonably-sized <img> whose src is absolute.
  if (images.length === 0) {
    const firstImg = findFirstProductImage(html, sourceUrl);
    if (firstImg) images.push(firstImg);
  }

  const description =
    extractMetaContent(html, "og:description") ??
    extractMetaContent(html, "description");

  // If we have only the title and nothing else (no price, no image), the
  // site is almost certainly rendering client-side. Be honest.
  if (priceNumber === null && images.length === 0) {
    // An SPA shell typically has <title> but an empty <body> region aside
    // from <script> tags. We treat a tiny <body> as a strong JS signal.
    const bodyLen = html.replace(/<script[\s\S]*?<\/script>/gi, "").length;
    if (bodyLen < 2000) {
      return { product: null, failure: "probably_js_rendered" };
    }
    return { product: null, failure: "no_price_no_image" };
  }

  const candidate: RawProductCandidate = {
    externalId: "",
    title,
    description,
    priceNumber,
    images,
    sourceUrl,
  };
  const product = toSupplierProduct(candidate);
  return { product, usedLayer: product ? "heuristic" : undefined };
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function readItemProp(html: string, prop: string): string | null {
  const safe = prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // <meta itemprop="X" content="..."> form first (canonical).
  const meta = html.match(
    new RegExp(`<meta[^>]+itemprop=["']${safe}["'][^>]+content=["']([^"']*)["']`, "i"),
  );
  if (meta?.[1]) return decodeHtmlEntities(meta[1]).trim() || null;
  const metaRev = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+itemprop=["']${safe}["']`, "i"),
  );
  if (metaRev?.[1]) return decodeHtmlEntities(metaRev[1]).trim() || null;
  // <tag itemprop="X"> then prefer an attribute like content="" or data-*
  const tagWithContent = html.match(
    new RegExp(
      `<[a-z0-9]+[^>]+itemprop=["']${safe}["'][^>]*?(?:content|data-value)=["']([^"']*)["']`,
      "i",
    ),
  );
  if (tagWithContent?.[1]) return decodeHtmlEntities(tagWithContent[1]).trim() || null;
  // <tag itemprop="X">inner</tag> form — inner text, stripped.
  const tagInner = html.match(
    new RegExp(`<([a-z0-9]+)[^>]+itemprop=["']${safe}["'][^>]*>([\\s\\S]*?)<\\/\\1>`, "i"),
  );
  if (tagInner?.[2]) {
    const text = stripTags(tagInner[2]).trim();
    if (text) return text;
  }
  return null;
}

function extractH1(html: string): string | null {
  const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) return null;
  const text = stripTags(match[1]).replace(/\s+/g, " ").trim();
  return text || null;
}

function findPriceInHtml(html: string): number | null {
  // 1. meta itemprop="price"
  const metaPrice = readItemProp(html, "price");
  if (metaPrice) {
    const n = parsePriceText(metaPrice);
    if (n !== null && n > 0) return n;
  }
  // 2. OpenGraph product price
  const og = extractMetaContent(html, "product:price:amount") ?? extractMetaContent(html, "og:price:amount");
  if (og) {
    const n = parsePriceText(og);
    if (n !== null && n > 0) return n;
  }
  // 3. data-price attribute
  const dataPrice = html.match(/\bdata-price(?:-amount)?=["']([^"']+)["']/i);
  if (dataPrice?.[1]) {
    const n = parsePriceText(dataPrice[1]);
    if (n !== null && n > 0) return n;
  }
  // 4. Text node inside an element whose class contains "price". Bounded
  // to avoid regex catastrophic backtracking on huge pages.
  const classPrice = html.match(
    /<[a-z0-9]+[^>]+class=["'][^"']*\bprice\b[^"']*["'][^>]*>([\s\S]{0,200}?)<\/[a-z0-9]+>/i,
  );
  if (classPrice?.[1]) {
    const text = stripTags(classPrice[1]);
    const n = parsePriceText(text);
    if (n !== null && n > 0) return n;
  }
  return null;
}

function findFirstProductImage(html: string, sourceUrl: string): string | null {
  // Prefer <link rel="image_src"> if emitted (common on PDPs).
  const linkImageSrc = html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i);
  if (linkImageSrc?.[1]) {
    const abs = absoluteUrl(linkImageSrc[1], sourceUrl);
    if (abs) return abs;
  }
  // Otherwise first <img> with a plausible src.
  const imgs = html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi);
  for (const match of imgs) {
    const src = match[1];
    // Skip transparent 1x1 placeholders and data URLs.
    if (/^data:/i.test(src)) continue;
    if (/\bspacer\b|\bblank\b|\btracker\b|\bpixel\b/i.test(src)) continue;
    const abs = absoluteUrl(src, sourceUrl);
    if (abs) return abs;
  }
  return null;
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " "));
}
