/**
 * Mercado Pago REST API Client
 * 
 * Uses the Checkout Pro (Preferences) flow via direct REST calls.
 * No SDK dependency — clean, auditable, minimal surface area.
 * 
 * Required env vars:
 *   MERCADOPAGO_ACCESS_TOKEN — Server-side only, never exposed to client
 *   NEXT_PUBLIC_APP_URL — The public base URL of the app (e.g. http://localhost:3000)
 */

const MP_API_BASE = "https://api.mercadopago.com";

function getAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "MERCADOPAGO_ACCESS_TOKEN is not set. Add it to your .env file.\n" +
      "Get a test token from: https://www.mercadopago.com.ar/developers/panel/app"
    );
  }
  return token;
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/**
 * Generic MP API request helper.
 */
async function mpFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${MP_API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[MercadoPago] API error ${res.status}: ${body}`);
    throw new Error(`MercadoPago API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── Types ───

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
  type: string;       // "mercadopago_fee", "coupon_fee", "financing_fee", etc.
  amount: number;
  fee_payer: string;  // "collector" or "payer"
}

export interface MPPaymentResponse {
  id: number;
  status: string; // "approved", "pending", "rejected", etc.
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

// ─── API Functions ───

/**
 * Creates a Mercado Pago Checkout Pro preference.
 * Returns the preference ID and redirect URLs.
 */
export async function createPreference(data: MPPreferenceRequest): Promise<MPPreferenceResponse> {
  return mpFetch<MPPreferenceResponse>("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Fetches a payment by its ID.
 * Used in webhook processing and return URL verification.
 */
export async function getPayment(paymentId: string | number): Promise<MPPaymentResponse> {
  return mpFetch<MPPaymentResponse>(`/v1/payments/${paymentId}`);
}

/**
 * Fetches a preference by its ID.
 * Useful for verifying preference data.  
 */
export async function getPreference(preferenceId: string): Promise<MPPreferenceResponse> {
  return mpFetch<MPPreferenceResponse>(`/checkout/preferences/${preferenceId}`);
}

/**
 * Creates a refund for a payment.
 * If amount is provided, creates a partial refund. If empty, full refund.
 * Passing idempotencyKey prevents double refunds.
 */
export async function createRefund(
  paymentId: string | number, 
  amount?: number,
  idempotencyKey?: string
): Promise<{ id: number; status: string; amount: number; [key: string]: unknown }> {
  return mpFetch(`/v1/payments/${paymentId}/refunds`, {
    method: "POST",
    headers: idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {},
    body: amount !== undefined ? JSON.stringify({ amount }) : undefined,
  });
}

// ─── Helper: Build preference for an order ───

interface OrderForPreference {
  id: string;
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

/**
 * Builds and creates a Mercado Pago preference from an Order.
 * The `external_reference` is the Order ID for idempotent webhook processing.
 */
export async function createPreferenceForOrder(
  order: OrderForPreference,
  storeSlug: string
): Promise<MPPreferenceResponse> {
  const appUrl = getAppUrl();
  const baseCheckoutUrl = `${appUrl}/${storeSlug}/checkout`;

  const preference = await createPreference({
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
    notification_url: `${appUrl}/api/payments/mercadopago/webhook`,
    statement_descriptor: "NEXORA",
    metadata: {
      order_id: order.id,
      order_number: order.orderNumber,
      store_slug: storeSlug,
    },
  });

  return preference;
}
