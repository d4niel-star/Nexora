"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { sendEmailEvent } from "@/lib/email/events";
import { logSystemEvent } from "../../observability/audit";
import { issueCreditNoteForInvoice } from "@/lib/fiscal/arca/services";

export async function createOrderFromDraft(draftId: string) {
  const draft = await prisma.checkoutDraft.findUnique({
    where: { id: draftId },
    include: {
      cart: {
        include: { items: true }
      }
    }
  });

  if (!draft || !draft.cart) {
    throw new Error("Draft/Cart not found");
  }

  const { cart } = draft;

  // Simple validation
  if (!draft.email || !draft.firstName || !draft.addressLine1 || !draft.city) {
    throw new Error("Missing required fields");
  }

  const orderNumber = `#${Math.floor(10000 + Math.random() * 90000)}`;

  const order = await prisma.order.create({
    data: {
      storeId: draft.storeId,
      orderNumber,
      cartId: cart.id,
      
      email: draft.email,
      firstName: draft.firstName,
      lastName: draft.lastName || "",
      phone: draft.phone,
      document: draft.document,
      
      addressLine1: draft.addressLine1,
      addressLine2: draft.addressLine2,
      city: draft.city,
      province: draft.province || "",
      postalCode: draft.postalCode || "",
      country: draft.country || "AR",
      
      currency: cart.currency,
      subtotal: draft.subtotal,
      shippingAmount: draft.shippingAmount,
      total: draft.total,
      
      status: "new",
      paymentStatus: "pending",
      channel: "Storefront",
      
      items: {
        create: cart.items.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          titleSnapshot: item.titleSnapshot,
          variantTitleSnapshot: item.variantTitleSnapshot,
          imageSnapshot: item.imageSnapshot,
          priceSnapshot: item.priceSnapshot,
          quantity: item.quantity,
          lineTotal: item.priceSnapshot * item.quantity,
        }))
      }
    }
  });

  // Mark cart as completed
  await prisma.cart.update({
    where: { id: cart.id },
    data: { status: "completed" }
  });

  // Mark draft as completed
  await prisma.checkoutDraft.update({
    where: { id: draftId },
    data: { status: "completed" }
  });

  // Revalidate admin orders page so the new order appears immediately
  revalidatePath("/admin/orders");

  await logSystemEvent({
    storeId: draft.storeId,
    entityType: "order",
    entityId: order.id,
    eventType: "order_created",
    source: "storefront_checkout",
    message: `Nueva orden ${orderNumber} creada por ${draft.firstName} ${draft.lastName}`
  });

  return order.id;
}

import { createRefund } from "@/lib/payments/mercadopago/client";
import { restoreOrderStock } from "@/lib/store-engine/inventory/actions";

