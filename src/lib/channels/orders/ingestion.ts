import { prisma } from "@/lib/db/prisma";

export async function ingestChannelOrder(storeId: string, channel: string, orderData: any) {
  // Simple deduplication validation
  const existing = await prisma.externalChannelOrder.findUnique({
    where: { storeId_channel_externalOrderId: { storeId, channel, externalOrderId: orderData.externalOrderId } }
  });

  if (existing) {
     return existing; // Already ingested
  }

  const newExternalOrder = await prisma.externalChannelOrder.create({
     data: {
        storeId,
        channel,
        externalOrderId: orderData.externalOrderId,
        externalOrderNumber: orderData.externalOrderNumber,
        customerName: orderData.customerName,
        customerEmail: orderData.customerEmail,
        customerPhone: orderData.customerPhone,
        shippingAddressJson: orderData.shippingAddressJson,
        currency: orderData.currency,
        subtotal: orderData.subtotal,
        shippingAmount: orderData.shippingAmount,
        total: orderData.total,
        rawJson: JSON.stringify(orderData.rawJson),
        items: {
           create: orderData.items.map((it: any) => ({
              externalLineId: it.externalLineId,
              externalListingId: it.externalListingId,
              title: it.title,
              sku: it.sku,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              totalPrice: it.totalPrice,
           }))
        }
     },
     include: { items: true }
  });

  await prisma.systemEvent.create({
    data: {
      storeId,
      entityType: "external_channel_order",
      entityId: newExternalOrder.id,
      eventType: "channel_order_ingested",
      source: "multichannel",
      message: `Nueva orden de ${channel} importada (ExtID: ${newExternalOrder.externalOrderId})`,
      severity: "info",
    }
  });

  return newExternalOrder;
}

