import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { CartStockIssue } from "@/types/cart";

type Tx = Prisma.TransactionClient;

type PickupStockItem = {
  productId: string | null;
  variantId: string | null;
  titleSnapshot: string;
  variantTitleSnapshot: string;
  quantity: number;
};

type AggregatedPickupItem = {
  productId: string | null;
  variantId: string;
  title: string;
  variantTitle: string;
  quantity: number;
};

export class PickupLocalStockError extends Error {
  constructor(
    message: string,
    public readonly issues: CartStockIssue[],
  ) {
    super(message);
    this.name = "PickupLocalStockError";
  }
}

function aggregateItems(items: PickupStockItem[]): AggregatedPickupItem[] {
  const byVariant = new Map<string, AggregatedPickupItem>();

  for (const item of items) {
    if (!item.variantId) continue;

    const existing = byVariant.get(item.variantId);
    if (existing) {
      existing.quantity += item.quantity;
      continue;
    }

    byVariant.set(item.variantId, {
      productId: item.productId,
      variantId: item.variantId,
      title: item.titleSnapshot,
      variantTitle: item.variantTitleSnapshot,
      quantity: item.quantity,
    });
  }

  return Array.from(byVariant.values());
}

function formatIssueMessage(issues: CartStockIssue[]): string {
  const first = issues[0];
  if (!first) return "Stock local insuficiente para retiro.";
  return `Stock local insuficiente para "${first.title} · ${first.variantTitle}" (disponible ${first.available}, pedido ${first.requested}).`;
}

async function getLocationForPickup(
  tx: Tx,
  storeId: string,
): Promise<{ id: string; pickupEnabled: boolean } | null> {
  return tx.storeLocation.findUnique({
    where: { storeId },
    select: { id: true, pickupEnabled: true },
  });
}

export async function getPickupLocalStockIssuesForCart(
  cartId: string,
): Promise<CartStockIssue[]> {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: { items: true },
  });

  if (!cart || cart.status !== "active") return [];

  const location = await prisma.storeLocation.findUnique({
    where: { storeId: cart.storeId },
    select: { id: true, pickupEnabled: true },
  });

  if (!location || !location.pickupEnabled) {
    return cart.items.map((item) => ({
      itemId: item.id,
      title: item.titleSnapshot,
      variantTitle: item.variantTitleSnapshot,
      requested: item.quantity,
      available: 0,
    }));
  }

  return getPickupLocalStockIssuesForItems(prisma, {
    storeId: cart.storeId,
    locationId: location.id,
    items: cart.items,
  });
}

async function getPickupLocalStockIssuesForItems(
  client: Tx | typeof prisma,
  params: {
    storeId: string;
    locationId: string;
    items: PickupStockItem[];
  },
): Promise<CartStockIssue[]> {
  const aggregated = aggregateItems(params.items);
  if (aggregated.length === 0) return [];

  const variants = await client.productVariant.findMany({
    where: {
      id: { in: aggregated.map((item) => item.variantId) },
      product: { storeId: params.storeId },
    },
    select: {
      id: true,
      localInventories: {
        where: {
          storeId: params.storeId,
          locationId: params.locationId,
        },
        select: { stock: true },
        take: 1,
      },
    },
  });

  const stockByVariant = new Map(
    variants.map((variant) => [
      variant.id,
      variant.localInventories[0]?.stock ?? 0,
    ] as const),
  );

  const validVariantIds = new Set(variants.map((variant) => variant.id));
  const issues: CartStockIssue[] = [];

  for (const item of aggregated) {
    const available = validVariantIds.has(item.variantId)
      ? (stockByVariant.get(item.variantId) ?? 0)
      : 0;

    if (available < item.quantity) {
      issues.push({
        itemId: item.variantId,
        title: item.title,
        variantTitle: item.variantTitle,
        requested: item.quantity,
        available,
      });
    }
  }

  return issues;
}

