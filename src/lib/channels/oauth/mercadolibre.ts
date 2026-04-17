import { prisma } from "@/lib/db/prisma";
import { encryptToken } from "./crypto";

const ML_CLIENT_ID = process.env.MERCADOLIBRE_CLIENT_ID || "";
const ML_CLIENT_SECRET = process.env.MERCADOLIBRE_CLIENT_SECRET || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const REDIRECT_URI = `${APP_URL}/api/channels/oauth/mercadolibre/callback`;

// ─── Auth URL ───

export function getMLAuthUrl(storeId: string) {
  if (!ML_CLIENT_ID) {
    throw new Error("MERCADOLIBRE_CLIENT_ID no está configurado. Agregá la variable de entorno.");
  }
  const state = Buffer.from(JSON.stringify({ storeId, ts: Date.now() })).toString('base64');
  return `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${ML_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;
}

// ─── Token Exchange ───

async function exchangeMLCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: number;
}> {
  if (!ML_CLIENT_ID || !ML_CLIENT_SECRET) {
    throw new Error("Credenciales de Mercado Libre no configuradas (MERCADOLIBRE_CLIENT_ID / MERCADOLIBRE_CLIENT_SECRET).");
  }

  const res = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: ML_CLIENT_ID,
      client_secret: ML_CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[ML] Token exchange failed:", res.status, body);
    throw new Error(`Token exchange falló (${res.status}). Verificá que redirect_uri registrado sea: ${REDIRECT_URI}`);
  }

  return res.json();
}

async function getMLUserInfo(accessToken: string): Promise<{ id: number; nickname: string }> {
  const res = await fetch("https://api.mercadolibre.com/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`No se pudo obtener info del usuario ML (${res.status})`);
  }
  return res.json();
}

// ─── Callback Handler ───

export async function handleMLCallback(code: string, storeId: string) {
  // 1. Exchange code for token
  const tokenData = await exchangeMLCode(code);

  // 2. Get account info
  let userId = String(tokenData.user_id);
  let accountName = `MLA ${userId}`;

  try {
    const userInfo = await getMLUserInfo(tokenData.access_token);
    userId = String(userInfo.id);
    accountName = userInfo.nickname || accountName;
  } catch (e) {
    // Non-fatal — we still have the token and user_id from token response
    console.warn("[ML] Could not fetch user info, using user_id from token:", e);
  }

  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  // 3. Persist connection
  let connection = await prisma.channelConnection.findUnique({
    where: { storeId_channel: { storeId, channel: "mercadolibre" } }
  });

  const data = {
    status: "connected",
    externalAccountId: userId,
    accountName,
    accessToken: encryptToken(tokenData.access_token),
    refreshToken: encryptToken(tokenData.refresh_token),
    tokenExpiresAt: expiresAt,
    lastValidatedAt: new Date(),
    lastError: null,
  };

  if (!connection) {
    connection = await prisma.channelConnection.create({
      data: { storeId, channel: "mercadolibre", ...data }
    });
  } else {
    connection = await prisma.channelConnection.update({
      where: { id: connection.id },
      data,
    });
  }

  // 4. Audit
  await prisma.systemEvent.create({
    data: {
      storeId,
      entityType: "channel_connection",
      entityId: connection.id,
      eventType: "channel_oauth_succeeded",
      source: "oauth",
      message: `Cuenta de Mercado Libre conectada: ${accountName} (${userId})`,
      severity: "info"
    }
  });

  return connection;
}

// ─── Token Refresh ───

export async function refreshMLToken(connectionId: string, storeId: string): Promise<boolean> {
  const conn = await prisma.channelConnection.findUnique({
    where: { id: connectionId, storeId }
  });
  if (!conn || !conn.refreshToken) return false;

  const { decryptToken } = await import("./crypto");
  const refreshToken = decryptToken(conn.refreshToken);
  if (!refreshToken) return false;

  try {
    const res = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: ML_CLIENT_ID,
        client_secret: ML_CLIENT_SECRET,
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) {
      await prisma.channelConnection.update({
        where: { id: conn.id },
        data: { status: "expired", lastError: `Token refresh falló (${res.status})` }
      });
      return false;
    }

    const data = await res.json();
    await prisma.channelConnection.update({
      where: { id: conn.id },
      data: {
        status: "connected",
        accessToken: encryptToken(data.access_token),
        refreshToken: encryptToken(data.refresh_token),
        tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
        lastValidatedAt: new Date(),
        lastError: null,
      }
    });
    return true;
  } catch (e: any) {
    await prisma.channelConnection.update({
      where: { id: conn.id },
      data: { status: "expired", lastError: `Refresh error: ${e.message}` }
    });
    return false;
  }
}

// ─── Validation ───

export async function validateMLConnection(connectionId: string, storeId: string) {
  const conn = await prisma.channelConnection.findUnique({
    where: { id: connectionId, storeId }
  });
  if (!conn) return false;

  // Check token expiry first
  if (conn.tokenExpiresAt && Date.now() > conn.tokenExpiresAt.getTime()) {
    // Try refresh
    const refreshed = await refreshMLToken(connectionId, storeId);
    if (!refreshed) return false;
    return true;
  }

  // If token is still valid, verify against API
  if (conn.accessToken) {
    const { decryptToken } = await import("./crypto");
    const token = decryptToken(conn.accessToken);
    if (!token) {
      await prisma.channelConnection.update({
        where: { id: conn.id },
        data: { status: "error", lastError: "Token no descifrable" }
      });
      return false;
    }

    try {
      const res = await fetch("https://api.mercadolibre.com/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        await prisma.channelConnection.update({
          where: { id: conn.id },
          data: { status: "connected", lastValidatedAt: new Date(), lastError: null }
        });
        return true;
      } else if (res.status === 401) {
        // Token expired, try refresh
        return refreshMLToken(connectionId, storeId);
      } else {
        await prisma.channelConnection.update({
          where: { id: conn.id },
          data: { status: "error", lastError: `Validación falló (${res.status})`, lastValidatedAt: new Date() }
        });
        return false;
      }
    } catch (e: any) {
      await prisma.channelConnection.update({
        where: { id: conn.id },
        data: { status: "error", lastError: `Error de red: ${e.message}`, lastValidatedAt: new Date() }
      });
      return false;
    }
  }

  return false;
}
