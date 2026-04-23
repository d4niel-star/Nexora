"use server";

// ─── Shipping operations server actions ───────────────────────────────────
// Server-side entry points the UI calls to:
//   • Cotizar contra uno o todos los carriers conectados
//   • Generar un envío real
//   • Consultar tracking
//   • Persistir reglas / settings por tienda
//
// Every action is store-scoped via getCurrentStore() and reads the
// merchant's persisted ShippingSettings (origin, default package) so
// quotes/labels share the same source of truth.

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";

import { getCarrierById } from "./registry";
import {
  getStoreShippingSettings,
  upsertStoreShippingSettings,
} from "./store-settings";
import { listCarrierSummaries, loadAuthContext } from "./store-connection";
import type {
  CarrierAuthContext,
  CarrierId,
  CreateShipmentInput,
  QuoteShipmentInput,
  ShipmentParty,
  TrackingResult,
} from "./types";
import type {
  CreateShipmentActionResult,
  CreateShipmentFormInput,
  QuoteActionResult,
  QuoteFormInput,
  QuoteRowResult,
  TrackingActionResult,
  TrackingFormInput,
  UpsertShippingSettingsInput,
} from "./operations-types";

// ─── Quote ─────────────────────────────────────────────────────────────────
export async function quoteShipmentAction(
  input: QuoteFormInput,
): Promise<QuoteActionResult> {
  const store = await getCurrentStore();
  if (!store) return { ok: false, message: "No hay una tienda activa.", rows: [] };

  if (
    !input.destinationPostalCode ||
    input.destinationPostalCode.trim().length === 0
  ) {
    return {
      ok: false,
      message: "Ingresá el código postal de destino.",
      rows: [],
    };
  }

  const settings = await getStoreShippingSettings(store.id);
  if (!settings.originPostalCode) {
    return {
      ok: false,
      message:
        "Cargá el código postal de origen en Ajustes de envío antes de cotizar.",
      rows: [],
    };
  }

  const summaries = await listCarrierSummaries(store.id);
  const targetCarriers: CarrierId[] =
    !input.carrier || input.carrier === "all"
      ? summaries.filter((s) => s.status === "connected").map((s) => s.carrier)
      : [input.carrier];

  if (targetCarriers.length === 0) {
    return {
      ok: false,
      message:
        "No hay carriers conectados todavía. Conectá Correo Argentino o Andreani para cotizar.",
      rows: [],
    };
  }

  const origin = buildOriginParty(settings);
  const destination: ShipmentParty = {
    name: "Destinatario",
    email: "destino@nexora.local",
    postalCode: input.destinationPostalCode.trim(),
    city: input.destinationCity ?? null,
    provinceCode: input.destinationProvinceCode ?? null,
    country: "AR",
  };
  const quoteInput: QuoteShipmentInput = {
    origin,
    destination,
    package: {
      weightG: clampInt(input.weightG, 1, 25000, settings.defaultPackageWeightG),
      heightCm: clampInt(input.heightCm, 1, 150, settings.defaultPackageHeightCm),
      widthCm: clampInt(input.widthCm, 1, 150, settings.defaultPackageWidthCm),
      lengthCm: clampInt(input.lengthCm, 1, 150, settings.defaultPackageLengthCm),
      declaredValue:
        typeof input.declaredValue === "number" && input.declaredValue >= 0
          ? input.declaredValue
          : settings.defaultDeclaredValue ?? 0,
    },
    deliveryType: input.deliveryType ?? "home",
  };

  const rows: QuoteRowResult[] = await Promise.all(
    targetCarriers.map(async (carrierId): Promise<QuoteRowResult> => {
      const meta = getCarrierById(carrierId);
      if (!meta || !meta.adapter.quoteShipment) {
        return {
          carrierId,
          carrierName: meta?.name ?? carrierId,
          ok: false,
          message: "Cotización no soportada por este carrier.",
        };
      }
      const ctx = await loadAuthContext(store.id, carrierId);
      if (!ctx) {
        return {
          carrierId,
          carrierName: meta.name,
          ok: false,
          message: "Conectá la cuenta antes de cotizar.",
        };
      }
      try {
        const res = await meta.adapter.quoteShipment(ctx, quoteInput);
        if (!res.ok) {
          return {
            carrierId,
            carrierName: meta.name,
            ok: false,
            message: res.message,
          };
        }
        return {
          carrierId,
          carrierName: meta.name,
          ok: true,
          rates: res.rates,
        };
      } catch (err) {
        return {
          carrierId,
          carrierName: meta.name,
          ok: false,
          message:
            err instanceof Error
              ? `Error inesperado cotizando: ${err.message}`
              : "Error inesperado cotizando.",
        };
      }
    }),
  );

  return { ok: true, rows };
}

