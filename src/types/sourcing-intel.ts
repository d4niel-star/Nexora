// ─── Sourcing Intelligence v1 Types ───

export type SourcingReadiness = "ready" | "review" | "risk" | "imported" | "no_data";

export interface ImportableProduct {
  providerProductId: string;
  title: string;
  category: string;
  cost: number;
  suggestedPrice: number | null;
  stock: number;
  providerName: string;
  providerCode: string;
  connectionId: string;
  readiness: SourcingReadiness;
  signals: string[];
  estimatedMarginPercent: number | null;
  alreadyImported: boolean;
  internalProductId: string | null;
  internalStatus: string | null;
}

export interface SourcingIntelSummary {
  totalAvailable: number;
  readyToImport: number;
  needsReview: number;
  atRisk: number;
  alreadyImported: number;
  noData: number;
  importedInDraft: number;
  syncJobsFailed: number;
  mirrorsOutOfSync: number;
}

export interface SourcingIntelData {
  products: ImportableProduct[];
  summary: SourcingIntelSummary;
  generatedAt: string;
}
