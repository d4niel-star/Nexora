// ─── Payment provider — credential validators ────────────────────────────
// Each provider exposes a small adapter that takes the decrypted
// credentials and tries to verify them against the real API. We keep
// every adapter explicit and honest:
//
//   - validators that hit a real public endpoint return `{ ok, message }`
//     based on the actual HTTP response.
//   - validators for providers that only operate behind contractual
//     onboarding (no public ping) return `{ ok: true, manual: true }` with
//     a clear message that explains what was persisted vs what still
//     depends on the merchant's contractual status.
//
// We never lie: if we cannot validate, we say so.

import type { PaymentProviderId } from "./registry";
import type { PaymentProviderValidationResult } from "./types";

interface ValidateInput {
  storeId: string;
  provider: PaymentProviderId;
  secrets: Record<string, string>;
  publicValues: Record<string, string>;
}

export type ProviderValidator = (input: ValidateInput) => Promise<PaymentProviderValidationResult>;

function manual(provider: PaymentProviderId, message: string): PaymentProviderValidationResult {
  return {
    ok: true,
    provider,
    validatedAt: new Date().toISOString(),
    message,
    manual: true,
  };
}

function ok(provider: PaymentProviderId, message: string): PaymentProviderValidationResult {
  return {
    ok: true,
    provider,
    validatedAt: new Date().toISOString(),
    message,
  };
}

function fail(provider: PaymentProviderId, message: string): PaymentProviderValidationResult {
  return {
    ok: false,
    provider,
    validatedAt: new Date().toISOString(),
    message,
  };
}

