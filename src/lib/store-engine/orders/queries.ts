import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import type { Order, OrderStatus, PaymentStatus, Channel } from "@/types/order";
import {
  type PaginationMeta,
  buildPaginationMeta,
  pageToSkip,
  clampPageSize,
  DEFAULT_PAGE_SIZE,
} from "@/lib/pagination";

// ─── Tab status counts (server-computed, avoids loading all orders) ────
export interface OrderStatusCounts {
  all: number;
  new: number;
  paid: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  refunded: number;
  pendingPayment: number;
}

// ─── Paginated result ─────────────────────────────────────────────────
export interface OrdersPageResult {
  orders: Order[];
  pagination: PaginationMeta;
  counts: OrderStatusCounts;
}

// ─── Options ──────────────────────────────────────────────────────────
export interface GetOrdersPageOptions {
  page?: number;
  pageSize?: number;
  query?: string;
  status?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Server-side paginated orders query.
 * Uses take/skip, where filters, and returns pagination metadata + tab counts.
 */
export async function getAdminOrdersPage(
  options: GetOrdersPageOptions = {},
): Promise<OrdersPageResult> {
  const store = await getCurrentStore();

  const empty: OrdersPageResult = {
    orders: [],
    pagination: buildPaginationMeta(0, 1, DEFAULT_PAGE_SIZE),
    counts: { all: 0, new: 0, paid: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0, refunded: 0, pendingPayment: 0 },
  };

  if (!store) return empty;

  const pageSize = clampPageSize(options.pageSize ?? DEFAULT_PAGE_SIZE);
  const page = Math.max(1, options.page ?? 1);

  // Build WHERE clause
  const where: Record<string, unknown> = { storeId: store.id };

  if (options.status && options.status !== "all") {
    where.status = options.status;
  }

  if (options.paymentStatus) {
    where.paymentStatus = options.paymentStatus;
  }

  if (options.query) {
    const q = options.query.trim();
    if (q) {
      where.OR = [
        { orderNumber: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { trackingCode: { contains: q, mode: "insensitive" } },
      ];
    }
  }

  if (options.dateFrom || options.dateTo) {
    const createdAt: Record<string, Date> = {};
    if (options.dateFrom) createdAt.gte = new Date(`${options.dateFrom}T00:00:00`);
    if (options.dateTo) createdAt.lte = new Date(`${options.dateTo}T23:59:59`);
    where.createdAt = createdAt;
  }

  // Phase 1: counts + tab counts (parallel)
  const storeWhere = { storeId: store.id };
  const [total, ...statusCounts] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.count({ where: { ...storeWhere } }),
    prisma.order.count({ where: { ...storeWhere, status: "new" } }),
    prisma.order.count({ where: { ...storeWhere, status: "paid" } }),
    prisma.order.count({ where: { ...storeWhere, status: "processing" } }),
    prisma.order.count({ where: { ...storeWhere, status: "shipped" } }),
    prisma.order.count({ where: { ...storeWhere, status: "delivered" } }),
    prisma.order.count({ where: { ...storeWhere, status: "cancelled" } }),
    prisma.order.count({ where: { ...storeWhere, status: "refunded" } }),
    prisma.order.count({ where: { ...storeWhere, paymentStatus: { in: ["pending", "in_process"] } } }),
  ]);

  // Clamp page to valid range BEFORE querying data
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.max(1, Math.min(page, pageCount));

  // Phase 2: fetch page data with clamped skip
  const dbOrders = await prisma.order.findMany({
    where,
    include: {
      items: {
        select: {
          id: true,
          productId: true,
          variantId: true,
          skuSnapshot: true,
          titleSnapshot: true,
          variantTitleSnapshot: true,
          quantity: true,
          priceSnapshot: true,
          lineTotal: true,
          imageSnapshot: true,
        },
      },
      fiscalInvoice: true,
    },
    orderBy: { createdAt: "desc" },
    take: pageSize,
    skip: pageToSkip(safePage, pageSize),
  });

  const counts: OrderStatusCounts = {
    all: statusCounts[0],
    new: statusCounts[1],
    paid: statusCounts[2],
    processing: statusCounts[3],
    shipped: statusCounts[4],
    delivered: statusCounts[5],
    cancelled: statusCounts[6],
    refunded: statusCounts[7],
    pendingPayment: statusCounts[8],
  };


  const orders: Order[] = dbOrders.map((o) => ({
    id: o.id,
    number: o.orderNumber,
    createdAt: o.createdAt.toISOString(),
    status: o.status as OrderStatus,
    publicStatus: o.publicStatus,
    paymentStatus: o.paymentStatus as PaymentStatus,
    channel: o.channel as Channel,
    total: o.total,
    subtotal: o.subtotal,
    shippingCost: o.shippingAmount,
    currency: o.currency,
    customer: {
      id: o.email,
      name: `${o.firstName} ${o.lastName}`.trim(),
      email: o.email,
      phone: o.phone,
      document: o.document,
    },
    shipping: {
      address: [o.addressLine1, o.addressLine2].filter(Boolean).join(", "),
      city: o.city,
      state: o.province,
      zipCode: o.postalCode,
      country: o.country,
      carrier: o.shippingCarrier,
      trackingNumber: o.trackingCode,
      trackingUrl: o.trackingUrl,
      shippingMethodLabel: o.shippingMethodLabel,
      shippingEstimate: o.shippingEstimate,
      shippingStatus: o.shippingStatus,
    },
    items: o.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      sku: item.skuSnapshot,
      title: item.titleSnapshot,
      variantTitle: item.variantTitleSnapshot,
      quantity: item.quantity,
      price: item.priceSnapshot,
      lineTotal: item.lineTotal,
      image: item.imageSnapshot,
    })),
    paymentProvider: o.paymentProvider,
    mpPaymentId: o.mpPaymentId,
    mpPreferenceId: o.mpPreferenceId,
    fiscalInvoice: o.fiscalInvoice,
  }));

  return {
    orders,
    pagination: buildPaginationMeta(total, safePage, pageSize),
    counts,
  };
}

