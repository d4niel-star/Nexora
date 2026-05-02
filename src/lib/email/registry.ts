// ─── Email Automation Registry ──────────────────────────────────────────
//
// Central definition of all automated emails in Nexora.
// Each entry declares its real implementation status, toggle mapping,
// template availability, and supported operations.

import type { EventType } from "./types";

export interface EmailAutomationDefinition {
  event: EventType;
  label: string;
  description: string;
  trigger: string;
  implemented: boolean;
  hasTemplate: boolean;
  toggleColumn: string | null; // column name in StoreCommunicationSettings
  customerFacing: boolean;
  supportsPreview: boolean;
  supportsTestSend: boolean;
}

/**
 * Registry of all known email automations.
 * Only events with real templates and real triggers are marked as implemented.
 */
export const EMAIL_AUTOMATIONS: EmailAutomationDefinition[] = [
  // ── Customer-facing ──────────────────────────────────────────────
  {
    event: "ORDER_CREATED",
    label: "Pedido recibido",
    description: "Confirmación al cliente cuando se crea un nuevo pedido.",
    trigger: "Checkout completado / webhook Mercado Pago",
    implemented: true,
    hasTemplate: true,
    toggleColumn: "emailOrderCreated",
    customerFacing: true,
    supportsPreview: true,
    supportsTestSend: true,
  },
  {
    event: "PAYMENT_APPROVED",
    label: "Pago aprobado",
    description: "Notificación al cliente cuando su pago fue acreditado.",
    trigger: "Webhook Mercado Pago status=approved",
    implemented: true,
    hasTemplate: true,
    toggleColumn: "emailPaymentApproved",
    customerFacing: true,
    supportsPreview: true,
    supportsTestSend: true,
  },
  {
    event: "PAYMENT_PENDING",
    label: "Pago pendiente",
    description: "Aviso cuando el pago está en proceso de acreditación.",
    trigger: "Webhook Mercado Pago status=pending/in_process",
    implemented: true,
    hasTemplate: true,
    toggleColumn: "emailPaymentPending",
    customerFacing: true,
    supportsPreview: true,
    supportsTestSend: true,
  },
  {
    event: "PAYMENT_FAILED",
    label: "Pago fallido",
    description: "Alerta al cliente si el pago fue rechazado.",
    trigger: "Webhook Mercado Pago status=rejected/failed",
    implemented: true,
    hasTemplate: true,
    toggleColumn: "emailPaymentFailed",
    customerFacing: true,
    supportsPreview: true,
    supportsTestSend: true,
  },
  {
    event: "ORDER_SHIPPED",
    label: "Pedido despachado",
    description: "Notificación con código de seguimiento cuando se despacha.",
    trigger: "Admin marca fulfillment como shipped",
    implemented: true,
    hasTemplate: true,
    toggleColumn: "emailOrderShipped",
    customerFacing: true,
    supportsPreview: true,
    supportsTestSend: true,
  },
  {
    event: "ORDER_DELIVERED",
    label: "Pedido entregado",
    description: "Confirmación cuando el transportista entrega el pedido.",
    trigger: "Admin marca fulfillment como delivered",
    implemented: true,
    hasTemplate: true,
    toggleColumn: "emailOrderDelivered",
    customerFacing: true,
    supportsPreview: true,
    supportsTestSend: true,
  },
  {
    event: "ORDER_CANCELLED",
    label: "Pedido cancelado",
    description: "Aviso al cliente cuando un pedido es cancelado.",
    trigger: "Admin cancela orden desde el drawer",
    implemented: true,
    hasTemplate: true,
    toggleColumn: "emailOrderCancelled",
    customerFacing: true,
    supportsPreview: true,
    supportsTestSend: true,
  },
  {
    event: "PAYMENT_REFUNDED",
    label: "Reembolso procesado",
    description: "Confirmación al cliente del reembolso de su pago.",
    trigger: "Admin procesa refund",
    implemented: true,
    hasTemplate: true,
    toggleColumn: "emailPaymentRefunded",
    customerFacing: true,
    supportsPreview: true,
    supportsTestSend: true,
  },
  {
    event: "PICKUP_READY",
    label: "Pedido listo para retirar",
    description: "Email al cliente cuando el pedido de pickup está preparado.",
    trigger: "Admin marca pickup como ready desde local físico",
    implemented: true,
    hasTemplate: true,
    toggleColumn: null, // no toggle — controlled by local store actions
    customerFacing: true,
    supportsPreview: true,
    supportsTestSend: true,
  },
  {
    event: "ABANDONED_CART",
    label: "Carrito abandonado",
    description: "Recordatorio al cliente sobre productos que dejó en el carrito.",
    trigger: "Cron de recuperación de carritos",
    implemented: true,
    hasTemplate: true,
    toggleColumn: "emailAbandonedCart",
    customerFacing: true,
    supportsPreview: true,
    supportsTestSend: false, // requires cart data
  },
  // ── Merchant-facing ──────────────────────────────────────────────
  {
    event: "STOCK_CRITICAL",
    label: "Stock crítico",
    description: "Alerta cuando un producto llega al stock mínimo.",
    trigger: "Venta que reduce stock por debajo del punto de reposición",
    implemented: true,
    hasTemplate: true,
    toggleColumn: "emailStockCritical",
    customerFacing: false,
    supportsPreview: true,
    supportsTestSend: false, // requires variant context
  },
  {
    event: "ORDER_PAID_OWNER",
    label: "Nuevo pago (para merchant)",
    description: "Notificación al merchant cuando un pedido es pagado.",
    trigger: "Webhook Mercado Pago status=approved",
    implemented: true,
    hasTemplate: true,
    toggleColumn: null,
    customerFacing: false,
    supportsPreview: true,
    supportsTestSend: true,
  },
];

export function getEmailAutomation(event: string): EmailAutomationDefinition | undefined {
  return EMAIL_AUTOMATIONS.find((a) => a.event === event);
}

export function getImplementedEmailAutomations(): EmailAutomationDefinition[] {
  return EMAIL_AUTOMATIONS.filter((a) => a.implemented);
}
