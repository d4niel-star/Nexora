import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { logSystemEvent } from "@/lib/observability/audit";
import { upgradePlan } from "@/lib/billing/service";
import { PLAN_DEFINITIONS } from "@/lib/billing/plans";
import { sendDunningEmail, clearDunningEmails } from "@/lib/billing/dunning";
import {
  getMpAccessToken,
  getMpWebhookSecret,
  MissingMpAccessTokenError,
} from "@/lib/billing/mp-env";

const MP_API_BASE = "https://api.mercadopago.com";

// ─── MP x-signature verification (best-effort) ───
// MP sends "x-signature: ts=<unix>,v1=<hex-hmac>" and "x-request-id".
// When MERCADOPAGO_WEBHOOK_SECRET is configured we validate the HMAC the
// same way the MP documentation describes. When the secret is absent we
// skip verification (the webhook still re-fetches the payment from MP's
// API before mutating anything, which is the real trust boundary).
function verifyMpSignature(
  request: Request,
  paymentId: string,
): { ok: true } | { ok: false; reason: string } {
  const secret = getMpWebhookSecret();
  if (!secret) return { ok: true };

  const header = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id") || "";
  if (!header) return { ok: false, reason: "missing_x_signature" };

  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, ...rest] = p.trim().split("=");
      return [k, rest.join("=")];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return { ok: false, reason: "malformed_x_signature" };

  const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_x_signature" };
  }
  return { ok: true };
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const body = await req.json().catch(() => ({}));

    // Detect IPN vs Webhook id format
    let paymentIdStr = searchParams.get("data.id") || body?.data?.id || searchParams.get("id");
    if (!paymentIdStr) return NextResponse.json({ success: true }); // Acknowledge other topics

    const paymentId = parseInt(paymentIdStr, 10);

    // H5 — signature check (best-effort; only when secret is configured)
    const sig = verifyMpSignature(req, String(paymentIdStr));
    if (!sig.ok) {
      await logSystemEvent({
        storeId: "system",
        entityType: "webhook",
        entityId: "mp_billing",
        eventType: "mp_webhook_signature_rejected",
        severity: "warn",
        source: "mercadopago_webhook",
        message: `MP webhook signature rejected: ${sig.reason}`,
        metadata: { paymentId: paymentIdStr, reason: sig.reason },
      }).catch(() => {});
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // H1 — fail-closed if MP credentials missing
    let accessToken: string;
    try {
      accessToken = getMpAccessToken();
    } catch (e) {
      if (e instanceof MissingMpAccessTokenError) {
        await logSystemEvent({
          storeId: "system",
          entityType: "webhook",
          entityId: "mp_billing",
          eventType: "mp_webhook_missing_token",
          severity: "error",
          source: "mercadopago_webhook",
          message: "MP webhook received but access token env is not set — cannot process",
          metadata: { paymentId: paymentIdStr },
        }).catch(() => {});
        // Return 500 so MP retries — misconfiguration is not the
        // merchant's payment failing.
        return NextResponse.json(
          { error: "mp_token_not_configured" },
          { status: 500 },
        );
      }
      throw e;
    }

    // Fetch payment from MP
    const res = await fetch(`${MP_API_BASE}/v1/payments/${paymentId}`, {
       headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
       // H4 — do NOT silently 200. Log and signal failure so MP retries.
       await logSystemEvent({
         storeId: "system",
         entityType: "webhook",
         entityId: "mp_billing",
         eventType: "mp_webhook_fetch_failed",
         severity: "warn",
         source: "mercadopago_webhook",
         message: `MP API returned ${res.status} for payment ${paymentId}`,
         metadata: { paymentId: paymentIdStr, status: res.status },
       }).catch(() => {});
       // 404 from MP means the payment id isn't ours (e.g. topic mismatch);
       // acknowledge without retry. Everything else gets retried.
       if (res.status === 404) return NextResponse.json({ success: true });
       return NextResponse.json({ error: "mp_fetch_failed" }, { status: 502 });
    }

    const paymentInfo = await res.json();

    if (!paymentInfo || !paymentInfo.external_reference) {
       return NextResponse.json({ success: true }); // Probably not ours
    }

    // Find the tx
    const tx = await prisma.billingTransaction.findFirst({
       where: { externalReference: paymentInfo.external_reference }
    });

    if (!tx) {
       return NextResponse.json({ success: true }); // Not found
    }

    // ─── Handle approved payments ───
    if (paymentInfo.status === "approved") {
      if (tx.status === "approved") {
        return NextResponse.json({ success: true }); // Already processed
      }

      await prisma.billingTransaction.update({
         where: { id: tx.id },
         data: {
            status: "approved",
            externalPaymentId: paymentId.toString(),
            completedAt: new Date()
         }
      });

      if (tx.type === "plan_upgrade" && tx.planId) {
         // This transitions subscription to active
         await upgradePlan(tx.storeId, tx.planId);
         
         await logSystemEvent({
            storeId: tx.storeId,
            entityType: "BillingTransaction",
            entityId: tx.id,
            eventType: "billing_plan_upgraded",
            source: "mercadopago_webhook",
            message: `Plan actualizado exitosamente a ${tx.planId} vía MP pago #${paymentId}`
         });

         // ─── Dunning: send reactivation email + clear dunning state ───
         await clearDunningEmails(tx.storeId);
         await sendReactivationEmail(tx.storeId, tx.planId);
      }

      if (tx.type === "credit_pack" && tx.creditAmount) {
         await prisma.storeCreditBalance.upsert({
            where: { storeId: tx.storeId },
            create: { storeId: tx.storeId, paidCredits: tx.creditAmount },
            update: { paidCredits: { increment: tx.creditAmount } }
         });

         await prisma.creditTransaction.create({
            data: {
               storeId: tx.storeId,
               type: "grant_paid",
               amount: tx.creditAmount,
               source: "purchase",
               referenceId: tx.id,
               metadataJson: JSON.stringify({ paymentId })
            }
         });

         await logSystemEvent({
            storeId: tx.storeId,
            entityType: "BillingTransaction",
            entityId: tx.id,
            eventType: "billing_credits_purchased",
            source: "mercadopago_webhook",
            message: `Adquisición de ${tx.creditAmount} créditos adicionales vía MP pago #${paymentId}`
         });
      }

      return NextResponse.json({ success: true });
    }

    // ─── Handle failed/rejected payments ───
    if (paymentInfo.status === "rejected" || paymentInfo.status === "cancelled") {
      if (tx.status === "approved") {
        return NextResponse.json({ success: true }); // Already succeeded, ignore late failure
      }

      await prisma.billingTransaction.update({
        where: { id: tx.id },
        data: {
          status: "failed",
          externalPaymentId: paymentId.toString(),
          metadataJson: JSON.stringify({
            ...JSON.parse(tx.metadataJson || "{}"),
            failureReason: paymentInfo.status_detail || paymentInfo.status,
          }),
        },
      });

      // Transition subscription to past_due if it was active
      if (tx.type === "plan_upgrade") {
        const sub = await prisma.storeSubscription.findUnique({
          where: { storeId: tx.storeId },
        });

        if (sub && (sub.status === "active" || sub.status === "trialing")) {
          await prisma.storeSubscription.update({
            where: { storeId: tx.storeId },
            data: { status: "past_due" },
          });

          await logSystemEvent({
            storeId: tx.storeId,
            entityType: "StoreSubscription",
            entityId: sub.id,
            eventType: "billing_payment_failed",
            severity: "warn",
            source: "mercadopago_webhook",
            message: `Pago rechazado (#${paymentId}). Suscripción transicionada a past_due.`,
            metadata: { reason: paymentInfo.status_detail },
          });
        }
      }

      return NextResponse.json({ success: true });
    }

    // For pending or other statuses, just acknowledge
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Billing Webhook Error:", error.message);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

// ─── Helper: send reactivation email ───

async function sendReactivationEmail(storeId: string, planId: string) {
  try {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        name: true,
        owner: { select: { email: true, name: true } },
      },
    });

    if (!store?.owner?.email) return;

    const planDef = PLAN_DEFINITIONS.find((p) => p.code === planId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    await sendDunningEmail(storeId, "BILLING_REACTIVATED", {
      storeName: store.name,
      ownerName: store.owner.name || "",
      planName: planDef?.name || planId,
      planPrice: planDef?.monthlyPrice || 0,
      billingUrl: `${appUrl}/admin/billing`,
    }, store.owner.email);
  } catch (error: any) {
    // Non-critical: log but don't fail the webhook
    console.error("[Webhook] Failed to send reactivation email:", error.message);
  }
}

