"use server";

// ─── Customer Insights — Server Queries ──────────────────────────────────
// Real customer intelligence derived from order data.
// No auth system required — works purely from orders + emails.

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";

export interface CustomerInsight {
  email: string;
  name: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string;
  avgOrderValue: number;
  segment: "vip" | "repeat" | "single" | "lapsed";
}

export interface RecoveryInsight {
  abandonedCarts30d: number;
  recoveredCarts30d: number;
  recoveryRevenue: number;
  recoveryRate: number;
}

export interface CustomerInsightsData {
  totalCustomers: number;
  repeatCustomers: number;
  vipCustomers: number;
  avgLifetimeValue: number;
  topCustomers: CustomerInsight[];
  recovery: RecoveryInsight;
}

export async function getCustomerInsights(): Promise<CustomerInsightsData> {
  const store = await getCurrentStore();
  if (!store) return emptyInsights();

  const d30ago = new Date(Date.now() - 30 * 86400000);
  const d90ago = new Date(Date.now() - 90 * 86400000);

  // Aggregate customer data from paid orders
  const customerAgg = await prisma.$queryRaw<
    { email: string; name: string; orderCount: number; totalSpent: number; lastOrderAt: Date; avgOrderValue: number }[]
  >`
    SELECT
      email,
      CONCAT("firstName", ' ', "lastName") AS name,
      COUNT(*)::int AS "orderCount",
      SUM(total)::float AS "totalSpent",
      MAX("createdAt") AS "lastOrderAt",
      AVG(total)::float AS "avgOrderValue"
    FROM "Order"
    WHERE "storeId" = ${store.id}
      AND "paymentStatus" IN ('paid', 'approved')
      AND status NOT IN ('cancelled', 'refunded')
      AND email IS NOT NULL
    GROUP BY email, "firstName", "lastName"
    ORDER BY "totalSpent" DESC
    LIMIT 100
  `.catch(() => []);

  const totalCustomers = customerAgg.length;
  const repeatCustomers = customerAgg.filter((c) => c.orderCount >= 2).length;
  const vipCustomers = customerAgg.filter((c) => c.orderCount >= 3 || c.totalSpent >= 50000).length;
  const totalLTV = customerAgg.reduce((sum, c) => sum + c.totalSpent, 0);
  const avgLifetimeValue = totalCustomers > 0 ? Math.round(totalLTV / totalCustomers) : 0;

  const topCustomers: CustomerInsight[] = customerAgg.slice(0, 10).map((c) => ({
    email: c.email,
    name: c.name?.trim() || c.email.split("@")[0],
    orderCount: c.orderCount,
    totalSpent: c.totalSpent,
    lastOrderAt: c.lastOrderAt.toISOString(),
    avgOrderValue: Math.round(c.avgOrderValue),
    segment: c.orderCount >= 3 || c.totalSpent >= 50000
      ? "vip"
      : c.orderCount >= 2
        ? "repeat"
        : new Date(c.lastOrderAt) < d90ago
          ? "lapsed"
          : "single",
  }));

  // Recovery insights from abandoned cart emails
  const [abandonedCount, recoveredCount, recoveryRevenueAgg] = await Promise.all([
    prisma.systemEvent.count({
      where: { storeId: store.id, eventType: { contains: "abandoned_cart" }, createdAt: { gte: d30ago } },
    }).catch(() => 0),
    prisma.systemEvent.count({
      where: { storeId: store.id, eventType: { contains: "abandoned_cart" }, message: { contains: "recover" }, createdAt: { gte: d30ago } },
    }).catch(() => 0),
    prisma.order.aggregate({
      where: {
        storeId: store.id,
        createdAt: { gte: d30ago },
        paymentStatus: { in: ["paid", "approved"] },
        status: { notIn: ["cancelled", "refunded"] },
      },
      _sum: { total: true },
    }).catch(() => ({ _sum: { total: null as number | null } })),
  ]);

  const recovery: RecoveryInsight = {
    abandonedCarts30d: abandonedCount,
    recoveredCarts30d: recoveredCount,
    recoveryRevenue: recoveryRevenueAgg?._sum?.total ?? 0,
    recoveryRate: abandonedCount > 0 ? Math.round((recoveredCount / abandonedCount) * 100) : 0,
  };

  return { totalCustomers, repeatCustomers, vipCustomers, avgLifetimeValue, topCustomers, recovery };
}

function emptyInsights(): CustomerInsightsData {
  return {
    totalCustomers: 0,
    repeatCustomers: 0,
    vipCustomers: 0,
    avgLifetimeValue: 0,
    topCustomers: [],
    recovery: { abandonedCarts30d: 0, recoveredCarts30d: 0, recoveryRevenue: 0, recoveryRate: 0 },
  };
}
