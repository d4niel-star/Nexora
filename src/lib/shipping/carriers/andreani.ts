// ─── Andreani API adapter ──────────────────────────────────────────────────
// Implements the verbs the official Andreani API exposes:
//   GET  /login                            → bearer (Basic Auth)
//   GET  /v1/tarifas?cpDestino=…           → cotización
//   POST /v2/ordenes-de-envio              → alta de envío
//   GET  /v2/ordenes-de-envio/{n}/etiquetas → etiqueta (PDF)
//   GET  /v2/envios/{n}/trazas             → tracking (autenticado)
//
// The `/login` endpoint may return the bearer in either the response
// body (`token`) or the `x-authorization-token` response header — we
// accept either. The bearer is short-lived (~24 h) and intentionally NOT
// persisted: every verb call mints a fresh one and discards it.
//
// Andreani requires a `contrato` for quotes/labels in addition to the
// `cliente` (number-of-customer). Both are pulled from the carrier
// connection: `cliente` ← `accountClientNumber`, `contrato` ← `config.contractNumber`.

import type {
  CarrierAdapter,
  CarrierAuthContext,
  CarrierCapabilities,
  CarrierCredentialsInput,
  CarrierValidationResult,
  CreateShipmentInput,
  CreateShipmentResult,
  QuoteShipmentInput,
  QuoteShipmentResult,
  TrackingResult,
} from "../types";
import { ensureCredentials, issueBearer } from "../auth-helper";

const BASE_PROD = "https://apis.andreani.com";
const BASE_SANDBOX = "https://apisqa.andreani.com";

const CAPABILITIES: CarrierCapabilities = {
  validateCredentials: true,
  quoteShipment: true,
  createShipment: true,
  labelPdf: true,
  getTracking: true,
  publicTracking: true, // apidestinatarios.andreani.com is public.
};

function baseFor(environment: CarrierCredentialsInput["environment"]): string {
  return environment === "sandbox" ? BASE_SANDBOX : BASE_PROD;
}

async function authBearer(ctx: CarrierAuthContext) {
  return issueBearer({
    url: `${baseFor(ctx.environment)}/login`,
    method: "GET",
    username: ctx.username,
    password: ctx.password,
    tokenLocation: "either",
  });
}

