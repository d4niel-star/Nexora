"use server";

// ─── Carrier connection server actions ─────────────────────────────────────
// Single entry point for the merchant UI to manage shipping integrations.
// Every action is store-scoped via `getCurrentStore()` and never trusts
// `storeId` from the form payload. Secrets are persisted only through
// the encryption helpers in store-connection.ts.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import { decryptToken } from "@/lib/security/token-crypto";

import { getCarrierById } from "./registry";
import {
  disconnectCarrier,
  markCarrierValidationError,
  upsertConnectedCarrier,
} from "./store-connection";
import type {
  CarrierEnvironment,
  CarrierId,
  CarrierValidationResult,
} from "./types";

export interface ConnectCarrierActionInput {
  carrier: CarrierId;
  environment: CarrierEnvironment;
  username: string;
  password: string;
  clientNumber?: string;
  /** Andreani-only: contract number used for quotes/labels. */
  contractNumber?: string;
}

export type CarrierActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

function trimOrEmpty(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function trimOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function normalizeEnvironment(v: unknown): CarrierEnvironment {
  return v === "sandbox" ? "sandbox" : "production";
}

function pathToRevalidate(carrier: CarrierId): string {
  return carrier === "andreani"
    ? "/admin/shipping/andreani"
    : "/admin/shipping/correo-argentino";
}

/**
 * Connects a carrier for the current store. Performs a real validation
 * round-trip first; only persists on success. If credentials are
 * rejected, marks the connection as error (when one already exists) so
 * the dashboard reflects the latest known state.
 */
export async function connectCarrierAction(
  input: ConnectCarrierActionInput,
): Promise<CarrierActionResult> {
  const store = await getCurrentStore();
  if (!store) {
    return { ok: false, message: "No hay una tienda activa." };
  }

  const carrier = getCarrierById(input.carrier);
  if (!carrier) {
    return { ok: false, message: "Proveedor no soportado." };
  }

  const username = trimOrEmpty(input.username);
  const password = trimOrEmpty(input.password);
  const clientNumber = trimOrNull(input.clientNumber);
  const contractNumber = trimOrNull(input.contractNumber);
  const environment = normalizeEnvironment(input.environment);

  if (username.length === 0 || password.length === 0) {
    return { ok: false, message: "Usuario y contraseña son obligatorios." };
  }
  if (carrier.requiresClientNumber && !clientNumber) {
    return { ok: false, message: "El número de cliente es obligatorio." };
  }

  let result: CarrierValidationResult;
  try {
    result = await carrier.adapter.validateCredentials({
      username,
      password,
      clientNumber,
      environment,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? `Error inesperado validando credenciales: ${err.message}`
        : "Error inesperado validando credenciales.";
    await markCarrierValidationError(store.id, carrier.id, message).catch(() => {});
    return { ok: false, message };
  }

  if (!result.ok) {
    await markCarrierValidationError(store.id, carrier.id, result.message).catch(
      () => {},
    );
    revalidatePath(pathToRevalidate(carrier.id));
    revalidatePath("/admin/shipping");
    return { ok: false, message: result.message };
  }

  await upsertConnectedCarrier({
    storeId: store.id,
    carrier: carrier.id,
    environment,
    username,
    clientNumber,
    password,
    externalAccountId: result.metadata.externalAccountId ?? clientNumber,
    accountDisplayName: result.metadata.displayName ?? null,
    configPatch: contractNumber ? { contractNumber } : undefined,
  });

  revalidatePath(pathToRevalidate(carrier.id));
  revalidatePath("/admin/shipping");

  return {
    ok: true,
    message: `Tu cuenta de ${carrier.name} quedó vinculada correctamente.`,
  };
}

/**
 * Updates non-secret carrier extras (e.g. Andreani contractNumber) for an
 * already-connected carrier without re-issuing credentials. Bails out if
 * the carrier is not connected for the current store.
 */
export async function patchCarrierConfigAction(
  carrierId: CarrierId,
  patch: Record<string, string | null>,
): Promise<CarrierActionResult> {
  const store = await getCurrentStore();
  if (!store) return { ok: false, message: "No hay una tienda activa." };

  const carrier = getCarrierById(carrierId);
  if (!carrier) return { ok: false, message: "Proveedor no soportado." };

  // Reject empty values so we don't store empty strings as if they were
  // valid configuration.
  const cleanPatch: Record<string, string> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (typeof v === "string" && v.trim().length > 0) {
      cleanPatch[k] = v.trim();
    }
  }
  if (Object.keys(cleanPatch).length === 0) {
    return { ok: false, message: "No hay cambios para guardar." };
  }

  const { patchCarrierConfig } = await import("./store-connection");
  await patchCarrierConfig(store.id, carrier.id, cleanPatch);

  revalidatePath(pathToRevalidate(carrier.id));
  revalidatePath("/admin/shipping");

  return {
    ok: true,
    message: "Configuración del carrier actualizada.",
  };
}

/**
 * Re-runs validation against the carrier API using the currently stored
 * password (or, optionally, a freshly entered one). Used by the "Validar
 * conexión" button in the UI to refresh `lastValidatedAt` and surface
 * any newly-introduced errors (e.g. password rotation on the carrier
 * side).
 */
export async function validateCarrierAction(
  carrierId: CarrierId,
  override?: { password: string },
): Promise<CarrierActionResult> {
  const store = await getCurrentStore();
  if (!store) return { ok: false, message: "No hay una tienda activa." };

  const carrier = getCarrierById(carrierId);
  if (!carrier) return { ok: false, message: "Proveedor no soportado." };

  const row = await prisma.storeCarrierConnection.findUnique({
    where: { storeId_carrier: { storeId: store.id, carrier: carrier.id } },
  });
  if (!row) {
    return {
      ok: false,
      message: "Esta cuenta todavía no está conectada.",
    };
  }

  const password = override?.password
    ? override.password
    : row.passwordEncrypted
      ? decryptToken(row.passwordEncrypted)
      : "";

  if (!password) {
    await markCarrierValidationError(
      store.id,
      carrier.id,
      "No se encontró una contraseña almacenada. Reconectá la cuenta.",
    );
    revalidatePath(pathToRevalidate(carrier.id));
    return {
      ok: false,
      message:
        "No hay contraseña guardada para esta conexión. Reconectá la cuenta cargando los datos nuevamente.",
    };
  }

  const result = await carrier.adapter.validateCredentials({
    username: row.accountUsername ?? "",
    password,
    clientNumber: row.accountClientNumber,
    environment: (row.environment as CarrierEnvironment) ?? "production",
  });

  if (!result.ok) {
    await markCarrierValidationError(store.id, carrier.id, result.message);
    revalidatePath(pathToRevalidate(carrier.id));
    return { ok: false, message: result.message };
  }

  await upsertConnectedCarrier({
    storeId: store.id,
    carrier: carrier.id,
    environment: (row.environment as CarrierEnvironment) ?? "production",
    username: row.accountUsername ?? "",
    clientNumber: row.accountClientNumber,
    // Re-encrypt the same secret to refresh updatedAt; cheap and keeps
    // the column non-null when re-validated after a previous error.
    password,
    externalAccountId: result.metadata.externalAccountId ?? row.externalAccountId,
    accountDisplayName: result.metadata.displayName ?? row.accountDisplayName,
  });

  revalidatePath(pathToRevalidate(carrier.id));
  return {
    ok: true,
    message: "La conexión sigue activa. Última validación actualizada.",
  };
}

/**
 * Removes the carrier connection for the current store. Deletes the row
 * entirely so no encrypted secret remains at rest for a disconnected
 * provider.
 */
export async function disconnectCarrierAction(
  carrierId: CarrierId,
): Promise<CarrierActionResult> {
  const store = await getCurrentStore();
  if (!store) return { ok: false, message: "No hay una tienda activa." };

  const carrier = getCarrierById(carrierId);
  if (!carrier) return { ok: false, message: "Proveedor no soportado." };

  await disconnectCarrier(store.id, carrier.id);
  revalidatePath(pathToRevalidate(carrier.id));
  revalidatePath("/admin/shipping");

  return {
    ok: true,
    message: `Tu cuenta de ${carrier.name} fue desconectada.`,
  };
}
