// ─── IA de Decisión v1 ───
// Rule-based recommendation engine. Consumes real signals from
// Operations Center, Health Center, and Sourcing Intelligence.
// Produces ranked, explainable, actionable recommendations.
// No LLM — pure data-driven rules on observable state.

import { prisma } from "@/lib/db/prisma";
import { buildVariantHref, buildProductHref } from "@/lib/navigation/hrefs";
import { getCurrentStore } from "@/lib/auth/session";
import { getOperationsCenterData } from "@/lib/operations/queries";
import { getHealthCenterData } from "@/lib/integrations/health";
import { getSourcingIntelData } from "@/lib/sourcing/intelligence";
import { getAptitudeReport } from "@/lib/aptitude/queries";
import { getProviderScoreReport } from "@/lib/sourcing/score-queries";
import { getVelocityReport } from "@/lib/velocity/queries";
import { getReplenishmentReport } from "@/lib/replenishment/queries";
import { getVariantIntelligenceReport } from "@/lib/replenishment/variant-queries";
import { getVariantEconomicsReport } from "@/lib/profitability/variant-queries";
import type {
  DecisionDomain,
  DecisionEngineResult,
  DecisionImpact,
  DecisionRecommendation,
  DecisionSeverity,
  DomainHealth,
  ExecutableAction,
} from "@/types/decisions";

