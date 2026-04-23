-- CreateTable
CREATE TABLE "StoreCarrierConnection" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "environment" TEXT NOT NULL DEFAULT 'production',
    "accountUsername" TEXT,
    "accountClientNumber" TEXT,
    "accountDisplayName" TEXT,
    "externalAccountId" TEXT,
    "passwordEncrypted" TEXT,
    "configJson" TEXT,
    "lastError" TEXT,
    "connectedAt" TIMESTAMP(3),
    "lastValidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreCarrierConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreCarrierConnection_storeId_carrier_key" ON "StoreCarrierConnection"("storeId", "carrier");

-- CreateIndex
CREATE INDEX "StoreCarrierConnection_storeId_idx" ON "StoreCarrierConnection"("storeId");

-- CreateIndex
CREATE INDEX "StoreCarrierConnection_carrier_idx" ON "StoreCarrierConnection"("carrier");

-- AddForeignKey
ALTER TABLE "StoreCarrierConnection" ADD CONSTRAINT "StoreCarrierConnection_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
