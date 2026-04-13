import { prisma } from "@/lib/db/prisma";
import { encryptToken } from "./crypto";

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || "MOCK_SHOPIFY_CLIENT_ID";
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET || "MOCK_SHOPIFY_SECRET";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const REDIRECT_URI = `${APP_URL}/api/channels/oauth/shopify/callback`;

export function getShopifyAuthUrl(storeId: string, shopDomain: string) {
  const state = Buffer.from(JSON.stringify({ storeId, shopDomain })).toString('base64');
  const nonce = Math.random().toString(36).substring(7); // Basic nonce
  const scopes = "write_products,read_products,write_inventory,read_inventory";
  return `https://${shopDomain}/admin/oauth/authorize?client_id=${SHOPIFY_CLIENT_ID}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}&grant_options[]=${nonce}`;
}

export async function handleShopifyCallback(code: string, shopDomain: string, storeId: string) {
  let accessToken = "shpua_" + Math.random().toString(36).substring(7);
  let accountName = shopDomain;
  let scopes = "write_products,read_products";
  
  // En flujo real: POST https://{shopDomain}/admin/oauth/access_token
  // body: { client_id, client_secret, code }
  
  let connection = await prisma.channelConnection.findUnique({
    where: { storeId_channel: { storeId, channel: "shopify" } }
  });

  if (!connection) {
    connection = await prisma.channelConnection.create({
      data: {
        storeId,
        channel: "shopify",
        status: "connected",
        externalAccountId: shopDomain, // Usamos shopDomain como externalAccountId
        accountName,
        accessToken: encryptToken(accessToken),
        scopes,
        lastValidatedAt: new Date(),
      }
    });
  } else {
    connection = await prisma.channelConnection.update({
      where: { id: connection.id },
      data: {
        status: "connected",
        externalAccountId: shopDomain,
        accountName,
        accessToken: encryptToken(accessToken),
        scopes,
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
      message: `Tienda Shopify ${shopDomain} conectada exitosamente`,
      severity: "info"
    }
  });

  return connection;
}

export async function validateShopifyConnection(connectionId: string, storeId: string) {
  const conn = await prisma.channelConnection.findUnique({
    where: { id: connectionId, storeId }
  });
  if (!conn) return false;

  // Flow real: GET https://{conn.externalAccountId}/admin/api/2023-10/shop.json con HEADER X-Shopify-Access-Token
  const isValid = true; // Por mock asumimos válido a menos que falle explícitamente

  await prisma.channelConnection.update({
    where: { id: conn.id },
    data: {
      status: isValid ? "connected" : "invalid",
      lastValidatedAt: new Date(),
    }
  });

  return isValid;
}
