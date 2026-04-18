"use server";

import { prisma } from "@/lib/db/prisma";
import { getShippingMethods, calculateShippingAmount, formatShippingEstimate } from "./queries";
import { revalidatePath } from "next/cache";
import { storePath } from "@/lib/store-engine/urls";

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

    const shippingAmount = calculateShippingAmount(selectedMethod, draft.subtotal);
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
