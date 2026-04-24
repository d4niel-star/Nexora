// ─── Payment provider — store-level connection persistence ──────────────
// Thin layer on top of `StorePaymentProvider` that hides the encryption,
// the configJson merge and the canonical view-model mapping from every
// caller. Mirrors the shape of `lib/shipping/store-connection.ts`.

import { prisma } from "@/lib/db/prisma";
import { decryptToken, encryptToken } from "@/lib/security/token-crypto";

import {
  isKnownPaymentProvider,
  PAYMENT_PROVIDER_REGISTRY,
  type PaymentProviderId,
  type PaymentProviderMetadata,
} from "./registry";
import type {
  PaymentProviderConnectionView,
  PaymentProviderStatus,
} from "./types";

function safeStatus(raw: string | null | undefined): PaymentProviderStatus {
  switch (raw) {
    case "connected":
    case "disconnected":
    case "needs_reconnection":
    case "error":
      return raw;
    default:
      return "disconnected";
  }
}

function safeJsonObject(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore — invalid JSON means no extras
  }
  return {};
}

export async function listStorePaymentProviders(
  storeId: string,
): Promise<PaymentProviderConnectionView[]> {
  const rows = await prisma.storePaymentProvider.findMany({
    where: { storeId },
  });

  return rows.map((row) => ({
    provider: row.provider,
    status: safeStatus(row.status),
    externalAccountId: row.externalAccountId,
    accountEmail: row.accountEmail,
    publicKey: row.publicKey,
    connectedAt: row.connectedAt?.toISOString() ?? null,
    lastValidatedAt: row.lastValidatedAt?.toISOString() ?? null,
    lastError: row.lastError,
    config: safeJsonObject(row.configJson),
  }));
}

export interface PersistConnectionInput {
  storeId: string;
  provider: PaymentProviderId;
  status: PaymentProviderStatus;
  /**
   * Plaintext credentials. Whatever field matches the registry's
   * `credentialFields[].secret === true` is encrypted before persisting,
   * the rest is captured in `configJson`.
   */
  credentials: Record<string, string>;
  /** Optional public account display info. */
  externalAccountId?: string | null;
  accountEmail?: string | null;
  publicKey?: string | null;
  connectedAt?: Date | null;
  lastValidatedAt?: Date | null;
  lastError?: string | null;
}

interface SplitCredentials {
  secrets: Record<string, string>;
  publicValues: Record<string, string>;
}

function splitCredentials(
  metadata: PaymentProviderMetadata,
  credentials: Record<string, string>,
): SplitCredentials {
  const secrets: Record<string, string> = {};
  const publicValues: Record<string, string> = {};
  const fieldMap = new Map(
    (metadata.credentialFields ?? []).map((f) => [f.key, f]),
  );

  for (const [key, value] of Object.entries(credentials)) {
    if (typeof value !== "string" || value.length === 0) continue;
    const field = fieldMap.get(key);
    if (field?.secret) secrets[key] = value;
    else publicValues[key] = value;
  }
  return { secrets, publicValues };
}

/**
 * Upsert a non-OAuth payment provider connection (MODO, Ualá Bis,
 * dLocal, PayU, Payway). All declared secrets are bundled into a JSON
 * envelope that is encrypted and stored in `accessTokenEncrypted`. All
 * declared non-secret values (environment, account ids, public keys)
 * land in `configJson`.
 */
export async function persistApiKeyConnection(input: PersistConnectionInput): Promise<void> {
  const metadata = PAYMENT_PROVIDER_REGISTRY[input.provider];
  if (!metadata) throw new Error(`unknown_provider:${input.provider}`);
  if (metadata.connectionStyle !== "api_keys") {
    throw new Error(`provider_not_api_keys:${input.provider}`);
  }

  const { secrets, publicValues } = splitCredentials(metadata, input.credentials);
  const accessTokenEncrypted = Object.keys(secrets).length
    ? encryptToken(JSON.stringify(secrets))
    : null;
  const configJson = Object.keys(publicValues).length
    ? JSON.stringify(publicValues)
    : null;

  const now = new Date();
  await prisma.storePaymentProvider.upsert({
    where: {
      storeId_provider: { storeId: input.storeId, provider: input.provider },
    },
    create: {
      storeId: input.storeId,
      provider: input.provider,
      status: input.status,
      accessTokenEncrypted,
      configJson,
      externalAccountId:
        input.externalAccountId ??
        publicValues.merchantId ??
        publicValues.siteId ??
        null,
      accountEmail: input.accountEmail ?? null,
      publicKey: input.publicKey ?? publicValues.publicApiKey ?? null,
      lastError: input.lastError ?? null,
      connectedAt: input.connectedAt ?? now,
      lastValidatedAt: input.lastValidatedAt ?? null,
    },
    update: {
      status: input.status,
      accessTokenEncrypted,
      configJson,
      externalAccountId:
        input.externalAccountId ??
        publicValues.merchantId ??
        publicValues.siteId ??
        undefined,
      accountEmail: input.accountEmail ?? undefined,
      publicKey: input.publicKey ?? publicValues.publicApiKey ?? undefined,
      lastError: input.lastError ?? null,
      connectedAt: input.connectedAt ?? now,
      lastValidatedAt: input.lastValidatedAt ?? undefined,
    },
  });
}

export async function loadApiKeyCredentials(
  storeId: string,
  provider: PaymentProviderId,
): Promise<{ secrets: Record<string, string>; publicValues: Record<string, string> } | null> {
  const row = await prisma.storePaymentProvider.findUnique({
    where: { storeId_provider: { storeId, provider } },
  });
  if (!row) return null;

  let secrets: Record<string, string> = {};
  if (row.accessTokenEncrypted) {
    const raw = decryptToken(row.accessTokenEncrypted);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          secrets = parsed as Record<string, string>;
        }
      } catch {
        const meta = PAYMENT_PROVIDER_REGISTRY[provider];
        const firstSecret = meta?.credentialFields?.find((f) => f.secret);
        if (firstSecret) secrets[firstSecret.key] = raw;
      }
    }
  }

  const publicValues = safeJsonObject(row.configJson) as Record<string, string>;
  return { secrets, publicValues };
}

export async function markProviderStatus(
  storeId: string,
  provider: string,
  next: {
    status: PaymentProviderStatus;
    lastValidatedAt?: Date | null;
    lastError?: string | null;
  },
): Promise<void> {
  await prisma.storePaymentProvider.update({
    where: { storeId_provider: { storeId, provider } },
    data: {
      status: next.status,
      lastValidatedAt: next.lastValidatedAt ?? undefined,
      lastError: next.lastError ?? null,
    },
  });
}

export async function deleteProviderConnection(
  storeId: string,
  provider: string,
): Promise<void> {
  await prisma.storePaymentProvider.deleteMany({
    where: { storeId, provider },
  });
}

export function toProviderConnectionView(row: {
  provider: string;
  status: string;
  externalAccountId: string | null;
  accountEmail: string | null;
  publicKey: string | null;
  connectedAt: Date | null;
  lastValidatedAt: Date | null;
  lastError: string | null;
  configJson?: string | null;
}): PaymentProviderConnectionView {
  return {
    provider: row.provider,
    status: safeStatus(row.status),
    externalAccountId: row.externalAccountId,
    accountEmail: row.accountEmail,
    publicKey: row.publicKey,
    connectedAt: row.connectedAt?.toISOString() ?? null,
    lastValidatedAt: row.lastValidatedAt?.toISOString() ?? null,
    lastError: row.lastError,
    config: isKnownPaymentProvider(row.provider)
      ? safeJsonObject(row.configJson ?? null)
      : {},
  };
}
