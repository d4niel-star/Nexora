-- Nexora Apps V2.5: Post-purchase flows per-tenant settings.
-- V2.5 ships a single real flow: a review-request email sent N days after
-- an order reaches deliveredAt. Transactional emails (ORDER_CREATED,
-- PAYMENT_APPROVED, ORDER_SHIPPED, ORDER_DELIVERED) already auto-fire via
-- sendEmailEvent and are NOT touched by this app.

-- CreateTable
CREATE TABLE "PostPurchaseFlowsSettings" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "reviewRequestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reviewRequestDelayDays" INTEGER NOT NULL DEFAULT 7,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostPurchaseFlowsSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PostPurchaseFlowsSettings_storeId_key" ON "PostPurchaseFlowsSettings"("storeId");

-- AddForeignKey
ALTER TABLE "PostPurchaseFlowsSettings" ADD CONSTRAINT "PostPurchaseFlowsSettings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
