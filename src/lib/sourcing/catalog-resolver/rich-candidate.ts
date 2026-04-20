import type {
  SupplierAvailability,
  SupplierProductAttribute,
  SupplierProductInput,
  SupplierVariantInput,
} from "../import-parsers";
import { parsePriceText } from "./normalize";

// ─── Rich product candidate model ────────────────────────────────────────
// Internal model used by the PDP extraction layers. Each layer returns a
// partial candidate; the single-product orchestrator merges them into one
// and converts the result to SupplierProductInput. Never reaches the DB.
//
// Design:
//   - Every field is optional. Layers only populate what they can prove.
//   - `confidence` sorts candidates during merge (higher wins for scalars).
//   - `extractedFrom` is cumulative across merges so the UI can surface
//      which layers contributed data.

export type ExtractionLayer =
  | "structured-data"
  | "embedded-json"
  | "microdata"
  | "opengraph"
  | "heuristic";

export interface RichVariant {
  title?: string | null;
  /** Parsed option values, e.g. { color: "Azul", size: "M" }. */
  optionValues?: Record<string, string>;
  sku?: string | null;
  externalId?: string | null;
  price?: number | null;
  compareAtPrice?: number | null;
  availability?: SupplierAvailability;
  image?: string | null;
}

export interface RichCandidate {
  /** Layer that emitted this candidate. */
  source: ExtractionLayer;
  /** 0-100. Higher wins for scalar fields during merge. */
  confidence: number;
  /** Cumulative list of layers whose data survived merge (set by merge). */
  extractedFrom?: ExtractionLayer[];

  title?: string | null;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
  canonicalUrl?: string | null;
  /** URL of the page we scraped (always known). */
  sourceUrl: string;

  price?: number | null;
  compareAtPrice?: number | null;
  currency?: string | null;

  sku?: string | null;
  mpn?: string | null;
  gtin?: string | null;
  productID?: string | null;

  availability?: SupplierAvailability;
  stockQuantity?: number | null;

  images?: string[];
  breadcrumbs?: string[];
  attributes?: SupplierProductAttribute[];
  variants?: RichVariant[];
}

// ─── Merge ───────────────────────────────────────────────────────────────
// Fold multiple candidates into one. Rules:
//   1. Scalars: first non-empty value from the highest-confidence candidate
//      that defines it. We never clobber a good value with null/undefined.
//   2. Arrays (images, breadcrumbs, attributes): union preserving order of
//      the highest-confidence candidate; later candidates append non-dup.
//   3. Variants: deduped by (sku || stringified optionValues || title);
//      higher-confidence values take precedence per field.
//   4. Numbers: reject NaN / Infinity.
export function mergeRichCandidates(
  candidates: RichCandidate[],
): RichCandidate | null {
  if (candidates.length === 0) return null;

  // Sort by confidence desc (stable).
  const ordered = [...candidates].sort((a, b) => b.confidence - a.confidence);
  const base = ordered[0];
  const out: RichCandidate = {
    source: base.source,
    confidence: base.confidence,
    sourceUrl: base.sourceUrl,
    extractedFrom: [base.source],
  };

  for (const cand of ordered) {
    // Scalar fields — first-write-wins per the ordering.
    assignIfEmpty(out, cand, "title", cleanScalarString);
    assignIfEmpty(out, cand, "description", cleanScalarString);
    assignIfEmpty(out, cand, "brand", cleanScalarString);
    assignIfEmpty(out, cand, "category", cleanScalarString);
    assignIfEmpty(out, cand, "canonicalUrl", cleanScalarString);
    assignIfEmpty(out, cand, "currency", (v) => cleanScalarString(v)?.toUpperCase() ?? null);
    assignIfEmpty(out, cand, "sku", cleanScalarString);
    assignIfEmpty(out, cand, "mpn", cleanScalarString);
    assignIfEmpty(out, cand, "gtin", cleanScalarString);
    assignIfEmpty(out, cand, "productID", cleanScalarString);
    if (!out.availability && cand.availability) {
      out.availability = cand.availability;
    }

    assignNumberIfEmpty(out, cand, "price");
    assignNumberIfEmpty(out, cand, "compareAtPrice");
    assignNumberIfEmpty(out, cand, "stockQuantity");

    // Arrays — union preserving order.
    if (cand.images && cand.images.length > 0) {
      out.images = mergeStringArrays(out.images, cand.images);
    }
    if (cand.breadcrumbs && cand.breadcrumbs.length > 0) {
      out.breadcrumbs = mergeStringArrays(out.breadcrumbs, cand.breadcrumbs);
    }
    if (cand.attributes && cand.attributes.length > 0) {
      out.attributes = mergeAttributes(out.attributes, cand.attributes);
    }
    if (cand.variants && cand.variants.length > 0) {
      out.variants = mergeVariants(out.variants ?? [], cand.variants);
    }

    // Provenance.
    if (cand !== base && !out.extractedFrom!.includes(cand.source)) {
      // Only record the layer if at least one of its fields survived.
      if (didContribute(base, cand, out)) {
        out.extractedFrom!.push(cand.source);
      }
    }
  }

  // Compare-at must be greater than price; otherwise it's noise.
  if (
    typeof out.price === "number" &&
    typeof out.compareAtPrice === "number" &&
    out.compareAtPrice <= out.price
  ) {
    delete out.compareAtPrice;
  }

  return out;
}