async function authedFetch(
  ctx: CarrierAuthContext,
  bearer: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(`${baseFor(ctx.environment)}${path}`, {
    ...init,
    headers: {
      "x-authorization-token": bearer,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
}

function getContractNumber(ctx: CarrierAuthContext): string | null {
  const v = ctx.config?.contractNumber;
  return typeof v === "string" && v.length > 0 ? v : null;
}

export const andreaniAdapter: CarrierAdapter = {
  id: "andreani",
  capabilities: CAPABILITIES,

  // ── validateCredentials ────────────────────────────────────────────────
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

    const token = await issueBearer({
      url: `${baseFor(input.environment)}/login`,
      method: "GET",
      username: input.username,
      password: input.password,
      tokenLocation: "either",
    });
    if (!token.ok) {
      if (token.code === "invalid_credentials") {
        return {
          ok: false,
          code: token.code,
          message:
            "Andreani rechazó las credenciales. Revisá usuario, contraseña y ambiente.",
        };
      }
      if (token.code === "ip_blocked") {
        return {
          ok: false,
          code: token.code,
          message:
            "Andreani aceptó la contraseña pero la IP del servidor no está habilitada en tu cuenta. Pedile a Andreani agregar la IP del backend de Nexora a tu allowlist.",
        };
      }
      return token;
    }

    return {
      ok: true,
      metadata: {
        externalAccountId: input.clientNumber,
        displayName: `Cliente Nº ${input.clientNumber}`,
      },
    };
  },

  // ── quoteShipment ──────────────────────────────────────────────────────
  async quoteShipment(
    ctx: CarrierAuthContext,
    input: QuoteShipmentInput,
  ): Promise<QuoteShipmentResult> {
    const guard = ensureCredentials(ctx);
    if (!guard.ok) return guard;
    if (!ctx.clientNumber) {
      return {
        ok: false,
        code: "missing_field",
        message: "Falta el número de cliente Andreani.",
      };
    }
    const contrato = getContractNumber(ctx);
    if (!contrato) {
      return {
        ok: false,
        code: "missing_field",
        message:
          "Falta el número de contrato Andreani. Cargalo en la página de Andreani antes de cotizar.",
      };
    }
    if (!input.destination.postalCode) {
      return {
        ok: false,
        code: "missing_field",
        message: "Falta el código postal de destino.",
      };
    }

    const auth = await authBearer(ctx);
    if (!auth.ok) return auth;

    const params = new URLSearchParams();
    params.set("cpDestino", input.destination.postalCode);
    params.set("contrato", contrato);
    params.set("cliente", ctx.clientNumber);
    params.set("bultos[0][kilos]", String(Math.max(0.1, input.package.weightG / 1000)));
    params.set(
      "bultos[0][volumen]",
      String(
        Math.max(
          1,
          input.package.heightCm * input.package.widthCm * input.package.lengthCm,
        ),
      ),
    );
    params.set(
      "bultos[0][valorDeclarado]",
      String(Math.max(0, Math.round(input.package.declaredValue ?? 0))),
    );

    let response: Response;
    try {
      response = await authedFetch(ctx, auth.token, `/v1/tarifas?${params.toString()}`);
    } catch {
      return {
        ok: false,
        code: "network_error",
        message: "No se pudo contactar a Andreani para cotizar.",
      };
    }

    if (response.status === 401) {
      return {
        ok: false,
        code: "invalid_credentials",
        message: "Andreani rechazó la cotización por credenciales.",
      };
    }
    if (response.status === 403) {
      return {
        ok: false,
        code: "ip_blocked",
        message:
          "Andreani aceptó las credenciales pero bloqueó la IP. Habilitá la IP del backend en tu cuenta.",
      };
    }
    if (response.status === 429) {
      return {
        ok: false,
        code: "rate_limited",
        message: "Andreani está limitando solicitudes. Reintentá en unos minutos.",
      };
    }
    if (response.status >= 500) {
      return {
        ok: false,
        code: "carrier_unavailable",
        message: "Andreani está respondiendo con error. Reintentá más tarde.",
      };
    }
    if (!response.ok) {
      return {
        ok: false,
        code: "unexpected_response",
        message: `Respuesta inesperada cotizando (HTTP ${response.status}).`,
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

    // Andreani returns either a single tariff object or an array. Normalise.
    const obj = (payload ?? {}) as Record<string, unknown>;
    const list: Array<Record<string, unknown>> = Array.isArray(payload)
      ? (payload as Array<Record<string, unknown>>)
      : Array.isArray(obj.tarifas)
        ? (obj.tarifas as Array<Record<string, unknown>>)
        : [obj];

    const rates = list
      .filter((r) => r && typeof r === "object")
      .map((r) => {
        const amount =
          typeof r.tarifaConIva === "number"
            ? r.tarifaConIva
            : typeof r.tarifaSinIva === "number"
              ? r.tarifaSinIva
              : typeof r.precio === "number"
                ? r.precio
                : Number(r.tarifa ?? r.amount ?? 0);
        return {
          carrierId: "andreani" as const,
          serviceCode: typeof r.contrato === "string" ? r.contrato : contrato,
          serviceName:
            (typeof r.tipoEnvio === "string" && r.tipoEnvio) ||
            (typeof r.servicio === "string" && r.servicio) ||
            "Andreani",
          amount,
          currency: "ARS",
          estimatedDaysMin: parseDays(r.plazoMinimo ?? r.plazoEntregaMinimo),
          estimatedDaysMax: parseDays(r.plazoMaximo ?? r.plazoEntregaMaximo),
          deliveryType:
            input.deliveryType === "branch" ? ("branch" as const) : ("home" as const),
          validUntil: typeof r.vigenciaHasta === "string" ? r.vigenciaHasta : null,
        };
      })
      .filter((r) => r.amount > 0);

    if (rates.length === 0) {
      return {
        ok: false,
        code: "unexpected_response",
        message: "Andreani no devolvió tarifas para esos parámetros.",
      };
    }

    return { ok: true, rates };
  },

  // ── createShipment ─────────────────────────────────────────────────────
  async createShipment(
    ctx: CarrierAuthContext,
    input: CreateShipmentInput,
  ): Promise<CreateShipmentResult> {
    const guard = ensureCredentials(ctx);
    if (!guard.ok) return guard;
    if (!ctx.clientNumber) {
      return {
        ok: false,
        code: "missing_field",
        message: "Falta el número de cliente Andreani.",
      };
    }
    const contrato = input.serviceCode || getContractNumber(ctx);
    if (!contrato) {
      return {
        ok: false,
        code: "missing_field",
        message: "Falta el número de contrato Andreani para crear el envío.",
      };
    }

    const auth = await authBearer(ctx);
    if (!auth.ok) return auth;

    const body = {
      contrato,
      origen: {
        postal: {
          codigoPostal: input.origin.postalCode,
          calle: input.origin.street ?? "",
          numero: input.origin.streetNumber ?? "",
          localidad: input.origin.city ?? "",
          region: input.origin.province ?? "",
          pais: input.origin.country ?? "Argentina",
          componentesDeDireccion: [
            { meta: "piso", contenido: input.origin.floor ?? "" },
            { meta: "departamento", contenido: input.origin.apartment ?? "" },
          ],
        },
      },
      destino: {
        postal: {
          codigoPostal: input.destination.postalCode,
          calle: input.destination.street ?? "",
          numero: input.destination.streetNumber ?? "",
          localidad: input.destination.city ?? "",
          region: input.destination.province ?? "",
          pais: input.destination.country ?? "Argentina",
          componentesDeDireccion: [
            { meta: "piso", contenido: input.destination.floor ?? "" },
            { meta: "departamento", contenido: input.destination.apartment ?? "" },
          ],
        },
      },
      remitente: {
        nombreCompleto: input.origin.name,
        email: input.origin.email,
        documentoTipo: "DNI",
        documentoNumero: input.origin.document ?? "",
        telefonos: input.origin.phone ? [{ tipo: 1, numero: input.origin.phone }] : [],
      },
      destinatario: [
        {
          nombreCompleto: input.destination.name,
          email: input.destination.email,
          documentoTipo: "DNI",
          documentoNumero: input.destination.document ?? "",
          telefonos: input.destination.phone
            ? [{ tipo: 1, numero: input.destination.phone }]
            : [],
        },
      ],
      bultos: [
        {
          kilos: Math.max(0.1, input.package.weightG / 1000),
          largoCm: Math.max(1, Math.round(input.package.lengthCm)),
          anchoCm: Math.max(1, Math.round(input.package.widthCm)),
          altoCm: Math.max(1, Math.round(input.package.heightCm)),
          valorDeclaradoConImpuestos: input.package.declaredValue ?? 0,
          referencias: [{ meta: "numeroDeOrden", contenido: input.externalOrderId }],
        },
      ],
    };

    let response: Response;
    try {
      response = await authedFetch(ctx, auth.token, "/v2/ordenes-de-envio", {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch {
      return {
        ok: false,
        code: "network_error",
        message: "No se pudo contactar a Andreani para crear el envío.",
      };
    }

    const raw = await response.text();
    if (response.status === 401) {
      return {
        ok: false,
        code: "invalid_credentials",
        message: "Andreani rechazó el envío por credenciales.",
      };
    }
    if (response.status === 403) {
      return {
        ok: false,
        code: "ip_blocked",
        message: "Andreani bloqueó la IP del servidor.",
      };
    }
    if (response.status === 422 || response.status === 400) {
      return {
        ok: false,
        code: "unexpected_response",
        message:
          extractMessage(raw) ?? `Andreani rechazó el envío (HTTP ${response.status}).`,
      };
    }
    if (!response.ok) {
      return {
        ok: false,
        code: "unexpected_response",
        message: `Respuesta inesperada creando envío (HTTP ${response.status}).`,
      };
    }

    let payload: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        payload = parsed as Record<string, unknown>;
      }
    } catch {
      payload = {};
    }

    const bultos = Array.isArray(payload.bultos)
      ? (payload.bultos as Array<Record<string, unknown>>)
      : [];
    const numeroAndreani: string | null =
      typeof payload.numeroAndreani === "string"
        ? payload.numeroAndreani
        : bultos[0] && typeof bultos[0].numeroDeEnvio === "string"
          ? (bultos[0].numeroDeEnvio as string)
          : null;

    return {
      ok: true,
      externalShipmentId: numeroAndreani,
      trackingNumber: numeroAndreani,
      trackingUrl: numeroAndreani
        ? `https://andreani.com/seguimiento/${encodeURIComponent(numeroAndreani)}`
        : null,
      labelUrl: null, // PDF served by /etiquetas — fetched on demand by getLabelPdf.
      status: typeof payload.estado === "string" ? payload.estado : "created",
      raw: payload,
    };
  },

  // ── getTracking ───────────────────────────────────────────────────────
  async getTracking(
    ctx: CarrierAuthContext,
    trackingNumber: string,
  ): Promise<TrackingResult> {
    if (!trackingNumber) {
      return {
        ok: false,
        code: "missing_field",
        message: "Falta el número Andreani para consultar tracking.",
      };
    }

    // Andreani exposes a public tracking endpoint that does not need the
    // merchant's credentials. Use it as the primary path so the merchant
    // can track packages even before /login succeeds (eg. a freshly
    // rotated password). Fall back to the authenticated v2 endpoint
    // when the public one is unavailable.
    try {
      const publicRes = await fetch(
        `https://apidestinatarios.andreani.com/api/envios/${encodeURIComponent(trackingNumber)}`,
        { cache: "no-store", headers: { Accept: "application/json" } },
      );
      if (publicRes.ok) {
        const payload = (await publicRes.json()) as Record<string, unknown>;
        const status = typeof payload.estado === "string" ? payload.estado : "unknown";
        const event: import("../types").TrackingEvent = {
          occurredAt:
            typeof payload.fechaDeAlta === "string"
              ? payload.fechaDeAlta
              : new Date().toISOString(),
          status,
          description:
            typeof payload.servicio === "string" ? String(payload.servicio) : null,
          location:
            typeof payload.nombreSucursalDistribucion === "string"
              ? payload.nombreSucursalDistribucion
              : null,
        };
        return {
          ok: true,
          trackingNumber,
          status,
          events: [event],
          lastUpdate: event.occurredAt,
          raw: payload,
        };
      }
      if (publicRes.status === 404) {
        return {
          ok: false,
          code: "not_supported",
          message: "Andreani no encontró un envío con ese número.",
        };
      }
    } catch {
      // network issue → try authenticated path below.
    }

    // Authenticated fallback.
    const guard = ensureCredentials(ctx);
    if (!guard.ok) return guard;

    const auth = await authBearer(ctx);
    if (!auth.ok) return auth;

    let response: Response;
    try {
      response = await authedFetch(
        ctx,
        auth.token,
        `/v2/envios/${encodeURIComponent(trackingNumber)}/trazas`,
      );
    } catch {
      return {
        ok: false,
        code: "network_error",
        message: "No se pudo contactar a Andreani para tracking.",
      };
    }

    if (response.status === 404) {
      return {
        ok: false,
        code: "not_supported",
        message: "Andreani no encontró trazas para ese número.",
      };
    }
    if (!response.ok) {
      return {
        ok: false,
        code: "unexpected_response",
        message: `Respuesta inesperada en tracking (HTTP ${response.status}).`,
      };
    }

    let payload: Record<string, unknown> = {};
    try {
      const parsed = await response.json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        payload = parsed as Record<string, unknown>;
      }
    } catch {
      return {
        ok: false,
        code: "unexpected_response",
        message: "Andreani respondió con un cuerpo no JSON.",
      };
    }

    const events = Array.isArray(payload.eventos)
      ? (payload.eventos as Array<Record<string, unknown>>).map((e) => ({
          occurredAt:
            typeof e.Fecha === "string"
              ? e.Fecha
              : new Date().toISOString(),
          status: typeof e.Estado === "string" ? e.Estado : "unknown",
          description:
            (typeof e.Traduccion === "string" && e.Traduccion) ||
            (typeof e.Estado === "string" && e.Estado) ||
            null,
          location: typeof e.Sucursal === "string" ? e.Sucursal : null,
        }))
      : [];

    return {
      ok: true,
      trackingNumber,
      status: events[0]?.status ?? "unknown",
      events,
      lastUpdate: events[0]?.occurredAt ?? null,
      raw: payload,
    };
  },

  // ── getLabelPdf ───────────────────────────────────────────────────────
  async getLabelPdf(ctx: CarrierAuthContext, externalShipmentId: string) {
    const guard = ensureCredentials(ctx);
    if (!guard.ok) return guard;
    if (!externalShipmentId) {
      return {
        ok: false as const,
        code: "missing_field" as const,
        message: "Falta el número Andreani para descargar la etiqueta.",
      };
    }
    const auth = await authBearer(ctx);
    if (!auth.ok) return auth;

    let response: Response;
    try {
      response = await fetch(
        `${baseFor(ctx.environment)}/v2/ordenes-de-envio/${encodeURIComponent(
          externalShipmentId,
        )}/etiquetas`,
        {
          headers: {
            "x-authorization-token": auth.token,
            Accept: "application/pdf",
          },
          cache: "no-store",
        },
      );
    } catch {
      return {
        ok: false as const,
        code: "network_error" as const,
        message: "No se pudo contactar a Andreani para la etiqueta.",
      };
    }

    if (response.status === 404) {
      return {
        ok: false as const,
        code: "not_supported" as const,
        message: "Andreani no encontró una etiqueta para ese número.",
      };
    }
    if (!response.ok) {
      return {
        ok: false as const,
        code: "unexpected_response" as const,
        message: `Respuesta inesperada descargando la etiqueta (HTTP ${response.status}).`,
      };
    }

    const buf = new Uint8Array(await response.arrayBuffer());
    return { ok: true as const, pdf: buf };
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────
function parseDays(v: unknown): number | undefined {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function extractMessage(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw) as { message?: unknown; mensaje?: unknown };
    if (typeof parsed.message === "string") return parsed.message;
    if (typeof parsed.mensaje === "string") return parsed.mensaje;
  } catch {
    // not JSON
  }
  return null;
}
