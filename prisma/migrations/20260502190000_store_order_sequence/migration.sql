-- CreateTable
CREATE TABLE "StoreOrderSequence" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreOrderSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreOrderSequence_storeId_key" ON "StoreOrderSequence"("storeId");

-- AddForeignKey
ALTER TABLE "StoreOrderSequence" ADD CONSTRAINT "StoreOrderSequence_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
