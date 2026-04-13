import { NextRequest, NextResponse } from "next/server";
import { handleMLCallback } from "@/lib/channels/oauth/mercadolibre";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    // Podremos redirigir al admin con error en querystring
    // Para simplificar:
    return NextResponse.redirect(new URL("/admin/channels?error=oauth_failed", req.nextUrl.origin));
  }

  try {
    const stateObj = JSON.parse(Buffer.from(state, 'base64').toString('ascii'));
    const storeId = stateObj.storeId;

    if (!storeId) throw new Error("Invalid state context");

    await handleMLCallback(code, storeId);

    return NextResponse.redirect(new URL("/admin/channels", req.nextUrl.origin));
  } catch (e: any) {
    console.error("ML Callback Error", e);
    return NextResponse.redirect(new URL("/admin/channels?error=callback_failed", req.nextUrl.origin));
  }
}