// ─── Create shipment ──────────────────────────────────────────────────────
export async function createShipmentAction(
  input: CreateShipmentFormInput,
): Promise<CreateShipmentActionResult> {
  const store = await getCurrentStore();
  if (!store) return { ok: false, message: "No hay una tienda activa." };

  const meta = getCarrierById(input.carrier);
  if (!meta) return { ok: false, message: "Carrier no soportado." };
  if (!meta.adapter.createShipment) {
    return {
      ok: false,
      message: "La generación de envío no está soportada para este carrier.",
    };
  }
  if (
    !input.destination.name ||
    !input.destination.email ||
    !input.destination.postalCode
  ) {
    return {
      ok: false,
      message: "Faltan datos del destinatario (nombre, email o código postal).",
    };
  }
  if (!input.externalOrderId || input.externalOrderId.trim().length === 0) {
    return {
      ok: false,
      message: "Falta el identificador de la orden / referencia externa.",
    };
  }

  const settings = await getStoreShippingSettings(store.id);
  if (!settings.originPostalCode) {
    return {
      ok: false,
      message:
        "Cargá el origen del envío en Ajustes de envío antes de generar etiquetas.",
    };
  }
  const ctx = await loadAuthContext(store.id, input.carrier);
  if (!ctx) {
    return {
      ok: false,
      message: "Conectá la cuenta del carrier antes de crear el envío.",
    };
  }

  const origin = buildOriginParty(settings);
  const payload: CreateShipmentInput = {
    externalOrderId: input.externalOrderId.trim(),
    orderNumber: input.orderNumber ?? input.externalOrderId.trim(),
    origin,
    destination: {
      name: input.destination.name,
      email: input.destination.email,
      phone: input.destination.phone ?? null,
      document: input.destination.document ?? null,
      postalCode: input.destination.postalCode,
      street: input.destination.street ?? null,
      streetNumber: input.destination.streetNumber ?? null,
      floor: input.destination.floor ?? null,
      apartment: input.destination.apartment ?? null,
      city: input.destination.city ?? null,
      province: input.destination.province ?? null,
      provinceCode: input.destination.provinceCode ?? null,
      country: "AR",
    },
    package: {
      weightG: clampInt(input.weightG, 1, 25000, settings.defaultPackageWeightG),
      heightCm: clampInt(input.heightCm, 1, 150, settings.defaultPackageHeightCm),
      widthCm: clampInt(input.widthCm, 1, 150, settings.defaultPackageWidthCm),
      lengthCm: clampInt(input.lengthCm, 1, 150, settings.defaultPackageLengthCm),
      declaredValue:
        typeof input.declaredValue === "number" && input.declaredValue >= 0
          ? input.declaredValue
          : settings.defaultDeclaredValue ?? 0,
    },
    deliveryType: input.deliveryType ?? "home",
    branchCode: input.branchCode ?? null,
    serviceCode: input.serviceCode ?? null,
  };

  let res;
  try {
    res = await meta.adapter.createShipment(ctx, payload);
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? `Error inesperado creando el envío: ${err.message}`
          : "Error inesperado creando el envío.",
    };
  }

  if (!res.ok) {
    return { ok: false, message: res.message };
  }

  const created = await prisma.carrierShipment.create({
    data: {
      storeId: store.id,
      carrier: input.carrier,
      externalShipmentId: res.externalShipmentId,
      trackingNumber: res.trackingNumber,
      trackingUrl: res.trackingUrl,
      status: res.status,
      serviceType: input.serviceCode ?? input.deliveryType ?? null,
      destinationName: input.destination.name,
      destinationEmail: input.destination.email,
      destinationPostalCode: input.destination.postalCode,
      destinationCity: input.destination.city ?? null,
      destinationProvince: input.destination.province ?? null,
      weightG: payload.package.weightG,
      heightCm: payload.package.heightCm,
      widthCm: payload.package.widthCm,
      lengthCm: payload.package.lengthCm,
      declaredValue: payload.package.declaredValue ?? null,
      rawCreateResponse: safeStringify(res.raw),
    },
  });

  revalidatePath("/admin/shipping");

  return {
    ok: true,
    message: meta.adapter.capabilities.labelPdf
      ? `Envío creado en ${meta.name}. Podés descargar la etiqueta abajo.`
      : `Envío importado en ${meta.name}. Imprimí la etiqueta desde el portal de ${meta.name} (su API no expone PDF).`,
    shipment: {
      id: created.id,
      carrier: input.carrier,
      externalShipmentId: created.externalShipmentId,
      trackingNumber: created.trackingNumber,
      trackingUrl: created.trackingUrl,
      labelDownloadUrl:
        meta.adapter.capabilities.labelPdf && created.externalShipmentId
          ? `/api/shipping/label?carrier=${encodeURIComponent(
              input.carrier,
            )}&id=${encodeURIComponent(created.externalShipmentId)}`
          : null,
      status: created.status,
    },
  };
}

