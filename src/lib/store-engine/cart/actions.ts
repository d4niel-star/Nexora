"use server";

import { prisma } from "@/lib/db/prisma";
import { getOrCreateSessionId } from "../session/cart-token";
import { revalidatePath } from "next/cache";
import { checkVariantStock } from "@/lib/store-engine/inventory/queries";

export async function addToCart(storeId: string, storeSlug: string, productId: string, variantId: string, quantity: number = 1) {
  const sessionId = await getOrCreateSessionId();

  // Find or create cart
  let cart = await prisma.cart.findUnique({
    where: {
      storeId_sessionId: { storeId, sessionId },
    },
  });

  if (!cart) {
    // No cart at all — create a fresh one
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new Error("Store not found");
    cart = await prisma.cart.create({
      data: {
        storeId,
        sessionId,
        currency: store.currency,
      },
    });
  } else if (cart.status !== "active") {
    // Cart exists but was completed/abandoned — reactivate it and clear old items
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    // Also clean up the old checkout draft if any
    await prisma.checkoutDraft.deleteMany({ where: { cartId: cart.id } });
    cart = await prisma.cart.update({
      where: { id: cart.id },
      data: { status: "active" },
    });
  }

  // Get product & variant info to snapshot
  const product = await prisma.product.findUnique({ 
    where: { id: productId },
    include: { images: { orderBy: { sortOrder: 'asc' } } }
  });
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });

  if (!product || !variant) throw new Error("Product/Variant not found");

  // Check if item already exists in cart
  const existingItem = await prisma.cartItem.findUnique({
    where: {
      cartId_variantId: { cartId: cart.id, variantId },
    },
  });

  if (existingItem) {
    const desiredQuantity = existingItem.quantity + quantity;
    const stockStatus = await checkVariantStock(variantId, desiredQuantity);
    if (!stockStatus.hasStock) {
      throw new Error("No hay suficiente stock disponible para agregar esta cantidad.");
    }
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: desiredQuantity },
    });
  } else {
    const stockStatus = await checkVariantStock(variantId, quantity);
    if (!stockStatus.hasStock) {
      throw new Error("Producto sin stock disponible.");
    }
    const imageSnapshot = product.featuredImage || (product.images.length > 0 ? product.images[0].url : null);

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

  revalidatePath(`/${storeSlug}`);
}

export async function updateCartItemQuantity(itemId: string, quantity: number, storeSlug: string) {
  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else {
    const item = await prisma.cartItem.findUnique({ where: { id: itemId } });
    if (item && item.variantId) {
       const stock = await checkVariantStock(item.variantId, quantity);
       if (!stock.hasStock) throw new Error("Stock insuficiente");
    }

    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }
  revalidatePath(`/${storeSlug}`);
}

export async function removeCartItem(itemId: string, storeSlug: string) {
  await prisma.cartItem.delete({ where: { id: itemId } });
  revalidatePath(`/${storeSlug}`);
}
