// ─── Correo Argentino (MiCorreo API) adapter ───────────────────────────────
// Validates merchant credentials by performing the real authentication
// round-trip documented in the MiCorreo public PDF:
//   POST  ${BASE}/token   with HTTP Basic Auth (user:password)
//   200 → { token: "<JWT>", expires: "YYYY-MM-DD HH:MM:SS" }
//   401 → invalid credentials.
//
// The bearer is short-lived (the response carries the expiry date) so we
// do NOT persist it. Future shipping operations will re-issue it on
// demand from the persisted password (encrypted) and discard it after
// each call. This keeps the secret footprint at a single value.

import type {
  CarrierAdapter,
  CarrierCredentialsInput,
  CarrierValidationResult,
} from "../types";

const BASE_PROD = "https://api.correoargentino.com.ar/micorreo/v1";
const BASE_SANDBOX = "https://apitest.correoargentino.com.ar/micorreo/v1";

function baseFor(environment: CarrierCredentialsInput["environment"]): string {
  return environment === "sandbox" ? BASE_SANDBOX : BASE_PROD;
}

export const correoArgentinoAdapter: CarrierAdapter = {
  id: "correo_argentino",

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
        message: "Falta el número de cliente / centro de costos.",
      };
    }

    const url = `${baseFor(input.environment)}/token`;
    const basic = Buffer.from(
      `${input.username}:${input.password}`,
      "utf8",
    ).toString("base64");

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basic}`,
          Accept: "application/json",
        },
        // The token endpoint takes Basic Auth in the header; no body required.
        cache: "no-store",
      });
    } catch (err) {
      return {
        ok: false,
        code: "network_error",
        message:
          "No se pudo contactar a Correo Argentino. Verificá tu conexión y reintentá.",
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        code: "invalid_credentials",
        message:
          "Correo Argentino rechazó las credenciales. Revisá usuario, contraseña y ambiente.",
      };
    }

    if (response.status === 429) {
      return {
        ok: false,
        code: "rate_limited",
        message:
          "Correo Argentino está limitando las solicitudes. Esperá unos minutos y reintentá.",
      };
    }

    if (response.status >= 500) {
      return {
        ok: false,
        code: "carrier_unavailable",
        message:
          "La API de Correo Argentino está respondiendo con error. Reintentá más tarde.",
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        code: "unexpected_response",
        message: `Respuesta inesperada de Correo Argentino (HTTP ${response.status}).`,
      };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return {
        ok: false,
        code: "unexpected_response",
        message:
          "Correo Argentino respondió con un cuerpo no JSON. Reintentá o contactá a soporte.",
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
        message:
          "La respuesta de Correo Argentino no incluyó un token válido.",
      };
    }

    return {
      ok: true,
      metadata: {
        // Correo Argentino's /token endpoint returns no account metadata,
        // so we mirror back what the merchant entered: the client number
        // is the canonical operative identifier on their side.
        externalAccountId: input.clientNumber,
        displayName: `Cliente Nº ${input.clientNumber}`,
      },
    };
  },
};
