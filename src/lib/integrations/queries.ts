"use server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";

export interface UnifiedConnection {
  id: string;
  type: "provider" | "ad_platform" | "payment";
  name: string;
  platform: string;
  status: "connected" | "disconnected" | "error" | "pending" | "expired";
  health: "operational" | "degraded" | "critical";
  lastSync: Date | null;
  description: string;
}

export async function getUnifiedConnections(): Promise<UnifiedConnection[]> {
  const store = await getCurrentStore();
  if (!store) return [];

  const connections: UnifiedConnection[] = [];

  // Ad Platform Connections
  const ads = await prisma.adPlatformConnection.findMany({
    where: { storeId: store.id },
  });

  for (const ad of ads) {
    connections.push({
      id: ad.id,
      type: "ad_platform",
      platform: ad.platform,
      name: ad.platform === "meta" ? "Meta Ads" : ad.platform === "google" ? "Google Ads" : String(ad.platform),
      status: (ad.status as "connected" | "disconnected" | "error" | "pending") || "disconnected",
      health: ad.status === "error" ? "critical" : ad.status === "pending" ? "degraded" : "operational",
      lastSync: ad.lastValidatedAt,
      description: "Plataforma publicitaria",
    });
  }

  // Provider Connections (Printful, suppliers)
  // Check if ProviderConnection exists or if it's SupplierConnection
  try {
    const providers = await prisma.providerConnection.findMany({
      where: { storeId: store.id },
      include: { provider: true }
    });

    for (const prov of providers) {
      connections.push({
        id: prov.id,
        type: "provider",
        platform: prov.provider?.code || "unknown",
        name: prov.provider?.name || "Proveedor On-Demand",
        status: (prov.status as "connected" | "disconnected" | "error") || "disconnected",
        health: prov.status === "error" ? "critical" : "operational",
        lastSync: prov.updatedAt,
        description: "Proveedor logístico / catálogo",
      });
    }
  } catch (e) {
    // If provider connection doesn't exist, ignore
  }

  return connections;
}
