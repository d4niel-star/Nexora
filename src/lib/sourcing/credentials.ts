// ─── Sourcing Provider Credentials Vault ───
// Unified API to persist and read provider API keys using the shared
// token-crypto vault (same AES-256-CBC backend as StorePaymentProvider and
// AdPlatformConnection). Never stores plaintext. Never logs secrets.

import { prisma } from "@/lib/db/prisma";
import { encryptToken, decryptToken } from "@/lib/security/token-crypto";

/** Persists the API key for a sourcing provider connection, encrypted at rest. */
export async function setProviderApiKey(
  connectionId: string,
  apiKey: string | null,
): Promise<void> {
  if (apiKey === null || apiKey.length === 0) {
    await prisma.providerConnection.update({
      where: { id: connectionId },
      data: { apiKeyEncrypted: null },
    });
    return;
  }
  await prisma.providerConnection.update({
    where: { id: connectionId },
    data: { apiKeyEncrypted: encryptToken(apiKey) },
  });
}

/** Reads and decrypts the API key for a sourcing provider connection. */
export async function getProviderApiKey(
  connectionId: string,
): Promise<string | null> {
  const row = await prisma.providerConnection.findUnique({
    where: { id: connectionId },
    select: { apiKeyEncrypted: true },
  });
  if (!row?.apiKeyEncrypted) return null;
  const decrypted = decryptToken(row.apiKeyEncrypted);
  return decrypted || null;
}

/**
 * Returns a safe representation of provider credentials state for UI display.
 * Never returns the key itself; only tells the UI whether one is stored.
 */
export async function getProviderCredentialStatus(
  connectionId: string,
): Promise<{ hasApiKey: boolean }> {
  const row = await prisma.providerConnection.findUnique({
    where: { id: connectionId },
    select: { apiKeyEncrypted: true },
  });
  return { hasApiKey: Boolean(row?.apiKeyEncrypted) };
}
