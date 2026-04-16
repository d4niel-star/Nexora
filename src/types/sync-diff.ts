// ─── Diff Engine / Out-of-Sync Center v2 Types ───
// Granular field-level diff between internal product state and
// what is persisted as the synced snapshot on each ChannelListing.
//
// Schema fields used for comparison:
//   ChannelListing.syncedPrice   vs  Product.price
//   ChannelListing.syncedStock   vs  SUM(ProductVariant.stock - reservedStock)
//   ChannelListing.syncedTitle   vs  Product.title
//
// Fields NOT supported by schema for v1:
//   image, description (channel-custom), category, attributes

// ─── What changed ───

export type DiffFieldKey = "price" | "stock" | "title";

export interface DiffField {
  field: DiffFieldKey;
  label: string;
  localValue: string;
  syncedValue: string;
  severity: DiffSeverity;
}

// ─── Severity ───

export type DiffSeverity = "critical" | "high" | "normal" | "info";

// ─── Single listing diff entry ───

export interface DiffEntry {
  listingId: string;
  productId: string;
  productTitle: string;
  productImage: string;
  channel: string;
  channelLabel: string;
  listingStatus: string;
  syncStatus: string;
  externalUrl: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  retryCount: number;
  diffs: DiffField[];
  overallSeverity: DiffSeverity;
  // CTA
  actionHref: string;
  actionLabel: string;
}

// ─── Summary ───

export interface DiffSummary {
  totalListings: number;
  withDiffs: number;
  withErrors: number;
  byField: { field: DiffFieldKey; label: string; count: number }[];
  bySeverity: { severity: DiffSeverity; count: number }[];
  byChannel: { channel: string; channelLabel: string; count: number }[];
}

// ─── Full report ───

export interface DiffReport {
  entries: DiffEntry[];
  summary: DiffSummary;
  generatedAt: string;
  engineVersion: "v2";
}