export async function getDecisionRecommendations(): Promise<DecisionEngineResult> {
  // ─── Consume all data sources in parallel ───
  // Velocity is fetched once and passed to replenishment to avoid double-fetch.
  const [opsData, healthData, sourcingData, aptitudeData, scoreData, velocityData] = await Promise.all([
    getOperationsCenterData(),
    getHealthCenterData(),
    getSourcingIntelData(),
    getAptitudeReport(),
    getProviderScoreReport(),
    getVelocityReport(),
  ]);
  const replenishmentData = await getReplenishmentReport(velocityData);
  const variantEcon = await getVariantEconomicsReport();
  const variantData = await getVariantIntelligenceReport(replenishmentData, variantEcon);

  // ─── Fetch entity IDs for execution loops (lightweight) ───
  const store = await getCurrentStore();
  const sid = store?.id ?? "";

  const [firstUnfulfilledOrder, unfulfilledCount, failedSyncConnection, draftProductCount] = await Promise.all([
    sid ? prisma.order.findFirst({
      where: { storeId: sid, paymentStatus: { in: ["approved", "paid"] }, shippingStatus: "unfulfilled", status: { notIn: ["cancelled", "refunded"] } },
      select: { id: true, orderNumber: true },
      orderBy: { createdAt: "asc" },
    }) : null,
    sid ? prisma.order.count({
      where: { storeId: sid, paymentStatus: { in: ["approved", "paid"] }, shippingStatus: "unfulfilled", status: { notIn: ["cancelled", "refunded"] } },
    }) : 0,
    sid ? prisma.providerSyncJob.findFirst({
      where: { storeId: sid, status: "failed" },
      select: { providerConnectionId: true },
      orderBy: { failedAt: "desc" },
    }) : null,
    sid ? prisma.product.count({
      where: { storeId: sid, isPublished: false, status: { in: ["draft", "active"] }, price: { gt: 0 } },
    }) : 0,
  ]);

  const recs: DecisionRecommendation[] = [];

  // ════════════════════════════════════════════
  // OPERATIONS → Decision Recommendations
  // ════════════════════════════════════════════

  for (const item of opsData.items) {
    const domain = mapOpsCategoryToDomain(item.category);
    // Skip AI-domain items — they're already in the WorkQueue with interactive actions
    if (domain === "ads") continue;

    // Attach execution loop for fulfillment — batch if >1, single if 1
    let action: ExecutableAction | undefined;
    if (item.id === "ops-fulfillment" && firstUnfulfilledOrder) {
      if (unfulfilledCount > 1) {
        action = {
          type: "batch_prepare",
          label: `Preparar ${unfulfilledCount}`,
          entityId: "batch",
        };
      } else {
        action = {
          type: "mark_preparing",
          label: "Preparar",
          entityId: firstUnfulfilledOrder.id,
        };
      }
    }

    recs.push({
      id: `dec-ops-${item.id}`,
      domain,
      severity: item.severity as DecisionSeverity,
      impact: resolveOpsImpact(item.category),
      title: item.title,
      reason: buildOpsReason(item),
      evidence: item.metric ? `Dato: ${item.metric}` : item.description,
      href: item.href,
      actionLabel: item.actionLabel,
      action,
    });
  }

  // ════════════════════════════════════════════
  // HEALTH CENTER → Decision Recommendations
  // ════════════════════════════════════════════

  for (const signal of healthData.signals) {
    if (recs.some((r) => r.severity === "critical" && signal.severity === "critical" && r.title.includes(signal.title.split(":")[0]))) {
      continue;
    }

    recs.push({
      id: `dec-health-${signal.id}`,
      domain: signal.href.includes("/admin/sourcing") ? "sourcing" : "ads",
      severity: signal.severity as DecisionSeverity,
      impact: signal.severity === "critical" ? "risk" : "efficiency",
      title: signal.title,
      reason: buildHealthReason(signal),
      evidence: signal.description,
      href: signal.href,
      actionLabel: signal.actionLabel,
    });
  }

  // ════════════════════════════════════════════
  // SOURCING INTELLIGENCE → Decision Recommendations
  // ════════════════════════════════════════════

  const si = sourcingData.summary;

  if (si.syncJobsFailed > 0) {
    recs.push({
      id: "dec-sourcing-sync-failed",
      domain: "sourcing",
      severity: "high",
      impact: "risk",
      title: `${si.syncJobsFailed} sincronización${si.syncJobsFailed !== 1 ? "es" : ""} de proveedor fallida${si.syncJobsFailed !== 1 ? "s" : ""}`,
      reason: "Sin sync actualizado, los costos y stock de proveedor pueden estar desactualizados. Esto afecta el cálculo de margen y la disponibilidad real.",
      evidence: `${si.syncJobsFailed} job(s) con estado failed`,
      href: "/admin/sourcing",
      actionLabel: "Reintentar sync",
      action: failedSyncConnection ? {
        type: "retry_sync",
        label: "Reintentar",
        entityId: failedSyncConnection.providerConnectionId,
      } : undefined,
    });
  }

  if (si.atRisk > 0) {
    const riskProducts = sourcingData.products.filter((p) => p.readiness === "risk");
    const sample = riskProducts[0];
    recs.push({
      id: "dec-sourcing-risk",
      domain: "sourcing",
      severity: "high",
      impact: "risk",
      title: `${si.atRisk} producto${si.atRisk !== 1 ? "s" : ""} de proveedor en riesgo`,
      reason: "Productos sin stock o con conexión de proveedor en error. No conviene importarlos hasta resolver el problema raíz.",
      evidence: sample ? `Ej: "${sample.title}" — ${sample.signals.join(", ")}` : `${si.atRisk} productos con señales de riesgo`,
      href: "/admin/sourcing",
      actionLabel: "Revisar sourcing",
    });
  }

  if (si.importedInDraft > 0) {
    // Find first imported product still in draft for inline publish
    const draftImport = sourcingData.products.find((p) => p.alreadyImported && p.internalStatus === "draft" && p.internalProductId);
    recs.push({
      id: "dec-sourcing-drafts",
      domain: "sourcing",
      severity: "normal",
      impact: "efficiency",
      title: `${si.importedInDraft} producto${si.importedInDraft !== 1 ? "s" : ""} importado${si.importedInDraft !== 1 ? "s" : ""} en borrador`,
      reason: "Ya fueron importados pero no publicados. Publicarlos amplía el catálogo activo sin trabajo adicional de sourcing.",
      evidence: draftImport
        ? `Ej: "${draftImport.title}" — importado, pendiente de publicación`
        : `${si.importedInDraft} de ${si.alreadyImported} importados aún en estado draft`,
      href: "/admin/catalog",
      actionLabel: "Publicar productos",
      action: si.importedInDraft > 1 && draftProductCount > 1
        ? { type: "batch_publish", label: `Publicar ${Math.min(si.importedInDraft, draftProductCount)}`, entityId: "batch" }
        : draftImport?.internalProductId
          ? { type: "publish_product", label: "Publicar", entityId: draftImport.internalProductId }
          : undefined,
    });
  }

  if (si.needsReview > 0) {
    const reviewProducts = sourcingData.products.filter((p) => p.readiness === "review");
    const sample = reviewProducts[0];
    recs.push({
      id: "dec-sourcing-review",
      domain: "sourcing",
      severity: "normal",
      impact: "quality",
      title: `${si.needsReview} importable${si.needsReview !== 1 ? "s" : ""} requiere${si.needsReview === 1 ? "" : "n"} revisión`,
      reason: "Productos con margen bajo o datos incompletos. Revisar antes de importar para evitar márgenes negativos.",
      evidence: sample ? `Ej: "${sample.title}" — ${sample.signals.join(", ")}` : `${si.needsReview} productos con señales de revisión`,
      href: "/admin/sourcing",
      actionLabel: "Revisar importables",
    });
  }

  if (si.readyToImport > 0) {
    const readyProducts = sourcingData.products.filter((p) => p.readiness === "ready");
    const bestMargin = readyProducts.reduce((best, p) => (p.estimatedMarginPercent ?? 0) > (best?.estimatedMarginPercent ?? 0) ? p : best, readyProducts[0]);
    recs.push({
      id: "dec-sourcing-ready",
      domain: "sourcing",
      severity: "info",
      impact: "revenue",
      title: `${si.readyToImport} producto${si.readyToImport !== 1 ? "s" : ""} listo${si.readyToImport !== 1 ? "s" : ""} para importar`,
      reason: "Tienen costo, stock y datos completos. Importarlos puede ampliar el catálogo con buena señal económica.",
      evidence: bestMargin?.estimatedMarginPercent
        ? `Mejor margen estimado: ${bestMargin.estimatedMarginPercent}% ("${bestMargin.title}")`
        : `${si.readyToImport} productos con datos completos`,
      href: "/admin/sourcing",
      actionLabel: "Ver importables",
    });
  }

  // ════════════════════════════════════════════
  // FINANCE → from Ops KPIs (lightweight, no duplication)
  // ════════════════════════════════════════════

  if (opsData.kpis.productsWithoutCost > 0 && opsData.kpis.totalProducts > 0) {
    const pct = Math.round((opsData.kpis.productsWithoutCost / opsData.kpis.totalProducts) * 100);
    // Only add if not already present from ops items
    if (!recs.some((r) => r.id.includes("catalog-no-cost"))) {
      recs.push({
        id: "dec-finance-cost-gap",
        domain: "finance",
        severity: pct > 50 ? "high" : "normal",
        impact: "quality",
        title: `${opsData.kpis.productsWithoutCost} producto${opsData.kpis.productsWithoutCost !== 1 ? "s" : ""} bloquean el cálculo de margen`,
        reason: `El ${pct}% del catálogo no tiene costo cargado. Sin costo, Nexora no puede calcular rentabilidad real ni generar alertas de margen.`,
        evidence: `${opsData.kpis.productsWithoutCost} de ${opsData.kpis.totalProducts} productos sin costo`,
        href: "/admin/catalog",
        actionLabel: "Completar costos",
      });
    }
  }

  // ════════════════════════════════════════════
  // APTITUDE → Decision Recommendations
  // ════════════════════════════════════════════

  const apt = aptitudeData.summary;
  if (apt.totalProducts > 0) {
    // Products not apt for channels
    if (apt.channelNotApt > 0) {
      const blockedProducts = aptitudeData.products.filter((p) => p.generalVerdict === "not_apt");
      const sample = blockedProducts[0];
      const blockers = sample?.generalSignals.filter((s) => s.impact === "blocking").map((s) => s.value).join(", ") || "señales bloqueantes";
      recs.push({
        id: "dec-aptitude-channel-blocked",
        domain: "aptitude",
        severity: apt.channelNotApt > 3 ? "high" : "normal",
        impact: "revenue",
        title: `${apt.channelNotApt} producto${apt.channelNotApt !== 1 ? "s" : ""} no apto${apt.channelNotApt !== 1 ? "s" : ""} para canal`,
        reason: "Productos con señales bloqueantes (sin stock, sin costo, margen negativo) no pueden publicarse de forma rentable.",
        evidence: sample ? `Ej: "${sample.title}" — ${blockers}` : `${apt.channelNotApt} productos bloqueados`,
        href: "/admin/ai",
        actionLabel: "Ver aptitud",
      });
    }

    // Products not apt for ads
    if (apt.adsNotApt > 0 && apt.adsNotApt !== apt.channelNotApt) {
      const blocked = aptitudeData.products.filter((p) => p.adsAptitude.verdict === "not_apt");
      const sample = blocked[0];
      const reasons = sample?.adsAptitude.signals.filter((s) => s.impact === "blocking").map((s) => s.value).join(", ") || "señales bloqueantes";
      recs.push({
        id: "dec-aptitude-ads-blocked",
        domain: "aptitude",
        severity: "normal",
        impact: "efficiency",
        title: `${apt.adsNotApt} producto${apt.adsNotApt !== 1 ? "s" : ""} no apto${apt.adsNotApt !== 1 ? "s" : ""} para pauta`,
        reason: "Pautar productos sin rentabilidad confirmada o sin publicar destruye presupuesto publicitario.",
        evidence: sample ? `Ej: "${sample.title}" — ${reasons}` : `${apt.adsNotApt} productos bloqueados para ads`,
        href: "/admin/ai",
        actionLabel: "Ver aptitud ads",
      });
    }

    // Products that need review (opportunity)
    if (apt.channelReview > 0) {
      recs.push({
        id: "dec-aptitude-review",
        domain: "aptitude",
        severity: "info",
        impact: "quality",
        title: `${apt.channelReview} producto${apt.channelReview !== 1 ? "s" : ""} apto${apt.channelReview !== 1 ? "s" : ""} con revisión pendiente`,
        reason: "Productos con datos parciales o margen fino que podrían habilitarse completando información faltante.",
        evidence: `${apt.channelReview} productos con señales de advertencia resolubles`,
        href: "/admin/ai",
        actionLabel: "Revisar aptitud",
      });
    }
  }

  // ════════════════════════════════════════════
  // PROVIDER SCORE → Decision Recommendations
  // ════════════════════════════════════════════

  const criticalProviders = scoreData.providers.filter((p) => p.tier === "critical");
  const weakProviders = scoreData.providers.filter((p) => p.tier === "weak");

  if (criticalProviders.length > 0) {
    const sample = criticalProviders[0];
    const topSignal = sample.signals.find((s) => s.impact === "negative");
    recs.push({
      id: "dec-provider-critical",
      domain: "sourcing",
      severity: "critical",
      impact: "risk",
      title: `${criticalProviders.length} proveedor${criticalProviders.length !== 1 ? "es" : ""} en estado crítico`,
      reason: "Proveedores con errores de conexión, fallos de sync o datos incompletos que ponen en riesgo el abastecimiento.",
      evidence: topSignal ? `${sample.providerName}: ${topSignal.detail}` : `${sample.providerName} en estado crítico`,
      href: "/admin/sourcing",
      actionLabel: "Revisar proveedores",
    });
  }

  if (weakProviders.length > 0 && criticalProviders.length === 0) {
    const sample = weakProviders[0];
    recs.push({
      id: "dec-provider-weak",
      domain: "sourcing",
      severity: "normal",
      impact: "quality",
      title: `${weakProviders.length} proveedor${weakProviders.length !== 1 ? "es" : ""} débil${weakProviders.length !== 1 ? "es" : ""}`,
      reason: "Proveedores con señales de riesgo moderado. Conviene revisar antes de depender más de ellos.",
      evidence: `${sample.providerName}: ${sample.signals.filter((s) => s.impact === "negative").map((s) => s.label).join(", ") || "señales de debilidad"}`,
      href: "/admin/sourcing",
      actionLabel: "Ver scoring",
    });
  }

  if (scoreData.summary.highPriorityImports > 0) {
    const topImport = scoreData.imports.find((i) => i.priority === "high");
    if (topImport && !recs.some((r) => r.id === "dec-sourcing-ready")) {
      recs.push({
        id: "dec-import-priority",
        domain: "sourcing",
        severity: "info",
        impact: "revenue",
        title: `${scoreData.summary.highPriorityImports} importable${scoreData.summary.highPriorityImports !== 1 ? "s" : ""} de alta prioridad`,
        reason: "Productos con buen margen, stock disponible, costo declarado y proveedor fuerte. Importarlos amplía el catálogo con bajo riesgo.",
        evidence: topImport.estimatedMarginPercent !== null
          ? `Mejor: "${topImport.title}" — margen ${topImport.estimatedMarginPercent}%, stock ${topImport.stock}u.`
          : `"${topImport.title}" con datos completos`,
        href: "/admin/sourcing",
        actionLabel: "Ver importables",
      });
    }
  }

  // ════════════════════════════════════════════
  // VELOCITY / DEMAND INTELLIGENCE
  // ════════════════════════════════════════════

  if (velocityData.summary.totalProducts > 0) {
    // Stalled products with good margin: missed revenue opportunity
    const stalledGood = velocityData.products.filter(
      (p) => (p.rotation === "stalled" || p.rotation === "no_sales") && p.marginHealth === "profitable"
    );
    if (stalledGood.length > 0) {
      const sample = stalledGood[0];
      recs.push({
        id: "dec-velocity-stalled-good",
        domain: "finance",
        severity: "normal",
        impact: "revenue",
        title: `${stalledGood.length} producto${stalledGood.length !== 1 ? "s" : ""} rentable${stalledGood.length !== 1 ? "s" : ""} sin rotacion`,
        reason: "Productos con buena contribucion neta pero sin ventas en 30 dias. Oportunidad de revenue perdida.",
        evidence: `"${sample.title}": ${sample.rotationEvidence}${sample.contributionPerUnit !== null ? " · contribucion $" + Math.round(sample.contributionPerUnit) + "/u." : ""}`,
        href: "/admin/catalog",
        actionLabel: "Revisar catalogo",
      });
    }

    // High rotation + negative margin: value destruction
    const highBad = velocityData.products.filter(
      (p) => (p.rotation === "high" || p.rotation === "medium") && (p.marginHealth === "negative" || p.marginHealth === "at_risk")
    );
    if (highBad.length > 0) {
      const sample = highBad[0];
      recs.push({
        id: "dec-velocity-high-bad-margin",
        domain: "finance",
        severity: "high",
        impact: "revenue",
        title: `${highBad.length} producto${highBad.length !== 1 ? "s" : ""} con alta rotacion y margen negativo`,
        reason: "Se vende mucho pero se pierde plata. Cada venta destruye valor. Revisar costo o precio.",
        evidence: `"${sample.title}": ${sample.rotationEvidence}${sample.netContributionPercent !== null ? " · contribucion " + Math.round(sample.netContributionPercent) + "%" : ""}`,
        href: "/admin/catalog",
        actionLabel: "Revisar precios",
      });
    }

    // Push candidates: high rotation + good economics
    const pushCandidates = velocityData.products.filter((p) => p.action === "push");
    if (pushCandidates.length > 0) {
      recs.push({
        id: "dec-velocity-push",
        domain: "finance",
        severity: "info",
        impact: "revenue",
        title: `${pushCandidates.length} producto${pushCandidates.length !== 1 ? "s" : ""} para empujar`,
        reason: "Productos con buena rotacion y contribucion positiva. Candidatos a mayor visibilidad, ads o stock.",
        evidence: `Top: "${pushCandidates[0].title}" — ${pushCandidates[0].velocityPerDay} u./dia, ${pushCandidates[0].rotationEvidence}`,
        href: "/admin/catalog",
        actionLabel: "Ver candidatos",
      });
    }

    // Pause candidates: bad rotation + bad margin
    const pauseCandidates = velocityData.products.filter((p) => p.action === "pause");
    if (pauseCandidates.length > 0) {
      recs.push({
        id: "dec-velocity-pause",
        domain: "finance",
        severity: "normal",
        impact: "quality",
        title: `${pauseCandidates.length} producto${pauseCandidates.length !== 1 ? "s" : ""} para pausar`,
        reason: "Sin rotacion y margen negativo. Mantenerlos publicados no aporta valor.",
        evidence: `"${pauseCandidates[0].title}": ${pauseCandidates[0].rotationEvidence}`,
        href: "/admin/catalog",
        actionLabel: "Revisar para archivar",
      });
    }

    // Provider velocity signal: provider with many stalled products
    for (const pv of velocityData.providers) {
      if (pv.stalledCount >= 3 && pv.stalledCount > pv.productCount * 0.5) {
        recs.push({
          id: `dec-velocity-provider-${pv.providerName}`,
          domain: "sourcing",
          severity: "normal",
          impact: "quality",
          title: `Proveedor "${pv.providerName}": ${pv.stalledCount} de ${pv.productCount} productos sin rotacion`,
          reason: "La mayoria de productos de este proveedor no se mueven. Evaluar si conviene seguir importando.",
          evidence: `${pv.totalUnitsSold} u. vendidas total, velocidad promedio ${pv.avgVelocityPerDay} u./dia`,
          href: "/admin/sourcing",
          actionLabel: "Revisar proveedor",
        });
      }
    }
  }

  // ════════════════════════════════════════════
  // REPLENISHMENT / SELL-THROUGH INTELLIGENCE
  // ════════════════════════════════════════════

  if (replenishmentData.summary.totalProducts > 0) {
    // Critical stock: products that need immediate reorder
    const criticalProducts = replenishmentData.products.filter((p) => p.urgency === "critical");
    if (criticalProducts.length > 0) {
      const sample = criticalProducts[0];
      const withProvider = criticalProducts.filter((p) => p.canReorderFromProvider);
      recs.push({
        id: "dec-repl-critical",
        domain: "operations",
        severity: "critical",
        impact: "revenue",
        title: `${criticalProducts.length} producto${criticalProducts.length !== 1 ? "s" : ""} con stock critico`,
        reason: "Productos publicados sin stock o con cobertura menor a 3 dias. Cada dia sin stock es venta perdida.",
        evidence: `"${sample.title}": ${sample.urgencyEvidence}${withProvider.length > 0 ? " · " + withProvider.length + " con proveedor disponible" : ""}`,
        href: "/admin/inventory",
        actionLabel: "Reponer stock",
      });
    }

    // Soon: products that need reorder in the next days
    const soonProducts = replenishmentData.products.filter((p) => p.urgency === "soon");
    if (soonProducts.length > 0) {
      const sample = soonProducts[0];
      recs.push({
        id: "dec-repl-soon",
        domain: "operations",
        severity: "high",
        impact: "risk",
        title: `${soonProducts.length} producto${soonProducts.length !== 1 ? "s" : ""} con cobertura baja`,
        reason: "Stock para menos de 10 dias al ritmo actual. Planificar reposicion antes del quiebre.",
        evidence: `"${sample.title}": ${sample.urgencyEvidence}`,
        href: "/admin/inventory",
        actionLabel: "Planificar reposicion",
      });
    }

    // Overstock: capital tied in slow products
    const overstockProducts = replenishmentData.products.filter((p) => p.urgency === "overstock");
    if (overstockProducts.length > 0) {
      const sample = overstockProducts[0];
      recs.push({
        id: "dec-repl-overstock",
        domain: "finance",
        severity: "normal",
        impact: "efficiency",
        title: `${overstockProducts.length} producto${overstockProducts.length !== 1 ? "s" : ""} con sobrestock`,
        reason: "Stock para mas de 120 dias o sin ventas con unidades acumuladas. Capital inmovilizado.",
        evidence: `"${sample.title}": ${sample.urgencyEvidence}`,
        href: "/admin/inventory",
        actionLabel: "Evaluar liquidacion",
      });
    }

    // Provider reorder opportunity (v2: enriched with lead time analysis)
    const reorderFromProvider = replenishmentData.products.filter(
      (p) => (p.urgency === "critical" || p.urgency === "soon") && p.canReorderFromProvider
    );
    if (reorderFromProvider.length > 0) {
      const sample = reorderFromProvider[0];
      const leadTimeInfo = sample.providerLeadTimeMinDays !== null && sample.providerLeadTimeMaxDays !== null
        ? ` · lead time: ${sample.providerLeadTimeMinDays}-${sample.providerLeadTimeMaxDays}d`
        : sample.providerLeadTime ? ` · lead time: ${sample.providerLeadTime}` : "";
      recs.push({
        id: "dec-repl-provider-reorder",
        domain: "sourcing",
        severity: "normal",
        impact: "efficiency",
        title: `${reorderFromProvider.length} producto${reorderFromProvider.length !== 1 ? "s" : ""} reponible${reorderFromProvider.length !== 1 ? "s" : ""} desde proveedor`,
        reason: "Productos con stock critico o bajo que tienen proveedor con stock disponible.",
        evidence: `"${sample.title}" via ${sample.providerName}${leadTimeInfo}${sample.providerStock !== null ? " · stock proveedor: " + sample.providerStock + " u." : ""}`,
        href: "/admin/sourcing",
        actionLabel: "Reponer desde proveedor",
      });
    }

    // v2: Lead-time risk — products where coverage < lead time (reorder won't arrive in time)
    const leadTimeRiskProducts = replenishmentData.products.filter((p) => p.leadTimeRiskLabel !== null);
    if (leadTimeRiskProducts.length > 0) {
      const sample = leadTimeRiskProducts[0];
      recs.push({
        id: "dec-repl-leadtime-risk",
        domain: "sourcing",
        severity: "high",
        impact: "risk",
        title: `${leadTimeRiskProducts.length} producto${leadTimeRiskProducts.length !== 1 ? "s" : ""} con cobertura menor al lead time del proveedor`,
        reason: "Aunque se ordene reposición ahora, la cobertura actual no alcanza a cubrir el tiempo de entrega del proveedor.",
        evidence: `"${sample.title}": ${sample.leadTimeRiskLabel}`,
        href: "/admin/inventory",
        actionLabel: "Ver riesgo de quiebre",
      });
    }
  }

  // ════════════════════════════════════════════
  // VARIANT INTELLIGENCE v2
  // ════════════════════════════════════════════

  if (variantData.summary.productsWithHiddenRisk > 0) {
    const topProduct = variantData.products.find((p) => p.hasHiddenRisk);
    const worst = topProduct?.worstVariant;
    // Find the first hidden variant for drilldown
    const hiddenVariant = topProduct?.variants.find((v) => v.hiddenByAggregate);
    recs.push({
      id: "dec-variant-hidden-risk",
      domain: "operations",
      severity: "high",
      impact: "risk",
      title: `${variantData.summary.productsWithHiddenRisk} producto${variantData.summary.productsWithHiddenRisk !== 1 ? "s" : ""} con variantes en riesgo oculto`,
      reason: "El producto parece sano en agregado, pero una o más variantes están agotadas o críticas. Compradores que buscan esa variante no pueden comprar.",
      evidence: worst
        ? `"${topProduct!.productTitle}" — variante "${worst.variantTitle}": ${worst.riskEvidence} (${topProduct!.stockoutVariants + topProduct!.criticalVariants} de ${topProduct!.totalVariants} variantes en riesgo)`
        : `${variantData.summary.productsWithHiddenRisk} productos con riesgo oculto por variante`,
      href: hiddenVariant ? buildVariantHref(hiddenVariant.variantId) : "/admin/inventory",
      actionLabel: "Ver variantes en riesgo",
    });
  }

  if (variantData.summary.stockoutVariants > 0) {
    const totalStockout = variantData.summary.stockoutVariants;
    const topProduct = variantData.products.find((p) => p.stockoutVariants > 0);
    const worst = topProduct?.variants.find((v) => v.risk === "stockout");
    // Only add if not redundant with hidden risk signal
    if (variantData.summary.productsWithHiddenRisk === 0) {
      recs.push({
        id: "dec-variant-stockout",
        domain: "operations",
        severity: "high",
        impact: "revenue",
        title: `${totalStockout} variante${totalStockout !== 1 ? "s" : ""} sin stock`,
        reason: "Variantes agotadas generan ventas perdidas directas. Cada variante sin stock es un SKU que no puede venderse.",
        evidence: worst
          ? `"${worst.productTitle}" / "${worst.variantTitle}": ${worst.riskEvidence}`
          : `${totalStockout} variantes agotadas`,
        href: worst ? buildVariantHref(worst.variantId, "reorder") : "/admin/inventory",
        actionLabel: "Reponer variantes",
      });
    }
  }

  // ════════════════════════════════════════════
  // VARIANT ECONOMICS v1
  // ════════════════════════════════════════════

  if (variantEcon.summary.negativeVariants > 0) {
    const negProduct = variantEcon.products.find((p) => p.negativeVariants > 0);
    const worst = negProduct?.worstVariant;
    recs.push({
      id: "dec-variant-econ-negative",
      domain: "finance",
      severity: "high",
      impact: "efficiency",
      title: `${variantEcon.summary.negativeVariants} variante${variantEcon.summary.negativeVariants !== 1 ? "s" : ""} con contribución negativa`,
      reason: "Variantes que destruyen valor en cada venta. El producto puede parecer sano en agregado pero estas variantes erosionan la rentabilidad.",
      evidence: worst
        ? `"${worst.productTitle}" / "${worst.variantTitle}": ${worst.healthEvidence}`
        : `${variantEcon.summary.negativeVariants} variantes con margen negativo`,
      href: worst ? buildVariantHref(worst.variantId, "adjust") : "/admin/inventory",
      actionLabel: "Ver variantes no rentables",
    });
  }

  // Variants that sell well but destroy value
  if (variantData.products.length > 0 && variantEcon.products.length > 0) {
    const destroyers: { title: string; variant: string; variantId: string; evidence: string }[] = [];
    for (const product of variantData.products) {
      for (const v of product.variants) {
        if (v.velocityPerDay > 0 && v.econHealth === "negative" && v.unitsSold30d >= 5) {
          destroyers.push({
            title: v.productTitle,
            variant: v.variantTitle,
            variantId: v.variantId,
            evidence: `${v.unitsSold30d} u. vendidas en 30d a ${v.velocityPerDay} u./dia, contribución $${v.contributionPerUnit ?? 0}/u.`,
          });
        }
      }
    }
    if (destroyers.length > 0) {
      const sample = destroyers[0];
      recs.push({
        id: "dec-variant-econ-fast-destroyer",
        domain: "finance",
        severity: "critical",
        impact: "efficiency",
        title: `${destroyers.length} variante${destroyers.length !== 1 ? "s" : ""} con alta rotación y contribución negativa`,
        reason: "Variantes que rotan rápido pero pierden dinero en cada venta. Cuanto más venden, más destruyen valor.",
        evidence: `"${sample.title}" / "${sample.variant}": ${sample.evidence}`,
        href: buildVariantHref(sample.variantId, "adjust"),
        actionLabel: "Revisar precios o costos",
      });
    }
  }

  // ════════════════════════════════════════════
  // VARIANT INTELLIGENCE v2.2 (Health + Actions)
  // ════════════════════════════════════════════

  // Critical health variants (stockout with recent sales)
  const criticalVariants: { title: string; variant: string; evidence: string }[] = [];
  for (const product of variantData.products) {
    for (const v of product.variants) {
      if (v.health === "critical" && v.unitsSold30d > 0) {
        criticalVariants.push({
          title: v.productTitle,
          variant: v.variantTitle,
          evidence: `${v.unitsSold30d} u. vendidas en 30d, ${v.available} u. disponibles. ${v.healthEvidence}`,
        });
      }
    }
  }
  if (criticalVariants.length > 0) {
    const sample = criticalVariants[0];
    recs.push({
      id: "dec-variant-health-critical",
      domain: "operations",
      severity: "critical",
      impact: "risk",
      title: `${criticalVariants.length} variante${criticalVariants.length !== 1 ? "s" : ""} en estado crítico`,
      reason: "Variantes agotadas o con stock crítico que tienen demanda reciente. Ventas perdidas activas.",
      evidence: `"${sample.title}" / "${sample.variant}": ${sample.evidence}`,
      href: buildVariantHref(sample.variant, "adjust"),
      actionLabel: "Reponer urgentemente",
    });
  }

  // Stuck variants (high stock, no sales)
  const stuckVariants: { title: string; variant: string; variantId: string; evidence: string }[] = [];
  for (const product of variantData.products) {
    for (const v of product.variants) {
      if (v.health === "stuck" && v.stock > 0) {
        stuckVariants.push({
          title: v.productTitle,
          variant: v.variantTitle,
          variantId: v.variantId,
          evidence: `${v.stock} u. en stock, 0 ventas en 30d. Capital inmovilizado.`,
        });
      }
    }
  }
  if (stuckVariants.length > 0) {
    const sample = stuckVariants[0];
    recs.push({
      id: "dec-variant-health-stuck",
      domain: "finance",
      severity: "normal",
      impact: "efficiency",
      title: `${stuckVariants.length} variante${stuckVariants.length !== 1 ? "s" : ""} inmovilizada${stuckVariants.length !== 1 ? "s" : ""}`,
      reason: "Variantes con stock alto pero sin ventas recientes. Capital inmovilizado.",
      evidence: `"${sample.title}" / "${sample.variant}": ${sample.evidence}`,
      href: buildVariantHref(sample.variantId),
      actionLabel: "Revisar stock",
    });
  }

  // Push candidates (low sell-through with some sales)
  const pushVariants: { title: string; variant: string; variantId: string; evidence: string }[] = [];
  for (const product of variantData.products) {
    for (const v of product.variants) {
      if (v.action === "push" && v.sellThroughPercent !== null && v.sellThroughPercent < 30 && v.unitsSold30d >= 3) {
        pushVariants.push({
          title: v.productTitle,
          variant: v.variantTitle,
          variantId: v.variantId,
          evidence: `${Math.round(v.sellThroughPercent)}% sell-through, ${v.unitsSold30d} u. vendidas en 30d.`,
        });
      }
    }
  }
  if (pushVariants.length > 0) {
    const sample = pushVariants[0];
    recs.push({
      id: "dec-variant-action-push",
      domain: "finance",
      severity: "normal",
      impact: "revenue",
      title: `${pushVariants.length} variante${pushVariants.length !== 1 ? "s" : ""} merecen empuje`,
      reason: "Variantes con rotación pero sell-through bajo. Candidatas a promoción o visibilidad.",
      evidence: `"${sample.title}" / "${sample.variant}": ${sample.evidence}`,
      href: buildVariantHref(sample.variantId),
      actionLabel: "Ver variantes",
    });
  }

  // Urgent reorder variants (weak health with rotation)
  const urgentReorderVariants: { title: string; variant: string; variantId: string; evidence: string }[] = [];
  for (const product of variantData.products) {
    for (const v of product.variants) {
      if (v.action === "reorder" && v.health === "weak" && v.velocityPerDay >= 0.5) {
        urgentReorderVariants.push({
          title: v.productTitle,
          variant: v.variantTitle,
          variantId: v.variantId,
          evidence: `${v.available} u. disponibles, ${v.velocityPerDay} u./dia. ${v.healthEvidence}`,
        });
      }
    }
  }
  if (urgentReorderVariants.length > 0) {
    const sample = urgentReorderVariants[0];
    recs.push({
      id: "dec-variant-action-reorder",
      domain: "operations",
      severity: "high",
      impact: "risk",
      title: `${urgentReorderVariants.length} variante${urgentReorderVariants.length !== 1 ? "s" : ""} requieren reposición`,
      reason: "Variantes con stock crítico o bajo reorderPoint y rotación media-alta. Quiebre inminente.",
      evidence: `"${sample.title}" / "${sample.variant}": ${sample.evidence}`,
      href: buildVariantHref(sample.variantId, "reorder"),
      actionLabel: "Planificar reposición",
    });
  }

  // ════════════════════════════════════════════
  // VARIANT COMMERCIAL ACTIONS v1
  // ════════════════════════════════════════════

  // Commercial push candidates (good economics + good operations + low sell-through)
  const commercialPushCandidates: { title: string; variant: string; variantId: string; evidence: string }[] = [];
  for (const product of variantData.products) {
    for (const v of product.variants) {
      // Good economics: profitable or thin
      const goodEconomics = v.econHealth === "profitable" || v.econHealth === "thin";
      // Good operations: stable or weak (not critical/stuck)
      const goodOperations = v.health === "stable" || v.health === "weak";
      // Low sell-through but some sales
      const lowSellThrough = v.sellThroughPercent !== null && v.sellThroughPercent >= 30 && v.sellThroughPercent < 60 && v.unitsSold30d >= 3;
      
      if (goodEconomics && goodOperations && lowSellThrough) {
        commercialPushCandidates.push({
          title: v.productTitle,
          variant: v.variantTitle,
          variantId: v.variantId,
          evidence: `${v.econHealth === "profitable" ? "Rentable" : "Margen fino"}, ${Math.round(v.sellThroughPercent!)}% sell-through, ${v.unitsSold30d} u. vendidas en 30d.`,
        });
      }
    }
  }
  if (commercialPushCandidates.length > 0) {
    const sample = commercialPushCandidates[0];
    recs.push({
      id: "dec-variant-commercial-push",
      domain: "finance",
      severity: "normal",
      impact: "revenue",
      title: `${commercialPushCandidates.length} variante${commercialPushCandidates.length !== 1 ? "s" : ""} merecen empuje comercial`,
      reason: "Variantes con buen margen y salud operativa, pero sell-through bajo. Candidatas a promoción o visibilidad.",
      evidence: `"${sample.title}" / "${sample.variant}": ${sample.evidence}`,
      href: buildVariantHref(sample.variantId),
      actionLabel: "Promocionar variante",
    });
  }

  // Commercial pause candidates (negative economics with high rotation)
  const commercialPauseCandidates: { title: string; variant: string; variantId: string; evidence: string }[] = [];
  for (const product of variantData.products) {
    for (const v of product.variants) {
      // Negative economics
      const negativeEconomics = v.econHealth === "negative";
      // High rotation
      const highRotation = v.velocityPerDay >= 0.5 && v.unitsSold30d >= 5;
      
      if (negativeEconomics && highRotation) {
        commercialPauseCandidates.push({
          title: v.productTitle,
          variant: v.variantTitle,
          variantId: v.variantId,
          evidence: `Margen negativo, ${v.unitsSold30d} u. vendidas en 30d a ${v.velocityPerDay} u./dia. Cada venta pierde dinero.`,
        });
      }
    }
  }
  if (commercialPauseCandidates.length > 0) {
    const sample = commercialPauseCandidates[0];
    recs.push({
      id: "dec-variant-commercial-pause",
      domain: "finance",
      severity: "critical",
      impact: "efficiency",
      title: `${commercialPauseCandidates.length} variante${commercialPauseCandidates.length !== 1 ? "s" : ""} destruyen valor con rotación`,
      reason: "Variantes con margen negativo que rotan rápido. Cuanto más venden, más destruyen valor. Revisar pricing o costo.",
      evidence: `"${sample.title}" / "${sample.variant}": ${sample.evidence}`,
      href: buildVariantHref(sample.variantId, "adjust"),
      actionLabel: "Revisar pricing o costo",
    });
  }

  // Pricing review candidates (at-risk or negative economics)
  const pricingReviewCandidates: { title: string; variant: string; variantId: string; evidence: string }[] = [];
  for (const product of variantData.products) {
    for (const v of product.variants) {
      // At-risk or negative economics
      const badEconomics = v.econHealth === "negative" || v.econHealth === "at_risk";
      // Not already covered by commercial pause (lower rotation)
      const moderateRotation = v.unitsSold30d >= 1 && v.unitsSold30d < 5;
      
      if (badEconomics && moderateRotation) {
        pricingReviewCandidates.push({
          title: v.productTitle,
          variant: v.variantTitle,
          variantId: v.variantId,
          evidence: `Margen ${v.econHealth === "negative" ? "negativo" : "en riesgo"}, ${v.unitsSold30d} u. vendidas en 30d.`,
        });
      }
    }
  }
  if (pricingReviewCandidates.length > 0) {
    const sample = pricingReviewCandidates[0];
    recs.push({
      id: "dec-variant-pricing-review",
      domain: "finance",
      severity: "high",
      impact: "efficiency",
      title: `${pricingReviewCandidates.length} variante${pricingReviewCandidates.length !== 1 ? "s" : ""} requieren revisión de pricing`,
      reason: "Variantes con margen negativo o en riesgo. Revisar pricing puede mejorar rentabilidad.",
      evidence: `"${sample.title}" / "${sample.variant}": ${sample.evidence}`,
      href: buildVariantHref(sample.variantId, "adjust"),
      actionLabel: "Revisar pricing",
    });
  }

  // Cost review candidates (negative economics with low cost confidence)
  const costReviewCandidates: { title: string; variant: string; variantId: string; productId: string; evidence: string }[] = [];
  for (const product of variantData.products) {
    for (const v of product.variants) {
      // Negative economics
      const negativeEconomics = v.econHealth === "negative";
      // Low cost confidence
      const lowCostConfidence = v.costConfidence === "none" || v.costConfidence === "medium";
      
      if (negativeEconomics && lowCostConfidence) {
        costReviewCandidates.push({
          title: v.productTitle,
          variant: v.variantTitle,
          variantId: v.variantId,
          productId: product.productId,
          evidence: `Margen negativo, costo ${v.costConfidence === "none" ? "desconocido" : "estimado"}. Revisar costo puede mejorar rentabilidad.`,
        });
      }
    }
  }
  if (costReviewCandidates.length > 0) {
    const sample = costReviewCandidates[0];
    recs.push({
      id: "dec-variant-cost-review",
      domain: "sourcing",
      severity: "high",
      impact: "efficiency",
      title: `${costReviewCandidates.length} variante${costReviewCandidates.length !== 1 ? "s" : ""} requieren revisión de costo`,
      reason: "Variantes con margen negativo y costo desconocido o estimado. Revisar costo real puede mejorar rentabilidad. La corrección de costo es a nivel producto.",
      evidence: `"${sample.title}" / "${sample.variant}": ${sample.evidence}`,
      href: buildProductHref(sample.productId, "cost"),
      actionLabel: "Revisar costo (producto)",
    });
  }

  // No scale candidates (stuck variants with high stock)
  const noScaleCandidates: { title: string; variant: string; variantId: string; evidence: string }[] = [];
  for (const product of variantData.products) {
    for (const v of product.variants) {
      // Stuck with high stock
      const stuckWithStock = v.health === "stuck" && v.stock >= 10;
      
      if (stuckWithStock) {
        noScaleCandidates.push({
          title: v.productTitle,
          variant: v.variantTitle,
          variantId: v.variantId,
          evidence: `${v.stock} u. en stock, 0 ventas en 30d. No conviene escalar comercialmente.`,
        });
      }
    }
  }
  if (noScaleCandidates.length > 0) {
    const sample = noScaleCandidates[0];
    recs.push({
      id: "dec-variant-no-scale",
      domain: "finance",
      severity: "normal",
      impact: "efficiency",
      title: `${noScaleCandidates.length} variante${noScaleCandidates.length !== 1 ? "s" : ""} no conviene escalar`,
      reason: "Variantes con stock alto y sin ventas. Escalar comercialmente no resolverá el problema. Revisar stock o pricing.",
      evidence: `"${sample.title}" / "${sample.variant}": ${sample.evidence}`,
      href: buildVariantHref(sample.variantId),
      actionLabel: "Revisar stock",
    });
  }

  // ════════════════════════════════════════════
  // SORT: severity → impact → domain
  // ════════════════════════════════════════════

  recs.sort((a, b) => {
    const sevDiff = severityRank(b.severity) - severityRank(a.severity);
    if (sevDiff !== 0) return sevDiff;
    const impDiff = impactRank(b.impact) - impactRank(a.impact);
    if (impDiff !== 0) return impDiff;
    return domainRank(a.domain) - domainRank(b.domain);
  });

  // ════════════════════════════════════════════
  // DOMAIN SUMMARY
  // ════════════════════════════════════════════

  const domainMap = new Map<DecisionDomain, { count: number; maxSeverity: DecisionSeverity }>();
  for (const r of recs) {
    const existing = domainMap.get(r.domain);
    if (!existing) {
      domainMap.set(r.domain, { count: 1, maxSeverity: r.severity });
    } else {
      existing.count++;
      if (severityRank(r.severity) > severityRank(existing.maxSeverity)) {
        existing.maxSeverity = r.severity;
      }
    }
  }

  const domainLabels: Record<DecisionDomain, string> = {
    operations: "Operación",
    finance: "Finanzas",
    sourcing: "Sourcing",
    ads: "Ads",
    aptitude: "Aptitud",
  };

  const domains: DomainHealth[] = (["operations", "finance", "sourcing", "ads", "aptitude"] as DecisionDomain[])
    .map((d) => ({
      domain: d,
      label: domainLabels[d],
      count: domainMap.get(d)?.count ?? 0,
      maxSeverity: domainMap.get(d)?.maxSeverity ?? ("info" as DecisionSeverity),
    }))
    .filter((d) => d.count > 0);

  return {
    recommendations: recs,
    domains,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Helpers ───

function mapOpsCategoryToDomain(cat: string): DecisionDomain {
  switch (cat) {
    case "orders": return "operations";
    case "margin": return "finance";
    case "catalog": return "finance";
    case "inventory": return "operations";
    case "sourcing": return "sourcing";
    case "ai": return "ads";
    default: return "operations";
  }
}

function resolveOpsImpact(cat: string): DecisionImpact {
  switch (cat) {
    case "orders": return "revenue";
    case "margin": return "quality";
    case "catalog": return "quality";
    case "inventory": return "risk";
    case "sourcing": return "efficiency";
    default: return "efficiency";
  }
}

function buildOpsReason(item: { category: string; title: string; description: string }): string {
  switch (item.category) {
    case "orders":
      if (item.title.includes("sin despachar")) return "Pedidos pagados retenidos impactan la experiencia del cliente y pueden generar reclamos o cancelaciones.";
      if (item.title.includes("pago pendiente")) return "Pedidos con pago no confirmado. Monitorear para evitar fraude o abandono.";
      return item.description;
    case "inventory":
      if (item.title.includes("sin stock")) return "Productos publicados sin stock generan mala experiencia. Los compradores encuentran productos que no pueden comprar.";
      if (item.title.includes("stock bajo")) return "Stock bajo en productos activos puede causar quiebre de inventario inminente.";
      return item.description;
    case "margin":
      return "Sin costo cargado no se puede calcular margen real. Esto afecta la salud financiera visible del negocio.";
    case "sourcing":
      if (item.title.includes("fallida")) return "Importaciones fallidas indican problemas de conexión o datos con el proveedor.";
      if (item.title.includes("borrador")) return "Productos importados pero no publicados. Completar el flujo para que generen valor.";
      return item.description;
    default:
      return item.description;
  }
}

function buildHealthReason(signal: { severity: string; title: string; description: string }): string {
  if (signal.title.includes("token vencido") || signal.title.includes("token vence")) {
    return "Sin token valido la integracion pierde sincronizacion. No se actualizan metricas ni datos operativos.";
  }
  if (signal.title.includes("error")) {
    return "Una conexion en error impide la operacion normal de la integracion. Resolver antes de que se acumulen problemas.";
  }
  if (signal.title.includes("sin sincronización")) {
    return "Integraciones sin sync reciente pueden dejar datos operativos desactualizados.";
  }
  return signal.description;
}

function severityRank(s: DecisionSeverity): number {
  switch (s) { case "critical": return 4; case "high": return 3; case "normal": return 2; case "info": return 1; }
}

function impactRank(i: DecisionImpact): number {
  switch (i) { case "revenue": return 4; case "risk": return 3; case "efficiency": return 2; case "quality": return 1; }
}

function domainRank(d: DecisionDomain): number {
  switch (d) { case "operations": return 1; case "finance": return 2; case "sourcing": return 3; case "ads": return 4; case "aptitude": return 5; }
}
