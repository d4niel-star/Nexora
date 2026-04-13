"use server";

import { prisma } from "@/lib/db/prisma";
import { getOrCreateSessionId } from "../session/cart-token";

export async function createCheckoutDraft(storeId: string) {
  const sessionId = await getOrCreateSessionId();

  const cart = await prisma.cart.findUnique({
    where: { storeId_sessionId: { storeId, sessionId } },
    include: { items: true }
  });

  if (!cart || cart.items.length === 0) {
    throw new Error("Cart is empty");
  }

  // Calculate subtotal from cart items
  const subtotal = cart.items.reduce((acc, item) => acc + (item.priceSnapshot * item.quantity), 0);
  const shippingAmount = 0;
  const total = subtotal + shippingAmount;

  let draft = await prisma.checkoutDraft.findUnique({
    where: { cartId: cart.id }
  });

  if (!draft) {
    draft = await prisma.checkoutDraft.create({
      data: {
        cartId: cart.id,
        storeId,
        subtotal,
        shippingAmount,
        total,
      }
    });
  } else {
    draft = await prisma.checkoutDraft.update({
      where: { id: draft.id },
      data: {
        subtotal,
        shippingAmount,
        total,
      }
    });
  }

  return draft;
}

export async function updateCheckoutDraftInfo(draftId: string, data: {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  document?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  paymentMethod?: string;
}) {
  await prisma.checkoutDraft.update({
    where: { id: draftId },
    data: {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      document: data.document,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2,
      city: data.city,
      province: data.province,
      postalCode: data.postalCode,
      country: data.country,
      paymentMethod: data.paymentMethod,
    }
  });
}
