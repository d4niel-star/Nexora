import { prisma } from "@/lib/db/prisma";
import { encryptToken } from "@/lib/security/token-crypto";

const GOOGLE_ADS_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID || "";
const GOOGLE_ADS_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const REDIRECT_URI = `${APP_URL}/api/ads/oauth/google/callback`;

export function getGoogleAuthUrl(storeId: string) {
  if (!GOOGLE_ADS_CLIENT_ID) {
    throw new Error("GOOGLE_ADS_CLIENT_ID no está configurado.");
  }
  const state = Buffer.from(JSON.stringify({ storeId, ts: Date.now() })).toString('base64');
  const scope = "https://www.googleapis.com/auth/adwords";
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_ADS_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&state=${state}&prompt=consent`;
}

async function exchangeGoogleCode(code: string) {
  if (!GOOGLE_ADS_CLIENT_ID || !GOOGLE_ADS_CLIENT_SECRET) {
    throw new Error("Credenciales de Google no configuradas.");
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_ADS_CLIENT_ID,
      client_secret: GOOGLE_ADS_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[Google OAuth] Token exchange failed:", body);
    throw new Error(`Fallo al intercambiar token con Google (${res.status})`);
  }
  return res.json();
}

async function discoverGoogleCustomers(accessToken: string) {
  // Developer token is technically required for this, but if the app is approved for basic access,
  // we can at least list accessible customers to get an ID.
  const developerToken = process.env.GOOGLE_DEVELOPER_TOKEN;
  if (!developerToken) {
     throw new Error("Falta GOOGLE_DEVELOPER_TOKEN en el entorno.");
  }

  const url = "https://googleads.googleapis.com/v15/customers:listAccessibleCustomers";
  const res = await fetch(url, {
    headers: { 
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": developerToken
    }
  });

  if (!res.ok) {
    throw new Error(`Fallo al buscar cuentas de Google Ads (${res.status})`);
  }
  const data = await res.json();
  return data.resourceNames || []; // Returns array like ['customers/1234567890']
}

export async function handleGoogleCallback(code: string, storeId: string) {
  const tokenData = await exchangeGoogleCode(code);
  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token; // Offline access requested
  
  if (!accessToken) throw new Error("Google no devolvió un access_token válido.");

  let customers;
  try {
    customers = await discoverGoogleCustomers(accessToken);
  } catch (e: any) {
    return saveConnectionStatus(storeId, "google", "error", null, null, accessToken, refreshToken, "account_discovery_failed", `Error buscando cuentas: ${e.message}`);
  }

  if (customers.length === 0) {
    return saveConnectionStatus(storeId, "google", "error", null, null, accessToken, refreshToken, "account_not_found", "El usuario no tiene cuentas de Google Ads asociadas.");
  }

  // Use the first accessible customer
  const externalAccountId = customers[0].replace("customers/", "");
  const accountName = `Google Ads ${externalAccountId}`;

  return saveConnectionStatus(storeId, "google", "connected", externalAccountId, accountName, accessToken, refreshToken, null, null);
}

async function saveConnectionStatus(
  storeId: string, platform: string, status: string, externalAccountId: string | null, accountName: string | null, 
  accessToken: string, refreshToken: string | undefined, lastErrorCode: string | null, lastErrorDesc: string | null
) {
  let connection = await prisma.adPlatformConnection.findUnique({
    where: { storeId_platform: { storeId, platform } }
  });

  const data = {
    status,
    externalAccountId: externalAccountId || connection?.externalAccountId,
    accountName: accountName || connection?.accountName,
    accessToken: encryptToken(accessToken),
    refreshToken: refreshToken ? encryptToken(refreshToken) : connection?.refreshToken,
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
      message: status === "connected" ? `Google Ads conectado: ${accountName}` : `Google Ads OAuth incompleto: ${lastErrorDesc}`,
      severity: status === "connected" ? "info" : "warning"
    }
  });

  return connection;
}
