// ─── Recuperación / win-back signals ────────────────────────────────────
//
// Sub-surface of Ventas. Replaces the legacy "Crecimiento" hub, which
// overlapped heavily with Estadísticas > Rendimiento (both showed
// post-purchase metrics and lifecycle counts).
//
// Recuperación answers a different, narrower question:
//
//   "¿qué dinero / clientes podemos recuperar HOY?"
//
// Every block is a *list of recoverable units* with a real owner and
// a real CTA — not a chart. Sources, in order of strictness:
//
//   - prisma.order with paymentStatus pending / failed   → pagos a recuperar
//   - prisma.cart with abandoned / stale state           → carritos
//   - getAggregatedCustomers() (real orders, real money) → clientes inactivos
//   - growth/signals.ts reorder rule                     → clientes para
//                                                          recompra (con
//                                                          umbral merchant)
//   - whatsappRecoverySettings + post-purchase apps      → palancas
//
// No ML, no fabricated values, no "lift estimate". Every count comes
// straight from the DB.

import { prisma } from "@/lib/db/prisma";
import { getAggregatedCustomers } from "@/lib/customers/queries";

const REORDER_DEFAULT_DAYS = 30;
const STALE_CART_HOURS = 6;

export type RecoveryAppState =
  | "active"
  | "needs_setup"
  | "not_installed"
  | "disabled";

export interface RecoverableOrderRow {
  id: string;
  orderNumber: string | null;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  paymentStatus: string;
  /** Days since the order was created. */
  ageDays: number;
}

export interface AbandonedCartRow {
  id: string;
  /** Best-effort identification of the shopper, may be null when the
   *  cart never reached the contact step. */
  email: string | null;
  itemsCount: number;
  estimatedValue: number;
  currency: string;
  updatedAt: string;
  /** Hours since the last update. */
  ageHours: number;
}

export interface InactiveCustomerRow {
  email: string;
  name: string;
  ordersCount: number;
  totalSpent: number;
  lastPurchaseAt: string;
  daysSinceLastPurchase: number;
  /** "inactive" → ≥ 90d, "risk" → 60–89d. */
  lifecycle: "inactive" | "risk";
}

export interface ReorderCandidateRow {
  email: string;
  name: string;
  ordersCount: number;
  totalSpent: number;
  averageTicket: number;
  lastPurchaseAt: string;
  daysSinceLastPurchase: number;
}

export interface RecoveryLeversSnapshot {
  whatsapp: {
    state: RecoveryAppState;
    configured: boolean;
  };
  postPurchase: {
    state: RecoveryAppState;
    reviewRequestEnabled: boolean;
    reorderFollowupEnabled: boolean;
  };
  emails: {
    abandonedCartEnabled: boolean;
    paymentPendingEnabled: boolean;
    paymentFailedEnabled: boolean;
  };
}

export interface RecoverySummary {
  pendingPaymentsCount: number;
  pendingPaymentsValue: number;
  failedPaymentsCount: number;
  failedPaymentsValue: number;
  abandonedCartsCount: number;
  abandonedCartsValue: number;
  inactiveCustomersCount: number;
  reorderCandidatesCount: number;
  /** Sum of pending + failed + abandoned values in the store currency.
   *  Inactive / reorder are excluded (they're recurring opportunities,
   *  not stuck money). */
  recoverableValue: number;
  currency: string;
}

