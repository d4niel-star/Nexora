// ─── Provider Score + Import Score Engine v1 ───
// Pure calculation. No DB access. No fabrication.
// All signals derive from observable data passed as input.

import type {
  ProviderScore,
  ProviderSignal,
  ProviderTier,
  ImportScore,
  ImportSignal,
  ImportPriority,
  ProviderScoreReport,
} from "@/types/provider-score";

// ═══════════════════════════════════════════
// Provider Score Input (from queries)
// ═══════════════════════════════════════════

export interface ProviderInput {
  providerId: string;
  providerName: string;
  providerCode: string;
  connectionId: string;
  connectionStatus: string; // "active" | "error" | "paused"
  lastSyncedAt: Date | null;
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
  totalCatalogProducts: number; // store-wide for dependency calc
  avgEstimatedMargin: number | null; // across products with cost+suggestedPrice
}

export interface ImportInput {
  providerProductId: string;
  title: string;
  category: string;
  providerName: string;
  providerCode: string;
  cost: number;
  suggestedPrice: number | null;
  stock: number;
  alreadyImported: boolean;
  internalStatus: string | null;
  providerConnectionStatus: string;
  providerTier: ProviderTier;
  estimatedMarginPercent: number | null;
  // Aptitude signals if available
  hasChannelListing: boolean;
  hasAdDraft: boolean;
}

// ═══════════════════════════════════════════
// Provider Scoring
// ═══════════════════════════════════════════

