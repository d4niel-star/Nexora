import { prisma } from "@/lib/db/prisma";
import { getProvider, normalizeStatus } from "./registry";
import { updateOrderFulfillment } from "../store-engine/fulfillment/actions";
import { logSystemEvent } from "../observability/audit";

export async function processLogisticsWebhook(providerId: string, request: Request) {
  const provider = getProvider(providerId);

  if (!provider.parseWebhook) {
    throw new Error(`Provider ${provider.name} no implementa parseWebhook yet.`);
  }

  // 1. Parsing and validation delegated to Provider
  const payload = await provider.parseWebhook(request);

  // 2. Prevent duplication / Idempotency Check
  const existingLog = await prisma.carrierWebhookLog.findUnique({
    where: {
      provider_externalEventId: {
        provider: provider.id,
        externalEventId: payload.externalEventId,
      }
    }
  });

  if (existingLog) {
    console.log(`[Logistics Webhook] Ignorado. Evento ya procesado: ${payload.externalEventId}`);
    return { status: "ignored_duplicate" };
  }

  // 3. Find the Order using trackingCode
  const order = await prisma.order.findFirst({
    where: { trackingCode: payload.trackingCode }
  });

  if (!order) {
     // Log failure, but acknowledge to the provider we received it
     await prisma.carrierWebhookLog.create({
       data: {
         provider: provider.id,
         externalEventId: payload.externalEventId,
         trackingCode: payload.trackingCode,
         bodyJson: JSON.stringify(payload.rawPayload),
         status: "failed"
       }
     });
     await logSystemEvent({
       entityType: "webhook_logistics",
       entityId: payload.externalEventId,
       eventType: "logistics_webhook_failed",
       severity: "warn",
       source: "logistics_webhook",
       message: `Order no encontrada para tracking: ${payload.trackingCode}`
     });
     return { status: "error_not_found" };
  }

  // 4. Determine normalizations
  const mappedStatus = normalizeStatus(payload.status) as any;

  // We should not revert order backwards logic simply
  const isCurrentlyDelivered = order.shippingStatus === "delivered";
  const isGoingBackwards = isCurrentlyDelivered && mappedStatus !== "delivered";

  if (isGoingBackwards) {
    // Simply record the webhook but ignore mutating the order fulfilling
    await prisma.carrierWebhookLog.create({
      data: {
        provider: provider.id,
        externalEventId: payload.externalEventId,
        trackingCode: payload.trackingCode,
        bodyJson: JSON.stringify(payload.rawPayload),
        status: "ignored"
      }
    });
    await logSystemEvent({
       storeId: order.storeId,
       entityType: "order",
       entityId: order.id,
       eventType: "logistics_webhook_ignored",
       severity: "info",
       source: "logistics_webhook",
       message: `Orden ${order.orderNumber} ignoró payload ${mappedStatus} al ya estar Delivered`
    });
    return { status: "ignored_backwards_transition" };
  }

  // 5. Update Fulfillment (which natively handles emails and timestamps for us via existing updateOrderFulfillment API!)
  await updateOrderFulfillment({
    orderId: order.id,
    shippingStatus: mappedStatus,
  });

  // 6. Log Success
  await prisma.carrierWebhookLog.create({
    data: {
      provider: provider.id,
      externalEventId: payload.externalEventId,
      trackingCode: payload.trackingCode,
      bodyJson: JSON.stringify(payload.rawPayload),
      status: "processed"
    }
  });

  return { status: "success", orderId: order.id };
}
