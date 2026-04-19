// ─── Order Tracking Widget · Queries ───
// Read-only counters used by the admin setup page. All figures come from
// real Order rows — nothing is estimated, nothing is cached.

import { prisma } from "@/lib/db/prisma";

export interface TrackingStats {
  totalOrders: number;
  withTrackingCode: number;
  shipped: number;
  delivered: number;
}

export async function getTrackingStats(storeId: string): Promise<TrackingStats> {
  const [totalOrders, withTrackingCode, shipped, delivered] = await Promise.all([
    prisma.order.count({ where: { storeId } }),
    prisma.order.count({
      where: { storeId, trackingCode: { not: null } },
    }),
    prisma.order.count({
      where: { storeId, shippingStatus: "shipped" },
    }),
    prisma.order.count({
      where: { storeId, shippingStatus: "delivered" },
    }),
  ]);
  return { totalOrders, withTrackingCode, shipped, delivered };
}

/**
 * Tenant-scoped install status lookup. Used by the storefront footer to
 * decide whether to render the "Seguir pedido" link. Fail-closed: any
 * error returns false so the footer never breaks.
 */
export async function isTrackingWidgetActive(storeId: string): Promise<boolean> {
  try {
    const row = await prisma.installedApp.findUnique({
      where: {
        storeId_appSlug: { storeId, appSlug: "order-tracking-widget" },
      },
      select: { status: true },
    });
    return row?.status === "active";
  } catch {
    return false;
  }
}
