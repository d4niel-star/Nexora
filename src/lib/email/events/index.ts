import { prisma } from "@/lib/db/prisma";
import { EventType, OrderEmailData, EmailPayload } from "../types";
import { getEmailProvider } from "../providers";
import * as templates from "../templates";
import { buildTrackedUrl } from "../click-tracking";
import { logSystemEvent } from "../../observability/audit";

interface SendEmailEventParams {
  storeId: string;
  eventType: EventType;
  entityType: string;
  entityId: string;
  recipient: string;
  data: OrderEmailData;
}

export async function sendEmailEvent(params: SendEmailEventParams): Promise<boolean> {
  // Idempotency: Check if we have already sent this event for this entity
  const existingLog = await prisma.emailLog.findUnique({
    where: {
      eventType_entityType_entityId: {
        eventType: params.eventType,
        entityType: params.entityType,
        entityId: params.entityId,
      }
    }
  });

  if (existingLog) {
    if (existingLog.status === "sent") {
      console.log(`[Email] Skipping ${params.eventType} for ${params.entityType} ${params.entityId}: Already sent.`);
      return true;
    }
    if (existingLog.status === "pending") {
      console.log(`[Email] Skipping ${params.eventType} for ${params.entityType} ${params.entityId}: Already pending.`);
      return true;
    }
    // If it failed previously, we can try again
  }

  // ─── Communication settings: check if this event type is enabled ────
  // Fails-open: if no communication settings exist (first-time store) or
  // the lookup errors, we send the email (safe default).
  const eventToggleMap: Partial<Record<EventType, string>> = {
    ORDER_CREATED: "emailOrderCreated",
    PAYMENT_APPROVED: "emailPaymentApproved",
    PAYMENT_PENDING: "emailPaymentPending",
    PAYMENT_FAILED: "emailPaymentFailed",
    ORDER_SHIPPED: "emailOrderShipped",
    ORDER_CANCELLED: "emailOrderCancelled",
    PAYMENT_REFUNDED: "emailPaymentRefunded",
    ORDER_DELIVERED: "emailOrderDelivered",
    ABANDONED_CART: "emailAbandonedCart",
    STOCK_CRITICAL: "emailStockCritical",
  };

  const toggleColumn = eventToggleMap[params.eventType];
  if (toggleColumn) {
    try {
      const commSettings = await prisma.storeCommunicationSettings.findUnique({
        where: { storeId: params.storeId },
        select: { [toggleColumn]: true },
      });
      // If a row exists and the toggle is explicitly false, skip
      if (commSettings && (commSettings as Record<string, unknown>)[toggleColumn] === false) {
        console.log(`[Email] Skipping ${params.eventType}: disabled by merchant in Comunicación settings.`);
        return true;
      }
    } catch {
      // Fail-open: if the lookup errors, proceed with sending
    }
  }

  const provider = getEmailProvider();

  // Create or Update log as pending
  const log = await prisma.emailLog.upsert({
    where: {
      eventType_entityType_entityId: {
        eventType: params.eventType,
        entityType: params.entityType,
        entityId: params.entityId,
      }
    },
    update: { status: "pending", errorMessage: null },
    create: {
      storeId: params.storeId,
      eventType: params.eventType,
      entityType: params.entityType,
      entityId: params.entityId,
      recipient: params.recipient,
      status: "pending",
      provider: provider.name,
    }
  });

  try {
    let htmlContent = "";
    let subject = "";

    switch (params.eventType) {
      case "ORDER_CREATED":
        subject = `Recibimos tu pedido ${params.data.orderNumber} - ${params.data.storeName}`;
        htmlContent = templates.generateOrderCreatedTemplate(params.data);
        break;
      case "ORDER_PAID_OWNER":
        subject = `Nuevo pago confirmado: ${params.data.orderNumber}`;
        htmlContent = templates.generateOwnerPaymentApprovedTemplate(params.data);
        break;
      case "PAYMENT_APPROVED":
        subject = `Pago Aprobado: Pedido ${params.data.orderNumber}`;
        htmlContent = templates.generatePaymentApprovedTemplate(params.data);
        break;
      case "PAYMENT_PENDING":
        subject = `Pago Pendiente de Confirmación - ${params.data.storeName}`;
        htmlContent = templates.generatePaymentPendingTemplate(params.data);
        break;
      case "PAYMENT_FAILED":
        subject = `Hubo un problema con tu pago - ${params.data.storeName}`;
        htmlContent = templates.generatePaymentFailedTemplate(params.data);
        break;
      case "ORDER_SHIPPED":
        subject = `¡Tu pedido ${params.data.orderNumber} va en camino!`;
        htmlContent = templates.generateOrderShippedTemplate(params.data);
        break;
      case "ORDER_CANCELLED":
        subject = `Pedido Cancelado - ${params.data.orderNumber}`;
        htmlContent = templates.generateOrderCancelledTemplate(params.data);
        break;
      case "PAYMENT_REFUNDED":
        subject = `Reembolso Procesado para el pedido ${params.data.orderNumber}`;
        htmlContent = templates.generatePaymentRefundedTemplate(params.data);
        break;
      case "ORDER_IN_TRANSIT":
        subject = `Tu pedido ${params.data.orderNumber} se está moviendo`;
        htmlContent = templates.generateOrderInTransitTemplate(params.data);
        break;
      case "ORDER_DELIVERED":
        subject = `¡Tu pedido ${params.data.orderNumber} ha sido entregado!`;
        htmlContent = templates.generateOrderDeliveredTemplate(params.data);
        break;
      case "POST_PURCHASE_REVIEW_REQUEST":
        subject = `¿Cómo fue tu experiencia con ${params.data.storeName}?`;
        // V3.3: wrap the CTA href with the click-tracking redirect so real
        // clicks land in EmailLog.clickCount. The destination itself is
        // preserved — the redirect just lands the user at the same URL.
        htmlContent = templates.generatePostPurchaseReviewRequestTemplate({
          ...params.data,
          statusUrl: params.data.statusUrl
            ? buildTrackedUrl(log.id, params.data.statusUrl)
            : params.data.statusUrl,
        });
        break;
      case "POST_PURCHASE_REORDER_FOLLOWUP":
        subject = `¿Te interesa volver a ${params.data.storeName}?`;
        // V3.4: same wrap pattern as the review-request flow so both
        // post-purchase CTAs contribute to real click counts.
        htmlContent = templates.generatePostPurchaseReorderFollowupTemplate({
          ...params.data,
          statusUrl: params.data.statusUrl
            ? buildTrackedUrl(log.id, params.data.statusUrl)
            : params.data.statusUrl,
        });
        break;
      default:
        throw new Error(`Unhandled event type: ${params.eventType}`);
    }

    const payload: EmailPayload = {
      to: params.recipient,
      subject,
      html: htmlContent,
    };

    const result = await provider.send(payload);

    if (result.success) {
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: "sent", sentAt: new Date(), errorMessage: null }
      });
      return true;
    } else {
      throw new Error(result.error || "Unknown provider error");
    }

  } catch (error: any) {
    await logSystemEvent({
      storeId: params.storeId,
      entityType: "email",
      entityId: params.entityId,
      eventType: "email_failed",
      severity: "error",
      source: "email_service",
      message: `Error enviando email ${params.eventType} a ${params.recipient}`,
      metadata: { error: error.message }
    });

    console.error(`[Email] Failed to send ${params.eventType}`, error);
    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: "failed", errorMessage: String(error.message || error) }
    });
    return false;
  }
}
