"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { decryptToken } from "@/lib/channels/oauth/crypto";

export async function syncAdsInsights(connectionId: string) {
  const connection = await prisma.adPlatformConnection.findUnique({
    where: { id: connectionId }
  });

  if (!connection) throw new Error("Conexión no encontrada");
  if (connection.status !== "connected") throw new Error(`La conexión no está activa (Estado: ${connection.status})`);
  if (!connection.accessToken) throw new Error("No hay access token disponible para sincronizar");
  if (!connection.externalAccountId) throw new Error("No hay Account ID asociado para consultar");

  const accessToken = decryptToken(connection.accessToken);
  if (!accessToken) throw new Error("Token indescifrable o corrupto");

  let metrics = {
    spend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
  };

  try {
    if (connection.platform === "meta") {
      metrics = await fetchMetaInsights(connection.externalAccountId, accessToken);
    } else if (connection.platform === "tiktok") {
      metrics = await fetchTikTokInsights(connection.externalAccountId, accessToken);
    } else if (connection.platform === "google") {
      metrics = await fetchGoogleInsights(connection, accessToken);
    } else {
      throw new Error("Plataforma desconocida para sync");
    }

    // Guardar snapshot honesto
    await prisma.adInsightSnapshot.create({
      data: {
        storeId: connection.storeId,
        connectionId: connection.id,
        platform: connection.platform,
        metricsJson: JSON.stringify(metrics),
      }
    });

    // Actualizar último sync
    await prisma.adPlatformConnection.update({
      where: { id: connection.id },
      data: {
        lastValidatedAt: new Date(),
        lastError: null,
      }
    });

    await prisma.systemEvent.create({
      data: {
        storeId: connection.storeId,
        entityType: "ads_sync",
        entityId: connection.id,
        eventType: "ads_sync_success",
        source: "manual_sync",
        message: `Métricas reales sincronizadas para ${connection.platform}`,
        severity: "info"
      }
    });

    revalidatePath("/admin/ads");
    revalidatePath("/admin/integrations");
    return { success: true, metrics };

  } catch (error: any) {
    // Sync Failed real
    await prisma.adPlatformConnection.update({
      where: { id: connection.id },
      data: {
        lastError: `[Sync Failed] ${error.message}`,
        status: error.message.includes("OAuthException") || error.message.includes("expired") ? "error" : connection.status
      }
    });

    throw error;
  }
}

// ─── META ADS SYNC ───
async function fetchMetaInsights(accountId: string, token: string) {
  // graph API requires "act_" prefix for ad accounts
  const actId = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const url = `https://graph.facebook.com/v18.0/${actId}/insights?date_preset=last_30d&fields=spend,impressions,clicks,actions&access_token=${token}`;
  
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || "Error consultando Meta Insights");
  }

  const result = data.data?.[0];
  if (!result) return { spend: 0, impressions: 0, clicks: 0, conversions: 0 };

  const conversions = result.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;

  return {
    spend: parseFloat(result.spend || "0"),
    impressions: parseInt(result.impressions || "0"),
    clicks: parseInt(result.clicks || "0"),
    conversions: parseInt(conversions),
  };
}

// ─── TIKTOK ADS SYNC ───
async function fetchTikTokInsights(advertiserId: string, token: string) {
  const url = `https://business-api.tiktok.com/open_api/v1.3/reporting/campaign/get/?advertiser_id=${advertiserId}&report_type=BASIC&data_level=AUCTION_CAMPAIGN&start_date=${getYesterday()}&end_date=${getToday()}&metrics=["spend","impressions","clicks","conversion"]`;
  
  const res = await fetch(url, {
    headers: { "Access-Token": token }
  });
  
  const data = await res.json();
  if (!res.ok || data.code !== 0) {
    throw new Error(data.message || "Error consultando TikTok Insights");
  }

  const list = data.data?.list || [];
  let spend = 0, impressions = 0, clicks = 0, conversions = 0;

  for (const item of list) {
     spend += parseFloat(item.metrics?.spend || "0");
     impressions += parseInt(item.metrics?.impressions || "0");
     clicks += parseInt(item.metrics?.clicks || "0");
     conversions += parseInt(item.metrics?.conversion || "0");
  }

  return { spend, impressions, clicks, conversions };
}

// ─── GOOGLE ADS SYNC ───
async function fetchGoogleInsights(connection: any, token: string) {
  const customerId = connection.externalAccountId;
  const developerToken = process.env.GOOGLE_DEVELOPER_TOKEN;
  if (!developerToken) {
    throw new Error("Falta GOOGLE_DEVELOPER_TOKEN. Google no permite extraer métricas en producción sin un developer token aprobado.");
  }

  const query = `
    SELECT metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions
    FROM customer
    WHERE segments.date DURING LAST_30_DAYS
  `;

  const url = `https://googleads.googleapis.com/v15/customers/${customerId}/googleAds:search`;
  
  let res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "developer-token": developerToken,
      "Content-Type": "application/json",
      "login-customer-id": customerId
    },
    body: JSON.stringify({ query })
  });

  // Handle Token Expiration
  if (res.status === 401 && connection.refreshToken) {
    const refreshToken = decryptToken(connection.refreshToken);
    if (refreshToken) {
      const newToken = await refreshGoogleToken(refreshToken);
      if (newToken) {
         // Update in DB
         const { encryptToken } = await import("@/lib/channels/oauth/crypto");
         await prisma.adPlatformConnection.update({
           where: { id: connection.id },
           data: { accessToken: encryptToken(newToken) }
         });
         
         // Retry fetch
         res = await fetch(url, {
           method: "POST",
           headers: {
             "Authorization": `Bearer ${newToken}`,
             "developer-token": developerToken,
             "Content-Type": "application/json",
             "login-customer-id": customerId
           },
           body: JSON.stringify({ query })
         });
      }
    }
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || data.error?.details?.[0]?.errors?.[0]?.message || "Error consultando Google Ads Insights");
  }

  const result = data.results?.[0]?.metrics;
  if (!result) return { spend: 0, impressions: 0, clicks: 0, conversions: 0 };

  return {
    spend: (parseInt(result.costMicros || "0") / 1000000),
    impressions: parseInt(result.impressions || "0"),
    clicks: parseInt(result.clicks || "0"),
    conversions: parseInt(result.conversions || "0"),
  };
}

async function refreshGoogleToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token;
}

// ─── Helpers ───
function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
}