function assignIfEmpty<K extends keyof RichCandidate>(
  target: RichCandidate,
  source: RichCandidate,
  key: K,
  transform: (v: unknown) => RichCandidate[K] | null,
): void {
  if (target[key] !== undefined && target[key] !== null) return;
  const transformed = transform(source[key]);
  if (transformed !== null && transformed !== undefined) {
    (target as Record<K, unknown>)[key] = transformed;
  }
}

function assignNumberIfEmpty<K extends "price" | "compareAtPrice" | "stockQuantity">(
  target: RichCandidate,
  source: RichCandidate,
  key: K,
): void {
  if (typeof target[key] === "number" && Number.isFinite(target[key] as number)) return;
  const v = source[key];
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
    target[key] = v;
  }
}

function cleanScalarString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.replace(/\s+/g, " ").trim();
  return trimmed ? trimmed : null;
}

function mergeStringArrays(a: string[] | undefined, b: string[]): string[] {
  const out = [...(a ?? [])];
  const seen = new Set(out);
  for (const item of b) {
    if (!seen.has(item)) {
      out.push(item);
      seen.add(item);
    }
  }
  return out;
}

function mergeAttributes(
  a: SupplierProductAttribute[] | undefined,
  b: SupplierProductAttribute[],
): SupplierProductAttribute[] {
  const out = [...(a ?? [])];
  const seenKeys = new Set(out.map((attr) => attr.key.toLowerCase()));
  for (const attr of b) {
    const keyLc = attr.key.toLowerCase();
    if (seenKeys.has(keyLc)) continue;
    out.push(attr);
    seenKeys.add(keyLc);
  }
  return out;
}

function mergeVariants(existing: RichVariant[], incoming: RichVariant[]): RichVariant[] {
  const out = [...existing];
  const key = (v: RichVariant): string => {
    if (v.sku) return `sku:${v.sku.toLowerCase()}`;
    if (v.optionValues && Object.keys(v.optionValues).length > 0) {
      return `opts:${Object.keys(v.optionValues)
        .sort()
        .map((k) => `${k}=${v.optionValues![k]}`)
        .join("|")
        .toLowerCase()}`;
    }
    return `title:${(v.title ?? "").toLowerCase()}`;
  };

  const byKey = new Map<string, RichVariant>();
  for (const v of out) byKey.set(key(v), v);

  for (const next of incoming) {
    const k = key(next);
    const prev = byKey.get(k);
    if (!prev) {
      out.push(next);
      byKey.set(k, next);
      continue;
    }
    // Merge per-field: prefer existing (higher confidence) but fill gaps.
    if (prev.title == null && next.title != null) prev.title = next.title;
    if (!prev.sku && next.sku) prev.sku = next.sku;
    if (prev.price == null && typeof next.price === "number") prev.price = next.price;
    if (prev.compareAtPrice == null && typeof next.compareAtPrice === "number") {
      prev.compareAtPrice = next.compareAtPrice;
    }
    if (!prev.image && next.image) prev.image = next.image;
    if (prev.availability == null && next.availability != null) prev.availability = next.availability;
    if (!prev.externalId && next.externalId) prev.externalId = next.externalId;
    if (next.optionValues) {
      prev.optionValues = { ...(next.optionValues ?? {}), ...(prev.optionValues ?? {}) };
    }
  }
  return out;
}

