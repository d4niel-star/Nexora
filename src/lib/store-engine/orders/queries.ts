import { prisma } from "@/lib/db/prisma";
import type { Order, OrderStatus, PaymentStatus, Channel } from "@/types/order";

/**
 * Fetches all orders for the active store, adapting the flat Prisma schema
 * into the structured `Order` type used by the admin UI.
 */
export async function getAdminOrders(): Promise<Order[]> {
  // MVP: Single-tenant — find the first active store
  const store = await prisma.store.findFirst({
    where: { status: "active" },
  });

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
    paymentStatus: o.paymentStatus as PaymentStatus,
    channel: o.channel as Channel,
    total: o.total,
    subtotal: o.subtotal,
    shippingCost: o.shippingAmount,
    currency: o.currency,
    customer: {
      id: o.email, // Using email as pseudo-ID since we don't have a customer table yet
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
    fiscalInvoice: o.fiscalInvoice,
  }));
}

/**
 * Fetches a single order by ID for the admin drawer/detail view.
 */
export async function getAdminOrderById(orderId: string): Promise<Order | null> {
  const dbOrder = await prisma.order.findUnique({
    where: { id: orderId },
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
    fiscalInvoice: dbOrder.fiscalInvoice,
  };
}
