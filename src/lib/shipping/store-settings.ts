// ─── Per-store shipping settings ──────────────────────────────────────────
// CRUD layer for StoreShippingSettings: the merchant's warehouse origin,
// preferred carrier, handling time and default package envelope. Every
// quote/label/track operation reads from here so it never has to ask the
// merchant for the same data twice.

import { prisma } from "@/lib/db/prisma";
import type { CarrierId } from "./types";

export interface StoreShippingSettingsView {
  defaultCarrier: CarrierId | null;
  originPostalCode: string | null;
  originStreet: string | null;
  originStreetNumber: string | null;
  originFloor: string | null;
  originApartment: string | null;
  originCity: string | null;
  originProvinceCode: string | null;
  originCountry: string;
  originContactName: string | null;
  originContactPhone: string | null;
  originContactEmail: string | null;
  handlingDaysMin: number;
  handlingDaysMax: number;
  defaultPackageWeightG: number;
  defaultPackageHeightCm: number;
  defaultPackageWidthCm: number;
  defaultPackageLengthCm: number;
  defaultDeclaredValue: number | null;
  freeShippingOver: number | null;
}

const DEFAULTS: StoreShippingSettingsView = {
  defaultCarrier: null,
  originPostalCode: null,
  originStreet: null,
  originStreetNumber: null,
  originFloor: null,
  originApartment: null,
  originCity: null,
  originProvinceCode: null,
  originCountry: "AR",
  originContactName: null,
  originContactPhone: null,
  originContactEmail: null,
  handlingDaysMin: 1,
  handlingDaysMax: 2,
  defaultPackageWeightG: 1000,
  defaultPackageHeightCm: 15,
  defaultPackageWidthCm: 20,
  defaultPackageLengthCm: 25,
  defaultDeclaredValue: null,
  freeShippingOver: null,
};

const VALID_CARRIERS = new Set<CarrierId>(["correo_argentino", "andreani"]);

export async function getStoreShippingSettings(
  storeId: string,
): Promise<StoreShippingSettingsView> {
  const row = await prisma.storeShippingSettings.findUnique({
    where: { storeId },
  });
  if (!row) return DEFAULTS;

  const carrier = row.defaultCarrier as CarrierId | null;
  return {
    defaultCarrier: carrier && VALID_CARRIERS.has(carrier) ? carrier : null,
    originPostalCode: row.originPostalCode,
    originStreet: row.originStreet,
    originStreetNumber: row.originStreetNumber,
    originFloor: row.originFloor,
    originApartment: row.originApartment,
    originCity: row.originCity,
    originProvinceCode: row.originProvinceCode,
    originCountry: row.originCountry ?? "AR",
    originContactName: row.originContactName,
    originContactPhone: row.originContactPhone,
    originContactEmail: row.originContactEmail,
    handlingDaysMin: row.handlingDaysMin ?? 1,
    handlingDaysMax: row.handlingDaysMax ?? 2,
    defaultPackageWeightG: row.defaultPackageWeightG ?? 1000,
    defaultPackageHeightCm: row.defaultPackageHeightCm ?? 15,
    defaultPackageWidthCm: row.defaultPackageWidthCm ?? 20,
    defaultPackageLengthCm: row.defaultPackageLengthCm ?? 25,
    defaultDeclaredValue: row.defaultDeclaredValue,
    freeShippingOver: row.freeShippingOver,
  };
}

export type StoreShippingSettingsInput = Partial<StoreShippingSettingsView>;

export async function upsertStoreShippingSettings(
  storeId: string,
  input: StoreShippingSettingsInput,
): Promise<void> {
  const data = {
    defaultCarrier:
      input.defaultCarrier && VALID_CARRIERS.has(input.defaultCarrier)
        ? input.defaultCarrier
        : null,
    originPostalCode: input.originPostalCode ?? null,
    originStreet: input.originStreet ?? null,
    originStreetNumber: input.originStreetNumber ?? null,
    originFloor: input.originFloor ?? null,
    originApartment: input.originApartment ?? null,
    originCity: input.originCity ?? null,
    originProvinceCode: input.originProvinceCode ?? null,
    originCountry: input.originCountry ?? "AR",
    originContactName: input.originContactName ?? null,
    originContactPhone: input.originContactPhone ?? null,
    originContactEmail: input.originContactEmail ?? null,
    handlingDaysMin: input.handlingDaysMin ?? 1,
    handlingDaysMax: input.handlingDaysMax ?? 2,
    defaultPackageWeightG: input.defaultPackageWeightG ?? 1000,
    defaultPackageHeightCm: input.defaultPackageHeightCm ?? 15,
    defaultPackageWidthCm: input.defaultPackageWidthCm ?? 20,
    defaultPackageLengthCm: input.defaultPackageLengthCm ?? 25,
    defaultDeclaredValue: input.defaultDeclaredValue ?? null,
    freeShippingOver: input.freeShippingOver ?? null,
  };

  await prisma.storeShippingSettings.upsert({
    where: { storeId },
    create: { storeId, ...data },
    update: data,
  });
}
