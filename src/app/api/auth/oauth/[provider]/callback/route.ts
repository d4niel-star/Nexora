import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { createSession } from "@/lib/auth/session";
import {
  exchangeOAuthCode,
  findOrCreateSocialUser,
  getOAuthCookieNames,
  isSocialProvider,
} from "@/lib/auth/social-oauth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: rawProvider } = await params;
  const provider = rawProvider.toLowerCase();
  const cookieStore = await cookies();
  const names = getOAuthCookieNames();
  const expectedState = cookieStore.get(names.state)?.value;
  const expectedProvider = cookieStore.get(names.provider)?.value;
  const modeCookie = cookieStore.get(names.mode)?.value;
  const mode = modeCookie === "register" ? "register" : "login";

  const fail = (reason: string) => redirectToAuth(req, mode, reason);

  try {
    if (!isSocialProvider(provider)) return fail("provider");
    if (expectedProvider !== provider) return fail("state");

    const returnedState = req.nextUrl.searchParams.get("state");
    if (!expectedState || returnedState !== expectedState) return fail("state");

    const providerError = req.nextUrl.searchParams.get("error");
    if (providerError) return fail(providerError === "access_denied" ? "denied" : "provider");

    const code = req.nextUrl.searchParams.get("code");
    if (!code) return fail("code");

    const profile = await exchangeOAuthCode(provider, code, req.nextUrl.origin);
    const user = await findOrCreateSocialUser(profile);
    await createSession(user.id);
    clearOAuthCookies(cookieStore);

    return NextResponse.redirect(new URL("/welcome/gate", req.nextUrl.origin));
  } catch (error) {
    console.error(`[Auth OAuth Callback Error: ${provider}]`, error);
    clearOAuthCookies(cookieStore);
    return fail("callback");
  }
}

function redirectToAuth(req: NextRequest, mode: "login" | "register", reason: string) {
  const target = new URL(mode === "register" ? "/home/register" : "/home/login", req.nextUrl.origin);
  target.searchParams.set("auth_error", reason);
  return NextResponse.redirect(target);
}

function clearOAuthCookies(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const names = getOAuthCookieNames();
  cookieStore.delete(names.state);
  cookieStore.delete(names.provider);
  cookieStore.delete(names.mode);
}
