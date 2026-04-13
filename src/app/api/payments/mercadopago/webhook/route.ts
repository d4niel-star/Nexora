import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getPayment } from "@/lib/payments/mercadopago/client";
import { revalidatePath } from "next/cache";
import { commitOrderStock } from "@/lib/store-engine/inventory/actions";
import { sendEmailEvent } from "@/lib/email/events";
import { logSystemEvent } from "@/lib/observability/audit";
import { EventType } from "@/lib/email/types";

/**
 * Mercado Pago Webhook Handler
 * 
 * Receives IPN (Instant Payment Notification) from Mercado Pago.
 * Updates Order.paymentStatus and Payment record based on the payment status.
 * 
 * MP sends:
 *   - topic: "payment" | "merchant_order" | ...
 *   - id or data.id: the resource ID
 *   - action: "payment.created" | "payment.updated" | ...
 * 
 * We only process "payment" topic notifications.
 */

// Map MP payment status → our PaymentStatus for Order
function mapMPStatusToOrderPaymentStatus(mpStatus: string): string {
  switch (mpStatus) {
    case "approved":
      return "paid";
    case "pending":
    case "in_process":
    case "authorized":
      return "pending";
    case "rejected":
    case "cancelled":
      return "failed";
    case "refunded":
    case "charged_back":
      return "refunded";
    default:
      return "pending";
  }
}

