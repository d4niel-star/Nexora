-- CreateTable
CREATE TABLE "NexoraAssistantMemory" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assistantId" TEXT NOT NULL,
    "summaryLine" TEXT NOT NULL DEFAULT '',
    "payloadJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NexoraAssistantMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NexoraAssistantMemory_storeId_userId_assistantId_key" ON "NexoraAssistantMemory"("storeId", "userId", "assistantId");

-- CreateIndex
CREATE INDEX "NexoraAssistantMemory_storeId_userId_updatedAt_idx" ON "NexoraAssistantMemory"("storeId", "userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "NexoraAssistantMemory" ADD CONSTRAINT "NexoraAssistantMemory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NexoraAssistantMemory" ADD CONSTRAINT "NexoraAssistantMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
