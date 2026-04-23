// ─── Store ↔ Carrier connection persistence ────────────────────────────────
// Thin layer on top of Prisma's StoreCarrierConnection that:
//  • Builds UI-safe summaries (never returns the encrypted password).
//  • Wraps every write in the AES-256-CBC vault used by the rest of
//    Nexora's secret store (token-crypto.ts).
//  • Centralises the disconnect / mark-error semantics so the server
//    actions stay declarative.

import { prisma } from "@/lib/db/prisma";
import { decryptToken, encryptToken } from "@/lib/security/token-crypto";
import type {
  CarrierAuthContext,
  CarrierConnectionStatus,
  CarrierConnectionSummary,
  CarrierEnvironment,
  CarrierId,
} from "./types";
import { CARRIERS } from "./registry";

const VALID_CARRIER_IDS = new Set(CARRIERS.map((c) => c.id));

function assertCarrier(carrier: string): asserts carrier is CarrierId {
  if (!VALID_CARRIER_IDS.has(carrier as CarrierId)) {
    throw new Error(`Carrier no soportado: ${carrier}`);
  }
}

export async function getCarrierConnectionSummary(
  storeId: string,
  carrier: CarrierId,
): Promise<CarrierConnectionSummary> {
  assertCarrier(carrier);
  const row = await prisma.storeCarrierConnection.findUnique({
    where: { storeId_carrier: { storeId, carrier } },
  });

  if (!row) {
    return {
      carrier,
      status: "disconnected",
      environment: "production",
      accountUsername: null,
      accountClientNumber: null,
      accountDisplayName: null,
      externalAccountId: null,
      hasStoredPassword: false,
      lastError: null,
      connectedAt: null,
      lastValidatedAt: null,
      config: {},
    };
  }

  return {
    carrier,
    status: row.status as CarrierConnectionStatus,
    environment: (row.environment as CarrierEnvironment) ?? "production",
    accountUsername: row.accountUsername,
    accountClientNumber: row.accountClientNumber,
    accountDisplayName: row.accountDisplayName,
    externalAccountId: row.externalAccountId,
    hasStoredPassword: Boolean(row.passwordEncrypted),
    lastError: row.lastError,
    connectedAt: row.connectedAt?.toISOString() ?? null,
    lastValidatedAt: row.lastValidatedAt?.toISOString() ?? null,
    config: parseConfigJson(row.configJson),
  };
}

