import { NextResponse } from "next/server";
import { getCurrentStore, getCurrentUser } from "@/lib/auth/session";
import {
  buildMercadoPagoOAuthUrl,
  createMercadoPagoOAuthState,
  getMercadoPagoOAuthRedirectUri,
} from "@/lib/payments/mercadopago/oauth";
import { getMercadoPagoPlatformReadiness } from "@/lib/payments/mercadopago/platform-readiness";

export const runtime = "nodejs";

function adminStoreRedirect(reason: string) {
  // Fail-closed default: if NEXT_PUBLIC_APP_URL is not configured we
  // cannot build an absolute redirect anyway, so we use localhost. The
  // resulting URL is meaningful only in dev.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.redirect(`${appUrl.replace(/\/$/, "")}/admin/store?tab=pagos&mp=${reason}`);
}

export async function GET() {
  const [user, store] = await Promise.all([getCurrentUser(), getCurrentStore()]);

  if (!user || !store) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(`${appUrl.replace(/\/$/, "")}/home/login`);
  }

  // ─── Platform readiness gate ────────────────────────────────────────
  // One central check replaces the three scattered `process.env.XXX`
  // guards. When the deployment is not ready we send the user back to
  // the store pagos tab which knows how to render the correct state
  // (ops → link to settings screen, merchant → contact-ops message).
  const readiness = getMercadoPagoPlatformReadiness();
  if (!readiness.canStartOAuth) {
    return adminStoreRedirect("platform_not_ready");
  }

  const redirectUri = getMercadoPagoOAuthRedirectUri();
  const state = createMercadoPagoOAuthState({ storeId: store.id, userId: user.id });
  const authorizationUrl = buildMercadoPagoOAuthUrl({
    clientId: process.env.MP_CLIENT_ID!,
    redirectUri,
    state,
  });

  return NextResponse.redirect(authorizationUrl);
}
