import { prisma } from "@/lib/db/prisma";

// ─── Order Timeline ─────────────────────────────────────────────────────
//
// Aggregates events from multiple sources into a unified, chronological
// timeline for a single order. Sources:
//
//   1. Order metadata (createdAt, cancelledAt, refundedAt, shippedAt, deliveredAt)
//   2. Payment records
//   3. SystemEvent entries (entityType="order", entityId=orderId)
//   4. EmailLog entries (entityType="order", entityId=orderId)
//   5. StockMovement entries (orderId=orderId)
//
// Security: always filters by storeId to enforce tenant isolation.

export interface OrderTimelineEvent {
  id: string;
  occurredAt: string; // ISO string for serialization
  type: string;
  title: string;
  description?: string;
  actor: "system" | "merchant" | "customer" | "payment_provider" | "cron";
  severity: "neutral" | "success" | "warning" | "danger";
  metadata?: Record<string, unknown>;
}

// ─── Sensitive keys to strip from metadata before rendering ────────────
const SENSITIVE_KEYS = new Set([
  "accessToken", "refreshToken", "clientSecret", "apiKey", "secret",
  "tokenEncrypted", "accessTokenEncrypted", "refreshTokenEncrypted",
  "rawResponse", "rawWebhookBody", "signature", "webhookSecret",
  "password", "credential", "privateKey",
]);

function sanitizeMetadata(raw: string | null | undefined): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k)) continue;
      if (typeof k === "string" && (k.toLowerCase().includes("token") || k.toLowerCase().includes("secret"))) continue;
      clean[k] = v;
    }
    return Object.keys(clean).length > 0 ? clean : undefined;
  } catch {
    return undefined;
  }
}

// ─── Human-readable event type mapping ──────────────────────────────────

const SYSTEM_EVENT_LABELS: Record<string, { title: string; severity: OrderTimelineEvent["severity"]; actor: OrderTimelineEvent["actor"] }> = {
  order_created: { title: "Orden creada", severity: "neutral", actor: "customer" },
  order_status_changed: { title: "Estado de orden actualizado", severity: "neutral", actor: "system" },
  order_cancelled: { title: "Orden cancelada", severity: "danger", actor: "merchant" },
  order_refunded: { title: "Orden reembolsada", severity: "danger", actor: "merchant" },
  order_fulfilled: { title: "Orden marcada como preparada", severity: "success", actor: "merchant" },
  order_shipped: { title: "Orden enviada", severity: "success", actor: "merchant" },
  order_delivered: { title: "Orden entregada", severity: "success", actor: "merchant" },
  payment_approved: { title: "Pago aprobado", severity: "success", actor: "payment_provider" },
  payment_pending: { title: "Pago pendiente", severity: "warning", actor: "payment_provider" },
  payment_rejected: { title: "Pago rechazado", severity: "danger", actor: "payment_provider" },
  payment_failed: { title: "Pago fallido", severity: "danger", actor: "payment_provider" },
  payment_refunded: { title: "Pago reembolsado", severity: "danger", actor: "payment_provider" },
  payment_in_process: { title: "Pago en proceso", severity: "warning", actor: "payment_provider" },
  payment_webhook_received: { title: "Notificación de pago recibida", severity: "neutral", actor: "payment_provider" },
  pickup_stock_decremented: { title: "Stock reservado para pickup", severity: "neutral", actor: "system" },
  pickup_stock_restored: { title: "Stock de pickup restaurado", severity: "warning", actor: "system" },
  pickup_ready: { title: "Pedido listo para retirar", severity: "success", actor: "merchant" },
  pickup_delivered: { title: "Pedido retirado por cliente", severity: "success", actor: "merchant" },
  pickup_reservation_expired: { title: "Reserva pickup expirada", severity: "warning", actor: "cron" },
  stock_decremented: { title: "Stock descontado", severity: "neutral", actor: "system" },
  stock_restored: { title: "Stock restaurado", severity: "warning", actor: "system" },
  fulfillment_updated: { title: "Estado de envío actualizado", severity: "neutral", actor: "merchant" },
  fulfillment_preparing: { title: "Preparación iniciada", severity: "neutral", actor: "merchant" },
  fulfillment_shipped: { title: "Orden despachada", severity: "success", actor: "merchant" },
  fulfillment_delivered: { title: "Orden entregada", severity: "success", actor: "merchant" },
  fulfillment_blocked: { title: "Transición de envío bloqueada", severity: "warning", actor: "system" },
  shipment_created: { title: "Envío creado con carrier", severity: "success", actor: "merchant" },
  shipment_create_failed: { title: "Error al crear envío", severity: "danger", actor: "system" },
  order_marked_shipped: { title: "Orden marcada como enviada manualmente", severity: "success", actor: "merchant" },
  tracking_updated: { title: "Tracking actualizado", severity: "neutral", actor: "merchant" },
  cost_snapshot_backfill_batch_completed: { title: "Costo snapshot actualizado (backfill)", severity: "neutral", actor: "system" },
};

