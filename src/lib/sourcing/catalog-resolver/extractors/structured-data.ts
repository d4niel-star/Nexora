import type {
  SupplierAvailability,
  SupplierProductAttribute,
  SupplierProductInput,
} from "../../import-parsers";
import {
  absoluteUrl,
  collectProductNodes,
  extractJsonLdBlocks,
  extractMetaContent,
  extractPageTitle,
} from "../html-utils";
import { parsePriceText, toSupplierProduct, type RawProductCandidate } from "../normalize";
import type { RichCandidate, RichVariant } from "../rich-candidate";

// ─── Structured data extractor ───────────────────────────────────────────
// Parses schema.org Product entries from HTML. Also handles OpenGraph
// product meta tags as a fallback for single product detail pages.

export function extractStructuredDataFromHtml(
  html: string,
  sourceUrl: string,
): SupplierProductInput[] {
  const out: SupplierProductInput[] = [];

  for (const block of extractJsonLdBlocks(html)) {
    for (const node of collectProductNodes(block)) {
      const product = jsonLdNodeToProduct(node, sourceUrl);
      if (product) out.push(product);
    }
  }

  if (out.length === 0) {
    const og = ogProductFromHtml(html, sourceUrl);
    if (og) out.push(og);
  }

  return out;
}

function jsonLdNodeToProduct(
  node: Record<string, unknown>,
  sourceUrl: string,
): SupplierProductInput | null {
  const title = pickString(node.name) ?? pickString(node.title);
  if (!title) return null;

  const offers = node.offers;
  const { priceNumber, priceText, currency } = readOffers(offers);
  const images = readImages(node.image, sourceUrl);

  const candidate: RawProductCandidate = {
    externalId:
      pickString(node.sku) ??
      pickString(node.mpn) ??
      pickString(node.productID) ??
      pickString((node as { identifier?: unknown }).identifier) ??
      "",
    title,
    description: pickString(node.description),
    category: readCategory(node.category),
    priceNumber,
    priceText,
    currency,
    images,
    sourceUrl: pickString(node.url) ?? sourceUrl,
    sku: pickString(node.sku) ?? null,
    brand: readBrand(node.brand),
    stock: readAvailabilityStock(offers),
  };
  return toSupplierProduct(candidate);
}

function ogProductFromHtml(html: string, sourceUrl: string): SupplierProductInput | null {
  const ogType = extractMetaContent(html, "og:type");
  const title = extractMetaContent(html, "og:title") ?? extractPageTitle(html);
  if (!title) return null;
  // Only accept when OG explicitly declares a product, to avoid treating
  // every homepage as a product.
  if (!ogType || !/product/i.test(ogType)) return null;

  const priceText =
    extractMetaContent(html, "product:price:amount") ??
    extractMetaContent(html, "og:price:amount");
  const currency =
    extractMetaContent(html, "product:price:currency") ??
    extractMetaContent(html, "og:price:currency");
  const description = extractMetaContent(html, "og:description");
  const image = extractMetaContent(html, "og:image");

  const candidate: RawProductCandidate = {
    externalId: "",
    title,
    description,
    priceText,
    currency,
    images: image ? [image] : [],
    sourceUrl,
  };
  return toSupplierProduct(candidate);
}

function readOffers(offers: unknown): {
  priceNumber: number | null;
  priceText: string | null;
  currency: string | null;
} {
  if (!offers) return { priceNumber: null, priceText: null, currency: null };
  const node = Array.isArray(offers) ? offers[0] : offers;
  if (!node || typeof node !== "object") return { priceNumber: null, priceText: null, currency: null };
  const obj = node as Record<string, unknown>;
  const price =
    pickNumberLike(obj.price) ??
    pickNumberLike(obj.lowPrice) ??
    pickNumberLike((obj.priceSpecification as Record<string, unknown> | undefined)?.price);
  const currency =
    pickString(obj.priceCurrency) ??
    pickString((obj.priceSpecification as Record<string, unknown> | undefined)?.priceCurrency) ??
    null;
  return {
    priceNumber: typeof price === "number" ? price : null,
    priceText: typeof price === "string" ? price : null,
    currency,
  };
}

function readAvailabilityStock(offers: unknown): number | null {
  if (!offers) return null;
  const node = Array.isArray(offers) ? offers[0] : offers;
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  const availability = pickString(obj.availability) ?? "";
  if (/InStock/i.test(availability)) return 1;
  if (/OutOfStock/i.test(availability)) return 0;
  return null;
}

