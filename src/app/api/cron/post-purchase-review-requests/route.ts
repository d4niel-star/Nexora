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

  // All tenants that installed+activated the app and enabled AT LEAST ONE
  // flow. Each flow is evaluated independently per order below.
  const settings = await prisma.postPurchaseFlowsSettings.findMany({
    where: {
      OR: [
        { reviewRequestEnabled: true },
        { reorderFollowupEnabled: true },
      ],
    },
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
          subscription: {
            select: {
              status: true,
              plan: { select: { configJson: true } }
            }
          }
        },
      },
    },
  });

  const tenants = settings.filter((s) => {
    if (s.store.installedApps[0]?.status !== "active") return false;
    const sub = s.store.subscription;
    if (!sub || (sub.status !== "active" && sub.status !== "trialing")) return false;
    if (!sub.plan) return false;
    const config = JSON.parse(sub.plan.configJson);
    return config.postPurchaseFlows === true;
  });

  let scanned = 0;
  let reviewSent = 0;
  let reorderSent = 0;
  let skipped = 0;

  // Per-flow config bundle: eventType + delay + CTA URL + flag on the row.
  // The loop walks each enabled flow for the tenant. eventType uniqueness
  // on EmailLog(eventType, entityType, entityId) keeps both flows fully
  // independent — the same order can receive review-request at day 7 and
  // reorder-followup at day 30 without any collision.
  type FlowDef = {
    key: "review" | "reorder";
    eventType: "POST_PURCHASE_REVIEW_REQUEST" | "POST_PURCHASE_REORDER_FOLLOWUP";
    delayDays: number;
    enabled: boolean;
    buildStatusUrl: (slug: string, orderNumber: string, email: string) => string;
  };

  for (const cfg of tenants) {
    const flows: FlowDef[] = [
      {
        key: "review",
        eventType: "POST_PURCHASE_REVIEW_REQUEST",
        delayDays: cfg.reviewRequestDelayDays,
        enabled: cfg.reviewRequestEnabled,
        buildStatusUrl: (slug, num, email) =>
          `${appUrl}${storePath(slug, "/tracking")}?order=${num}&email=${encodeURIComponent(email)}`,
      },
      {
        key: "reorder",
        eventType: "POST_PURCHASE_REORDER_FOLLOWUP",
        delayDays: cfg.reorderFollowupDelayDays,
        enabled: cfg.reorderFollowupEnabled,
        // Honest CTA: storefront home. No fake recommendations.
        buildStatusUrl: (slug) => `${appUrl}${storePath(slug)}`,
      },
    ];

    for (const flow of flows) {
      if (!flow.enabled) continue;

      const cutoff = new Date(Date.now() - flow.delayDays * 24 * 60 * 60 * 1000);

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
        // Scoped by eventType so each flow tracks its own "already sent".
        const existing = await prisma.emailLog.findUnique({
          where: {
            eventType_entityType_entityId: {
              eventType: flow.eventType,
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
        const statusUrl = flow.buildStatusUrl(
          cfg.store.slug,
          order.orderNumber,
          order.email,
        );

        const ok = await sendEmailEvent({
          storeId: cfg.storeId,
          eventType: flow.eventType,
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

        if (ok) {
          if (flow.key === "review") reviewSent++;
          else reorderSent++;
        } else {
          skipped++;
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    tenantsEvaluated: tenants.length,
    scanned,
    sent: reviewSent + reorderSent,
    reviewSent,
    reorderSent,
    skipped,
  });
}

export async function GET() {
  return NextResponse.json({ status: "cron_post_purchase_review_requests_active" });
}
