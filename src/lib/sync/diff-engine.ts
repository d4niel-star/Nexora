// ─── Diff Engine v2 ───
// Pure comparison layer. No DB access.
// Receives listing+product data, outputs granular field-level diffs
// with severity classification and operational context.
//
// Diff fields supported by current schema:
//   price  — ChannelListing.syncedPrice vs Product.price
//   stock  — ChannelListing.syncedStock vs SUM(variants available)
//   title  — ChannelListing.syncedTitle vs Product.title

import type {
  DiffEntry,
  DiffField,
  DiffFieldKey,
  DiffReport,
  DiffSeverity,
  DiffSummary,
} from "@/types/sync-diff";

// ─── Input from query layer ───

export interface ListingDiffInput {
  listingId: string;
  productId: string;
  productTitle: string;
  productImage: string;
  productPrice: number;
  totalAvailableStock: number;
  channel: string;
  listingStatus: string;
  syncStatus: string;
  syncedPrice: number | null;
  syncedStock: number | null;
  syncedTitle: string | null;
  externalUrl: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  retryCount: number;
}

// ─── Channel labels ───

function channelLabel(ch: string): string {
  switch (ch) {
    case "mercadolibre": return "Mercado Libre";
    case "shopify": return "Shopify";
    case "storefront": return "Tienda propia";
    default: return ch;
  }
}

// ─── Severity logic ───

function fieldSeverity(field: DiffFieldKey, localVal: number | string, syncedVal: number | string, retryCount: number): DiffSeverity {
  // Repeated failures escalate
  if (retryCount >= 3) return "critical";

  switch (field) {
    case "stock": {
      const localNum = typeof localVal === "number" ? localVal : parseInt(String(localVal), 10) || 0;
      const syncedNum = typeof syncedVal === "number" ? syncedVal : parseInt(String(syncedVal), 10) || 0;
      // Customer sees stock that doesn't exist → oversell risk
      if (syncedNum > localNum) return "critical";
      // Customer sees 0 but product has stock → lost sales
      if (syncedNum === 0 && localNum > 0) return "high";
      return "high";
    }
    case "price": {
      const localNum = typeof localVal === "number" ? localVal : parseFloat(String(localVal)) || 0;
      const syncedNum = typeof syncedVal === "number" ? syncedVal : parseFloat(String(syncedVal)) || 0;
      if (localNum === 0 || syncedNum === 0) return "critical";
      const pctDiff = Math.abs(localNum - syncedNum) / Math.max(localNum, 1) * 100;
      // >20% price diff is high severity
      if (pctDiff > 20) return "high";
      return "normal";
    }
    case "title":
      return "normal";
    default:
      return "info";
  }
}

function worstSeverity(severities: DiffSeverity[]): DiffSeverity {
  if (severities.includes("critical")) return "critical";
  if (severities.includes("high")) return "high";
  if (severities.includes("normal")) return "normal";
  return "info";
}

// ─── Diff a single listing ───

