// ─── Channel + Ads Aptitude Engine v1 ───
// Pure calculation layer. No DB access. Receives product data with all
// observable signals, outputs aptitude verdicts with full explainability.
//
// Rules are explicit, auditable, and based on real schema fields.
// No machine learning, no invented scores.

import type {
  AdsAptitude,
  AptitudeBlocker,
  AptitudeReport,
  AptitudeSignal,
  AptitudeSummary,
  AptitudeVerdict,
  ChannelAptitude,
  ProductAptitude,
} from "@/types/aptitude";

// ─── Input: what the query layer provides per product ───

export interface ProductAptitudeInput {
  productId: string;
  title: string;
  category: string;
  supplier: string | null;
  status: string;
  isPublished: boolean;
  price: number;
  cost: number | null;
  image: string;
  totalStock: number;
  hasVariantsTracking: boolean;

  // Per-channel listing state (from ChannelListing)
  listings: {
    channel: string;
    status: string;
    syncStatus: string;
  }[];

  // From profitability v2 (null if product has no orders yet)
  contributionPerUnit: number | null;
  netContributionPercent: number | null;
  marginHealth: string | null;
  costConfidence: string | null;

  // Whether product has any ad campaign draft or recommendation linked
  hasAdContext: boolean;
}

// ─── Channel name resolution ───

function channelLabel(ch: string): string {
  switch (ch) {
    case "mercadolibre": return "Mercado Libre";
    case "shopify": return "Shopify";
    case "storefront": return "Tienda propia";
    default: return ch;
  }
}

// ─── Core: General product fitness signals ───

function evaluateGeneralSignals(p: ProductAptitudeInput): { signals: AptitudeSignal[]; verdict: AptitudeVerdict } {
  const signals: AptitudeSignal[] = [];
  let hasBlocker = false;
  let hasWarning = false;
  let hasInsufficient = false;

  // Status
  if (p.status === "archived") {
    signals.push({ key: "archived", label: "Estado", value: "Archivado", impact: "blocking" });
    hasBlocker = true;
  } else if (p.status === "draft" && !p.isPublished) {
    signals.push({ key: "draft", label: "Estado", value: "Borrador (no publicado)", impact: "negative" });
    hasWarning = true;
  } else if (p.isPublished) {
    signals.push({ key: "published", label: "Estado", value: "Publicado", impact: "positive" });
  }

  // Stock
  if (p.hasVariantsTracking) {
    if (p.totalStock <= 0) {
      signals.push({ key: "no_stock", label: "Stock", value: "0 unidades", impact: "blocking" });
      hasBlocker = true;
    } else if (p.totalStock <= 3) {
      signals.push({ key: "low_stock", label: "Stock", value: `${p.totalStock} uds (bajo)`, impact: "negative" });
      hasWarning = true;
    } else {
      signals.push({ key: "stock_ok", label: "Stock", value: `${p.totalStock} uds`, impact: "positive" });
    }
  }

  // Cost
  if (p.cost === null || p.cost <= 0) {
    signals.push({ key: "no_cost", label: "Costo", value: "Sin costo cargado", impact: "blocking" });
    hasInsufficient = true;
  } else {
    signals.push({ key: "cost_ok", label: "Costo", value: `$${p.cost.toLocaleString("es-AR")}`, impact: "positive" });
  }

  // Price validation
  if (p.price <= 0) {
    signals.push({ key: "no_price", label: "Precio", value: "Sin precio", impact: "blocking" });
    hasBlocker = true;
  } else if (p.cost !== null && p.cost > 0 && p.price <= p.cost) {
    signals.push({ key: "price_below_cost", label: "Precio", value: `$${p.price.toLocaleString("es-AR")} ≤ costo`, impact: "blocking" });
    hasBlocker = true;
  }

  // Profitability signals (only if product has sales data)
  if (p.marginHealth !== null) {
    if (p.marginHealth === "negative") {
      signals.push({ key: "margin_negative", label: "Contribución", value: `Negativa (${p.netContributionPercent}%)`, impact: "blocking" });
      hasBlocker = true;
    } else if (p.marginHealth === "at_risk") {
      signals.push({ key: "margin_at_risk", label: "Contribución", value: `En riesgo (${p.netContributionPercent}%)`, impact: "negative" });
      hasWarning = true;
    } else if (p.marginHealth === "thin") {
      signals.push({ key: "margin_thin", label: "Contribución", value: `Fina (${p.netContributionPercent}%)`, impact: "neutral" });
    } else if (p.marginHealth === "profitable") {
      signals.push({ key: "margin_profitable", label: "Contribución", value: `Rentable (${p.netContributionPercent}%)`, impact: "positive" });
    } else if (p.marginHealth === "uncertain") {
      signals.push({ key: "margin_uncertain", label: "Contribución", value: "Incierta (sin costo)", impact: "neutral" });
    }
  }

  // Image
  if (!p.image) {
    signals.push({ key: "no_image", label: "Imagen", value: "Sin imagen principal", impact: "negative" });
    hasWarning = true;
  }

  // Derive verdict
  let verdict: AptitudeVerdict = "apt";
  if (hasBlocker) verdict = "not_apt";
  else if (hasInsufficient && !hasWarning) verdict = "insufficient_data";
  else if (hasInsufficient || hasWarning) verdict = "review";

  return { signals, verdict };
}

