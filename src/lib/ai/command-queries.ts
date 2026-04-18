// ─── Commercial Command Center v2 Data Layer ───
// Fetches engine outputs in parallel and feeds the command center orchestrator.
// IMPORTANT: Does NOT call getDecisionRecommendations() because that internally
// calls velocity + replenishment + 6 other engines, causing a massive cascade.
// Instead, calls the lightweight sources (operations + health) directly for
// the sourcing signals the command center needs.

"use server";

import { getVelocityReport } from "@/lib/velocity/queries";
import { getReplenishmentReport } from "@/lib/replenishment/queries";
import { getVariantIntelligenceReport } from "@/lib/replenishment/variant-queries";
import { getProfitabilityReport } from "@/lib/profitability/queries";
import { getVariantEconomicsReport } from "@/lib/profitability/variant-queries";
import { getOperationsCenterData } from "@/lib/operations/queries";
import { getHealthCenterData } from "@/lib/integrations/health";
import { analyzeCatalog } from "@/lib/ai/builder/catalog-analyzer";
import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import { buildCommandCenter } from "./command-center";
import type { CommandCenterData } from "@/types/command-center";
import type { DecisionEngineResult, DecisionRecommendation } from "@/types/decisions";

export async function getCommandCenterData(): Promise<CommandCenterData> {
  const store = await getCurrentStore();
  const storeId = store?.id ?? null;

  // Step 1: Fetch velocity once (heaviest call — orders + profitability internally).
  // Then pass it to replenishment so it doesn't re-fetch.
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const [velocity, profitability, operations, health, variantEcon, catalogReport, paidOrdersLast30d] = await Promise.all([
    getVelocityReport(),
    getProfitabilityReport(),
    getOperationsCenterData(),
    getHealthCenterData(),
    getVariantEconomicsReport(),
    storeId ? analyzeCatalog(storeId) : Promise.resolve(undefined),
    // Count of distinct paid orders in the last 30 days — real executive metric.
    // Mirrors the same paid filter as velocity/profitability (paid/approved, excluding
    // cancelled/refunded that never had settled payment). PENDING is never counted.
    storeId
      ? prisma.order.count({
          where: {
            storeId,
            createdAt: { gte: thirtyDaysAgo },
            paymentStatus: { in: ["approved", "paid"] },
            status: { notIn: ["cancelled", "refunded"] },
          },
        })
      : Promise.resolve(0),
  ]);

  // Step 2: Replenishment uses the pre-computed velocity report — zero redundancy.
  const replenishment = await getReplenishmentReport(velocity);

  // Step 3: Variant intelligence uses pre-computed replenishment + economics for merged context.
  const variantIntel = await getVariantIntelligenceReport(replenishment, variantEcon);

  // Build a lightweight decision-like structure from operations + health
  // so the command center orchestrator can extract sourcing signals
  // without needing the full decision engine cascade.
  const lightDecisions: DecisionEngineResult = {
    recommendations: buildLightRecommendations(operations, health),
    domains: [],
    generatedAt: new Date().toISOString(),
  };

  return buildCommandCenter(
    velocity,
    replenishment,
    profitability,
    lightDecisions,
    operations,
    variantIntel,
    variantEcon,
    catalogReport,
    paidOrdersLast30d,
  );
}

// Extracts only the sourcing critical signals that the command center uses.
// This replaces the full decision engine call, avoiding the 5x velocity cascade.
function buildLightRecommendations(
  operations: Awaited<ReturnType<typeof getOperationsCenterData>>,
  health: Awaited<ReturnType<typeof getHealthCenterData>>,
): DecisionRecommendation[] {
  const recs: DecisionRecommendation[] = [];

  for (const item of operations.items) {
    if (item.category === "sourcing" && (item.severity === "critical" || item.severity === "high")) {
      recs.push({
        id: `dec-ops-${item.id}`,
        domain: "sourcing",
        severity: item.severity as "critical" | "high",
        impact: "risk",
        title: item.title,
        reason: item.description,
        evidence: item.metric ?? item.description,
        href: item.href,
        actionLabel: item.actionLabel,
      });
    }
  }

  // Health signals
  for (const signal of health.signals) {
    if (signal.severity === "critical") {
      recs.push({
        id: `dec-health-${signal.id}`,
        domain: signal.href.includes("/admin/sourcing") ? "sourcing" : "ads",
        severity: "critical",
        impact: "risk",
        title: signal.title,
        reason: signal.description,
        evidence: signal.description,
        href: signal.href,
        actionLabel: signal.actionLabel,
      });
    }
  }

  return recs;
}
