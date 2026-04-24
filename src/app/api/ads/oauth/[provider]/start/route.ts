import { NextRequest, NextResponse } from "next/server";
import { getDefaultStore } from "@/lib/store-engine/queries";
import { prisma } from "@/lib/db/prisma";
import { getMetaAuthUrl } from "@/lib/ads/oauth/meta";
import { getTikTokAuthUrl } from "@/lib/ads/oauth/tiktok";
import { getGoogleAuthUrl } from "@/lib/ads/oauth/google";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const resolvedParams = await params;
  const provider = resolvedParams.provider.toLowerCase();

  try {
    const store = await getDefaultStore();
    if (!store) {
      return NextResponse.redirect(`${APP_URL}/admin/ads/${provider}?error=no_store`);
    }

    await prisma.systemEvent.create({
      data: {
        storeId: store.id,
        entityType: "ads_oauth",
        entityId: provider,
        eventType: "ads_oauth_started",
        source: "oauth_route",
        message: `Iniciando autorización de ${provider} Ads`,
        severity: "info"
      }
    });

    let url = "";
    if (provider === "meta") url = getMetaAuthUrl(store.id);
    else if (provider === "tiktok") url = getTikTokAuthUrl(store.id);
    else if (provider === "google") url = getGoogleAuthUrl(store.id);
    else throw new Error(`Proveedor de Ads desconocido: ${provider}`);

    const res = NextResponse.redirect(url);
    res.cookies.set("oauth_store_id", store.id, { path: "/", httpOnly: true, maxAge: 60 * 15 });
    return res;
  } catch (e: any) {
    console.error(`[Ads Start Error: ${provider}]`, e.message);
    const detail = encodeURIComponent(e.message || "Error desconocido");
    return NextResponse.redirect(`${APP_URL}/admin/ads/${provider}?error=config_error&detail=${detail}`);
  }
}
