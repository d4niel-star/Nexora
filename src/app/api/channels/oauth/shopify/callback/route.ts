import { NextRequest, NextResponse } from "next/server";
import { handleShopifyCallback } from "@/lib/channels/oauth/shopify";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const shop = searchParams.get("shop");

  if (error || !code || !state || !shop) {
    return NextResponse.redirect(new URL("/admin/channels?error=oauth_failed", req.nextUrl.origin));
  }

  try {
    const stateObj = JSON.parse(Buffer.from(state, 'base64').toString('ascii'));
    const storeId = stateObj.storeId;
    const expectedShop = stateObj.shopDomain;

    if (!storeId || expectedShop !== shop) {
       throw new Error("Invalid state context or shop mismatch");
    }

    await handleShopifyCallback(code, shop, storeId);

    return NextResponse.redirect(new URL("/admin/channels", req.nextUrl.origin));
  } catch (e: any) {
    console.error("Shopify Callback Error", e);
    return NextResponse.redirect(new URL("/admin/channels?error=callback_failed", req.nextUrl.origin));
  }
}