export async function cancelOrder(orderId: string, reason: string, doRefund: boolean) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { store: true, fiscalInvoice: true }
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.status === "cancelled") {
    throw new Error("Order is already cancelled");
  }

  // HARDENING: Prevent cancelling a delivered order without explicit override
  if (order.shippingStatus === "delivered") {
    throw new Error("No se puede cancelar una orden que ya fue entregada. Procese una devolución en su lugar.");
  }

  // HARDENING: Prevent double refund
  if (doRefund && order.paymentStatus === "refunded") {
    throw new Error("Esta orden ya fue reembolsada.");
  }

  let paymentStatus = order.paymentStatus;
  let refundedAt: Date | null = null;
  let refundAmount: number | null = null;
  let mpRefundId: string | null = null;
  let refundSuccess = false;

  // Process refund if requested and applicable
  if (doRefund && order.paymentStatus === "paid" && order.paymentProvider === "mercadopago") {
    const payment = await prisma.payment.findFirst({
      where: { orderId: order.id, status: "approved" },
      orderBy: { createdAt: "desc" }
    });

    if (payment && payment.externalId) {
      try {
        const mpRefund = await createRefund(
          payment.externalId, 
          undefined, // Full refund
          `refund_${order.id}_${Date.now()}` // Idempotency key
        );

        refundSuccess = true;
        paymentStatus = "refunded";
        refundedAt = new Date();
        refundAmount = order.total;
        mpRefundId = String(mpRefund.id);

        await prisma.payment.create({
          data: {
            orderId: order.id,
            provider: "mercadopago",
            status: "refunded",
            amount: order.total,
            currency: order.currency,
            externalId: String(mpRefund.id),
          }
        });

      } catch (err: any) {
        await logSystemEvent({
          storeId: order.storeId,
          entityType: "payment",
          entityId: order.id,
          eventType: "refund_failed",
          severity: "error",
          source: "cancel_order_action",
          message: `Fallo al procesar reembolso MP para orden ${order.orderNumber}`,
          metadata: { error: err.message }
        });
        throw new Error(`Error al procesar reembolso en Mercado Pago: ${err.message}`);
      }
    } else {
       await logSystemEvent({
         storeId: order.storeId,
         entityType: "payment",
         entityId: order.id,
         eventType: "refund_failed",
         severity: "warn",
         source: "cancel_order_action",
         message: `Se solicitó refund pero no había pago aprobado de MP en orden ${order.orderNumber}`
       });
    }
  }

  const now = new Date();

  // Update order status
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "cancelled",
      paymentStatus: paymentStatus,
      cancelledAt: now,
      cancelReason: reason,
      refundedAt,
      refundAmount,
      mpRefundId,
      shippingStatus: "cancelled"
    }
  });

  // Idempotently restore stock
  await restoreOrderStock(
    order.id, 
    refundSuccess ? "refund_restore" : "cancellation_restore",
    `Cancelled: ${reason}`
  );

  await logSystemEvent({
    storeId: order.storeId,
    entityType: "order",
    entityId: order.id,
    eventType: refundSuccess ? "order_refunded" : "order_cancelled",
    source: "admin_backend",
    message: `Orden ${order.orderNumber} ${refundSuccess ? "reembolsada y cancelada" : "cancelada"}: ${reason}`,
    metadata: { reason, doRefund, refundAmount }
  });

  // Issue credit note automatically if there is an authorized invoice
  if (order.fiscalInvoice?.fiscalStatus === "authorized") {
     try {
       await issueCreditNoteForInvoice(order.fiscalInvoice.id, `Reembolso / Cancelación: ${reason}`);
     } catch (err: any) {
       await logSystemEvent({
          storeId: order.storeId,
          eventType: "credit_note_failed",
          entityType: "FiscalInvoice",
          source: "cancel_order_action",
          severity: "error",
          message: `La orden fue cancelada, pero falló la emisión automática de Nota de Crédito: ${err.message}`
       });
     }
  }

  // Send Emails Background
  const storeUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const emailData = {
    storeSlug: order.store.slug,
    storeName: order.store.name,
    customerName: order.firstName,
    orderNumber: order.orderNumber,
    orderId: order.id,
    subtotal: order.subtotal,
    shippingAmount: order.shippingAmount,
    total: order.total,
    currency: order.currency,
    statusUrl: `${storeUrl}/${order.store.slug}/checkout/pending?orderId=${order.id}`,
    shippingMethodLabel: order.shippingMethodLabel || undefined,
  };

  sendEmailEvent({
    storeId: order.storeId,
    eventType: "ORDER_CANCELLED",
    entityType: "order",
    entityId: order.id,
    recipient: order.email,
    data: emailData
  }).catch(err => console.error("[cancelOrder] Failed to send ORDER_CANCELLED email", err));

  if (refundSuccess) {
    sendEmailEvent({
      storeId: order.storeId,
      eventType: "PAYMENT_REFUNDED",
      entityType: "order",
      entityId: order.id,
      recipient: order.email,
      data: emailData
    }).catch(err => console.error("[cancelOrder] Failed to send PAYMENT_REFUNDED email", err));
  }

  revalidatePath("/admin/orders");

  return { success: true };
}
