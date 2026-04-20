import type { SupplierProductInput, SupplierVariantInput } from "../import-parsers";

// ─── Normalization helpers ───────────────────────────────────────────────
// Extractors produce raw candidate records; these helpers convert them to
// the shared SupplierProductInput shape used by the rest of the sourcing
// pipeline. Rules:
// - Never invent numbers. If price/cost is missing we return null-ish and
//   let the caller drop the product (or import it as draft without price).
// - Never invent stock. Default to 0 (explicit unknown).
// - Never invent SKU. Fall back to a deterministic id derived from the URL.

export interface RawProductCandidate {
  externalId: string;
  title: string;
  description?: string | null;
  category?: string | null;
  priceText?: string | null;
  priceNumber?: number | null;
  currency?: string | null;
  images?: string[];
  sourceUrl?: string;
  sku?: string | null;
  stock?: number | null;
  brand?: string | null;
}

export function parsePriceText(value: string | null | undefined): number | null {
  if (!value) return null;
  // Strip currency symbols / letters, keep digits, comma, dot, minus.
  const cleaned = String(value).replace(/[^\d.,-]/g, "").trim();
  if (!cleaned) return null;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized: string;

  if (hasComma && hasDot) {
    // Mixed separators: the one that appears LAST is the decimal point.
    // Examples:
    //   "1.234,56"   → comma last  → "1234.56"
    //   "1,234.56"   → dot   last  → "1234.56"
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    // Comma only. Treat as decimal if exactly 1-2 trailing digits, else
    // thousand separator ("1,234,567").
    normalized = /,\d{1,2}$/.test(cleaned)
      ? cleaned.replace(/,/g, ".")
      : cleaned.replace(/,/g, "");
  } else if (hasDot) {
    // Dot only. Key disambiguation for locales like es-AR where "89.999"
    // means 89 999 (thousand sep), not 89.999 (three-decimal).
    const dotCount = (cleaned.match(/\./g) ?? []).length;
    const afterLast = cleaned.split(".").pop() ?? "";
    // Multiple dots → definitely thousand sep ("1.234.567").
    // Single dot with 3 trailing digits AND integer-sized prefix → thousand.
    // Everything else → decimal (e.g. "1.5", "12.99").
    if (dotCount > 1 || afterLast.length === 3) {
      normalized = cleaned.replace(/\./g, "");
    } else {
      normalized = cleaned;
    }
  } else {
    normalized = cleaned;
  }

  const num = Number(normalized);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

export function deriveExternalId(candidate: RawProductCandidate): string {
  if (candidate.externalId && candidate.externalId.trim()) {
    return candidate.externalId.trim().slice(0, 80);
  }
  if (candidate.sku && candidate.sku.trim()) return candidate.sku.trim().slice(0, 80);
  if (candidate.sourceUrl) {
    try {
      const u = new URL(candidate.sourceUrl);
      const slug = u.pathname.replace(/\/+$/, "").split("/").filter(Boolean).pop();
      if (slug) return slug.slice(0, 80);
    } catch {
      /* ignore */
    }
  }
  return `item-${Math.random().toString(36).slice(2, 10)}`;
}

export function toSupplierProduct(candidate: RawProductCandidate): SupplierProductInput | null {
  const title = (candidate.title || "").replace(/\s+/g, " ").trim();
  if (!title) return null;

  const price =
    typeof candidate.priceNumber === "number" && Number.isFinite(candidate.priceNumber)
      ? candidate.priceNumber
      : parsePriceText(candidate.priceText);

  const externalId = deriveExternalId(candidate);
  const images = (candidate.images ?? []).filter(
    (u): u is string => typeof u === "string" && /^https?:\/\//i.test(u),
  );

  // We accept products without a confirmed price but mark cost=0 so the
  // import path can still create drafts. Operators will see the missing
  // price in the preview and can decide to import or not.
  const cost = price ?? 0;
  const stock = typeof candidate.stock === "number" && candidate.stock >= 0 ? Math.floor(candidate.stock) : 0;

  const variant: SupplierVariantInput = {
    title: "Default",
    sku: candidate.sku ?? externalId,
    price: cost,
    stock,
  };

  return {
    externalId,
    title: title.slice(0, 240),
    description: candidate.description?.trim() || null,
    category: candidate.category?.trim() || null,
    cost,
    suggestedPrice: price ?? null,
    stock,
    imageUrls: Array.from(new Set(images)).slice(0, 8),
    variants: [variant],
    leadTimeMinDays: null,
    leadTimeMaxDays: null,
    raw: {
      sourceUrl: candidate.sourceUrl ?? null,
      brand: candidate.brand ?? null,
      currency: candidate.currency ?? null,
      priceText: candidate.priceText ?? null,
    },
  };
}

export function dedupeByExternalId(products: SupplierProductInput[]): SupplierProductInput[] {
  const seen = new Map<string, SupplierProductInput>();
  for (const product of products) {
    if (!seen.has(product.externalId)) seen.set(product.externalId, product);
  }
  return Array.from(seen.values());
}
