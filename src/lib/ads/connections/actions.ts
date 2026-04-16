"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

export async function getAdsConnections(storeId: string) {
  return prisma.adPlatformConnection.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" }
  });
}

export async function addAdsConnection(storeId: string, platform: string, externalAccountId: string, accountName: string) {
  // Direct connection (MVP — real OAuth will replace this)
  const existing = await prisma.adPlatformConnection.findFirst({
    where: { storeId, platform }
  });

  if (existing) {
     throw new Error(`Ya tienes una cuenta de ${platform} conectada.`);
  }

  const connection = await prisma.adPlatformConnection.create({
    data: {
      storeId,
      platform,
      externalAccountId,
      accountName,
      status: "connected",
      accessToken: "mock_token_" + Date.now(),
      lastValidatedAt: new Date()
    }
  });

  // Log in Observability
  const { logSystemEvent } = await import("@/lib/observability/audit");
  await logSystemEvent({
     storeId,
     entityType: "ads_connection",
     entityId: connection.id,
     eventType: "ads_connection_started",
     source: "admin_ads",
     message: `Cuenta de ${platform} conectada exitosamente: ${accountName}`
  });

  revalidatePath("/admin/ads");
  return connection;
}

export async function removeAdsConnection(connectionId: string, storeId: string) {
  const connection = await prisma.adPlatformConnection.findUnique({
    where: { id: connectionId }
  });

  if (!connection || connection.storeId !== storeId) {
    throw new Error("Conexión no encontrada.");
  }

  await prisma.adPlatformConnection.delete({
    where: { id: connectionId }
  });

  revalidatePath("/admin/ads");
  return { success: true };
}