/**
 * @deprecated Use getAdminOrdersPage for paginated access.
 * Kept for backward compatibility with dashboard widgets and other callers.
 */
export async function getAdminOrders(): Promise<Order[]> {
  const store = await getCurrentStore();

  if (!store) return [];

  const dbOrders = await prisma.order.findMany({
    where: { storeId: store.id },
    include: {
      items: {
        include: {
          product: true
        }
      },
      fiscalInvoice: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return dbOrders.map((o) => ({
    id: o.id,
    number: o.orderNumber,
    createdAt: o.createdAt.toISOString(),
    status: o.status as OrderStatus,
    publicStatus: o.publicStatus,
    paymentStatus: o.paymentStatus as PaymentStatus,
    channel: o.channel as Channel,
    total: o.total,
    subtotal: o.subtotal,
    shippingCost: o.shippingAmount,
    currency: o.currency,
    customer: {
      id: o.email,
      name: `${o.firstName} ${o.lastName}`.trim(),
      email: o.email,
      phone: o.phone,
      document: o.document,
    },
    shipping: {
      address: [o.addressLine1, o.addressLine2].filter(Boolean).join(", "),
      city: o.city,
      state: o.province,
      zipCode: o.postalCode,
      country: o.country,
      carrier: o.shippingCarrier,
      trackingNumber: o.trackingCode,
      trackingUrl: o.trackingUrl,
      shippingMethodLabel: o.shippingMethodLabel,
      shippingEstimate: o.shippingEstimate,
      shippingStatus: o.shippingStatus,
    },
    items: o.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      sku: item.skuSnapshot,
      title: item.titleSnapshot,
      variantTitle: item.variantTitleSnapshot,
      quantity: item.quantity,
      price: item.priceSnapshot,
      lineTotal: item.lineTotal,
      image: item.imageSnapshot,
    })),
    paymentProvider: o.paymentProvider,
    mpPaymentId: o.mpPaymentId,
    mpPreferenceId: o.mpPreferenceId,
    fiscalInvoice: o.fiscalInvoice,
  }));
}

/**
 * Fetches a single order by ID for the admin drawer/detail view.
 */
export async function getAdminOrderById(orderId: string): Promise<Order | null> {
  const store = await getCurrentStore();

  if (!store) return null;

  const dbOrder = await prisma.order.findFirst({
    where: { id: orderId, storeId: store.id },
    include: {
      items: {
        include: {
          product: true
        }
      },
      fiscalInvoice: true,
    },
  });

  if (!dbOrder) return null;

  return {
    id: dbOrder.id,
    number: dbOrder.orderNumber,
    createdAt: dbOrder.createdAt.toISOString(),
    status: dbOrder.status as OrderStatus,
    publicStatus: dbOrder.publicStatus,
    paymentStatus: dbOrder.paymentStatus as PaymentStatus,
    channel: dbOrder.channel as Channel,
    total: dbOrder.total,
    subtotal: dbOrder.subtotal,
    shippingCost: dbOrder.shippingAmount,
    currency: dbOrder.currency,
    customer: {
      id: dbOrder.email,
      name: `${dbOrder.firstName} ${dbOrder.lastName}`.trim(),
      email: dbOrder.email,
      phone: dbOrder.phone,
      document: dbOrder.document,
    },
    shipping: {
      address: [dbOrder.addressLine1, dbOrder.addressLine2].filter(Boolean).join(", "),
      city: dbOrder.city,
      state: dbOrder.province,
      zipCode: dbOrder.postalCode,
      country: dbOrder.country,
      carrier: dbOrder.shippingCarrier,
      trackingNumber: dbOrder.trackingCode,
      trackingUrl: dbOrder.trackingUrl,
      shippingMethodLabel: dbOrder.shippingMethodLabel,
      shippingEstimate: dbOrder.shippingEstimate,
      shippingStatus: dbOrder.shippingStatus,
    },
    items: dbOrder.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      sku: item.skuSnapshot,
      title: item.titleSnapshot,
      variantTitle: item.variantTitleSnapshot,
      quantity: item.quantity,
      price: item.priceSnapshot,
      lineTotal: item.lineTotal,
      image: item.imageSnapshot,
    })),
    paymentProvider: dbOrder.paymentProvider,
    mpPaymentId: dbOrder.mpPaymentId,
    mpPreferenceId: dbOrder.mpPreferenceId,
    fiscalInvoice: dbOrder.fiscalInvoice,
  };
}
