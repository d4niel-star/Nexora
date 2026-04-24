"use server";

// ─── Admin payments — connect / validate / disconnect server actions ─
// Centralised entry points for every payment surface in the admin. Every
// action returns a `PaymentProviderActionResult` with an explicit status
// string so the client never has to derive it from booleans.

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore, getCurrentUser } from "@/lib/auth/session";
import { decryptToken } from "@/lib/security/token-crypto";

import {
  isKnownPaymentProvider,
  PAYMENT_PROVIDER_REGISTRY,
  type PaymentProviderId,
} from "./registry";
import {
  deleteProviderConnection,
  loadApiKeyCredentials,
  markProviderStatus,
  persistApiKeyConnection,
} from "./store-connection";
import { getProviderValidator } from "./validators";
import type {
  PaymentProviderActionResult,
  PaymentProviderValidationResult,
} from "./types";
import type {
  ConnectProviderInput,
  DisconnectProviderInput,
  ValidateProviderInput,
} from "./action-types";

async function requireOwner() {
  const [user, store] = await Promise.all([getCurrentUser(), getCurrentStore()]);
  if (!user || !store) {
    throw new Error("No tenés sesión activa.");
  }
  return { user, store };
}

function fail(message: string): PaymentProviderActionResult {
  return { ok: false, message };
}

function revalidateStore() {
  revalidatePath("/admin/store");
}

// ─── Connect (API key based) ────────────────────────────────────────────
export async function connectPaymentProviderAction(
  input: ConnectProviderInput,
): Promise<PaymentProviderActionResult> {
  if (!isKnownPaymentProvider(input.provider as string)) {
    return fail(`El proveedor "${input.provider}" no está soportado.`);
  }
  const provider = input.provider as PaymentProviderId;
  const metadata = PAYMENT_PROVIDER_REGISTRY[provider];

  if (metadata.connectionStyle === "oauth") {
    return fail(
      `${metadata.label} se conecta vía OAuth. Iniciá el flujo desde el panel.`,
    );
  }

  const { store } = await requireOwner();

  const credentials: Record<string, string> = {};
  for (const field of metadata.credentialFields ?? []) {
    const raw = input.credentials?.[field.key];
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) {
      return fail(`Falta completar "${field.label}".`);
    }
    credentials[field.key] = value;
  }

  // Persist first as `connected` (optimistic but fail-honest: if the
  // validate step fails we mark the row as `error` with the message).
  await persistApiKeyConnection({
    storeId: store.id,
    provider,
    status: "connected",
    credentials,
  });

  let validation: PaymentProviderValidationResult | null = null;
  try {
    const stored = await loadApiKeyCredentials(store.id, provider);
    validation = await getProviderValidator(provider)({
      storeId: store.id,
      provider,
      secrets: stored?.secrets ?? {},
      publicValues: stored?.publicValues ?? {},
    });
  } catch (err) {
    validation = {
      ok: false,
      provider,
      validatedAt: new Date().toISOString(),
      message: err instanceof Error ? err.message : "Validación falló inesperadamente.",
    };
  }

  await markProviderStatus(store.id, provider, {
    status: validation.ok ? "connected" : "error",
    lastValidatedAt: new Date(),
    lastError: validation.ok ? null : validation.message,
  });

  revalidateStore();

  return {
    ok: validation.ok,
    status: validation.ok ? "connected" : "error",
    message: validation.message,
    validation,
  };
}

