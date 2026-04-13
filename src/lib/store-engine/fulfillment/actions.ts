"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { sendEmailEvent } from "@/lib/email/events";
import { logSystemEvent } from "../../observability/audit";

export type ShippingStatus = "unfulfilled" | "preparing" | "shipped" | "delivered" | "cancelled";

interface UpdateFulfillmentParams {
  orderId: string;
  shippingStatus?: ShippingStatus;
  trackingCode?: string;
  trackingUrl?: string;
  carrier?: string;
}

export async function updateOrderFulfillment(params: UpdateFulfillmentParams) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { store: true }
  });

  if (!order) throw new Error("Order not found");

  // HARDENING: Prevent fulfillment on cancelled orders
  if (order.status === "cancelled") {
    throw new Error("No se puede modificar la logística de una orden cancelada.");
  }

  // HARDENING: Prevent backwards fulfillment transitions
  const fulfillmentOrder: ShippingStatus[] = ["unfulfilled", "preparing", "shipped", "delivered"];
  if (params.shippingStatus) {
    const currentIdx = fulfillmentOrder.indexOf(order.shippingStatus as ShippingStatus);
    const targetIdx = fulfillmentOrder.indexOf(params.shippingStatus);
    if (currentIdx >= 0 && targetIdx >= 0 && targetIdx < currentIdx) {
      await logSystemEvent({
        storeId: order.storeId,
        entityType: "order",
        entityId: order.id,
        eventType: "fulfillment_blocked",
        severity: "warn",
        source: "fulfillment_service",
        message: `Transición de fulfillment bloqueada: ${order.shippingStatus} → ${params.shippingStatus} para orden ${order.orderNumber}`
      });
      throw new Error(`No se puede retroceder de ${order.shippingStatus} a ${params.shippingStatus}`);
    }
  }

  const dataToUpdate: any = {};
  if (params.shippingStatus !== undefined) dataToUpdate.shippingStatus = params.shippingStatus;
  if (params.trackingCode !== undefined) dataToUpdate.trackingCode = params.trackingCode || null;
  if (params.trackingUrl !== undefined) dataToUpdate.trackingUrl = params.trackingUrl || null;
  
  if (params.shippingStatus === "shipped" && order.shippingStatus !== "shipped") {
    dataToUpdate.shippedAt = new Date();
  }
  if (params.shippingStatus === "delivered" && order.shippingStatus !== "delivered") {
    dataToUpdate.deliveredAt = new Date();
  }

  const updatedOrder = await prisma.order.update({
    where: { id: params.orderId },
    data: dataToUpdate
  });

  if (params.shippingStatus && params.shippingStatus !== order.shippingStatus) {
    await logSystemEvent({
      storeId: order.storeId,
      entityType: "order",
      entityId: order.id,
      eventType: `fulfillment_${params.shippingStatus}`,
      source: "fulfillment_service",
      message: `Orden ${order.orderNumber} cambió estado logístico de ${order.shippingStatus} a ${params.shippingStatus}`,
      metadata: { previousStatus: order.shippingStatus, newStatus: params.shippingStatus, trackingCode: updatedOrder.trackingCode }
    });
  }

  // Handle Email Notifications for Status Changes
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const commonData = {
    storeSlug: order.storeId, // Future improvement: load correct store domain alias/slug
    storeName: order.store.name,
    customerName: order.firstName,
    orderNumber: order.orderNumber,
    orderId: order.id,
    subtotal: order.subtotal,
    shippingAmount: order.shippingAmount,
    total: order.total,
    currency: order.currency,
    shippingMethodLabel: order.shippingMethodLabel || undefined,
    trackingCode: updatedOrder.trackingCode || undefined,
    trackingUrl: updatedOrder.trackingUrl || undefined,
    statusUrl: `${appUrl}/${order.storeId}/tracking?order=${order.orderNumber}&email=${order.email}`, // Better routing for tracking
  };

  // If status transitions to shipped for the FIRST time, trigger email
  if (params.shippingStatus === "shipped" && order.shippingStatus !== "shipped" && order.email) {
    sendEmailEvent({
      storeId: order.storeId,
      eventType: "ORDER_SHIPPED",
      entityType: "order",
      entityId: order.id,
      recipient: order.email,
      data: commonData
    }).catch(async (err) => {
       await logSystemEvent({
         entityType: "email",
         entityId: order.id,
         eventType: "email_failed",
         severity: "error",
         source: "fulfillment_service",
         message: `Error enviando email ORDER_SHIPPED`
       });
    });
  }

  // If status transitions to delivered for the FIRST time, trigger email
  if (params.shippingStatus === "delivered" && order.shippingStatus !== "delivered" && order.email) {
    sendEmailEvent({
      storeId: order.storeId,
      eventType: "ORDER_DELIVERED",
      entityType: "order",
      entityId: order.id,
      recipient: order.email,
      data: commonData
    }).catch(async (err) => {
      await logSystemEvent({
        entityType: "email",
        entityId: order.id,
        eventType: "email_failed",
        severity: "error",
        source: "fulfillment_service",
        message: `Error enviando email ORDER_DELIVERED`
      });
    });
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/${order.storeId}/tracking`);
  
  return updatedOrder;
}
