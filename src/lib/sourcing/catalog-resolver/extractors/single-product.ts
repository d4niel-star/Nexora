import type {
  SupplierAvailability,
  SupplierProductAttribute,
  SupplierProductInput,
} from "../../import-parsers";
import {
  absoluteUrl,
  decodeHtmlEntities,
  extractMetaContent,
  extractPageTitle,
} from "../html-utils";
import { parsePriceText } from "../normalize";
import {
  candidateToSupplierProduct,
  mergeRichCandidates,
  type RichCandidate,
  type RichVariant,
} from "../rich-candidate";
import {
  extractRichFromJsonLd,
  extractRichFromOpenGraph,
  extractStructuredDataFromHtml,
} from "./structured-data";
import { extractRichFromEmbeddedJson } from "./embedded-json";

// ─── Single-product (PDP) extractor ──────────────────────────────────────
// Orchestrates four extraction layers and merges their output into a
// single SupplierProductInput with rich metadata. Layers (highest
// confidence first):
//
//   1. schema.org JSON-LD Product (hasVariant, offers[], additionalProperty,
//      gtin/mpn, BreadcrumbList)
//   2. Embedded JSON hydration (window.__NEXT_DATA__, Shopify product JSON,
//      VTEX state, Apollo/Redux SSR, typed <script type="application/json">)
//   3. schema.org microdata (<[itemtype~=Product] itemprop="...">)
//   4. Heuristic HTML (h1 + class~=price + option selects + spec tables +
//      <del> compare-at + og:image + breadcrumb nav)
//
// Additional OpenGraph product meta contributes as a 5th low-confidence
// layer that fills gaps left by the others.
//
// The merger produces one RichCandidate and candidateToSupplierProduct()
// converts it to the shared SupplierProductInput shape, preserving the
// real variants/attributes/compareAt/identifiers we extracted — rather
// than flattening to a single "Default" variant like the legacy path did.

export type SingleProductFailure =
  | "no_title"
  | "no_price_no_image"
  | "probably_js_rendered";

export interface SingleProductResult {
  product: SupplierProductInput | null;
  failure?: SingleProductFailure;
  /**
   * Aggregated list of layers that contributed data to the final product.
   * Surfaced to the UI via product.extraction.extractedFrom.
   */
  usedLayer?: "structured-data" | "embedded-json" | "microdata" | "heuristic";
}

export function extractSingleProductFromHtml(
  html: string,
  sourceUrl: string,
): SingleProductResult {
  const candidates: RichCandidate[] = [];

  // Layer 1 — JSON-LD Product (deep).
  for (const cand of extractRichFromJsonLd(html, sourceUrl)) {
    candidates.push(cand);
  }

  // Layer 2 — Embedded hydration JSON.
  const embedded = extractRichFromEmbeddedJson(html, sourceUrl);
  if (embedded) candidates.push(embedded);

  // Layer 3 — Microdata (rewritten to read compare-at and variants).
  const microdata = extractRichFromMicrodata(html, sourceUrl);
  if (microdata) candidates.push(microdata);

  // Layer 4 — Heuristic HTML, always computed so we can fill gaps in the
  // structured layers (e.g. JSON-LD without images, or microdata without
  // compare-at).
  const heuristicResult = extractRichFromHeuristic(html, sourceUrl);
  if (heuristicResult.candidate) candidates.push(heuristicResult.candidate);

  // Layer 5 — OpenGraph, for the common case of sites that only emit
  // product:price:amount / og:image.
  const og = extractRichFromOpenGraph(html, sourceUrl);
  if (og) candidates.push(og);

  const canonicalUrl = extractCanonicalUrl(html);
  if (canonicalUrl) {
    // Inject a low-confidence candidate that only carries the canonical URL.
    candidates.push({
      source: "heuristic",
      confidence: 30,
      sourceUrl,
      canonicalUrl,
    });
  }

  if (candidates.length === 0) {
    return { product: null, failure: heuristicResult.failure ?? "no_title" };
  }

  const merged = mergeRichCandidates(candidates);
  if (!merged) {
    return { product: null, failure: heuristicResult.failure ?? "no_title" };
  }

  const product = candidateToSupplierProduct(merged);
  if (!product) {
    return { product: null, failure: heuristicResult.failure ?? "no_title" };
  }

  // If we reached here with no price AND no image, the heuristic layer
  // likely tripped the JS-rendered or empty-body detector. Surface that
  // as the failure reason so the resolver diagnostic is honest — but
  // only when the product has no structured signal either.
  const hasStructured = merged.extractedFrom?.some(
    (l) => l === "structured-data" || l === "embedded-json" || l === "microdata",
  );
  if (
    !hasStructured &&
    product.suggestedPrice == null &&
    product.imageUrls.length === 0
  ) {
    return {
      product: null,
      failure: heuristicResult.failure ?? "no_price_no_image",
    };
  }

  const first = merged.extractedFrom?.[0];
  const usedLayer: SingleProductResult["usedLayer"] =
    first === "structured-data" ||
    first === "embedded-json" ||
    first === "microdata" ||
    first === "heuristic"
      ? first
      : "heuristic";

  return { product, usedLayer };
}

