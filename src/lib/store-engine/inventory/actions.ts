import { prisma } from "@/lib/db/prisma";
import { logSystemEvent } from "../../observability/audit";

/**
 * Deducts stock for a specific order. 
 * Must be called exactly ONCE when the order payment is approved.
 * This function is IDEMPOTENT via checking existing StockMovement.
 */
export async function commitOrderStock(orderId: string): Promise<boolean> {
  // Use a transaction to ensure atomicity
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, store: true }
      });

      if (!order || order.status === "cancelled") {
        throw new Error("Order not found or cancelled");
      }

      // Idempotency: Check if there's already a 'sale' movement for this order
      const existingMovement = await tx.stockMovement.findFirst({
        where: { orderId: order.id, type: "sale" }
      });

      if (existingMovement) {
         // Already committed, skip silently to ensure idempotency (e.g. repeated webhook)
         return true;
      }

      for (const item of order.items) {
        if (!item.variantId || !item.productId) continue;

        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId }
        });

        if (!variant || !variant.trackInventory) continue;

        // Create movement record
        await tx.stockMovement.create({
          data: {
            storeId: order.storeId,
            productId: item.productId,
            variantId: item.variantId,
            orderId: order.id,
            type: "sale",
            quantityDelta: -item.quantity,
            reason: `Order ${order.orderNumber} via ${order.channel}`
          }
        });

        // Deduct actual stock
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            stock: { decrement: item.quantity }
          }
        });
      }
    });
    return true;
  } catch (err: any) {
    await logSystemEvent({
      entityType: "order",
      entityId: orderId,
      eventType: "stock_commit_failed",
      severity: "error",
      source: "inventory_action",
      message: `Fallo al descontar stock de orden ${orderId}`,
      metadata: { error: err.message }
    });
    console.error("[commitOrderStock] Failed to commit stock for order", orderId, err);
    return false;
  }
}

/**
 * Validates stock immediately before checkout transition.
 */
export async function revalidateCheckoutStock(cartId: string): Promise<{ success: boolean; error?: string }> {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: { items: true }
  });

  if (!cart) return { success: false, error: "Carrito no encontrado" };

  for (const item of cart.items) {
    if (!item.variantId) continue;
    
    const variant = await prisma.productVariant.findUnique({
      where: { id: item.variantId }
    });

    if (!variant) return { success: false, error: "Producto no encontrado." };
    if (!variant.trackInventory) continue;

    const available = variant.stock - variant.reservedStock;
    if (!variant.allowBackorder && available < item.quantity) {
      return { 
        success: false, 
        error: `Stock insuficiente para ${item.titleSnapshot}. Quedan ${available} unidades.`
      };
    }
  }

  return { success: true };
}

/**
 * Restores stock for a specific order.
 * Must be called when an order is completely cancelled or refunded.
 * This function is IDEMPOTENT via checking existing StockMovement.
 */
export async function restoreOrderStock(
  orderId: string, 
  restoreType: "refund_restore" | "cancellation_restore",
  reason: string = "Order Cancelled / Refunded"
): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true }
      });

      if (!order) {
        throw new Error("Order not found");
      }

      // Check if stock was EVER deducted for this order. 
      // If there are no 'sale' movements, we cannot restore what was never deducted.
      const saleMovement = await tx.stockMovement.findFirst({
        where: { orderId: order.id, type: "sale" }
      });

      if (!saleMovement) {
         // Stock was never deducted (e.g., cancelled while pending payment). Skip silently.
         return true;
      }

      // Idempotency: Check if we ALREADY restored the stock for this order.
      // E.g., we look for any 'refund_restore' or 'cancellation_restore' on this order.
      const existingRestore = await tx.stockMovement.findFirst({
        where: { 
          orderId: order.id, 
          type: { in: ["refund_restore", "cancellation_restore"] } 
        }
      });

      if (existingRestore) {
         // Already restored, skip silently to ensure idempotency.
         return true;
      }

      // Restore the stock
      for (const item of order.items) {
        if (!item.variantId || !item.productId) continue;

        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId }
        });

        if (!variant || !variant.trackInventory) continue;

        // Create restore movement record
        await tx.stockMovement.create({
          data: {
            storeId: order.storeId,
            productId: item.productId,
            variantId: item.variantId,
            orderId: order.id,
            type: restoreType,
            quantityDelta: item.quantity, // Positive delta adds stock back
            reason
          }
        });

        // Add back actual stock
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            stock: { increment: item.quantity }
          }
        });
      }
    });
    
    await logSystemEvent({
      entityType: "order",
      entityId: orderId,
      eventType: "stock_restored",
      severity: "info",
      source: "inventory_action",
      message: `Stock restaurado exitosamente para orden ${orderId}`,
      metadata: { restoreType }
    });

    return true;
  } catch (err: any) {
    await logSystemEvent({
      entityType: "order",
      entityId: orderId,
      eventType: "stock_restore_failed",
      severity: "error",
      source: "inventory_action",
      message: `Fallo al devolver stock de orden ${orderId}`,
      metadata: { error: err.message, restoreType }
    });
    console.error("[restoreOrderStock] Failed to restore stock for order", orderId, err);
    return false;
  }
}
