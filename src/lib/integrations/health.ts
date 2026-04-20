// Health Center v1
// Query layer for active integrations that remain in Nexora:
// ads platforms and supplier/provider connections.

import { getCurrentStore } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getMercadoPagoPlatformReadiness } from "@/lib/payments/mercadopago/platform-readiness";
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
      listings: emptyListingSummary(),
      overallHealth: "unknown",
      generatedAt: new Date().toISOString(),
    };
  }

  const sid = store.id;
  const now = new Date();

  const [adConns, providerConns, syncJobsFailed, mirrorsOutOfSync, mpTenant] = await Promise.all([
    prisma.adPlatformConnection.findMany({
      where: { storeId: sid },
      select: {
        id: true,
        platform: true,
        status: true,
        tokenExpiresAt: true,
        lastValidatedAt: true,
        lastError: true,
        updatedAt: true,
      },
    }),
    prisma.providerConnection.findMany({
      where: { storeId: sid },
      include: { provider: { select: { name: true, code: true } } },
    }),
    prisma.providerSyncJob.count({
      where: { storeId: sid, status: "failed" },
    }),
    prisma.catalogMirrorProduct.count({
      where: { storeId: sid, syncStatus: "out_of_sync" },
    }),
    prisma.storePaymentProvider.findUnique({
      where: { storeId_provider: { storeId: sid, provider: "mercadopago" } },
      select: {
        id: true,
        status: true,
        accessTokenEncrypted: true,
        lastError: true,
        tokenExpiresAt: true,
        lastValidatedAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const connections: ConnectionHealthEntry[] = [];
  const signals: HealthSignal[] = [];

  // ── Payments (Mercado Pago) ───────────────────────────────────────────
  // The platform env layer is a hard prerequisite: without it, tenant
  // OAuth cannot even start, so we emit a critical signal that routes
  // the operator (and merchants, transparently) to the ops diagnostic.
  const platformMp = getMercadoPagoPlatformReadiness();
  if (!platformMp.ready) {
    signals.push({
      id: "mp-platform-env",
      severity: "critical",
      title: "Mercado Pago: plataforma no configurada",
      description: `Faltan variables de infraestructura: ${platformMp.missing.join(", ")}. Ninguna tienda puede iniciar la conexión OAuth hasta resolverlo.`,
      href: "/admin/settings/integrations/mercadopago",
      actionLabel: "Ver diagnóstico",
    });
  }

  // Tenant-level MP status — surface reconnection and error states so
  // the merchant sees them in the health center, not just buried in
  // /admin/store?tab=pagos.
  if (mpTenant) {
    const tokenExpired =
      mpTenant.tokenExpiresAt != null && mpTenant.tokenExpiresAt.getTime() < now.getTime();
    if (
      mpTenant.status === "needs_reconnection" ||
      mpTenant.status === "expired" ||
      tokenExpired
    ) {
      signals.push({
        id: `mp-tenant-reconnect-${mpTenant.id}`,
        severity: "critical",
        title: "Mercado Pago: reconexión requerida",
        description:
          "La conexión OAuth de tu tienda expiró. Hasta que la renueves, el checkout no puede cobrar.",
        href: "/admin/store?tab=pagos",
        actionLabel: "Reconectar",
      });
    } else if (mpTenant.status === "error" || mpTenant.lastError) {
      signals.push({
        id: `mp-tenant-error-${mpTenant.id}`,
        severity: "high",
        title: "Mercado Pago: error en la conexión",
        description: mpTenant.lastError ?? "La conexión de pagos reporta un error.",
        href: "/admin/store?tab=pagos",
        actionLabel: "Revisar conexión",
      });
    }
  } else if (platformMp.ready) {
    // Platform is ready but no tenant row — surface as a normal-severity
    // "not connected yet" hint rather than as a silent gap.
    signals.push({
      id: "mp-tenant-missing",
      severity: "normal",
      title: "Mercado Pago: tienda aún sin conectar",
      description:
        "Tu tienda todavía no completó la conexión OAuth con Mercado Pago. Hasta entonces el checkout queda desactivado.",
      href: "/admin/store?tab=pagos",
      actionLabel: "Conectar Mercado Pago",
    });
  }

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
        title: `${name}: conexion con error`,
        description: ad.lastError || "La plataforma publicitaria no esta operativa.",
        href: "/admin/integrations",
        actionLabel: "Revisar integracion",
      });
    }

    if (tokenStatus === "expired") {
      signals.push({
        id: `ad-token-expired-${ad.id}`,
        severity: "critical",
        title: `${name}: token vencido`,
        description: `Token vencido el ${ad.tokenExpiresAt!.toLocaleDateString("es-AR")}. No se pueden obtener metricas.`,
        href: "/admin/integrations",
        actionLabel: "Renovar autenticacion",
      });
    }

    if (tokenStatus === "expiring_soon") {
      const daysLeft = Math.ceil((ad.tokenExpiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      signals.push({
        id: `ad-token-expiring-${ad.id}`,
        severity: "high",
        title: `${name}: token vence en ${daysLeft} dia${daysLeft !== 1 ? "s" : ""}`,
        description: "Renovar antes de perder acceso a metricas de campana.",
        href: "/admin/integrations",
        actionLabel: "Renovar token",
      });
    }
  }

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
        description: "La conexion con el proveedor de sourcing tiene problemas.",
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
          description: `Ultima sincronizacion de inventario hace ${daysSinceSync} dias.`,
          href: "/admin/sourcing",
          actionLabel: "Verificar proveedor",
        });
      }
    }
  }

  if (syncJobsFailed > 0) {
    signals.push({
      id: "sync-jobs-failed",
      severity: "high",
      title: `${syncJobsFailed} trabajo${syncJobsFailed !== 1 ? "s" : ""} de sincronizacion fallido${syncJobsFailed !== 1 ? "s" : ""}`,
      description: "Jobs de sincronizacion con proveedores que no completaron correctamente.",
      href: "/admin/sourcing",
      actionLabel: "Revisar sincronizacion",
    });
  }

  if (mirrorsOutOfSync > 0) {
    signals.push({
      id: "mirrors-out-of-sync",
      severity: "normal",
      title: `${mirrorsOutOfSync} producto${mirrorsOutOfSync !== 1 ? "s" : ""} espejo desincronizado${mirrorsOutOfSync !== 1 ? "s" : ""}`,
      description: "Productos del catalogo espejo que difieren del proveedor original.",
      href: "/admin/sourcing",
      actionLabel: "Revisar catalogo espejo",
    });
  }

  signals.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

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

  return {
    connections,
    signals,
    listings: emptyListingSummary(),
    overallHealth,
    generatedAt: new Date().toISOString(),
  };
}

function emptyListingSummary(): ListingSyncSummary {
  return { total: 0, published: 0, synced: 0, outOfSync: 0, syncError: 0, publishFailed: 0 };
}

function resolveTokenStatus(
  tokenExpiresAt: Date | null,
  now: Date,
): ConnectionHealthEntry["tokenStatus"] {
  if (!tokenExpiresAt) return "no_token";
  if (tokenExpiresAt < now) return "expired";
  const daysLeft = (tokenExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysLeft <= TOKEN_EXPIRY_WARNING_DAYS) return "expiring_soon";
  return "ok";
}

function resolveConnectionHealth(
  rawStatus: string,
  tokenStatus: ConnectionHealthEntry["tokenStatus"],
): HealthStatus {
  const brokenStatuses = ["error", "invalid", "expired", "reconnect_required"];
  if (brokenStatuses.includes(rawStatus) || tokenStatus === "expired") return "critical";
  if (rawStatus === "disconnected") return "degraded";
  if (tokenStatus === "expiring_soon") return "degraded";
  if (rawStatus === "connected" || rawStatus === "connecting" || rawStatus === "active") return "healthy";
  return "degraded";
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
