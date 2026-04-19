-- Nexora Apps V2.4: Manual bundles / cross-sell offers.
-- No pricing logic: offers are a curated list of complementary products
-- surfaced in the PDP for a given trigger product. Cart / checkout /
-- pricing stay untouched. Storefront filters items by published + in-stock
-- at render time so nothing ghost-stock is offered.

-- CreateTable
CREATE TABLE "BundleOffer" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "triggerProductId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BundleOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleOfferItem" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BundleOfferItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BundleOffer_storeId_status_idx" ON "BundleOffer"("storeId", "status");

-- CreateIndex
CREATE INDEX "BundleOffer_triggerProductId_status_idx" ON "BundleOffer"("triggerProductId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BundleOfferItem_bundleId_productId_key" ON "BundleOfferItem"("bundleId", "productId");

-- CreateIndex
CREATE INDEX "BundleOfferItem_bundleId_idx" ON "BundleOfferItem"("bundleId");

-- CreateIndex
CREATE INDEX "BundleOfferItem_productId_idx" ON "BundleOfferItem"("productId");

-- AddForeignKey
ALTER TABLE "BundleOffer" ADD CONSTRAINT "BundleOffer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleOffer" ADD CONSTRAINT "BundleOffer_triggerProductId_fkey" FOREIGN KEY ("triggerProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleOfferItem" ADD CONSTRAINT "BundleOfferItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "BundleOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleOfferItem" ADD CONSTRAINT "BundleOfferItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
