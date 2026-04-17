import { NextRequest, NextResponse } from "next/server";
import { handleShopifyCallback } from "@/lib/channels/oauth/shopify";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const shop = searchParams.get("shop");

  if (error) {
    const msg = encodeURIComponent(errorDescription || error);
    return NextResponse.redirect(`${APP_URL}/admin/channels?error=auth_denied&detail=${msg}`);
  }

  if (!code || !state || !shop) {
    return NextResponse.redirect(`${APP_URL}/admin/channels?error=missing_params`);
  }

  try {
    const stateObj = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    const storeId = stateObj.storeId;
    const expectedShop = stateObj.shopDomain;

    if (!storeId || expectedShop !== shop) {
      throw new Error("State inválido o shop no coincide con el esperado");
    }

    await handleShopifyCallback(code, shop, storeId);

    return NextResponse.redirect(`${APP_URL}/admin/channels?connected=shopify`);
  } catch (e: any) {
    console.error("[Shopify Callback Error]", e.message);
    const detail = encodeURIComponent(e.message || "Error desconocido");
    return NextResponse.redirect(`${APP_URL}/admin/channels?error=callback_failed&detail=${detail}`);
  }
}
