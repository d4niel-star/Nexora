// ─── Channel Aptitude + Ads Aptitude v1 Types ───
// Signal-based product fitness evaluation for publishing and advertising.
// All classifications derive from observable signals — no invented scores.
//
// Schema signals used:
// - Product: status, isPublished, price, cost, category, supplier
// - ProductVariant: stock, reservedStock, trackInventory
// - Optional listing status if a future storefront publication layer exposes it
// - CatalogMirrorProduct: importStatus, syncStatus
// - Profitability v2: contributionPerUnit, netContributionPercent, health, costConfidence
// - AdCampaignDraft: sourceProductIds (existing ad context)

// ─── Aptitude Verdicts ───

export type AptitudeVerdict = "apt" | "review" | "not_apt" | "insufficient_data";

// ─── Signal that explains the verdict ───

export interface AptitudeSignal {
  key: string;
  label: string;
  value: string;
  impact: "positive" | "negative" | "neutral" | "blocking";
}

// ─── Channel-specific aptitude for a single product ───

export interface ChannelAptitude {
  channel: string;
  channelLabel: string;
  verdict: AptitudeVerdict;
  signals: AptitudeSignal[];
  listingStatus: string | null;
  syncStatus: string | null;
  actionHref: string;
  actionLabel: string;
}

// ─── Ads aptitude for a single product ───

export interface AdsAptitude {
  verdict: AptitudeVerdict;
  signals: AptitudeSignal[];
  hasExistingAdContext: boolean;
  actionHref: string;
  actionLabel: string;
}

// ─── Full aptitude evaluation for a single product ───

export interface ProductAptitude {
  productId: string;
  title: string;
  category: string;
  supplier: string | null;
  status: string;
  isPublished: boolean;
  price: number;
  cost: number | null;
  totalStock: number;
  hasCost: boolean;
  hasStock: boolean;
  image: string;

  // Profitability (from Unit Economics v2, may be null if no orders)
  contributionPerUnit: number | null;
  netContributionPercent: number | null;
  marginHealth: string | null;
  costConfidence: string | null;

  // General aptitude (channel-agnostic)
  generalVerdict: AptitudeVerdict;
  generalSignals: AptitudeSignal[];

  // Per-channel aptitude
  channelAptitudes: ChannelAptitude[];

  // Ads aptitude
  adsAptitude: AdsAptitude;
}

// ─── Summary for the full catalog ───

export interface AptitudeSummary {
  totalProducts: number;
  channelApt: number;
  channelReview: number;
  channelNotApt: number;
  channelInsufficient: number;
  adsApt: number;
  adsReview: number;
  adsNotApt: number;
  adsInsufficient: number;
  topBlockers: AptitudeBlocker[];
}

export interface AptitudeBlocker {
  key: string;
  label: string;
  count: number;
  actionHref: string;
  actionLabel: string;
}

// ─── Full report ───

export interface AptitudeReport {
  products: ProductAptitude[];
  summary: AptitudeSummary;
  generatedAt: string;
  engineVersion: "v1";
}
