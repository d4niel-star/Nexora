import type { SupplierProductInput } from "../../import-parsers";
import type { Budget } from "../budget";
import { budgetedFetch } from "../fetcher";
import type { ResolverLogger } from "../logger";
import { originOf } from "../html-utils";
import { toSupplierProduct, dedupeByExternalId, type RawProductCandidate } from "../normalize";

// ─── Shopify-like extractor ──────────────────────────────────────────────
// Any Shopify store exposes `/products.json` (up to 250 per page). We use
// it as a zero-config catalog endpoint. This also works for several
// Shopify-compatible stacks and imitators; if the response isn't the
// expected shape we simply return null.

interface ShopifyVariant {
  id?: number;
  sku?: string | null;
  price?: string | null;
  compare_at_price?: string | null;
  available?: boolean;
  inventory_quantity?: number;
  option1?: string | null;
}

interface ShopifyImage {
  src?: string;
}

interface ShopifyProduct {
  id?: number;
  handle?: string;
  title?: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  variants?: ShopifyVariant[];
  images?: ShopifyImage[];
}

interface ShopifyFeed {
  products?: ShopifyProduct[];
}

export interface ShopifyDetection {
  likely: boolean;
  endpoint: string | null;
}

export function detectShopify(rootHtml: string, rootUrl: string): ShopifyDetection {
  const origin = originOf(rootUrl);
  if (!origin) return { likely: false, endpoint: null };
  const signals = [
    /cdn\.shopify\.com/i,
    /Shopify\.(theme|shop|routes)/i,
    /var\s+Shopify\s*=/i,
    /"@type":\s*"Store"[\s\S]{0,200}shopify/i,
  ];
  const likely = signals.some((re) => re.test(rootHtml));
  return { likely, endpoint: likely ? `${origin}/products.json?limit=250` : null };
}

export async function extractFromShopify(
  rootUrl: string,
  budget: Budget,
  logger: ResolverLogger,
): Promise<SupplierProductInput[] | null> {
  const origin = originOf(rootUrl);
  if (!origin) return null;

  const products: SupplierProductInput[] = [];
  let page = 1;
  const maxPages = 3; // up to 750 products worst case, bounded by budget.

  while (page <= maxPages && products.length < budget.maxProducts) {
    const endpoint = `${origin}/products.json?limit=250&page=${page}`;
    const resp = await budgetedFetch(endpoint, budget, logger, { label: "shopify.fetch" });
    if (!resp.ok) {
      logger.warn("shopify.fetch", `Shopify endpoint not available: ${resp.error ?? resp.status}`, { endpoint });
      break;
    }

    let feed: ShopifyFeed;
    try {
      feed = JSON.parse(resp.body) as ShopifyFeed;
    } catch {
      logger.warn("shopify.parse", "Shopify endpoint did not return JSON", { endpoint });
      return null;
    }
    const items = Array.isArray(feed.products) ? feed.products : [];
    if (items.length === 0) break;

    for (const item of items) {
      if (products.length >= budget.maxProducts) break;
      const normalized = shopifyItemToProduct(item, origin);
      if (normalized) products.push(normalized);
    }
    logger.ok("shopify.page", `Shopify page ${page}: ${items.length} item(s)`, { total: products.length });
    if (items.length < 250) break;
    page += 1;
  }

  if (products.length === 0) return null;
  return dedupeByExternalId(products);
}

function shopifyItemToProduct(item: ShopifyProduct, origin: string): SupplierProductInput | null {
  const variants = Array.isArray(item.variants) ? item.variants : [];
  const firstVariant = variants[0];
  const priceNumber = Number(firstVariant?.price ?? "");
  const compareAt = Number(firstVariant?.compare_at_price ?? "");
  const totalStock = variants.reduce(
    (sum, v) => sum + (typeof v.inventory_quantity === "number" ? v.inventory_quantity : 0),
    0,
  );
  const images = (item.images ?? [])
    .map((img) => img.src)
    .filter((src): src is string => typeof src === "string" && src.length > 0);
  const handle = item.handle ?? "";
  const sourceUrl = handle ? `${origin}/products/${handle}` : origin;

  const candidate: RawProductCandidate = {
    externalId: handle || (item.id ? `shopify-${item.id}` : ""),
    title: (item.title ?? "").trim(),
    description: stripHtml(item.body_html ?? "").slice(0, 2000),
    category: item.product_type ?? null,
    priceNumber: Number.isFinite(priceNumber) && priceNumber > 0 ? priceNumber : null,
    images,
    sourceUrl,
    sku: firstVariant?.sku ?? null,
    stock: Number.isFinite(totalStock) ? totalStock : 0,
    brand: item.vendor ?? null,
  };
  const product = toSupplierProduct(candidate);
  if (!product) return null;
  if (Number.isFinite(compareAt) && compareAt > 0 && compareAt > (product.suggestedPrice ?? 0)) {
    product.raw.compareAtPrice = compareAt;
  }
  return product;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
