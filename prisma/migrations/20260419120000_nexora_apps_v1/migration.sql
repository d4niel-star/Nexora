-- Nexora Apps V1: tenant-scoped installed apps registry.
-- The catalog (definitions) lives in code at src/lib/apps/registry.ts.
-- This table only tracks which apps each store has installed and their
-- lifecycle state. No scopes / no external code execution in V1.

-- CreateTable
CREATE TABLE "InstalledApp" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "appSlug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "settingsJson" TEXT,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "installedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstalledApp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InstalledApp_storeId_appSlug_key" ON "InstalledApp"("storeId", "appSlug");

-- CreateIndex
CREATE INDEX "InstalledApp_storeId_idx" ON "InstalledApp"("storeId");

-- CreateIndex
CREATE INDEX "InstalledApp_storeId_status_idx" ON "InstalledApp"("storeId", "status");

-- AddForeignKey
ALTER TABLE "InstalledApp" ADD CONSTRAINT "InstalledApp_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
