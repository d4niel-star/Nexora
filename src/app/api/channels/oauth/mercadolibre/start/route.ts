import { NextRequest, NextResponse } from "next/server";
import { getDefaultStore } from "@/lib/store-engine/queries";
import { getMLAuthUrl } from "@/lib/channels/oauth/mercadolibre";
import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
  try {
    const store = await getDefaultStore();
    if (!store) {
      return NextResponse.redirect(`${APP_URL}/admin/channels?error=no_store`);
    }

    const state = crypto.randomBytes(16).toString("hex");

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
    const res = NextResponse.redirect(url);
    res.cookies.set("oauth_store_id", store.id, { path: "/", httpOnly: true, maxAge: 60 * 15 });
    return res;
  } catch (e: any) {
    console.error("[ML Start Error]", e.message);
    const detail = encodeURIComponent(e.message || "Error desconocido");
    return NextResponse.redirect(`${APP_URL}/admin/channels?error=config_error&detail=${detail}`);
  }
}
