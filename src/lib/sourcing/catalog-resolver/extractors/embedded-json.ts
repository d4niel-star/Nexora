import type { SupplierAvailability, SupplierProductAttribute } from "../../import-parsers";
import { absoluteUrl } from "../html-utils";
import { parsePriceText } from "../normalize";
import type { RichCandidate, RichVariant } from "../rich-candidate";

// ─── Embedded-JSON extractor ─────────────────────────────────────────────
// Modern e-commerce sites often dump a full product payload in a <script>
// tag so the client-side app can hydrate immediately. We try to recover
// that payload without running the JS. Sites we cover without hardcoding:
//
//   - window.__NEXT_DATA__ / <script id="__NEXT_DATA__">
//       (Next.js pages on many Vercel / self-hosted stores)
//   - window.__NUXT__ = (function(){...})()
//       (Nuxt 3 / Nuxt-powered storefronts)
//   - window.__APOLLO_STATE__ = {...}
//       (Apollo-backed SPAs)
//   - window.__INITIAL_STATE__ = {...}
//       (Redux SSR, Vuex SSR)
//   - meta: { product: {...} }  /  ShopifyAnalytics.meta.product
//       (Shopify themes)
//   - var dataLayer = [{...}] with ecommerce.detail.products
//       (GTM / GA4 datalayer)
//
// Approach: walk the HTML's <script> nodes, find the first block that
// parses as JSON (or JS literal we can safely coerce to JSON via a
// bracket-balanced extraction), then search that tree for a node that
// looks like a product (has a name/title plus any of price/sku/variants).
//
// Never runs dynamic code; we only scan strings and balanced braces.

export function extractRichFromEmbeddedJson(
  html: string,
  sourceUrl: string,
): RichCandidate | null {
  const payloads = collectEmbeddedPayloads(html);
  for (const payload of payloads) {
    const product = findProductNodeInTree(payload);
    if (!product) continue;
    const cand = embeddedNodeToRich(product, sourceUrl);
    if (cand && cand.title) return cand;
  }
  return null;
}

// ─── Payload collectors ──────────────────────────────────────────────────

function collectEmbeddedPayloads(html: string): unknown[] {
  const out: unknown[] = [];

  // 1. Typed JSON scripts (the cleanest source).
  const typedJsonRe =
    /<script\b[^>]*type=["'](?:application\/json|application\/ld\+json)["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = typedJsonRe.exec(html))) {
    const raw = m[1].trim();
    if (!raw) continue;
    const parsed = safeParseJson(raw);
    if (parsed !== undefined) out.push(parsed);
  }

  // 2. Well-known inline assignments. We use balanced-brace extraction so
  //    we don't greedily consume the rest of the page when the assignment
  //    is followed by other statements.
  const assignments: RegExp[] = [
    /window\.__NEXT_DATA__\s*=\s*/,
    /window\.__NUXT__\s*=\s*/,
    /window\.__APOLLO_STATE__\s*=\s*/,
    /window\.__INITIAL_STATE__\s*=\s*/,
    /window\.__STATE__\s*=\s*/,
    /var\s+dataLayer\s*=\s*/,
    /ShopifyAnalytics\.meta\s*=\s*/,
  ];
  for (const re of assignments) {
    const match = re.exec(html);
    if (!match) continue;
    const startIndex = match.index + match[0].length;
    const extracted = extractBalancedBlock(html, startIndex);
    if (!extracted) continue;
    const parsed = safeParseJson(extracted);
    if (parsed !== undefined) out.push(parsed);
  }

  // 3. Shopify product JSON often arrives as a standalone script tag:
  //    <script id="ProductJson-...">{...}</script>
  const idJsonRe = /<script\b[^>]*id=["'][^"']*Product[^"']*["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = idJsonRe.exec(html))) {
    const raw = m[1].trim();
    if (!raw) continue;
    const parsed = safeParseJson(raw);
    if (parsed !== undefined) out.push(parsed);
  }

  return out;
}

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Try to recover from leading/trailing junk: many inline assignments
    // look like `{...};` or `(function(){return {...}}())`. We attempt to
    // isolate the first balanced object.
    const start = text.indexOf("{");
    if (start < 0) return undefined;
    const balanced = extractBalancedBlock(text, start);
    if (!balanced) return undefined;
    try {
      return JSON.parse(balanced);
    } catch {
      return undefined;
    }
  }
}

/**
 * Walks `text` starting at `startIndex` and returns the first balanced
 * JSON object or array (string-aware). Returns null if not found or the
 * walker exhausts without closing the opening bracket.
 *
 * We cap the walk at 1.5MB to stay within our budget.maxBodyBytes and to
 * avoid accidental quadratic behavior on malformed inputs.
 */
function extractBalancedBlock(text: string, startIndex: number): string | null {
  // Skip whitespace.
  let i = startIndex;
  while (i < text.length && /\s/.test(text[i])) i++;
  const openChar = text[i];
  if (openChar !== "{" && openChar !== "[") return null;
  const closeChar = openChar === "{" ? "}" : "]";

  let depth = 0;
  let inString = false;
  let escape = false;
  const cap = Math.min(text.length, i + 1_500_000);

  for (let j = i; j < cap; j++) {
    const ch = text[j];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) return text.slice(i, j + 1);
    }
  }
  return null;
}

