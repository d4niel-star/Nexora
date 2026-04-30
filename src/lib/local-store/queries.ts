// ─── Local físico · server queries ────────────────────────────────────
//
// Read-only data access for the /admin/store/local route. Every entry
// point requires an authenticated session and returns store-scoped
// data. Heavy work (full inventory) is intentionally paginated/limited
// to avoid hot-loop scans on stores with thousands of variants.

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import { buildPickupWhatsAppLink } from "./whatsapp";
import type {
  CashMovementRow,
  CashSessionSummary,
  DailyOperationalSummary,
  InStoreSaleRow,
  LocalStockRow,
  LocationDayHours,
  LocationProfile,
  PickupOrderRow,
} from "./types";

// ─── Internal helpers ────────────────────────────────────────────────

function startOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function compareTime(a: string | null, b: string | null): number {
  if (!a || !b) return 0;
  return a.localeCompare(b);
}

// Computes "open now" from the configured weekday hours using the
// merchant's local time as if it matched the server's local timezone.
// MVP assumption: merchant operates in the same TZ as the server. A
// future enhancement would store a Store-level timezone and convert.
function computeOpenStatus(hours: LocationDayHours[]): {
  isOpenNow: boolean;
  openCloseLabel: string;
} {
  const now = new Date();
  const weekday = now.getDay(); // 0..6
  const todayHours = hours.find((h) => h.weekday === weekday);
  const hh = pad2(now.getHours());
  const mm = pad2(now.getMinutes());
  const nowStr = `${hh}:${mm}`;

  if (todayHours?.isOpen && todayHours.openTime && todayHours.closeTime) {
    if (compareTime(nowStr, todayHours.openTime) >= 0 && compareTime(nowStr, todayHours.closeTime) < 0) {
      return {
        isOpenNow: true,
        openCloseLabel: `Abierto · cierra ${todayHours.closeTime}`,
      };
    }
    if (compareTime(nowStr, todayHours.openTime) < 0) {
      return {
        isOpenNow: false,
        openCloseLabel: `Cerrado · abre hoy ${todayHours.openTime}`,
      };
    }
  }

  // Find the next open day (skip up to 7 days)
  for (let i = 1; i <= 7; i++) {
    const next = (weekday + i) % 7;
    const nextHours = hours.find((h) => h.weekday === next);
    if (nextHours?.isOpen && nextHours.openTime) {
      const labels = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
      const label = i === 1 ? "mañana" : labels[next];
      return {
        isOpenNow: false,
        openCloseLabel: `Cerrado · abre ${label} ${nextHours.openTime}`,
      };
    }
  }

  return {
    isOpenNow: false,
    openCloseLabel: "Cerrado · sin horarios configurados",
  };
}

function defaultHours(): LocationDayHours[] {
  // Mon–Fri 09–18, Sat 10–14, Sun closed by default. Just placeholders
  // for first-load — the merchant edits them at will.
  const out: LocationDayHours[] = [];
  for (let i = 0; i < 7; i++) {
    if (i === 0) {
      out.push({ weekday: 0, isOpen: false, openTime: null, closeTime: null });
    } else if (i === 6) {
      out.push({ weekday: 6, isOpen: true, openTime: "10:00", closeTime: "14:00" });
    } else {
      out.push({ weekday: i, isOpen: true, openTime: "09:00", closeTime: "18:00" });
    }
  }
  return out;
}

// ─── Public API ──────────────────────────────────────────────────────