// ─── Layer 3: microdata (rich) ───────────────────────────────────────────

function extractRichFromMicrodata(html: string, sourceUrl: string): RichCandidate | null {
  const hasProductContainer = /itemtype=["'][^"']*schema\.org\/Product/i.test(html);
  if (!hasProductContainer) return null;

  const name = readItemProp(html, "name");
  if (!name) return null;

  const priceRaw = readItemProp(html, "price");
  const price = parsePriceText(priceRaw);
  const currency = readItemProp(html, "priceCurrency");
  const sku = readItemProp(html, "sku");
  const mpn = readItemProp(html, "mpn");
  const gtin =
    readItemProp(html, "gtin13") ??
    readItemProp(html, "gtin14") ??
    readItemProp(html, "gtin12") ??
    readItemProp(html, "gtin8") ??
    readItemProp(html, "gtin");
  const brand = readItemProp(html, "brand");
  const description = readItemProp(html, "description");
  const availability = readItemProp(html, "availability");

  const images: string[] = [];
  const imageProp = readItemProp(html, "image");
  if (imageProp) {
    const abs = absoluteUrl(imageProp, sourceUrl);
    if (abs) images.push(abs);
  }
  const ogImage = extractMetaContent(html, "og:image");
  if (ogImage) {
    const abs = absoluteUrl(ogImage, sourceUrl);
    if (abs && !images.includes(abs)) images.push(abs);
  }

  // Micro-compareAt: a <del> / <s> element with a price inside.
  const compareAtPrice = findCompareAtInHtml(html);

  // Option selects (best-effort): extract name of the select and its
  // non-placeholder options. Produces one RichVariant per option value.
  const variants = readVariantsFromSelects(html);

  // Spec table (<table> / <dl>) → attributes.
  const attributes = readAttributesFromHtml(html);

  let availState: SupplierAvailability | undefined;
  if (availability) {
    if (/InStock/i.test(availability)) availState = "in_stock";
    else if (/OutOfStock/i.test(availability)) availState = "out_of_stock";
  }

  return {
    source: "microdata",
    confidence: 70,
    sourceUrl,
    title: name,
    description,
    brand,
    currency: currency?.toUpperCase() ?? null,
    sku,
    mpn,
    gtin,
    price: typeof price === "number" ? price : null,
    compareAtPrice,
    availability: availState,
    images: images.length > 0 ? images : undefined,
    attributes: attributes.length > 0 ? attributes : undefined,
    variants: variants.length > 0 ? variants : undefined,
  };
}

// ─── Layer 4: heuristic HTML (rich) ──────────────────────────────────────

function extractRichFromHeuristic(
  html: string,
  sourceUrl: string,
): { candidate: RichCandidate | null; failure?: SingleProductFailure } {
  const title =
    extractH1(html) ??
    extractMetaContent(html, "og:title") ??
    extractPageTitle(html);

  if (!title) {
    return { candidate: null, failure: "no_title" };
  }

  const price = findPriceInHtml(html);
  const compareAtPrice = findCompareAtInHtml(html);

  const images = collectHeuristicImages(html, sourceUrl);
  const description =
    extractMetaContent(html, "og:description") ??
    extractMetaContent(html, "description");

  const attributes = readAttributesFromHtml(html);
  const variants = readVariantsFromSelects(html);
  const breadcrumbs = readBreadcrumbsFromHtml(html);

  // Detect client-side rendered SPAs with no static data.
  if (price === null && images.length === 0 && attributes.length === 0 && variants.length === 0) {
    const bodyLen = html.replace(/<script[\s\S]*?<\/script>/gi, "").length;
    if (bodyLen < 2000) {
      return { candidate: null, failure: "probably_js_rendered" };
    }
  }

  return {
    candidate: {
      source: "heuristic",
      confidence: 40,
      sourceUrl,
      title,
      description,
      price,
      compareAtPrice,
      images: images.length > 0 ? images : undefined,
      attributes: attributes.length > 0 ? attributes : undefined,
      variants: variants.length > 0 ? variants : undefined,
      breadcrumbs: breadcrumbs.length > 0 ? breadcrumbs : undefined,
    },
    failure: price === null && images.length === 0 ? "no_price_no_image" : undefined,
  };
}

// ─── Shared helpers ──────────────────────────────────────────────────────

function readItemProp(html: string, prop: string): string | null {
  const safe = prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const meta = html.match(
    new RegExp(`<meta[^>]+itemprop=["']${safe}["'][^>]+content=["']([^"']*)["']`, "i"),
  );
  if (meta?.[1]) return decodeHtmlEntities(meta[1]).trim() || null;
  const metaRev = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+itemprop=["']${safe}["']`, "i"),
  );
  if (metaRev?.[1]) return decodeHtmlEntities(metaRev[1]).trim() || null;
  const tagWithContent = html.match(
    new RegExp(
      `<[a-z0-9]+[^>]+itemprop=["']${safe}["'][^>]*?(?:content|data-value)=["']([^"']*)["']`,
      "i",
    ),
  );
  if (tagWithContent?.[1]) return decodeHtmlEntities(tagWithContent[1]).trim() || null;
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
  const metaPrice = readItemProp(html, "price");
  if (metaPrice) {
    const n = parsePriceText(metaPrice);
    if (n !== null && n > 0) return n;
  }
  const og =
    extractMetaContent(html, "product:price:amount") ??
    extractMetaContent(html, "og:price:amount");
  if (og) {
    const n = parsePriceText(og);
    if (n !== null && n > 0) return n;
  }
  const dataPrice = html.match(/\bdata-price(?:-amount)?=["']([^"']+)["']/i);
  if (dataPrice?.[1]) {
    const n = parsePriceText(dataPrice[1]);
    if (n !== null && n > 0) return n;
  }
  // Match a reasonably-sized container whose class contains "price" but
  // not "old/compare/was/list/regular" (those are compare-at labels). We
  // also strip out <del>/<s> subtrees so the sale price wins when both
  // the strike-through and the current price share the container.
  // Backreference \1 binds the closing tag to the opening element's name
  // so nested <del>/<span> inside <div class="price"> don't truncate the
  // match at their own </del>.
  const classMatches = html.matchAll(
    /<([a-z0-9]+)[^>]+class=["']([^"']*\bprice\b[^"']*)["'][^>]*>([\s\S]{0,800}?)<\/\1>/gi,
  );
  for (const match of classMatches) {
    const classList = match[2] ?? "";
    if (/\b(?:old-price|regular-price|compare-at|list-price|was-price|strikethrough)\b/i.test(classList)) continue;
    let inner = match[3] ?? "";
    inner = inner.replace(/<del\b[^>]*>[\s\S]*?<\/del>/gi, " ");
    inner = inner.replace(/<s\b[^>]*>[\s\S]*?<\/s>/gi, " ");
    const text = stripTags(inner);
    const n = parsePriceText(text);
    if (n !== null && n > 0) return n;
  }
  return null;
}

function findCompareAtInHtml(html: string): number | null {
  // <del>, <s>, or element class hints that the value is the old/list price.
  const patterns = [
    /<del\b[^>]*>([\s\S]{0,300}?)<\/del>/i,
    /<s\b[^>]*>([\s\S]{0,300}?)<\/s>/i,
    /<[a-z0-9]+[^>]+class=["'][^"']*\b(?:compare-at|old-price|regular-price|list-price|was-price|strikethrough)\b[^"']*["'][^>]*>([\s\S]{0,300}?)<\/[a-z0-9]+>/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      const text = stripTags(m[1]);
      const n = parsePriceText(text);
      if (n !== null && n > 0) return n;
    }
  }
  return null;
}

function collectHeuristicImages(html: string, sourceUrl: string): string[] {
  const out: string[] = [];
  const push = (raw: string | undefined | null) => {
    if (!raw) return;
    if (/^data:/i.test(raw)) return;
    if (/\bspacer\b|\bblank\b|\btracker\b|\bpixel\b|1x1\b/i.test(raw)) return;
    const abs = absoluteUrl(raw, sourceUrl);
    if (abs && !out.includes(abs)) out.push(abs);
  };

  // 1. Canonical image sources.
  const linkImageSrc = html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i);
  if (linkImageSrc?.[1]) push(linkImageSrc[1]);

  const ogImage = extractMetaContent(html, "og:image");
  if (ogImage) push(ogImage);

  // 2. Gallery / product images: we look at <img> inside elements that
  //    hint at a product gallery OR any <img> whose src/alt suggests a
  //    product photo. Bounded to the first ~40 matches.
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].slice(0, 80);
  for (const match of imgs) {
    const tag = match[0];
    const srcMatch = tag.match(/\bsrc=["']([^"']+)["']/i);
    const src = srcMatch?.[1];
    if (!src) continue;
    // Prefer product/gallery hints.
    const altMatch = tag.match(/\balt=["']([^"']*)["']/i);
    const alt = altMatch?.[1] ?? "";
    const looksGallery =
      /product|gallery|detail|pdp|zoom|photo|imagen|foto/i.test(alt) ||
      /product|gallery|detail|pdp|zoom/i.test(tag);
    if (!looksGallery && out.length > 6) continue; // avoid junk banners past the main set
    push(src);
    if (out.length >= 12) break;
  }

  // 3. srcset/imagesets on <source> and <link rel="preload" as="image">.
  const preloadImg = html.match(/<link[^>]+rel=["']preload["'][^>]+as=["']image["'][^>]+href=["']([^"']+)["']/i);
  if (preloadImg?.[1]) push(preloadImg[1]);

  return out;
}

