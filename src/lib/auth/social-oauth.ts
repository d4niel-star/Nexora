import { randomBytes, scryptSync } from "crypto";

import { prisma } from "@/lib/db/prisma";
import { normalizeSlug } from "@/lib/store-engine/slug";

export const SOCIAL_PROVIDERS = ["apple", "google", "facebook"] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];
export type SocialAuthMode = "login" | "register";

export interface OAuthProfile {
  provider: SocialProvider;
  providerAccountId?: string;
  email: string;
  name?: string;
  emailVerified: boolean;
}

interface OAuthClientConfig {
  clientId: string;
  clientSecret: string;
}

interface OAuthConfigResult {
  config?: OAuthClientConfig;
  missing: string[];
}

export function isSocialProvider(value: FormDataEntryValue | string | null): value is SocialProvider {
  return typeof value === "string" && SOCIAL_PROVIDERS.includes(value as SocialProvider);
}

export function isSocialAuthMode(value: FormDataEntryValue | string | null): value is SocialAuthMode {
  return value === "login" || value === "register";
}

export function getSocialProviderLabel(provider: SocialProvider): string {
  switch (provider) {
    case "apple":
      return "Apple";
    case "google":
      return "Google";
    case "facebook":
      return "Facebook";
  }
}

export function getOAuthCookieNames() {
  return {
    state: "nx_oauth_state",
    provider: "nx_oauth_provider",
    mode: "nx_oauth_mode",
  } as const;
}

export function getOAuthRedirectUri(provider: SocialProvider, origin: string): string {
  return `${origin}/api/auth/oauth/${provider}/callback`;
}

function getEnvValue(keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim()) return value.trim();
  }
  return undefined;
}

function getOAuthClientConfig(provider: SocialProvider): OAuthConfigResult {
  const clientIdKeys =
    provider === "google"
      ? ["GOOGLE_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_ID", "AUTH_GOOGLE_ID"]
      : provider === "facebook"
        ? ["FACEBOOK_CLIENT_ID", "FACEBOOK_APP_ID", "META_CLIENT_ID"]
        : ["APPLE_CLIENT_ID", "APPLE_SERVICE_ID", "AUTH_APPLE_ID"];

  const clientSecretKeys =
    provider === "google"
      ? ["GOOGLE_CLIENT_SECRET", "GOOGLE_OAUTH_CLIENT_SECRET", "AUTH_GOOGLE_SECRET"]
      : provider === "facebook"
        ? ["FACEBOOK_CLIENT_SECRET", "FACEBOOK_APP_SECRET", "META_CLIENT_SECRET"]
        : ["APPLE_CLIENT_SECRET", "AUTH_APPLE_SECRET"];

  const clientId = getEnvValue(clientIdKeys);
  const clientSecret = getEnvValue(clientSecretKeys);
  const missing = [
    ...(clientId ? [] : [clientIdKeys[0]]),
    ...(clientSecret ? [] : [clientSecretKeys[0]]),
  ];

  return clientId && clientSecret
    ? { config: { clientId, clientSecret }, missing: [] }
    : { missing };
}

export function buildOAuthAuthorizationUrl(
  provider: SocialProvider,
  origin: string,
  state: string,
): { url?: URL; missing: string[] } {
  const { config, missing } = getOAuthClientConfig(provider);
  if (!config) return { missing };

  const redirectUri = getOAuthRedirectUri(provider, origin);

  if (provider === "google") {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "select_account");
    return { url, missing: [] };
  }

  if (provider === "facebook") {
    const url = new URL("https://www.facebook.com/v19.0/dialog/oauth");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "email,public_profile");
    url.searchParams.set("state", state);
    return { url, missing: [] };
  }

  const url = new URL("https://appleid.apple.com/auth/authorize");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", "name email");
  url.searchParams.set("state", state);
  return { url, missing: [] };
}

async function fetchJson(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const response = await fetch(url, init);
  const body = await response
    .json()
    .catch(() => ({} as Record<string, unknown>));

  if (!response.ok) {
    throw new Error(readOAuthError(body) || `OAuth request failed with ${response.status}`);
  }

  return body as Record<string, unknown>;
}

