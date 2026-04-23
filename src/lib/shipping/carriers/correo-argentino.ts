// ─── Correo Argentino (MiCorreo API) adapter ───────────────────────────────
// Implements the verbs the public MiCorreo v1 API actually exposes:
//   POST /token              → bearer (Basic Auth)        validateCredentials
//   POST /rates              → cotización                  quoteShipment
//   POST /shipping/import    → alta de envío               createShipment
//   GET  /shipping/tracking  → trazas de envío             getTracking
//
// What it does NOT expose: a label PDF endpoint. Correo Argentino
// historically requires the merchant to print labels from the MiCorreo
// portal after `/shipping/import` succeeds. We surface this honestly
// instead of pretending we can return a PDF.
//
// The bearer is short-lived (the `/token` response carries `expires`)
// so we mint one on-demand per verb call and discard it. The encrypted
// password is the only long-lived secret on disk.

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

const BASE_PROD = "https://api.correoargentino.com.ar/micorreo/v1";
const BASE_SANDBOX = "https://apitest.correoargentino.com.ar/micorreo/v1";

const CAPABILITIES: CarrierCapabilities = {
  validateCredentials: true,
  quoteShipment: true,
  createShipment: true,
  labelPdf: false, // not exposed by MiCorreo's API — printed from the portal.
  getTracking: true,
  publicTracking: false,
};

function baseFor(environment: CarrierCredentialsInput["environment"]): string {
  return environment === "sandbox" ? BASE_SANDBOX : BASE_PROD;
}