// ─── Channel-specific aptitude ───

function evaluateChannelAptitude(
  p: ProductAptitudeInput,
  generalVerdict: AptitudeVerdict,
  listing: { channel: string; status: string; syncStatus: string } | null,
  channel: string,
): ChannelAptitude {
  const signals: AptitudeSignal[] = [];
  let verdict = generalVerdict;

  if (listing) {
    // Listing exists for this channel
    if (listing.status === "published") {
      signals.push({ key: "listing_published", label: "Publicación", value: "Publicado en canal", impact: "positive" });
    } else if (listing.status === "failed") {
      signals.push({ key: "listing_failed", label: "Publicación", value: "Publicación fallida", impact: "blocking" });
      verdict = "not_apt";
    } else if (listing.status === "paused") {
      signals.push({ key: "listing_paused", label: "Publicación", value: "Pausado", impact: "negative" });
      if (verdict === "apt") verdict = "review";
    } else if (listing.status === "draft" || listing.status === "disconnected") {
      signals.push({ key: "listing_draft", label: "Publicación", value: `Estado: ${listing.status}`, impact: "neutral" });
    }

    // Sync status
    if (listing.syncStatus === "error") {
      signals.push({ key: "sync_error", label: "Sincronización", value: "Error de sync", impact: "blocking" });
      verdict = "not_apt";
    } else if (listing.syncStatus === "out_of_sync") {
      signals.push({ key: "sync_out", label: "Sincronización", value: "Desincronizado", impact: "negative" });
      if (verdict === "apt") verdict = "review";
    } else if (listing.syncStatus === "synced") {
      signals.push({ key: "sync_ok", label: "Sincronización", value: "Sincronizado", impact: "positive" });
    }
  } else {
    // No listing for this channel
    signals.push({ key: "no_listing", label: "Publicación", value: "Sin publicación en canal", impact: "neutral" });
  }

  // Determine CTA
  let actionHref = "/admin/publications";
  let actionLabel = "Revisar publicaciones";
  if (verdict === "not_apt" && signals.some((s) => s.key === "no_stock" || s.key === "no_cost")) {
    actionHref = "/admin/catalog";
    actionLabel = "Completar producto";
  }
  if (listing?.syncStatus === "error" || listing?.syncStatus === "out_of_sync") {
    actionHref = "/admin/publications";
    actionLabel = "Reparar sync";
  }

  return {
    channel,
    channelLabel: channelLabel(channel),
    verdict,
    signals,
    listingStatus: listing?.status ?? null,
    syncStatus: listing?.syncStatus ?? null,
    actionHref,
    actionLabel,
  };
}

// ─── Ads aptitude ───

