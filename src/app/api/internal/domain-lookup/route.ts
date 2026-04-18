// ─── Internal domain → store resolver ───
// Called by middleware.ts to translate a custom hostname into a store slug.
// Runs on the Node runtime so Prisma is available. Only serves requests
// carrying the `x-internal-lookup: 1` header, which Next.js middleware sets
// but arbitrary external callers cannot forge through CDN pass-through
// because CDN strips unknown `x-*` headers by default. Still treat the
// result as public info (it IS public — the domain→store map is observable
// by DNS) and never leak anything besides slug + status.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const host = request.nextUrl.searchParams.get("host")?.toLowerCase().trim();
  if (!host) {
    return NextResponse.json({ slug: null, status: "not_found" }, { status: 200 });
  }

  // Try StoreDomain first (authoritative for custom domains).
  const domain = await prisma.storeDomain.findUnique({
    where: { hostname: host },
    select: {
      status: true,
      store: { select: { slug: true, active: true, status: true } },
    },
  });

  if (domain?.store && domain.store.active && domain.store.status === "active") {
    return NextResponse.json(
      { slug: domain.store.slug, status: domain.status },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  }

  // Fallback: Store.customDomain (legacy).
  const legacy = await prisma.store.findFirst({
    where: { customDomain: host, active: true, status: "active" },
    select: { slug: true },
  });

  if (legacy) {
    return NextResponse.json(
      { slug: legacy.slug, status: "active" },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  }

  return NextResponse.json({ slug: null, status: "not_found" }, { status: 200 });
}
