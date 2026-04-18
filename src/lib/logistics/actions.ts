"use server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import { getProvider, normalizeStatus } from "./registry";
import { updateOrderFulfillment } from "@/lib/store-engine/fulfillment/actions";

export async function createRealShipment(orderId: string, providerId: string) {
  const currentStore = await getCurrentStore();
  if (!currentStore) throw new Error("No hay tienda activa.");

  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId: currentStore.id },
    include: { items: true }
  });

  if (!order) throw new Error("Order not found");
  if (order.status === "cancelled") throw new Error("No se puede crear un envío de un pedido cancelado.");

  const provider = getProvider(providerId);

  // Call the external Carrier implementation
  const response = await provider.createShipment({
    orderId: order.id,
    orderNumber: order.orderNumber,
    recipient: {
      name: `${order.firstName} ${order.lastName}`,
      email: order.email,
      phone: order.phone,
      document: order.document,
      addressLine1: order.addressLine1,
      addressLine2: order.addressLine2,
      city: order.city,
      province: order.province,
      postalCode: order.postalCode,
      country: order.country,
    }
  });

  // Use the existing fulfillment pipeline to update standard fields
  // mapping the new specific carrier statuses to Nexora standardized internal states
  const standardizedStatus = normalizeStatus(response.status) as "unfulfilled" | "preparing" | "shipped" | "delivered" | "cancelled";

  await updateOrderFulfillment({
    orderId: order.id,
    shippingStatus: standardizedStatus,
    trackingCode: response.trackingCode,
    trackingUrl: response.trackingUrl,
    carrier: provider.name,
  });

  return { success: true, trackingCode: response.trackingCode };
}
