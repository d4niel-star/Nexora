"use server";

import { prisma } from "@/lib/db/prisma";
import { createPreferenceForOrder, getPreference } from "@/lib/payments/mercadopago/client";
import { revalidatePath } from "next/cache";
import { revalidateCheckoutStock } from "@/lib/store-engine/inventory/actions";
import { sendEmailEvent } from "@/lib/email/events";
import { storePath } from "@/lib/store-engine/urls";
import { getMercadoPagoCredentialsForStore } from "@/lib/payments/mercadopago/tenant";
import {
  commitPickupLocalStockForOrderTx,
  restorePickupLocalStockForOrder,
} from "@/lib/store-engine/pickup/local-stock";

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

  if (draft.status !== "pending" || draft.cart.status !== "active") {
    throw new Error("Este checkout ya fue procesado. Revisá el estado del pedido o volvé a armar el carrito.");
  }

  // Resolve the shipping method up front so we know if we're in a
  // pickup flow. Pickup orders skip the address requirement because
  // the buyer never gives us a delivery address — they walk in.
  const selectedMethod = draft.shippingMethodId
    ? await prisma.shippingMethod.findUnique({ where: { id: draft.shippingMethodId } })
    : null;
  if (selectedMethod && selectedMethod.storeId !== draft.storeId) {
    throw new Error("Metodo de envio invalido");
  }
  const isPickup = selectedMethod?.type === "pickup";

  // Server-side guard: even if the buyer somehow kept a stale draft
  // pointing at a pickup method that the merchant has since
  // disabled, we refuse to commit the order. We also defensively
  // re-check the StoreLocation toggle in case the ShippingMethod row
  // was flipped manually.
  let pickupLocation: { id: string; pickupEnabled: boolean } | null = null;
  if (isPickup) {
    if (!selectedMethod?.isActive) {
      throw new Error("El retiro en local ya no está disponible");
    }
    pickupLocation = await prisma.storeLocation.findUnique({
      where: { storeId: draft.storeId },
      select: { id: true, pickupEnabled: true },
    });
    if (!pickupLocation || !pickupLocation.pickupEnabled) {
      throw new Error("El retiro en local ya no está disponible");
    }
  }

  // Common contact requirements apply to both flows.
  if (!draft.email || !draft.firstName) {
    throw new Error("Completá tus datos de contacto antes de pagar");
  }
  // Address fields are only required for shipping. Pickup orders do
  // not need a delivery address — buyer picks up at the store.
  if (!isPickup && (!draft.addressLine1 || !draft.city)) {
    throw new Error("Completá la dirección de envío antes de pagar");
  }

  const { cart } = draft;

  if (cart.items.length === 0) {
    throw new Error("El carrito está vacío");
  }

  // Stock revalidation before order commit. Shipping keeps using
  // ProductVariant.stock; pickup is validated and decremented against
  // LocalInventory inside the order transaction below.
  if (!isPickup) {
    const stockCheck = await revalidateCheckoutStock(cart.id);
    if (!stockCheck.success) {
      throw new Error(stockCheck.error);
    }
  }

  const store = await prisma.store.findFirst({
    where: {
      id: draft.storeId,
      slug: storeSlug,
      active: true,
    },
  });

  if (!store) {
    throw new Error("La tienda no esta disponible para iniciar el pago.");
  }

  const mpCredentials = await getMercadoPagoCredentialsForStore(store.id);

  const subtotal = cart.items.reduce((acc, item) => acc + item.priceSnapshot * item.quantity, 0);
  // Force shippingAmount=0 for pickup as a last-line defence against
  // any client-side or stale-draft tampering.
  const shippingAmount = isPickup ? 0 : draft.shippingAmount || 0;
  const total = subtotal + shippingAmount;

  // 2. Generate order number
  const orderNumber = `#${Math.floor(10000 + Math.random() * 90000)}`;

  // 3. Create Order. Pickup stock is decremented in the same
  // transaction so order + LocalInventory move together.
  const order = await prisma.$transaction(async (tx) => {
    const draftClaim = await tx.checkoutDraft.updateMany({
      where: { id: draft.id, status: "pending" },
      data: { status: "completed" },
    });
    const cartClaim = await tx.cart.updateMany({
      where: { id: cart.id, status: "active" },
      data: { status: "completed" },
    });

    if (draftClaim.count !== 1 || cartClaim.count !== 1) {
      throw new Error("Este checkout ya fue procesado. Revisá el estado del pedido o volvé a armar el carrito.");
    }

    const createdOrder = await tx.order.create({
      data: {
        storeId: draft.storeId,
        orderNumber,
        cartId: cart.id,

        email: draft.email!,
        firstName: draft.firstName!,
        lastName: draft.lastName || "",
        phone: draft.phone,
        document: draft.document,

        // Address columns are non-nullable on the Order model. Pickup
        // orders may legitimately have no shipping address, so we
        // fall back to "" for the required strings instead of forcing
        // the buyer to invent a fake one.
        addressLine1: draft.addressLine1 ?? "",
        addressLine2: draft.addressLine2,
        city: draft.city ?? "",
        province: draft.province || "",
        postalCode: draft.postalCode || "",
        country: draft.country || "AR",

        currency: cart.currency,
        subtotal,
        shippingAmount,
        total,

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
    });

    const createdItems = await tx.orderItem.findMany({
      where: { orderId: createdOrder.id },
    });

    if (isPickup && pickupLocation) {
      await commitPickupLocalStockForOrderTx(tx, {
        storeId: draft.storeId,
        locationId: pickupLocation.id,
        orderId: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        items: createdItems,
        source: "storefront_checkout",
      });
    }

    return { ...createdOrder, items: createdItems };
  });

  // 4. Create Mercado Pago Preference
  let redirectUrl: string;

  try {
    const preference = await createPreferenceForOrder(
      mpCredentials.accessToken,
      {
        id: order.id,
        storeId: order.storeId,
        orderNumber: order.orderNumber,
        email: order.email,
        firstName: order.firstName,
        lastName: order.lastName,
        phone: order.phone,
        document: order.document,
        total,
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
        amount: total,
        currency: order.currency,
      }
    });

    redirectUrl = mpCredentials.isSandbox ? preference.sandbox_init_point : preference.init_point;

    // Attempt to trigger the ORDER_CREATED email silently in the background
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
          subtotal,
          shippingAmount,
          total,
          currency: order.currency,
          shippingMethodLabel: order.shippingMethodLabel || undefined,
          statusUrl: `${appUrl}${storePath(storeSlug, `checkout/pending?orderId=${order.id}`)}`,
        }
      }).catch(err => console.error("[initiatePayment] Background Email Failed", err));
    }

  } catch (err) {
    // If MP fails, still keep the order but mark payment as failed
    console.error("[initiatePayment] MercadoPago error:", err);
    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "failed" }
      }),
      prisma.cart.update({
        where: { id: cart.id },
        data: { status: "active" }
      }),
      prisma.checkoutDraft.update({
        where: { id: draftId },
        data: { status: "pending" }
      }),
    ]);
    if (isPickup) {
      await restorePickupLocalStockForOrder(
        order.id,
        "Mercado Pago preference creation failed",
        "storefront_checkout",
      );
    }
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
export async function retryPayment(orderId: string, storeSlug: string): Promise<{ redirectUrl: string }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { store: true },
  });

  if (!order) {
    throw new Error("Order no encontrada");
  }

  if (order.store.slug !== storeSlug) {
    throw new Error("La orden no pertenece a esta tienda.");
  }

  if (order.paymentStatus === 'paid') {
    throw new Error("La orden ya fue pagada.");
  }

  if (!order.mpPreferenceId) {
    throw new Error("La orden no posee una preferencia de pago válida para reintentar.");
  }

  try {
    const mpCredentials = await getMercadoPagoCredentialsForStore(order.storeId);
    const preference = await getPreference(mpCredentials.accessToken, order.mpPreferenceId);
    
    // Update order back to pending if it was marked failed
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "pending" }
    });

    const redirectUrl = mpCredentials.isSandbox ? preference.sandbox_init_point : preference.init_point;

    return { redirectUrl };
  } catch (err) {
    console.error("[retryPayment] MercadoPago error:", err);
    throw new Error("Error al recuperar la pasarela de pago.");
  }
}