async function authBearer(ctx: CarrierAuthContext) {
  return issueBearer({
    url: `${baseFor(ctx.environment)}/token`,
    method: "POST",
    username: ctx.username,
    password: ctx.password,
    tokenLocation: "body.token",
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
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
}

export const correoArgentinoAdapter: CarrierAdapter = {
  id: "correo_argentino",
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
        message: "Falta el número de cliente / centro de costos.",
      };
    }

    const token = await issueBearer({
      url: `${baseFor(input.environment)}/token`,
      method: "POST",
      username: input.username,
      password: input.password,
      tokenLocation: "body.token",
    });
    if (!token.ok) {
      // Use a more carrier-specific message for invalid credentials.
      if (token.code === "invalid_credentials") {
        return {
          ok: false,
          code: token.code,
          message:
            "Correo Argentino rechazó las credenciales. Revisá usuario, contraseña y ambiente.",
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
        message: "Falta el número de cliente de Correo Argentino.",
      };
    }
    if (!input.origin.postalCode || !input.destination.postalCode) {
      return {
        ok: false,
        code: "missing_field",
        message: "Faltan los códigos postales de origen y destino.",
      };
    }

    const auth = await authBearer(ctx);
    if (!auth.ok) return auth;

    const body = {
      customerId: ctx.clientNumber,
      postalCodeOrigin: input.origin.postalCode,
      postalCodeDestination: input.destination.postalCode,
      // Omit deliveredType to receive both door and branch quotes (per docs).
      ...(input.deliveryType === "branch"
        ? { deliveredType: "S" }
        : input.deliveryType === "home"
          ? { deliveredType: "D" }
          : {}),
      dimensions: {
        weight: Math.max(1, Math.min(25000, Math.round(input.package.weightG))),
        height: Math.max(1, Math.min(150, Math.round(input.package.heightCm))),
        width: Math.max(1, Math.min(150, Math.round(input.package.widthCm))),
        length: Math.max(1, Math.min(150, Math.round(input.package.lengthCm))),
      },
    };

    let response: Response;
    try {
      response = await authedFetch(ctx, auth.token, "/rates", {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch {
      return {
        ok: false,
        code: "network_error",
        message: "No se pudo contactar a Correo Argentino para cotizar.",
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        code: "invalid_credentials",
        message:
          "Correo Argentino rechazó la cotización por credenciales. Volvé a conectar la cuenta.",
      };
    }
    if (response.status === 402) {
      const text = await response.text();
      return {
        ok: false,
        code: "unexpected_response",
        message:
          extractMessage(text) ??
          "Correo Argentino devolvió un error en la cotización (HTTP 402).",
      };
    }
    if (response.status === 429) {
      return {
        ok: false,
        code: "rate_limited",
        message: "Correo Argentino está limitando las solicitudes. Esperá unos minutos.",
      };
    }
    if (response.status >= 500) {
      return {
        ok: false,
        code: "carrier_unavailable",
        message: "La API de Correo Argentino está respondiendo con error.",
      };
    }
    if (!response.ok) {
      return {
        ok: false,
        code: "unexpected_response",
        message: `Respuesta inesperada cotizando (HTTP ${response.status}).`,
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
        message: "Correo Argentino respondió con un cuerpo no JSON.",
      };
    }

    if (!Array.isArray(payload.rates)) {
      return {
        ok: false,
        code: "unexpected_response",
        message: "La respuesta de cotización no contiene tarifas.",
      };
    }

    const rates = (payload.rates as Array<Record<string, unknown>>).map((r) => ({
      carrierId: "correo_argentino" as const,
      serviceCode: typeof r.productType === "string" ? r.productType : "CP",
      serviceName:
        (typeof r.productName === "string" && r.productName) ||
        "Correo Argentino",
      amount: typeof r.price === "number" ? r.price : Number(r.price ?? 0),
      currency: "ARS",
      estimatedDaysMin: parseDays(r.deliveryTimeMin),
      estimatedDaysMax: parseDays(r.deliveryTimeMax),
      deliveryType: r.deliveredType === "S" ? ("branch" as const) : ("home" as const),
      validUntil: typeof payload.validTo === "string" ? payload.validTo : null,
    }));

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
        message: "Falta el número de cliente de Correo Argentino.",
      };
    }

    const auth = await authBearer(ctx);
    if (!auth.ok) return auth;

    const body = {
      customerId: ctx.clientNumber,
      extOrderId: input.externalOrderId,
      orderNumber: input.orderNumber ?? input.externalOrderId,
      sender: {
        name: input.origin.name || null,
        phone: input.origin.phone ?? null,
        cellPhone: input.origin.phone ?? null,
        email: input.origin.email || null,
        originAddress: {
          streetName: input.origin.street ?? null,
          streetNumber: input.origin.streetNumber ?? null,
          floor: input.origin.floor ?? null,
          apartment: input.origin.apartment ?? null,
          city: input.origin.city ?? null,
          provinceCode: input.origin.provinceCode ?? null,
          postalCode: input.origin.postalCode ?? null,
        },
      },
      recipient: {
        name: input.destination.name,
        phone: input.destination.phone ?? "",
        cellPhone: input.destination.phone ?? "",
        email: input.destination.email,
      },
      shipping: {
        deliveryType: input.deliveryType === "branch" ? "S" : "D",
        agency: input.branchCode ?? null,
        address: {
          streetName: input.destination.street ?? "",
          streetNumber: input.destination.streetNumber ?? "",
          floor: input.destination.floor ?? "",
          apartment: input.destination.apartment ?? "",
          city: input.destination.city ?? "",
          provinceCode: input.destination.provinceCode ?? "",
          postalCode: input.destination.postalCode,
        },
        productType: input.serviceCode ?? "CP",
        weight: Math.max(1, Math.round(input.package.weightG)),
        declaredValue: input.package.declaredValue ?? 0,
        height: Math.max(1, Math.round(input.package.heightCm)),
        length: Math.max(1, Math.round(input.package.lengthCm)),
        width: Math.max(1, Math.round(input.package.widthCm)),
      },
    };

    let response: Response;
    try {
      response = await authedFetch(ctx, auth.token, "/shipping/import", {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch {
      return {
        ok: false,
        code: "network_error",
        message: "No se pudo contactar a Correo Argentino para crear el envío.",
      };
    }

    const raw = await response.text();
    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        code: "invalid_credentials",
        message:
          "Correo Argentino rechazó el envío por credenciales. Volvé a conectar la cuenta.",
      };
    }
    if (response.status === 402) {
      return {
        ok: false,
        code: "unexpected_response",
        message:
          extractMessage(raw) ??
          "Correo Argentino rechazó el envío (HTTP 402).",
      };
    }
    if (!response.ok) {
      return {
        ok: false,
        code: "unexpected_response",
        message: `Respuesta inesperada creando el envío (HTTP ${response.status}).`,
      };
    }

    let payload: unknown = null;
    try {
      payload = JSON.parse(raw);
    } catch {
      // The endpoint sometimes returns just `{createdAt}`. Tolerate a
      // non-JSON body but flag the lack of a tracking identifier.
      payload = null;
    }

    return {
      ok: true,
      // /shipping/import does not echo back a tracking code: it returns
      // `{ createdAt }`. We persist the merchant's external order id as
      // the canonical handle and let `getTracking` query MiCorreo with it.
      externalShipmentId: input.externalOrderId,
      trackingNumber: input.externalOrderId,
      trackingUrl: null,
      labelUrl: null,
      status: "imported",
      raw: payload ?? raw,
    };
  },

  // ── getTracking ───────────────────────────────────────────────────────
  async getTracking(
    ctx: CarrierAuthContext,
    trackingNumber: string,
  ): Promise<TrackingResult> {
    const guard = ensureCredentials(ctx);
    if (!guard.ok) return guard;
    if (!trackingNumber) {
      return {
        ok: false,
        code: "missing_field",
        message: "Falta el identificador del envío para consultar tracking.",
      };
    }

    const auth = await authBearer(ctx);
    if (!auth.ok) return auth;

    let response: Response;
    try {
      // Per MiCorreo docs: GET with a body listing shippingId. Most
      // implementations just send the id as a query param: we send both
      // to maximise compatibility with the real endpoint.
      const url = `/shipping/tracking?shippingId=${encodeURIComponent(trackingNumber)}`;
      response = await authedFetch(ctx, auth.token, url, { method: "GET" });
    } catch {
      return {
        ok: false,
        code: "network_error",
        message: "No se pudo contactar a Correo Argentino para consultar tracking.",
      };
    }

    const raw = await response.text();
    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        code: "invalid_credentials",
        message: "Correo Argentino rechazó el tracking por credenciales.",
      };
    }
    if (response.status === 404) {
      return {
        ok: false,
        code: "not_supported",
        message: "Correo Argentino no encontró un envío con ese identificador.",
      };
    }
    if (!response.ok) {
      return {
        ok: false,
        code: "unexpected_response",
        message: `Respuesta inesperada en tracking (HTTP ${response.status}).`,
      };
    }

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return {
        ok: false,
        code: "unexpected_response",
        message: "Correo Argentino respondió con un cuerpo no JSON.",
      };
    }

    // The endpoint returns either an array of shipments or a single object.
    const firstUnknown = Array.isArray(payload) ? payload[0] : payload;
    if (!firstUnknown || typeof firstUnknown !== "object") {
      return {
        ok: false,
        code: "unexpected_response",
        message: "La respuesta de tracking estaba vacía.",
      };
    }
    const first = firstUnknown as Record<string, unknown>;
    if (typeof first.error === "string" && first.error.length > 0) {
      return {
        ok: false,
        code: "not_supported",
        message: first.error,
      };
    }

    const events = Array.isArray(first.events)
      ? (first.events as Array<Record<string, unknown>>).map((e) => ({
          occurredAt: parseCorreoDate(e.date),
          status: typeof e.event === "string" ? e.event : "unknown",
          description: typeof e.event === "string" ? e.event : null,
          location: typeof e.branch === "string" ? e.branch : null,
        }))
      : [];

    const lastUpdate = events[0]?.occurredAt ?? null;

    return {
      ok: true,
      trackingNumber:
        typeof first.trackingNumber === "string"
          ? first.trackingNumber
          : trackingNumber,
      status: events[0]?.status ?? "unknown",
      events,
      lastUpdate,
      raw: payload,
    };
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
    const parsed = JSON.parse(raw) as { message?: unknown };
    if (typeof parsed.message === "string") return parsed.message;
  } catch {
    // not JSON — ignore
  }
  return null;
}

/**
 * MiCorreo timestamps look like "28-08-2024 10:33". Convert to ISO when
 * possible so the UI can format consistently; fall back to the raw string.
 */
function parseCorreoDate(raw: unknown): string {
  if (typeof raw !== "string") return new Date().toISOString();
  const m = raw.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!m) return raw;
  const [, dd, mm, yyyy, hh, min] = m;
  // Treat as Argentina local (UTC-3) — MiCorreo timestamps are in ART.
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:00-03:00`;
}
