import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const MP_OAUTH_AUTHORIZE_URL = "https://auth.mercadopago.com/authorization";
const MP_OAUTH_TOKEN_URL = "https://api.mercadopago.com/oauth/token";

interface MercadoPagoOAuthStatePayload {
  storeId: string;
  userId: string;
  nonce: string;
  ts: number;
}

export interface MercadoPagoOAuthTokenResponse {
  access_token: string;
  public_key?: string;
  refresh_token?: string;
  live_mode?: boolean;
  user_id?: string | number;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function getOAuthSecret(): string {
  const secret = process.env.MP_CLIENT_SECRET || process.env.ENCRYPTION_KEY;
  if (!secret) throw new Error("missing_mp_oauth_secret");
  return secret;
}

function signState(payload: string): string {
  return createHmac("sha256", getOAuthSecret()).update(payload).digest("base64url");
}

export function getMercadoPagoOAuthRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("missing_app_url");
  return `${appUrl.replace(/\/$/, "")}/api/payments/mercadopago/oauth/callback`;
}

export function createMercadoPagoOAuthState(input: { storeId: string; userId: string }): string {
  const payload: MercadoPagoOAuthStatePayload = {
    storeId: input.storeId,
    userId: input.userId,
    nonce: randomBytes(16).toString("hex"),
    ts: Date.now(),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${signState(encodedPayload)}`;
}

export function verifyMercadoPagoOAuthState(state: string): MercadoPagoOAuthStatePayload | null {
  const [encodedPayload, receivedSignature] = state.split(".");
  if (!encodedPayload || !receivedSignature) return null;

  const expectedSignature = signState(encodedPayload);
  const expected = Buffer.from(expectedSignature, "base64url");
  const received = Buffer.from(receivedSignature, "base64url");

  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null;
  }

  let payload: MercadoPagoOAuthStatePayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as MercadoPagoOAuthStatePayload;
  } catch {
    return null;
  }

  const maxAgeMs = 15 * 60 * 1000;
  if (!payload.storeId || !payload.userId || !payload.nonce || Date.now() - payload.ts > maxAgeMs) {
    return null;
  }

  return payload;
}

export function buildMercadoPagoOAuthUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(MP_OAUTH_AUTHORIZE_URL);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("platform_id", "mp");
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("state", input.state);
  return url.toString();
}

// ─── Structured OAuth exchange error ─────────────────────────────────────
// Callers (the callback route) need the MP error code to emit an honest,
// specific diagnostic to the user. Raw Error messages force the callback
// to guess. This class exposes the HTTP status and the MP error code
// (parsed from the response body) as first-class fields.
export class MercadoPagoOAuthExchangeError extends Error {
  readonly status: number;
  /** Normalized reason: invalid_grant | invalid_client | invalid_redirect_uri | same_account | no_access_token | network | unknown. */
  readonly reason: string;
  /** Raw error code as returned by Mercado Pago (`error` field), if any. */
  readonly mpError: string | null;
  readonly mpMessage: string | null;

  constructor(input: {
    status: number;
    reason: string;
    mpError: string | null;
    mpMessage: string | null;
  }) {
    super(
      `mp_oauth_exchange_failed status=${input.status} reason=${input.reason} mp_error=${input.mpError ?? "none"}`,
    );
    this.name = "MercadoPagoOAuthExchangeError";
    this.status = input.status;
    this.reason = input.reason;
    this.mpError = input.mpError;
    this.mpMessage = input.mpMessage;
  }
}

export async function exchangeMercadoPagoOAuthCode(input: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<MercadoPagoOAuthTokenResponse> {
  // Per MP OAuth docs, the token endpoint expects ONLY the five fields
  // below — `state` is an authorize-step parameter and MUST NOT be sent
  // here. Some MP edge stacks reject requests with unknown fields with a
  // misleading "invalid_client" or "bad_request" error, which previously
  // surfaced in the UI as a generic "no devolvió credenciales válidas".
  const body = new URLSearchParams({
    client_id: input.clientId,
    client_secret: input.clientSecret,
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
  });

  let response: Response;
  try {
    response = await fetch(MP_OAUTH_TOKEN_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });
  } catch (err) {
    throw new MercadoPagoOAuthExchangeError({
      status: 0,
      reason: "network",
      mpError: null,
      mpMessage: err instanceof Error ? err.message : "fetch_failed",
    });
  }

  if (!response.ok) {
    // MP returns JSON error bodies with an `error` and `message` field.
    // We read defensively: some 5xx responses come as HTML.
    let mpError: string | null = null;
    let mpMessage: string | null = null;
    try {
      const text = await response.text();
      if (text) {
        try {
          const parsed = JSON.parse(text) as {
            error?: unknown;
            message?: unknown;
            cause?: unknown;
          };
          if (typeof parsed.error === "string") mpError = parsed.error;
          if (typeof parsed.message === "string") mpMessage = parsed.message;
        } catch {
          mpMessage = text.slice(0, 300);
        }
      }
    } catch {
      /* response body unreadable, fall through */
    }

    throw new MercadoPagoOAuthExchangeError({
      status: response.status,
      reason: classifyMpOAuthError(response.status, mpError, mpMessage),
      mpError,
      mpMessage,
    });
  }

  const data = (await response.json()) as MercadoPagoOAuthTokenResponse;
  if (!data.access_token) {
    throw new MercadoPagoOAuthExchangeError({
      status: response.status,
      reason: "no_access_token",
      mpError: null,
      mpMessage: "Response did not include access_token",
    });
  }

  return data;
}

/**
 * Normalizes the many error shapes MP returns at the token endpoint into
 * a small, stable vocabulary that the UI can map to user-facing copy:
 *
 *   - invalid_grant:        code already used, expired, or wrong scope
 *   - invalid_client:       client_id / secret mismatch or inactive app
 *   - invalid_redirect_uri: redirect_uri not whitelisted in MP dashboard
 *   - same_account:         user tried to link the MP account that owns
 *                           the Developer application (MP refuses this)
 *   - unknown:              any other 4xx / 5xx response
 */
function classifyMpOAuthError(
  status: number,
  mpError: string | null,
  mpMessage: string | null,
): string {
  const haystack = `${mpError ?? ""} ${mpMessage ?? ""}`.toLowerCase();
  if (/invalid_grant/.test(haystack)) return "invalid_grant";
  if (/invalid_client/.test(haystack)) return "invalid_client";
  if (/redirect_uri/.test(haystack)) return "invalid_redirect_uri";
  // MP returns this when you try to link the app owner's own account
  if (/same.{0,20}(user|account|owner)|cannot.{0,20}link.{0,20}owner/.test(haystack)) {
    return "same_account";
  }
  if (status === 401 || status === 403) return "invalid_client";
  return "unknown";
}

/**
 * Exchanges a refresh_token for a fresh access_token.
 * Called automatically when the stored access token is close to expiry.
 * If Mercado Pago rejects the refresh (revoked, expired), the caller should
 * mark the provider as `needs_reconnection` so the owner is prompted to
 * re-connect the account.
 */
export async function refreshMercadoPagoAccessToken(input: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<MercadoPagoOAuthTokenResponse> {
  const body = new URLSearchParams({
    client_id: input.clientId,
    client_secret: input.clientSecret,
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
  });

  const response = await fetch(MP_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`mp_oauth_refresh_failed_${response.status}`);
  }

  const data = (await response.json()) as MercadoPagoOAuthTokenResponse;
  if (!data.access_token) {
    throw new Error("mp_oauth_refresh_missing_access_token");
  }

  return data;
}
