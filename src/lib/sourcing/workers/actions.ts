"use server";

import { prisma } from "@/lib/db/prisma";
import { getDefaultStore } from "@/lib/store-engine/queries";
import { runInventorySyncJob } from "./inventorySync";
import { revalidatePath } from "next/cache";

export async function enqueueProviderSyncJob(providerConnectionId: string) {
  const store = await getDefaultStore();
  if (!store) throw new Error("No active store");

  // Prevent duplicate runs if one is already pending or running
  const activeJob = await prisma.providerSyncJob.findFirst({
    where: {
       storeId: store.id,
       providerConnectionId,
       status: { in: ["pending", "running"] }
    }
  });

  if (activeJob) {
     throw new Error("Ya existe un proceso de sincronización en curso para este proveedor.");
  }

  const job = await prisma.providerSyncJob.create({
    data: {
      storeId: store.id,
      providerConnectionId,
      type: "provider_inventory_sync",
      status: "pending"
    }
  });

  await prisma.systemEvent.create({
      data: {
        storeId: store.id,
        entityType: "provider_sync_job",
        entityId: job.id,
        eventType: "provider_sync_started",
        source: "sourcing_worker",
        message: `Sincronización encolada para conexión de proveedor.`,
        severity: "info",
      }
  });

  // FIRE AND FORGET - run the real source refresh outside the action boundary.
  // In a robust architecture this could be sent to SQS, Redis BullMQ, or Inngest.
  // We trigger it asynchronously without awaiting in the Next.js boundary.
  runInventorySyncJob({
     jobId: job.id,
     storeId: store.id,
     providerConnectionId
  }).catch(e => console.error("Worker failed globally", e));

  revalidatePath("/admin/sourcing");
  return job.id;
}

export async function getProviderSyncJobs() {
  const store = await getDefaultStore();
  if (!store) throw new Error("No active store");
  
  return prisma.providerSyncJob.findMany({
    where: { storeId: store.id },
    include: {
      providerConnection: {
        include: { provider: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 20
  });
}
