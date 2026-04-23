// ─── Carrier bearer-token helper ──────────────────────────────────────────
// Centralises the pattern shared by every supported carrier: Basic Auth
// against `/login` or `/token` to mint a short-lived bearer/JWT, then use
// that bearer for the verb of the day. The bearer is intentionally never
// persisted: each request mints one and discards it. The merchant's
// password lives encrypted in StoreCarrierConnection and is the only
// long-lived secret on disk.

import type { CarrierAuthContext, CarrierErrorCode } from "./types";

export type IssuedToken =
  | { ok: true; token: string }
  | { ok: false; code: CarrierErrorCode; message: string };

interface IssueArgs {
  url: string;
  method?: "GET" | "POST";
  username: string;
  password: string;
  /** Where the carrier returns the bearer ("body.token" by default). */
  tokenLocation?: "body.token" | "header.x-authorization-token" | "either";
}

/**
 * Issues a bearer token using HTTP Basic Auth. Maps standard HTTP
 * statuses to the same error codes the rest of the shipping layer uses
 * so the UI gets a consistent surface.
 */
export async function issueBearer(args: IssueArgs): Promise<IssuedToken> {
  const {
    url,
    method = "GET",
    username,
    password,
    tokenLocation = "body.token",
  } = args;

  const basic = Buffer.from(`${username}:${password}`, "utf8").toString("base64");

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Basic ${basic}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      code: "network_error",
      message:
        "No se pudo contactar al carrier. Verificá tu conexión y reintentá.",
    };
  }

  if (response.status === 401) {
    return {
      ok: false,
      code: "invalid_credentials",
      message:
        "El carrier rechazó las credenciales guardadas. Volvé a conectar la cuenta.",
    };
  }
  if (response.status === 403) {
    return {
      ok: false,
      code: "ip_blocked",
      message:
        "El carrier rechazó la conexión por restricción de IP. Pedile que habilite la IP del backend de Nexora.",
    };
  }
  if (response.status === 429) {
    return {
      ok: false,
      code: "rate_limited",
      message: "El carrier está limitando solicitudes. Reintentá en unos minutos.",
    };
  }
  if (response.status >= 500) {
    return {
      ok: false,
      code: "carrier_unavailable",
      message: "El carrier respondió con un error. Reintentá más tarde.",
    };
  }
  if (!response.ok) {
    return {
      ok: false,
      code: "unexpected_response",
      message: `Respuesta inesperada del carrier (HTTP ${response.status}).`,
    };
  }

  // Try header first when the caller asked for either / header.
  if (
    tokenLocation === "header.x-authorization-token" ||
    tokenLocation === "either"
  ) {
    const headerToken =
      response.headers.get("x-authorization-token") ??
      response.headers.get("X-Authorization-Token");
    if (headerToken && headerToken.length > 0) {
      return { ok: true, token: headerToken };
    }
    if (tokenLocation === "header.x-authorization-token") {
      return {
        ok: false,
        code: "unexpected_response",
        message:
          "El carrier no devolvió el header x-authorization-token esperado.",
      };
    }
  }

  // Body lookup.
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return {
      ok: false,
      code: "unexpected_response",
      message: "El carrier respondió con un cuerpo no JSON.",
    };
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    typeof (payload as { token?: unknown }).token !== "string" ||
    (payload as { token: string }).token.length === 0
  ) {
    return {
      ok: false,
      code: "unexpected_response",
      message: "La respuesta del carrier no incluyó un token válido.",
    };
  }

  return { ok: true, token: (payload as { token: string }).token };
}

export function describeAuthFailure(token: IssuedToken): {
  ok: false;
  code: CarrierErrorCode;
  message: string;
} {
  if (token.ok) {
    throw new Error("describeAuthFailure called with a successful token");
  }
  return token;
}

/** Trivial sanity-check before calling any verb. */
export function ensureCredentials(
  ctx: CarrierAuthContext,
):
  | { ok: true }
  | { ok: false; code: CarrierErrorCode; message: string } {
  if (!ctx.username || !ctx.password) {
    return {
      ok: false,
      code: "not_connected",
      message: "Faltan credenciales válidas. Reconectá la cuenta del carrier.",
    };
  }
  return { ok: true };
}
