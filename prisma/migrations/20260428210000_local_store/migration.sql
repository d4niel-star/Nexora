-- ─── Tienda > Local físico ─────────────────────────────────────────────
-- New subcategory under "Tienda" that lets the merchant administer a
-- physical retail location alongside the online store. Online inventory
-- (`ProductVariant.stock`) is kept untouched: per-location stock,
-- in-store sales and cash sessions all live in their own tables.
--
-- Multi-tenant: every table carries `storeId` and indexes it.
-- Cascading deletes mirror the rest of the schema (FK ON DELETE
-- CASCADE from Store, soft-set on optional links).

-- ── StoreLocation ────────────────────────────────────────────────────
CREATE TABLE "StoreLocation" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addressLine" TEXT,
    "city" TEXT,
    "province" TEXT,
    "country" TEXT DEFAULT 'AR',
    "postalCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "googleMapsUrl" TEXT,
    "pickupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pickupInstructions" TEXT,
    "pickupPreparationMinutes" INTEGER,
    "pickupWindow" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreLocation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StoreLocation_storeId_key" ON "StoreLocation"("storeId");
CREATE INDEX "StoreLocation_storeId_idx" ON "StoreLocation"("storeId");
ALTER TABLE "StoreLocation" ADD CONSTRAINT "StoreLocation_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── StoreLocationHours ───────────────────────────────────────────────
CREATE TABLE "StoreLocationHours" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "openTime" TEXT,
    "closeTime" TEXT,

    CONSTRAINT "StoreLocationHours_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StoreLocationHours_locationId_weekday_key" ON "StoreLocationHours"("locationId", "weekday");
ALTER TABLE "StoreLocationHours" ADD CONSTRAINT "StoreLocationHours_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "StoreLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── LocalInventory ───────────────────────────────────────────────────
CREATE TABLE "LocalInventory" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalInventory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LocalInventory_locationId_variantId_key" ON "LocalInventory"("locationId", "variantId");
CREATE INDEX "LocalInventory_storeId_idx" ON "LocalInventory"("storeId");
CREATE INDEX "LocalInventory_variantId_idx" ON "LocalInventory"("variantId");
ALTER TABLE "LocalInventory" ADD CONSTRAINT "LocalInventory_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LocalInventory" ADD CONSTRAINT "LocalInventory_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "StoreLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LocalInventory" ADD CONSTRAINT "LocalInventory_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── CashRegisterSession ──────────────────────────────────────────────
-- Created BEFORE InStoreSale because InStoreSale.cashSessionId references it.
CREATE TABLE "CashRegisterSession" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openedById" TEXT,
    "closedById" TEXT,
    "openingCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedCash" DOUBLE PRECISION,
    "countedCash" DOUBLE PRECISION,
    "difference" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "CashRegisterSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CashRegisterSession_storeId_idx" ON "CashRegisterSession"("storeId");
CREATE INDEX "CashRegisterSession_locationId_idx" ON "CashRegisterSession"("locationId");
CREATE INDEX "CashRegisterSession_status_idx" ON "CashRegisterSession"("status");
ALTER TABLE "CashRegisterSession" ADD CONSTRAINT "CashRegisterSession_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashRegisterSession" ADD CONSTRAINT "CashRegisterSession_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "StoreLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── InStoreSale ──────────────────────────────────────────────────────
CREATE TABLE "InStoreSale" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "saleNumber" INTEGER NOT NULL,
    "cashSessionId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "InStoreSale_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InStoreSale_storeId_saleNumber_key" ON "InStoreSale"("storeId", "saleNumber");
CREATE INDEX "InStoreSale_storeId_idx" ON "InStoreSale"("storeId");
CREATE INDEX "InStoreSale_locationId_idx" ON "InStoreSale"("locationId");
CREATE INDEX "InStoreSale_cashSessionId_idx" ON "InStoreSale"("cashSessionId");
ALTER TABLE "InStoreSale" ADD CONSTRAINT "InStoreSale_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InStoreSale" ADD CONSTRAINT "InStoreSale_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "StoreLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InStoreSale" ADD CONSTRAINT "InStoreSale_cashSessionId_fkey"
    FOREIGN KEY ("cashSessionId") REFERENCES "CashRegisterSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── InStoreSaleItem ──────────────────────────────────────────────────
CREATE TABLE "InStoreSaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "variantTitle" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "InStoreSaleItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InStoreSaleItem_saleId_idx" ON "InStoreSaleItem"("saleId");
ALTER TABLE "InStoreSaleItem" ADD CONSTRAINT "InStoreSaleItem_saleId_fkey"
    FOREIGN KEY ("saleId") REFERENCES "InStoreSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InStoreSaleItem" ADD CONSTRAINT "InStoreSaleItem_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── CashMovement ─────────────────────────────────────────────────────
CREATE TABLE "CashMovement" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "cashSessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CashMovement_storeId_idx" ON "CashMovement"("storeId");
CREATE INDEX "CashMovement_cashSessionId_idx" ON "CashMovement"("cashSessionId");
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_cashSessionId_fkey"
    FOREIGN KEY ("cashSessionId") REFERENCES "CashRegisterSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
