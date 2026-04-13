"use server";

import { prisma } from "@/lib/db/prisma";
import { getDefaultStore } from "@/lib/store-engine/queries";
import { revalidatePath } from "next/cache";
import { validateMLConnection } from "./mercadolibre";
import { validateShopifyConnection } from "./shopify";

export async function getChannelConnectionsAction() {
  const store = await getDefaultStore();
  if (!store) throw new Error("No active store");

  return prisma.channelConnection.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      channel: true,
      status: true,
      externalAccountId: true,
      accountName: true,
      lastValidatedAt: true,
      lastError: true,
      tokenExpiresAt: true,
      // explicitly DO NOT return token, refreshToken, scopes configJson
    }
  });
}

export async function validateChannelConnectionAction(connectionId: string, channel: string) {
  const store = await getDefaultStore();
  if (!store) throw new Error("No active store");

  let isValid = false;
  if (channel === "mercadolibre") {
     isValid = await validateMLConnection(connectionId, store.id);
  } else if (channel === "shopify") {
     isValid = await validateShopifyConnection(connectionId, store.id);
  }

  // Audit
  await prisma.systemEvent.create({
    data: {
      storeId: store.id,
      entityType: "channel_connection",
      entityId: connectionId,
      eventType: isValid ? "channel_connection_validated" : "channel_connection_invalid",
      source: "oauth",
      message: `Conexión ${channel} validada: ${isValid ? 'OK' : 'Inválida'}`,
      severity: isValid ? "info" : "warning"
    }
  });

  revalidatePath("/admin/channels");
  return isValid;
}

export async function disconnectChannelAction(connectionId: string, channel: string) {
  const store = await getDefaultStore();
  if (!store) throw new Error("No active store");

  await prisma.channelConnection.update({
    where: { id: connectionId, storeId: store.id },
    data: { 
      status: "disconnected", 
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      scopes: null
    }
  });

  // Audit
  await prisma.systemEvent.create({
    data: {
      storeId: store.id,
      entityType: "channel_connection",
      entityId: connectionId,
      eventType: "channel_disconnected",
      source: "oauth",
      message: `Conexión de ${channel} desconectada manualemente.`,
      severity: "warning"
    }
  });

  revalidatePath("/admin/channels");
}
