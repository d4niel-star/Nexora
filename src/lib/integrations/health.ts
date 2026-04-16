// ─── Health Center Multicanal v1 ───
// Query layer for multichannel health diagnostics.
// All signals are derived from real persisted state — no fabrication.

import { prisma } from "@/lib/db/prisma";
import { getCurrentStore } from "@/lib/auth/session";
import type {
  ConnectionHealthEntry,
  HealthCenterData,
  HealthSeverity,
  HealthSignal,
  HealthStatus,
  ListingSyncSummary,
} from "@/types/health";

const TOKEN_EXPIRY_WARNING_DAYS = 7;
const STALE_SYNC_DAYS = 7;

export async function getHealthCenterData(): Promise<HealthCenterData> {
  const store = await getCurrentStore();

  if (!store) {
    return {
      connections: [],
      signals: [],
      listings: { total: 0, published: 0, synced: 0, outOfSync: 0, syncError: 0, publishFailed: 0 },
      overallHealth: "unknown",
      generatedAt: new Date().toISOString(),
    };
  }

  const sid = store.id;
  const now = new Date();

  // ─── Fetch all connection types + listing/sync aggregates in parallel ───
  const [
    channelConns,
    adConns,
    providerConns,
    listingsTotal,
    listingsPublished,
    listingsSynced,
    listingsOutOfSync,
    listingsSyncError,
    listingsPublishFailed,
    syncJobsFailed,
    outOfSyncSample,
    mirrorsOutOfSync,
  ] = await Promise.all([
    prisma.channelConnection.findMany({
      where: { storeId: sid },
      select: {
        id: true, channel: true, status: true,
        tokenExpiresAt: true, lastSyncedAt: true, lastValidatedAt: true,
        lastError: true, updatedAt: true,
      },
    }),
    prisma.adPlatformConnection.findMany({
      where: { storeId: sid },
      select: {
        id: true, platform: true, status: true,
        tokenExpiresAt: true, lastValidatedAt: true,
        lastError: true, updatedAt: true,
      },
    }),
    prisma.providerConnection.findMany({
      where: { storeId: sid },
      include: { provider: { select: { name: true, code: true } } },
    }),
    prisma.channelListing.count({ where: { storeId: sid } }),
    prisma.channelListing.count({ where: { storeId: sid, status: "published" } }),
    prisma.channelListing.count({ where: { storeId: sid, syncStatus: "synced" } }),
    prisma.channelListing.count({ where: { storeId: sid, syncStatus: "out_of_sync" } }),
    prisma.channelListing.count({ where: { storeId: sid, syncStatus: "error" } }),
    prisma.channelListing.count({ where: { storeId: sid, status: "failed" } }),
    prisma.providerSyncJob.count({
      where: { storeId: sid, status: "failed" },
    }),
    prisma.channelListing.findFirst({
      where: { storeId: sid, syncStatus: "out_of_sync", outOfSyncReason: { not: null } },
      select: { outOfSyncReason: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.catalogMirrorProduct.count({
      where: { storeId: sid, syncStatus: "out_of_sync" },
    }),
  ]);

  const connections: ConnectionHealthEntry[] = [];
  const signals: HealthSignal[] = [];

  // ─── Channel Connections ───
  for (const ch of channelConns) {
    const name = resolveChannelName(ch.channel);
    const tokenStatus = resolveTokenStatus(ch.tokenExpiresAt, now);
    const health = resolveConnectionHealth(ch.status, tokenStatus);
    const lastActivity = ch.lastSyncedAt || ch.lastValidatedAt || ch.updatedAt;

    connections.push({
      id: ch.id,
      type: "channel",
      name,
      platform: ch.channel,
      rawStatus: ch.status,
      health,
      tokenStatus,
      lastActivity: lastActivity?.toISOString() ?? null,
      lastError: ch.lastError,
    });

    // Signals for this connection
    if (ch.status === "error" || ch.status === "invalid") {
      signals.push({
        id: `ch-error-${ch.id}`,
        severity: "critical",
        title: `${name}: conexión con error`,
        description: ch.lastError || `Estado: ${ch.status}. La integración no está operativa.`,
        href: "/admin/channels",
        actionLabel: "Reparar conexión",
      });
    }

    if (ch.status === "expired" || ch.status === "reconnect_required") {
      signals.push({
        id: `ch-expired-${ch.id}`,
        severity: "critical",
        title: `${name}: autenticación expirada`,
        description: "El token OAuth necesita renovación. No se pueden sincronizar datos.",
        href: "/admin/channels",
        actionLabel: "Renovar autenticación",
      });
    }

    if (tokenStatus === "expired" && ch.status !== "expired" && ch.status !== "reconnect_required") {
      signals.push({
        id: `ch-token-expired-${ch.id}`,
        severity: "critical",
        title: `${name}: token vencido`,
        description: `El token venció el ${ch.tokenExpiresAt!.toLocaleDateString("es-AR")}. Requiere renovación.`,
        href: "/admin/channels",
        actionLabel: "Renovar token",
      });
    }

    if (tokenStatus === "expiring_soon") {
      const daysLeft = Math.ceil((ch.tokenExpiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      signals.push({
        id: `ch-token-expiring-${ch.id}`,
        severity: "high",
        title: `${name}: token vence en ${daysLeft} día${daysLeft !== 1 ? "s" : ""}`,
        description: "Renovar antes de que expire para evitar desconexión.",
        href: "/admin/channels",
        actionLabel: "Renovar token",
      });
    }

    if (ch.status === "connected" && ch.lastSyncedAt) {
      const daysSinceSync = Math.floor((now.getTime() - ch.lastSyncedAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceSync > STALE_SYNC_DAYS) {
        signals.push({
          id: `ch-stale-${ch.id}`,
          severity: "normal",
          title: `${name}: sin sincronización reciente`,
          description: `Última sincronización hace ${daysSinceSync} días. Verificar que la conexión está activa.`,
          href: "/admin/channels",
          actionLabel: "Verificar canal",
        });
      }
    }
  }

  // ─── Ad Platform Connections ───
  for (const ad of adConns) {
    const name = resolveAdPlatformName(ad.platform);
    const tokenStatus = resolveTokenStatus(ad.tokenExpiresAt, now);
    const health = resolveConnectionHealth(ad.status, tokenStatus);
    const lastActivity = ad.lastValidatedAt || ad.updatedAt;

    connections.push({
      id: ad.id,
      type: "ad_platform",
      name,
      platform: ad.platform,
      rawStatus: ad.status,
      health,
      tokenStatus,
      lastActivity: lastActivity?.toISOString() ?? null,
      lastError: ad.lastError,
    });

    if (ad.status === "error") {
      signals.push({
        id: `ad-error-${ad.id}`,
        severity: "critical",
        title: `${name}: conexión con error`,
        description: ad.lastError || "La plataforma publicitaria no está operativa.",
        href: "/admin/integrations",
        actionLabel: "Revisar integración",
      });
    }

    if (tokenStatus === "expired") {
      signals.push({
        id: `ad-token-expired-${ad.id}`,
        severity: "critical",
        title: `${name}: token vencido`,
        description: `Token venció el ${ad.tokenExpiresAt!.toLocaleDateString("es-AR")}. No se pueden obtener métricas.`,
        href: "/admin/integrations",
        actionLabel: "Renovar autenticación",
      });
    }

    if (tokenStatus === "expiring_soon") {
      const daysLeft = Math.ceil((ad.tokenExpiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      signals.push({
        id: `ad-token-expiring-${ad.id}`,
        severity: "high",
        title: `${name}: token vence en ${daysLeft} día${daysLeft !== 1 ? "s" : ""}`,
        description: "Renovar antes de perder acceso a métricas de campaña.",
        href: "/admin/integrations",
        actionLabel: "Renovar token",
      });
    }
  }

  // ─── Provider Connections ───
  for (const prov of providerConns) {
    const name = prov.provider?.name || "Proveedor";
    const health: HealthStatus = prov.status === "error" ? "critical" : prov.status === "paused" ? "degraded" : "healthy";

    connections.push({
      id: prov.id,
      type: "provider",
      name,
      platform: prov.provider?.code || "unknown",
      rawStatus: prov.status,
      health,
      tokenStatus: "no_token",
      lastActivity: prov.lastSyncedAt?.toISOString() || prov.updatedAt.toISOString(),
      lastError: null,
    });

    if (prov.status === "error") {
      signals.push({
        id: `prov-error-${prov.id}`,
        severity: "critical",
        title: `Proveedor ${name}: en error`,
        description: "La conexión con el proveedor de sourcing tiene problemas.",
        href: "/admin/sourcing",
        actionLabel: "Revisar proveedor",
      });
    }

    if (prov.status === "active" && prov.lastSyncedAt) {
      const daysSinceSync = Math.floor((now.getTime() - prov.lastSyncedAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceSync > STALE_SYNC_DAYS) {
        signals.push({
          id: `prov-stale-${prov.id}`,
          severity: "normal",
          title: `Proveedor ${name}: sin sync reciente`,
          description: `Última sincronización de inventario hace ${daysSinceSync} días.`,
          href: "/admin/sourcing",
          actionLabel: "Verificar proveedor",
        });
      }
    }
  }

  // ─── Listing Sync Signals ───
  if (listingsSyncError > 0) {
    signals.push({
      id: "listings-sync-error",
      severity: "critical",
      title: `${listingsSyncError} publicación${listingsSyncError !== 1 ? "es" : ""} con error de sincronización`,
      description: "Listings que fallaron al sincronizar con el canal. Los datos pueden estar desactualizados.",
      href: "/admin/publications",
      actionLabel: "Revisar publicaciones",
    });
  }

  if (listingsPublishFailed > 0) {
    signals.push({
      id: "listings-publish-failed",
      severity: "high",
      title: `${listingsPublishFailed} publicación${listingsPublishFailed !== 1 ? "es" : ""} fallida${listingsPublishFailed !== 1 ? "s" : ""}`,
      description: "Productos que no se pudieron publicar en el canal destino.",
      href: "/admin/publications",
      actionLabel: "Revisar publicaciones",
    });
  }

  if (listingsOutOfSync > 0) {
    const reasonDetail = outOfSyncSample?.outOfSyncReason
      ? ` Ejemplo: ${outOfSyncSample.outOfSyncReason}`
      : "";
    signals.push({
      id: "listings-out-of-sync",
      severity: "high",
      title: `${listingsOutOfSync} publicación${listingsOutOfSync !== 1 ? "es" : ""} desincronizada${listingsOutOfSync !== 1 ? "s" : ""}`,
      description: `Diferencias detectadas entre el catálogo interno y el canal.${reasonDetail}`,
      href: "/admin/publications",
      actionLabel: "Ver diferencias",
    });
  }

  // ─── Provider Sync Job Signals ───
  if (syncJobsFailed > 0) {
    signals.push({
      id: "sync-jobs-failed",
      severity: "high",
      title: `${syncJobsFailed} trabajo${syncJobsFailed !== 1 ? "s" : ""} de sincronización fallido${syncJobsFailed !== 1 ? "s" : ""}`,
      description: "Jobs de sincronización con proveedores que no completaron correctamente.",
      href: "/admin/sourcing",
      actionLabel: "Revisar sincronización",
    });
  }

  // ─── Catalog Mirror Sync Signals ───
  if (mirrorsOutOfSync > 0) {
    signals.push({
      id: "mirrors-out-of-sync",
      severity: "normal",
      title: `${mirrorsOutOfSync} producto${mirrorsOutOfSync !== 1 ? "s" : ""} espejo desincronizado${mirrorsOutOfSync !== 1 ? "s" : ""}`,
      description: "Productos del catálogo espejo que difieren del proveedor original.",
      href: "/admin/sourcing",
      actionLabel: "Revisar catálogo espejo",
    });
  }

  // ─── Sort signals by severity ───
  signals.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  // ─── Derive overall health ───
  let overallHealth: HealthStatus = "unknown";
  if (connections.length > 0) {
    if (connections.some((c) => c.health === "critical") || signals.some((s) => s.severity === "critical")) {
      overallHealth = "critical";
    } else if (connections.some((c) => c.health === "degraded") || signals.some((s) => s.severity === "high")) {
      overallHealth = "degraded";
    } else {
      overallHealth = "healthy";
    }
  }

  const listings: ListingSyncSummary = {
    total: listingsTotal,
    published: listingsPublished,
    synced: listingsSynced,
    outOfSync: listingsOutOfSync,
    syncError: listingsSyncError,
    publishFailed: listingsPublishFailed,
  };

  return {
    connections,
    signals,
    listings,
    overallHealth,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Helpers ───

function resolveTokenStatus(
  tokenExpiresAt: Date | null,
  now: Date
): ConnectionHealthEntry["tokenStatus"] {
  if (!tokenExpiresAt) return "no_token";
  if (tokenExpiresAt < now) return "expired";
  const daysLeft = (tokenExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysLeft <= TOKEN_EXPIRY_WARNING_DAYS) return "expiring_soon";
  return "ok";
}

function resolveConnectionHealth(
  rawStatus: string,
  tokenStatus: ConnectionHealthEntry["tokenStatus"]
): HealthStatus {
  const brokenStatuses = ["error", "invalid", "expired", "reconnect_required"];
  if (brokenStatuses.includes(rawStatus) || tokenStatus === "expired") return "critical";
  if (rawStatus === "disconnected") return "degraded";
  if (tokenStatus === "expiring_soon") return "degraded";
  if (rawStatus === "connected" || rawStatus === "connecting") return "healthy";
  return "degraded";
}

function resolveChannelName(channel: string): string {
  switch (channel) {
    case "mercadolibre": return "Mercado Libre";
    case "shopify": return "Shopify";
    default: return channel;
  }
}

function resolveAdPlatformName(platform: string): string {
  switch (platform) {
    case "meta": return "Meta Ads";
    case "google": return "Google Ads";
    case "tiktok": return "TikTok Ads";
    default: return platform;
  }
}

function severityRank(s: HealthSeverity): number {
  switch (s) {
    case "critical": return 4;
    case "high": return 3;
    case "normal": return 2;
    case "info": return 1;
  }
}
