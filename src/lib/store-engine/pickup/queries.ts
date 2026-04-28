// Public storefront query for pickup-in-store information.
//
// This module is the *only* place where the public checkout learns
// anything about the merchant's physical location. It deliberately
// avoids re-using the admin-side `getLocationProfile` from
// `@/lib/local-store/queries` because that helper requires an
// authenticated admin session and exposes operational fields a
// shopper should never see (cash session ids, etc.).
//
// Whitelist contract — what we are willing to publish:
//   • physical address pieces
//   • phone / email of the local
//   • Google Maps URL
//   • opening hours summary + open/closed snapshot
//   • pickup instructions, preparation time and pickup window
//
// What we never publish:
//   • LocalInventory rows
//   • CashRegisterSession state
//   • InStoreSale data
//   • Audit / events
//   • Internal threshold or stock figures

import { prisma } from "@/lib/db/prisma";

export interface PublicPickupInfo {
  enabled: boolean;
  shippingMethodId: string | null;
  localName: string;
  addressLine: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  googleMapsUrl: string | null;
  // Hours summary, e.g. "Lun a Vie 09:00-18:00 · Sáb 10:00-14:00".
  hoursSummary: string;
  // Live snapshot computed against the server clock.
  isOpenNow: boolean;
  openCloseLabel: string;
  pickupInstructions: string | null;
  pickupWindow: string | null;
  pickupPreparationMinutes: number | null;
  // Friendly version of preparation, e.g. "60 minutos", "1-2 días".
  preparationLabel: string | null;
}

const WEEKDAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

interface DayHourRow {
  weekday: number;
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
}

function compareTime(a: string, b: string): number {
  return a.localeCompare(b);
}

function computeOpenSnapshot(rows: DayHourRow[]): {
  isOpenNow: boolean;
  openCloseLabel: string;
} {
  const now = new Date();
  const weekday = now.getDay();
  const nowStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const today = rows.find((r) => r.weekday === weekday);
  if (today?.isOpen && today.openTime && today.closeTime) {
    if (compareTime(nowStr, today.openTime) >= 0 && compareTime(nowStr, today.closeTime) < 0) {
      return { isOpenNow: true, openCloseLabel: `Abierto · cierra ${today.closeTime}` };
    }
    if (compareTime(nowStr, today.openTime) < 0) {
      return { isOpenNow: false, openCloseLabel: `Cerrado · abre hoy ${today.openTime}` };
    }
  }
  for (let i = 1; i <= 7; i++) {
    const next = (weekday + i) % 7;
    const nextRow = rows.find((r) => r.weekday === next);
    if (nextRow?.isOpen && nextRow.openTime) {
      const dayLabel = i === 1 ? "mañana" : WEEKDAY_SHORT[next].toLowerCase();
      return {
        isOpenNow: false,
        openCloseLabel: `Cerrado · abre ${dayLabel} ${nextRow.openTime}`,
      };
    }
  }
  return { isOpenNow: false, openCloseLabel: "Cerrado" };
}

function summarizeHours(rows: DayHourRow[]): string {
  // Group consecutive days with the same open/close into ranges.
  // Order: Mon..Sun (1,2,3,4,5,6,0).
  const order = [1, 2, 3, 4, 5, 6, 0];
  const ordered = order.map((w) => rows.find((r) => r.weekday === w)!);

  const segments: string[] = [];
  let i = 0;
  while (i < ordered.length) {
    const current = ordered[i];
    if (!current.isOpen || !current.openTime || !current.closeTime) {
      i++;
      continue;
    }
    let j = i;
    while (
      j + 1 < ordered.length &&
      ordered[j + 1].isOpen &&
      ordered[j + 1].openTime === current.openTime &&
      ordered[j + 1].closeTime === current.closeTime
    ) {
      j++;
    }
    const startLabel = WEEKDAY_SHORT[ordered[i].weekday];
    const endLabel = WEEKDAY_SHORT[ordered[j].weekday];
    const range = i === j ? startLabel : `${startLabel} a ${endLabel}`;
    segments.push(`${range} ${current.openTime}-${current.closeTime}`);
    i = j + 1;
  }
  return segments.length === 0 ? "Sin horarios configurados" : segments.join(" · ");
}

function preparationLabel(minutes: number | null): string | null {
  if (minutes === null || minutes <= 0) return null;
  if (minutes < 60) return `Listo en ~${minutes} minutos`;
  if (minutes < 60 * 24) {
    const hours = Math.round(minutes / 60);
    return `Listo en ~${hours} ${hours === 1 ? "hora" : "horas"}`;
  }
  const days = Math.round(minutes / (60 * 24));
  return `Listo en ~${days} ${days === 1 ? "día" : "días"}`;
}

// Returns the public pickup info for a store, or null if the merchant
// does not offer pickup right now (no location, location disabled, or
// the mirrored ShippingMethod row was deactivated).
export async function getPublicPickupInfo(storeId: string): Promise<PublicPickupInfo | null> {
  const location = await prisma.storeLocation.findUnique({
    where: { storeId },
    include: { hours: true },
  });
  if (!location || !location.pickupEnabled) return null;

  // The wired ShippingMethod row is what the checkout pipeline sees.
  // If it's missing or inactive we treat pickup as offline so the
  // shopper never sees something the merchant disabled by mistake.
  const shippingMethod = await prisma.shippingMethod.findUnique({
    where: { storeId_code: { storeId, code: "pickup_local" } },
    select: { id: true, isActive: true },
  });
  if (!shippingMethod || !shippingMethod.isActive) return null;

  const dayRows: DayHourRow[] = location.hours.map((h) => ({
    weekday: h.weekday,
    isOpen: h.isOpen,
    openTime: h.openTime,
    closeTime: h.closeTime,
  }));
  const { isOpenNow, openCloseLabel } = computeOpenSnapshot(dayRows);
  const hoursSummary = summarizeHours(dayRows);

  return {
    enabled: true,
    shippingMethodId: shippingMethod.id,
    localName: location.name,
    addressLine: location.addressLine,
    city: location.city,
    province: location.province,
    postalCode: location.postalCode,
    country: location.country,
    phone: location.phone,
    email: location.email,
    googleMapsUrl: location.googleMapsUrl,
    hoursSummary,
    isOpenNow,
    openCloseLabel,
    pickupInstructions: location.pickupInstructions,
    pickupWindow: location.pickupWindow,
    pickupPreparationMinutes: location.pickupPreparationMinutes,
    preparationLabel: preparationLabel(location.pickupPreparationMinutes),
  };
}
