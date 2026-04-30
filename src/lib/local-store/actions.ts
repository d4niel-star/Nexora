"use server";

// ─── Local físico · server actions ────────────────────────────────────
//
// Mutating server actions for the /admin/store/local route. Every
// action requires an authenticated session (`getCurrentStore`) and
// scopes its writes to that store. Multi-tenant isolation is enforced
// by including `storeId` in every WHERE clause that touches another
// row, even when the row is reachable transitively through a relation.

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore, getCurrentUser } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { logSystemEvent } from "@/lib/observability/audit";
import { sendEmailEvent } from "@/lib/email/events";
import {
  getCashSessionById as getCashSessionByIdQuery,
  getCashSessionMovements as getCashSessionMovementsQuery,
  getCashSessionSales as getCashSessionSalesQuery,
  searchVariantsForSale,
} from "./queries";
import type { ActionResult } from "./types";

// ─── Read actions exposed to client components ────────────────────────
//
// queries.ts holds read-only data access; client components cannot
// import server-only modules directly, so we surface the pieces they
// need as thin server-action wrappers. Every wrapper still goes through
// the underlying query, which already validates the authenticated
// store.
export async function searchVariantsForSaleAction(query: string) {
  return searchVariantsForSale(query);
}
export async function getCashSessionMovementsAction(sessionId: string) {
  return getCashSessionMovementsQuery(sessionId);
}
export async function getCashSessionSalesAction(sessionId: string) {
  return getCashSessionSalesQuery(sessionId);
}
export async function getCashSessionByIdAction(sessionId: string) {
  return getCashSessionByIdQuery(sessionId);
}

const ROUTE = "/admin/store/local";

// ─── Helpers ─────────────────────────────────────────────────────────

// Returns either an error message or the resolved store + its location.
// We use a tagged union so callers narrow with `if (!ctx.ok)` and TS
// keeps `ctx.store` / `ctx.location` strongly typed in the happy path
// without needing non-null assertions.
type LocationContext =
  | { ok: false; error: string }
  | {
      ok: true;
      store: { id: string; name: string };
      location: { id: string; storeId: string; pickupEnabled: boolean };
    };

async function requireStoreAndLocation(): Promise<LocationContext> {
  const store = await getCurrentStore();
  if (!store) return { ok: false, error: "Sesión inválida" };
  const location = await prisma.storeLocation.findUnique({
    where: { storeId: store.id },
    select: { id: true, storeId: true, pickupEnabled: true },
  });
  if (!location) {
    return { ok: false, error: "El local físico no está configurado" };
  }
  return { ok: true, store: { id: store.id, name: store.name }, location };
}

// ─── Perfil & horarios ───────────────────────────────────────────────

export interface SaveProfileInput {
  name: string;
  addressLine?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  googleMapsUrl?: string | null;
  hours: {
    weekday: number;
    isOpen: boolean;
    openTime: string | null;
    closeTime: string | null;
  }[];
}

export async function saveLocationProfile(input: SaveProfileInput): Promise<ActionResult> {
  const ctx = await requireStoreAndLocation();
  if (!ctx.ok) return { success: false, error: ctx.error };

  if (!input.name || input.name.trim().length < 2) {
    return { success: false, error: "El nombre del local es obligatorio (mínimo 2 caracteres)" };
  }

  for (const h of input.hours) {
    if (h.isOpen && (!h.openTime || !h.closeTime)) {
      return { success: false, error: `Falta horario de apertura/cierre para el día ${h.weekday}` };
    }
    if (h.isOpen && h.openTime && h.closeTime && h.openTime >= h.closeTime) {
      return { success: false, error: `Horario inválido (apertura ≥ cierre) para el día ${h.weekday}` };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.storeLocation.update({
      where: { id: ctx.location.id },
      data: {
        name: input.name.trim(),
        addressLine: input.addressLine?.trim() || null,
        city: input.city?.trim() || null,
        province: input.province?.trim() || null,
        country: input.country?.trim() || null,
        postalCode: input.postalCode?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        googleMapsUrl: input.googleMapsUrl?.trim() || null,
      },
    });
    for (const h of input.hours) {
      await tx.storeLocationHours.upsert({
        where: { locationId_weekday: { locationId: ctx.location.id, weekday: h.weekday } },
        update: {
          isOpen: h.isOpen,
          openTime: h.isOpen ? h.openTime : null,
          closeTime: h.isOpen ? h.closeTime : null,
        },
        create: {
          locationId: ctx.location.id,
          weekday: h.weekday,
          isOpen: h.isOpen,
          openTime: h.isOpen ? h.openTime : null,
          closeTime: h.isOpen ? h.closeTime : null,
        },
      });
    }
  });

  await logSystemEvent({
    storeId: ctx.store.id,
    entityType: "store_location",
    entityId: ctx.location.id,
    eventType: "profile_updated",
    severity: "info",
    source: "admin_panel",
    message: `Perfil del local físico actualizado: ${input.name.trim()}`,
  });
  revalidatePath(ROUTE);
  return { success: true };
}

