"use server";

import { getCurrentStore } from "@/lib/auth/session";
import { getOrderTimeline, type OrderTimelineEvent } from "./timeline";

/**
 * Server action to fetch timeline events for a specific order.
 * Called on-demand when the order drawer opens.
 * Validates store ownership before returning data.
 */
export async function fetchOrderTimeline(
  orderId: string,
): Promise<OrderTimelineEvent[]> {
  const store = await getCurrentStore();
  if (!store) return [];
  if (!orderId || typeof orderId !== "string") return [];

  return getOrderTimeline(orderId, store.id);
}
