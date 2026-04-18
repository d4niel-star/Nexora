import { NextResponse } from "next/server";
import { getCurrentStore, getCurrentUser } from "@/lib/auth/session";
import {
  buildMercadoPagoOAuthUrl,
  createMercadoPagoOAuthState,
  getMercadoPagoOAuthRedirectUri,
} from "@/lib/payments/mercadopago/oauth";

export const runtime = "nodejs";

function adminStoreRedirect(reason: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.redirect(`${appUrl.replace(/\/$/, "")}/admin/store?tab=pagos&mp=${reason}`);
}

export async function GET() {
  const [user, store] = await Promise.all([getCurrentUser(), getCurrentStore()]);

  if (!user || !store) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(`${appUrl.replace(/\/$/, "")}/home/login`);
  }

  const clientId = process.env.MP_CLIENT_ID;
  const clientSecret = process.env.MP_CLIENT_SECRET;

  if (!clientId || !clientSecret || !process.env.NEXT_PUBLIC_APP_URL) {
    return adminStoreRedirect("missing_config");
  }

  const redirectUri = getMercadoPagoOAuthRedirectUri();
  const state = createMercadoPagoOAuthState({ storeId: store.id, userId: user.id });
  const authorizationUrl = buildMercadoPagoOAuthUrl({
    clientId,
    redirectUri,
    state,
  });

  return NextResponse.redirect(authorizationUrl);
}
