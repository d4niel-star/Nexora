-- Comunicación: per-store contact info, social channels, WhatsApp button and
-- automated email toggles. The model lives in schema.prisma since the very
-- first iteration of the Comunicación admin surface, but the matching
-- migration was missing — meaning fresh deploys (Render included) were
-- creating a Prisma client that referenced a table that didn't exist.
--
-- This migration uses IF NOT EXISTS / DO blocks so it is fully idempotent
-- against databases that already have the table provisioned via
-- `prisma db push` and against fresh databases that need it created.

-- CreateTable
CREATE TABLE IF NOT EXISTS "StoreCommunicationSettings" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "contactAddress" TEXT,
    "contactCity" TEXT,
    "contactProvince" TEXT,
    "contactCountry" TEXT DEFAULT 'AR',
    "contactSchedule" TEXT,
    "showContactInStore" BOOLEAN NOT NULL DEFAULT true,
    "whatsappNumber" TEXT,
    "whatsappDisplayName" TEXT,
    "whatsappConnected" BOOLEAN NOT NULL DEFAULT false,
    "whatsappVerifiedAt" TIMESTAMP(3),
    "whatsappButtonEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsappButtonText" TEXT DEFAULT '¡Hola! Quiero consultar sobre sus productos',
    "whatsappButtonPosition" TEXT DEFAULT 'bottom-right',
    "instagramHandle" TEXT,
    "instagramUrl" TEXT,
    "instagramConnected" BOOLEAN NOT NULL DEFAULT false,
    "showInstagramInStore" BOOLEAN NOT NULL DEFAULT false,
    "facebookPageUrl" TEXT,
    "facebookPageName" TEXT,
    "facebookConnected" BOOLEAN NOT NULL DEFAULT false,
    "showFacebookInStore" BOOLEAN NOT NULL DEFAULT false,
    "emailOrderCreated" BOOLEAN NOT NULL DEFAULT true,
    "emailPaymentApproved" BOOLEAN NOT NULL DEFAULT true,
    "emailPaymentPending" BOOLEAN NOT NULL DEFAULT true,
    "emailPaymentFailed" BOOLEAN NOT NULL DEFAULT true,
    "emailOrderShipped" BOOLEAN NOT NULL DEFAULT true,
    "emailOrderCancelled" BOOLEAN NOT NULL DEFAULT true,
    "emailPaymentRefunded" BOOLEAN NOT NULL DEFAULT true,
    "emailOrderDelivered" BOOLEAN NOT NULL DEFAULT true,
    "emailAbandonedCart" BOOLEAN NOT NULL DEFAULT false,
    "emailStockCritical" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreCommunicationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "StoreCommunicationSettings_storeId_key"
    ON "StoreCommunicationSettings"("storeId");

-- AddForeignKey (idempotent — skipped if the FK already exists)
DO $$
BEGIN
    ALTER TABLE "StoreCommunicationSettings"
        ADD CONSTRAINT "StoreCommunicationSettings_storeId_fkey"
        FOREIGN KEY ("storeId") REFERENCES "Store"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