// ─── Retiro en tienda ────────────────────────────────────────────────

export interface SavePickupInput {
  pickupEnabled: boolean;
  pickupInstructions?: string | null;
  pickupPreparationMinutes?: number | null;
  pickupWindow?: string | null;
}

export async function savePickupSettings(input: SavePickupInput): Promise<ActionResult> {
  const ctx = await requireStoreAndLocation();
  if (!ctx.ok) return { success: false, error: ctx.error };

  if (
    input.pickupPreparationMinutes !== null &&
    input.pickupPreparationMinutes !== undefined &&
    (input.pickupPreparationMinutes < 0 || input.pickupPreparationMinutes > 10080)
  ) {
    return { success: false, error: "Tiempo de preparación inválido" };
  }

  await prisma.storeLocation.update({
    where: { id: ctx.location.id },
    data: {
      pickupEnabled: input.pickupEnabled,
      pickupInstructions: input.pickupInstructions?.trim() || null,
      pickupPreparationMinutes:
        input.pickupPreparationMinutes === undefined ? null : input.pickupPreparationMinutes,
      pickupWindow: input.pickupWindow?.trim() || null,
    },
  });

  // Mirror the pickup toggle into a real ShippingMethod row so the
  // public storefront can offer it through the existing shipping
  // pipeline (cart → draft → order → admin pickup queries) without a
  // schema change. We upsert by (storeId, code="pickup_local") so the
  // row stays stable across toggles and never duplicates. We never
  // hard-delete it: orders already created with this method id need
  // it to remain resolvable.
  await prisma.shippingMethod.upsert({
    where: { storeId_code: { storeId: ctx.store.id, code: "pickup_local" } },
    create: {
      storeId: ctx.store.id,
      code: "pickup_local",
      name: "Retiro en local",
      type: "pickup",
      carrier: null,
      baseAmount: 0,
      estimatedDaysMin: 0,
      estimatedDaysMax: input.pickupPreparationMinutes
        ? Math.max(1, Math.ceil(input.pickupPreparationMinutes / (60 * 24)))
        : 1,
      isActive: input.pickupEnabled,
      isDefault: false,
      sortOrder: 100, // sorts after standard shipping methods
    },
    update: {
      isActive: input.pickupEnabled,
      // Keep the human-facing name fresh in case the merchant ever
      // edits it; for now the label is fixed but the mapping is here.
      name: "Retiro en local",
      type: "pickup",
      baseAmount: 0,
      carrier: null,
    },
  });

  await logSystemEvent({
    storeId: ctx.store.id,
    entityType: "store_location",
    entityId: ctx.location.id,
    eventType: input.pickupEnabled ? "pickup_enabled" : "pickup_disabled",
    severity: "info",
    source: "admin_panel",
    message: `Retiro en tienda ${input.pickupEnabled ? "activado" : "desactivado"}`,
  });
  revalidatePath(ROUTE);
  return { success: true };
}