// ─── Product node discovery ──────────────────────────────────────────────

function findProductNodeInTree(tree: unknown): Record<string, unknown> | null {
  const stack: unknown[] = [tree];
  const seen = new WeakSet<object>();
  let depth = 0;
  while (stack.length > 0 && depth < 50_000) {
    const current = stack.pop();
    depth++;
    if (!current || typeof current !== "object") continue;
    if (seen.has(current as object)) continue;
    seen.add(current as object);

    if (Array.isArray(current)) {
      for (const item of current) stack.push(item);
      continue;
    }

    const obj = current as Record<string, unknown>;
    if (looksLikeProductNode(obj)) return obj;

    // Heuristic shortcuts: Next.js wraps in pageProps.product, etc.
    const preferredKeys = [
      "product",
      "productData",
      "productDetail",
      "selectedProduct",
      "item",
    ];
    for (const key of preferredKeys) {
      if (obj[key] && typeof obj[key] === "object") stack.push(obj[key]);
    }

    for (const value of Object.values(obj)) {
      if (value && typeof value === "object") stack.push(value);
    }
  }
  return null;
}

function looksLikeProductNode(obj: Record<string, unknown>): boolean {
  const hasTitle =
    typeof obj.name === "string" || typeof obj.title === "string" || typeof obj.productName === "string";
  if (!hasTitle) return false;

  const hasPriceIsh =
    obj.price !== undefined ||
    obj.offers !== undefined ||
    obj.variants !== undefined ||
    obj.skus !== undefined ||
    obj.sellers !== undefined ||
    (typeof obj.priceInfo === "object" && obj.priceInfo !== null);
  const hasSku = typeof obj.sku === "string" || typeof obj.id === "string" || typeof obj.productId === "string";
  return hasPriceIsh || hasSku;
}

function embeddedNodeToRich(
  node: Record<string, unknown>,
  sourceUrl: string,
): RichCandidate | null {
  const title = pickString(node.name) ?? pickString(node.title) ?? pickString(node.productName);
  if (!title) return null;

  const priceFields: unknown[] = [
    node.price,
    (node as { priceInfo?: { price?: unknown } }).priceInfo?.price,
    (node as { priceInfo?: { currentPrice?: unknown } }).priceInfo?.currentPrice,
    (node as { pricing?: { price?: unknown } }).pricing?.price,
    (node as { salePrice?: unknown }).salePrice,
  ];
  let price: number | null = null;
  for (const v of priceFields) {
    const n = parseNumberLoose(v);
    if (n !== null) {
      price = n;
      break;
    }
  }

  const compareCandidates: unknown[] = [
    (node as { compareAtPrice?: unknown }).compareAtPrice,
    (node as { listPrice?: unknown }).listPrice,
    (node as { originalPrice?: unknown }).originalPrice,
    (node as { priceInfo?: { listPrice?: unknown } }).priceInfo?.listPrice,
    (node as { priceInfo?: { originalPrice?: unknown } }).priceInfo?.originalPrice,
  ];
  let compareAtPrice: number | null = null;
  for (const v of compareCandidates) {
    const n = parseNumberLoose(v);
    if (n !== null && (price === null || n > price)) {
      compareAtPrice = n;
      break;
    }
  }

  const currency =
    pickString(node.currency) ??
    pickString((node as { priceInfo?: { currency?: unknown } }).priceInfo?.currency) ??
    pickString((node as { currencyCode?: unknown }).currencyCode);

  const brand =
    pickString(node.brand) ??
    pickString((node as { brand?: { name?: unknown } }).brand?.name ?? undefined) ??
    pickString(node.vendor);

  const category =
    pickString(node.category) ??
    pickString((node as { categoryName?: unknown }).categoryName) ??
    pickString((node as { productType?: unknown }).productType) ??
    null;

  const description =
    pickString((node as { description?: unknown }).description) ??
    pickString((node as { descriptionHtml?: unknown }).descriptionHtml);

  const sku = pickString(node.sku) ?? pickString((node as { productReference?: unknown }).productReference);
  const productID =
    pickString((node as { id?: unknown }).id) ??
    pickString((node as { productId?: unknown }).productId) ??
    pickString((node as { productID?: unknown }).productID);

  const images = collectEmbeddedImages(node, sourceUrl);
  const variants = readEmbeddedVariants(node);
  const attributes = readEmbeddedAttributes(node);

  return {
    source: "embedded-json",
    confidence: 80,
    sourceUrl,
    title,
    description,
    brand,
    category,
    price,
    compareAtPrice,
    currency: currency ? currency.toUpperCase() : null,
    sku,
    productID,
    images: images.length > 0 ? images : undefined,
    variants: variants.length > 0 ? variants : undefined,
    attributes: attributes.length > 0 ? attributes : undefined,
  };
}

