import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { checkEnvVars } from "@/lib/env/check-envs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function bearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization")?.trim();
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function isAuthorized(request: NextRequest, cronSecret: string): boolean {
  const headerSecret = request.headers.get("x-cron-secret")?.trim() || null;
  const authSecret = bearerToken(request);
  return [headerSecret, authSecret].some((candidate) =>
    candidate ? safeEqual(candidate, cronSecret) : false,
  );
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!isAuthorized(request, cronSecret)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = checkEnvVars(process.env);

  return NextResponse.json(
    {
      ok: result.ok,
      requiredMissing: result.requiredMissing,
      warnings: result.warnings,
      mpMode: result.mpMode,
      emailProviderReady: result.emailProviderReady,
      appUrlLooksProduction: result.appUrlLooksProduction,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