// Returns the merchant's location profile, creating a blank row if
// none exists. This makes the admin UI work on first visit without
// the merchant having to seed anything.
export async function getOrCreateLocationProfile(): Promise<LocationProfile | null> {
  const store = await getCurrentStore();
  if (!store) return null;

  let location = await prisma.storeLocation.findUnique({
    where: { storeId: store.id },
    include: { hours: { orderBy: { weekday: "asc" } } },
  });

  if (!location) {
    location = await prisma.storeLocation.create({
      data: {
        storeId: store.id,
        name: store.name,
        country: "AR",
        hours: {
          create: defaultHours().map((h) => ({
            weekday: h.weekday,
            isOpen: h.isOpen,
            openTime: h.openTime,
            closeTime: h.closeTime,
          })),
        },
      },
      include: { hours: { orderBy: { weekday: "asc" } } },
    });
  }

  // Make sure all 7 weekdays exist (in case of partial seed)
  if (location.hours.length < 7) {
    const existing = new Set(location.hours.map((h) => h.weekday));
    const missing = defaultHours().filter((h) => !existing.has(h.weekday));
    if (missing.length > 0) {
      await prisma.storeLocationHours.createMany({
        data: missing.map((h) => ({
          locationId: location!.id,
          weekday: h.weekday,
          isOpen: h.isOpen,
          openTime: h.openTime,
          closeTime: h.closeTime,
        })),
      });
      location = await prisma.storeLocation.findUnique({
        where: { storeId: store.id },
        include: { hours: { orderBy: { weekday: "asc" } } },
      });
    }
  }

  if (!location) return null;

  const hours: LocationDayHours[] = location.hours
    .map((h) => ({
      weekday: h.weekday,
      isOpen: h.isOpen,
      openTime: h.openTime,
      closeTime: h.closeTime,
    }))
    .sort((a, b) => a.weekday - b.weekday);

  const status = computeOpenStatus(hours);

  return {
    id: location.id,
    name: location.name,
    addressLine: location.addressLine,
    city: location.city,
    province: location.province,
    country: location.country,
    postalCode: location.postalCode,
    phone: location.phone,
    email: location.email,
    googleMapsUrl: location.googleMapsUrl,

    pickupEnabled: location.pickupEnabled,
    pickupInstructions: location.pickupInstructions,
    pickupPreparationMinutes: location.pickupPreparationMinutes,
    pickupWindow: location.pickupWindow,

    hours,

    isOpenNow: status.isOpenNow,
    openCloseLabel: status.openCloseLabel,
  };
}

