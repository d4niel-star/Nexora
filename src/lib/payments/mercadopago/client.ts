/**
 * Mercado Pago REST API client.
 *
 * Storefront checkout uses tenant-owned access tokens. Do not fall back to a
 * global token here: each store must receive payments in its own MP account.
 */

import { storePath } from "@/lib/store-engine/urls";

const MP_API_BASE = "https://api.mercadopago.com";

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

async function mpFetch<T>(
  accessToken: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!accessToken) {
    throw new Error("Mercado Pago access token missing for store.");
  }

  const res = await fetch(`${MP_API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`Mercado Pago API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export interface MPPreferenceItem {
  title: string;
  description?: string;
  picture_url?: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
}

export interface MPPreferenceRequest {
  items: MPPreferenceItem[];
  payer?: {
    name?: string;
    surname?: string;
    email?: string;
    phone?: { number?: string };
    identification?: { type?: string; number?: string };
    address?: { street_name?: string; zip_code?: string };
  };
  back_urls: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return?: "approved" | "all";
  external_reference: string;
  notification_url?: string;
  statement_descriptor?: string;
  metadata?: Record<string, unknown>;
}

export interface MPPreferenceResponse {
  id: string;
  init_point: string;
  sandbox_init_point: string;
  [key: string]: unknown;
}

export interface MPFeeDetail {
  type: string;
  amount: number;
  fee_payer: string;
}

export interface MPPaymentResponse {
  id: number;
  status: string;
  status_detail: string;
  external_reference: string;
  transaction_amount: number;
  transaction_amount_refunded: number;
  net_received_amount: number;
  currency_id: string;
  payment_method_id: string;
  payment_type_id: string;
  installments: number;
  date_approved: string | null;
  fee_details: MPFeeDetail[];
  transaction_details?: {
    net_received_amount: number;
    total_paid_amount: number;
    overpaid_amount: number;
    installment_amount: number;
  };
  payer: {
    email: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export async function createPreference(
  accessToken: string,
  data: MPPreferenceRequest,
): Promise<MPPreferenceResponse> {
  return mpFetch<MPPreferenceResponse>(accessToken, "/checkout/preferences", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getPayment(
  accessToken: string,
  paymentId: string | number,
): Promise<MPPaymentResponse> {
  return mpFetch<MPPaymentResponse>(accessToken, `/v1/payments/${paymentId}`);
}

export async function getPreference(
  accessToken: string,
  preferenceId: string,
): Promise<MPPreferenceResponse> {
  return mpFetch<MPPreferenceResponse>(accessToken, `/checkout/preferences/${preferenceId}`);
}

export async function createRefund(
  accessToken: string,
  paymentId: string | number,
  amount?: number,
  idempotencyKey?: string,
): Promise<{ id: number; status: string; amount: number; [key: string]: unknown }> {
  return mpFetch(accessToken, `/v1/payments/${paymentId}/refunds`, {
    method: "POST",
    headers: idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {},
    body: amount !== undefined ? JSON.stringify({ amount }) : undefined,
  });
}

interface OrderForPreference {
  id: string;
  storeId: string;
  orderNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  document?: string | null;
  total: number;
  currency: string;
  items: {
    titleSnapshot: string;
    variantTitleSnapshot: string;
    imageSnapshot?: string | null;
    quantity: number;
    priceSnapshot: number;
  }[];
}

export async function createPreferenceForOrder(
  accessToken: string,
  order: OrderForPreference,
  storeSlug: string,
): Promise<MPPreferenceResponse> {
  const appUrl = getAppUrl();
  const baseCheckoutUrl = `${appUrl}${storePath(storeSlug, "checkout")}`;
  const notificationUrl = new URL(`${appUrl}/api/store/webhook/mercadopago`);
  notificationUrl.searchParams.set("storeId", order.storeId);

  return createPreference(accessToken, {
    items: order.items.map((item) => ({
      title: item.titleSnapshot,
      description: item.variantTitleSnapshot || undefined,
      picture_url: item.imageSnapshot || undefined,
      quantity: item.quantity,
      unit_price: item.priceSnapshot,
      currency_id: order.currency,
    })),
    payer: {
      name: order.firstName,
      surname: order.lastName,
      email: order.email,
      phone: order.phone ? { number: order.phone } : undefined,
      identification: order.document ? { type: "DNI", number: order.document } : undefined,
    },
    back_urls: {
      success: `${baseCheckoutUrl}/success?orderId=${order.id}`,
      failure: `${baseCheckoutUrl}/failure?orderId=${order.id}`,
      pending: `${baseCheckoutUrl}/pending?orderId=${order.id}`,
    },
    auto_return: "approved",
    external_reference: order.id,
    notification_url: notificationUrl.toString(),
    statement_descriptor: "NEXORA",
    metadata: {
      order_id: order.id,
      order_number: order.orderNumber,
      store_id: order.storeId,
      store_slug: storeSlug,
    },
  });
}
