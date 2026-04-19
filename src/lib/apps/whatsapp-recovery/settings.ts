// ─── WhatsApp Recovery · Settings (read) ───
// Per-tenant configuration helpers. The access token is stored encrypted
// via the shared token-crypto helper; this module only returns the
// decrypted value when explicitly requested by the execution pipeline.

import { prisma } from "@/lib/db/prisma";
import { decryptToken } from "@/lib/security/token-crypto";

export type WhatsappSettingsStatus = "needs_setup" | "active" | "disabled";

export interface PublicWhatsappSettings {
  configured: boolean;
  status: WhatsappSettingsStatus;
  phoneNumberId: string | null;
  templateName: string | null;
  templateLanguage: string;
  hasAccessToken: boolean;
  lastValidatedAt: Date | null;
}

export interface ResolvedWhatsappCredentials {
  phoneNumberId: string;
  accessToken: string;
  templateName: string;
  templateLanguage: string;
}

/**
 * Public-safe view for the settings UI. Never exposes the decrypted
 * access token; only a "hasAccessToken" boolean.
 */
export async function getPublicWhatsappSettings(
  storeId: string,
): Promise<PublicWhatsappSettings> {
  const row = await prisma.whatsappRecoverySettings.findUnique({
    where: { storeId },
  });
  if (!row) {
    return {
      configured: false,
      status: "needs_setup",
      phoneNumberId: null,
      templateName: null,
      templateLanguage: "es_AR",
      hasAccessToken: false,
      lastValidatedAt: null,
    };
  }
  return {
    configured: Boolean(
      row.phoneNumberId && row.accessTokenEncrypted && row.templateName,
    ),
    status: row.status as WhatsappSettingsStatus,
    phoneNumberId: row.phoneNumberId,
    templateName: row.templateName,
    templateLanguage: row.templateLanguage,
    hasAccessToken: Boolean(row.accessTokenEncrypted),
    lastValidatedAt: row.lastValidatedAt,
  };
}

/**
 * Returns a fully-resolved credentials payload if, and only if, every
 * required field is present. Returns null for any other case — callers
 * MUST treat null as "skip send, degrade safely".
 */
export async function resolveWhatsappCredentials(
  storeId: string,
): Promise<ResolvedWhatsappCredentials | null> {
  const row = await prisma.whatsappRecoverySettings.findUnique({
    where: { storeId },
  });
  if (!row) return null;
  if (row.status !== "active") return null;
  if (!row.phoneNumberId || !row.accessTokenEncrypted || !row.templateName) {
    return null;
  }
  const accessToken = decryptToken(row.accessTokenEncrypted);
  if (!accessToken) return null;
  return {
    phoneNumberId: row.phoneNumberId,
    accessToken,
    templateName: row.templateName,
    templateLanguage: row.templateLanguage,
  };
}
