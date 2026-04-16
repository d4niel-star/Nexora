// ─── Provider Score + Import Score v1 Types ───
// All scores derive from observable DB signals only.
// No fabricated reputation, no magic numbers.

// ═══ Provider Score ═══

export type ProviderTier = "strong" | "stable" | "weak" | "critical" | "no_data";

export interface ProviderSignal {
  key: string;
  label: string;
  impact: "positive" | "negative" | "neutral";
  detail: string;
}

export interface ProviderScore {
  providerId: string;
  providerName: string;
  providerCode: string;
  connectionId: string;
  connectionStatus: string;
  tier: ProviderTier;
  tierLabel: string;
  signals: ProviderSignal[];
  // Observable metrics
  totalProducts: number;
  productsWithCost: number;
  productsWithStock: number;
  productsImported: number;
  importedInDraft: number;
  importedPublished: number;
  mirrorsOutOfSync: number;
  syncJobsTotal: number;
  syncJobsFailed: number;
  syncJobsCompleted: number;
  lastSyncedAt: string | null;
  catalogDependencyPercent: number | null;
  avgEstimatedMargin: number | null;
  // CTA
  actionHref: string;
  actionLabel: string;
}

// ═══ Import Score ═══

export type ImportPriority = "high" | "medium" | "low" | "skip" | "already_imported";

export interface ImportSignal {
  key: string;
  label: string;
  impact: "positive" | "negative" | "neutral";
}

export interface ImportScore {
  providerProductId: string;
  title: string;
  category: string;
  providerName: string;
  priority: ImportPriority;
  priorityLabel: string;
  signals: ImportSignal[];
  // Raw data
  cost: number;
  suggestedPrice: number | null;
  stock: number;
  estimatedMarginPercent: number | null;
  alreadyImported: boolean;
  internalStatus: string | null;
  providerTier: ProviderTier;
  // CTA
  actionHref: string;
  actionLabel: string;
}

// ═══ Report ═══

export interface ProviderScoreReport {
  providers: ProviderScore[];
  imports: ImportScore[];
  summary: {
    totalProviders: number;
    strong: number;
    stable: number;
    weak: number;
    critical: number;
    noData: number;
    highPriorityImports: number;
    mediumPriorityImports: number;
    lowPriorityImports: number;
    skipImports: number;
  };
  generatedAt: string;
  engineVersion: "v1";
}
