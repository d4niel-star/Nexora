import { prisma } from "@/lib/db/prisma";
import { decryptToken, encryptToken } from "@/lib/security/token-crypto";
import { refreshMercadoPagoAccessToken } from "./oauth";

export interface MercadoPagoTenantCredentials {
  storeId: string;
  accessToken: string;
  publicKey?: string | null;
  isSandbox: boolean;
}

/**
 * MP access tokens live ~180 days. We proactively refresh when less than this
 * many milliseconds remain, so a concurrent checkout never races with expiry.
 */
const REFRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24h

export async function hasMercadoPagoConnected(storeId: string): Promise<boolean> {
  const connection = await prisma.storePaymentProvider.findUnique({
    where: {
      storeId_provider: {
        storeId,
        provider: "mercadopago",
      },
    },
    select: {
      status: true,
      accessTokenEncrypted: true,
    },
  });

  return connection?.status === "connected" && Boolean(connection.accessTokenEncrypted);
}

/**
 * Raised when the stored refresh token is rejected by Mercado Pago.
 * The store is automatically marked `needs_reconnection` so the admin UI can
 * prompt the owner to re-link the account.
 */
export class MercadoPagoReconnectionRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MercadoPagoReconnectionRequiredError";
  }
}

export async function getMercadoPagoCredentialsForStore(
  storeId: string,
): Promise<MercadoPagoTenantCredentials> {
  const connection = await prisma.storePaymentProvider.findUnique({
    where: {
      storeId_provider: {
        storeId,
        provider: "mercadopago",
      },
    },
  });

  if (!connection || !connection.accessTokenEncrypted) {
    throw new Error("Mercado Pago no está conectado para esta tienda.");
  }

  if (connection.status === "needs_reconnection") {
    throw new MercadoPagoReconnectionRequiredError(
      "La conexión con Mercado Pago expiró. Reconectá tu cuenta desde el panel de pagos.",
    );
  }

  if (connection.status !== "connected") {
    throw new Error("Mercado Pago no está conectado para esta tienda.");
  }

  // ─── Proactive refresh ───
  // If we have a refresh token and the access token is near expiry, refresh
  // before handing it out. This prevents runtime 401s mid-checkout.
  const needsRefresh =
    connection.tokenExpiresAt !== null &&
    connection.refreshTokenEncrypted !== null &&
    connection.tokenExpiresAt.getTime() - Date.now() < REFRESH_THRESHOLD_MS;

  if (needsRefresh) {
    const clientId = process.env.MP_CLIENT_ID;
    const clientSecret = process.env.MP_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error(
        "MP_CLIENT_ID o MP_CLIENT_SECRET no están configurados. No se puede renovar el token de Mercado Pago.",
      );
    }

    const refreshToken = decryptToken(connection.refreshTokenEncrypted!);
    if (!refreshToken) {
      await markNeedsReconnection(storeId, "Refresh token corrupto o indescifrable");
      throw new MercadoPagoReconnectionRequiredError(
        "El refresh token de Mercado Pago está corrupto. Reconectá tu cuenta.",
      );
    }

    try {
      const newToken = await refreshMercadoPagoAccessToken({
        clientId,
        clientSecret,
        refreshToken,
      });

      const now = new Date();
      const tokenExpiresAt = newToken.expires_in
        ? new Date(now.getTime() + newToken.expires_in * 1000)
        : null;

      await prisma.storePaymentProvider.update({
        where: { id: connection.id },
        data: {
          accessTokenEncrypted: encryptToken(newToken.access_token),
          // MP rotates refresh tokens on use: only overwrite if present.
          refreshTokenEncrypted: newToken.refresh_token
            ? encryptToken(newToken.refresh_token)
            : connection.refreshTokenEncrypted,
          tokenExpiresAt,
          publicKey: newToken.public_key ?? connection.publicKey,
          lastRefreshedAt: now,
          lastError: null,
          status: "connected",
        },
      });

      return {
        storeId,
        accessToken: newToken.access_token,
        publicKey: newToken.public_key ?? connection.publicKey,
        isSandbox: newToken.access_token.startsWith("TEST-"),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "refresh_failed";
      await markNeedsReconnection(storeId, msg);
      throw new MercadoPagoReconnectionRequiredError(
        "No se pudo renovar la sesión con Mercado Pago. Reconectá tu cuenta desde el panel de pagos.",
      );
    }
  }

  const accessToken = decryptToken(connection.accessTokenEncrypted);

  if (!accessToken) {
    throw new Error("El token de Mercado Pago de esta tienda no se pudo descifrar.");
  }

  return {
    storeId,
    accessToken,
    publicKey: connection.publicKey,
    isSandbox: accessToken.startsWith("TEST-"),
  };
}

async function markNeedsReconnection(storeId: string, reason: string): Promise<void> {
  await prisma.storePaymentProvider.update({
    where: {
      storeId_provider: { storeId, provider: "mercadopago" },
    },
    data: {
      status: "needs_reconnection",
      lastError: reason.slice(0, 500),
    },
  });
}