export async function mapExternalOrderToInternal(externalOrderId: string) {
  const externalOrder = await prisma.externalChannelOrder.findUnique({
    where: { id: externalOrderId },
    include: { items: true, store: true }
  });

  if (!externalOrder) throw new Error("Order not found");
  if (externalOrder.status !== "imported" && externalOrder.status !== "failed") return externalOrder;

  let allMapped = true;
  const mappedLineItems: any[] = [];
  const itemsUpdates = [];

  // MAPPING STRATEGY
  for (const item of externalOrder.items) {
    let internalProductId = null;
    let internalVariantId = null;
    let catalogMirrorId = null;

    // 1. Fetch by externalListingId via ChannelListing
    if (item.externalListingId) {
      const listing = await prisma.channelListing.findFirst({
         where: { externalListingId: item.externalListingId, channel: externalOrder.channel, storeId: externalOrder.storeId }
      });
      if (listing) {
         internalProductId = listing.productId;
      }
    }

    // 2. Fetch via SKU
    if (!internalProductId && item.sku) {
       const variant = await prisma.productVariant.findFirst({
          where: { sku: item.sku, product: { storeId: externalOrder.storeId } },
          include: { product: true }
       });
       if (variant) {
          internalProductId = variant.productId;
          internalVariantId = variant.id;
       }
    }

    if (internalProductId) {
       // Complete missing relationships
       if (!internalVariantId) {
          const defaultVar = await prisma.productVariant.findFirst({ where: { productId: internalProductId, isDefault: true }});
          internalVariantId = defaultVar?.id;
       }

       const mirror = await prisma.catalogMirrorProduct.findUnique({ where: { internalProductId }});
       if (mirror) catalogMirrorId = mirror.id;

       itemsUpdates.push(
         prisma.externalChannelOrderItem.update({
           where: { id: item.id },
           data: {
              mappedProductId: internalProductId,
              mappedVariantId: internalVariantId,
              mappedCatalogMirrorProductId: catalogMirrorId,
              mappingStatus: "mapped"
           }
         })
       );
       
       mappedLineItems.push({ ...item, internalProductId, internalVariantId, catalogMirrorId });
    } else {
       allMapped = false;
       itemsUpdates.push(
         prisma.externalChannelOrderItem.update({
           where: { id: item.id },
           data: { mappingStatus: "needs_review" }
         })
       );
    }
  }

  if (itemsUpdates.length > 0) {
     await prisma.$transaction(itemsUpdates);
  }

  if (!allMapped) {
     await prisma.externalChannelOrder.update({
        where: { id: externalOrderId },
        data: { status: "failed" }
     });
     
     await prisma.systemEvent.create({
        data: {
          storeId: externalOrder.storeId,
          entityType: "external_channel_order",
          entityId: externalOrder.id,
          eventType: "channel_order_mapping_failed",
          source: "multichannel",
          message: `La orden de ${externalOrder.channel} contiene items no mapeables. Requiere revisión visual.`,
          severity: "warning",
        }
     });

     return;
  }

  // CREATE INTERNAL ORDER LINK
  // In our schema, we can map to a new Order explicitly tracking internal operations.
  const internalOrder = await prisma.order.create({
     data: {
        storeId: externalOrder.storeId,
        orderNumber: `C-${Math.floor(Math.random()*1000000)}`,
        status: "processing",
        total: externalOrder.total,
        subtotal: externalOrder.subtotal,
        shippingAmount: externalOrder.shippingAmount,
        currency: externalOrder.currency,
        email: externalOrder.customerEmail || "channel@example.com",
        firstName: externalOrder.customerName?.split(" ")[0] || "Channel",
        lastName: externalOrder.customerName?.split(" ")[1] || "Cliente",
        addressLine1: "Canal Externo 123",
        city: "CABA",
        province: "CABA",
        postalCode: "1000",
        country: "AR",
        items: {
           create: mappedLineItems.map(m => ({
              productId: m.internalProductId,
              variantId: m.internalVariantId,
              quantity: m.quantity,
              titleSnapshot: m.title,
              variantTitleSnapshot: m.title,
              priceSnapshot: m.unitPrice,
              lineTotal: m.totalPrice
           }))
        }
     }
  });

  // Check generic dropshipping items
  let dropshipRequired = false;
  const dropshipLineItems = [];
  for (const m of mappedLineItems) {
     if (m.catalogMirrorId) {
        dropshipRequired = true;
        dropshipLineItems.push(m);
     }
  }

  // Update External Order Link Status
  await prisma.externalChannelOrder.update({
      where: { id: externalOrderId },
      data: {
         status: "mapped",
         mappedOrderId: internalOrder.id,
         routingStatus: dropshipRequired ? "partially_routed" : "no_dropship_needed"
      }
  });

  await prisma.systemEvent.create({
      data: {
        storeId: externalOrder.storeId,
        entityType: "external_channel_order",
        entityId: externalOrder.id,
        eventType: "channel_order_mapped",
        source: "multichannel",
        message: `Orden de canal mapeada internamente conectada con Order: #${internalOrder.orderNumber}`,
        severity: "info",
      }
  });

  // DISPATCH SUPPLIER ORDERS IF DROPSHIP ITEMS EXIST
  if (dropshipRequired) {
     // A supplier order groups line items by ProviderConnection
     // For mock simplicity, assume typical scenario: 1 provider connection inside a cart.
     
     // 1. Group dropship items by providerConnectionId
     const groupedByProvider: any = {};
     for (const item of dropshipLineItems) {
         const mirror = await prisma.catalogMirrorProduct.findUnique({
            where: { id: item.catalogMirrorId }, include: { providerProduct: true }
         });
         if (!mirror) continue;
         
         const connId = mirror.providerConnectionId;
         if (!groupedByProvider[connId]) groupedByProvider[connId] = [];
         groupedByProvider[connId].push({ item, mirror });
     }

     for (const connId of Object.keys(groupedByProvider)) {
        const specs = groupedByProvider[connId];
        // Calculate dynamic cost total based on snapshot provider prices.
        let providerCostTotal = 0;
        
        for (const spec of specs) {
           providerCostTotal += spec.mirror.providerProduct.cost * spec.item.quantity;
        }

        const supplierOrder = await prisma.supplierOrder.create({
             data: {
                storeId: externalOrder.storeId,
                providerConnectionId: connId,
                internalOrderId: internalOrder.id,
                status: "pending_supplier",
                totalCost: providerCostTotal,
                currency: "ARS",
                items: {
                   create: specs.map((s:any) => ({
                      providerProductId: s.mirror.providerProductId,
                      catalogMirrorProductId: s.mirror.id,
                      productId: s.item.internalProductId,
                      variantId: s.item.internalVariantId,
                      quantity: s.item.quantity,
                      costSnapshot: s.mirror.providerProduct.cost
                   }))
                }
             }
        });

        await prisma.systemEvent.create({
            data: {
              storeId: externalOrder.storeId,
              entityType: "supplier_order",
              entityId: supplierOrder.id,
              eventType: "supplier_order_created",
              source: "dropshipping",
              message: `Orden de Abastecimiento generada para ruteo automático.`,
              severity: "info",
            }
        });
     }

     await prisma.externalChannelOrder.update({
         where: { id: externalOrderId },
         data: { routingStatus: "routed" }
     });
  }
}