function evaluateAdsAptitude(
  p: ProductAptitudeInput,
  generalVerdict: AptitudeVerdict,
): AdsAptitude {
  const signals: AptitudeSignal[] = [];
  let verdict = generalVerdict;

  // Must be published to run ads
  if (!p.isPublished) {
    signals.push({ key: "not_published", label: "Publicación", value: "No publicado — no puede recibir tráfico", impact: "blocking" });
    verdict = "not_apt";
  } else {
    signals.push({ key: "is_published", label: "Publicación", value: "Publicado, puede recibir tráfico", impact: "positive" });
  }

  // Margin requirement for ads (stricter than channel)
  if (p.marginHealth === "negative" || p.marginHealth === "at_risk") {
    signals.push({
      key: "margin_too_low_for_ads",
      label: "Contribución",
      value: p.marginHealth === "negative"
        ? "Negativa — pautar aumenta la pérdida"
        : `En riesgo (${p.netContributionPercent}%) — el fee de ads puede volverlo negativo`,
      impact: "blocking",
    });
    verdict = "not_apt";
  } else if (p.marginHealth === "thin") {
    signals.push({
      key: "margin_thin_for_ads",
      label: "Contribución",
      value: `Fina (${p.netContributionPercent}%) — verificar que el CPA no erosione`,
      impact: "negative",
    });
    if (verdict === "apt") verdict = "review";
  } else if (p.marginHealth === "profitable" && p.contributionPerUnit !== null) {
    signals.push({
      key: "margin_good_for_ads",
      label: "Contribución/ud",
      value: `$${p.contributionPerUnit.toLocaleString("es-AR")} — hay margen para absorber CPA`,
      impact: "positive",
    });
  }

  // Stock for ads (need enough to handle potential demand spike)
  if (p.totalStock > 0 && p.totalStock <= 5) {
    signals.push({
      key: "low_stock_ads",
      label: "Stock",
      value: `${p.totalStock} uds — podría agotarse rápido con pauta`,
      impact: "negative",
    });
    if (verdict === "apt") verdict = "review";
  }

  // No image is bad for ads
  if (!p.image) {
    signals.push({ key: "no_image_ads", label: "Imagen", value: "Sin imagen — las creatividades necesitan visual", impact: "blocking" });
    verdict = "not_apt";
  }

  // Existing ad context
  if (p.hasAdContext) {
    signals.push({ key: "has_ad_context", label: "Ads existentes", value: "Ya tiene borrador o recomendación de campaña", impact: "positive" });
  }

  // Cost confidence (if available)
  if (p.costConfidence === "none" && p.cost === null) {
    signals.push({ key: "no_cost_ads", label: "Costo", value: "Sin costo — imposible calcular si la pauta será rentable", impact: "blocking" });
    verdict = "not_apt";
  }

  let actionHref = "/admin/ai/ads";
  let actionLabel = "Ver Ads Copilot";

  if (verdict === "not_apt") {
    if (!p.isPublished) {
      actionHref = "/admin/catalog";
      actionLabel = "Publicar producto";
    } else if (p.cost === null) {
      actionHref = "/admin/catalog";
      actionLabel = "Cargar costo";
    } else {
      actionHref = "/admin/catalog";
      actionLabel = "Revisar producto";
    }
  }

  return {
    verdict,
    signals,
    hasExistingAdContext: p.hasAdContext,
    actionHref,
    actionLabel,
  };
}

// ─── Main calculation ───