function diffListing(input: ListingDiffInput): DiffEntry | null {
  const diffs: DiffField[] = [];

  // Price diff
  if (input.syncedPrice !== null && input.syncedPrice !== input.productPrice) {
    const sev = fieldSeverity("price", input.productPrice, input.syncedPrice, input.retryCount);
    diffs.push({
      field: "price",
      label: "Precio",
      localValue: `$${input.productPrice.toLocaleString("es-AR")}`,
      syncedValue: `$${input.syncedPrice.toLocaleString("es-AR")}`,
      severity: sev,
    });
  }

  // Stock diff
  if (input.syncedStock !== null && input.syncedStock !== input.totalAvailableStock) {
    const sev = fieldSeverity("stock", input.totalAvailableStock, input.syncedStock, input.retryCount);
    diffs.push({
      field: "stock",
      label: "Stock",
      localValue: `${input.totalAvailableStock} uds`,
      syncedValue: `${input.syncedStock} uds`,
      severity: sev,
    });
  }

  // Title diff
  if (input.syncedTitle !== null && input.syncedTitle !== input.productTitle) {
    const sev = fieldSeverity("title", input.productTitle, input.syncedTitle, input.retryCount);
    diffs.push({
      field: "title",
      label: "Título",
      localValue: input.productTitle,
      syncedValue: input.syncedTitle,
      severity: sev,
    });
  }

  // Also include listings with sync errors even if no field diff detected
  const hasError = input.syncStatus === "error" || input.listingStatus === "failed";

  if (diffs.length === 0 && !hasError) return null;

  const overallSeverity = diffs.length > 0
    ? worstSeverity(diffs.map((d) => d.severity))
    : (input.retryCount >= 3 ? "critical" : "high");

  // CTA
  let actionHref = "/admin/publications";
  let actionLabel = "Resincronizar";
  if (hasError && diffs.length === 0) {
    actionLabel = "Ver error";
  }
  if (diffs.some((d) => d.field === "stock")) {
    actionHref = "/admin/publications";
    actionLabel = "Sincronizar stock";
  }

  return {
    listingId: input.listingId,
    productId: input.productId,
    productTitle: input.productTitle,
    productImage: input.productImage,
    channel: input.channel,
    channelLabel: channelLabel(input.channel),
    listingStatus: input.listingStatus,
    syncStatus: input.syncStatus,
    externalUrl: input.externalUrl,
    lastSyncedAt: input.lastSyncedAt,
    lastError: input.lastError,
    retryCount: input.retryCount,
    diffs,
    overallSeverity,
    actionHref,
    actionLabel,
  };
}

// ─── Build full report ───

export function calculateDiffReport(inputs: ListingDiffInput[]): DiffReport {
  const entries: DiffEntry[] = [];

  for (const input of inputs) {
    const entry = diffListing(input);
    if (entry) entries.push(entry);
  }

  // Sort: critical first, then high, normal, info
  entries.sort((a, b) => sevRank(a.overallSeverity) - sevRank(b.overallSeverity));

  // Summary
  const fieldCounts = new Map<DiffFieldKey, number>();
  const sevCounts = new Map<DiffSeverity, number>();
  const chCounts = new Map<string, number>();

  for (const e of entries) {
    for (const d of e.diffs) {
      fieldCounts.set(d.field, (fieldCounts.get(d.field) ?? 0) + 1);
    }
    sevCounts.set(e.overallSeverity, (sevCounts.get(e.overallSeverity) ?? 0) + 1);
    chCounts.set(e.channel, (chCounts.get(e.channel) ?? 0) + 1);
  }

  const fieldLabels: Record<DiffFieldKey, string> = { price: "Precio", stock: "Stock", title: "Título" };
  const withErrors = entries.filter((e) => e.syncStatus === "error" || e.listingStatus === "failed").length;

  const summary: DiffSummary = {
    totalListings: inputs.length,
    withDiffs: entries.length,
    withErrors,
    byField: (["stock", "price", "title"] as DiffFieldKey[])
      .filter((f) => fieldCounts.has(f))
      .map((f) => ({ field: f, label: fieldLabels[f], count: fieldCounts.get(f)! })),
    bySeverity: (["critical", "high", "normal", "info"] as DiffSeverity[])
      .filter((s) => sevCounts.has(s))
      .map((s) => ({ severity: s, count: sevCounts.get(s)! })),
    byChannel: Array.from(chCounts.entries()).map(([ch, count]) => ({
      channel: ch,
      channelLabel: channelLabel(ch),
      count,
    })),
  };

  return {
    entries,
    summary,
    generatedAt: new Date().toISOString(),
    engineVersion: "v2",
  };
}

// ─── Build outOfSyncReason string from diffs (for persisting to DB) ───

export function buildOutOfSyncReason(diffs: DiffField[]): string {
  return diffs.map((d) => `${d.label}: local=${d.localValue}, canal=${d.syncedValue}`).join(" | ");
}

// ─── Helpers ───

function sevRank(s: DiffSeverity): number {
  switch (s) { case "critical": return 1; case "high": return 2; case "normal": return 3; case "info": return 4; }
}
