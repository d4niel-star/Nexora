"use server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { sendEmailEvent } from "@/lib/email/events";
import { logSystemEvent } from "../../observability/audit";
import { issueCreditNoteForInvoice } from "@/lib/fiscal/arca/services";
import { createRefund } from "@/lib/payments/mercadopago/client";
import { getMercadoPagoCredentialsForStore } from "@/lib/payments/mercadopago/tenant";
import { storePath } from "@/lib/store-engine/urls";
import { restoreOrderStock } from "@/lib/store-engine/inventory/actions";
import { restorePickupLocalStockForOrder } from "@/lib/store-engine/pickup/local-stock";

/**
 * @deprecated — REMOVED in Phase 1 stabilization.
 *
 * This function used to create orders without stock validation, without
 * Payment records, and without Mercado Pago integration. It was a legacy
 * bypass path that could produce inconsistent data.
 *
 * All real checkout must go through `initiatePayment` in
 * `src/lib/payments/mercadopago/actions.ts`.
 *
 * If you need a non-MP order creation path in the future, implement it
 * with the same safeguards: stock validation, transactional order number
 * generation, costSnapshot, and Payment record creation.
 */
export async function createOrderFromDraft(_draftId: string): Promise<never> {
  throw new Error(
    "[DEPRECATED] createOrderFromDraft has been disabled. " +
    "Use initiatePayment() from lib/payments/mercadopago/actions.ts instead. " +
    "This function was removed because it created orders without stock " +
    "validation, payment records, or cost snapshots."
  );
}

export async function cancelOrder(orderId: string, reason: string, doRefund: boolean) {
  const currentStore = await getCurrentStore();
  if (!currentStore) throw new Error("No hay tienda activa.");

  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId: currentStore.id },
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

  const isPickupOrder = order.shippingMethodId
    ? Boolean(await prisma.shippingMethod.findFirst({
        where: {
          id: order.shippingMethodId,
          storeId: order.storeId,
          type: "pickup",
        },
        select: { id: true },
      }))
    : false;

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
        const mpCredentials = await getMercadoPagoCredentialsForStore(order.storeId);
        const mpRefund = await createRefund(
          mpCredentials.accessToken,
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
      publicStatus: refundSuccess ? "REFUNDED" : "CANCELLED",
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
  const pickupLocalStockRestored = isPickupOrder
    ? await restorePickupLocalStockForOrder(
        order.id,
        `Cancelled: ${reason}`,
        "cancel_order_action",
      )
    : false;

  await logSystemEvent({
    storeId: order.storeId,
    entityType: "order",
    entityId: order.id,
    eventType: refundSuccess ? "order_refunded" : "order_cancelled",
    source: "admin_backend",
    message: `Orden ${order.orderNumber} ${refundSuccess ? "reembolsada y cancelada" : "cancelada"}: ${reason}`,
    metadata: { reason, doRefund, refundAmount, pickupLocalStockRestored }
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
    statusUrl: `${storeUrl}${storePath(order.store.slug, `checkout/pending?orderId=${order.id}`)}`,
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
