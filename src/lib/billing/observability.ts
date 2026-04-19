// ─── Billing Observability Queries ───
// Pure read-only aggregates over existing data. No side effects, no new tables.
// All metrics are derived from: StoreSubscription, BillingTransaction,
// SystemEvent, EmailLog, and Plan.

import { prisma } from "@/lib/db/prisma";

// ─── 1. Subscription status counts ───

export interface SubscriptionStatusCounts {
  active: number;
  trialing: number;
  past_due: number;
  unpaid: number;
  cancelled: number;
  trial_expired: number;
  other: number;
  total: number;
}

export async function getSubscriptionStatusCounts(): Promise<SubscriptionStatusCounts> {
  const subs = await prisma.storeSubscription.groupBy({
    by: ["status"],
    _count: { status: true },
  });

  const counts: SubscriptionStatusCounts = {
    active: 0,
    trialing: 0,
    past_due: 0,
    unpaid: 0,
    cancelled: 0,
    trial_expired: 0,
    other: 0,
    total: 0,
  };

  const knownStatuses = ["active", "trialing", "past_due", "unpaid", "cancelled", "trial_expired"] as const;

  for (const row of subs) {
    const status = row.status;
    const known = knownStatuses.find((s) => s === status);
    if (known) {
      counts[known] = row._count.status;
    } else {
      counts.other += row._count.status;
    }
    counts.total += row._count.status;
  }

  return counts;
}

// ─── 2. Active accounts by plan ───

export interface PlanDistribution {
  planCode: string;
  planName: string;
  count: number;
}

export async function getActivePlanDistribution(): Promise<PlanDistribution[]> {
  const subs = await prisma.storeSubscription.findMany({
    where: { status: { in: ["active", "trialing"] } },
    include: { plan: { select: { code: true, name: true } } },
  });

  const map = new Map<string, { planName: string; count: number }>();
  for (const sub of subs) {
    const key = sub.plan.code;
    const existing = map.get(key);
    if (existing) {
      existing.count++;
    } else {
      map.set(key, { planName: sub.plan.name, count: 1 });
    }
  }

  return Array.from(map.entries()).map(([planCode, v]) => ({
    planCode,
    planName: v.planName,
    count: v.count,
  }));
}

// ─── 3. Recent plan changes (from SystemEvent) ───

export interface PlanChangeEvent {
  storeId: string;
  oldPlanId: string | null;
  newPlanId: string;
  newPlanCode: string;
  timestamp: Date;
}

export async function getRecentPlanChanges(limit = 20): Promise<PlanChangeEvent[]> {
  const events = await prisma.systemEvent.findMany({
    where: { eventType: "plan_changed" },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      storeId: true,
      metadataJson: true,
      createdAt: true,
    },
  });

  return events
    .filter((e) => e.storeId && e.metadataJson)
    .map((e) => {
      const meta = JSON.parse(e.metadataJson!);
      return {
        storeId: e.storeId!,
        oldPlanId: meta.oldPlanId ?? null,
        newPlanId: meta.newPlanId,
        newPlanCode: meta.newPlanCode,
        timestamp: e.createdAt,
      };
    });
}

// ─── 4. Billing transaction summary ───

export interface TransactionSummary {
  totalUpgrades: number;
  approvedUpgrades: number;
  failedUpgrades: number;
  pendingUpgrades: number;
  totalCreditPacks: number;
  approvedCreditPacks: number;
  totalRevenueARS: number;
}