function didContribute(
  base: RichCandidate,
  cand: RichCandidate,
  merged: RichCandidate,
): boolean {
  // Crude heuristic: the candidate contributed if the merged output has a
  // field the base didn't. We check a representative subset.
  const fields: (keyof RichCandidate)[] = [
    "title",
    "description",
    "brand",
    "category",
    "canonicalUrl",
    "price",
    "compareAtPrice",
    "currency",
    "sku",
    "mpn",
    "gtin",
    "productID",
    "stockQuantity",
    "availability",
  ];
  for (const f of fields) {
    if (base[f] == null && cand[f] != null && merged[f] != null) return true;
  }
  if ((cand.images?.length ?? 0) > 0 && (base.images?.length ?? 0) < (merged.images?.length ?? 0)) return true;
  if ((cand.variants?.length ?? 0) > 0 && (base.variants?.length ?? 0) < (merged.variants?.length ?? 0)) return true;
  if ((cand.attributes?.length ?? 0) > 0 && (base.attributes?.length ?? 0) < (merged.attributes?.length ?? 0)) return true;
  if ((cand.breadcrumbs?.length ?? 0) > 0 && (base.breadcrumbs?.length ?? 0) < (merged.breadcrumbs?.length ?? 0)) return true;
  return false;
}

// ─── Conversion to SupplierProductInput ──────────────────────────────────
// Converts the merged RichCandidate into the shape the rest of the sourcing
// pipeline expects. Never invents data — if a field is missing it stays
// null/empty and is recorded in extraction.missingCriticalFields.
export function candidateToSupplierProduct(rich: RichCandidate): SupplierProductInput | null {
  const title = cleanScalarString(rich.title);
  if (!title) return null;

  const externalId = deriveExternalIdFromRich(rich);
  const price = typeof rich.price === "number" && Number.isFinite(rich.price) ? rich.price : null;
  const compareAtPrice =
    typeof rich.compareAtPrice === "number" && Number.isFinite(rich.compareAtPrice)
      ? rich.compareAtPrice
      : null;

  // Cost: downstream importer treats `cost` as non-null number. Fall back
  // to 0 when price is unknown (draft import, operator sees missing price).
  const cost = price ?? 0;

  const stockFromAvailability =
    rich.availability === "in_stock"
      ? 1
      : rich.availability === "out_of_stock"
        ? 0
        : null;
  const stock =
    typeof rich.stockQuantity === "number" && rich.stockQuantity >= 0
      ? Math.floor(rich.stockQuantity)
      : stockFromAvailability ?? 0;

  const images = dedupeImages(rich.images ?? []);

  const variants = buildSupplierVariants(rich, {
    title,
    externalId,
    fallbackPrice: cost,
    fallbackStock: stock,
  });

  const identifiersAll = pruneIdentifiers({
    sku: rich.sku ?? null,
    mpn: rich.mpn ?? null,
    gtin: rich.gtin ?? null,
    productID: rich.productID ?? null,
  });

  const extraction = computeExtractionReport(rich, {
    hasTitle: true,
    hasPrice: price !== null,
    imagesCount: images.length,
    variantsCount: variants.length,
    hasBrand: !!rich.brand,
    hasAttributes: (rich.attributes?.length ?? 0) > 0,
  });

  return {
    externalId,
    title: title.slice(0, 240),
    description: cleanScalarString(rich.description),
    category: cleanScalarString(rich.category) ?? (rich.breadcrumbs?.at(-1) ?? null),
    cost,
    suggestedPrice: price,
    stock,
    imageUrls: images.slice(0, 16),
    variants,
    leadTimeMinDays: null,
    leadTimeMaxDays: null,
    raw: {
      sourceUrl: rich.sourceUrl ?? null,
      canonicalUrl: rich.canonicalUrl ?? null,
      priceText: null,
    },
    brand: cleanScalarString(rich.brand),
    compareAtPrice,
    currency: cleanScalarString(rich.currency)?.toUpperCase() ?? null,
    sourceUrl: rich.sourceUrl ?? null,
    canonicalUrl: cleanScalarString(rich.canonicalUrl),
    identifiers: identifiersAll ?? undefined,
    attributes: rich.attributes && rich.attributes.length > 0 ? rich.attributes : undefined,
    breadcrumbs: rich.breadcrumbs && rich.breadcrumbs.length > 0 ? rich.breadcrumbs : undefined,
    availability: rich.availability,
    extraction,
  };
}

function dedupeImages(images: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of images) {
    if (typeof url !== "string") continue;
    if (!/^https?:\/\//i.test(url)) continue;
    // Normalize query strings like ?v=1723 which rotate per request; keep
    // the path comparison as dedupe key so mirrored cdn variants don't pile.
    const dedupeKey = url.split("?")[0];
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push(url);
  }
  return out;
}