// Map MP payment status → our Order.status progression
function mapMPStatusToOrderStatus(mpStatus: string, currentOrderStatus: string): string {
  if (mpStatus === "approved") {
    // Only advance to "paid" if order is still "new"
    return currentOrderStatus === "new" ? "paid" : currentOrderStatus;
  }
  if (mpStatus === "rejected" || mpStatus === "cancelled") {
    return currentOrderStatus === "new" ? "cancelled" : currentOrderStatus;
  }
  return currentOrderStatus;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log("[MP Webhook] Received:", JSON.stringify(body, null, 2));

    // MP sends different notification formats
    // New format: { action: "payment.created", data: { id: "123" } }
    // Old format: { topic: "payment", id: 123 }
    const topic = body.topic || body.type;
    const resourceId = body.data?.id || body.id;

    // Only process payment notifications
    if (topic !== "payment" && body.action?.startsWith("payment.") !== true) {
      return NextResponse.json({ status: "ignored", topic }, { status: 200 });
    }

    if (!resourceId) {
      await logSystemEvent({
        entityType: "payment",
        eventType: "mercadopago_webhook_failed",
        severity: "warn",
        source: "mercadopago_webhook",
        message: "Se recibió webhook sin resource ID",
        metadata: { body }
      });
      return NextResponse.json({ error: "missing_resource_id" }, { status: 400 });
    }

    // Fetch the full payment from MP API
    const mpPayment = await getPayment(resourceId);
    
    console.log(`[MP Webhook] Payment ${mpPayment.id}: status=${mpPayment.status}, ref=${mpPayment.external_reference}`);

    const orderId = mpPayment.external_reference;
    if (!orderId) {
      await logSystemEvent({
        entityType: "payment",
        entityId: String(mpPayment.id),
        eventType: "mercadopago_webhook_failed",
        severity: "warn",
        source: "mercadopago_webhook",
        message: "Payment sin external_reference (Order ID)",
      });
      return NextResponse.json({ error: "no_external_reference" }, { status: 400 });
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      await logSystemEvent({
        entityType: "order",
        entityId: orderId,
        eventType: "mercadopago_webhook_failed",
        severity: "error",
        source: "mercadopago_webhook",
        message: `Orden ${orderId} referenciada por MP no existe en base de datos.`,
      });
      return NextResponse.json({ error: "order_not_found" }, { status: 404 });
    }

    // HARDENING: Terminal state guard - don't regress orders that are already cancelled/refunded
    const terminalOrderStates = ["cancelled", "refunded"];
    const terminalPaymentStates = ["refunded"];
    if (terminalOrderStates.includes(order.status) || terminalPaymentStates.includes(order.paymentStatus)) {
      await logSystemEvent({
        storeId: order.storeId,
        entityType: "order",
        entityId: order.id,
        eventType: "mercadopago_webhook_ignored",
        severity: "info",
        source: "mercadopago_webhook",
        message: `Webhook ignorado: orden ${order.orderNumber} ya está en estado terminal (${order.status}/${order.paymentStatus})`,
        metadata: { mpPaymentId: mpPayment.id, mpStatus: mpPayment.status }
      });
      return NextResponse.json({ status: "ignored_terminal_state" }, { status: 200 });
    }

    // Idempotency: Check if this payment was already processed
    const existingPayment = await prisma.payment.findFirst({
      where: {
        orderId: order.id,
        externalId: String(mpPayment.id),
      }
    });

    const newPaymentStatus = mapMPStatusToOrderPaymentStatus(mpPayment.status);
    const newOrderStatus = mapMPStatusToOrderStatus(mpPayment.status, order.status);

    if (existingPayment) {
      // Update existing payment record
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: mpPayment.status,
          paymentMethod: mpPayment.payment_method_id,
          paymentType: mpPayment.payment_type_id,
          installments: mpPayment.installments,
          paidAt: mpPayment.date_approved ? new Date(mpPayment.date_approved) : null,
          rawResponse: JSON.stringify({
            id: mpPayment.id,
            status: mpPayment.status,
            status_detail: mpPayment.status_detail,
            payment_method_id: mpPayment.payment_method_id,
            payment_type_id: mpPayment.payment_type_id,
            date_approved: mpPayment.date_approved,
          }),
        }
      });
    } else {
      // Create new payment record (for the actual payment, not just preference)
      // First, try to find the initial pending payment to update
      const pendingPayment = await prisma.payment.findFirst({
        where: {
          orderId: order.id,
          status: "pending",
          externalId: null,
        }
      });

      if (pendingPayment) {
        await prisma.payment.update({
          where: { id: pendingPayment.id },
          data: {
            externalId: String(mpPayment.id),
            status: mpPayment.status,
            paymentMethod: mpPayment.payment_method_id,
            paymentType: mpPayment.payment_type_id,
            installments: mpPayment.installments,
            paidAt: mpPayment.date_approved ? new Date(mpPayment.date_approved) : null,
            rawResponse: JSON.stringify({
              id: mpPayment.id,
              status: mpPayment.status,
              status_detail: mpPayment.status_detail,
              payment_method_id: mpPayment.payment_method_id,
              payment_type_id: mpPayment.payment_type_id,
              date_approved: mpPayment.date_approved,
            }),
          }
        });
      } else {
        // Create a completely new payment record
        await prisma.payment.create({
          data: {
            orderId: order.id,
            provider: "mercadopago",
            status: mpPayment.status,
            externalId: String(mpPayment.id),
            externalReference: orderId,
            preferenceId: order.mpPreferenceId,
            amount: mpPayment.transaction_amount,
            currency: mpPayment.currency_id,
            paymentMethod: mpPayment.payment_method_id,
            paymentType: mpPayment.payment_type_id,
            installments: mpPayment.installments,
            paidAt: mpPayment.date_approved ? new Date(mpPayment.date_approved) : null,
            rawResponse: JSON.stringify({
              id: mpPayment.id,
              status: mpPayment.status,
              status_detail: mpPayment.status_detail,
            }),
          }
        });
      }
    }

    // Update Order status
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: newPaymentStatus,
        status: newOrderStatus,
        mpPaymentId: String(mpPayment.id),
      }
    });

    // Auditoria
    await logSystemEvent({
      storeId: order.storeId,
      entityType: "order",
      entityId: order.id,
      eventType: `payment_${newPaymentStatus}`,
      source: "mercadopago_webhook",
      message: `Orden ${order.orderNumber} actualizada a pago: ${newPaymentStatus}`,
      metadata: { mpPaymentId: mpPayment.id, newOrderStatus }
    });

    // If payment is approved, deduct stock automatically
    if (newPaymentStatus === "paid" && order.paymentStatus !== "paid") {
      const stockCommitted = await commitOrderStock(order.id);
      if (stockCommitted) {
         await logSystemEvent({
           storeId: order.storeId,
           entityType: "order",
           entityId: order.id,
           eventType: "stock_committed",
           source: "mercadopago_webhook",
           message: `Stock descontado para la orden ${order.orderNumber}.`
         });
      }
    }

    // Trigger matching Payment Email Events
    try {
      const store = await prisma.store.findUnique({ where: { id: order.storeId } });
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      
      let eventType: EventType | null = null;
      if (newPaymentStatus === "paid") eventType = "PAYMENT_APPROVED";
      else if (newPaymentStatus === "pending") eventType = "PAYMENT_PENDING";
      else if (newPaymentStatus === "failed" || newPaymentStatus === "refunded") eventType = "PAYMENT_FAILED";

      if (store && order.email && eventType) {
        sendEmailEvent({
          storeId: store.id,
          eventType,
          entityType: "order",
          entityId: order.id,
          recipient: order.email,
          data: {
            storeSlug: store.id, // Store might want a slug conceptually, but id works for base routing 
            storeName: store.name,
            customerName: order.firstName,
            orderNumber: order.orderNumber,
            orderId: order.id,
            subtotal: order.subtotal,
            shippingAmount: order.shippingAmount,
            total: order.total,
            currency: order.currency,
            shippingMethodLabel: order.shippingMethodLabel || undefined,
            statusUrl: `${appUrl}/${store.id}/checkout/pending?orderId=${order.id}`,
          }
        }).catch(err => console.error(`[MP Webhook] Background Email Error (${eventType}):`, err));
      }
    } catch (e) {
       console.error("[MP Webhook] Could not dispatch email events:", e);
    }

    // Revalidate admin pages
    revalidatePath("/admin/orders");

    return NextResponse.json({ status: "ok" }, { status: 200 });

  } catch (error: any) {
    console.error("[MP Webhook] Error:", error);
    await logSystemEvent({
      entityType: "webhook",
      eventType: "mercadopago_webhook_exception",
      severity: "critical",
      source: "mercadopago_webhook",
      message: `Fallo inesperado procesando MP Webhook`,
      metadata: { errorMessage: error.message },
    });
    return NextResponse.json(
      { error: "internal_error" },
      { status: 500 }
    );
  }
}

// MP also sends GET requests to verify the endpoint
export async function GET() {
  return NextResponse.json({ status: "webhook_active" });
}
