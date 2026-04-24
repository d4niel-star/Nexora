-- AlterTable
ALTER TABLE "NexoraAssistantMemory" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

-- Backfill: 45 days from last update
UPDATE "NexoraAssistantMemory"
SET "expiresAt" = "updatedAt" + interval '45 days'
WHERE "expiresAt" IS NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NexoraAssistantMemory_expiresAt_idx" ON "NexoraAssistantMemory"("expiresAt");
