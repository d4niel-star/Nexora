import { prisma } from "@/lib/db/prisma";
import { calculateDiffReport, buildOutOfSyncReason, type ListingDiffInput } from "@/lib/sync/diff-engine";

/**
 * Detects out-of-sync listings using the Diff Engine v2.
 * Compares internal product state against synced snapshots on each listing.
 * Persists granular outOfSyncReason with field-level detail.
 */
export async function detectOutOfSyncListings(storeId: string) {
  const listings = await prisma.channelListing.findMany({
    where: {
      storeId,
      status: "published",
    },
    include: {
      product: {
        include: {
          variants: { select: { stock: true, reservedStock: true } },
          images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
        },
      },
    },
  });

  // Build inputs for the diff engine
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

  const report = calculateDiffReport(inputs);

  // Determine which listings need status updates
  const diffListingIds = new Set(report.entries.map((e) => e.listingId));
  const updates = [];

  for (const listing of listings) {
    const entry = report.entries.find((e) => e.listingId === listing.id);

    if (entry && entry.diffs.length > 0 && listing.syncStatus !== "out_of_sync") {
      // Mark as out_of_sync with granular reason
      updates.push(
        prisma.channelListing.update({
          where: { id: listing.id },
          data: {
            syncStatus: "out_of_sync",
            outOfSyncReason: buildOutOfSyncReason(entry.diffs),
          },
        }),
      );
    } else if (!diffListingIds.has(listing.id) && listing.syncStatus === "out_of_sync") {
      // Was out of sync but now matches — resolve
      updates.push(
        prisma.channelListing.update({
          where: { id: listing.id },
          data: {
            syncStatus: "synced",
            outOfSyncReason: null,
            retryCount: 0,
          },
        }),
      );
    }
  }

  if (updates.length > 0) {
    await prisma.$transaction(updates);

    await prisma.systemEvent.create({
      data: {
        storeId,
        entityType: "channel_sync_engine",
        entityId: "batch",
        eventType: "channel_listing_marked_out_of_sync",
        source: "diff_engine_v2",
        message: `Diff Engine v2: ${report.summary.withDiffs} listing(s) con diferencias detectadas. Campos: ${report.summary.byField.map((f) => `${f.label} (${f.count})`).join(", ") || "ninguno"}`,
        severity: "warning",
      },
    });
  }

  return updates.length;
}
