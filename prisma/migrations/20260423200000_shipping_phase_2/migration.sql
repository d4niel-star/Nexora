-- ─── Phase 2 of the Envíos module ─────────────────────────────────────────
-- Adds two tables on top of StoreCarrierConnection:
--   • StoreShippingSettings — one row per store with the warehouse origin,
--     defaults (preferred carrier, handling time, default package envelope)
--     and the optional free-shipping threshold.
--   • CarrierShipment       — one row per shipment created against a real
--     carrier API (Correo Argentino /shipping/import, Andreani
--     /v2/ordenes-de-envio). Persists the carrier-side identifier so we
--     can later fetch tracking events or re-download the label.

CREATE TABLE "StoreShippingSettings" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "defaultCarrier" TEXT,
    "originPostalCode" TEXT,
    "originStreet" TEXT,
    "originStreetNumber" TEXT,
    "originFloor" TEXT,
    "originApartment" TEXT,
    "originCity" TEXT,
    "originProvinceCode" TEXT,
    "originCountry" TEXT DEFAULT 'AR',
    "originContactName" TEXT,
    "originContactPhone" TEXT,
    "originContactEmail" TEXT,
    "handlingDaysMin" INTEGER DEFAULT 1,
    "handlingDaysMax" INTEGER DEFAULT 2,
    "defaultPackageWeightG" INTEGER DEFAULT 1000,
    "defaultPackageHeightCm" INTEGER DEFAULT 15,
    "defaultPackageWidthCm" INTEGER DEFAULT 20,
    "defaultPackageLengthCm" INTEGER DEFAULT 25,
    "defaultDeclaredValue" DOUBLE PRECISION,
    "freeShippingOver" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreShippingSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StoreShippingSettings_storeId_key" ON "StoreShippingSettings"("storeId");

ALTER TABLE "StoreShippingSettings"
    ADD CONSTRAINT "StoreShippingSettings_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CarrierShipment" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "externalShipmentId" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'created',
    "serviceType" TEXT,
    "destinationName" TEXT,
    "destinationEmail" TEXT,
    "destinationPostalCode" TEXT,
    "destinationCity" TEXT,
    "destinationProvince" TEXT,
    "weightG" INTEGER,
    "heightCm" INTEGER,
    "widthCm" INTEGER,
    "lengthCm" INTEGER,
    "declaredValue" DOUBLE PRECISION,
    "costAmount" DOUBLE PRECISION,
    "costCurrency" TEXT DEFAULT 'ARS',
    "rawCreateResponse" TEXT,
    "rawTrackingResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastTrackedAt" TIMESTAMP(3),

    CONSTRAINT "CarrierShipment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CarrierShipment_storeId_idx" ON "CarrierShipment"("storeId");
CREATE INDEX "CarrierShipment_carrier_idx" ON "CarrierShipment"("carrier");
CREATE INDEX "CarrierShipment_trackingNumber_idx" ON "CarrierShipment"("trackingNumber");

ALTER TABLE "CarrierShipment"
    ADD CONSTRAINT "CarrierShipment_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
