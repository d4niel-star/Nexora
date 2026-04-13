import { NextRequest, NextResponse } from "next/server";
import { getDefaultStore } from "@/lib/store-engine/queries";
import { getMLAuthUrl } from "@/lib/channels/oauth/mercadolibre";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const store = await getDefaultStore();
    if (!store) {
      return NextResponse.json({ error: "No store context found" }, { status: 400 });
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
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