function readVariantsFromSelects(html: string): RichVariant[] {
  // Matches <select name="option[color]" ...> ... <option value="...">Label</option> ... </select>
  const selects = html.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi);
  const variantOptions: Array<{ key: string; values: { value: string; label: string }[] }> = [];

  for (const match of selects) {
    const attrs = match[1];
    const inner = match[2];
    // Name / id that hints at a product option.
    const nameAttr =
      attrs.match(/\bname=["']([^"']+)["']/i)?.[1] ??
      attrs.match(/\bid=["']([^"']+)["']/i)?.[1] ??
      attrs.match(/\bdata-option=["']([^"']+)["']/i)?.[1] ??
      "";
    const nameL = nameAttr.toLowerCase();
    if (!/(option|variant|color|colour|size|talle|medida|capacidad|memor|model)/i.test(nameL)) continue;

    const key = normalizeOptionKey(nameL);
    const options = [...inner.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)];
    const values: { value: string; label: string }[] = [];
    for (const opt of options) {
      const optAttrs = opt[1];
      const valueAttr = optAttrs.match(/\bvalue=["']([^"']*)["']/i)?.[1] ?? "";
      const disabled = /\bdisabled\b/i.test(optAttrs);
      const label = stripTags(opt[2]).trim();
      if (!label || !valueAttr) continue;
      if (disabled) continue;
      // Skip common placeholders.
      if (/^(elige|seleccion(a|á|e)|select|choose|-+)/i.test(label)) continue;
      values.push({ value: valueAttr, label });
    }
    if (values.length > 0) variantOptions.push({ key, values });
  }

  if (variantOptions.length === 0) return [];

  // Build variants: single-dimension → one variant per value; two+
  // dimensions → skip (would invent cartesian products; we refuse).
  if (variantOptions.length === 1) {
    const [group] = variantOptions;
    return group.values.map((v) => ({
      title: v.label,
      optionValues: { [group.key]: v.label },
    }));
  }

  // Multi-dimensional: surface each dimension's values as attributes
  // instead of inventing cross-products. Return empty variants.
  return [];
}

