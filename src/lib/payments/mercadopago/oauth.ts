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

export async function exchangeMercadoPagoOAuthCode(input: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  state: string;
}): Promise<MercadoPagoOAuthTokenResponse> {
  const body = new URLSearchParams({
    client_id: input.clientId,
    client_secret: input.clientSecret,
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    state: input.state,
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
    throw new Error(`mp_oauth_token_failed_${response.status}`);
  }

  const data = (await response.json()) as MercadoPagoOAuthTokenResponse;
  if (!data.access_token) {
    throw new Error("mp_oauth_missing_access_token");
  }

  return data;
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
