// ─── Andreani API adapter ──────────────────────────────────────────────────
// Validates merchant credentials by performing the real authentication
// round-trip against the official Andreani API:
//   GET  ${BASE}/login   with HTTP Basic Auth (user:password)
//   200 → { token: "<JWT>", refreshToken: "<JWT>" } (token TTL ~24 h)
//   401 → invalid credentials.
//   403 → IP not whitelisted on Andreani's side (separate failure mode).
//
// Like Correo Argentino, the bearer is short-lived and intentionally NOT
// persisted. Future shipping verbs will re-issue it on demand using the
// encrypted password and discard it after each call.

import type {
  CarrierAdapter,
  CarrierCredentialsInput,
  CarrierValidationResult,
} from "../types";

const BASE_PROD = "https://apis.andreani.com";
const BASE_SANDBOX = "https://apisqa.andreani.com";

function baseFor(environment: CarrierCredentialsInput["environment"]): string {
  return environment === "sandbox" ? BASE_SANDBOX : BASE_PROD;
}

export const andreaniAdapter: CarrierAdapter = {
  id: "andreani",

  async validateCredentials(
    input: CarrierCredentialsInput,
  ): Promise<CarrierValidationResult> {
    if (!input.username || !input.password) {
      return {
        ok: false,
        code: "missing_field",
        message: "Faltan usuario o contraseña.",
      };
    }
    if (!input.clientNumber) {
      return {
        ok: false,
        code: "missing_field",
        message: "Falta el número de cliente Andreani.",
      };
    }

    const url = `${baseFor(input.environment)}/login`;
    const basic = Buffer.from(
      `${input.username}:${input.password}`,
      "utf8",
    ).toString("base64");

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Basic ${basic}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });
    } catch (err) {
      return {
        ok: false,
        code: "network_error",
        message:
          "No se pudo contactar a Andreani. Verificá tu conexión y reintentá.",
      };
    }

    if (response.status === 401) {
      return {
        ok: false,
        code: "invalid_credentials",
        message:
          "Andreani rechazó las credenciales. Revisá usuario, contraseña y ambiente.",
      };
    }

    // Andreani specifically uses 403 to signal that the source IP is not
    // on the customer's allowlist. This is a customer-side configuration
    // problem, not a credential problem, and we surface it that way.
    if (response.status === 403) {
      return {
        ok: false,
        code: "ip_blocked",
        message:
          "Andreani aceptó la contraseña pero la IP del servidor no está habilitada en tu cuenta. Pedile a Andreani agregar la IP del backend de Nexora a tu allowlist.",
      };
    }

    if (response.status === 429) {
      return {
        ok: false,
        code: "rate_limited",
        message:
          "Andreani está limitando las solicitudes. Esperá unos minutos y reintentá.",
      };
    }

    if (response.status >= 500) {
      return {
        ok: false,
        code: "carrier_unavailable",
        message:
          "La API de Andreani está respondiendo con error. Reintentá más tarde.",
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        code: "unexpected_response",
        message: `Respuesta inesperada de Andreani (HTTP ${response.status}).`,
      };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return {
        ok: false,
        code: "unexpected_response",
        message: "Andreani respondió con un cuerpo no JSON.",
      };
    }

    if (
      !payload ||
      typeof payload !== "object" ||
      typeof (payload as { token?: unknown }).token !== "string" ||
      ((payload as { token: string }).token).length === 0
    ) {
      return {
        ok: false,
        code: "unexpected_response",
        message: "La respuesta de Andreani no incluyó un token válido.",
      };
    }

    return {
      ok: true,
      metadata: {
        externalAccountId: input.clientNumber,
        displayName: `Cliente Nº ${input.clientNumber}`,
      },
    };
  },
};