function readBrand(brand: unknown): string | null {
  if (!brand) return null;
  if (typeof brand === "string") return brand;
  if (typeof brand === "object") {
    const name = (brand as Record<string, unknown>).name;
    if (typeof name === "string") return name;
  }
  return null;
}

function readCategory(category: unknown): string | null {
  if (!category) return null;
  if (typeof category === "string") return category;
  if (Array.isArray(category)) {
    const first = category.find((v) => typeof v === "string");
    return typeof first === "string" ? first : null;
  }
  return null;
}

function readImages(image: unknown, base: string): string[] {
  const out: string[] = [];
  const push = (value: unknown) => {
    if (typeof value === "string") {
      const abs = absoluteUrl(value, base);
      if (abs) out.push(abs);
    } else if (value && typeof value === "object") {
      const url = (value as Record<string, unknown>).url;
      if (typeof url === "string") {
        const abs = absoluteUrl(url, base);
        if (abs) out.push(abs);
      }
    }
  };
  if (Array.isArray(image)) image.forEach(push);
  else push(image);
  return out;
}

function pickString(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);
  return null;
}

function pickNumberLike(value: unknown): number | string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") return value;
  return null;
}

// ─── Deep JSON-LD → RichCandidate extraction ─────────────────────────────
// Returns one RichCandidate per distinct Product node found in the page.
// Reads all the schema.org fields we can exploit downstream: multiple
// offers (as variants), hasVariant children, additionalProperty (as
// attributes), gtin/mpn/productID, aggregateOffer, priceSpecification
// (for compare-at), and a sibling BreadcrumbList for category/path.

export function extractRichFromJsonLd(
  html: string,
  sourceUrl: string,
): RichCandidate[] {
  const blocks = extractJsonLdBlocks(html);
  const productNodes: Record<string, unknown>[] = [];
  for (const block of blocks) {
    for (const node of collectProductNodes(block)) productNodes.push(node);
  }

  const breadcrumbs = extractBreadcrumbsFromJsonLd(blocks);

  const out: RichCandidate[] = [];
  for (const node of productNodes) {
    const cand = jsonLdNodeToRich(node, sourceUrl);
    if (cand) {
      if (breadcrumbs && breadcrumbs.length > 0 && !cand.breadcrumbs) {
        cand.breadcrumbs = breadcrumbs;
      }
      out.push(cand);
    }
  }
  return out;
}

export function extractRichFromOpenGraph(
  html: string,
  sourceUrl: string,
): RichCandidate | null {
  const ogType = extractMetaContent(html, "og:type");
  if (!ogType || !/product/i.test(ogType)) return null;

  const title = extractMetaContent(html, "og:title") ?? extractPageTitle(html);
  if (!title) return null;

  const priceText =
    extractMetaContent(html, "product:price:amount") ??
    extractMetaContent(html, "og:price:amount");
  const price = priceText ? parseNumberLoose(priceText) : null;
  const currency =
    extractMetaContent(html, "product:price:currency") ??
    extractMetaContent(html, "og:price:currency") ??
    null;
  const description = extractMetaContent(html, "og:description");
  const image = extractMetaContent(html, "og:image");
  const brand = extractMetaContent(html, "product:brand") ?? extractMetaContent(html, "og:brand");

  return {
    source: "opengraph",
    confidence: 50,
    sourceUrl,
    title,
    description,
    brand,
    price,
    currency: currency ? currency.toUpperCase() : null,
    images: image ? [image] : undefined,
  };
}

