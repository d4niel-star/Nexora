import { prisma } from "@/lib/db/prisma";
import { encryptToken } from "@/lib/channels/oauth/crypto";

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || "";
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const REDIRECT_URI = `${APP_URL}/api/ads/oauth/meta/callback`;

export function getMetaAuthUrl(storeId: string) {
  if (!FACEBOOK_APP_ID) {
    throw new Error("FACEBOOK_APP_ID no está configurado.");
  }
  const state = Buffer.from(JSON.stringify({ storeId, ts: Date.now() })).toString('base64');
  const scopes = "ads_management,ads_read";
  return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}&scope=${scopes}`;
}

async function exchangeMetaCode(code: string) {
  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
    throw new Error("Credenciales de Meta no configuradas.");
  }
  const url = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${FACEBOOK_APP_SECRET}&code=${code}`;
  
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    console.error("[Meta OAuth] Token exchange failed:", body);
    throw new Error(`Fallo al intercambiar token con Meta (${res.status})`);
  }
  return res.json();
}

async function discoverMetaAdAccounts(accessToken: string) {
  const url = `https://graph.facebook.com/v18.0/me/adaccounts?fields=name,account_status&access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Fallo al buscar cuentas publicitarias en Meta (${res.status})`);
  }
  const data = await res.json();
  return data.data || [];
}

export async function handleMetaCallback(code: string, storeId: string) {
  // 1. Token Exchange
  const tokenData = await exchangeMetaCode(code);
  const accessToken = tokenData.access_token;
  
  if (!accessToken) throw new Error("Meta no devolvió un access_token válido.");

  // 2. Discover Ad Accounts (Account Selection step)
  let accounts;
  try {
    accounts = await discoverMetaAdAccounts(accessToken);
  } catch (e: any) {
    return saveConnectionStatus(storeId, "meta", "error", null, null, accessToken, "account_discovery_failed", `Error buscando cuentas: ${e.message}`);
  }

  if (accounts.length === 0) {
    return saveConnectionStatus(storeId, "meta", "error", null, null, accessToken, "account_not_found", "El usuario no tiene Ad Accounts de Meta asociadas.");
  }

  // Auto-select the first active account (simplification to avoid building a complex selection UI)
  const activeAccount = accounts.find((a: any) => a.account_status === 1) || accounts[0];
  const externalAccountId = activeAccount.id;
  const accountName = activeAccount.name || `Meta Ad Account ${externalAccountId}`;

  // 3. Persist Connection
  return saveConnectionStatus(storeId, "meta", "connected", externalAccountId, accountName, accessToken, null, null);
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
      message: status === "connected" ? `Meta Ads conectado: ${accountName}` : `Meta Ads OAuth incompleto: ${lastErrorDesc}`,
      severity: status === "connected" ? "info" : "warning"
    }
  });

  return connection;
}
