import { prisma } from "@/lib/db/prisma";
import { encryptToken } from "./crypto";

const ML_CLIENT_ID = process.env.MERCADOLIBRE_CLIENT_ID || "MOCK_ML_CLIENT_ID";
const ML_CLIENT_SECRET = process.env.MERCADOLIBRE_CLIENT_SECRET || "MOCK_ML_SECRET";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const REDIRECT_URI = `${APP_URL}/api/channels/oauth/mercadolibre/callback`;

export function getMLAuthUrl(storeId: string) {
  // Using generic MLA auth for Argentina usually
  // Appending storeId to state for callback context
  const state = Buffer.from(JSON.stringify({ storeId })).toString('base64');
  return `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${ML_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;
}

export async function handleMLCallback(code: string, storeId: string) {
  let accessToken = "mock_ml_access_token_" + Math.random().toString(36).substring(7);
  let refreshToken = "mock_ml_refresh_token_" + Math.random().toString(36).substring(7);
  let expiresIn = 21600; // 6 hours
  let userId = "MLA12345678";
  let accountName = "Vendedor Test ML";
  
  // En un flujo real, aquí llamarías a:
  // POST https://api.mercadolibre.com/oauth/token
  // grant_type=authorization_code&client_id=...&client_secret=...&code=...&redirect_uri=...
  // Y luego un GET a https://api.mercadolibre.com/users/me para obtener accountName
  
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  // Update or Create
  let connection = await prisma.channelConnection.findUnique({
    where: { storeId_channel: { storeId, channel: "mercadolibre" } }
  });

  if (!connection) {
    connection = await prisma.channelConnection.create({
      data: {
        storeId,
        channel: "mercadolibre",
        status: "connected",
        externalAccountId: userId,
        accountName,
        accessToken: encryptToken(accessToken),
        refreshToken: encryptToken(refreshToken),
        tokenExpiresAt: expiresAt,
        lastValidatedAt: new Date(),
      }
    });
  } else {
    connection = await prisma.channelConnection.update({
      where: { id: connection.id },
      data: {
        status: "connected",
        externalAccountId: userId,
        accountName,
        accessToken: encryptToken(accessToken),
        refreshToken: encryptToken(refreshToken),
        tokenExpiresAt: expiresAt,
        lastValidatedAt: new Date(),
        lastError: null,
      }
    });
  }

  // Audit
  await prisma.systemEvent.create({
    data: {
      storeId,
      entityType: "channel_connection",
      entityId: connection.id,
      eventType: "channel_oauth_succeeded",
      source: "oauth",
      message: "Cuenta de Mercado Libre conectada exitosamente",
      severity: "info"
    }
  });

  return connection;
}

export async function validateMLConnection(connectionId: string, storeId: string) {
  const conn = await prisma.channelConnection.findUnique({
    where: { id: connectionId, storeId }
  });
  if (!conn) return false;

  // En un flujo real, desciframos token y hacemos GET https://api.mercadolibre.com/users/me
  // Si da 401, status = 'expired'
  // Si funciona, status = 'connected'

  const isValid = Date.now() < (conn.tokenExpiresAt?.getTime() || 0);
  
  await prisma.channelConnection.update({
    where: { id: conn.id },
    data: {
      status: isValid ? "connected" : "expired",
      lastValidatedAt: new Date(),
    }
  });

  return isValid;
}
