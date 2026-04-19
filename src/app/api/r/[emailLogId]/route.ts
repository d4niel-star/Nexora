// ─── Email click redirect tracker (V3.3) ───
// Endpoint hit by CTAs in tracked emails. Increments a per-row click
// counter on EmailLog and redirects to the real destination. Fail-open
// on user impact: when the log is missing or the destination fails
// validation, we still land the user on the app root rather than 500'ing.
//
// Security
// --------
// - Only allows redirects whose origin matches NEXT_PUBLIC_APP_URL (see
//   isAllowedRedirect). No protocol-relative, no foreign hosts, no
//   javascript:. An invalid destination returns 400.
// - emailLogId is taken from the route path and used as a primary-key
//   lookup; unknown ids increment nothing.
// - GET-only. Any other method returns 405.

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { isAllowedRedirect, resolveAppOrigin } from "@/lib/email/click-tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ emailLogId: string }>;

export async function GET(
  request: NextRequest,
  { params }: { params: Params },
) {
  const { emailLogId } = await params;
  const to = request.nextUrl.searchParams.get("to") ?? "";

  if (!isAllowedRedirect(to)) {
    return NextResponse.json(
      { error: "invalid_destination" },
      { status: 400 },
    );
  }

  // Increment-and-forget. We deliberately do NOT block redirect on DB
  // errors — the user must always land on the real URL even if the
  // counter cannot be bumped. updateMany + matches-nothing-on-unknown-id
  // keeps the call single-query and safe.
  try {
    await prisma.emailLog.updateMany({
      where: { id: emailLogId },
      data: {
        clickCount: { increment: 1 },
        lastClickedAt: new Date(),
      },
    });
  } catch {
    // swallow — a missing column or connection blip must not break the
    // user-facing redirect.
  }

  return NextResponse.redirect(to, { status: 302 });
}

export async function HEAD() {
  // Some email clients pre-scan links with HEAD. Return a harmless 200
  // so they do not count as clicks but also do not 405-flag the link.
  return new NextResponse(null, { status: 200 });
}

// Any other verb is a no-op 405. Declare explicitly to avoid surprising
// runtime routing.
export function POST() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
// appOrigin export kept for tests / debugging via `import { ROOT }` if ever needed.
export const ROOT = resolveAppOrigin();
