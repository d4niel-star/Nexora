import { prisma } from "@/lib/db/prisma";
import type { Product, ChannelListing } from "@prisma/client";

/**
 * Checks if the internal Product differs from what is recorded as synced.
 * Uses price and stock.
 */
export async function detectOutOfSyncListings(storeId: string) {
  // Fetch listings that are supposedly "published" or "synced"
  const listings = await prisma.channelListing.findMany({
    where: { 
       storeId,
       status: "published",
    },
    include: {
      product: {
        include: { variants: true }
      }
    }
  });

  const updates = [];

  for (const listing of listings) {
    const p = listing.product;
    const internalStock = p.variants[0]?.stock || 0;
    const internalPrice = p.price;

    let outOfSync = false;
    let reason = "";

    if (listing.syncedPrice !== internalPrice) {
      outOfSync = true;
      reason += "Price changed. ";
    }
    if (listing.syncedStock !== internalStock) {
      outOfSync = true;
      reason += "Stock changed. ";
    }

    // We could add title/description checking here if we wanted strict parity,
    // but usually channels allow custom titles, so we only force out_of_sync
    // if the user hasn't overridden it and it changed. For now, strict price/stock is enough.

    if (outOfSync && listing.syncStatus !== "out_of_sync") {
       updates.push(
         prisma.channelListing.update({
           where: { id: listing.id },
           data: {
             syncStatus: "out_of_sync",
             outOfSyncReason: reason.trim()
           }
         })
       );
    } else if (!outOfSync && listing.syncStatus === "out_of_sync") {
       // It was out of sync, but somehow it matches now? (Maybe user reverted the internal change)
       updates.push(
         prisma.channelListing.update({
           where: { id: listing.id },
           data: {
             syncStatus: "synced",
             outOfSyncReason: null,
             retryCount: 0
           }
         })
       );
    }
  }

  if (updates.length > 0) {
    await prisma.$transaction(updates);
    
    // Log event for bulk detection
    await prisma.systemEvent.create({
      data: {
        storeId,
        entityType: "channel_sync_engine",
        entityId: "batch",
        eventType: "channel_listing_marked_out_of_sync",
        source: "sync_module",
        message: `Se detectaron ${updates.length} listings desalineados.`,
        severity: "warning"
      }
    });
  }

  return updates.length;
}
