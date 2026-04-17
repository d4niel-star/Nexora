import { prisma } from "@/lib/db/prisma";
import { encryptToken } from "./crypto";

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || "";
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const REDIRECT_URI = `${APP_URL}/api/channels/oauth/shopify/callback`;

// ─── Auth URL ───

export function getShopifyAuthUrl(storeId: string, shopDomain: string) {
  if (!SHOPIFY_CLIENT_ID) {
    throw new Error("SHOPIFY_CLIENT_ID no está configurado. Agregá la variable de entorno.");
  }
  const state = Buffer.from(JSON.stringify({ storeId, shopDomain })).toString('base64');
  const scopes = "write_products,read_products,write_inventory,read_inventory,read_orders";
  return `https://${shopDomain}/admin/oauth/authorize?client_id=${SHOPIFY_CLIENT_ID}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;
}

// ─── Token Exchange ───

async function exchangeShopifyCode(code: string, shopDomain: string): Promise<{
  access_token: string;
  scope: string;
}> {
  if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
    throw new Error("Credenciales de Shopify no configuradas (SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET).");
  }

  const res = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({
      client_id: SHOPIFY_CLIENT_ID,
      client_secret: SHOPIFY_CLIENT_SECRET,
      code,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[Shopify] Token exchange failed:", res.status, body);
    throw new Error(`Token exchange falló (${res.status}). Verificá client_id y client_secret.`);
  }

  return res.json();
}

async function getShopifyShopInfo(shopDomain: string, accessToken: string): Promise<{ name: string; domain: string }> {
  const res = await fetch(`https://${shopDomain}/admin/api/2024-01/shop.json`, {
    headers: { "X-Shopify-Access-Token": accessToken },
  });
  if (!res.ok) {
    throw new Error(`No se pudo obtener info de la tienda Shopify (${res.status})`);
  }
  const data = await res.json();
  return { name: data.shop?.name || shopDomain, domain: data.shop?.domain || shopDomain };
}

// ─── Callback Handler ───

export async function handleShopifyCallback(code: string, shopDomain: string, storeId: string) {
  // 1. Exchange code for token
  const tokenData = await exchangeShopifyCode(code, shopDomain);

  // 2. Get shop info
  let accountName = shopDomain;
  try {
    const shopInfo = await getShopifyShopInfo(shopDomain, tokenData.access_token);
    accountName = shopInfo.name;
  } catch (e) {
    console.warn("[Shopify] Could not fetch shop info:", e);
  }

  // 3. Persist connection (Shopify tokens don't expire — they're offline tokens)
  let connection = await prisma.channelConnection.findUnique({
    where: { storeId_channel: { storeId, channel: "shopify" } }
  });

  const data = {
    status: "connected",
    externalAccountId: shopDomain,
    accountName,
    accessToken: encryptToken(tokenData.access_token),
    scopes: tokenData.scope,
    lastValidatedAt: new Date(),
    lastError: null,
  };

  if (!connection) {
    connection = await prisma.channelConnection.create({
      data: { storeId, channel: "shopify", ...data }
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
      message: `Tienda Shopify conectada: ${accountName} (${shopDomain})`,
      severity: "info"
    }
  });

  return connection;
}

// ─── Validation ───

export async function validateShopifyConnection(connectionId: string, storeId: string) {
  const conn = await prisma.channelConnection.findUnique({
    where: { id: connectionId, storeId }
  });
  if (!conn || !conn.accessToken) return false;

  const { decryptToken } = await import("./crypto");
  const token = decryptToken(conn.accessToken);
  if (!token || !conn.externalAccountId) {
    await prisma.channelConnection.update({
      where: { id: conn.id },
      data: { status: "error", lastError: "Token o dominio no descifrable" }
    });
    return false;
  }

  try {
    const res = await fetch(`https://${conn.externalAccountId}/admin/api/2024-01/shop.json`, {
      headers: { "X-Shopify-Access-Token": token },
    });

    if (res.ok) {
      await prisma.channelConnection.update({
        where: { id: conn.id },
        data: { status: "connected", lastValidatedAt: new Date(), lastError: null }
      });
      return true;
    } else if (res.status === 401 || res.status === 403) {
      await prisma.channelConnection.update({
        where: { id: conn.id },
        data: { status: "expired", lastError: `Acceso revocado o token inválido (${res.status})`, lastValidatedAt: new Date() }
      });
      return false;
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