export function calculateAptitudeReport(products: ProductAptitudeInput[], knownChannels: string[]): AptitudeReport {
  const results: ProductAptitude[] = [];

  // Blocker counters for summary
  const blockerCounts = new Map<string, { label: string; count: number; actionHref: string; actionLabel: string }>();
  function trackBlocker(key: string, label: string, href: string, actionLabel: string) {
    const existing = blockerCounts.get(key);
    if (existing) { existing.count++; return; }
    blockerCounts.set(key, { label, count: 1, actionHref: href, actionLabel });
  }

  let chApt = 0, chReview = 0, chNotApt = 0, chInsufficient = 0;
  let adApt = 0, adReview = 0, adNotApt = 0, adInsufficient = 0;

  for (const p of products) {
    const hasCost = p.cost !== null && p.cost > 0;
    const hasStock = p.totalStock > 0;

    const { signals: generalSignals, verdict: generalVerdict } = evaluateGeneralSignals(p);

    // Channel aptitudes
    const channelAptitudes: ChannelAptitude[] = [];
    for (const ch of knownChannels) {
      const listing = p.listings.find((l) => l.channel === ch) ?? null;
      channelAptitudes.push(evaluateChannelAptitude(p, generalVerdict, listing, ch));
    }

    // Ads aptitude
    const adsAptitude = evaluateAdsAptitude(p, generalVerdict);

    // Count verdicts — use the BEST channel verdict for the product's channel classification
    const bestChannelVerdict = channelAptitudes.length > 0
      ? bestVerdict(channelAptitudes.map((c) => c.verdict))
      : generalVerdict;

    switch (bestChannelVerdict) {
      case "apt": chApt++; break;
      case "review": chReview++; break;
      case "not_apt": chNotApt++; break;
      case "insufficient_data": chInsufficient++; break;
    }

    switch (adsAptitude.verdict) {
      case "apt": adApt++; break;
      case "review": adReview++; break;
      case "not_apt": adNotApt++; break;
      case "insufficient_data": adInsufficient++; break;
    }

    // Track blockers
    for (const s of generalSignals) {
      if (s.impact === "blocking") {
        const href = s.key === "no_cost" ? "/admin/catalog" : s.key === "no_stock" ? "/admin/catalog" : "/admin/catalog";
        const label = s.key === "no_cost" ? "Cargar costos" : s.key === "no_stock" ? "Reponer stock" : "Revisar catálogo";
        trackBlocker(s.key, s.label + ": " + s.value, href, label);
      }
    }

    results.push({
      productId: p.productId,
      title: p.title,
      category: p.category,
      supplier: p.supplier,
      status: p.status,
      isPublished: p.isPublished,
      price: p.price,
      cost: p.cost,
      totalStock: p.totalStock,
      hasCost,
      hasStock,
      image: p.image,
      contributionPerUnit: p.contributionPerUnit,
      netContributionPercent: p.netContributionPercent,
      marginHealth: p.marginHealth,
      costConfidence: p.costConfidence,
      generalVerdict,
      generalSignals,
      channelAptitudes,
      adsAptitude,
    });
  }

  // Sort: not_apt first (most actionable), then review, insufficient, apt last
  results.sort((a, b) => verdictRank(a.generalVerdict) - verdictRank(b.generalVerdict));

  // Top blockers
  const topBlockers: AptitudeBlocker[] = Array.from(blockerCounts.entries())
    .map(([key, v]) => ({ key, label: v.label, count: v.count, actionHref: v.actionHref, actionLabel: v.actionLabel }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const summary: AptitudeSummary = {
    totalProducts: products.length,
    channelApt: chApt,
    channelReview: chReview,
    channelNotApt: chNotApt,
    channelInsufficient: chInsufficient,
    adsApt: adApt,
    adsReview: adReview,
    adsNotApt: adNotApt,
    adsInsufficient: adInsufficient,
    topBlockers,
  };

  return {
    products: results,
    summary,
    generatedAt: new Date().toISOString(),
    engineVersion: "v1",
  };
}

// ─── Helpers ───

function verdictRank(v: AptitudeVerdict): number {
  switch (v) {
    case "not_apt": return 1;
    case "review": return 2;
    case "insufficient_data": return 3;
    case "apt": return 4;
  }
}

function bestVerdict(verdicts: AptitudeVerdict[]): AptitudeVerdict {
  if (verdicts.includes("apt")) return "apt";
  if (verdicts.includes("review")) return "review";
  if (verdicts.includes("insufficient_data")) return "insufficient_data";
  return "not_apt";
}
