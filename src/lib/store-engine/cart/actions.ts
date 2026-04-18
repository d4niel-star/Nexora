"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateSessionId, getSessionId } from "../session/cart-token";
import { checkVariantStock } from "@/lib/store-engine/inventory/queries";
import { storePath } from "@/lib/store-engine/urls";

function revalidateStoreCart(storeSlug: string) {
  revalidatePath(storePath(storeSlug));
  revalidatePath(storePath(storeSlug, "cart"));
  revalidatePath(storePath(storeSlug, "checkout"));
}

async function getActiveStore(storeSlug: string) {
  const store = await prisma.store.findFirst({
    where: { slug: storeSlug, active: true },
    select: { id: true, slug: true, currency: true },
  });

  if (!store) {
    throw new Error("Tienda no encontrada.");
  }

  return store;
}

async function getActiveSessionCart(storeSlug: string) {
  const store = await getActiveStore(storeSlug);
  const sessionId = await getSessionId();

  if (!sessionId) {
    throw new Error("Carrito no encontrado.");
  }

  const cart = await prisma.cart.findUnique({
    where: { storeId_sessionId: { storeId: store.id, sessionId } },
  });

  if (!cart || cart.status !== "active") {
    throw new Error("Carrito no encontrado.");
  }

  return { store, cart };
}

export async function addToCart(
  storeId: string,
  storeSlug: string,
  productId: string,
  variantId: string,
  quantity = 1,
) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Cantidad invalida.");
  }

  const store = await getActiveStore(storeSlug);
  if (store.id !== storeId) {
    throw new Error("La tienda no coincide con el producto solicitado.");
  }

  const sessionId = await getOrCreateSessionId();
  let cart = await prisma.cart.findUnique({
    where: {
      storeId_sessionId: { storeId: store.id, sessionId },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        storeId: store.id,
        sessionId,
        currency: store.currency,
      },
    });
  } else if (cart.status !== "active") {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await prisma.checkoutDraft.deleteMany({ where: { cartId: cart.id } });
    cart = await prisma.cart.update({
      where: { id: cart.id },
      data: { status: "active" },
    });
  }

  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      storeId: store.id,
      isPublished: true,
      status: { not: "archived" },
    },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
    },
  });

  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, productId },
  });

  if (!product || !variant) {
    throw new Error("Producto no disponible.");
  }

  const existingItem = await prisma.cartItem.findUnique({
    where: {
      cartId_variantId: { cartId: cart.id, variantId },
    },
  });

  const desiredQuantity = (existingItem?.quantity ?? 0) + quantity;
  const stockStatus = await checkVariantStock(variantId, desiredQuantity);
  if (!stockStatus.hasStock) {
    throw new Error(`No hay suficiente stock disponible. Quedan ${stockStatus.available} unidades.`);
  }

  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: desiredQuantity },
    });
  } else {
    const imageSnapshot = product.featuredImage || product.images[0]?.url || null;

    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        variantId,
        quantity,
        titleSnapshot: product.title,
        variantTitleSnapshot: variant.title,
        imageSnapshot,
        priceSnapshot: variant.price,
        compareAtPriceSnapshot: variant.compareAtPrice,
      },
    });
  }

  revalidateStoreCart(storeSlug);
}

export async function updateCartItemQuantity(itemId: string, quantity: number, storeSlug: string) {
  const { cart } = await getActiveSessionCart(storeSlug);

  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
  });

  if (!item) {
    throw new Error("Item de carrito no encontrado.");
  }

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
    revalidateStoreCart(storeSlug);
    return;
  }

  if (!Number.isInteger(quantity)) {
    throw new Error("Cantidad invalida.");
  }

  const stock = await checkVariantStock(item.variantId, quantity);
  if (!stock.hasStock) {
    throw new Error(`Stock insuficiente para ${item.titleSnapshot}. Quedan ${stock.available} unidades.`);
  }

  await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity },
  });

  revalidateStoreCart(storeSlug);
}

export async function removeCartItem(itemId: string, storeSlug: string) {
  const { cart } = await getActiveSessionCart(storeSlug);
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
    select: { id: true },
  });

  if (!item) {
    throw new Error("Item de carrito no encontrado.");
  }

  await prisma.cartItem.delete({ where: { id: item.id } });
  revalidateStoreCart(storeSlug);
}

export async function clearCart(storeSlug: string) {
  const { cart } = await getActiveSessionCart(storeSlug);

  await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
    prisma.checkoutDraft.deleteMany({ where: { cartId: cart.id } }),
  ]);

  revalidateStoreCart(storeSlug);
}
