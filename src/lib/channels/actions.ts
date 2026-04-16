"use server";

import { prisma } from "@/lib/db/prisma";
import { getDefaultStore } from "@/lib/store-engine/queries";
import { revalidatePath } from "next/cache";
import { getAdapter } from "./providers";
import { detectOutOfSyncListings } from "./sync";

export async function runSyncDetectionAction() {
  const store = await getDefaultStore();
  if (!store) throw new Error("No active store");
  const count = await detectOutOfSyncListings(store.id);
  revalidatePath("/admin/publications");
  return count;
}

export async function getPublishableProductsAction() {
  const store = await getDefaultStore();
  if (!store) throw new Error("No active store");

  // We fetch standard Products.
  // We can also include catalogMirror, and their corresponding channelListings.
  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    include: {
      catalogMirror: {
        include: {
          providerConnection: {
            include: { provider: true }
          }
        }
      },
      channelListings: true,
      variants: {
        where: { isDefault: true } // grab the basic pricing/stock
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return products;
}

export async function publishToChannelAction(productId: string, channel: string, overrides: { title?: string; price?: number }) {
  const store = await getDefaultStore();
  if (!store) throw new Error("No active store");

  const product = await prisma.product.findUnique({
    where: { id: productId, storeId: store.id },
    include: { variants: true, catalogMirror: true }
  });

  if (!product) throw new Error("Producto no encontrado");

  const adapter = getAdapter(channel);

  let listing = await prisma.channelListing.findUnique({
    where: {
      storeId_productId_channel: {
        storeId: store.id,
        productId,
        channel
      }
    }
  });

  // Base state definition
  const targetTitle = overrides.title || product.title;
  const targetPrice = overrides.price || product.price;
  // Aggregate real available stock across variants (stock − reservedStock, clamped at 0)
  // to match Diff Engine / sync queries and avoid publishing only the first variant's stock.
  const targetStock = product.variants.reduce(
    (sum: number, v: { stock: number; reservedStock: number }) => sum + Math.max(v.stock - v.reservedStock, 0),
    0
  );

  // Validate Real Connection First
  const connection = await prisma.channelConnection.findUnique({
    where: { storeId_channel: { storeId: store.id, channel } }
  });

  if (!connection || connection.status !== "connected") {
    throw new Error(`Canal ${channel} no está conectado o el token expiró. Por favor, revisá Configuración > Canales.`);
  }

  if (!listing) {
    listing = await prisma.channelListing.create({
      data: {
        storeId: store.id,
        productId,
        channel,
        status: "publishing",
        syncedTitle: targetTitle,
        syncedPrice: targetPrice,
        syncedStock: targetStock
      }
    });
  } else {
    listing = await prisma.channelListing.update({
      where: { id: listing.id },
      data: { 
        status: "publishing",
        syncedTitle: targetTitle,
        syncedPrice: targetPrice
      }
    });
  }

  try {
    // Audit log
    await prisma.systemEvent.create({
      data: {
        storeId: store.id,
        entityType: "channel_listing",
        entityId: listing.id,
        eventType: "channel_publish_started",
        source: "channel_module",
        message: `Iniciando publicación en ${channel}`,
        severity: "info",
      }
    });

    const result = listing.externalListingId 
       ? await adapter.updateListing(listing, product)
       : await adapter.publishProduct(product, { syncedTitle: targetTitle, syncedPrice: targetPrice });

    if (!result.success) throw new Error(result.error);

    listing = await prisma.channelListing.update({
      where: { id: listing.id },
      data: {
        status: "published",
        externalListingId: result.externalListingId,
        externalUrl: result.externalUrl,
        lastPublishedAt: new Date(),
        lastSyncedAt: new Date(),
        lastError: null
      }
    });

    await prisma.systemEvent.create({
      data: {
        storeId: store.id,
        entityType: "channel_listing",
        entityId: listing.id,
        eventType: "channel_publish_succeeded",
        source: "channel_module",
        message: `Publicado exitosamente en ${channel}`,
        severity: "info",
      }
    });

    // Sync CatalogMirror reference just in case
    if (product.catalogMirror) {
        if(channel === "mercadolibre"){
            await prisma.catalogMirrorProduct.update({ 
               where: { id: product.catalogMirror.id },
               data: { publicationStatusML: "published" }
            });
        }
        if(channel === "shopify"){
            await prisma.catalogMirrorProduct.update({ 
               where: { id: product.catalogMirror.id },
               data: { publicationStatusShopify: "published" }
            });
        }
    }

  } catch (error: any) {
     await prisma.channelListing.update({
       where: { id: listing.id },
       data: {
         status: "failed",
         lastError: error.message || "Error desconocido"
       }
     });

     await prisma.systemEvent.create({
      data: {
        storeId: store.id,
        entityType: "channel_listing",
        entityId: listing.id,
        eventType: "channel_publish_failed",
        source: "channel_module",
        message: `Fallo al publicar en ${channel}: ${error.message}`,
        severity: "error",
      }
    });
  }

  revalidatePath("/admin/publications");
  return listing;
}

export async function pauseChannelListingAction(listingId: string) {
  const store = await getDefaultStore();
  if (!store) throw new Error("No active store");

  const listing = await prisma.channelListing.findUnique({
    where: { id: listingId, storeId: store.id },
    include: { product: true }
  });

  if (!listing) throw new Error("Listing not found");

  const connection = await prisma.channelConnection.findUnique({
    where: { storeId_channel: { storeId: store.id, channel: listing.channel } }
  });

  if (!connection || connection.status !== "connected") {
    throw new Error(`Canal ${listing.channel} no está conectado. Imposible pausar vía API.`);
  }

  const adapter = getAdapter(listing.channel);

  try {
    await adapter.pauseListing(listing);
    await prisma.channelListing.update({
      where: { id: listingId },
      data: { status: "paused" }
    });

    // Audit log
    await prisma.systemEvent.create({
      data: {
        storeId: store.id,
        entityType: "channel_listing",
        entityId: listing.id,
        eventType: "channel_listing_paused",
        source: "channel_module",
        message: `Publicación pausada en ${listing.channel}`,
        severity: "info",
      }
    });

  } catch(error: any) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/publications");
}

export async function syncChannelListingAction(listingId: string) {
  const store = await getDefaultStore();
  if (!store) throw new Error("No active store");

  const listing = await prisma.channelListing.findUnique({
    where: { id: listingId, storeId: store.id },
    include: { product: true }
  });

  if (!listing) throw new Error("Listing not found");

  const connection = await prisma.channelConnection.findUnique({
    where: { storeId_channel: { storeId: store.id, channel: listing.channel } }
  });

  if (!connection || connection.status !== "connected") {
    throw new Error(`Canal ${listing.channel} no está conectado. Imposible sincronizar vía API.`);
  }

  const adapter = getAdapter(listing.channel);

  await prisma.channelListing.update({
    where: { id: listingId },
    data: { status: "syncing" }
  });

  try {
     const result = await adapter.syncListing(listing);
     if (!result.success) throw new Error(result.error);

     await prisma.channelListing.update({
      where: { id: listingId },
      data: { 
        status: result.status, 
        syncStatus: "synced",
        syncedPrice: result.syncedPrice,
        syncedStock: result.syncedStock,
        lastSyncedAt: new Date(),
        lastSyncAttemptAt: new Date(),
        lastSyncSuccessAt: new Date(),
        outOfSyncReason: null,
        retryCount: 0,
        lastError: null
      }
    });

    // Audit log
    await prisma.systemEvent.create({
      data: {
        storeId: store.id,
        entityType: "channel_listing",
        entityId: listing.id,
        eventType: "channel_sync_succeeded",
        source: "channel_module",
        message: `Sincronización exitosa en ${listing.channel}`,
        severity: "info",
      }
    });

  } catch(error: any) {
    await prisma.channelListing.update({
      where: { id: listingId },
      data: { 
         syncStatus: "error",
         lastSyncAttemptAt: new Date(),
         lastError: error.message,
         retryCount: { increment: 1 }
      }
    });
    
    // Audit log
    await prisma.systemEvent.create({
      data: {
        storeId: store.id,
        entityType: "channel_listing",
        entityId: listing.id,
        eventType: "channel_sync_failed",
        source: "channel_module",
        message: `Fallo sincronización en ${listing.channel}: ${error.message}`,
        severity: "error",
      }
    });
  }

  revalidatePath("/admin/publications");
}