function jsonLdNodeToRich(
  node: Record<string, unknown>,
  sourceUrl: string,
): RichCandidate | null {
  const title = pickString(node.name) ?? pickString(node.title);
  if (!title) return null;

  const offers = node.offers;
  const allOffers = collectOfferNodes(offers);
  const primaryOffer = allOffers[0];

  // Price aggregation — prefer explicit offer.price; fallback to
  // aggregateOffer.lowPrice so price ranges still surface.
  const { price, compareAtPrice, currency, availability, stockQuantity } =
    summarizeOffers(allOffers);

  const images = collectImages(node.image, sourceUrl);
  const category = readCategoryDeep(node.category);
  const brand = readBrand(node.brand);
  const description = pickString(node.description);
  const sku = pickString(node.sku);
  const mpn = pickString(node.mpn);
  const gtin =
    pickString((node as { gtin13?: unknown }).gtin13) ??
    pickString((node as { gtin14?: unknown }).gtin14) ??
    pickString((node as { gtin12?: unknown }).gtin12) ??
    pickString((node as { gtin8?: unknown }).gtin8) ??
    pickString(node.gtin);
  const productID = pickString(node.productID);
  const canonicalUrl = pickString(node.url);

  const attributes = readAdditionalProperty(node.additionalProperty);
  const variants = readVariants({
    node,
    hasVariant: (node as { hasVariant?: unknown }).hasVariant,
    offers: allOffers,
    primaryOffer,
    sourceUrl,
  });

  // Parent-price aggregation: when the JSON-LD Product has no direct
  // offers but exposes children via hasVariant, the parent price is the
  // minimum variant price (so catalog/list UIs can show "desde X").
  // compareAtPrice follows the same rule using the max variant compareAt.
  let effectivePrice = price;
  let effectiveCompareAt = compareAtPrice;
  let effectiveCurrency = currency;
  let effectiveAvailability = availability;
  if (effectivePrice == null && variants.length > 0) {
    const variantPrices = variants
      .map((v) => v.price)
      .filter((p): p is number => typeof p === "number" && Number.isFinite(p));
    if (variantPrices.length > 0) effectivePrice = Math.min(...variantPrices);
  }
  if (effectiveCompareAt == null && variants.length > 0) {
    const variantCompares = variants
      .map((v) => v.compareAtPrice)
      .filter((p): p is number => typeof p === "number" && Number.isFinite(p));
    if (variantCompares.length > 0) effectiveCompareAt = Math.max(...variantCompares);
  }
  if (!effectiveCurrency && variants.length > 0) {
    // schema.org doesn't guarantee priceCurrency on children distinct from
    // parent, but some feeds only set it on the children's offers.
    const offerCurrency = primaryOffer ? pickString(primaryOffer.priceCurrency) : null;
    if (offerCurrency) effectiveCurrency = offerCurrency.toUpperCase();
  }
  if (!effectiveAvailability && variants.some((v) => v.availability === "in_stock")) {
    effectiveAvailability = "in_stock";
  }

  return {
    source: "structured-data",
    confidence: 90,
    sourceUrl,
    title,
    description,
    brand,
    category,
    canonicalUrl,
    price: effectivePrice,
    compareAtPrice: effectiveCompareAt,
    currency: effectiveCurrency,
    sku,
    mpn,
    gtin,
    productID,
    availability: effectiveAvailability,
    stockQuantity,
    images: images.length > 0 ? images : undefined,
    attributes: attributes.length > 0 ? attributes : undefined,
    variants: variants.length > 0 ? variants : undefined,
  };
}

// ─── Helpers for deep extraction ─────────────────────────────────────────

function collectOfferNodes(offers: unknown): Record<string, unknown>[] {
  if (!offers) return [];
  if (Array.isArray(offers)) {
    return offers.filter((o): o is Record<string, unknown> => !!o && typeof o === "object");
  }
  if (typeof offers === "object") {
    const node = offers as Record<string, unknown>;
    // schema.org AggregateOffer may have an offers[] subproperty with all
    // the individual offers.
    const typeStr = pickString(node["@type"]) ?? "";
    if (/AggregateOffer/i.test(typeStr) && Array.isArray(node.offers)) {
      return (node.offers as unknown[]).filter(
        (o): o is Record<string, unknown> => !!o && typeof o === "object",
      );
    }
    return [node];
  }
  return [];
}

interface OfferSummary {
  price: number | null;
  compareAtPrice: number | null;
  currency: string | null;
  availability: SupplierAvailability | undefined;
  stockQuantity: number | null;
}

function summarizeOffers(offers: Record<string, unknown>[]): OfferSummary {
  let price: number | null = null;
  let compareAtPrice: number | null = null;
  let currency: string | null = null;
  let availability: SupplierAvailability | undefined;
  let stockQuantity: number | null = null;

  for (const offer of offers) {
    const offerPrice = extractOfferPrice(offer);
    if (offerPrice != null && price == null) price = offerPrice;
    const offerCompare = extractOfferCompareAt(offer);
    if (offerCompare != null && compareAtPrice == null) compareAtPrice = offerCompare;
    const offerCurrency = pickString(offer.priceCurrency);
    if (offerCurrency && !currency) currency = offerCurrency.toUpperCase();

    const availText = pickString(offer.availability) ?? "";
    if (/InStock/i.test(availText) && availability !== "in_stock") availability = "in_stock";
    else if (/OutOfStock/i.test(availText) && !availability) availability = "out_of_stock";

    const qty = pickNumberLike((offer as { inventoryLevel?: unknown }).inventoryLevel);
    if (typeof qty === "number" && stockQuantity == null) stockQuantity = Math.floor(qty);
  }

  // AggregateOffer fallbacks: price may live on a top-level lowPrice/highPrice.
  if (price == null && offers.length === 1) {
    const aggr = offers[0];
    const low = parseNumberLoose(pickNumberLike(aggr.lowPrice));
    if (low !== null) price = low;
  }

  return { price, compareAtPrice, currency, availability, stockQuantity };
}