export async function commitPickupLocalStockForOrderTx(
  tx: Tx,
  params: {
    storeId: string;
    locationId: string;
    orderId: string;
    orderNumber: string;
    items: PickupStockItem[];
    source: string;
  },
): Promise<void> {
  const location = await getLocationForPickup(tx, params.storeId);
  if (!location || !location.pickupEnabled || location.id !== params.locationId) {
    throw new Error("El retiro en local ya no está disponible.");
  }

  const issues = await getPickupLocalStockIssuesForItems(tx, {
    storeId: params.storeId,
    locationId: params.locationId,
    items: params.items,
  });

  if (issues.length > 0) {
    throw new PickupLocalStockError(formatIssueMessage(issues), issues);
  }

  const aggregated = aggregateItems(params.items);

  for (const item of aggregated) {
    const result = await tx.localInventory.updateMany({
      where: {
        storeId: params.storeId,
        locationId: params.locationId,
        variantId: item.variantId,
        stock: { gte: item.quantity },
      },
      data: { stock: { decrement: item.quantity } },
    });

    if (result.count === 0) {
      const current = await tx.localInventory.findUnique({
        where: {
          locationId_variantId: {
            locationId: params.locationId,
            variantId: item.variantId,
          },
        },
        select: { stock: true },
      });
      const issue = {
        itemId: item.variantId,
        title: item.title,
        variantTitle: item.variantTitle,
        requested: item.quantity,
        available: current?.stock ?? 0,
      };
      throw new PickupLocalStockError(formatIssueMessage([issue]), [issue]);
    }
  }

  await tx.systemEvent.create({
    data: {
      storeId: params.storeId,
      entityType: "order",
      entityId: params.orderId,
      eventType: "pickup_local_stock_decremented",
      severity: "info",
      source: params.source,
      message: `Stock local descontado para pedido pickup ${params.orderNumber}.`,
      metadataJson: JSON.stringify({
        locationId: params.locationId,
        items: aggregated.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          title: item.title,
          variantTitle: item.variantTitle,
        })),
      }),
    },
  });
}

export async function restorePickupLocalStockForOrder(
  orderId: string,
  reason: string,
  source = "system",
): Promise<boolean> {
  return prisma.$transaction((tx) =>
    restorePickupLocalStockForOrderTx(tx, { orderId, reason, source }),
  );
}

export async function restorePickupLocalStockForOrderTx(
  tx: Tx,
  params: {
    orderId: string;
    reason: string;
    source: string;
  },
): Promise<boolean> {
  const order = await tx.order.findUnique({
    where: { id: params.orderId },
    include: { items: true },
  });

  if (!order) return false;

  const committed = await tx.systemEvent.findFirst({
    where: {
      storeId: order.storeId,
      entityType: "order",
      entityId: order.id,
      eventType: "pickup_local_stock_decremented",
    },
    select: { id: true },
  });

  if (!committed) return false;

  const alreadyRestored = await tx.systemEvent.findFirst({
    where: {
      storeId: order.storeId,
      entityType: "order",
      entityId: order.id,
      eventType: "pickup_local_stock_restored",
    },
    select: { id: true },
  });

  if (alreadyRestored) return false;

  const location = await tx.storeLocation.findUnique({
    where: { storeId: order.storeId },
    select: { id: true },
  });

  if (!location) return false;

  const aggregated = aggregateItems(order.items);

  for (const item of aggregated) {
    await tx.localInventory.upsert({
      where: {
        locationId_variantId: {
          locationId: location.id,
          variantId: item.variantId,
        },
      },
      update: { stock: { increment: item.quantity } },
      create: {
        storeId: order.storeId,
        locationId: location.id,
        variantId: item.variantId,
        stock: item.quantity,
        lowStockThreshold: 2,
      },
    });
  }

  await tx.systemEvent.create({
    data: {
      storeId: order.storeId,
      entityType: "order",
      entityId: order.id,
      eventType: "pickup_local_stock_restored",
      severity: "info",
      source: params.source,
      message: `Stock local restaurado para pedido pickup ${order.orderNumber}.`,
      metadataJson: JSON.stringify({
        reason: params.reason,
        locationId: location.id,
        items: aggregated.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          title: item.title,
          variantTitle: item.variantTitle,
        })),
      }),
    },
  });

  return true;
}
