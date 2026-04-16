// ─── Commercial Command Center v2 ───
// Orchestration layer. Consumes existing engines, produces unified commercial directives.
// No DB access. Pure merge + prioritization of engine outputs.
// Not a new engine — an intelligent merger of existing intelligence.

import type { CommandCenterData, CommandDirective, CommandKpis, CommandPriority, CommandDomain } from "@/types/command-center";
import { buildVariantHref, buildProductHref } from "@/lib/navigation/hrefs";
import type { VelocityReport } from "@/types/velocity";
import type { ReplenishmentReport } from "@/types/replenishment";
import type { ProfitabilityReport } from "@/types/profitability";
import type { DecisionEngineResult } from "@/types/decisions";
import type { OperationsCenterData } from "@/types/operations";
import type { VariantIntelligenceReport } from "@/types/variant-intelligence";
import type { VariantEconomicsReport } from "@/types/variant-economics";

export function buildCommandCenter(
  velocity: VelocityReport,
  replenishment: ReplenishmentReport,
  profitability: ProfitabilityReport,
  decisions: DecisionEngineResult,
  operations: OperationsCenterData,
  variantIntelligence?: VariantIntelligenceReport,
  variantEconomics?: VariantEconomicsReport,
): CommandCenterData {
  const directives: CommandDirective[] = [];

  // ════════════════════════════════════════════
  // STOCK DIRECTIVES (from replenishment)
  // ════════════════════════════════════════════

  const criticalStock = replenishment.products.filter((p) => p.urgency === "critical");
  if (criticalStock.length > 0) {
    const sample = criticalStock[0];
    const withProvider = criticalStock.filter((p) => p.canReorderFromProvider).length;
    directives.push({
      id: "cmd-stock-critical",
      priority: "critical",
      domain: "stock",
      title: `Reponer urgente: ${criticalStock.length} producto${criticalStock.length !== 1 ? "s" : ""} sin cobertura`,
      reason: "Productos publicados sin stock o con menos de 3 dias de cobertura. Ventas perdidas cada dia.",
      evidence: `"${sample.title}": ${sample.urgencyEvidence}${withProvider > 0 ? ` · ${withProvider} con proveedor disponible` : ""}`,
      href: "/admin/inventory",
      actionLabel: "Reponer stock",
      productCount: criticalStock.length,
    });
  }

  const soonStock = replenishment.products.filter((p) => p.urgency === "soon");
  if (soonStock.length > 0) {
    directives.push({
      id: "cmd-stock-soon",
      priority: "high",
      domain: "stock",
      title: `Planificar reposicion: ${soonStock.length} producto${soonStock.length !== 1 ? "s" : ""} con cobertura baja`,
      reason: "Stock para menos de 10 dias al ritmo de venta actual.",
      evidence: `"${soonStock[0].title}": ${soonStock[0].urgencyEvidence}`,
      href: "/admin/inventory",
      actionLabel: "Planificar",
      productCount: soonStock.length,
    });
  }

  // ════════════════════════════════════════════
  // REVENUE DIRECTIVES (from velocity)
  // ════════════════════════════════════════════

  const pushProducts = velocity.products.filter((p) => p.action === "push");
  if (pushProducts.length > 0) {
    const top = pushProducts[0];
    directives.push({
      id: "cmd-revenue-push",
      priority: "medium",
      domain: "revenue",
      title: `Empujar: ${pushProducts.length} producto${pushProducts.length !== 1 ? "s" : ""} con buena rotacion y margen`,
      reason: "Buena contribucion + rotacion alta o media. Candidatos a mas visibilidad, ads o stock.",
      evidence: `"${top.title}": ${top.rotationEvidence}${top.contributionPerUnit !== null ? ` · $${Math.round(top.contributionPerUnit)}/u.` : ""}`,
      href: "/admin/catalog",
      actionLabel: "Ver productos",
      productCount: pushProducts.length,
    });
  }

  // High rotation + bad margin = value destruction
  const destroyingValue = velocity.products.filter(
    (p) => (p.rotation === "high" || p.rotation === "medium") && (p.marginHealth === "negative" || p.marginHealth === "at_risk")
  );
  if (destroyingValue.length > 0) {
    const top = destroyingValue[0];
    directives.push({
      id: "cmd-margin-destruction",
      priority: "high",
      domain: "margin",
      title: `Corregir precio/costo: ${destroyingValue.length} producto${destroyingValue.length !== 1 ? "s" : ""} destruyendo valor`,
      reason: "Se venden bien pero cada venta pierde plata. Corregir costo o precio.",
      evidence: `"${top.title}": ${top.rotationEvidence}${top.netContributionPercent !== null ? ` · contribucion ${Math.round(top.netContributionPercent)}%` : ""}`,
      href: "/admin/catalog",
      actionLabel: "Revisar precios",
      productCount: destroyingValue.length,
    });
  }

  // Profitable but stalled = missed opportunity
  const missedOpportunity = velocity.products.filter(
    (p) => (p.rotation === "stalled" || p.rotation === "no_sales") && p.marginHealth === "profitable"
  );
  if (missedOpportunity.length > 0) {
    const top = missedOpportunity[0];
    directives.push({
      id: "cmd-revenue-stalled-profitable",
      priority: "medium",
      domain: "revenue",
      title: `Activar: ${missedOpportunity.length} producto${missedOpportunity.length !== 1 ? "s" : ""} rentable${missedOpportunity.length !== 1 ? "s" : ""} sin rotacion`,
      reason: "Buena contribucion neta pero no se mueven. Evaluar visibilidad, canal o promocion.",
      evidence: `"${top.title}": ${top.rotationEvidence}${top.contributionPerUnit !== null ? ` · $${Math.round(top.contributionPerUnit)}/u. de contribucion` : ""}`,
      href: "/admin/catalog",
      actionLabel: "Activar productos",
      productCount: missedOpportunity.length,
    });
  }

  // ════════════════════════════════════════════
  // MARGIN DIRECTIVES (from profitability)
  // ════════════════════════════════════════════

  const noCost = profitability.byProduct.filter((p) => !p.hasCostData);
  if (noCost.length > 0) {
    directives.push({
      id: "cmd-margin-no-cost",
      priority: "high",
      domain: "margin",
      title: `Cargar costo: ${noCost.length} producto${noCost.length !== 1 ? "s" : ""} sin costo real`,
      reason: "Sin costo no se puede calcular margen ni rentabilidad real. Afecta toda la inteligencia comercial.",
      evidence: noCost.length === 1 ? `"${noCost[0].title}" sin costo cargado` : `"${noCost[0].title}" y ${noCost.length - 1} mas sin costo cargado`,
      href: "/admin/catalog",
      actionLabel: "Cargar costos",
      productCount: noCost.length,
    });
  }

  // Overstock = capital tied
  const overstock = replenishment.products.filter((p) => p.urgency === "overstock");
  if (overstock.length > 0) {
    directives.push({
      id: "cmd-margin-overstock",
      priority: "medium",
      domain: "stock",
      title: `Reducir sobrestock: ${overstock.length} producto${overstock.length !== 1 ? "s" : ""} con capital inmovilizado`,
      reason: "Stock para mas de 120 dias o unidades sin ventas. Capital atado que no genera retorno.",
      evidence: `"${overstock[0].title}": ${overstock[0].urgencyEvidence}`,
      href: "/admin/inventory",
      actionLabel: "Evaluar liquidacion",
      productCount: overstock.length,
    });
  }

  // Pause candidates: stalled + bad margin
  const pauseProducts = velocity.products.filter((p) => p.action === "pause");
  if (pauseProducts.length > 0) {
    directives.push({
      id: "cmd-margin-pause",
      priority: "low",
      domain: "margin",
      title: `Pausar: ${pauseProducts.length} producto${pauseProducts.length !== 1 ? "s" : ""} sin rotacion y margen negativo`,
      reason: "No se venden y cuando se venden se pierde plata. Retirar del catalogo activo.",
      evidence: `"${pauseProducts[0].title}": ${pauseProducts[0].rotationEvidence}`,
      href: "/admin/catalog",
      actionLabel: "Revisar para archivar",
      productCount: pauseProducts.length,
    });
  }

  // ════════════════════════════════════════════
  // CHANNEL / SOURCING DIRECTIVES (from decisions)
  // ════════════════════════════════════════════

  for (const rec of decisions.recommendations) {
    // Channel friction: sync issues, listing problems
    if (rec.domain === "channels" && rec.severity === "critical") {
      directives.push({
        id: `cmd-channel-${rec.id}`,
        priority: "critical",
        domain: "channel",
        title: rec.title,
        reason: rec.reason,
        evidence: rec.evidence,
        href: rec.href,
        actionLabel: rec.actionLabel,
      });
    }

    // Critical sourcing: failed sync, provider down
    if (rec.domain === "sourcing" && (rec.severity === "critical" || rec.severity === "high")) {
      directives.push({
        id: `cmd-sourcing-${rec.id}`,
        priority: rec.severity === "critical" ? "critical" : "high",
        domain: "sourcing",
        title: rec.title,
        reason: rec.reason,
        evidence: rec.evidence,
        href: rec.href,
        actionLabel: rec.actionLabel,
      });
    }
  }

  // Provider reorder (from replenishment, v2: enriched with structured lead time)
  const reorderFromProvider = replenishment.products.filter(
    (p) => (p.urgency === "critical" || p.urgency === "soon") && p.canReorderFromProvider
  );
  if (reorderFromProvider.length > 0) {
    const sample = reorderFromProvider[0];
    const leadTimeInfo = sample.providerLeadTimeMinDays !== null && sample.providerLeadTimeMaxDays !== null
      ? ` · lead time: ${sample.providerLeadTimeMinDays}-${sample.providerLeadTimeMaxDays}d`
      : sample.providerLeadTime ? ` · lead time: ${sample.providerLeadTime}` : "";
    directives.push({
      id: "cmd-sourcing-reorder",
      priority: "medium",
      domain: "sourcing",
      title: `Reponer desde proveedor: ${reorderFromProvider.length} producto${reorderFromProvider.length !== 1 ? "s" : ""}`,
      reason: "Productos con stock critico o bajo cuyo proveedor tiene stock disponible.",
      evidence: `"${sample.title}" via ${sample.providerName}${leadTimeInfo}`,
      href: "/admin/sourcing",
      actionLabel: "Reponer desde proveedor",
      productCount: reorderFromProvider.length,
    });
  }

  // v2: Lead-time risk
  const leadTimeRiskProducts = replenishment.products.filter((p) => p.leadTimeRiskLabel !== null);
  if (leadTimeRiskProducts.length > 0) {
    const sample = leadTimeRiskProducts[0];
    directives.push({
      id: "cmd-leadtime-risk",
      priority: "high",
      domain: "stock",
      title: `${leadTimeRiskProducts.length} producto${leadTimeRiskProducts.length !== 1 ? "s" : ""}: cobertura menor al lead time`,
      reason: "La cobertura actual no alcanza para cubrir el tiempo de entrega del proveedor. Quiebre probable aun reponiendo hoy.",
      evidence: `"${sample.title}": ${sample.leadTimeRiskLabel}`,
      href: "/admin/inventory",
      actionLabel: "Ver riesgo de entrega",
      productCount: leadTimeRiskProducts.length,
    });
  }

  // v2: Variant hidden risk
  if (variantIntelligence && variantIntelligence.summary.productsWithHiddenRisk > 0) {
    const topProduct = variantIntelligence.products.find((p) => p.hasHiddenRisk);
    const worst = topProduct?.worstVariant;
    directives.push({
      id: "cmd-variant-hidden-risk",
      priority: "high",
      domain: "stock",
      title: `${variantIntelligence.summary.productsWithHiddenRisk} producto${variantIntelligence.summary.productsWithHiddenRisk !== 1 ? "s" : ""} con variantes en riesgo oculto`,
      reason: "Producto sano en agregado pero con variantes agotadas o críticas. Ventas perdidas invisibles.",
      evidence: worst
        ? `"${topProduct!.productTitle}" — "${worst.variantTitle}": ${worst.riskEvidence}`
        : `${variantIntelligence.summary.productsWithHiddenRisk} productos afectados`,
      href: "/admin/inventory",
      actionLabel: "Ver variantes en riesgo",
      productCount: variantIntelligence.summary.productsWithHiddenRisk,
    });
  }

  // v2.1: Variant economics directives
  if (variantEconomics && variantEconomics.summary.negativeVariants > 0) {
    const negProduct = variantEconomics.products.find((p) => p.negativeVariants > 0);
    const worst = negProduct?.worstVariant;
    directives.push({
      id: "cmd-variant-econ-negative",
      priority: "high",
      domain: "margin",
      title: `${variantEconomics.summary.negativeVariants} variante${variantEconomics.summary.negativeVariants !== 1 ? "s" : ""} destruyen valor`,
      reason: "Variantes con contribución neta negativa. Cada venta de estas variantes reduce la rentabilidad.",
      evidence: worst
        ? `"${worst.productTitle}" / "${worst.variantTitle}": ${worst.healthEvidence}`
        : `${variantEconomics.summary.negativeVariants} variantes con margen negativo`,
      href: "/admin/inventory",
      actionLabel: "Revisar variantes",
      productCount: variantEconomics.summary.productsWithEconRisk,
    });
  }

  // v2.2: Variant health directives
  if (variantIntelligence) {
    // Critical health variants (stockout with sales)
    const criticalVariants: { title: string; variant: string; variantId: string; evidence: string }[] = [];
    for (const product of variantIntelligence.products) {
      for (const v of product.variants) {
        if (v.health === "critical" && v.unitsSold30d > 0) {
          criticalVariants.push({
            title: v.productTitle,
            variant: v.variantTitle,
            variantId: v.variantId,
            evidence: `${v.unitsSold30d} u. vendidas en 30d, ${v.available} u. disponibles. ${v.healthEvidence}`,
          });
        }
      }
    }
    if (criticalVariants.length > 0) {
      const sample = criticalVariants[0];
      directives.push({
        id: "cmd-variant-health-critical",
        priority: "critical",
        domain: "stock",
        title: `${criticalVariants.length} variante${criticalVariants.length !== 1 ? "s" : ""} en estado crítico`,
        reason: "Variantes agotadas o con stock crítico que tienen demanda reciente. Ventas perdidas activas.",
        evidence: `"${sample.title}" / "${sample.variant}": ${sample.evidence}`,
        href: buildVariantHref(sample.variantId, "adjust"),
        actionLabel: "Reponer urgentemente",
        productCount: criticalVariants.length,
      });
    }

    // Stuck variants (high stock, no sales)
    const stuckVariants: { title: string; variant: string; variantId: string; evidence: string }[] = [];
    for (const product of variantIntelligence.products) {
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
      directives.push({
        id: "cmd-variant-health-stuck",
        priority: "medium",
        domain: "stock",
        title: `${stuckVariants.length} variante${stuckVariants.length !== 1 ? "s" : ""} inmovilizada${stuckVariants.length !== 1 ? "s" : ""}`,
        reason: "Variantes con stock alto pero sin ventas recientes. Capital inmovilizado.",
        evidence: `"${sample.title}" / "${sample.variant}": ${sample.evidence}`,
        href: buildVariantHref(sample.variantId),
        actionLabel: "Revisar stock",
        productCount: stuckVariants.length,
      });
    }

    // Push candidates (low sell-through with sales)
    const pushVariants: { title: string; variant: string; variantId: string; evidence: string }[] = [];
    for (const product of variantIntelligence.products) {
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
      directives.push({
        id: "cmd-variant-action-push",
        priority: "medium",
        domain: "revenue",
        title: `${pushVariants.length} variante${pushVariants.length !== 1 ? "s" : ""} merecen empuje`,
        reason: "Variantes con rotación pero sell-through bajo. Candidatas a promoción o visibilidad.",
        evidence: `"${sample.title}" / "${sample.variant}": ${sample.evidence}`,
        href: buildVariantHref(sample.variantId),
        actionLabel: "Ver variantes",
        productCount: pushVariants.length,
      });
    }

    // Urgent reorder variants (weak health with rotation)
    const urgentReorderVariants: { title: string; variant: string; variantId: string; evidence: string }[] = [];
    for (const product of variantIntelligence.products) {
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
      directives.push({
        id: "cmd-variant-action-reorder",
        priority: "high",
        domain: "stock",
        title: `${urgentReorderVariants.length} variante${urgentReorderVariants.length !== 1 ? "s" : ""} requieren reposición`,
        reason: "Variantes con stock crítico o bajo reorderPoint y rotación media-alta. Quiebre inminente.",
        evidence: `"${sample.title}" / "${sample.variant}": ${sample.evidence}`,
        href: buildVariantHref(sample.variantId, "reorder"),
        actionLabel: "Planificar reposición",
        productCount: urgentReorderVariants.length,
      });
    }

    // ════════════════════════════════════════════
    // VARIANT COMMERCIAL ACTIONS v1 (Command Center subset)
    // ════════════════════════════════════════════

    // Variants that destroy value with high rotation (critical commercial)
    const destroyersWithRotation: { title: string; variant: string; variantId: string; evidence: string }[] = [];
    for (const product of variantIntelligence.products) {
      for (const v of product.variants) {
        const negativeEconomics = v.econHealth === "negative";
        const highRotation = v.velocityPerDay >= 0.5 && v.unitsSold30d >= 5;
        
        if (negativeEconomics && highRotation) {
          destroyersWithRotation.push({
            title: v.productTitle,
            variant: v.variantTitle,
            variantId: v.variantId,
            evidence: `Margen negativo, ${v.unitsSold30d} u. vendidas en 30d a ${v.velocityPerDay} u./dia. Cada venta pierde dinero.`,
          });
        }
      }
    }
    if (destroyersWithRotation.length > 0) {
      const sample = destroyersWithRotation[0];
      directives.push({
        id: "cmd-variant-commercial-destroy",
        priority: "critical",
        domain: "margin",
        title: `${destroyersWithRotation.length} variante${destroyersWithRotation.length !== 1 ? "s" : ""} destruyen valor y siguen rotando`,
        reason: "Variantes con margen negativo que rotan rápido. Cuanto más venden, más destruyen valor. Revisar pricing o costo antes de seguir escalando.",
        evidence: `"${sample.title}" / "${sample.variant}": ${sample.evidence}`,
        href: buildVariantHref(sample.variantId, "adjust"),
        actionLabel: "Revisar pricing o costo",
        productCount: destroyersWithRotation.length,
      });
    }

    // Pricing review candidates (high commercial)
    const pricingReviewCandidates: { title: string; variant: string; variantId: string; evidence: string }[] = [];
    for (const product of variantIntelligence.products) {
      for (const v of product.variants) {
        const badEconomics = v.econHealth === "negative" || v.econHealth === "at_risk";
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
      directives.push({
        id: "cmd-variant-pricing-review",
        priority: "high",
        domain: "margin",
        title: `${pricingReviewCandidates.length} variante${pricingReviewCandidates.length !== 1 ? "s" : ""} requieren revisión de pricing`,
        reason: "Variantes con margen negativo o en riesgo que ya tienen ventas. Revisar pricing puede mejorar rentabilidad.",
        evidence: `"${sample.title}" / "${sample.variant}": ${sample.evidence}`,
        href: buildVariantHref(sample.variantId, "adjust"),
        actionLabel: "Revisar pricing",
        productCount: pricingReviewCandidates.length,
      });
    }

    // Cost review candidates (high commercial)
    const costReviewCandidates: { title: string; variant: string; variantId: string; productId: string; evidence: string }[] = [];
    for (const product of variantIntelligence.products) {
      for (const v of product.variants) {
        const negativeEconomics = v.econHealth === "negative";
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
      directives.push({
        id: "cmd-variant-cost-review",
        priority: "high",
        domain: "margin",
        title: `${costReviewCandidates.length} variante${costReviewCandidates.length !== 1 ? "s" : ""} tienen costo incierto afectando margen`,
        reason: "Variantes con margen negativo y costo desconocido o estimado. Revisar costo real puede mejorar rentabilidad. La corrección de costo es a nivel producto.",
        evidence: `"${sample.title}" / "${sample.variant}": ${sample.evidence}`,
        href: buildProductHref(sample.productId, "cost"),
        actionLabel: "Revisar costo (producto)",
        productCount: costReviewCandidates.length,
      });
    }
  }

  // ════════════════════════════════════════════
  // OPERATIONS DIRECTIVES (only highest-impact)
  // ════════════════════════════════════════════

  const criticalOps = operations.items.filter((i) => i.severity === "critical");
  for (const op of criticalOps.slice(0, 2)) {
    // Skip inventory/margin ops that are already covered by replenishment/profitability directives
    if (op.category === "inventory" || op.category === "margin") continue;
    directives.push({
      id: `cmd-ops-${op.id}`,
      priority: "critical",
      domain: "operations",
      title: op.title,
      reason: op.description,
      evidence: op.metric ?? "",
      href: op.href,
      actionLabel: op.actionLabel,
    });
  }

  // ════════════════════════════════════════════
  // DEDUPLICATE + SORT
  // ════════════════════════════════════════════

  const seen = new Set<string>();
  const deduped = directives.filter((d) => {
    if (seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  });

  deduped.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));

  // ════════════════════════════════════════════
  // KPIs
  // ════════════════════════════════════════════

  // Calculate variant KPIs from variant intelligence
  let criticalVariants = 0;
  let stuckVariants = 0;
  let negativeVariants = 0;
  let hiddenVariantRiskProducts = 0;
  let firstCriticalVariantId: string | null = null;
  let firstHiddenVariantId: string | null = null;

  if (variantIntelligence) {
    // Count critical variants (health === "critical" with recent sales)
    for (const product of variantIntelligence.products) {
      for (const v of product.variants) {
        if (v.health === "critical" && v.unitsSold30d > 0) {
          criticalVariants++;
          if (!firstCriticalVariantId) {
            firstCriticalVariantId = v.variantId;
          }
        }
        if (v.health === "stuck" && v.stock > 0) {
          stuckVariants++;
        }
      }
      if (product.hasHiddenRisk) {
        hiddenVariantRiskProducts++;
        if (!firstHiddenVariantId) {
          // Find the first hidden variant in this product
          const hiddenVariant = product.variants.find((v) => v.hiddenByAggregate);
          if (hiddenVariant) {
            firstHiddenVariantId = hiddenVariant.variantId;
          }
        }
      }
    }
  }

  // Count negative variants from variant economics
  if (variantEconomics) {
    negativeVariants = variantEconomics.summary.negativeVariants;
  }

  const kpis: CommandKpis = {
    revenue30d: velocity.summary.totalRevenue,
    unitsSold30d: velocity.summary.totalUnitsSold,
    avgMarginPercent: profitability.summary.ordersAnalyzed > 0 ? Math.round(profitability.summary.netContributionPercent) : null,
    productsPublished: operations.kpis.productsPublished,
    totalProducts: operations.kpis.totalProducts,
    criticalStock: replenishment.summary.critical,
    overstockProducts: replenishment.summary.overstock,
    pushCandidates: velocity.summary.pushCount,
    pauseCandidates: velocity.summary.pauseCount,
    ordersToProcess: operations.kpis.ordersToProcess,
    // Variant KPIs v1
    criticalVariants,
    stuckVariants,
    negativeVariants,
    hiddenVariantRiskProducts,
    // Variant Drilldown v1
    firstCriticalVariantId,
    firstHiddenVariantId,
  };

  return {
    directives: deduped,
    kpis,
    generatedAt: new Date().toISOString(),
  };
}

function priorityRank(p: CommandPriority): number {
  switch (p) { case "critical": return 1; case "high": return 2; case "medium": return 3; case "low": return 4; }
}
