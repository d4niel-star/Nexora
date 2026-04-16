"use server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";

export interface AggregatedCustomer {
  id: string; // fallback to email since there's no real customer ID
  name: string;
  email: string;
  channel: string;
  ordersCount: number;
  totalSpent: number;
  averageTicket: number;
  lastPurchaseAt: string;
  segment: "new" | "recurring" | "vip";
  lifecycleStatus: "active" | "inactive" | "risk";
}

export async function getAggregatedCustomers(): Promise<AggregatedCustomer[]> {
  const store = await getCurrentStore();
  if (!store) return [];

  const orders = await prisma.order.findMany({
    where: { storeId: store.id, status: { not: "cancelled" } },
    orderBy: { createdAt: "desc" },
  });

  const map = new Map<string, any>();

  for (const order of orders) {
    const key = order.email.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        email: key,
        name: `${order.firstName} ${order.lastName}`.trim(),
        channel: order.channel || "Storefront",
        ordersCount: 0,
        totalSpent: 0,
        lastPurchaseAt: order.createdAt, // Since it's ordered desc, the first one seen is the latest
      });
    }

    const customer = map.get(key);
    customer.ordersCount += 1;
    customer.totalSpent += order.total;
    // We keep the channel of the most recent order, or we could leave it
  }

  const now = new Date();
  const aggregated: AggregatedCustomer[] = [];

  for (const c of map.values()) {
    const averageTicket = c.ordersCount > 0 ? c.totalSpent / c.ordersCount : 0;
    
    let segment: "new" | "recurring" | "vip" = "new";
    if (c.ordersCount > 3 || c.totalSpent > 150000) segment = "vip";
    else if (c.ordersCount > 1) segment = "recurring";

    let lifecycleStatus: "active" | "inactive" | "risk" = "active";
    const daysSinceLastPurchase = Math.floor((now.getTime() - new Date(c.lastPurchaseAt).getTime()) / (1000 * 3600 * 24));
    
    if (daysSinceLastPurchase >= 90) lifecycleStatus = "inactive";
    else if (daysSinceLastPurchase >= 60) lifecycleStatus = "risk";

    aggregated.push({
      id: c.email,
      name: c.name || "Sin nombre",
      email: c.email,
      channel: c.channel,
      ordersCount: c.ordersCount,
      totalSpent: c.totalSpent,
      averageTicket,
      lastPurchaseAt: new Date(c.lastPurchaseAt).toISOString(),
      segment,
      lifecycleStatus,
    });
  }

  return aggregated;
}