function readAttributesFromHtml(html: string): SupplierProductAttribute[] {
  const out: SupplierProductAttribute[] = [];
  const seen = new Set<string>();
  const push = (key: string, value: string) => {
    const keyClean = key.trim();
    const valueClean = value.trim();
    if (!keyClean || !valueClean) return;
    const keyLc = keyClean.toLowerCase();
    if (seen.has(keyLc)) return;
    seen.add(keyLc);
    out.push({ key: keyClean.slice(0, 80), value: valueClean.slice(0, 200) });
  };

  // Spec tables: <table>…<tr><th>key</th><td>value</td></tr>…
  const tables = html.matchAll(/<table\b([^>]*)>([\s\S]*?)<\/table>/gi);
  for (const table of tables) {
    const tableAttrs = table[1];
    if (!/spec|ficha|technical|datos|caracter|detail/i.test(tableAttrs + " " + (table[0].match(/<caption[^>]*>([\s\S]*?)<\/caption>/i)?.[1] ?? ""))) {
      // Not obviously a spec table; still try rows but only push to out
      // if the row really reads like key/value (and we haven't reached
      // a reasonable cap).
    }
    const rows = table[2].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi);
    for (const row of rows) {
      const th = row[1].match(/<th\b[^>]*>([\s\S]*?)<\/th>/i);
      const td = row[1].match(/<td\b[^>]*>([\s\S]*?)<\/td>/i);
      if (th?.[1] && td?.[1]) {
        push(stripTags(th[1]), stripTags(td[1]));
        if (out.length >= 40) break;
      }
    }
    if (out.length >= 40) break;
  }

  // Definition lists: <dl><dt>key</dt><dd>value</dd></dl>
  if (out.length < 40) {
    const dls = html.matchAll(/<dl\b[^>]*>([\s\S]*?)<\/dl>/gi);
    for (const dl of dls) {
      const dts = [...dl[1].matchAll(/<dt\b[^>]*>([\s\S]*?)<\/dt>/gi)];
      const dds = [...dl[1].matchAll(/<dd\b[^>]*>([\s\S]*?)<\/dd>/gi)];
      const pairs = Math.min(dts.length, dds.length);
      for (let i = 0; i < pairs; i++) {
        push(stripTags(dts[i][1]), stripTags(dds[i][1]));
        if (out.length >= 40) break;
      }
      if (out.length >= 40) break;
    }
  }

  return out;
}