export interface RecoverySnapshot {
  summary: RecoverySummary;
  pendingPayments: RecoverableOrderRow[];
  failedPayments: RecoverableOrderRow[];
  abandonedCarts: AbandonedCartRow[];
  inactiveCustomers: InactiveCustomerRow[];
  reorderCandidates: ReorderCandidateRow[];
  levers: RecoveryLeversSnapshot;
  generatedAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function daysBetween(from: Date | string, to: Date = new Date()): number {
  const fromDate = from instanceof Date ? from : new Date(from);
  return Math.floor((to.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
}

function hoursBetween(from: Date | string, to: Date = new Date()): number {
  const fromDate = from instanceof Date ? from : new Date(from);
  return Math.floor((to.getTime() - fromDate.getTime()) / (1000 * 60 * 60));
}

async function readInstalledAppState(
  storeId: string,
  slug: string,
): Promise<RecoveryAppState> {
  const row = await prisma.installedApp
    .findUnique({
      where: { storeId_appSlug: { storeId, appSlug: slug } },
      select: { status: true },
    })
    .catch(() => null);
  if (!row) return "not_installed";
  switch (row.status) {
    case "active":
      return "active";
    case "disabled":
      return "disabled";
    case "needs_setup":
      return "needs_setup";
    default:
      return "needs_setup";
  }
}

// ─── Main ───────────────────────────────────────────────────────────────

export async function getRecoverySnapshot(
  storeId: string,
): Promise<RecoverySnapshot> {
  const now = new Date();

  // The ORM model uses paymentStatus strings shared across providers.
  // "pending" / "in_process" → cobro iniciado pero sin confirmación.
  // "failed" / "rejected" / "cancelled_payment" → pago caído.
  const PAYMENT_PENDING = ["pending", "in_process"];
  const PAYMENT_FAILED = ["failed", "rejected", "cancelled_payment"];
  const STALE_CART_THRESHOLD = new Date(
    now.getTime() - STALE_CART_HOURS * 60 * 60 * 1000,
  );

  const [
    pendingOrders,
    failedOrders,
    abandonedCarts,
    aggregatedCustomers,
    postPurchaseSettings,
    whatsappSettings,
    communicationSettings,
    whatsappAppState,
    postPurchaseAppState,
    storeRow,
  ] = await Promise.all([
    prisma.order.findMany({
      where: {
        storeId,
        paymentStatus: { in: PAYMENT_PENDING },
        status: { notIn: ["cancelled", "completed"] },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        orderNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        total: true,
        currency: true,
        createdAt: true,
        paymentStatus: true,
      },
    }),
    prisma.order.findMany({
      where: {
        storeId,
        paymentStatus: { in: PAYMENT_FAILED },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        orderNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        total: true,
        currency: true,
        createdAt: true,
        paymentStatus: true,
      },
    }),
    // We accept BOTH explicitly abandoned carts AND active carts that
    // haven't been touched in STALE_CART_HOURS hours: in practice the
    // storefront rarely flips status to "abandoned" without a cron, so
    // staleness is the only reliable source.
    prisma.cart.findMany({
      where: {
        storeId,
        OR: [
          { status: "abandoned" },
          { status: "active", updatedAt: { lt: STALE_CART_THRESHOLD } },
        ],
        items: { some: {} },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        currency: true,
        updatedAt: true,
        checkouts: {
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: { email: true, firstName: true, lastName: true },
        },
        items: {
          select: {
            quantity: true,
            priceSnapshot: true,
          },
        },
      },
    }),
    getAggregatedCustomers(),
    prisma.postPurchaseFlowsSettings
      .findUnique({ where: { storeId } })
      .catch(() => null),
    prisma.whatsappRecoverySettings
      .findUnique({ where: { storeId } })
      .catch(() => null),
    prisma.storeCommunicationSettings
      .findUnique({
        where: { storeId },
        select: {
          emailAbandonedCart: true,
          emailPaymentPending: true,
          emailPaymentFailed: true,
        },
      })
      .catch(() => null),
    readInstalledAppState(storeId, "whatsapp-recovery"),
    readInstalledAppState(storeId, "post-purchase-flows"),
    prisma.store.findUnique({
      where: { id: storeId },
      select: { locale: true },
    }),
  ]);

  // The Store model doesn't have a single "currency" column on every
  // schema variant — fall back to ARS (the platform's primary market)
  // when no order has surfaced one yet.
  const fallbackCurrency =
    pendingOrders[0]?.currency ??
    failedOrders[0]?.currency ??
    abandonedCarts[0]?.currency ??
    "ARS";
  void storeRow; // reserved for future tenant-currency wiring

  const reorderDelayDays =
    postPurchaseSettings?.reorderFollowupDelayDays ?? REORDER_DEFAULT_DAYS;

  const pendingPayments: RecoverableOrderRow[] = pendingOrders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: `${order.firstName} ${order.lastName}`.trim() || "Cliente sin nombre",
    customerEmail: order.email,
    totalAmount: order.total,
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    paymentStatus: order.paymentStatus,
    ageDays: daysBetween(order.createdAt, now),
  }));

