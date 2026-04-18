import { prisma } from "@/lib/db/prisma";
import { getSessionId } from "../session/cart-token";
import type { CartStockIssue, CartType } from "@/types/cart";

export async function getCart(storeId: string): Promise<CartType | null> {
  const sessionId = await getSessionId();

  // No session cookie yet means no cart exists
  if (!sessionId) return null;

  const cart = await prisma.cart.findUnique({
    where: {
      storeId_sessionId: {
        storeId,
        sessionId,
      },
    },
    include: {
      items: true,
    },
  });

  if (!cart || cart.status !== "active") return null;

  const subtotal = cart.items.reduce((acc, item) => acc + item.priceSnapshot * item.quantity, 0);
  const totalQuantity = cart.items.reduce((acc, item) => acc + item.quantity, 0);

  return {
    id: cart.id,
    storeId: cart.storeId,
    sessionId: cart.sessionId,
    currency: cart.currency,
    status: cart.status,
    items: cart.items.map((item) => ({
      ...item,
    })),
    subtotal,
    totalQuantity,
  };
}

export async function getCartStockIssues(cartId: string): Promise<CartStockIssue[]> {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          variant: true,
        },
      },
    },
  });

  if (!cart || cart.status !== "active") return [];

  return cart.items.reduce<CartStockIssue[]>((issues, item) => {
    const variant = item.variant;

    if (!variant) {
      issues.push({
        itemId: item.id,
        title: item.titleSnapshot,
        variantTitle: item.variantTitleSnapshot,
        requested: item.quantity,
        available: 0,
      });
      return issues;
    }

    if (!variant.trackInventory || variant.allowBackorder) {
      return issues;
    }

    const available = Math.max(variant.stock - variant.reservedStock, 0);
    if (available < item.quantity) {
      issues.push({
        itemId: item.id,
        title: item.titleSnapshot,
        variantTitle: item.variantTitleSnapshot,
        requested: item.quantity,
        available,
      });
    }

    return issues;
  }, []);
}
