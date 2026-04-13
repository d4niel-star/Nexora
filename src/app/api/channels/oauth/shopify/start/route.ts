import { NextRequest, NextResponse } from "next/server";
import { getDefaultStore } from "@/lib/store-engine/queries";
import { getShopifyAuthUrl } from "@/lib/channels/oauth/shopify";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const store = await getDefaultStore();
    if (!store) {
      return NextResponse.json({ error: "No store context found" }, { status: 400 });
    }

    const searchParams = req.nextUrl.searchParams;
    const shopDomain = searchParams.get("shop");
    if (!shopDomain) {
      // Usualmente enviamos a una página para pedir el .myshopify.com url
      return NextResponse.redirect(new URL("/admin/channels?error=missing_shop", req.nextUrl.origin));
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
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