export async function getTransactionSummary(
  sinceDaysAgo = 30,
): Promise<TransactionSummary> {
  const since = new Date();
  since.setDate(since.getDate() - sinceDaysAgo);

  const txs = await prisma.billingTransaction.findMany({
    where: { createdAt: { gte: since } },
    select: { type: true, status: true, amount: true },
  });

  const summary: TransactionSummary = {
    totalUpgrades: 0,
    approvedUpgrades: 0,
    failedUpgrades: 0,
    pendingUpgrades: 0,
    totalCreditPacks: 0,
    approvedCreditPacks: 0,
    totalRevenueARS: 0,
  };

  for (const tx of txs) {
    if (tx.type === "plan_upgrade") {
      summary.totalUpgrades++;
      if (tx.status === "approved") {
        summary.approvedUpgrades++;
        summary.totalRevenueARS += tx.amount;
      } else if (tx.status === "failed") {
        summary.failedUpgrades++;
      } else {
        summary.pendingUpgrades++;
      }
    }
    if (tx.type === "credit_pack") {
      summary.totalCreditPacks++;
      if (tx.status === "approved") {
        summary.approvedCreditPacks++;
        summary.totalRevenueARS += tx.amount;
      }
    }
  }

  return summary;
}

// ─── 5. Dunning / Recovery metrics ───

export interface DunningMetrics {
  currentPastDue: number;
  currentUnpaid: number;
  currentCancelled: number;
  dunningEmailsSent: number;
  suspensionWarningsSent: number;
  reactivationEmailsSent: number;
  paymentFailureEvents: number;
  reactivationEvents: number;
}

export async function getDunningMetrics(
  sinceDaysAgo = 30,
): Promise<DunningMetrics> {
  const since = new Date();
  since.setDate(since.getDate() - sinceDaysAgo);

  const [statusCounts, dunningEmails, suspensionEmails, reactivationEmails, failureEvents, reactivationEvents] =
    await Promise.all([
      // Current troubled accounts
      prisma.storeSubscription.groupBy({
        by: ["status"],
        where: { status: { in: ["past_due", "unpaid", "cancelled"] } },
        _count: { status: true },
      }),
      // Dunning emails sent in period
      prisma.emailLog.count({
        where: {
          eventType: "BILLING_PAYMENT_FAILED",
          status: "sent",
          sentAt: { gte: since },
        },
      }),
      prisma.emailLog.count({
        where: {
          eventType: "BILLING_SUSPENSION_WARNING",
          status: "sent",
          sentAt: { gte: since },
        },
      }),
      prisma.emailLog.count({
        where: {
          eventType: "BILLING_REACTIVATED",
          status: "sent",
          sentAt: { gte: since },
        },
      }),
      // Payment failure events
      prisma.systemEvent.count({
        where: {
          eventType: "billing_payment_failed",
          createdAt: { gte: since },
        },
      }),
      // Reactivation events (plan_changed after failure)
      prisma.systemEvent.count({
        where: {
          eventType: "billing_plan_upgraded",
          createdAt: { gte: since },
        },
      }),
    ]);

  const statusMap: Record<string, number> = {};
  for (const row of statusCounts) {
    statusMap[row.status] = row._count.status;
  }

  return {
    currentPastDue: statusMap["past_due"] || 0,
    currentUnpaid: statusMap["unpaid"] || 0,
    currentCancelled: statusMap["cancelled"] || 0,
    dunningEmailsSent: dunningEmails,
    suspensionWarningsSent: suspensionEmails,
    reactivationEmailsSent: reactivationEmails,
    paymentFailureEvents: failureEvents,
    reactivationEvents: reactivationEvents,
  };
}

// ─── 6. Full observability bundle ───

export interface BillingObservabilityData {
  statusCounts: SubscriptionStatusCounts;
  planDistribution: PlanDistribution[];
  transactionSummary: TransactionSummary;
  dunningMetrics: DunningMetrics;
  recentPlanChanges: PlanChangeEvent[];
}

export async function getBillingObservability(): Promise<BillingObservabilityData> {
  const [statusCounts, planDistribution, transactionSummary, dunningMetrics, recentPlanChanges] =
    await Promise.all([
      getSubscriptionStatusCounts(),
      getActivePlanDistribution(),
      getTransactionSummary(30),
      getDunningMetrics(30),
      getRecentPlanChanges(10),
    ]);

  return {
    statusCounts,
    planDistribution,
    transactionSummary,
    dunningMetrics,
    recentPlanChanges,
  };
}
