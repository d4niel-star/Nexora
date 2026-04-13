import { prisma } from "@/lib/db/prisma";
import { LogEventParams } from "@/lib/observability/audit";

const MP_API_BASE = "https://api.mercadopago.com";

// Use billing-specific token if provided, default to main one.
function getAccessToken(): string {
  const token = process.env.MERCADOPAGO_BILLING_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || "TEST-8903332800366432-040810-7b561c21051512dbfe74204d80a31d92-231362";
  return token;
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function createBillingPaymentIntent(storeId: string, type: "plan_upgrade" | "credit_pack", amount: number, title: string, metadata: any = {}) {
  const externalReference = crypto.randomUUID();

  const transaction = await prisma.billingTransaction.create({
    data: {
      storeId,
      type,
      amount,
      externalReference,
      status: "pending",
      planId: metadata.planId,
      creditAmount: metadata.creditAmount,
      metadataJson: JSON.stringify(metadata)
    }
  });

  const returnUrlBase = metadata.returnUrlBase || `${getAppUrl()}/admin/billing`;
  const payload = {
    items: [
       {
          id: type,
          title: title || "Servicio Nexora",
          quantity: 1,
          unit_price: amount,
          currency_id: "ARS",
       }
    ],
    external_reference: externalReference,
    back_urls: {
       success: `${returnUrlBase}?payment=success&tx=${transaction.id}`,
       failure: `${returnUrlBase}?payment=failure&tx=${transaction.id}`,
       pending: `${returnUrlBase}?payment=pending&tx=${transaction.id}`,
    },
    auto_return: "approved",
    notification_url: `${getAppUrl()}/api/webhooks/billing`
  };

  const res = await fetch(`${MP_API_BASE}/checkout/preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
     const text = await res.text();
     console.error("MercadoPago Billing Error:", text);
     throw new Error("Failed to create billing preference");
  }

  const preference = await res.json();

  await prisma.billingTransaction.update({
    where: { id: transaction.id },
    data: { externalPreferenceId: preference.id }
  });

  return preference.init_point || null;
}