function collectEmbeddedImages(
  node: Record<string, unknown>,
  sourceUrl: string,
): string[] {
  const out: string[] = [];
  const pushUrl = (raw: string | null | undefined) => {
    if (!raw) return;
    const abs = absoluteUrl(raw, sourceUrl);
    if (abs) out.push(abs);
  };

  // Common shapes: image: string | string[] | {url|src|contentUrl},
  //                images: [string|{url|src}], featuredImage{src|url},
  //                media[].src (Shopify).
  const image = (node as { image?: unknown }).image;
  if (typeof image === "string") pushUrl(image);
  else if (Array.isArray(image)) {
    for (const it of image) {
      if (typeof it === "string") pushUrl(it);
      else if (it && typeof it === "object") {
        const o = it as Record<string, unknown>;
        pushUrl(pickString(o.url) ?? pickString(o.src) ?? pickString(o.contentUrl));
      }
    }
  }

  const images = (node as { images?: unknown }).images;
  if (Array.isArray(images)) {
    for (const it of images) {
      if (typeof it === "string") pushUrl(it);
      else if (it && typeof it === "object") {
        const o = it as Record<string, unknown>;
        pushUrl(pickString(o.url) ?? pickString(o.src) ?? pickString(o.contentUrl));
      }
    }
  }

  const featured = (node as { featuredImage?: unknown }).featuredImage;
  if (featured && typeof featured === "object") {
    const o = featured as Record<string, unknown>;
    pushUrl(pickString(o.src) ?? pickString(o.url));
  }

  const media = (node as { media?: unknown }).media;
  if (Array.isArray(media)) {
    for (const item of media) {
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        pushUrl(pickString(o.src) ?? pickString(o.url));
      }
    }
  }

  return Array.from(new Set(out));
}

function readEmbeddedVariants(node: Record<string, unknown>): RichVariant[] {
  const rawVariants =
    (node as { variants?: unknown }).variants ??
    (node as { skus?: unknown }).skus ??
    (node as { items?: unknown }).items;
  if (!Array.isArray(rawVariants)) return [];
  const out: RichVariant[] = [];
  for (const v of rawVariants) {
    if (!v || typeof v !== "object") continue;
    const obj = v as Record<string, unknown>;
    const title =
      pickString(obj.title) ??
      pickString(obj.name) ??
      pickString(obj.option1) ??
      null;
    const sku = pickString(obj.sku) ?? pickString(obj.itemId);
    const price = parseNumberLoose(obj.price);
    const compareAtPrice = parseNumberLoose(obj.compare_at_price ?? obj.compareAtPrice ?? obj.listPrice);
    const availability = readVariantAvailability(obj);
    const optionValues = readEmbeddedOptionValues(obj);
    out.push({
      title,
      sku,
      price,
      compareAtPrice,
      availability,
      optionValues: Object.keys(optionValues).length > 0 ? optionValues : undefined,
      externalId: sku ?? pickString(obj.id),
    });
  }
  return out;
}

function readVariantAvailability(obj: Record<string, unknown>): SupplierAvailability {
  const available = obj.available;
  if (typeof available === "boolean") return available ? "in_stock" : "out_of_stock";
  const inStock = obj.inStock;
  if (typeof inStock === "boolean") return inStock ? "in_stock" : "out_of_stock";
  const qty = parseNumberLoose(obj.inventory_quantity ?? obj.inventoryQuantity ?? obj.stock);
  if (qty !== null) return qty > 0 ? "in_stock" : "out_of_stock";
  return "unknown";
}

function readEmbeddedOptionValues(obj: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  // Shopify variants ship option1/option2/option3 plus an options[] array
  // on the parent product (we don't have it here) — we still extract the
  // raw values and label them position-wise.
  const keys: [string, string][] = [
    ["option1", "option1"],
    ["option2", "option2"],
    ["option3", "option3"],
    ["color", "color"],
    ["size", "size"],
    ["material", "material"],
  ];
  for (const [k, label] of keys) {
    const v = pickString((obj as Record<string, unknown>)[k]);
    if (v) out[label] = v;
  }
  return out;
}

function readEmbeddedAttributes(node: Record<string, unknown>): SupplierProductAttribute[] {
  const raw =
    (node as { specifications?: unknown }).specifications ??
    (node as { specs?: unknown }).specs ??
    (node as { attributes?: unknown }).attributes ??
    (node as { properties?: unknown }).properties;
  if (!Array.isArray(raw)) return [];
  const out: SupplierProductAttribute[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const obj = entry as Record<string, unknown>;
    const key = pickString(obj.name) ?? pickString(obj.key) ?? pickString(obj.label);
    const valueRaw = obj.value ?? obj.values;
    let value: string | null = null;
    if (typeof valueRaw === "string") value = valueRaw;
    else if (typeof valueRaw === "number") value = String(valueRaw);
    else if (Array.isArray(valueRaw)) {
      value = valueRaw
        .map((v) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : null))
        .filter((v): v is string => !!v)
        .join(", ");
    }
    if (!key || !value) continue;
    out.push({ key: key.trim().slice(0, 80), value: value.trim().slice(0, 200) });
  }
  return out;
}

// ─── Utilities ───────────────────────────────────────────────────────────

function pickString(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function parseNumberLoose(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value !== "string") return null;
  return parsePriceText(value);
}
