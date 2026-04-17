import { NextRequest, NextResponse } from "next/server";
import { getDefaultStore } from "@/lib/store-engine/queries";
import { getMLAuthUrl } from "@/lib/channels/oauth/mercadolibre";
import { prisma } from "@/lib/db/prisma";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
  try {
    const store = await getDefaultStore();
    if (!store) {
      return NextResponse.redirect(`${APP_URL}/admin/channels?error=no_store`);
    }

    await prisma.systemEvent.create({
      data: {
        storeId: store.id,
        entityType: "channel_oauth",
        entityId: "mercadolibre",
        eventType: "channel_oauth_started",
        source: "oauth_route",
        message: "Iniciando autorización de Mercado Libre",
        severity: "info"
      }
    });

    const url = getMLAuthUrl(store.id);
    return NextResponse.redirect(url);
  } catch (e: any) {
    console.error("[ML Start Error]", e.message);
    const detail = encodeURIComponent(e.message || "Error desconocido");
    return NextResponse.redirect(`${APP_URL}/admin/channels?error=config_error&detail=${detail}`);
  }
}
