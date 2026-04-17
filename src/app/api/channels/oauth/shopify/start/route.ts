import { NextRequest, NextResponse } from "next/server";
import { getDefaultStore } from "@/lib/store-engine/queries";
import { getShopifyAuthUrl } from "@/lib/channels/oauth/shopify";
import { prisma } from "@/lib/db/prisma";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
  try {
    const store = await getDefaultStore();
    if (!store) {
      return NextResponse.redirect(`${APP_URL}/admin/channels?error=no_store`);
    }

    const searchParams = req.nextUrl.searchParams;
    const shopDomain = searchParams.get("shop");
    if (!shopDomain) {
      return NextResponse.redirect(`${APP_URL}/admin/channels?error=missing_shop`);
    }

    await prisma.systemEvent.create({
      data: {
        storeId: store.id,
        entityType: "channel_oauth",
        entityId: "shopify",
        eventType: "channel_oauth_started",
        source: "oauth_route",
        message: `Iniciando autorización de Shopify para ${shopDomain}`,
        severity: "info"
      }
    });

    const url = getShopifyAuthUrl(store.id, shopDomain);
    return NextResponse.redirect(url);
  } catch (e: any) {
    console.error("[Shopify Start Error]", e.message);
    const detail = encodeURIComponent(e.message || "Error desconocido");
    return NextResponse.redirect(`${APP_URL}/admin/channels?error=config_error&detail=${detail}`);
  }
}
