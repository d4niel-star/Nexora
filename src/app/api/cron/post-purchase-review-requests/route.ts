// ─── Post-purchase review request cron ───
// Finds delivered orders past the tenant's configured delay whose review
// request email has not been sent, and dispatches a single email per
// order. Uses sendEmailEvent for idempotency via EmailLog and reuses the
// same x-cron-secret protection as the abandoned-cart cron.

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { sendEmailEvent } from "@/lib/email/events";
import { storePath } from "@/lib/store-engine/urls";

export const runtime = "nodejs";

const HARD_CAP_PER_RUN = 200;

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

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );

  // All tenants that installed+activated the app and enabled the flow.
  const settings = await prisma.postPurchaseFlowsSettings.findMany({
    where: { reviewRequestEnabled: true },
    include: {
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          installedApps: {
            where: { appSlug: "post-purchase-flows" },
            select: { status: true },
          },
        },
      },
    },
  });

  const tenants = settings.filter(
    (s) => s.store.installedApps[0]?.status === "active",
  );

  let scanned = 0;
  let sent = 0;
  let skipped = 0;

  for (const cfg of tenants) {
    const cutoff = new Date(
      Date.now() - cfg.reviewRequestDelayDays * 24 * 60 * 60 * 1000,
    );

    const orders = await prisma.order.findMany({
      where: {
        storeId: cfg.storeId,
        deliveredAt: { lte: cutoff, not: null },
        email: { not: "" },
      },
      orderBy: { deliveredAt: "asc" },
      take: HARD_CAP_PER_RUN,
      select: {
        id: true,
        storeId: true,
        orderNumber: true,
        email: true,
        firstName: true,
        lastName: true,
        subtotal: true,
        shippingAmount: true,
        total: true,
        currency: true,
        shippingMethodLabel: true,
        trackingUrl: true,
        trackingCode: true,
      },
    });

    for (const order of orders) {
      scanned++;

      // Idempotency ships via EmailLog inside sendEmailEvent, but also
      // short-circuit here so we don't do template work if already sent.
      const existing = await prisma.emailLog.findUnique({
        where: {
          eventType_entityType_entityId: {
            eventType: "POST_PURCHASE_REVIEW_REQUEST",
            entityType: "order",
            entityId: order.id,
          },
        },
      });
      if (existing && existing.status === "sent") {
        skipped++;
        continue;
      }

      const customerName = order.firstName?.trim() || "cliente";
      const statusUrl = `${appUrl}${storePath(cfg.store.slug, "/tracking")}?order=${order.orderNumber}&email=${encodeURIComponent(
        order.email,
      )}`;

      const ok = await sendEmailEvent({
        storeId: cfg.storeId,
        eventType: "POST_PURCHASE_REVIEW_REQUEST",
        entityType: "order",
        entityId: order.id,
        recipient: order.email,
        data: {
          storeSlug: cfg.store.slug,
          storeName: cfg.store.name,
          customerName,
          orderNumber: order.orderNumber,
          orderId: order.id,
          subtotal: order.subtotal,
          shippingAmount: order.shippingAmount,
          total: order.total,
          currency: order.currency,
          shippingMethodLabel: order.shippingMethodLabel ?? undefined,
          trackingUrl: order.trackingUrl ?? undefined,
          trackingCode: order.trackingCode ?? undefined,
          statusUrl,
        },
      }).catch(() => false);

      if (ok) sent++;
      else skipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    tenantsEvaluated: tenants.length,
    scanned,
    sent,
    skipped,
  });
}

export async function GET() {
  return NextResponse.json({ status: "cron_post_purchase_review_requests_active" });
}
