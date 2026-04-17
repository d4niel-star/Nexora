import { NextRequest, NextResponse } from "next/server";
import { handleMLCallback } from "@/lib/channels/oauth/mercadolibre";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // User denied authorization or ML returned an error
  if (error) {
    const reason = error === "access_denied" ? "auth_denied" : "provider_error";
    const msg = encodeURIComponent(errorDescription || error);
    return NextResponse.redirect(`${APP_URL}/admin/channels?error=${reason}&detail=${msg}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/admin/channels?error=missing_params`);
  }

  try {
    const stateObj = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    const storeId = stateObj.storeId;

    if (!storeId) throw new Error("State no contiene storeId");

    await handleMLCallback(code, storeId);

    return NextResponse.redirect(`${APP_URL}/admin/channels?connected=mercadolibre`);
  } catch (e: any) {
    console.error("[ML Callback Error]", e.message);
    const detail = encodeURIComponent(e.message || "Error desconocido");
    return NextResponse.redirect(`${APP_URL}/admin/channels?error=callback_failed&detail=${detail}`);
  }
}
