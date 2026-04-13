"use server";

import { prisma } from "@/lib/db/prisma";
import { createPreferenceForOrder, getPreference } from "@/lib/payments/mercadopago/client";
import { revalidatePath } from "next/cache";
import { revalidateCheckoutStock } from "@/lib/store-engine/inventory/actions";
import { sendEmailEvent } from "@/lib/email/events";

/**
 * Creates an Order from a CheckoutDraft, then initiates a Mercado Pago preference.
 * Returns the Mercado Pago redirect URL for payment.
 */
export async function initiatePayment(draftId: string, storeSlug: string): Promise<{
  redirectUrl: string;
  orderId: string;
}> {
  // 1. Load draft + cart
  const draft = await prisma.checkoutDraft.findUnique({
    where: { id: draftId },
    include: {
      cart: {
        include: { items: true }
      }
    }
  });

  if (!draft || !draft.cart) {
    throw new Error("Checkout draft not found");
  }

  if (!draft.email || !draft.firstName || !draft.addressLine1 || !draft.city) {
    throw new Error("Completá todos los campos obligatorios antes de pagar");
  }

  const { cart } = draft;

  if (cart.items.length === 0) {
    throw new Error("El carrito está vacío");
  }

  // Stock revalidation before order commit
  const stockCheck = await revalidateCheckoutStock(cart.id);
  if (!stockCheck.success) {
    throw new Error(stockCheck.error);
  }

  // 2. Generate order number
  const orderNumber = `#${Math.floor(10000 + Math.random() * 90000)}`;

  // 3. Create Order
  const order = await prisma.order.create({
    data: {
      storeId: draft.storeId,
      orderNumber,
      cartId: cart.id,

      email: draft.email,
      firstName: draft.firstName,
      lastName: draft.lastName || "",
      phone: draft.phone,
      document: draft.document,

      addressLine1: draft.addressLine1,
      addressLine2: draft.addressLine2,
      city: draft.city,
      province: draft.province || "",
      postalCode: draft.postalCode || "",
      country: draft.country || "AR",

      currency: cart.currency,
      subtotal: draft.subtotal,
      shippingAmount: draft.shippingAmount,
      total: draft.total,
      
      shippingMethodId: draft.shippingMethodId,
      shippingMethodLabel: draft.shippingMethodLabel,
      shippingCarrier: draft.shippingCarrier,
      shippingEstimate: draft.shippingEstimate,

      status: "new",
      paymentStatus: "pending",
      paymentProvider: "mercadopago",
      channel: "Storefront",

      items: {
        create: cart.items.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          titleSnapshot: item.titleSnapshot,
          variantTitleSnapshot: item.variantTitleSnapshot,
          imageSnapshot: item.imageSnapshot,
          priceSnapshot: item.priceSnapshot,
          quantity: item.quantity,
          lineTotal: item.priceSnapshot * item.quantity,
        }))
      }
    },
    include: { items: true }
  });

  // 4. Create Mercado Pago Preference
  let redirectUrl: string;

  try {
    const preference = await createPreferenceForOrder(
      {
        id: order.id,
        orderNumber: order.orderNumber,
        email: order.email,
        firstName: order.firstName,
        lastName: order.lastName,
        phone: order.phone,
        document: order.document,
        total: order.total,
        currency: order.currency,
        items: order.items,
      },
      storeSlug
    );

    // 5. Update Order with MP preference ID
    await prisma.order.update({
      where: { id: order.id },
      data: { mpPreferenceId: preference.id }
    });

    // 6. Create initial Payment record
    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: "mercadopago",
        status: "pending",
        preferenceId: preference.id,
        externalReference: order.id,
        amount: order.total,
        currency: order.currency,
      }
    });

    // Use sandbox URL for dev, init_point for production
    const isSandbox = (process.env.MERCADOPAGO_ACCESS_TOKEN || "").startsWith("TEST-");
    redirectUrl = isSandbox ? preference.sandbox_init_point : preference.init_point;

    // Attempt to trigger the ORDER_CREATED email silently in the background
    const store = await prisma.store.findUnique({ where: { id: order.storeId } });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    if (store && order.email) {
      sendEmailEvent({
        storeId: store.id,
        eventType: "ORDER_CREATED",
        entityType: "order",
        entityId: order.id,
        recipient: order.email,
        data: {
          storeSlug,
          storeName: store.name,
          customerName: order.firstName,
          orderNumber: order.orderNumber,
          orderId: order.id,
          subtotal: order.subtotal,
          shippingAmount: order.shippingAmount,
          total: order.total,
          currency: order.currency,
          shippingMethodLabel: order.shippingMethodLabel || undefined,
          statusUrl: `${appUrl}/${storeSlug}/checkout/pending?orderId=${order.id}`,
        }
      }).catch(err => console.error("[initiatePayment] Background Email Failed", err));
    }

  } catch (err) {
    // If MP fails, still keep the order but mark payment as failed
    console.error("[initiatePayment] MercadoPago error:", err);
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "failed" }
    });
    throw new Error("Error al conectar con Mercado Pago. Intentá nuevamente.");
  }

  // 7. Mark cart and draft as processing
  await prisma.cart.update({
    where: { id: cart.id },
    data: { status: "completed" }
  });

  await prisma.checkoutDraft.update({
    where: { id: draftId },
    data: { status: "completed" }
  });

  revalidatePath("/admin/orders");

  return { redirectUrl, orderId: order.id };
}

/**
 * Retries an existing payment by fetching the previously created preference
 * or returning the init_point. Ensures we don't recreate the order.
 */
export async function retryPayment(orderId: string): Promise<{ redirectUrl: string }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });

  if (!order) {
    throw new Error("Order no encontrada");
  }

  if (order.paymentStatus === 'paid') {
    throw new Error("La orden ya fue pagada.");
  }

  if (!order.mpPreferenceId) {
    throw new Error("La orden no posee una preferencia de pago válida para reintentar.");
  }

  try {
    const preference = await getPreference(order.mpPreferenceId);
    
    // Update order back to pending if it was marked failed
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "pending" }
    });

    const isSandbox = (process.env.MERCADOPAGO_ACCESS_TOKEN || "").startsWith("TEST-");
    const redirectUrl = isSandbox ? preference.sandbox_init_point : preference.init_point;

    return { redirectUrl };
  } catch (err) {
    console.error("[retryPayment] MercadoPago error:", err);
    throw new Error("Error al recuperar la pasarela de pago.");
  }
}
