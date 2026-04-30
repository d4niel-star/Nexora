import { prisma } from "@/lib/db/prisma";
import { getSessionId } from "../session/cart-token";
import type { CheckoutDraftType } from "@/types/checkout";

export async function getCheckoutDraft(cartId: string): Promise<CheckoutDraftType | null> {
  const draft = await prisma.checkoutDraft.findUnique({
    where: { cartId }
  });
  if (!draft) return null;
  return draft;
}

/**
 * Gets or creates a checkout draft for the current session's active cart.
 * Safe for Server Component rendering (read-only session lookup).
 */
export async function getOrCreateCheckoutDraftForSession(
  storeId: string,
  preferredShippingMethodId?: string | null,
): Promise<CheckoutDraftType | null> {
  const sessionId = await getSessionId();
  if (!sessionId) return null;

  const cart = await prisma.cart.findUnique({
    where: { storeId_sessionId: { storeId, sessionId } },
    include: { items: true }
  });

  if (!cart || cart.status !== "active" || cart.items.length === 0) return null;

  let draft = await prisma.checkoutDraft.findUnique({
    where: { cartId: cart.id }
  });

  const subtotal = cart.items.reduce((acc, item) => acc + (item.priceSnapshot * item.quantity), 0);
  
  // Resolve shipping logic
  let shippingMethodId = draft?.shippingMethodId || null;
  let shippingMethodLabel = draft?.shippingMethodLabel || null;
  let shippingCarrier = draft?.shippingCarrier || null;
  let shippingEstimate = draft?.shippingEstimate || null;
  let shippingAmount = draft?.shippingAmount || 0;

  if (preferredShippingMethodId) {
    const preferredMethod = await prisma.shippingMethod.findFirst({
      where: { id: preferredShippingMethodId, storeId, isActive: true },
    });

    if (preferredMethod) {
      shippingMethodId = preferredMethod.id;
      shippingMethodLabel = preferredMethod.name;
      shippingCarrier = preferredMethod.carrier;
      shippingEstimate = preferredMethod.type === "pickup" ? "Retiro en local" : shippingEstimate;
      shippingAmount =
        preferredMethod.type === "pickup"
          ? 0
          : (preferredMethod.freeShippingOver && subtotal >= preferredMethod.freeShippingOver)
            ? 0
            : preferredMethod.baseAmount;
    }
  } else if (!draft || !draft.shippingMethodId) {
    // If no shipping method selected, try to assign the default one
    const defaultMethod = await prisma.shippingMethod.findFirst({
      where: { storeId, isActive: true, isDefault: true }
    });
    
    if (defaultMethod) {
      shippingMethodId = defaultMethod.id;
      shippingMethodLabel = defaultMethod.name;
      shippingCarrier = defaultMethod.carrier;
      // Recalculate amount since we know the method
      shippingAmount = (defaultMethod.freeShippingOver && subtotal >= defaultMethod.freeShippingOver) 
                        ? 0 : defaultMethod.baseAmount;
    }
  } else {
    // If we have a method, potentially recalculate if freeShipping boundary was crossed due to cart changes
    const currentMethod = await prisma.shippingMethod.findUnique({ where: { id: draft.shippingMethodId } });
    if (currentMethod) {
      shippingAmount = (currentMethod.freeShippingOver && subtotal >= currentMethod.freeShippingOver) 
                        ? 0 : currentMethod.baseAmount;
    }
  }

  const total = subtotal + shippingAmount;

  if (!draft) {
    draft = await prisma.checkoutDraft.create({
      data: {
        cartId: cart.id,
        storeId,
        subtotal,
        shippingAmount,
        total,
        shippingMethodId,
        shippingMethodLabel,
        shippingCarrier,
        shippingEstimate
      }
    });
  } else {
    draft = await prisma.checkoutDraft.update({
      where: { id: draft.id },
      data: { 
        subtotal, 
        shippingAmount, 
        total,
        shippingMethodId,
        shippingMethodLabel,
        shippingCarrier,
        shippingEstimate
      }
    });
  }

  return draft;
}
