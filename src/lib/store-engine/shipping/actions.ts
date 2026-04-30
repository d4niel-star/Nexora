"use server";

import { prisma } from "@/lib/db/prisma";
import { getShippingMethods, calculateShippingAmount, formatShippingEstimate } from "./queries";
import { revalidatePath } from "next/cache";
import { storePath } from "@/lib/store-engine/urls";
import { getPickupLocalStockIssuesForCart } from "@/lib/store-engine/pickup/local-stock";

export async function updateCheckoutShippingMethod(
  draftId: string, 
  shippingMethodId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const draft = await prisma.checkoutDraft.findUnique({
      where: { id: draftId },
      include: { store: true }
    });

    if (!draft) {
      return { success: false, error: "Checkout no encontrado" };
    }

    const availableMethods = await getShippingMethods(draft.storeId);
    const selectedMethod = availableMethods.find(m => m.id === shippingMethodId);

    if (!selectedMethod) {
      return { success: false, error: "Método de envío inválido" };
    }

    // Pickup must always be free regardless of what the row currently
    // stores; defensive override against a misconfigured baseAmount.
    // We also re-validate that the merchant has the physical location
    // pickup toggle on, in case the ShippingMethod was activated
    // manually but the StoreLocation flag is off.
    if (selectedMethod.type === "pickup") {
      const location = await prisma.storeLocation.findUnique({
        where: { storeId: draft.storeId },
        select: { pickupEnabled: true },
      });
      if (!location || !location.pickupEnabled) {
        return { success: false, error: "El retiro en local no está disponible" };
      }
      const pickupIssues = await getPickupLocalStockIssuesForCart(draft.cartId);
      if (pickupIssues.length > 0) {
        const issue = pickupIssues[0];
        return {
          success: false,
          error: `Stock local insuficiente para "${issue.title} · ${issue.variantTitle}" (disponible ${issue.available}, pedido ${issue.requested}).`,
        };
      }
    }

    const shippingAmount =
      selectedMethod.type === "pickup"
        ? 0
        : calculateShippingAmount(selectedMethod, draft.subtotal);
    const shippingEstimate = formatShippingEstimate(selectedMethod);
    const total = draft.subtotal + shippingAmount;

    await prisma.checkoutDraft.update({
      where: { id: draftId },
      data: {
        shippingMethodId: selectedMethod.id,
        shippingMethodLabel: selectedMethod.name,
        shippingCarrier: selectedMethod.carrier,
        shippingAmount,
        shippingEstimate,
        total
      }
    });

    revalidatePath(storePath(draft.store.slug, "checkout"));
    
    return { success: true };
  } catch (err: any) {
    console.error("[updateCheckoutShippingMethod] Error:", err);
    return { success: false, error: "Grave error al actualizar envío" };
  }
}
