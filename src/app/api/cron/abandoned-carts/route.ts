// ─── Abandoned-cart recovery cron ───
// Finds active carts with items whose checkout captured an email but were
// inactive for more than `ABANDONED_CART_THRESHOLD_MINUTES` (default 120 min),
// sends a one-shot recovery email, and flips the cart status to "abandoned"
// so we never re-process the same cart.
//
// Protection: requires header `x-cron-secret` matching `CRON_SECRET`.
// If `CRON_SECRET` is unset, the endpoint responds 503 to prevent accidental
// open access. Configure Render / GitHub Actions / any cron service to POST
// here every 15–30 minutes.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getEmailProvider } from "@/lib/email/providers";
import { generateAbandonedCartTemplate } from "@/lib/email/templates";
import type { AbandonedCartEmailData } from "@/lib/email/types";
import { logSystemEvent } from "@/lib/observability/audit";
import { storePath } from "@/lib/store-engine/urls";

export const runtime = "nodejs";

const DEFAULT_THRESHOLD_MINUTES = 120;

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "cron_secret_not_configured" },
      { status: 503 },
    );
  }

  const provided = request.headers.get("x-cron-secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const thresholdMinutes = Number.parseInt(
    process.env.ABANDONED_CART_THRESHOLD_MINUTES ?? "",
    10,
  ) || DEFAULT_THRESHOLD_MINUTES;

  const cutoff = new Date(Date.now() - thresholdMinutes * 60 * 1000);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const provider = getEmailProvider();

  // Active carts idle past the cutoff with at least 1 item and a checkout email.
  const candidates = await prisma.cart.findMany({
    where: {
      status: "active",
      updatedAt: { lt: cutoff },
      items: { some: {} },
      checkouts: {
        some: {
          email: { not: null },
          status: { not: "completed" },
        },
      },
    },
    include: {
      items: true,
      store: { select: { id: true, name: true, slug: true, currency: true } },
      checkouts: {
        where: { email: { not: null }, status: { not: "completed" } },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
    take: 100, // hard cap per run
  });

  let sent = 0;
  let skipped = 0;

  for (const cart of candidates) {
    const checkout = cart.checkouts[0];
    if (!checkout?.email) {
      skipped++;
      continue;
    }

    // Idempotency: one ABANDONED_CART email per cart lifetime.
    const existing = await prisma.emailLog.findUnique({
      where: {
        eventType_entityType_entityId: {
          eventType: "ABANDONED_CART",
          entityType: "cart",
          entityId: cart.id,
        },
      },
    });
    if (existing && existing.status === "sent") {
      skipped++;
      continue;
    }

    const log = await prisma.emailLog.upsert({
      where: {
        eventType_entityType_entityId: {
          eventType: "ABANDONED_CART",
          entityType: "cart",
          entityId: cart.id,
        },
      },
      update: { status: "pending", errorMessage: null },
      create: {
        storeId: cart.storeId,
        eventType: "ABANDONED_CART",
        entityType: "cart",
        entityId: cart.id,
        recipient: checkout.email,
        status: "pending",
        provider: provider.name,
      },
    });

    const subtotal = cart.items.reduce(
      (acc, item) => acc + item.priceSnapshot * item.quantity,
      0,
    );

    const data: AbandonedCartEmailData = {
      storeSlug: cart.store.slug,
      storeName: cart.store.name,
      customerName: checkout.firstName?.trim() || "",
      cartItems: cart.items.map((it) => ({
        title: it.titleSnapshot,
        variantTitle: it.variantTitleSnapshot || null,
        quantity: it.quantity,
        price: it.priceSnapshot,
        image: it.imageSnapshot || null,
      })),
      subtotal,
      currency: cart.currency,
      recoveryUrl: `${appUrl}${storePath(cart.store.slug, "/cart")}`,
    };

    try {
      const result = await provider.send({
        to: checkout.email,
        subject: `Completá tu compra en ${cart.store.name}`,
        html: generateAbandonedCartTemplate(data),
      });

      if (!result.success) throw new Error(result.error || "provider_error");

      await prisma.$transaction([
        prisma.emailLog.update({
          where: { id: log.id },
          data: { status: "sent", sentAt: new Date(), errorMessage: null },
        }),
        prisma.cart.update({
          where: { id: cart.id },
          data: { status: "abandoned" },
        }),
      ]);
      sent++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: "failed", errorMessage: message.slice(0, 500) },
      });
      await logSystemEvent({
        storeId: cart.storeId,
        entityType: "cart",
        entityId: cart.id,
        eventType: "abandoned_cart_email_failed",
        severity: "warn",
        source: "cron_abandoned_carts",
        message: `ABANDONED_CART email failed for cart ${cart.id}`,
        metadata: { error: message },
      });
      skipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: candidates.length,
    sent,
    skipped,
    thresholdMinutes,
  });
}

export async function GET() {
  return NextResponse.json({ status: "cron_abandoned_carts_active" });
}