// Returns local-stock rows for every variant of every product the store
// has. Variants without a LocalInventory row are surfaced with stock=0
// so the merchant can adjust them — we do NOT auto-create thousands of
// rows on first load.
export async function getLocalStockRows(opts?: {
  search?: string;
  onlyLow?: boolean;
}): Promise<LocalStockRow[]> {
  const store = await getCurrentStore();
  if (!store) return [];

  const location = await prisma.storeLocation.findUnique({
    where: { storeId: store.id },
    select: { id: true },
  });
  if (!location) return [];

  const search = (opts?.search ?? "").trim().toLowerCase();

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    select: {
      id: true,
      title: true,
      images: { take: 1, orderBy: { sortOrder: "asc" } },
      variants: {
        select: {
          id: true,
          title: true,
          sku: true,
          price: true,
          stock: true,
          localInventories: {
            where: { locationId: location.id },
            select: { stock: true, lowStockThreshold: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 500, // hard cap; pagination is a follow-up
  });

  const rows: LocalStockRow[] = [];
  for (const p of products) {
    if (search && !p.title.toLowerCase().includes(search)) continue;
    const imageUrl = p.images[0]?.url ?? null;
    for (const v of p.variants) {
      const inv = v.localInventories[0];
      const localStock = inv?.stock ?? 0;
      const threshold = inv?.lowStockThreshold ?? 2;
      let status: LocalStockRow["status"] = "ok";
      if (localStock <= 0) status = "out_of_stock";
      else if (localStock <= threshold) status = "low_stock";
      if (opts?.onlyLow && status === "ok") continue;
      rows.push({
        variantId: v.id,
        productId: p.id,
        productTitle: p.title,
        variantTitle: v.title,
        sku: v.sku,
        imageUrl,
        unitPrice: v.price,
        onlineStock: v.stock,
        localStock,
        lowStockThreshold: threshold,
        status,
      });
    }
  }
  return rows;
}

// Resolves the active (open) cash session for the store, with all
// aggregations needed by the Caja UI. Returns null if no open session.
export async function getOpenCashSession(): Promise<CashSessionSummary | null> {
  const store = await getCurrentStore();
  if (!store) return null;

  const session = await prisma.cashRegisterSession.findFirst({
    where: { storeId: store.id, status: "open" },
    orderBy: { openedAt: "desc" },
    include: {
      sales: { select: { paymentMethod: true, total: true } },
      movements: { select: { type: true, amount: true } },
    },
  });
  if (!session) return null;

  return summarizeSession(session);
}

export async function getCashSessionById(id: string): Promise<CashSessionSummary | null> {
  const store = await getCurrentStore();
  if (!store) return null;
  const session = await prisma.cashRegisterSession.findFirst({
    where: { id, storeId: store.id },
    include: {
      sales: { select: { paymentMethod: true, total: true } },
      movements: { select: { type: true, amount: true } },
    },
  });
  if (!session) return null;
  return summarizeSession(session);
}

type RawSession = NonNullable<Awaited<ReturnType<typeof prisma.cashRegisterSession.findFirst>>> & {
  sales: { paymentMethod: string; total: number }[];
  movements: { type: string; amount: number }[];
};

function summarizeSession(session: RawSession): CashSessionSummary {
  let cashSalesTotal = 0;
  let cardSalesTotal = 0;
  let transferSalesTotal = 0;
  let otherSalesTotal = 0;
  let totalSales = 0;
  let totalExpenses = 0;

  for (const s of session.sales) {
    totalSales += s.total;
    if (s.paymentMethod === "cash") cashSalesTotal += s.total;
    else if (s.paymentMethod === "card") cardSalesTotal += s.total;
    else if (s.paymentMethod === "transfer") transferSalesTotal += s.total;
    else otherSalesTotal += s.total;
  }
  for (const m of session.movements) {
    if (m.type === "expense") totalExpenses += m.amount;
  }

  return {
    id: session.id,
    status: session.status as "open" | "closed",
    openedAt: session.openedAt.toISOString(),
    closedAt: session.closedAt ? session.closedAt.toISOString() : null,
    openingCash: session.openingCash,
    expectedCash: session.expectedCash,
    countedCash: session.countedCash,
    difference: session.difference,
    notes: session.notes,

    cashSalesTotal,
    cardSalesTotal,
    transferSalesTotal,
    otherSalesTotal,
    totalSales,
    totalSalesCount: session.sales.length,
    totalExpenses,
  };
}

export async function getCashSessionMovements(sessionId: string): Promise<CashMovementRow[]> {
  const store = await getCurrentStore();
  if (!store) return [];
  const movs = await prisma.cashMovement.findMany({
    where: { storeId: store.id, cashSessionId: sessionId },
    orderBy: { createdAt: "desc" },
  });
  return movs.map((m) => ({
    id: m.id,
    type: m.type,
    amount: m.amount,
    reason: m.reason,
    createdAt: m.createdAt.toISOString(),
  }));
}

export async function getCashSessionSales(sessionId: string): Promise<InStoreSaleRow[]> {
  const store = await getCurrentStore();
  if (!store) return [];
  const sales = await prisma.inStoreSale.findMany({
    where: { storeId: store.id, cashSessionId: sessionId },
    orderBy: { createdAt: "desc" },
    include: { items: { select: { id: true } } },
  });
  return sales.map((s) => ({
    id: s.id,
    saleNumber: s.saleNumber,
    total: s.total,
    paymentMethod: s.paymentMethod,
    itemCount: s.items.length,
    customerName: s.customerName,
    createdAt: s.createdAt.toISOString(),
  }));
}

// Returns the operational summary cards shown in the header of
// /admin/store/local. Pulls data from sales, cash and orders in
// parallel to keep first-paint snappy.
export async function getDailyOperationalSummary(): Promise<DailyOperationalSummary> {
  const store = await getCurrentStore();
  if (!store) {
    return {
      salesCountToday: 0,
      salesTotalToday: 0,
      hasOpenCashSession: false,
      cashSessionId: null,
      pendingPickupOrders: 0,
      localLowStockCount: 0,
      localOutOfStockCount: 0,
    };
  }

  const today = startOfDayUTC(new Date());

  const [todaySales, openSession, pickupOrdersCount, lowStock, outOfStock] = await Promise.all([
    prisma.inStoreSale.aggregate({
      where: { storeId: store.id, createdAt: { gte: today } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.cashRegisterSession.findFirst({
      where: { storeId: store.id, status: "open" },
      select: { id: true },
    }),
    countPendingPickupOrders(store.id),
    prisma.localInventory.count({
      where: {
        storeId: store.id,
        AND: [
          { stock: { gt: 0 } },
          { stock: { lte: 2 } },
        ],
      },
    }),
    prisma.localInventory.count({
      where: { storeId: store.id, stock: { lte: 0 } },
    }),
  ]);

  return {
    salesCountToday: todaySales._count?._all ?? 0,
    salesTotalToday: todaySales._sum?.total ?? 0,
    hasOpenCashSession: Boolean(openSession),
    cashSessionId: openSession?.id ?? null,
    pendingPickupOrders: pickupOrdersCount,
    localLowStockCount: lowStock,
    localOutOfStockCount: outOfStock,
  };
}

async function countPendingPickupOrders(storeId: string): Promise<number> {
  // Pickup is wired through ShippingMethod(type="pickup") rows. We
  // count Orders whose shippingMethodId matches one of these and
  // that are not yet delivered or cancelled.
  const pickupMethods = await prisma.shippingMethod.findMany({
    where: { storeId, type: "pickup" },
    select: { id: true },
  });
  if (pickupMethods.length === 0) return 0;
  const ids = pickupMethods.map((m) => m.id);
  return prisma.order.count({
    where: {
      storeId,
      shippingMethodId: { in: ids },
      shippingStatus: { notIn: ["delivered"] },
      cancelledAt: null,
    },
  });
}

export async function listPendingPickupOrders(): Promise<PickupOrderRow[]> {
  const store = await getCurrentStore();
  if (!store) return [];
  const pickupMethods = await prisma.shippingMethod.findMany({
    where: { storeId: store.id, type: "pickup" },
    select: { id: true },
  });
  if (pickupMethods.length === 0) return [];
  const orders = await prisma.order.findMany({
    where: {
      storeId: store.id,
      shippingMethodId: { in: pickupMethods.map((m) => m.id) },
      shippingStatus: { notIn: ["delivered"] },
      cancelledAt: null,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      items: { select: { quantity: true } },
    },
  });
  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);

  // ── Notification state lookup ────────────────────────────────────
  // We pull the EmailLog (PICKUP_READY) and the latest WhatsApp-opened
  // SystemEvent in parallel so the merchant can see at a glance which
  // orders have already been notified through which channel.
  // EmailLog is 1:1 by (eventType, entityType, entityId) thanks to its
  // unique constraint, so a single findMany suffices.
  // SystemEvent has no such uniqueness, so we keep only the most recent
  // entry per orderId via groupBy(_max).
  const [emailLogs, whatsappEvents, location] = await Promise.all([
    prisma.emailLog.findMany({
      where: {
        storeId: store.id,
        eventType: "PICKUP_READY",
        entityType: "order",
        entityId: { in: orderIds },
        status: "sent",
      },
      select: { entityId: true, sentAt: true, recipient: true },
    }),
    prisma.systemEvent.groupBy({
      by: ["entityId"],
      where: {
        storeId: store.id,
        entityType: "order",
        entityId: { in: orderIds },
        eventType: "pickup_ready_whatsapp_opened",
      },
      _max: { createdAt: true },
    }),
    // Public pickup context (used to pre-build the wa.me deep link).
    // Only the public-facing fields are read here; cash/stock data are
    // never exposed to the storefront-bound WhatsApp message.
    prisma.storeLocation.findUnique({
      where: { storeId: store.id },
      select: {
        name: true,
        addressLine: true,
        city: true,
        province: true,
        pickupInstructions: true,
        googleMapsUrl: true,
        hours: {
          select: {
            weekday: true,
            isOpen: true,
            openTime: true,
            closeTime: true,
          },
        },
      },
    }),
  ]);

  const emailByOrder = new Map(
    emailLogs.map((l) => [l.entityId, l] as const),
  );
  const whatsappByOrder = new Map(
    whatsappEvents.map((e) => [e.entityId as string, e._max.createdAt] as const),
  );

  // Compose the public WhatsApp context once. Per-order links share
  // the same local data; only the customer phone, name and order
  // number vary, so we let `buildPickupWhatsAppLink` finish the job.
  const localName = location?.name || store.name;
  const address = [location?.addressLine, location?.city, location?.province]
    .filter(Boolean)
    .join(", ") || null;
  const hoursSummary = summarizePickupHoursForMessage(location?.hours ?? []);

  return orders.map((o) => {
    const emailLog = emailByOrder.get(o.id);
    const whatsappAt = whatsappByOrder.get(o.id) ?? null;

    const customerName = `${o.firstName} ${o.lastName}`.trim() || "Cliente sin nombre";
    const wa = buildPickupWhatsAppLink({
      customerName: customerName === "Cliente sin nombre" ? null : customerName,
      customerPhone: o.phone,
      orderNumber: o.orderNumber,
      localName,
      address,
      hoursSummary,
      instructions: location?.pickupInstructions ?? null,
      googleMapsUrl: location?.googleMapsUrl ?? null,
    });

    return {
      id: o.id,
      orderNumber: o.orderNumber,
      customerName,
      customerEmail: o.email,
      customerPhone: o.phone,
      total: o.total,
      itemCount: o.items.reduce((acc, it) => acc + it.quantity, 0),
      paymentStatus: o.paymentStatus,
      shippingStatus: o.shippingStatus,
      createdAt: o.createdAt.toISOString(),
      pickupReadyEmailSentAt: emailLog?.sentAt ? emailLog.sentAt.toISOString() : null,
      pickupReadyEmailRecipient: emailLog?.recipient ?? null,
      pickupReadyWhatsAppOpenedAt: whatsappAt ? whatsappAt.toISOString() : null,
      whatsappLink: wa.available ? wa.url : null,
    };
  });
}

// Tiny helper used by the pickup-list query so the WhatsApp message
// composes a one-line schedule. Mirrors the email summarizer in
// `actions.ts` to keep the content consistent across channels.
function summarizePickupHoursForMessage(
  rows: Array<{ weekday: number; isOpen: boolean; openTime: string | null; closeTime: string | null }>,
): string | null {
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
  return segments.length ? segments.join(" · ") : null;
}

// Catalogue lookup for the in-store sale builder. Returns variants
// matching `query`, with their local stock (defaults to 0). Limits to
// 30 results to keep typing latency low.
export async function searchVariantsForSale(query: string): Promise<{
  variantId: string;
  productId: string;
  productTitle: string;
  variantTitle: string;
  sku: string | null;
  unitPrice: number;
  imageUrl: string | null;
  localStock: number;
}[]> {
  const store = await getCurrentStore();
  if (!store) return [];
  const term = query.trim();
  if (term.length < 1) return [];

  const location = await prisma.storeLocation.findUnique({
    where: { storeId: store.id },
    select: { id: true },
  });
  if (!location) return [];

  const products = await prisma.product.findMany({
    where: {
      storeId: store.id,
      OR: [
        { title: { contains: term, mode: "insensitive" } },
        { variants: { some: { sku: { contains: term, mode: "insensitive" } } } },
      ],
    },
    select: {
      id: true,
      title: true,
      images: { take: 1, orderBy: { sortOrder: "asc" } },
      variants: {
        select: {
          id: true,
          title: true,
          sku: true,
          price: true,
          localInventories: {
            where: { locationId: location.id },
            select: { stock: true },
            take: 1,
          },
        },
      },
    },
    take: 15,
  });

  const out: Awaited<ReturnType<typeof searchVariantsForSale>> = [];
  for (const p of products) {
    const imageUrl = p.images[0]?.url ?? null;
    for (const v of p.variants) {
      out.push({
        variantId: v.id,
        productId: p.id,
        productTitle: p.title,
        variantTitle: v.title,
        sku: v.sku,
        unitPrice: v.price,
        imageUrl,
        localStock: v.localInventories[0]?.stock ?? 0,
      });
      if (out.length >= 30) return out;
    }
  }
  return out;
}
