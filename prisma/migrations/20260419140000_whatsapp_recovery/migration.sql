-- Nexora Apps V2.1: WhatsApp cart recovery per-tenant settings.
-- Credentials for Meta Cloud API (phone number id + access token). The
-- access token is stored encrypted via the existing token-crypto helper.
-- One row per store; app activation is still tracked by InstalledApp.

-- CreateTable
CREATE TABLE "WhatsappRecoverySettings" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "phoneNumberId" TEXT,
    "accessTokenEncrypted" TEXT,
    "templateName" TEXT,
    "templateLanguage" TEXT NOT NULL DEFAULT 'es_AR',
    "status" TEXT NOT NULL DEFAULT 'needs_setup',
    "lastValidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappRecoverySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappRecoverySettings_storeId_key" ON "WhatsappRecoverySettings"("storeId");

-- AddForeignKey
ALTER TABLE "WhatsappRecoverySettings" ADD CONSTRAINT "WhatsappRecoverySettings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