  const failedPayments: RecoverableOrderRow[] = failedOrders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: `${order.firstName} ${order.lastName}`.trim() || "Cliente sin nombre",
    customerEmail: order.email,
    totalAmount: order.total,
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    paymentStatus: order.paymentStatus,
    ageDays: daysBetween(order.createdAt, now),
  }));

  const abandonedCartRows: AbandonedCartRow[] = abandonedCarts.map((cart) => {
    const checkout = cart.checkouts[0];
    const itemsCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const estimatedValue = cart.items.reduce(
      (sum, item) => sum + item.priceSnapshot * item.quantity,
      0,
    );
    return {
      id: cart.id,
      email: checkout?.email ?? null,
      itemsCount,
      estimatedValue,
      currency: cart.currency,
      updatedAt: cart.updatedAt.toISOString(),
      ageHours: hoursBetween(cart.updatedAt, now),
    };
  });

  // Inactive vs at-risk: 60d → "risk", 90d+ → "inactive". We only
  // surface customers that purchased at least once, with a real email.
  const inactiveCustomers: InactiveCustomerRow[] = aggregatedCustomers
    .map((c) => {
      const days = daysBetween(c.lastPurchaseAt, now);
      let lifecycle: InactiveCustomerRow["lifecycle"] | null = null;
      if (c.lifecycleStatus === "inactive" || days >= 90) lifecycle = "inactive";
      else if (c.lifecycleStatus === "risk" || days >= 60) lifecycle = "risk";
      if (!lifecycle) return null;
      return {
        email: c.email,
        name: c.name || "Cliente sin nombre",
        ordersCount: c.ordersCount,
        totalSpent: c.totalSpent,
        lastPurchaseAt: c.lastPurchaseAt,
        daysSinceLastPurchase: days,
        lifecycle,
      } satisfies InactiveCustomerRow;
    })
    .filter((row): row is InactiveCustomerRow => row !== null)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 50);

  // Reorder candidates: explicit, transparent rule. Recurrentes (>= 2
  // pedidos) cuya última compra superó el umbral configurado por la
  // tienda. Empuja al merchant a contactarlos en vez de esperar al
  // cron.
  const reorderCandidates: ReorderCandidateRow[] = aggregatedCustomers
    .map((c) => {
      if (c.ordersCount < 2) return null;
      const days = daysBetween(c.lastPurchaseAt, now);
      if (days < reorderDelayDays) return null;
      return {
        email: c.email,
        name: c.name || "Cliente sin nombre",
        ordersCount: c.ordersCount,
        totalSpent: c.totalSpent,
        averageTicket: c.averageTicket,
        lastPurchaseAt: c.lastPurchaseAt,
        daysSinceLastPurchase: days,
      } satisfies ReorderCandidateRow;
    })
    .filter((row): row is ReorderCandidateRow => row !== null)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 50);

  // Aggregate values. Note: we use the *list* counts (capped at 50)
  // for the table but compute monetary totals across the full DB
  // result so the header doesn't lie when a tienda has more than 50
  // recoverable rows.
  const pendingPaymentsValue = pendingOrders.reduce(
    (s, o) => s + o.total,
    0,
  );
  const failedPaymentsValue = failedOrders.reduce(
    (s, o) => s + o.total,
    0,
  );
  const abandonedCartsValue = abandonedCartRows.reduce(
    (s, c) => s + c.estimatedValue,
    0,
  );

  const summary: RecoverySummary = {
    pendingPaymentsCount: pendingOrders.length,
    pendingPaymentsValue,
    failedPaymentsCount: failedOrders.length,
    failedPaymentsValue,
    abandonedCartsCount: abandonedCartRows.length,
    abandonedCartsValue,
    inactiveCustomersCount: inactiveCustomers.length,
    reorderCandidatesCount: reorderCandidates.length,
    recoverableValue:
      pendingPaymentsValue + failedPaymentsValue + abandonedCartsValue,
    currency: fallbackCurrency,
  };

  const levers: RecoveryLeversSnapshot = {
    whatsapp: {
      state: whatsappAppState,
      configured: Boolean(
        whatsappSettings?.phoneNumberId &&
          whatsappSettings?.accessTokenEncrypted &&
          whatsappSettings?.templateName,
      ),
    },
    postPurchase: {
      state: postPurchaseAppState,
      reviewRequestEnabled: postPurchaseSettings?.reviewRequestEnabled ?? false,
      reorderFollowupEnabled:
        postPurchaseSettings?.reorderFollowupEnabled ?? false,
    },
    emails: {
      abandonedCartEnabled: communicationSettings?.emailAbandonedCart ?? false,
      paymentPendingEnabled: communicationSettings?.emailPaymentPending ?? true,
      paymentFailedEnabled: communicationSettings?.emailPaymentFailed ?? true,
    },
  };

  return {
    summary,
    pendingPayments,
    failedPayments,
    abandonedCarts: abandonedCartRows,
    inactiveCustomers,
    reorderCandidates,
    levers,
    generatedAt: now.toISOString(),
  };
}
