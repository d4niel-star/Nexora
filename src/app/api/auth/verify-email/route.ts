import { NextRequest, NextResponse } from "next/server";
import { consumeVerificationToken } from "@/lib/auth/verification";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return redirectToResult("invalid");
  }

  const result = await consumeVerificationToken(token);

  if (result.success) {
    return redirectToResult("success");
  }

  // Determine error type for the UI
  if (result.error?.includes("expiró")) {
    return redirectToResult("expired");
  }

  if (result.error?.includes("ya fue utilizado")) {
    return redirectToResult("used");
  }

  return redirectToResult("invalid");
}

function redirectToResult(status: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.redirect(`${appUrl}/home/verify-email?status=${status}`);
}
