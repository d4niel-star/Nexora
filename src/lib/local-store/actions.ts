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