const EMAIL_EVENT_LABELS: Record<string, string> = {
  ORDER_CREATED: "Email de confirmación de orden",
  PAYMENT_APPROVED: "Email de pago aprobado",
  PAYMENT_PENDING: "Email de pago pendiente",
  PAYMENT_FAILED: "Email de pago fallido",
  ORDER_SHIPPED: "Email de envío con tracking",
  ORDER_DELIVERED: "Email de entrega confirmada",
  ORDER_CANCELLED: "Email de cancelación",
  PICKUP_READY: "Email de pedido listo para retirar",
};

const STOCK_TYPE_LABELS: Record<string, { title: string; severity: OrderTimelineEvent["severity"] }> = {
  sale: { title: "Stock descontado por venta", severity: "neutral" },
  manual_adjustment: { title: "Ajuste manual de stock", severity: "warning" },
  refund_restore: { title: "Stock restaurado por reembolso", severity: "warning" },
  cancellation_restore: { title: "Stock restaurado por cancelación", severity: "warning" },
  sourcing_import: { title: "Stock ingresado por importación", severity: "success" },
  sync_update: { title: "Stock sincronizado", severity: "neutral" },
};

const PAYMENT_STATUS_LABELS: Record<string, { title: string; severity: OrderTimelineEvent["severity"] }> = {
  pending: { title: "Pago creado (pendiente)", severity: "warning" },
  approved: { title: "Pago aprobado", severity: "success" },
  rejected: { title: "Pago rechazado", severity: "danger" },
  cancelled: { title: "Pago cancelado", severity: "danger" },
  refunded: { title: "Pago reembolsado", severity: "danger" },
  in_process: { title: "Pago en proceso", severity: "warning" },
  failed: { title: "Pago fallido", severity: "danger" },
};

// ─── Main query ─────────────────────────────────────────────────────────