function readOAuthError(body: Record<string, unknown>): string | undefined {
  const direct = asString(body.error_description) || asString(body.error);
  if (direct) return direct;

  const nested = body.error;
  if (nested && typeof nested === "object" && "message" in nested) {
    return asString((nested as Record<string, unknown>).message);
  }

  return undefined;
}

async function postToken(
  url: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  return fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
}

function requireOAuthClientConfig(provider: SocialProvider): OAuthClientConfig {
  const { config, missing } = getOAuthClientConfig(provider);
  if (!config) {
    throw new Error(`Faltan credenciales OAuth: ${missing.join(", ")}`);
  }
  return config;
}

export async function exchangeOAuthCode(
  provider: SocialProvider,
  code: string,
  origin: string,
): Promise<OAuthProfile> {
  const config = requireOAuthClientConfig(provider);
  const redirectUri = getOAuthRedirectUri(provider, origin);

  if (provider === "google") {
    const token = await postToken("https://oauth2.googleapis.com/token", {
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });
    const accessToken = requireString(token.access_token, "Google no devolvio access_token");
    const userInfo = await fetchJson("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return {
      provider,
      providerAccountId: asString(userInfo.sub),
      email: requireString(userInfo.email, "Google no devolvio email"),
      name: asString(userInfo.name),
      emailVerified: asBoolean(userInfo.email_verified),
    };
  }

  if (provider === "facebook") {
    const token = await fetchJson(
      `https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
      })}`,
    );
    const accessToken = requireString(token.access_token, "Facebook no devolvio access_token");
    const userInfo = await fetchJson(
      `https://graph.facebook.com/me?${new URLSearchParams({
        fields: "id,name,email",
        access_token: accessToken,
      })}`,
    );
    return {
      provider,
      providerAccountId: asString(userInfo.id),
      email: requireString(userInfo.email, "Facebook no devolvio email"),
      name: asString(userInfo.name),
      emailVerified: true,
    };
  }

  const token = await postToken("https://appleid.apple.com/auth/token", {
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const idToken = requireString(token.id_token, "Apple no devolvio id_token");
  const payload = decodeJwtPayload(idToken);

  return {
    provider,
    providerAccountId: asString(payload.sub),
    email: requireString(payload.email, "Apple no devolvio email"),
    name: asString(payload.name),
    emailVerified: asBoolean(payload.email_verified),
  };
}

export async function findOrCreateSocialUser(profile: OAuthProfile) {
  const email = profile.email.trim().toLowerCase();
  if (!email) throw new Error("El proveedor no devolvio un email valido.");
  if (!profile.emailVerified) {
    throw new Error("El proveedor no confirmo el email de la cuenta.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (!existing.emailVerified || (!existing.name && profile.name)) {
      return prisma.user.update({
        where: { id: existing.id },
        data: {
          emailVerified: true,
          name: existing.name || profile.name || existing.name,
        },
      });
    }
    return existing;
  }

  const displayName = profile.name?.trim() || email.split("@")[0] || "Nueva tienda";
  const slug = await generateUniqueStoreSlug(displayName);

  return prisma.user.create({
    data: {
      email,
      password: hashPassword(randomBytes(32).toString("hex")),
      name: displayName,
      emailVerified: true,
      store: {
        create: {
          slug,
          name: displayName,
          status: "draft",
          onboarding: {
            create: {
              currentStage: "welcome",
            },
          },
        },
      },
    },
  });
}

async function generateUniqueStoreSlug(companyName: string): Promise<string> {
  const normalized = normalizeSlug(companyName);
  const base =
    (normalized.length > 60 ? normalized.slice(0, 60).replace(/-+$/g, "") : normalized) ||
    `tienda-${randomBytes(3).toString("hex")}`;
  let slug = base;
  let suffix = 2;

  while (await prisma.store.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function requireString(value: unknown, message: string): string {
  const stringValue = asString(value);
  if (!stringValue) throw new Error(message);
  return stringValue;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "1";
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split(".");
  if (!payload) throw new Error("Apple devolvio un id_token invalido.");

  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<string, unknown>;
}