const PROVIDER_VALIDATORS: Record<PaymentProviderId, ProviderValidator> = {
  // ─── MODO ────────────────────────────────────────────────────────────
  // MODO Business expone OAuth client_credentials. Hacemos un POST a
  // /oauth/token y, si responde 200 con access_token, las credenciales
  // están vivas. La URL real depende del alta de cada comercio (sandbox vs
  // production); cuando no sabemos cuál usar, marcamos como manual y
  // explicamos qué pasó.
  modo: async ({ provider, secrets, publicValues }) => {
    const clientId = secrets.clientId || publicValues.clientId;
    const clientSecret = secrets.clientSecret;
    if (!clientId || !clientSecret) {
      return fail(provider, "Faltan client_id o client_secret de MODO.");
    }

    const env = (publicValues.environment ?? "live").toLowerCase();
    const baseUrl =
      env === "sandbox" ? "https://merchants.preprod.modo.com.ar" : "https://merchants.modo.com.ar";
    const url = `${baseUrl}/merchants/v1/auth/token`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
        cache: "no-store",
      });

      if (response.status === 401 || response.status === 403) {
        return fail(provider, "MODO rechazó las credenciales (401/403). Verificá client_id y client_secret.");
      }
      if (response.status >= 500) {
        return manual(provider, "MODO devolvió 5xx. Las credenciales se guardaron, reintentá la validación más tarde.");
      }
      if (!response.ok) {
        return fail(provider, `MODO respondió ${response.status} al validar credenciales.`);
      }

      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (typeof data.accessToken === "string" || typeof data.access_token === "string") {
        return ok(provider, "Credenciales MODO validadas contra la API.");
      }
      return manual(provider, "MODO respondió OK pero sin access_token. Las credenciales se guardaron.");
    } catch (err) {
      return manual(
        provider,
        `No se pudo contactar a MODO desde este entorno (${err instanceof Error ? err.message : "network_error"}). Las credenciales quedaron guardadas para validación manual.`,
      );
    }
  },

  // ─── Ualá Bis ────────────────────────────────────────────────────────
  // Ualá Bis no publica un endpoint de "ping" oficial libre; la validación
  // real ocurre cuando se crea un link de pago. Persistimos el API key y
  // dejamos la validación como manual, declarándolo abiertamente.
  "uala-bis": async ({ provider, secrets }) => {
    if (!secrets.apiKey) {
      return fail(provider, "Falta el API key de Ualá Bis.");
    }
    return manual(
      provider,
      "Ualá Bis no expone un ping público para validar el API key. La credencial quedó guardada cifrada y se valida automáticamente al crear el primer cobro.",
    );
  },

  // ─── dLocal ──────────────────────────────────────────────────────────
  // dLocal expone GET /payments con autenticación HMAC. Hacemos una
  // request mínima y, si devuelve 200 / 400 (credenciales aceptadas pero
  // el body es inválido), interpretamos que las llaves son válidas.
  // Auth: HMAC-SHA256 del payload con la x-trans-key.
  dlocal: async ({ provider, secrets, publicValues }) => {
    const xLogin = secrets.xLogin || publicValues.xLogin;
    const xTransKey = secrets.xTransKey;
    if (!xLogin || !xTransKey) {
      return fail(provider, "Faltan X-Login o X-Trans-Key de dLocal.");
    }

    const env = (publicValues.environment ?? "live").toLowerCase();
    const baseUrl = env === "sandbox" ? "https://sandbox.dlocal.com" : "https://api.dlocal.com";

    try {
      const date = new Date().toUTCString();
      // HMAC: dlocal espera una firma sobre `xLogin + date + body`. Para
      // un GET dejamos body vacío.
      const { createHmac } = await import("crypto");
      const signaturePayload = `${xLogin}${date}`;
      const signature = createHmac("sha256", xTransKey).update(signaturePayload).digest("hex");

      const response = await fetch(`${baseUrl}/payments?limit=1`, {
        method: "GET",
        headers: {
          "X-Date": date,
          "X-Login": xLogin,
          "X-Trans-Key": xTransKey,
          Authorization: `V2-HMAC-SHA256, Signature: ${signature}`,
          accept: "application/json",
        },
        cache: "no-store",
      });

      if (response.status === 401 || response.status === 403) {
        return fail(provider, "dLocal rechazó las credenciales (401/403). Verificá X-Login, X-Trans-Key y entorno.");
      }
      if (response.status >= 500) {
        return manual(provider, "dLocal devolvió 5xx. Las credenciales se guardaron, reintentá la validación más tarde.");
      }
      if (response.ok || response.status === 400 || response.status === 422) {
        return ok(provider, "Credenciales dLocal aceptadas por la API.");
      }
      return fail(provider, `dLocal respondió ${response.status} al validar credenciales.`);
    } catch (err) {
      return manual(
        provider,
        `No se pudo contactar a dLocal desde este entorno (${err instanceof Error ? err.message : "network_error"}). Las credenciales quedaron guardadas para validación manual.`,
      );
    }
  },

  // ─── PayU LATAM ──────────────────────────────────────────────────────
  // PayU expone POST /reports-api/4.0/service.cgi con `command:"PING"`.
  // Si las credenciales son válidas devuelve `{ code: "SUCCESS" }`.
  payu: async ({ provider, secrets, publicValues }) => {
    const apiKey = secrets.apiKey;
    const apiLogin = publicValues.apiLogin;
    if (!apiKey || !apiLogin) {
      return fail(provider, "Faltan API Key o API Login de PayU.");
    }

    const env = (publicValues.environment ?? "live").toLowerCase();
    const url =
      env === "sandbox"
        ? "https://sandbox.api.payulatam.com/reports-api/4.0/service.cgi"
        : "https://api.payulatam.com/reports-api/4.0/service.cgi";

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          test: env !== "live",
          language: "es",
          command: "PING",
          merchant: { apiLogin, apiKey },
        }),
        cache: "no-store",
      });

      if (response.status >= 500) {
        return manual(provider, "PayU devolvió 5xx. Las credenciales se guardaron, reintentá más tarde.");
      }
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const code = typeof data.code === "string" ? data.code : null;
      if (code === "SUCCESS") {
        return ok(provider, "Credenciales PayU validadas con PING.");
      }
      const errorMsg =
        typeof data.error === "string" ? data.error : `PayU respondió ${response.status}.`;
      return fail(provider, `PayU rechazó las credenciales: ${errorMsg}`);
    } catch (err) {
      return manual(
        provider,
        `No se pudo contactar a PayU desde este entorno (${err instanceof Error ? err.message : "network_error"}). Las credenciales quedaron guardadas para validación manual.`,
      );
    }
  },

  // ─── Payway (Decidir) ────────────────────────────────────────────────
  // Payway no expone un endpoint público de validación de credenciales.
  // La verificación real ocurre al tokenizar la primera tarjeta. Lo
  // declaramos de manera honesta.
  payway: async ({ provider, secrets, publicValues }) => {
    if (!secrets.privateApiKey || !publicValues.publicApiKey) {
      return fail(provider, "Faltan Public API Key o Private API Key de Payway.");
    }
    return manual(
      provider,
      "Payway no expone un ping público. Las llaves quedaron guardadas cifradas y se validan automáticamente al tokenizar la primera tarjeta.",
    );
  },

  // ─── Mercado Pago ────────────────────────────────────────────────────
  // MP no se conecta vía API key — pasa por OAuth y vive en un flujo
  // dedicado. Este validator existe sólo para que el switch sea total y
  // se llama desde la action `validateProviderAction` cuando se le pide
  // re-validar la conexión OAuth (hace GET /users/me con el access token
  // descifrado, ese path vive en `mercadopago/tenant.ts`).
  mercadopago: async ({ provider }) => {
    return manual(
      provider,
      "Mercado Pago se valida en su flujo OAuth dedicado (no vía API keys).",
    );
  },
};

export function getProviderValidator(id: PaymentProviderId): ProviderValidator {
  return PROVIDER_VALIDATORS[id];
}
