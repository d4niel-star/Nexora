"use server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import { renderEmailPreview } from "./preview";
import { getEmailProvider } from "./providers";
import { getEmailAutomation } from "./registry";
import { logSystemEvent } from "@/lib/observability/audit";
import type { EventType } from "./types";

// ─── Email Preview Action ───────────────────────────────────────────────

export interface PreviewResult {
  success: boolean;
  subject?: string;
  html?: string;
  warnings?: string[];
  error?: string;
}

export async function getEmailPreview(eventType: string): Promise<PreviewResult> {
  const store = await getCurrentStore();
  if (!store) return { success: false, error: "No hay tienda activa" };

  const def = getEmailAutomation(eventType);
  if (!def) return { success: false, error: `Evento "${eventType}" no encontrado en el registry.` };
  if (!def.supportsPreview) return { success: false, error: `El evento "${eventType}" no soporta preview.` };

  try {
    const result = renderEmailPreview(
      eventType as EventType,
      store.name,
      store.slug,
    );
    return {
      success: true,
      subject: result.subject,
      html: result.html,
      warnings: result.warnings,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al renderizar preview" };
  }
}

// ─── Test Send Action ───────────────────────────────────────────────────

export interface TestSendResult {
  success: boolean;
  error?: string;
}

/**
 * Send a test email for a given event type.
 *
 * Policy:
 * - Test sends bypass the toggle check (they're explicit admin actions).
 * - The subject is prefixed with "[PRUEBA]" to distinguish from real emails.
 * - An EmailLog is NOT created to avoid polluting idempotency checks.
 * - A SystemEvent IS created for audit trail.
 */
export async function sendTestEmail(
  eventType: string,
  recipientEmail: string,
): Promise<TestSendResult> {
  const store = await getCurrentStore();
  if (!store) return { success: false, error: "No hay tienda activa" };

  // Validate event
  const def = getEmailAutomation(eventType);
  if (!def) return { success: false, error: `Evento "${eventType}" no reconocido.` };
  if (!def.supportsTestSend) return { success: false, error: `El evento "${eventType}" no soporta envío de prueba.` };

  // Validate email
  const email = recipientEmail.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Email de destino inválido." };
  }

  try {
    // Render preview
    const preview = renderEmailPreview(
      eventType as EventType,
      store.name,
      store.slug,
    );

    if (preview.warnings.length > 0) {
      return { success: false, error: preview.warnings.join(". ") };
    }

    // Send via real provider
    const provider = getEmailProvider();
    const result = await provider.send({
      to: email,
      subject: `[PRUEBA] ${preview.subject}`,
      html: preview.html,
    });

    // Audit log
    await logSystemEvent({
      storeId: store.id,
      entityType: "email_test",
      entityId: `test-${eventType}-${Date.now()}`,
      eventType: "email_test_sent",
      severity: result.success ? "info" : "error",
      source: "admin_communication",
      message: result.success
        ? `Email de prueba "${def.label}" enviado a ${email}`
        : `Error enviando email de prueba "${def.label}" a ${email}`,
      metadata: {
        eventType,
        recipient: email,
        provider: provider.name,
        success: result.success,
        ...(result.error ? { error: result.error } : {}),
      },
    });

    if (!result.success) {
      return { success: false, error: result.error || "Error desconocido del proveedor" };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Error inesperado al enviar" };
  }
}

// ─── Email Logs Query ───────────────────────────────────────────────────

export interface EmailLogRow {
  id: string;
  createdAt: string;
  eventType: string;
  eventLabel: string;
  entityType: string;
  entityId: string;
  recipient: string;
  status: string;
  errorMessage: string | null;
  provider: string;
  sentAt: string | null;
}

export interface EmailLogsResult {
  logs: EmailLogRow[];
  total: number;
}

const EVENT_LABELS: Record<string, string> = {
  ORDER_CREATED: "Pedido recibido",
  ORDER_PAID_OWNER: "Pago (merchant)",
  PAYMENT_APPROVED: "Pago aprobado",
  PAYMENT_PENDING: "Pago pendiente",
  PAYMENT_FAILED: "Pago fallido",
  ORDER_SHIPPED: "Pedido despachado",
  ORDER_CANCELLED: "Pedido cancelado",
  PAYMENT_REFUNDED: "Reembolso",
  ORDER_DELIVERED: "Pedido entregado",
  PICKUP_READY: "Pickup listo",
  STOCK_CRITICAL: "Stock crítico",
  ABANDONED_CART: "Carrito abandonado",
  POST_PURCHASE_REVIEW_REQUEST: "Solicitud de reseña",
  POST_PURCHASE_REORDER_FOLLOWUP: "Seguimiento de recompra",
};

export async function getEmailLogs(limit: number = 25): Promise<EmailLogsResult> {
  const store = await getCurrentStore();
  if (!store) return { logs: [], total: 0 };

  const [total, rows] = await Promise.all([
    prisma.emailLog.count({ where: { storeId: store.id } }),
    prisma.emailLog.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 50),
      select: {
        id: true,
        createdAt: true,
        eventType: true,
        entityType: true,
        entityId: true,
        recipient: true,
        status: true,
        errorMessage: true,
        provider: true,
        sentAt: true,
      },
    }),
  ]);

  return {
    logs: rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      eventType: r.eventType,
      eventLabel: EVENT_LABELS[r.eventType] ?? r.eventType,
      entityType: r.entityType,
      entityId: r.entityId,
      recipient: r.recipient,
      status: r.status,
      errorMessage: r.errorMessage,
      provider: r.provider,
      sentAt: r.sentAt?.toISOString() ?? null,
    })),
    total,
  };
}

// ─── Toggle Status Query ────────────────────────────────────────────────

export interface EmailToggleStatus {
  event: string;
  enabled: boolean;
}

export async function getEmailToggleStatuses(): Promise<EmailToggleStatus[]> {
  const store = await getCurrentStore();
  if (!store) return [];

  const settings = await prisma.storeCommunicationSettings.findUnique({
    where: { storeId: store.id },
    select: {
      emailOrderCreated: true,
      emailPaymentApproved: true,
      emailPaymentPending: true,
      emailPaymentFailed: true,
      emailOrderShipped: true,
      emailOrderCancelled: true,
      emailPaymentRefunded: true,
      emailOrderDelivered: true,
      emailAbandonedCart: true,
      emailStockCritical: true,
    },
  });

  if (!settings) return [];

  const map: Record<string, string> = {
    emailOrderCreated: "ORDER_CREATED",
    emailPaymentApproved: "PAYMENT_APPROVED",
    emailPaymentPending: "PAYMENT_PENDING",
    emailPaymentFailed: "PAYMENT_FAILED",
    emailOrderShipped: "ORDER_SHIPPED",
    emailOrderCancelled: "ORDER_CANCELLED",
    emailPaymentRefunded: "PAYMENT_REFUNDED",
    emailOrderDelivered: "ORDER_DELIVERED",
    emailAbandonedCart: "ABANDONED_CART",
    emailStockCritical: "STOCK_CRITICAL",
  };

  return Object.entries(map).map(([col, event]) => ({
    event,
    enabled: (settings as Record<string, unknown>)[col] !== false,
  }));
}