function deriveExternalIdFromRich(rich: RichCandidate): string {
  if (rich.sku) return rich.sku.slice(0, 80);
  if (rich.productID) return rich.productID.slice(0, 80);
  if (rich.gtin) return rich.gtin.slice(0, 80);
  if (rich.mpn) return rich.mpn.slice(0, 80);
  try {
    const url = new URL(rich.sourceUrl);
    const slug = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean).pop();
    if (slug) return slug.slice(0, 80);
  } catch {
    /* fallthrough */
  }
  return `item-${Math.random().toString(36).slice(2, 10)}`;
}

function buildSupplierVariants(
  rich: RichCandidate,
  ctx: { title: string; externalId: string; fallbackPrice: number; fallbackStock: number },
): SupplierVariantInput[] {
  const real = rich.variants ?? [];

  if (real.length === 0) {
    return [
      {
        title: "Default",
        sku: rich.sku ?? ctx.externalId,
        price: ctx.fallbackPrice,
        stock: ctx.fallbackStock,
      },
    ];
  }

  return real.map((v) => {
    const optionTitle = v.title ?? formatOptionValues(v.optionValues) ?? ctx.title;
    const price =
      typeof v.price === "number" && Number.isFinite(v.price)
        ? v.price
        : (typeof rich.price === "number" ? rich.price : ctx.fallbackPrice);
    const stockFromAvail =
      v.availability === "in_stock" ? 1 : v.availability === "out_of_stock" ? 0 : null;
    return {
      title: optionTitle.slice(0, 120),
      sku: v.sku ?? null,
      price,
      stock: stockFromAvail ?? ctx.fallbackStock,
      optionValues: v.optionValues,
      compareAtPrice:
        typeof v.compareAtPrice === "number" && Number.isFinite(v.compareAtPrice)
          ? v.compareAtPrice
          : null,
      image: v.image ?? null,
      availability: v.availability,
      externalId: v.externalId ?? v.sku ?? null,
    };
  });
}

function formatOptionValues(opts: Record<string, string> | undefined): string | null {
  if (!opts) return null;
  const entries = Object.entries(opts).filter(([, v]) => typeof v === "string" && v.trim());
  if (entries.length === 0) return null;
  return entries.map(([, v]) => v.trim()).join(" / ");
}

function pruneIdentifiers(
  input: { sku: string | null; mpn: string | null; gtin: string | null; productID: string | null },
): { sku?: string | null; mpn?: string | null; gtin?: string | null; productID?: string | null } | null {
  const out: {
    sku?: string | null;
    mpn?: string | null;
    gtin?: string | null;
    productID?: string | null;
  } = {};
  let any = false;
  if (input.sku) {
    out.sku = input.sku;
    any = true;
  }
  if (input.mpn) {
    out.mpn = input.mpn;
    any = true;
  }
  if (input.gtin) {
    out.gtin = input.gtin;
    any = true;
  }
  if (input.productID) {
    out.productID = input.productID;
    any = true;
  }
  return any ? out : null;
}

function computeExtractionReport(
  rich: RichCandidate,
  signals: {
    hasTitle: boolean;
    hasPrice: boolean;
    imagesCount: number;
    variantsCount: number;
    hasBrand: boolean;
    hasAttributes: boolean;
  },
): SupplierProductInput["extraction"] {
  const missing: string[] = [];
  if (!signals.hasPrice) missing.push("price");
  if (signals.imagesCount === 0) missing.push("images");

  const warnings: string[] = [];
  if (!signals.hasBrand) warnings.push("brand");
  if (!signals.hasAttributes && signals.variantsCount === 0) {
    warnings.push("specs_or_variants");
  }
  if (
    typeof rich.compareAtPrice === "number" &&
    typeof rich.price === "number" &&
    rich.compareAtPrice <= rich.price
  ) {
    warnings.push("compare_at_invalid");
  }

  let confidence: "complete" | "partial" | "minimal";
  const richSignals = [
    signals.hasPrice,
    signals.imagesCount >= 2,
    signals.hasBrand,
    signals.hasAttributes || signals.variantsCount > 0,
  ].filter(Boolean).length;
  if (richSignals >= 3) confidence = "complete";
  else if (richSignals >= 2) confidence = "partial";
  else confidence = "minimal";

  return {
    confidence,
    extractedFrom: rich.extractedFrom ?? [rich.source],
    missingCriticalFields: missing,
    warnings,
  };
}

/** Convenience: parse a price text via the shared parser but swallow NaN. */
export function safeParsePrice(value: string | null | undefined): number | null {
  const n = parsePriceText(value ?? null);
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : null;
}