function extractOfferPrice(offer: Record<string, unknown>): number | null {
  const direct = parseNumberLoose(pickNumberLike(offer.price));
  if (direct !== null) return direct;
  const spec = offer.priceSpecification;
  if (Array.isArray(spec)) {
    for (const node of spec) {
      if (node && typeof node === "object") {
        const sp = parseNumberLoose(pickNumberLike((node as Record<string, unknown>).price));
        if (sp !== null) return sp;
      }
    }
  } else if (spec && typeof spec === "object") {
    const sp = parseNumberLoose(pickNumberLike((spec as Record<string, unknown>).price));
    if (sp !== null) return sp;
  }
  return null;
}

function extractOfferCompareAt(offer: Record<string, unknown>): number | null {
  // schema.org pattern: priceSpecification includes both SalePrice and
  // ListPrice / ReferencePrice. Prefer explicit reference/list labels.
  const spec = offer.priceSpecification;
  const candidates: Record<string, unknown>[] = [];
  if (Array.isArray(spec)) {
    for (const s of spec) if (s && typeof s === "object") candidates.push(s as Record<string, unknown>);
  } else if (spec && typeof spec === "object") {
    candidates.push(spec as Record<string, unknown>);
  }
  for (const node of candidates) {
    const typeStr = pickString(node["@type"]) ?? "";
    if (/(ListPrice|ReferencePrice|StrikethroughPrice|SuggestedRetailPrice)/i.test(typeStr)) {
      const v = parseNumberLoose(pickNumberLike(node.price));
      if (v !== null) return v;
    }
  }
  // Fallback: some feeds use `priceCurrency` only on the list price and
  // report it as `listPrice` at the offer root.
  const listPrice = parseNumberLoose(
    pickNumberLike((offer as { listPrice?: unknown }).listPrice) ??
      pickNumberLike((offer as { priceValidUntil?: unknown; regularPrice?: unknown }).regularPrice),
  );
  return listPrice ?? null;
}

function collectImages(image: unknown, sourceUrl: string): string[] {
  const out: string[] = [];
  const push = (value: unknown) => {
    if (typeof value === "string") {
      const abs = absoluteUrl(value, sourceUrl);
      if (abs) out.push(abs);
    } else if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      const url =
        pickString(obj.url) ??
        pickString(obj.contentUrl) ??
        pickString(obj.src);
      if (url) {
        const abs = absoluteUrl(url, sourceUrl);
        if (abs) out.push(abs);
      }
    }
  };
  if (Array.isArray(image)) image.forEach(push);
  else push(image);
  // Dedupe preserving order.
  return Array.from(new Set(out));
}

function readCategoryDeep(category: unknown): string | null {
  if (!category) return null;
  if (typeof category === "string") return category;
  if (Array.isArray(category)) {
    // Preserve deepest category when breadcrumb-like arrays are supplied.
    const strings = category.filter((v): v is string => typeof v === "string");
    if (strings.length > 0) return strings.join(" > ");
  }
  if (typeof category === "object") {
    const name = (category as Record<string, unknown>).name;
    if (typeof name === "string") return name;
  }
  return null;
}

function readAdditionalProperty(value: unknown): SupplierProductAttribute[] {
  if (!Array.isArray(value)) return [];
  const out: SupplierProductAttribute[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const obj = entry as Record<string, unknown>;
    const key = pickString(obj.name) ?? pickString(obj.propertyID);
    const rawValue = obj.value;
    const valueStr =
      typeof rawValue === "string"
        ? rawValue
        : typeof rawValue === "number"
          ? String(rawValue)
          : typeof rawValue === "boolean"
            ? (rawValue ? "Sí" : "No")
            : null;
    if (!key || !valueStr) continue;
    out.push({ key: key.trim().slice(0, 80), value: valueStr.trim().slice(0, 200) });
  }
  return out;
}