// ─── Operaciones sobre pedidos pickup ────────────────────────────────
//
// Once a buyer has placed a pickup order, the merchant moves it
// through three operational states using `Order.shippingStatus`:
//   "unfulfilled" → preparando
//   "fulfilled"   → listo para retirar
//   "delivered"   → retirado (cliente vino a buscarlo)
//
// Each transition validates that the order belongs to the calling
// merchant *and* that the order's shipping method is genuinely a
// pickup row, so an attacker can't drive an unrelated shipping
// order's status through these endpoints.

async function loadOwnedPickupOrder(orderId: string) {
  const store = await getCurrentStore();
  if (!store) return { ok: false as const, error: "Sesión inválida" };

  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId: store.id },
    select: {
      id: true,
      orderNumber: true,
      storeId: true,
      shippingMethodId: true,
      shippingStatus: true,
      cancelledAt: true,
    },
  });
  if (!order) return { ok: false as const, error: "Pedido no encontrado" };
  if (order.cancelledAt) {
    return { ok: false as const, error: "El pedido está cancelado" };
  }
  if (!order.shippingMethodId) {
    return { ok: false as const, error: "El pedido no tiene método de retiro asignado" };
  }
  const method = await prisma.shippingMethod.findFirst({
    where: { id: order.shippingMethodId, storeId: store.id, type: "pickup" },
    select: { id: true },
  });
  if (!method) return { ok: false as const, error: "El pedido no es un pedido de retiro" };

  return { ok: true as const, store, order };
}

export async function markPickupReady(orderId: string): Promise<ActionResult> {
  const ctx = await loadOwnedPickupOrder(orderId);
  if (!ctx.ok) return { success: false, error: ctx.error };

  await prisma.order.update({
    where: { id: ctx.order.id },
    data: { shippingStatus: "fulfilled" },
  });
  await logSystemEvent({
    storeId: ctx.store.id,
    entityType: "order",
    entityId: ctx.order.id,
    eventType: "pickup_ready",
    severity: "info",
    source: "admin_panel",
    message: `Pedido ${ctx.order.orderNumber} marcado como listo para retirar`,
  });
  revalidatePath(ROUTE);
  revalidatePath("/admin/orders");
  return { success: true };
}

export async function markPickupCollected(orderId: string): Promise<ActionResult> {
  const ctx = await loadOwnedPickupOrder(orderId);
  if (!ctx.ok) return { success: false, error: ctx.error };

  await prisma.order.update({
    where: { id: ctx.order.id },
    data: {
      shippingStatus: "delivered",
      deliveredAt: new Date(),
    },
  });
  await logSystemEvent({
    storeId: ctx.store.id,
    entityType: "order",
    entityId: ctx.order.id,
    eventType: "pickup_collected",
    severity: "info",
    source: "admin_panel",
    message: `Pedido ${ctx.order.orderNumber} retirado por el cliente`,
  });
  revalidatePath(ROUTE);
  revalidatePath("/admin/orders");
  return { success: true };
}

export async function reopenPickup(orderId: string): Promise<ActionResult> {
  const ctx = await loadOwnedPickupOrder(orderId);
  if (!ctx.ok) return { success: false, error: ctx.error };

  await prisma.order.update({
    where: { id: ctx.order.id },
    data: {
      shippingStatus: "unfulfilled",
      deliveredAt: null,
    },
  });
  await logSystemEvent({
    storeId: ctx.store.id,
    entityType: "order",
    entityId: ctx.order.id,
    eventType: "pickup_reopened",
    severity: "info",
    source: "admin_panel",
    message: `Pedido ${ctx.order.orderNumber} reabierto en preparación`,
  });
  revalidatePath(ROUTE);
  revalidatePath("/admin/orders");
  return { success: true };
}

