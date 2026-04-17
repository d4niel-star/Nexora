import { NextRequest, NextResponse } from "next/server";
import { handleMetaCallback } from "@/lib/ads/oauth/meta";
import { handleTikTokCallback } from "@/lib/ads/oauth/tiktok";
import { handleGoogleCallback } from "@/lib/ads/oauth/google";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const resolvedParams = await params;
  const provider = resolvedParams.provider.toLowerCase();
  const searchParams = req.nextUrl.searchParams;
  
  const code = searchParams.get("code") || searchParams.get("auth_code"); // TikTok uses auth_code
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    const reason = error === "access_denied" ? "auth_denied" : "provider_error";
    const msg = encodeURIComponent(errorDescription || error);
    return NextResponse.redirect(`${APP_URL}/admin/ai/ads?error=${reason}&detail=${msg}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/admin/ai/ads?error=missing_params`);
  }

  try {
    const stateObj = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    const storeId = stateObj.storeId;

    if (!storeId) throw new Error("State no contiene storeId");

    if (provider === "meta") {
       await handleMetaCallback(code, storeId);
    } else if (provider === "tiktok") {
       await handleTikTokCallback(code, storeId);
    } else if (provider === "google") {
       await handleGoogleCallback(code, storeId);
    } else {
       throw new Error(`Proveedor de Ads desconocido: ${provider}`);
    }

    return NextResponse.redirect(`${APP_URL}/admin/ai/ads?connected=${provider}`);
  } catch (e: any) {
    console.error(`[Ads Callback Error: ${provider}]`, e.message);
    const detail = encodeURIComponent(e.message || "Error desconocido");
    return NextResponse.redirect(`${APP_URL}/admin/ai/ads?error=callback_failed&detail=${detail}`);
  }
}
