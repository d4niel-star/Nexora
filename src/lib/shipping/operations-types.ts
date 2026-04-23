// ─── Public types for the shipping operations layer ──────────────────────
// Co-located with `operations.ts` (the "use server" actions file) so the
// UI can import these without crossing the server-only boundary.

import type {
  CarrierId,
  QuoteRate,
  ShipmentDeliveryType,
} from "./types";

export interface QuoteFormInput {
  carrier?: CarrierId | "all";
  destinationPostalCode: string;
  destinationProvinceCode?: string | null;
  destinationCity?: string | null;
  weightG?: number;
  heightCm?: number;
  widthCm?: number;
  lengthCm?: number;
  declaredValue?: number | null;
  deliveryType?: ShipmentDeliveryType;
}

export interface QuoteRowResult {
  carrierId: CarrierId;
  carrierName: string;
  ok: boolean;
  message?: string;
  rates?: QuoteRate[];
}

export interface QuoteActionResult {
  ok: boolean;
  message?: string;
  rows: QuoteRowResult[];
}

export interface CreateShipmentFormInput {
  carrier: CarrierId;
  externalOrderId: string;
  orderNumber?: string;
  destination: {
    name: string;
    email: string;
    phone?: string;
    document?: string;
    postalCode: string;
    street?: string;
    streetNumber?: string;
    floor?: string;
    apartment?: string;
    city?: string;
    province?: string;
    provinceCode?: string;
  };
  weightG?: number;
  heightCm?: number;
  widthCm?: number;
  lengthCm?: number;
  declaredValue?: number;
  deliveryType?: ShipmentDeliveryType;
  branchCode?: string;
  serviceCode?: string;
}

export interface CreateShipmentActionResult {
  ok: boolean;
  message: string;
  shipment?: {
    id: string;
    carrier: CarrierId;
    externalShipmentId: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    labelDownloadUrl: string | null;
    status: string;
  };
}

export interface TrackingFormInput {
  carrier: CarrierId;
  trackingNumber: string;
}

export interface TrackingActionResult {
  ok: boolean;
  message?: string;
  result?: {
    trackingNumber: string;
    status: string;
    lastUpdate: string | null;
    events: Array<{
      occurredAt: string;
      status: string;
      description?: string | null;
      location?: string | null;
    }>;
  };
}

export interface UpsertShippingSettingsInput {
  defaultCarrier?: CarrierId | null;
  originPostalCode?: string | null;
  originStreet?: string | null;
  originStreetNumber?: string | null;
  originFloor?: string | null;
  originApartment?: string | null;
  originCity?: string | null;
  originProvinceCode?: string | null;
  originContactName?: string | null;
  originContactPhone?: string | null;
  originContactEmail?: string | null;
  handlingDaysMin?: number;
  handlingDaysMax?: number;
  defaultPackageWeightG?: number;
  defaultPackageHeightCm?: number;
  defaultPackageWidthCm?: number;
  defaultPackageLengthCm?: number;
  defaultDeclaredValue?: number | null;
  freeShippingOver?: number | null;
}
