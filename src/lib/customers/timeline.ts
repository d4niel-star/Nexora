import { prisma } from "@/lib/db/prisma";

// ─── Customer Unified Timeline (Phase 7C.1) ──────────────────────────
// Merges every event we have for a (storeId, email) into a single
// chronological feed. Sources:
//   • Order — placed/cancelled/refunded/delivered
//   • EmailLog — sent communications
//   • Cart — abandoned (transition timestamp)
//   • SystemEvent — explicit notes/tasks/automation events that ref the email
//
// Bounded: each source caps at 100 rows, merged then top-100 returned.
// All emails are matched case-insensitively.

export type TimelineEntryType =
  | "order_placed"
  | "order_cancelled"
  | "order_delivered"
  | "order_refunded"
  | "email_sent"
  | "email_failed"
  | "cart_abandoned"
  | "note_added"
  | "task_created"
  | "task_completed"
  | "system_event";

export interface TimelineEntry {
  id: string;
  type: TimelineEntryType;
  occurredAt: string;
  title: string;
  description: string | null;
  href: string | null;
  metadata?: Record<string, unknown>;
}

const PER_SOURCE_LIMIT = 100;
const FINAL_LIMIT = 150;

export async function getCustomerTimeline(
  storeId: string,
  rawEmail: string,
): Promise<TimelineEntry[]> {
  const email = rawEmail.trim().toLowerCase();
  if (!email) return [];

  const [orders, emails, carts, notes] = await Promise.all([
    prisma.order.findMany({
      where: { storeId, email: { equals: email, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      take: PER_SOURCE_LIMIT,
      select: {
        id: true, orderNumber: true, total: true, currency: true,
        status: true, cancelledAt: true, refundedAt: true,
        deliveredAt: true, createdAt: true, refundAmount: true,
      },
    }),
    prisma.emailLog.findMany({
      where: { storeId, recipient: { equals: email, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      take: PER_SOURCE_LIMIT,
      select: {
        id: true, eventType: true, status: true, createdAt: true,
        sentAt: true, errorMessage: true,
      },
    }).catch(() => []),
    prisma.cart.findMany({
      where: {
        storeId,
        status: "abandoned",
        checkouts: { some: { email: { equals: email, mode: "insensitive" } } },
      },
      orderBy: { updatedAt: "desc" },
      take: PER_SOURCE_LIMIT,
      select: { id: true, updatedAt: true },
    }).catch(() => []),
    prisma.customerNote.findMany({
      where: { storeId, customerEmail: email },
      orderBy: { createdAt: "desc" },
      take: PER_SOURCE_LIMIT,
      select: { id: true, body: true, authorRole: true, createdAt: true },
    }).catch(() => []),
  ]);

  const entries: TimelineEntry[] = [];

  for (const o of orders) {
    const orderHref = `/admin/orders/${o.id}`;
    entries.push({
      id: `order:${o.id}:placed`,
      type: "order_placed",
      occurredAt: o.createdAt.toISOString(),
      title: `Pedido ${o.orderNumber} creado`,
      description: `${o.currency} ${o.total.toFixed(2)}`,
      href: orderHref,
    });
    if (o.deliveredAt) {
      entries.push({
        id: `order:${o.id}:delivered`,
        type: "order_delivered",
        occurredAt: o.deliveredAt.toISOString(),
        title: `Pedido ${o.orderNumber} entregado`,
        description: null,
        href: orderHref,
      });
    }
    if (o.cancelledAt) {
      entries.push({
        id: `order:${o.id}:cancelled`,
        type: "order_cancelled",
        occurredAt: o.cancelledAt.toISOString(),
        title: `Pedido ${o.orderNumber} cancelado`,
        description: null,
        href: orderHref,
      });
    }
    if (o.refundedAt && o.refundAmount && o.refundAmount > 0) {
      entries.push({
        id: `order:${o.id}:refunded`,
        type: "order_refunded",
        occurredAt: o.refundedAt.toISOString(),
        title: `Reembolso ${o.orderNumber}`,
        description: `${o.currency} ${o.refundAmount.toFixed(2)}`,
        href: orderHref,
      });
    }
  }

  for (const e of emails) {
    const isFailed = e.status === "failed";
    entries.push({
      id: `email:${e.id}`,
      type: isFailed ? "email_failed" : "email_sent",
      occurredAt: (e.sentAt ?? e.createdAt).toISOString(),
      title: isFailed ? `Email fallido: ${e.eventType}` : `Email enviado: ${e.eventType}`,
      description: isFailed ? (e.errorMessage ?? null) : null,
      href: null,
    });
  }

  for (const c of carts) {
    entries.push({
      id: `cart:${c.id}`,
      type: "cart_abandoned",
      occurredAt: c.updatedAt.toISOString(),
      title: "Carrito abandonado",
      description: null,
      href: null,
    });
  }

  for (const n of notes) {
    entries.push({
      id: `note:${n.id}`,
      type: "note_added",
      occurredAt: n.createdAt.toISOString(),
      title: `Nota interna · ${n.authorRole}`,
      description: n.body.length > 140 ? n.body.slice(0, 140) + "…" : n.body,
      href: null,
    });
  }

  entries.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return entries.slice(0, FINAL_LIMIT);
}