export async function getOrderTimeline(
  orderId: string,
  storeId: string,
): Promise<OrderTimelineEvent[]> {
  // Verify ownership
  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId },
    select: {
      id: true,
      createdAt: true,
      cancelledAt: true,
      cancelReason: true,
      refundedAt: true,
      refundAmount: true,
      shippedAt: true,
      deliveredAt: true,
      status: true,
      paymentStatus: true,
      channel: true,
    },
  });

  if (!order) return [];

  const events: OrderTimelineEvent[] = [];

  // 1. Order created
  events.push({
    id: `order-created-${orderId}`,
    occurredAt: order.createdAt.toISOString(),
    type: "order_created",
    title: "Orden creada",
    description: `Canal: ${order.channel}`,
    actor: "customer",
    severity: "neutral",
  });

  // 2. Fetch payments, system events, email logs, stock movements in parallel
  const [payments, systemEvents, emailLogs, stockMovements] = await Promise.all([
    prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, status: true, provider: true, amount: true, currency: true,
        paymentMethod: true, installments: true, externalId: true, paidAt: true,
        createdAt: true,
      },
    }),
    prisma.systemEvent.findMany({
      where: {
        storeId,
        OR: [
          { entityType: "order", entityId: orderId },
          { entityType: "payment", entityId: orderId },
        ],
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, eventType: true, message: true, severity: true,
        source: true, metadataJson: true, createdAt: true,
      },
    }),
    prisma.emailLog.findMany({
      where: { storeId, entityType: "order", entityId: orderId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, eventType: true, recipient: true, status: true,
        provider: true, errorMessage: true, createdAt: true, sentAt: true,
      },
    }),
    prisma.stockMovement.findMany({
      where: { storeId, orderId },
      orderBy: { createdAt: "asc" },
      include: {
        product: { select: { title: true } },
        variant: { select: { title: true } },
      },
    }),
  ]);

  // 3. Payment events
  for (const p of payments) {
    const label = PAYMENT_STATUS_LABELS[p.status] ?? { title: `Pago: ${p.status}`, severity: "neutral" as const };
    const desc = [
      p.provider && `Proveedor: ${p.provider}`,
      p.paymentMethod && `Método: ${p.paymentMethod}`,
      p.installments && p.installments > 1 && `${p.installments} cuotas`,
      p.externalId && `ID externo: ${p.externalId}`,
      `$${p.amount.toLocaleString("es-AR")} ${p.currency}`,
    ].filter(Boolean).join(" · ");

    events.push({
      id: `payment-${p.id}`,
      occurredAt: (p.paidAt ?? p.createdAt).toISOString(),
      type: `payment_${p.status}`,
      title: label.title,
      description: desc,
      actor: "payment_provider",
      severity: label.severity,
    });
  }

  // 4. SystemEvent entries
  for (const se of systemEvents) {
    const label = SYSTEM_EVENT_LABELS[se.eventType];
    // Skip "order_created" from SystemEvent — we already emit that from Order.createdAt
    if (se.eventType === "order_created") continue;

    events.push({
      id: `se-${se.id}`,
      occurredAt: se.createdAt.toISOString(),
      type: se.eventType,
      title: label?.title ?? humanizeEventType(se.eventType),
      description: se.message,
      actor: label?.actor ?? deriveActor(se.source),
      severity: label?.severity ?? mapSeverity(se.severity),
      metadata: sanitizeMetadata(se.metadataJson),
    });
  }

  // 5. Email events
  for (const el of emailLogs) {
    const label = EMAIL_EVENT_LABELS[el.eventType] ?? `Email: ${el.eventType}`;
    const statusLabel = el.status === "sent" ? "enviado" : el.status === "failed" ? "falló" : "pendiente";

    events.push({
      id: `email-${el.id}`,
      occurredAt: (el.sentAt ?? el.createdAt).toISOString(),
      type: `email_${el.eventType.toLowerCase()}`,
      title: label,
      description: `${statusLabel} a ${el.recipient}${el.errorMessage ? ` — Error: ${el.errorMessage}` : ""}`,
      actor: "system",
      severity: el.status === "failed" ? "danger" : el.status === "sent" ? "success" : "neutral",
    });
  }

  // 6. Stock movement events
  for (const sm of stockMovements) {
    const label = STOCK_TYPE_LABELS[sm.type] ?? { title: `Movimiento: ${sm.type}`, severity: "neutral" as const };
    const productLabel = sm.product?.title ?? "Producto";
    const variantLabel = sm.variant?.title ? ` (${sm.variant.title})` : "";
    const delta = sm.quantityDelta > 0 ? `+${sm.quantityDelta}` : `${sm.quantityDelta}`;

    events.push({
      id: `stock-${sm.id}`,
      occurredAt: sm.createdAt.toISOString(),
      type: `stock_${sm.type}`,
      title: label.title,
      description: `${productLabel}${variantLabel}: ${delta} unidad(es)${sm.reason ? ` — ${sm.reason}` : ""}`,
      actor: sm.type === "manual_adjustment" ? "merchant" : "system",
      severity: label.severity,
    });
  }

  // 7. Order lifecycle milestones from direct fields
  if (order.cancelledAt) {
    events.push({
      id: `order-cancelled-${orderId}`,
      occurredAt: order.cancelledAt.toISOString(),
      type: "order_cancelled",
      title: "Orden cancelada",
      description: order.cancelReason ?? undefined,
      actor: "merchant",
      severity: "danger",
    });
  }
  if (order.refundedAt) {
    events.push({
      id: `order-refunded-${orderId}`,
      occurredAt: order.refundedAt.toISOString(),
      type: "order_refunded",
      title: "Orden reembolsada",
      description: order.refundAmount ? `$${order.refundAmount.toLocaleString("es-AR")}` : undefined,
      actor: "merchant",
      severity: "danger",
    });
  }
  if (order.shippedAt) {
    events.push({
      id: `order-shipped-${orderId}`,
      occurredAt: order.shippedAt.toISOString(),
      type: "order_shipped",
      title: "Orden enviada",
      actor: "merchant",
      severity: "success",
    });
  }
  if (order.deliveredAt) {
    events.push({
      id: `order-delivered-${orderId}`,
      occurredAt: order.deliveredAt.toISOString(),
      type: "order_delivered",
      title: "Orden entregada",
      actor: "merchant",
      severity: "success",
    });
  }

  // Sort newest first
  events.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  // Deduplicate by type+timestamp (within 2s window)
  const deduplicated: OrderTimelineEvent[] = [];
  for (const ev of events) {
    const isDup = deduplicated.some(
      (existing) =>
        existing.type === ev.type &&
        Math.abs(new Date(existing.occurredAt).getTime() - new Date(ev.occurredAt).getTime()) < 2000,
    );
    if (!isDup) deduplicated.push(ev);
  }

  return deduplicated;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function humanizeEventType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function deriveActor(source: string): OrderTimelineEvent["actor"] {
  if (source.includes("webhook") || source.includes("mercadopago")) return "payment_provider";
  if (source.includes("cron") || source.includes("expire")) return "cron";
  if (source.includes("admin") || source.includes("manual")) return "merchant";
  return "system";
}

function mapSeverity(severity: string): OrderTimelineEvent["severity"] {
  switch (severity) {
    case "error":
    case "critical":
      return "danger";
    case "warn":
      return "warning";
    default:
      return "neutral";
  }
}
