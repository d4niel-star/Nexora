// ─── Custom-domain rewriter ───
// When a request arrives on a host that is NOT the canonical Nexora app host,
// we look it up in `StoreDomain` and rewrite the URL to `/store/<slug>/...`
// transparently — the URL bar keeps the custom domain, but Next.js renders
// the storefront routes.
//
// Canonical host detection: we consider a host canonical if it matches
// `CANONICAL_APP_HOST` (e.g. "nexora.app", "www.nexora.app") OR if the host
// has no dot (localhost) OR matches a *.localhost / *.onrender.com wildcard.
//
// DNS setup for tenants (documented in README / admin UI):
//   1. Tenant creates a CNAME `shop.theirbrand.com -> <CANONICAL_APP_HOST>`.
//   2. Tenant adds the hostname in /admin/settings/domains. Status starts
//      "pending". A verification endpoint (or manual ops step) flips it
//      to "active" once the CNAME resolves.
//   3. Once active, this middleware will resolve the host to the store.
//
// Security:
//   - We never trust the Host header blindly; we verify against DB on every
//     request (edge runtime). Cache can be added later if latency matters.
//   - We skip static assets and API routes to keep the rewriter cheap.

import { NextResponse, type NextRequest } from "next/server";

export const config = {
  // Run on all paths EXCEPT static assets, Next internals, and API routes —
  // API is host-agnostic.
  matcher: [
    "/((?!_next/static|_next/image|_next/data|favicon.ico|robots.txt|sitemap.xml|api/|.*\\..*).*)",
  ],
};

function isCanonicalHost(host: string): boolean {
  if (!host) return true;
  const bare = host.replace(/:\d+$/, "").toLowerCase();
  const canonical = (process.env.CANONICAL_APP_HOST || "").toLowerCase();

  if (canonical && (bare === canonical || bare === `www.${canonical}`)) return true;
  if (bare === "localhost" || bare.endsWith(".localhost")) return true;
  if (bare.endsWith(".onrender.com")) return true;
  if (bare.endsWith(".vercel.app")) return true;

  // No dot → likely local dev
  if (!bare.includes(".")) return true;

  return false;
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const url = request.nextUrl;

  // Already routed inside /store/ — nothing to do.
  if (url.pathname.startsWith("/store/")) return NextResponse.next();

  if (isCanonicalHost(host)) return NextResponse.next();

  // Resolve hostname → store slug via an internal lookup route so we can use
  // Prisma (which is not edge-compatible by default). The lookup route is
  // cached at the edge via revalidateTag / short TTL. If the host is not
  // registered, we fall through (Next will 404).
  try {
    const bare = host.replace(/:\d+$/, "").toLowerCase();
    const lookupUrl = new URL(`/api/internal/domain-lookup?host=${encodeURIComponent(bare)}`, request.url);
    const res = await fetch(lookupUrl, {
      headers: { "x-internal-lookup": "1" },
      // 60s cache is fine; domain→store mapping changes rarely.
      next: { revalidate: 60, tags: [`domain:${bare}`] },
    });

    if (!res.ok) return NextResponse.next();

    const data = (await res.json()) as { slug?: string | null; status?: string };
    if (!data.slug || data.status !== "active") return NextResponse.next();

    const rewritten = url.clone();
    rewritten.pathname = `/store/${data.slug}${url.pathname === "/" ? "" : url.pathname}`;
    return NextResponse.rewrite(rewritten);
  } catch {
    // Never break the request on lookup failure.
    return NextResponse.next();
  }
}