export function scoreProvider(input: ProviderInput): ProviderScore {
  const signals: ProviderSignal[] = [];
  let positiveWeight = 0;
  let negativeWeight = 0;

  // ─── Connection health ───
  if (input.connectionStatus === "active") {
    signals.push({ key: "conn_active", label: "Conexión activa", impact: "positive", detail: "La conexión está operativa" });
    positiveWeight += 2;
  } else if (input.connectionStatus === "error") {
    signals.push({ key: "conn_error", label: "Conexión con error", impact: "negative", detail: "La conexión tiene un error. Los datos pueden estar desactualizados." });
    negativeWeight += 3;
  } else {
    signals.push({ key: "conn_paused", label: "Conexión pausada", impact: "negative", detail: "La conexión está pausada. No se reciben actualizaciones." });
    negativeWeight += 2;
  }

  // ─── Sync freshness ───
  if (input.lastSyncedAt) {
    const hoursSince = (Date.now() - input.lastSyncedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSince < 24) {
      signals.push({ key: "sync_fresh", label: "Sync reciente", impact: "positive", detail: `Última sincronización hace ${Math.round(hoursSince)}h` });
      positiveWeight += 1;
    } else if (hoursSince < 72) {
      signals.push({ key: "sync_stale", label: "Sync no reciente", impact: "neutral", detail: `Última sincronización hace ${Math.round(hoursSince / 24)}d` });
    } else {
      signals.push({ key: "sync_old", label: "Sync desactualizado", impact: "negative", detail: `Última sincronización hace ${Math.round(hoursSince / 24)} días` });
      negativeWeight += 2;
    }
  } else {
    signals.push({ key: "sync_never", label: "Nunca sincronizado", impact: "negative", detail: "No se registra ninguna sincronización" });
    negativeWeight += 1;
  }

  // ─── Sync job reliability ───
  if (input.syncJobsTotal > 0) {
    const failRate = input.syncJobsFailed / input.syncJobsTotal;
    if (failRate === 0) {
      signals.push({ key: "jobs_clean", label: "Sin fallos de sync", impact: "positive", detail: `${input.syncJobsCompleted} sync(s) completados sin error` });
      positiveWeight += 1;
    } else if (failRate < 0.3) {
      signals.push({ key: "jobs_some_fail", label: "Algunos fallos de sync", impact: "neutral", detail: `${input.syncJobsFailed} de ${input.syncJobsTotal} fallidos` });
    } else {
      signals.push({ key: "jobs_high_fail", label: "Alta tasa de fallos", impact: "negative", detail: `${input.syncJobsFailed} de ${input.syncJobsTotal} fallidos (${Math.round(failRate * 100)}%)` });
      negativeWeight += 2;
    }
  }

  // ─── Product catalog quality ───
  if (input.totalProducts === 0) {
    signals.push({ key: "no_products", label: "Sin productos", impact: "negative", detail: "El proveedor no tiene productos cargados" });
    negativeWeight += 3;
  } else {
    const costCoverage = input.productsWithCost / input.totalProducts;
    const stockCoverage = input.productsWithStock / input.totalProducts;

    if (costCoverage >= 0.9) {
      signals.push({ key: "cost_good", label: "Costos completos", impact: "positive", detail: `${input.productsWithCost} de ${input.totalProducts} con costo` });
      positiveWeight += 1;
    } else if (costCoverage >= 0.5) {
      signals.push({ key: "cost_partial", label: "Costos parciales", impact: "neutral", detail: `${input.productsWithCost} de ${input.totalProducts} con costo (${Math.round(costCoverage * 100)}%)` });
    } else {
      signals.push({ key: "cost_low", label: "Costos incompletos", impact: "negative", detail: `Solo ${input.productsWithCost} de ${input.totalProducts} tienen costo` });
      negativeWeight += 1;
    }

    if (stockCoverage >= 0.7) {
      signals.push({ key: "stock_good", label: "Stock disponible", impact: "positive", detail: `${input.productsWithStock} de ${input.totalProducts} con stock > 0` });
      positiveWeight += 1;
    } else if (stockCoverage >= 0.3) {
      signals.push({ key: "stock_partial", label: "Stock parcial", impact: "neutral", detail: `${input.productsWithStock} de ${input.totalProducts} con stock` });
    } else {
      signals.push({ key: "stock_low", label: "Stock bajo", impact: "negative", detail: `Solo ${input.productsWithStock} de ${input.totalProducts} con stock` });
      negativeWeight += 1;
    }
  }

  // ─── Mirror health ───
  if (input.productsImported > 0 && input.mirrorsOutOfSync > 0) {
    const oosRate = input.mirrorsOutOfSync / input.productsImported;
    if (oosRate > 0.5) {
      signals.push({ key: "mirrors_bad", label: "Espejos desincronizados", impact: "negative", detail: `${input.mirrorsOutOfSync} de ${input.productsImported} importados desincronizados` });
      negativeWeight += 2;
    } else {
      signals.push({ key: "mirrors_some", label: "Algunos espejos desincronizados", impact: "neutral", detail: `${input.mirrorsOutOfSync} de ${input.productsImported}` });
    }
  }

  // ─── Import utilization ───
  if (input.productsImported > 0) {
    if (input.importedInDraft > 0) {
      signals.push({ key: "drafts_pending", label: "Importados en borrador", impact: "neutral", detail: `${input.importedInDraft} importado(s) sin publicar` });
    }
    if (input.importedPublished > 0) {
      signals.push({ key: "published_ok", label: "Importados publicados", impact: "positive", detail: `${input.importedPublished} importado(s) ya publicados` });
      positiveWeight += 1;
    }
  }

  // ─── Catalog dependency ───
  let catalogDependencyPercent: number | null = null;
  if (input.totalCatalogProducts > 0 && input.importedPublished > 0) {
    catalogDependencyPercent = Math.round((input.importedPublished / input.totalCatalogProducts) * 100);
    if (catalogDependencyPercent > 50) {
      signals.push({ key: "dep_high", label: "Alta dependencia", impact: "negative", detail: `${catalogDependencyPercent}% del catálogo depende de este proveedor` });
      negativeWeight += 1;
    } else if (catalogDependencyPercent > 25) {
      signals.push({ key: "dep_moderate", label: "Dependencia moderada", impact: "neutral", detail: `${catalogDependencyPercent}% del catálogo` });
    }
  }

  // ─── Margin quality ───
  if (input.avgEstimatedMargin !== null) {
    if (input.avgEstimatedMargin >= 25) {
      signals.push({ key: "margin_good", label: "Margen estimado bueno", impact: "positive", detail: `Margen promedio ${input.avgEstimatedMargin}%` });
      positiveWeight += 1;
    } else if (input.avgEstimatedMargin >= 10) {
      signals.push({ key: "margin_ok", label: "Margen estimado aceptable", impact: "neutral", detail: `Margen promedio ${input.avgEstimatedMargin}%` });
    } else {
      signals.push({ key: "margin_low", label: "Margen estimado bajo", impact: "negative", detail: `Margen promedio ${input.avgEstimatedMargin}%` });
      negativeWeight += 1;
    }
  }

  // ─── Determine tier ───
  const tier = classifyProviderTier(positiveWeight, negativeWeight, input);

  return {
    providerId: input.providerId,
    providerName: input.providerName,
    providerCode: input.providerCode,
    connectionId: input.connectionId,
    connectionStatus: input.connectionStatus,
    tier,
    tierLabel: tierLabel(tier),
    signals,
    totalProducts: input.totalProducts,
    productsWithCost: input.productsWithCost,
    productsWithStock: input.productsWithStock,
    productsImported: input.productsImported,
    importedInDraft: input.importedInDraft,
    importedPublished: input.importedPublished,
    mirrorsOutOfSync: input.mirrorsOutOfSync,
    syncJobsTotal: input.syncJobsTotal,
    syncJobsFailed: input.syncJobsFailed,
    syncJobsCompleted: input.syncJobsCompleted,
    lastSyncedAt: input.lastSyncedAt?.toISOString() ?? null,
    catalogDependencyPercent,
    avgEstimatedMargin: input.avgEstimatedMargin,
    actionHref: "/admin/sourcing",
    actionLabel: tier === "critical" ? "Revisar urgente" : tier === "weak" ? "Revisar proveedor" : "Ver proveedor",
  };
}