// ─── Validate (re-check) ─────────────────────────────────────────────────
export async function validatePaymentProviderAction(
  input: ValidateProviderInput,
): Promise<PaymentProviderActionResult> {
  if (!isKnownPaymentProvider(input.provider)) {
    return fail(`El proveedor "${input.provider}" no está soportado.`);
  }
  const provider = input.provider as PaymentProviderId;
  const metadata = PAYMENT_PROVIDER_REGISTRY[provider];
  const { store } = await requireOwner();

  // Mercado Pago has its own dedicated validate path: GET /users/me with
  // the decrypted access token. We inline it here so the merchant gets a
  // single "Validar" button that works for every provider.
  if (provider === "mercadopago") {
    return validateMercadoPago(store.id);
  }

  if (metadata.connectionStyle !== "api_keys") {
    return fail(`${metadata.label} no soporta validación manual.`);
  }

  const stored = await loadApiKeyCredentials(store.id, provider);
  if (!stored || Object.keys(stored.secrets).length === 0) {
    return fail(`${metadata.label} no está conectado.`);
  }

  let validation: PaymentProviderValidationResult;
  try {
    validation = await getProviderValidator(provider)({
      storeId: store.id,
      provider,
      secrets: stored.secrets,
      publicValues: stored.publicValues,
    });
  } catch (err) {
    validation = {
      ok: false,
      provider,
      validatedAt: new Date().toISOString(),
      message: err instanceof Error ? err.message : "Validación falló inesperadamente.",
    };
  }

  await markProviderStatus(store.id, provider, {
    status: validation.ok ? "connected" : "error",
    lastValidatedAt: new Date(),
    lastError: validation.ok ? null : validation.message,
  });

  revalidateStore();

  return {
    ok: validation.ok,
    status: validation.ok ? "connected" : "error",
    message: validation.message,
    validation,
  };
}

async function validateMercadoPago(storeId: string): Promise<PaymentProviderActionResult> {
  const row = await prisma.storePaymentProvider.findUnique({
    where: { storeId_provider: { storeId, provider: "mercadopago" } },
  });
  if (!row || !row.accessTokenEncrypted) {
    return fail("Mercado Pago no está conectado para esta tienda.");
  }

  const accessToken = decryptToken(row.accessTokenEncrypted);
  if (!accessToken) {
    await markProviderStatus(storeId, "mercadopago", {
      status: "needs_reconnection",
      lastError: "Token cifrado corrupto.",
    });
    return {
      ok: false,
      status: "needs_reconnection",
      message: "El token de Mercado Pago no se pudo descifrar. Reconectá la cuenta.",
    };
  }

  try {
    const response = await fetch("https://api.mercadopago.com/users/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (response.status === 401 || response.status === 403) {
      await markProviderStatus(storeId, "mercadopago", {
        status: "needs_reconnection",
        lastValidatedAt: new Date(),
        lastError: "Mercado Pago rechazó el access token (401/403).",
      });
      revalidateStore();
      return {
        ok: false,
        status: "needs_reconnection",
        message: "Mercado Pago rechazó el access token. Reconectá la cuenta.",
      };
    }

    if (!response.ok) {
      return fail(`Mercado Pago respondió ${response.status} al validar.`);
    }

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const accountId =
      data.id !== undefined && data.id !== null ? String(data.id) : null;
    const accountEmail = typeof data.email === "string" ? data.email : null;

    await prisma.storePaymentProvider.update({
      where: { storeId_provider: { storeId, provider: "mercadopago" } },
      data: {
        status: "connected",
        lastValidatedAt: new Date(),
        lastError: null,
        externalAccountId: accountId ?? undefined,
        accountEmail: accountEmail ?? undefined,
      },
    });

    revalidateStore();

    return {
      ok: true,
      status: "connected",
      message: accountEmail
        ? `Mercado Pago validado para ${accountEmail}.`
        : "Mercado Pago validado correctamente.",
      validation: {
        ok: true,
        provider: "mercadopago",
        validatedAt: new Date().toISOString(),
        message: "Token válido.",
      },
    };
  } catch (err) {
    return fail(
      `No se pudo contactar a Mercado Pago (${err instanceof Error ? err.message : "network_error"}).`,
    );
  }
}

// ─── Disconnect ──────────────────────────────────────────────────────────
export async function disconnectPaymentProviderAction(
  input: DisconnectProviderInput,
): Promise<PaymentProviderActionResult> {
  if (!isKnownPaymentProvider(input.provider as string)) {
    return fail(`El proveedor "${input.provider}" no está soportado.`);
  }
  const provider = input.provider;
  const { store } = await requireOwner();

  await deleteProviderConnection(store.id, provider);
  revalidateStore();

  const metadata = PAYMENT_PROVIDER_REGISTRY[provider as PaymentProviderId];
  return {
    ok: true,
    status: "disconnected",
    message: `${metadata.label} desconectado. Las credenciales fueron borradas de la tienda.`,
  };
}
