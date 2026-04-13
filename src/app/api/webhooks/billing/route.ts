import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logSystemEvent } from "@/lib/observability/audit";
import { upgradePlan } from "@/lib/billing/service";

const MP_API_BASE = "https://api.mercadopago.com";

function getAccessToken(): string {
  return process.env.MERCADOPAGO_BILLING_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || "TEST-8903332800366432-040810-7b561c21051512dbfe74204d80a31d92-231362";
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
    
    // Fetch payment from MP
    const res = await fetch(`${MP_API_BASE}/v1/payments/${paymentId}`, {
       headers: { Authorization: `Bearer ${getAccessToken()}` }
    });

    if (!res.ok) {
       return NextResponse.json({ success: true }); // Let MP retry
    }

    const paymentInfo = await res.json();

    if (!paymentInfo || !paymentInfo.external_reference) {
       return NextResponse.json({ success: true }); // Probably not ours
    }

    if (paymentInfo.status !== "approved") {
       return NextResponse.json({ success: true }); // Wait for approval
    }

    // Find the tx
    const tx = await prisma.billingTransaction.findFirst({
       where: { externalReference: paymentInfo.external_reference }
    });

    if (!tx || tx.status === "approved") {
       return NextResponse.json({ success: true }); // Already processed or not found
    }

    // Acknowledge payment
    await prisma.billingTransaction.update({
       where: { id: tx.id },
       data: {
          status: "approved",
          externalPaymentId: paymentId.toString(),
          completedAt: new Date()
       }
    });

    if (tx.type === "plan_upgrade" && tx.planId) {
       await upgradePlan(tx.storeId, tx.planId);
       
       await logSystemEvent({
          storeId: tx.storeId,
          entityType: "BillingTransaction",
          entityId: tx.id,
          eventType: "billing_plan_upgraded",
          source: "mercadopago_webhook",
          message: `Plan actualizado exitosamente a ${tx.planId} vía MP pago #${paymentId}`
       });
    }

    if (tx.type === "credit_pack" && tx.creditAmount) {
       // Increase credits
       await prisma.storeCreditBalance.upsert({
          where: { storeId: tx.storeId },
          create: { storeId: tx.storeId, paidCredits: tx.creditAmount },
          update: { paidCredits: { increment: tx.creditAmount } }
       });

       // Create history
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
  } catch (error: any) {
    console.error("Billing Webhook Error:", error.message);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