// ─── Notificaciones de pickup ready ──────────────────────────────────
//
// Once a pickup order is marked as "fulfilled" (listo para retirar),
// the merchant can notify the buyer through two channels:
//
//   1. EMAIL — fully transactional, goes through `sendEmailEvent`
//      (Resend in prod, Mock in dev). Idempotent thanks to the
//      `EmailLog @@unique([eventType, entityType, entityId])` index;
//      `force=true` lets the merchant deliberately resend by deleting
//      the previous log row and re-issuing the send.
//   2. WHATSAPP — there is NO WhatsApp Business API integration in
//      Nexora. The action returns a wa.me deep-link the client opens
//      in a new tab, and the audit trail is written via SystemEvent
//      so the UI can mark the order as "Notificado por WhatsApp"
//      without faking server-side delivery.
//
// Both actions reuse `loadOwnedPickupOrder` for multi-tenant + type
// validation, so they cannot be invoked against a non-pickup order
// or an order belonging to another store.

const PICKUP_READY_EVENT_TYPE = "PICKUP_READY";

export interface SendPickupReadyEmailResult {
  sent: boolean;
  alreadySent?: boolean;
  sentAt?: string;
  recipient?: string;
  reason?: "no_email" | "not_ready" | "provider_error" | "already_sent";
  error?: string;
}

export async function sendPickupReadyEmail(
  orderId: string,
  options: { force?: boolean } = {},
): Promise<{ success: true; data: SendPickupReadyEmailResult } | { success: false; error: string }> {
  const ctx = await loadOwnedPickupOrder(orderId);
  if (!ctx.ok) return { success: false, error: ctx.error };

  // The shipping status must be "fulfilled". Sending a "ready to pick
  // up" notification while the merchant is still preparing the order
  // would be misleading at best.
  if (ctx.order.shippingStatus !== "fulfilled") {
    return {
      success: true,
      data: {
        sent: false,
        reason: "not_ready",
        error: "Marcá el pedido como listo antes de notificar.",
      },
    };
  }

  // Pull the rest of the order fields we need for the email payload
  // separately so `loadOwnedPickupOrder` keeps its tight select.
  const orderDetail = await prisma.order.findUnique({
    where: { id: ctx.order.id },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      orderNumber: true,
      subtotal: true,
      shippingAmount: true,
      total: true,
      currency: true,
      shippingMethodLabel: true,
    },
  });
  if (!orderDetail || !orderDetail.email) {
    return {
      success: true,
      data: {
        sent: false,
        reason: "no_email",
        error: "Este pedido no tiene email del cliente.",
      },
    };
  }

  // Idempotency: if the merchant clicked Send a second time without
  // asking for `force`, just tell them it was already sent. The UI
  // can then show a "Reenviar" affordance that calls us with force.
  const existingLog = await prisma.emailLog.findUnique({
    where: {
      eventType_entityType_entityId: {
        eventType: PICKUP_READY_EVENT_TYPE,
        entityType: "order",
        entityId: ctx.order.id,
      },
    },
    select: { id: true, status: true, sentAt: true, recipient: true },
  });
  if (existingLog && existingLog.status === "sent" && !options.force) {
    return {
      success: true,
      data: {
        sent: false,
        alreadySent: true,
        reason: "already_sent",
        sentAt: existingLog.sentAt?.toISOString(),
        recipient: existingLog.recipient,
      },
    };
  }
  // When force is on, drop the previous row so `sendEmailEvent` can
  // upsert a fresh one and treat the resend as a brand-new attempt.
  if (existingLog && options.force) {
    await prisma.emailLog.delete({ where: { id: existingLog.id } });
  }

  // Public location info for the email body. Falls back gracefully
  // when the merchant has not filled some fields.
  const location = await prisma.storeLocation.findUnique({
    where: { storeId: ctx.store.id },
    include: { hours: true },
  });
  const localName = location?.name || ctx.store.name;
  const addressLine = [location?.addressLine, location?.city, location?.province]
    .filter(Boolean)
    .join(", ") || undefined;
  const hoursSummary = summarizeHoursForEmail(location?.hours ?? []);

  const customerName =
    `${orderDetail.firstName ?? ""} ${orderDetail.lastName ?? ""}`.trim() || "cliente";

  const sent = await sendEmailEvent({
    storeId: ctx.store.id,
    eventType: "PICKUP_READY",
    entityType: "order",
    entityId: ctx.order.id,
    recipient: orderDetail.email,
    data: {
      storeSlug: ctx.store.slug,
      storeName: ctx.store.name,
      customerName,
      orderNumber: orderDetail.orderNumber,
      orderId: ctx.order.id,
      subtotal: orderDetail.subtotal,
      shippingAmount: orderDetail.shippingAmount,
      total: orderDetail.total,
      currency: orderDetail.currency,
      shippingMethodLabel: orderDetail.shippingMethodLabel ?? undefined,
      pickupLocalName: localName,
      pickupAddress: addressLine,
      pickupHoursSummary: hoursSummary || undefined,
      pickupInstructions: location?.pickupInstructions ?? undefined,
      pickupGoogleMapsUrl: location?.googleMapsUrl ?? undefined,
      pickupPhone: location?.phone ?? undefined,
    },
  });

  if (!sent) {
    return {
      success: true,
      data: {
        sent: false,
        reason: "provider_error",
        error: "El proveedor de email no pudo entregar el mensaje. Probá de nuevo.",
      },
    };
  }

  await logSystemEvent({
    storeId: ctx.store.id,
    entityType: "order",
    entityId: ctx.order.id,
    eventType: options.force
      ? "pickup_ready_email_resent"
      : "pickup_ready_email_sent",
    severity: "info",
    source: "admin_panel",
    message: `Email de retiro listo enviado a ${orderDetail.email} para ${ctx.order.orderNumber}`,
    metadata: { recipient: orderDetail.email },
  });

  revalidatePath(ROUTE);

  return {
    success: true,
    data: {
      sent: true,
      recipient: orderDetail.email,
      sentAt: new Date().toISOString(),
    },
  };
}