function readVariants(ctx: {
  node: Record<string, unknown>;
  hasVariant: unknown;
  offers: Record<string, unknown>[];
  primaryOffer: Record<string, unknown> | undefined;
  sourceUrl: string;
}): RichVariant[] {
  const out: RichVariant[] = [];
  const seen = new Set<string>();

  // 1. hasVariant → schema.org child products with their own offers/SKU.
  if (Array.isArray(ctx.hasVariant)) {
    for (const child of ctx.hasVariant) {
      if (!child || typeof child !== "object") continue;
      const childObj = child as Record<string, unknown>;
      const childOffers = collectOfferNodes(childObj.offers);
      const summary = summarizeOffers(childOffers);
      const optionValues = readOptionValuesFromNode(childObj);
      const title =
        pickString(childObj.name) ??
        formatOptionLabel(optionValues) ??
        pickString(childObj.sku) ??
        null;
      const key = variantKey({ sku: pickString(childObj.sku), optionValues, title });
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        title,
        optionValues: Object.keys(optionValues).length > 0 ? optionValues : undefined,
        sku: pickString(childObj.sku),
        externalId: pickString(childObj.productID) ?? pickString(childObj.sku),
        price: summary.price,
        compareAtPrice: summary.compareAtPrice,
        availability: summary.availability,
        image: collectImages(childObj.image, ctx.sourceUrl)[0] ?? null,
      });
    }
  }

  // 2. Multiple offers → one variant per offer (common on Shopify feeds
  //    that expose one Offer per size/color without a hasVariant tree).
  if (out.length === 0 && ctx.offers.length > 1) {
    for (const offer of ctx.offers) {
      const summary = summarizeOffers([offer]);
      const sku = pickString(offer.sku);
      const itemOffered = offer.itemOffered;
      const optionValues =
        itemOffered && typeof itemOffered === "object"
          ? readOptionValuesFromNode(itemOffered as Record<string, unknown>)
          : {};
      const offerName =
        (itemOffered && typeof itemOffered === "object"
          ? pickString((itemOffered as Record<string, unknown>).name)
          : null) ?? pickString(offer.name);
      const title = offerName ?? formatOptionLabel(optionValues) ?? sku ?? null;
      const key = variantKey({ sku, optionValues, title });
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        title,
        optionValues: Object.keys(optionValues).length > 0 ? optionValues : undefined,
        sku,
        price: summary.price,
        compareAtPrice: summary.compareAtPrice,
        availability: summary.availability,
      });
    }
  }

  return out;
}

function readOptionValuesFromNode(obj: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  const color = pickString(obj.color);
  if (color) out.color = color;
  const size = pickString(obj.size);
  if (size) out.size = size;
  const material = pickString(obj.material);
  if (material) out.material = material;
  const pattern = pickString(obj.pattern);
  if (pattern) out.pattern = pattern;
  const capacity =
    pickString((obj as { capacity?: unknown }).capacity) ??
    pickString((obj as { memory?: unknown }).memory);
  if (capacity) out.capacity = capacity;
  return out;
}

function formatOptionLabel(values: Record<string, string>): string | null {
  const entries = Object.values(values).filter((v) => v.trim().length > 0);
  return entries.length > 0 ? entries.join(" / ") : null;
}

function variantKey(v: {
  sku?: string | null;
  optionValues: Record<string, string>;
  title?: string | null;
}): string {
  if (v.sku) return `sku:${v.sku.toLowerCase()}`;
  const keys = Object.keys(v.optionValues);
  if (keys.length > 0) {
    return `opts:${keys.sort().map((k) => `${k}=${v.optionValues[k]}`).join("|").toLowerCase()}`;
  }
  return `title:${(v.title ?? "").toLowerCase()}`;
}

function extractBreadcrumbsFromJsonLd(blocks: unknown[]): string[] | null {
  for (const block of blocks) {
    const list = findBreadcrumbListNode(block);
    if (!list) continue;
    const items = (list as Record<string, unknown>).itemListElement;
    if (!Array.isArray(items)) continue;
    const names: string[] = [];
    for (const entry of items) {
      if (!entry || typeof entry !== "object") continue;
      const item = (entry as Record<string, unknown>).item;
      const fallbackName = pickString((entry as Record<string, unknown>).name);
      let name: string | null = null;
      if (item && typeof item === "object") {
        name = pickString((item as Record<string, unknown>).name);
      }
      const finalName = name ?? fallbackName;
      if (finalName) names.push(finalName);
    }
    if (names.length > 0) return names;
  }
  return null;
}

function findBreadcrumbListNode(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findBreadcrumbListNode(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const typeStr = pickString(obj["@type"]) ?? "";
  if (/BreadcrumbList/i.test(typeStr)) return obj;
  const graph = obj["@graph"];
  if (Array.isArray(graph)) {
    for (const node of graph) {
      const found = findBreadcrumbListNode(node);
      if (found) return found;
    }
  }
  return null;
}

function parseNumberLoose(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value !== "string") return null;
  return parsePriceText(value);
}