// ─── Tracking ──────────────────────────────────────────────────────────────
export async function getTrackingAction(
  input: TrackingFormInput,
): Promise<TrackingActionResult> {
  const store = await getCurrentStore();
  if (!store) return { ok: false, message: "No hay una tienda activa." };

  const meta = getCarrierById(input.carrier);
  if (!meta) return { ok: false, message: "Carrier no soportado." };
  if (!meta.adapter.getTracking) {
    return {
      ok: false,
      message: "Tracking no soportado por este carrier.",
    };
  }
  if (!input.trackingNumber || input.trackingNumber.trim().length === 0) {
    return {
      ok: false,
      message: "Ingresá un número de seguimiento.",
    };
  }

  // Public tracking (Andreani) doesn't need credentials, but the
  // adapter still expects a context shape. Build a minimal one when
  // there's no connection.
  const ctx: CarrierAuthContext =
    (await loadAuthContext(store.id, input.carrier)) ?? {
      username: "",
      password: "",
      clientNumber: null,
      environment: "production",
      config: {},
    };

  let res: TrackingResult;
  try {
    res = await meta.adapter.getTracking(ctx, input.trackingNumber.trim());
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? `Error inesperado consultando tracking: ${err.message}`
          : "Error inesperado consultando tracking.",
    };
  }

  if (!res.ok) {
    return { ok: false, message: res.message };
  }

  // Best-effort: persist last tracking response on a matching shipment
  // row so the merchant has history.
  await prisma.carrierShipment
    .updateMany({
      where: {
        storeId: store.id,
        carrier: input.carrier,
        OR: [
          { trackingNumber: input.trackingNumber.trim() },
          { externalShipmentId: input.trackingNumber.trim() },
        ],
      },
      data: {
        status: res.status,
        rawTrackingResponse: safeStringify(res.raw),
        lastTrackedAt: new Date(),
      },
    })
    .catch(() => {});

  return {
    ok: true,
    result: {
      trackingNumber: res.trackingNumber,
      status: res.status,
      lastUpdate: res.lastUpdate ?? null,
      events: res.events,
    },
  };
}

// ─── Settings ──────────────────────────────────────────────────────────────
export async function upsertShippingSettingsAction(
  input: UpsertShippingSettingsInput,
): Promise<{ ok: boolean; message: string }> {
  const store = await getCurrentStore();
  if (!store) return { ok: false, message: "No hay una tienda activa." };

  const trim = (v: unknown) =>
    typeof v === "string" ? (v.trim().length > 0 ? v.trim() : null) : null;
  const num = (v: unknown, fallback: number, min = 0, max = 1_000_000) => {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.round(n)));
  };
  const optNum = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  await upsertStoreShippingSettings(store.id, {
    defaultCarrier: input.defaultCarrier ?? null,
    originPostalCode: trim(input.originPostalCode),
    originStreet: trim(input.originStreet),
    originStreetNumber: trim(input.originStreetNumber),
    originFloor: trim(input.originFloor),
    originApartment: trim(input.originApartment),
    originCity: trim(input.originCity),
    originProvinceCode: trim(input.originProvinceCode),
    originContactName: trim(input.originContactName),
    originContactPhone: trim(input.originContactPhone),
    originContactEmail: trim(input.originContactEmail),
    handlingDaysMin: num(input.handlingDaysMin, 1, 0, 60),
    handlingDaysMax: num(input.handlingDaysMax, 2, 0, 60),
    defaultPackageWeightG: num(input.defaultPackageWeightG, 1000, 1, 25_000),
    defaultPackageHeightCm: num(input.defaultPackageHeightCm, 15, 1, 150),
    defaultPackageWidthCm: num(input.defaultPackageWidthCm, 20, 1, 150),
    defaultPackageLengthCm: num(input.defaultPackageLengthCm, 25, 1, 150),
    defaultDeclaredValue: optNum(input.defaultDeclaredValue),
    freeShippingOver: optNum(input.freeShippingOver),
  });

  revalidatePath("/admin/shipping");
  revalidatePath("/admin/shipping/settings");
  return { ok: true, message: "Ajustes de envío actualizados." };
}

// ─── Helpers (server-only, not exported) ──────────────────────────────────
function buildOriginParty(settings: {
  originPostalCode: string | null;
  originStreet: string | null;
  originStreetNumber: string | null;
  originFloor: string | null;
  originApartment: string | null;
  originCity: string | null;
  originProvinceCode: string | null;
  originContactName: string | null;
  originContactPhone: string | null;
  originContactEmail: string | null;
}): ShipmentParty {
  return {
    name: settings.originContactName ?? "Origen",
    email: settings.originContactEmail ?? "envios@nexora.local",
    phone: settings.originContactPhone ?? null,
    postalCode: settings.originPostalCode ?? "",
    street: settings.originStreet ?? null,
    streetNumber: settings.originStreetNumber ?? null,
    floor: settings.originFloor ?? null,
    apartment: settings.originApartment ?? null,
    city: settings.originCity ?? null,
    provinceCode: settings.originProvinceCode ?? null,
    country: "AR",
  };
}

function clampInt(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function safeStringify(v: unknown): string | null {
  try {
    const s = JSON.stringify(v);
    return s.length > 50_000 ? s.slice(0, 50_000) : s;
  } catch {
    return null;
  }
}