// Logs the fact that the merchant clicked the WhatsApp affordance
// from the pickup tab. The link itself was generated in
// `getPickupNotificationContext` (which is what the UI displays); we
// just record that the merchant opened it so the row can show
// "Notificado por WhatsApp" and we have an audit trail.
export async function recordPickupWhatsAppOpened(orderId: string): Promise<ActionResult> {
  const ctx = await loadOwnedPickupOrder(orderId);
  if (!ctx.ok) return { success: false, error: ctx.error };
  if (ctx.order.shippingStatus !== "fulfilled") {
    return { success: false, error: "Marcá el pedido como listo antes de notificar." };
  }

  await logSystemEvent({
    storeId: ctx.store.id,
    entityType: "order",
    entityId: ctx.order.id,
    eventType: "pickup_ready_whatsapp_opened",
    severity: "info",
    source: "admin_panel",
    message: `Mensaje de WhatsApp abierto para ${ctx.order.orderNumber}`,
  });
  revalidatePath(ROUTE);
  return { success: true };
}

// Tiny helper used by `sendPickupReadyEmail` to render the merchant's
// hours config as a one-line summary suitable for email. Mirrors the
// summarizeHours used by the public storefront query.
function summarizeHoursForEmail(
  rows: Array<{ weekday: number; isOpen: boolean; openTime: string | null; closeTime: string | null }>,
): string {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const labels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const ordered = order.map((w) => rows.find((r) => r.weekday === w));
  const segments: string[] = [];
  let i = 0;
  while (i < ordered.length) {
    const cur = ordered[i];
    if (!cur || !cur.isOpen || !cur.openTime || !cur.closeTime) {
      i++;
      continue;
    }
    let j = i;
    while (
      j + 1 < ordered.length &&
      ordered[j + 1]?.isOpen &&
      ordered[j + 1]?.openTime === cur.openTime &&
      ordered[j + 1]?.closeTime === cur.closeTime
    ) {
      j++;
    }
    const start = labels[ordered[i]!.weekday];
    const end = labels[ordered[j]!.weekday];
    const range = i === j ? start : `${start} a ${end}`;
    segments.push(`${range} ${cur.openTime}-${cur.closeTime}`);
    i = j + 1;
  }
  return segments.join(" · ");
}

