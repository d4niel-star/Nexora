-- CreateTable
CREATE TABLE "StorePaymentProvider" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mercadopago',
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "accessTokenEncrypted" TEXT,
    "publicKey" TEXT,
    "externalAccountId" TEXT,
    "accountEmail" TEXT,
    "connectedAt" TIMESTAMP(3),
    "lastValidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorePaymentProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StorePaymentProvider_storeId_provider_key" ON "StorePaymentProvider"("storeId", "provider");

-- CreateIndex
CREATE INDEX "StorePaymentProvider_storeId_idx" ON "StorePaymentProvider"("storeId");

-- CreateIndex
CREATE INDEX "StorePaymentProvider_provider_idx" ON "StorePaymentProvider"("provider");

-- AddForeignKey
ALTER TABLE "StorePaymentProvider" ADD CONSTRAINT "StorePaymentProvider_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
