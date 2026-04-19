// ─── MercadoPago environment helpers (fail-closed) ───
//
// Central, *throwing* accessor for the MercadoPago credentials so that a
// misconfigured production deploy surfaces loudly at first use instead of
// silently routing real traffic to a TEST token. Previously `mercadopago.ts`
// and the billing webhook each carried a hardcoded TEST access token as
// fallback; that behaviour would let production quietly operate against
// the MP sandbox, losing every real payment outcome.
//
// Environment:
//   MERCADOPAGO_BILLING_ACCESS_TOKEN  (preferred, scoped to billing flows)
//   MERCADOPAGO_ACCESS_TOKEN          (fallback, shared with storefront)
//   MERCADOPAGO_WEBHOOK_SECRET        (optional; enables x-signature check)
//
// Behaviour:
//   - getMpAccessToken() throws `MissingMpAccessTokenError` when neither
//     token is set. Callers that can tolerate the absence (e.g. emails
//     that mention billing but don't call MP) must handle the error.
//   - hasMpAccessToken() returns a boolean for gating without throwing.
//   - getMpWebhookSecret() returns null when unset (signature check
//     degrades to "trust + re-fetch" which is still safe because the
//     webhook always fetches the payment from MP's API before acting).

export class MissingMpAccessTokenError extends Error {
  constructor() {
    super(
      "MercadoPago access token is not configured. Set " +
        "MERCADOPAGO_BILLING_ACCESS_TOKEN (preferred) or " +
        "MERCADOPAGO_ACCESS_TOKEN before attempting billing operations.",
    );
    this.name = "MissingMpAccessTokenError";
  }
}

export function hasMpAccessToken(): boolean {
  return Boolean(
    process.env.MERCADOPAGO_BILLING_ACCESS_TOKEN ||
      process.env.MERCADOPAGO_ACCESS_TOKEN,
  );
}

export function getMpAccessToken(): string {
  const token =
    process.env.MERCADOPAGO_BILLING_ACCESS_TOKEN ||
    process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new MissingMpAccessTokenError();
  }
  return token;
}

export function getMpWebhookSecret(): string | null {
  return process.env.MERCADOPAGO_WEBHOOK_SECRET || null;
}