// ─── Stock local ─────────────────────────────────────────────────────
//
// Sets the stock of a variant at the merchant's local location. The
// merchant types the new absolute value; we don't increment by a delta
// because the operational primitive ("hay 8 unidades en el local") is
// almost always absolute counting, not arithmetic.

export async function setLocalStock(
  variantId: string,
  newStock: number,
  threshold?: number,
): Promise<ActionResult> {
  const ctx = await requireStoreAndLocation();
  if (!ctx.ok) return { success: false, error: ctx.error };

  if (!Number.isFinite(newStock) || newStock < 0 || newStock > 100000) {
    return { success: false, error: "Stock inválido" };
  }
  if (threshold !== undefined && (threshold < 0 || threshold > 1000)) {
    return { success: false, error: "Umbral de stock bajo inválido" };
  }

  // Verify the variant belongs to the store before writing — defends
  // against an attacker passing a variantId from another tenant.
  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, product: { storeId: ctx.store.id } },
    select: { id: true },
  });
  if (!variant) return { success: false, error: "Variante inválida" };

  await prisma.localInventory.upsert({
    where: {
      locationId_variantId: { locationId: ctx.location.id, variantId },
    },
    update: {
      stock: Math.floor(newStock),
      ...(threshold !== undefined ? { lowStockThreshold: Math.floor(threshold) } : {}),
    },
    create: {
      storeId: ctx.store.id,
      locationId: ctx.location.id,
      variantId,
      stock: Math.floor(newStock),
      lowStockThreshold: threshold ?? 2,
    },
  });

  await logSystemEvent({
    storeId: ctx.store.id,
    entityType: "local_inventory",
    entityId: variantId,
    eventType: "local_stock_set",
    severity: "info",
    source: "admin_panel",
    message: `Stock local fijado en ${Math.floor(newStock)}`,
  });
  revalidatePath(ROUTE);
  return { success: true };
}

// ─── Caja diaria ─────────────────────────────────────────────────────

export async function openCashSession(openingCash: number): Promise<ActionResult<{ sessionId: string }>> {
  const ctx = await requireStoreAndLocation();
  if (!ctx.ok) return { success: false, error: ctx.error };

  if (!Number.isFinite(openingCash) || openingCash < 0 || openingCash > 100_000_000) {
    return { success: false, error: "Efectivo inicial inválido" };
  }

  const existing = await prisma.cashRegisterSession.findFirst({
    where: { storeId: ctx.store.id, status: "open" },
    select: { id: true },
  });
  if (existing) {
    return { success: false, error: "Ya hay una caja abierta. Cerrala antes de abrir otra." };
  }

  const user = await getCurrentUser();

  const session = await prisma.cashRegisterSession.create({
    data: {
      storeId: ctx.store.id,
      locationId: ctx.location.id,
      openingCash,
      status: "open",
      openedById: user?.id ?? null,
    },
    select: { id: true },
  });

  await logSystemEvent({
    storeId: ctx.store.id,
    entityType: "cash_register",
    entityId: session.id,
    eventType: "session_opened",
    severity: "info",
    source: "admin_panel",
    message: `Caja abierta con ${openingCash} de efectivo inicial`,
  });
  revalidatePath(ROUTE);
  return { success: true, data: { sessionId: session.id } };
}

export async function registerCashExpense(
  sessionId: string,
  amount: number,
  reason: string,
): Promise<ActionResult> {
  const ctx = await requireStoreAndLocation();
  if (!ctx.ok) return { success: false, error: ctx.error };

  if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000_000) {
    return { success: false, error: "Monto inválido" };
  }
  if (!reason || reason.trim().length < 2) {
    return { success: false, error: "Indicá un motivo (mínimo 2 caracteres)" };
  }

  const session = await prisma.cashRegisterSession.findFirst({
    where: { id: sessionId, storeId: ctx.store.id },
    select: { status: true },
  });
  if (!session) return { success: false, error: "Caja no encontrada" };
  if (session.status !== "open") return { success: false, error: "La caja está cerrada" };

  const user = await getCurrentUser();

  await prisma.cashMovement.create({
    data: {
      storeId: ctx.store.id,
      cashSessionId: sessionId,
      type: "expense",
      amount,
      reason: reason.trim(),
      createdById: user?.id ?? null,
    },
  });

  await logSystemEvent({
    storeId: ctx.store.id,
    entityType: "cash_register",
    entityId: sessionId,
    eventType: "expense_registered",
    severity: "info",
    source: "admin_panel",
    message: `Egreso de ${amount} registrado: ${reason.trim()}`,
  });
  revalidatePath(ROUTE);
  return { success: true };
}

