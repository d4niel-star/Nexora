import { prisma } from "@/lib/db/prisma";

export interface StockCheckResult {
  hasStock: boolean;
  available: number;
  allowBackorder: boolean;
}

export async function checkVariantStock(variantId: string, requestedQuantity: number): Promise<StockCheckResult> {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { stock: true, reservedStock: true, trackInventory: true, allowBackorder: true }
  });

  if (!variant) {
    return { hasStock: false, available: 0, allowBackorder: false };
  }

  if (!variant.trackInventory) {
    return { hasStock: true, available: Infinity, allowBackorder: true };
  }

  const available = variant.stock - variant.reservedStock;
  const hasStock = variant.allowBackorder || available >= requestedQuantity;

  return { hasStock, available, allowBackorder: variant.allowBackorder };
}

export async function validateCartItemsStock(cartItems: { variantId: string, quantity: number, title: string }[]): Promise<{ valid: boolean, errors: string[] }> {
  const errors: string[] = [];

  for (const item of cartItems) {
    if (!item.variantId) continue;
    const stockResult = await checkVariantStock(item.variantId, item.quantity);
    if (!stockResult.hasStock) {
      if (stockResult.available > 0) {
         errors.push(`Solo quedan ${stockResult.available} unidades de ${item.title}.`);
      } else {
         errors.push(`${item.title} no tiene stock disponible.`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
