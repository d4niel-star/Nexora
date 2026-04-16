// ─── Diff Engine / Out-of-Sync Center v2 Data Layer ───
// Fetches all published listings with their product/variant data,
// feeds the diff engine, and returns the DiffReport.

"use server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import { calculateDiffReport, type ListingDiffInput } from "./diff-engine";
import type { DiffReport } from "@/types/sync-diff";

export async function getDiffReport(): Promise<DiffReport> {
  const store = await getCurrentStore();
  if (!store) {
    return {
      entries: [],
      summary: {
        totalListings: 0, withDiffs: 0, withErrors: 0,
        byField: [], bySeverity: [], byChannel: [],
      },
      generatedAt: new Date().toISOString(),
      engineVersion: "v2",
    };
  }

  const sid = store.id;

  // Fetch all listings that are in a publishable state (not draft, not disconnected entirely)
  // Include the product + variants for local comparison values
  const listings = await prisma.channelListing.findMany({
    where: {
      storeId: sid,
      status: { in: ["published", "paused", "failed"] },
    },
    include: {
      product: {
        include: {
          variants: {
            select: { stock: true, reservedStock: true },
          },
          images: {
            take: 1,
            orderBy: { sortOrder: "asc" },
            select: { url: true },
          },
        },
      },
    },
  });

  const inputs: ListingDiffInput[] = listings.map((l) => {
    const p = l.product;
    const totalAvailableStock = p.variants.reduce(
      (sum, v) => sum + Math.max(v.stock - v.reservedStock, 0),
      0,
    );

    return {
      listingId: l.id,
      productId: p.id,
      productTitle: p.title,
      productImage: p.featuredImage ?? p.images[0]?.url ?? "",
      productPrice: p.price,
      totalAvailableStock,
      channel: l.channel,
      listingStatus: l.status,
      syncStatus: l.syncStatus,
      syncedPrice: l.syncedPrice,
      syncedStock: l.syncedStock,
      syncedTitle: l.syncedTitle,
      externalUrl: l.externalUrl,
      lastSyncedAt: l.lastSyncedAt?.toISOString() ?? null,
      lastError: l.lastError,
      retryCount: l.retryCount,
    };
  });

  return calculateDiffReport(inputs);
}