function readBreadcrumbsFromHtml(html: string): string[] {
  // <nav class*="breadcrumb" ...> or <ol class*="breadcrumb" ...>
  const m = html.match(
    /<(?:nav|ol|ul)\b[^>]*class=["'][^"']*\bbreadcrumb\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:nav|ol|ul)>/i,
  );
  if (!m) return [];
  const inner = m[1];
  const items = [...inner.matchAll(/<(?:li|a|span)\b[^>]*>([\s\S]*?)<\/(?:li|a|span)>/gi)];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const text = stripTags(it[1]).replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (/^(home|inicio|›|>|»|\/|-)/i.test(text)) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= 8) break;
  }
  return out;
}

function extractCanonicalUrl(html: string): string | null {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  return m?.[1] ? decodeHtmlEntities(m[1]) : null;
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " "));
}

function normalizeOptionKey(raw: string): string {
  if (/color|colour/.test(raw)) return "color";
  if (/talle|size|medida/.test(raw)) return "size";
  if (/capacidad|memor|storage/.test(raw)) return "capacity";
  if (/material/.test(raw)) return "material";
  if (/model/.test(raw)) return "model";
  // Fallback: strip non-alnum and keep a short key.
  return raw.replace(/[^a-z0-9]+/g, "").slice(0, 20) || "option";
}

// ─── Shared entry point for ANY HTML page that may be a PDP ──────────────
// Before this helper existed, sitemap / html-catalog / direct-structured-
// data paths all called extractStructuredDataFromHtml — which returns only
// JSON-LD and OpenGraph fallback. Embedded JSON, microdata, heuristic
// HTML, compare-at prices, option-select variants, spec tables,
// breadcrumbs and identifiers were silently dropped for every product
// discovered via sitemap / catalog crawl.
//
// This helper unifies the surface: if the page exposes a single Product
// (the common case for a PDP linked from a listing), the full 5-layer
// rich pipeline runs and the resulting SupplierProductInput carries the
// same richness as a directly-pasted PDP URL. If the page exposes
// multiple distinct JSON-LD Product nodes (actual listing page), the
// legacy multi-product behavior is preserved — merging rich layers
// across several products at once would be ambiguous.
//
// The function is intentionally domain-agnostic: zero hardcoded hosts,
// all decisions come from schema.org / microdata / OpenGraph signals
// present in the HTML.
export function extractProductsFromHtmlPage(
  html: string,
  sourceUrl: string,
): SupplierProductInput[] {
  const legacyMulti = extractStructuredDataFromHtml(html, sourceUrl);

  // Multi-product listing page → keep legacy behavior.
  if (legacyMulti.length > 1) return legacyMulti;

  // Single-product case (or no JSON-LD at all) → run the rich pipeline.
  const rich = extractSingleProductFromHtml(html, sourceUrl);
  if (rich.product) return [rich.product];

  // Rich pipeline found no title — fall back to whatever legacy produced
  // (which is either 0 or 1 item from OpenGraph product meta).
  return legacyMulti;
}
