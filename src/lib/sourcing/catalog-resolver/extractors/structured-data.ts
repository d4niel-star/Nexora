import type { SupplierProductInput } from "../../import-parsers";
import {
  absoluteUrl,
  collectProductNodes,
  extractJsonLdBlocks,
  extractMetaContent,
  extractPageTitle,
} from "../html-utils";
import { toSupplierProduct, type RawProductCandidate } from "../normalize";

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
