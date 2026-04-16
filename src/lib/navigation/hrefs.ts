// ─── Navigation Hrefs ───
// Shared utilities for building precise navigation hrefs across the app.

// ─── Helper: build precise variant href with context ───
export function buildVariantHref(variantId: string, action?: "adjust" | "reorder"): string {
  const params = new URLSearchParams();
  params.set("variant", variantId);
  if (action) params.set("action", action);
  return `/admin/inventory?${params.toString()}`;
}

// ─── Helper: build precise product href with context for cost review ───
export function buildProductHref(productId: string, focus?: "cost"): string {
  const params = new URLSearchParams();
  params.set("product", productId);
  if (focus) params.set("focus", focus);
  return `/admin/catalog?${params.toString()}`;
}