export async function closeCashSession(
  sessionId: string,
  countedCash: number,
  notes?: string | null,
): Promise<ActionResult<{ difference: number; expectedCash: number }>> {
  const ctx = await requireStoreAndLocation();
  if (!ctx.ok) return { success: false, error: ctx.error };

  if (!Number.isFinite(countedCash) || countedCash < 0 || countedCash > 100_000_000) {
    return { success: false, error: "Efectivo contado inválido" };
  }

  const session = await prisma.cashRegisterSession.findFirst({
    where: { id: sessionId, storeId: ctx.store.id },
    include: {
      sales: { select: { paymentMethod: true, total: true } },
      movements: { select: { type: true, amount: true } },
    },
  });
  if (!session) return { success: false, error: "Caja no encontrada" };
  if (session.status !== "open") return { success: false, error: "La caja ya está cerrada" };

  const cashSalesTotal = session.sales
    .filter((s) => s.paymentMethod === "cash")
    .reduce((acc, s) => acc + s.total, 0);
  const expensesTotal = session.movements
    .filter((m) => m.type === "expense")
    .reduce((acc, m) => acc + m.amount, 0);

  const expectedCash = session.openingCash + cashSalesTotal - expensesTotal;
  const difference = countedCash - expectedCash;

  const user = await getCurrentUser();

  await prisma.cashRegisterSession.update({
    where: { id: sessionId },
    data: {
      status: "closed",
      closedAt: new Date(),
      closedById: user?.id ?? null,
      expectedCash,
      countedCash,
      difference,
      notes: notes?.trim() || null,
    },
  });

  await logSystemEvent({
    storeId: ctx.store.id,
    entityType: "cash_register",
    entityId: sessionId,
    eventType: "session_closed",
    severity: Math.abs(difference) > 0.001 ? "warn" : "info",
    source: "admin_panel",
    message: `Caja cerrada · esperado ${expectedCash.toFixed(2)} · contado ${countedCash.toFixed(2)} · diferencia ${difference.toFixed(2)}`,
  });
  revalidatePath(ROUTE);
  return { success: true, data: { difference, expectedCash } };
}

// ─── Venta presencial ────────────────────────────────────────────────

export interface CreateSaleInput {
  items: { variantId: string; quantity: number }[];
  paymentMethod: "cash" | "card" | "transfer" | "other";
  paymentNote?: string | null;
  discountAmount?: number;
  customerName?: string | null;
  customerPhone?: string | null;
}

