import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { PLAN_DEFINITIONS } from "@/lib/billing/plans";
import { sendDunningEmail } from "@/lib/billing/dunning";
import { logSystemEvent } from "@/lib/observability/audit";

// ─── Dunning Cron ───
// Runs periodically (e.g., every 4 hours via external cron or Vercel cron).
// Finds subscriptions in `past_due` or `unpaid` state and sends appropriate
// dunning emails. All sends are idempotent via EmailLog — a subscription
// only receives one email per dunning type per billing cycle.
//
// This cron does NOT auto-cancel or auto-suspend. It only communicates.
// State transitions are handled by the billing webhook when MP reports
// payment outcomes.
//
// Protection: requires header `x-cron-secret` matching `CRON_SECRET`.
// If `CRON_SECRET` is unset, the endpoint responds 503 to prevent
// open access.

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // ─── Auth: fail-closed if CRON_SECRET is not configured ───
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

  try {
    // Find all subscriptions in trouble
    const troubledSubs = await prisma.storeSubscription.findMany({
      where: {
        status: { in: ["past_due", "unpaid"] },
      },
      include: {
        plan: true,
        store: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            owner: { select: { email: true, name: true } },
          },
        },
      },
    });

    let sentCount = 0;
    let skipCount = 0;
    let alreadySentCount = 0;
    let errorCount = 0;

    for (const sub of troubledSubs) {
      const ownerEmail = sub.store.owner?.email;
      if (!ownerEmail) {
        skipCount++;
        continue;
      }

      const planDef = PLAN_DEFINITIONS.find((p) => p.code === sub.plan.code);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const data = {
        storeName: sub.store.name,
        ownerName: sub.store.owner?.name || "",
        planName: planDef?.name || sub.plan.name,
        planPrice: planDef?.monthlyPrice || 0,
        billingUrl: `${appUrl}/admin/billing`,
      };

      // Decide which email to send based on status
      // past_due → payment failed (first dunning touch)
      // unpaid → suspension warning (escalated)
      const eventType =
        sub.status === "past_due"
          ? ("BILLING_PAYMENT_FAILED" as const)
          : ("BILLING_SUSPENSION_WARNING" as const);

      try {
        const result = await sendDunningEmail(
          sub.storeId,
          eventType,
          data,
          ownerEmail,
        );

        if (result === true) {
          sentCount++;
        } else {
          // false = already sent (idempotent skip) or provider unavailable
          alreadySentCount++;
        }
      } catch (err) {
        errorCount++;
        console.error(`[Dunning Cron] Error sending to store ${sub.storeId}:`, err);
      }
    }

    await logSystemEvent({
      storeId: "system",
      entityType: "cron",
      entityId: "dunning-reminders",
      eventType: "dunning_cron_completed",
      source: "cron",
      message: `Dunning cron: ${troubledSubs.length} cuentas en problema, ${sentCount} enviados, ${alreadySentCount} ya enviados, ${skipCount} sin owner, ${errorCount} errores`,
    });

    return NextResponse.json({
      success: true,
      troubled: troubledSubs.length,
      sent: sentCount,
      alreadySent: alreadySentCount,
      skipped: skipCount,
      errors: errorCount,
    });
  } catch (error: any) {
    console.error("[Dunning Cron] Fatal error:", error.message);

    await logSystemEvent({
      storeId: "system",
      entityType: "cron",
      entityId: "dunning-reminders",
      eventType: "dunning_cron_failed",
      severity: "error",
      source: "cron",
      message: `Dunning cron falló: ${error.message}`,
    }).catch(() => {
      /* audit must never break cron response */
    });

    return NextResponse.json(
      { error: "dunning_cron_failed" },
      { status: 500 },
    );
  }
}
