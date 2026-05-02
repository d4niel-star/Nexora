// ─── Email Preview Renderer ─────────────────────────────────────────────
//
// Renders email templates with safe demo data for admin preview.
// Never sends email, never creates EmailLog.

import type { EventType, OrderEmailData } from "./types";
import * as templates from "./templates";

export interface EmailPreviewResult {
  subject: string;
  html: string;
  warnings: string[];
}

/**
 * Demo data used for previews. Clearly marked as QA/demo.
 */
function buildDemoOrderData(storeName: string, storeSlug: string): OrderEmailData {
  return {
    storeSlug,
    storeName,
    customerName: "María García (demo)",
    orderNumber: "#DEMO-10042",
    orderId: "preview-demo-id",
    subtotal: 15900,
    shippingAmount: 2500,
    total: 18400,
    currency: "ARS",
    shippingMethodLabel: "Envío estándar",
    trackingUrl: `https://${storeSlug}.nexora.app/tracking`,
    trackingCode: "DEMO-TRACK-001",
    statusUrl: `https://${storeSlug}.nexora.app/checkout/success`,
    pickupLocalName: storeName,
    pickupAddress: "Av. Corrientes 1234, CABA",
    pickupHoursSummary: "Lun a Vie 09:00-18:00 · Sáb 10:00-14:00",
    pickupInstructions: "Presentar DNI en mostrador. Atención por orden de llegada.",
    pickupPhone: "+54 11 5555-1234",
    pickupGoogleMapsUrl: "https://maps.google.com/?q=Av.+Corrientes+1234+CABA",
  };
}

/**
 * Renders an email preview for admin viewing.
 * Returns subject + HTML. Never sends. No side effects.
 */
export function renderEmailPreview(
  eventType: EventType,
  storeName: string,
  storeSlug: string,
): EmailPreviewResult {
  const data = buildDemoOrderData(storeName, storeSlug);
  const warnings: string[] = [];

  let subject = "";
  let html = "";

  switch (eventType) {
    case "ORDER_CREATED":
      subject = `Recibimos tu pedido ${data.orderNumber} - ${data.storeName}`;
      html = templates.generateOrderCreatedTemplate(data);
      break;
    case "ORDER_PAID_OWNER":
      subject = `Nuevo pago confirmado: ${data.orderNumber}`;
      html = templates.generateOwnerPaymentApprovedTemplate(data);
      break;
    case "PAYMENT_APPROVED":
      subject = `Pago Aprobado: Pedido ${data.orderNumber}`;
      html = templates.generatePaymentApprovedTemplate(data);
      break;
    case "PAYMENT_PENDING":
      subject = `Pago Pendiente de Confirmación - ${data.storeName}`;
      html = templates.generatePaymentPendingTemplate(data);
      break;
    case "PAYMENT_FAILED":
      subject = `Hubo un problema con tu pago - ${data.storeName}`;
      html = templates.generatePaymentFailedTemplate(data);
      break;
    case "ORDER_SHIPPED":
      subject = `¡Tu pedido ${data.orderNumber} va en camino!`;
      html = templates.generateOrderShippedTemplate(data);
      break;
    case "ORDER_CANCELLED":
      subject = `Pedido Cancelado - ${data.orderNumber}`;
      html = templates.generateOrderCancelledTemplate(data);
      break;
    case "PAYMENT_REFUNDED":
      subject = `Reembolso Procesado para el pedido ${data.orderNumber}`;
      html = templates.generatePaymentRefundedTemplate(data);
      break;
    case "ORDER_DELIVERED":
      subject = `¡Tu pedido ${data.orderNumber} ha sido entregado!`;
      html = templates.generateOrderDeliveredTemplate(data);
      break;
    case "PICKUP_READY":
      subject = `Tu pedido ${data.orderNumber} está listo para retirar`;
      html = templates.generatePickupReadyTemplate(data);
      break;
    case "STOCK_CRITICAL":
      subject = `Stock crítico en tu tienda - ${data.storeName}`;
      html = templates.generateStockCriticalTemplate({
        storeSlug,
        storeName,
        productTitle: "Remera Oversize Negra (demo)",
        variantTitle: "Talle L",
        sku: "DEMO-REM-L",
        currentStock: 2,
        reorderPoint: 5,
        inventoryUrl: "/admin/inventory",
      });
      break;
    case "ABANDONED_CART":
      subject = `Completá tu compra en ${data.storeName}`;
      html = templates.generateAbandonedCartTemplate({
        storeSlug,
        storeName,
        customerName: "María García (demo)",
        cartItems: [
          { title: "Remera Oversize", variantTitle: "Negro · L", quantity: 1, price: 8500, image: null },
          { title: "Jean Slim Fit", variantTitle: "Azul · 30", quantity: 1, price: 12900, image: null },
        ],
        subtotal: 21400,
        currency: "ARS",
        recoveryUrl: `https://${storeSlug}.nexora.app/cart`,
      });
      break;
    default:
      warnings.push(`No hay template disponible para el evento "${eventType}".`);
      subject = `(Sin template) ${eventType}`;
      html = `<p>No hay template implementado para este evento.</p>`;
  }

  return { subject, html, warnings };
}
