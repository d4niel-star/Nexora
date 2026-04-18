// ─── Stock-Critical Email Event ───
// Sends a one-time alert to the store owner when a variant drops to or below
// its reorderPoint after a sale commits. Idempotency key is (variantId, orderId)
// so we alert once per order that tipped the stock over — not once forever.

import { prisma } from "@/lib/db/prisma";
import { getEmailProvider } from "../providers";
import { generateStockCriticalTemplate } from "../templates";
import type { StockCriticalEmailData } from "../types";
import { logSystemEvent } from "@/lib/observability/audit";

interface TriggerStockCriticalParams {
  storeId: string;
  variantId: string;
  orderId: string;
}

/**
 * Called from the stock-commit path right after a successful sale decrement.
 * No-op if the variant is still healthy, if tracking is off, or if we already
 * alerted for this (variantId, orderId) pair.
 */
export async function triggerStockCriticalIfNeeded(
  params: TriggerStockCriticalParams,
): Promise<void> {
  const { storeId, variantId, orderId } = params;

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: {
      product: {
        select: {
          title: true,
          store: { select: { name: true, slug: true, ownerId: true } },
        },
      },
    },
  });

  if (!variant || !variant.trackInventory) return;
  if (variant.reorderPoint === null || variant.reorderPoint === undefined) return;
  if (variant.stock > variant.reorderPoint) return; // still healthy

  // Resolve the owner's email. Prefer the store.owner relation; fall back to
  // any linked user. If neither yields a valid address we silently skip —
  // we never invent a recipient.
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      owner: { select: { email: true } },
      users: { select: { email: true }, take: 1 },
    },
  });

  const ownerEmail =
    store?.owner?.email ||
    store?.users?.[0]?.email ||
    null;
  if (!ownerEmail) return;

  // Idempotency: (STOCK_CRITICAL, variant, "{variantId}:{orderId}")
  const entityId = `${variantId}:${orderId}`;
  const existing = await prisma.emailLog.findUnique({
    where: {
      eventType_entityType_entityId: {
        eventType: "STOCK_CRITICAL",
        entityType: "variant",
        entityId,
      },
    },
  });
  if (existing && existing.status === "sent") return;

  const provider = getEmailProvider();

  const log = await prisma.emailLog.upsert({
    where: {
      eventType_entityType_entityId: {
        eventType: "STOCK_CRITICAL",
        entityType: "variant",
        entityId,
      },
    },
    update: { status: "pending", errorMessage: null },
    create: {
      storeId,
      eventType: "STOCK_CRITICAL",
      entityType: "variant",
      entityId,
      recipient: ownerEmail,
      status: "pending",
      provider: provider.name,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const data: StockCriticalEmailData = {
    storeSlug: store?.slug ?? "",
    storeName: variant.product.store.name,
    productTitle: variant.product.title,
    variantTitle: variant.title || null,
    sku: variant.sku || null,
    currentStock: variant.stock,
    reorderPoint: variant.reorderPoint,
    inventoryUrl: `${appUrl.replace(/\/$/, "")}/admin/inventory`,
  };

  try {
    const result = await provider.send({
      to: ownerEmail,
      subject: `Stock crítico: ${variant.product.title}${variant.title ? ` · ${variant.title}` : ""}`,
      html: generateStockCriticalTemplate(data),
    });

    if (result.success) {
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: "sent", sentAt: new Date(), errorMessage: null },
      });
    } else {
      throw new Error(result.error || "Unknown provider error");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: "failed", errorMessage: message.slice(0, 500) },
    });
    await logSystemEvent({
      storeId,
      entityType: "email",
      entityId,
      eventType: "email_failed",
      severity: "warn",
      source: "email_service",
      message: `STOCK_CRITICAL email failed for variant ${variantId}`,
      metadata: { error: message },
    });
  }
}
