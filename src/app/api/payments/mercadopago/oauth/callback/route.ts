import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getCurrentStore, getCurrentUser } from "@/lib/auth/session";
import {
  exchangeMercadoPagoOAuthCode,
  getMercadoPagoOAuthRedirectUri,
  verifyMercadoPagoOAuthState,
} from "@/lib/payments/mercadopago/oauth";
import { encryptToken } from "@/lib/security/token-crypto";
import { storePath } from "@/lib/store-engine/urls";

export const runtime = "nodejs";

function redirectToStore(reason: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.redirect(`${appUrl.replace(/\/$/, "")}/admin/store?tab=pagos&mp=${reason}`);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError) {
    return redirectToStore("error");
  }

  if (!code || !state) {
    return redirectToStore("error");
  }

  const clientId = process.env.MP_CLIENT_ID;
  const clientSecret = process.env.MP_CLIENT_SECRET;

  if (!clientId || !clientSecret || !process.env.NEXT_PUBLIC_APP_URL) {
    return redirectToStore("missing_config");
  }

  const payload = verifyMercadoPagoOAuthState(state);
  if (!payload) {
    return redirectToStore("invalid_state");
  }

  const [user, store] = await Promise.all([getCurrentUser(), getCurrentStore()]);
  if (!user || !store || user.id !== payload.userId || store.id !== payload.storeId) {
    return redirectToStore("invalid_state");
  }

  try {
    const token = await exchangeMercadoPagoOAuthCode({
      clientId,
      clientSecret,
      code,
      redirectUri: getMercadoPagoOAuthRedirectUri(),
      state,
    });

    const now = new Date();
    const tokenExpiresAt = token.expires_in
      ? new Date(now.getTime() + token.expires_in * 1000)
      : null;
    const refreshTokenEncrypted = token.refresh_token
      ? encryptToken(token.refresh_token)
      : null;

    await prisma.storePaymentProvider.upsert({
      where: {
        storeId_provider: {
          storeId: store.id,
          provider: "mercadopago",
        },
      },
      create: {
        storeId: store.id,
        provider: "mercadopago",
        status: "connected",
        accessTokenEncrypted: encryptToken(token.access_token),
        refreshTokenEncrypted,
        tokenExpiresAt,
        publicKey: token.public_key ?? null,
        externalAccountId: token.user_id ? String(token.user_id) : null,
        lastError: null,
        connectedAt: now,
        lastValidatedAt: now,
      },
      update: {
        status: "connected",
        accessTokenEncrypted: encryptToken(token.access_token),
        refreshTokenEncrypted,
        tokenExpiresAt,
        publicKey: token.public_key ?? null,
        externalAccountId: token.user_id ? String(token.user_id) : null,
        lastError: null,
        connectedAt: now,
        lastValidatedAt: now,
      },
    });

    await prisma.storeOnboarding.upsert({
      where: { storeId: store.id },
      create: { storeId: store.id, hasConnectedOAuth: true, currentStage: "creating_store" },
      update: { hasConnectedOAuth: true },
    });

    revalidatePath("/admin/store");
    revalidatePath("/admin/dashboard");
    revalidatePath(storePath(store.slug, "checkout"));

    return redirectToStore("connected");
  } catch {
    return redirectToStore("error");
  }
}
