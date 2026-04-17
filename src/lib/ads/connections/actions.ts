"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

// ─── Ads Connection Status ───
// Meta, Google, and TikTok Ads integrations do NOT have OAuth flows implemented yet.
// This module provides manual connection registration only.
// Real OAuth for these platforms requires:
//   - META: FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, Marketing API access
//   - GOOGLE: GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, Developer token
//   - TIKTOK: TIKTOK_APP_ID, TIKTOK_APP_SECRET, Marketing API access
// Until those flows are built, connections are registered manually as "pending" (not "connected").

export async function getAdsConnections(storeId: string) {
  return prisma.adPlatformConnection.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" }
  });
}

export async function addAdsConnection(storeId: string, platform: string, externalAccountId: string, accountName: string) {
  const validPlatforms = ["meta", "google", "tiktok"];
  if (!validPlatforms.includes(platform)) {
    throw new Error(`Plataforma "${platform}" no es válida. Opciones: ${validPlatforms.join(", ")}`);
  }

  if (!externalAccountId || !accountName) {
    throw new Error("ID de cuenta y nombre son requeridos.");
  }

  const existing = await prisma.adPlatformConnection.findFirst({
    where: { storeId, platform }
  });

  if (existing) {
     throw new Error(`Ya existe una cuenta de ${platform} registrada. Desconectala primero para vincular otra.`);
  }

  // Register as "pending" — real OAuth is not yet implemented for ads platforms.
  // The connection is saved but NOT marked as "connected" since we can't verify
  // the account without real OAuth token exchange.
  const connection = await prisma.adPlatformConnection.create({
    data: {
      storeId,
      platform,
      externalAccountId,
      accountName,
      status: "pending",
      // No access token — OAuth not implemented for this platform yet
      lastValidatedAt: new Date(),
      lastError: "OAuth no implementado. Conexión registrada como pendiente.",
    }
  });

  const { logSystemEvent } = await import("@/lib/observability/audit");
  await logSystemEvent({
     storeId,
     entityType: "ads_connection",
     entityId: connection.id,
     eventType: "ads_connection_registered",
     source: "admin_ads",
     message: `Cuenta de ${platform} registrada (pendiente de OAuth): ${accountName}`
  });

  revalidatePath("/admin/ads");
  revalidatePath("/admin/integrations");
  return connection;
}

export async function removeAdsConnection(connectionId: string, storeId: string) {
  const connection = await prisma.adPlatformConnection.findUnique({
    where: { id: connectionId }
  });

  if (!connection || connection.storeId !== storeId) {
    throw new Error("Conexión no encontrada o no pertenece a esta tienda.");
  }

  await prisma.adPlatformConnection.delete({
    where: { id: connectionId }
  });

  revalidatePath("/admin/ads");
  revalidatePath("/admin/integrations");
  return { success: true };
}
