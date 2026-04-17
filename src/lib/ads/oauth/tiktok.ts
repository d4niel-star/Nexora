import { prisma } from "@/lib/db/prisma";
import { encryptToken } from "@/lib/channels/oauth/crypto";

const TIKTOK_APP_ID = process.env.TIKTOK_APP_ID || "";
const TIKTOK_APP_SECRET = process.env.TIKTOK_APP_SECRET || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const REDIRECT_URI = `${APP_URL}/api/ads/oauth/tiktok/callback`;

export function getTikTokAuthUrl(storeId: string) {
  if (!TIKTOK_APP_ID) {
    throw new Error("TIKTOK_APP_ID no está configurado.");
  }
  const state = Buffer.from(JSON.stringify({ storeId, ts: Date.now() })).toString('base64');
  return `https://business-api.tiktok.com/portal/auth?app_id=${TIKTOK_APP_ID}&state=${state}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
}

async function exchangeTikTokCode(code: string) {
  if (!TIKTOK_APP_ID || !TIKTOK_APP_SECRET) {
    throw new Error("Credenciales de TikTok no configuradas.");
  }
  const res = await fetch("https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: TIKTOK_APP_ID,
      secret: TIKTOK_APP_SECRET,
      auth_code: code,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[TikTok OAuth] Token exchange failed:", body);
    throw new Error(`Fallo al intercambiar token con TikTok (${res.status})`);
  }
  
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`TikTok Error: ${data.message}`);
  }
  return data.data;
}

async function discoverTikTokAdvertisers(accessToken: string, appId: string, secret: string) {
  const url = `https://business-api.tiktok.com/open_api/v1.3/oauth2/advertiser/get/?app_id=${appId}&secret=${secret}`;
  const res = await fetch(url, {
    headers: { "Access-Token": accessToken }
  });
  if (!res.ok) {
    throw new Error(`Fallo al buscar cuentas publicitarias en TikTok (${res.status})`);
  }
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.message);
  return data.data?.list || [];
}

export async function handleTikTokCallback(code: string, storeId: string) {
  const tokenData = await exchangeTikTokCode(code);
  const accessToken = tokenData.access_token;
  
  if (!accessToken) throw new Error("TikTok no devolvió un access_token válido.");

  let accounts;
  try {
    accounts = await discoverTikTokAdvertisers(accessToken, TIKTOK_APP_ID, TIKTOK_APP_SECRET);
  } catch (e: any) {
    return saveConnectionStatus(storeId, "tiktok", "error", null, null, accessToken, "account_discovery_failed", `Error buscando cuentas: ${e.message}`);
  }

  if (accounts.length === 0) {
    return saveConnectionStatus(storeId, "tiktok", "error", null, null, accessToken, "account_not_found", "El usuario no tiene Cuentas Publicitarias de TikTok asociadas.");
  }

  const activeAccount = accounts[0];
  const externalAccountId = activeAccount.advertiser_id;
  const accountName = activeAccount.advertiser_name || `TikTok Ad Account ${externalAccountId}`;

  return saveConnectionStatus(storeId, "tiktok", "connected", externalAccountId, accountName, accessToken, null, null);
}

async function saveConnectionStatus(
  storeId: string, platform: string, status: string, externalAccountId: string | null, accountName: string | null, 
  accessToken: string, lastErrorCode: string | null, lastErrorDesc: string | null
) {
  let connection = await prisma.adPlatformConnection.findUnique({
    where: { storeId_platform: { storeId, platform } }
  });

  const data = {
    status,
    externalAccountId: externalAccountId || connection?.externalAccountId,
    accountName: accountName || connection?.accountName,
    accessToken: encryptToken(accessToken),
    lastValidatedAt: new Date(),
    lastError: lastErrorDesc ? `[${lastErrorCode}] ${lastErrorDesc}` : null,
  };

  if (!connection) {
    connection = await prisma.adPlatformConnection.create({
      data: { storeId, platform, ...data }
    });
  } else {
    connection = await prisma.adPlatformConnection.update({
      where: { id: connection.id },
      data,
    });
  }

  await prisma.systemEvent.create({
    data: {
      storeId,
      entityType: "ads_connection",
      entityId: connection.id,
      eventType: status === "connected" ? "ads_oauth_succeeded" : "ads_oauth_partial",
      source: "oauth",
      message: status === "connected" ? `TikTok Ads conectado: ${accountName}` : `TikTok Ads OAuth incompleto: ${lastErrorDesc}`,
      severity: status === "connected" ? "info" : "warning"
    }
  });

  return connection;
}