function classifyProviderTier(pos: number, neg: number, input: ProviderInput): ProviderTier {
  if (input.totalProducts === 0) return "no_data";
  if (input.connectionStatus === "error" && neg >= 4) return "critical";
  if (neg >= 5) return "critical";
  if (neg >= 3 || (input.connectionStatus === "error" && neg >= 2)) return "weak";
  if (pos >= 4 && neg <= 1) return "strong";
  return "stable";
}

function tierLabel(t: ProviderTier): string {
  switch (t) {
    case "strong": return "Fuerte";
    case "stable": return "Estable";
    case "weak": return "Débil";
    case "critical": return "Crítico";
    case "no_data": return "Sin datos";
  }
}

// ═══════════════════════════════════════════
// Import Scoring
// ═══════════════════════════════════════════

export function scoreImport(input: ImportInput): ImportScore {
  const signals: ImportSignal[] = [];

  // Already imported — skip scoring
  if (input.alreadyImported) {
    if (input.internalStatus === "draft") {
      signals.push({ key: "imported_draft", label: "Importado, en borrador", impact: "neutral" });
    } else {
      signals.push({ key: "imported_active", label: "Ya importado y activo", impact: "positive" });
    }
    return buildImportScore(input, "already_imported", "Ya importado", signals);
  }

  let positiveCount = 0;
  let negativeCount = 0;

  // ─── Cost ───
  if (input.cost > 0) {
    signals.push({ key: "has_cost", label: "Costo declarado", impact: "positive" });
    positiveCount++;
  } else {
    signals.push({ key: "no_cost", label: "Sin costo", impact: "negative" });
    negativeCount += 2; // critical blocker
  }

  // ─── Suggested price ───
  if (input.suggestedPrice !== null && input.suggestedPrice > 0) {
    signals.push({ key: "has_price", label: "Precio sugerido", impact: "positive" });
    positiveCount++;
  } else {
    signals.push({ key: "no_price", label: "Sin precio sugerido", impact: "negative" });
    negativeCount++;
  }

  // ─── Stock ───
  if (input.stock > 0) {
    signals.push({ key: "has_stock", label: `Stock: ${input.stock} u.`, impact: "positive" });
    positiveCount++;
  } else {
    signals.push({ key: "no_stock", label: "Sin stock", impact: "negative" });
    negativeCount += 2; // critical blocker
  }

  // ─── Estimated margin ───
  if (input.estimatedMarginPercent !== null) {
    if (input.estimatedMarginPercent >= 25) {
      signals.push({ key: "margin_high", label: `Margen ${input.estimatedMarginPercent}%`, impact: "positive" });
      positiveCount += 2;
    } else if (input.estimatedMarginPercent >= 10) {
      signals.push({ key: "margin_ok", label: `Margen ${input.estimatedMarginPercent}%`, impact: "neutral" });
      positiveCount++;
    } else if (input.estimatedMarginPercent >= 0) {
      signals.push({ key: "margin_low", label: `Margen bajo ${input.estimatedMarginPercent}%`, impact: "negative" });
      negativeCount++;
    } else {
      signals.push({ key: "margin_negative", label: `Margen negativo ${input.estimatedMarginPercent}%`, impact: "negative" });
      negativeCount += 2;
    }
  }

  // ─── Provider health ───
  if (input.providerTier === "critical" || input.providerTier === "weak") {
    signals.push({ key: "provider_risk", label: `Proveedor ${input.providerTier === "critical" ? "crítico" : "débil"}`, impact: "negative" });
    negativeCount++;
  } else if (input.providerTier === "strong") {
    signals.push({ key: "provider_strong", label: "Proveedor fuerte", impact: "positive" });
    positiveCount++;
  }

  // ─── Channel/Ads readiness (bonus signals) ───
  if (input.hasChannelListing) {
    signals.push({ key: "has_listing", label: "Producto similar ya publicado en canal", impact: "positive" });
    positiveCount++;
  }
  if (input.hasAdDraft) {
    signals.push({ key: "has_ad", label: "Borrador de ad existe", impact: "positive" });
    positiveCount++;
  }

  // ─── Classify priority ───
  let priority: ImportPriority;
  let priorityLabel: string;

  if (negativeCount >= 3 || input.cost === 0 || (input.stock === 0 && input.cost === 0)) {
    priority = "skip";
    priorityLabel = "Datos insuficientes";
  } else if (negativeCount >= 2 || input.providerTier === "critical") {
    priority = "low";
    priorityLabel = "Prioridad baja";
  } else if (positiveCount >= 4 && negativeCount === 0) {
    priority = "high";
    priorityLabel = "Prioridad alta";
  } else if (positiveCount >= 2 && negativeCount <= 1) {
    priority = "medium";
    priorityLabel = "Prioridad media";
  } else {
    priority = "low";
    priorityLabel = "Prioridad baja";
  }

  return buildImportScore(input, priority, priorityLabel, signals);
}

