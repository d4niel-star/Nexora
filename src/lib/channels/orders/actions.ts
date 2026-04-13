"use server";

import { prisma } from "@/lib/db/prisma";
import { getDefaultStore } from "@/lib/store-engine/queries";
import { ingestChannelOrder, mapExternalOrderToInternal } from "./ingestion";
import { revalidatePath } from "next/cache";

export async function checkChannelOrdersAction() {
  const store = await getDefaultStore();
  if (!store) throw new Error("No active store");

  // We mock fetching an order from Mercado Libre
  // In a real flow: Check OAuth Adapter -> Get /orders -> `ingestChannelOrder` for each
  
  // MOCK: Generate 1 incoming dynamic order from a marketplace
  // Get an active channel listing to map it successfully.
  const listing = await prisma.channelListing.findFirst({
     where: { storeId: store.id, status: "published" },
     include: { product: { include: { variants: true } } }
  });

  if (!listing) {
     throw new Error("No hay publicaciones activas para simular ventas externas reales.");
  }

  const externalOrderId = `ML-${Math.floor(Math.random() * 10000000)}`;
  
  const mockPayload = {
      externalOrderId,
      externalOrderNumber: `#${externalOrderId}`,
      customerName: "Juan Pérez (ML)",
      customerEmail: "juan.test@mercadolibre.com",
      customerPhone: "+541144556677",
      shippingAddressJson: '{"street": "Av Cabildo 1234", "city": "CABA"}',
      currency: "ARS",
      subtotal: listing.syncedPrice,
      shippingAmount: 0,
      total: listing.syncedPrice,
      rawJson: { mockSource: "Mercado Libre API" },
      items: [
         {
            externalLineId: "LINE1",
            externalListingId: listing.externalListingId || undefined, // Real mapping
            title: listing.syncedTitle || listing.product.title,
            sku: listing.product.variants[0]?.sku || undefined,
            quantity: 1,
            unitPrice: listing.syncedPrice,
            totalPrice: listing.syncedPrice,
         }
      ]
  };

  const newOrder = await ingestChannelOrder(store.id, listing.channel, mockPayload);
  
  // Trigger internal mapping and supplier routing
  await mapExternalOrderToInternal(newOrder.id);

  revalidatePath("/admin/operations");
  return newOrder;
}

export async function getOperationsDataAction() {
  const store = await getDefaultStore();
  if (!store) throw new Error("No active store");

  const externalOrders = await prisma.externalChannelOrder.findMany({
     where: { storeId: store.id },
     include: { items: true, mappedOrder: true },
     orderBy: { createdAt: "desc" },
     take: 20
  });

  const supplierOrders = await prisma.supplierOrder.findMany({
     where: { storeId: store.id },
     include: { 
        providerConnection: { include: { provider: true } }, 
        internalOrder: true 
     },
     orderBy: { createdAt: "desc" }
  });

  return { externalOrders, supplierOrders };
}