export async function createInStoreSale(
  input: CreateSaleInput,
): Promise<ActionResult<{ saleId: string; saleNumber: number; total: number }>> {
  const ctx = await requireStoreAndLocation();
  if (!ctx.ok) return { success: false, error: ctx.error };

  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { success: false, error: "Agregá al menos un producto a la venta" };
  }
  if (input.items.some((i) => !i.variantId || !Number.isFinite(i.quantity) || i.quantity <= 0)) {
    return { success: false, error: "Hay items con cantidad inválida" };
  }
  if (!["cash", "card", "transfer", "other"].includes(input.paymentMethod)) {
    return { success: false, error: "Método de pago inválido" };
  }

  const discountAmount = Math.max(0, input.discountAmount ?? 0);

  // Open session is required for cash sales (cash flow integrity).
  // For other methods we still attach to an open session if it exists,
  // but allow the sale to land without one.
  const openSession = await prisma.cashRegisterSession.findFirst({
    where: { storeId: ctx.store.id, status: "open" },
    select: { id: true },
  });
  if (input.paymentMethod === "cash" && !openSession) {
    return {
      success: false,
      error: "Para registrar una venta en efectivo, abrí la caja primero",
    };
  }

  // Validate every variant belongs to the store and pull current prices
  // and local stock. We do this in a single query with `in` for safety.
  const variantIds = input.items.map((i) => i.variantId);
  const variants = await prisma.productVariant.findMany({
    where: {
      id: { in: variantIds },
      product: { storeId: ctx.store.id },
    },
    select: {
      id: true,
      title: true,
      price: true,
      product: { select: { title: true } },
      localInventories: {
        where: { locationId: ctx.location.id },
        select: { stock: true },
        take: 1,
      },
    },
  });
  if (variants.length !== variantIds.length) {
    return { success: false, error: "Alguno de los productos no es válido" };
  }
  const byId = new Map(variants.map((v) => [v.id, v]));

  // Stock check at the local level only.
  for (const item of input.items) {
    const v = byId.get(item.variantId);
    if (!v) return { success: false, error: "Producto inválido" };
    const currentStock = v.localInventories[0]?.stock ?? 0;
    if (currentStock < item.quantity) {
      return {
        success: false,
        error: `Stock local insuficiente para "${v.product.title} · ${v.title}" (disponible ${currentStock}, pedido ${item.quantity})`,
      };
    }
  }

  // Compute totals
  let subtotal = 0;
  const lineSnapshots: { variantId: string; productTitle: string; variantTitle: string; unitPrice: number; quantity: number; lineTotal: number }[] = [];
  for (const item of input.items) {
    const v = byId.get(item.variantId)!;
    const lineTotal = v.price * item.quantity;
    subtotal += lineTotal;
    lineSnapshots.push({
      variantId: v.id,
      productTitle: v.product.title,
      variantTitle: v.title,
      unitPrice: v.price,
      quantity: item.quantity,
      lineTotal,
    });
  }
  const total = Math.max(0, subtotal - discountAmount);

  const user = await getCurrentUser();

  // All-or-nothing: sale + items + stock decrement happen atomically.
  // If any of these fails, none persists. We compute the sale number
  // inside the transaction to avoid races on concurrent submits.
  const result = await prisma.$transaction(async (tx) => {
    const lastSale = await tx.inStoreSale.findFirst({
      where: { storeId: ctx.store.id },
      orderBy: { saleNumber: "desc" },
      select: { saleNumber: true },
    });
    const saleNumber = (lastSale?.saleNumber ?? 0) + 1;

    const sale = await tx.inStoreSale.create({
      data: {
        storeId: ctx.store.id,
        locationId: ctx.location.id,
        cashSessionId: openSession?.id ?? null,
        saleNumber,
        subtotal,
        discountAmount,
        total,
        paymentMethod: input.paymentMethod,
        paymentNote: input.paymentNote?.trim() || null,
        customerName: input.customerName?.trim() || null,
        customerPhone: input.customerPhone?.trim() || null,
        createdById: user?.id ?? null,
        items: {
          create: lineSnapshots,
        },
      },
      select: { id: true, saleNumber: true, total: true },
    });

    // Decrement local stock per item.
    for (const item of input.items) {
      await tx.localInventory.update({
        where: {
          locationId_variantId: { locationId: ctx.location.id, variantId: item.variantId },
        },
        data: { stock: { decrement: item.quantity } },
      });
    }

    return sale;
  });

  await logSystemEvent({
    storeId: ctx.store.id,
    entityType: "in_store_sale",
    entityId: result.id,
    eventType: "sale_created",
    severity: "info",
    source: "admin_panel",
    message: `Venta presencial #${result.saleNumber} por ${result.total.toFixed(2)} (${input.paymentMethod})`,
  });
  revalidatePath(ROUTE);
  return {
    success: true,
    data: { saleId: result.id, saleNumber: result.saleNumber, total: result.total },
  };
}