function buildImportScore(input: ImportInput, priority: ImportPriority, priorityLabel: string, signals: ImportSignal[]): ImportScore {
  const actionHref = input.alreadyImported
    ? (input.internalStatus === "draft" ? "/admin/catalog" : "/admin/inventory")
    : "/admin/sourcing";
  const actionLabel = input.alreadyImported
    ? (input.internalStatus === "draft" ? "Revisar borrador" : "Ver en catálogo")
    : priority === "skip" ? "Revisar datos" : "Importar";

  return {
    providerProductId: input.providerProductId,
    title: input.title,
    category: input.category,
    providerName: input.providerName,
    priority,
    priorityLabel,
    signals,
    cost: input.cost,
    suggestedPrice: input.suggestedPrice,
    stock: input.stock,
    estimatedMarginPercent: input.estimatedMarginPercent,
    alreadyImported: input.alreadyImported,
    internalStatus: input.internalStatus,
    providerTier: input.providerTier,
    actionHref,
    actionLabel,
  };
}

// ═══════════════════════════════════════════
// Full Report Calculator
// ═══════════════════════════════════════════

export function calculateProviderScoreReport(
  providerInputs: ProviderInput[],
  importInputs: ImportInput[],
): ProviderScoreReport {
  const providers = providerInputs.map(scoreProvider);
  const imports = importInputs.map(scoreImport);

  // Sort providers: critical first, then weak, stable, strong, no_data
  const tierOrder: Record<ProviderTier, number> = { critical: 0, weak: 1, stable: 2, strong: 3, no_data: 4 };
  providers.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);

  // Sort imports: high first, then medium, low, skip, already_imported
  const prioOrder: Record<ImportPriority, number> = { high: 0, medium: 1, low: 2, skip: 3, already_imported: 4 };
  imports.sort((a, b) => prioOrder[a.priority] - prioOrder[b.priority]);

  return {
    providers,
    imports,
    summary: {
      totalProviders: providers.length,
      strong: providers.filter((p) => p.tier === "strong").length,
      stable: providers.filter((p) => p.tier === "stable").length,
      weak: providers.filter((p) => p.tier === "weak").length,
      critical: providers.filter((p) => p.tier === "critical").length,
      noData: providers.filter((p) => p.tier === "no_data").length,
      highPriorityImports: imports.filter((i) => i.priority === "high").length,
      mediumPriorityImports: imports.filter((i) => i.priority === "medium").length,
      lowPriorityImports: imports.filter((i) => i.priority === "low").length,
      skipImports: imports.filter((i) => i.priority === "skip").length,
    },
    generatedAt: new Date().toISOString(),
    engineVersion: "v1",
  };
}