function parseConfigJson(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export async function listCarrierSummaries(
  storeId: string,
): Promise<CarrierConnectionSummary[]> {
  return Promise.all(
    CARRIERS.map((c) => getCarrierConnectionSummary(storeId, c.id)),
  );
}

export interface UpsertCarrierConnectionInput {
  storeId: string;
  carrier: CarrierId;
  environment: CarrierEnvironment;
  username: string;
  clientNumber: string | null;
  /**
   * Plaintext password. When null, keeps the previously encrypted value
   * (allows the merchant to update non-secret fields without retyping
   * the password). Validation is the caller's responsibility.
   */
  password: string | null;
  externalAccountId: string | null;
  accountDisplayName: string | null;
  /** Optional carrier-specific extras (merged into existing configJson). */
  configPatch?: Record<string, unknown>;
}

/**
 * Atomically upserts a connection AFTER credentials were validated by
 * the carrier API. Marks status="connected" and resets lastError. The
 * password (if provided) is encrypted with the shared AES-256-CBC vault.
 */
export async function upsertConnectedCarrier(
  input: UpsertCarrierConnectionInput,
): Promise<void> {
  assertCarrier(input.carrier);
  const now = new Date();

  // Merge configPatch on top of the existing configJson (e.g. preserve
  // Andreani's contractNumber when the merchant just retypes the
  // password) instead of clobbering it.
  const existing = await prisma.storeCarrierConnection.findUnique({
    where: { storeId_carrier: { storeId: input.storeId, carrier: input.carrier } },
    select: { configJson: true },
  });
  const baseConfig = parseConfigJson(existing?.configJson);
  const mergedConfig = { ...baseConfig, ...(input.configPatch ?? {}) };
  const configJson =
    Object.keys(mergedConfig).length > 0 ? JSON.stringify(mergedConfig) : null;

  await prisma.storeCarrierConnection.upsert({
    where: {
      storeId_carrier: { storeId: input.storeId, carrier: input.carrier },
    },
    create: {
      storeId: input.storeId,
      carrier: input.carrier,
      status: "connected",
      environment: input.environment,
      accountUsername: input.username,
      accountClientNumber: input.clientNumber,
      accountDisplayName: input.accountDisplayName,
      externalAccountId: input.externalAccountId,
      passwordEncrypted: input.password ? encryptToken(input.password) : null,
      configJson,
      lastError: null,
      connectedAt: now,
      lastValidatedAt: now,
    },
    update: {
      status: "connected",
      environment: input.environment,
      accountUsername: input.username,
      accountClientNumber: input.clientNumber,
      accountDisplayName: input.accountDisplayName,
      externalAccountId: input.externalAccountId,
      // Preserve the previously stored password if the merchant didn't
      // retype it: this lets them update environment/client number on
      // their own without losing the secret. We still re-validated the
      // credentials with whatever password was used in this request, so
      // status=connected is honest in either branch.
      ...(input.password
        ? { passwordEncrypted: encryptToken(input.password) }
        : {}),
      configJson,
      lastError: null,
      connectedAt: now,
      lastValidatedAt: now,
    },
  });
}

/**
 * Patches `configJson` for an existing connection without re-running
 * credential validation. Used by the carrier page to capture extras
 * such as Andreani's contract number when the connection is already
 * live.
 */
export async function patchCarrierConfig(
  storeId: string,
  carrier: CarrierId,
  patch: Record<string, unknown>,
): Promise<void> {
  assertCarrier(carrier);
  const existing = await prisma.storeCarrierConnection.findUnique({
    where: { storeId_carrier: { storeId, carrier } },
    select: { configJson: true },
  });
  if (!existing) return;
  const merged = { ...parseConfigJson(existing.configJson), ...patch };
  await prisma.storeCarrierConnection.update({
    where: { storeId_carrier: { storeId, carrier } },
    data: {
      configJson: Object.keys(merged).length > 0 ? JSON.stringify(merged) : null,
    },
  });
}

/**
 * Loads the row needed to call any carrier verb. Decrypts the password
 * and parses the carrier-specific config blob. Used only inside the
 * operations layer; the result is discarded after each round-trip.
 */
export async function loadAuthContext(
  storeId: string,
  carrier: CarrierId,
): Promise<CarrierAuthContext | null> {
  assertCarrier(carrier);
  const row = await prisma.storeCarrierConnection.findUnique({
    where: { storeId_carrier: { storeId, carrier } },
  });
  if (!row || !row.passwordEncrypted || !row.accountUsername) return null;
  const password = decryptToken(row.passwordEncrypted);
  if (!password) return null;
  return {
    username: row.accountUsername,
    password,
    clientNumber: row.accountClientNumber,
    environment: (row.environment as CarrierEnvironment) ?? "production",
    config: parseConfigJson(row.configJson),
  };
}

/**
 * Records a validation failure without touching the encrypted password
 * (so the merchant can fix the problem and retry without re-typing).
 * Sets status="error" and stores the user-facing error message.
 */
export async function markCarrierValidationError(
  storeId: string,
  carrier: CarrierId,
  errorMessage: string,
): Promise<void> {
  assertCarrier(carrier);
  const existing = await prisma.storeCarrierConnection.findUnique({
    where: { storeId_carrier: { storeId, carrier } },
    select: { id: true },
  });
  if (!existing) {
    // Nothing to mark: the merchant never connected. We intentionally
    // don't create an empty error row to avoid polluting the table.
    return;
  }
  await prisma.storeCarrierConnection.update({
    where: { storeId_carrier: { storeId, carrier } },
    data: {
      status: "error",
      lastError: errorMessage.slice(0, 500),
    },
  });
}

/**
 * Severs the connection: deletes the row entirely. Doing a hard delete
 * (instead of just nulling secrets) means there is zero residual secret
 * material on disk for a disconnected store, which matches the merchant's
 * mental model of "desconectar" and is consistent with how the rest of
 * Nexora handles secret revocation.
 */
export async function disconnectCarrier(
  storeId: string,
  carrier: CarrierId,
): Promise<void> {
  assertCarrier(carrier);
  await prisma.storeCarrierConnection.deleteMany({
    where: { storeId, carrier },
  });
}
