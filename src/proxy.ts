import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ─── Auth protection ────────────────────────────────────────────────────
// Lightweight cookie-existence check for admin routes. Full session
// validation (expiry, user lookup, store ownership) is enforced
// server-side in the admin layout. This layer prevents unauthenticated
// users from even reaching the admin RSC tree.
const SESSION_COOKIE = 'nx_session'

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}

// ─── Canonical host detection ───
// A host is canonical when it is the Nexora app itself (apex, www, app.*),
// localhost / *.localhost, or a platform preview (onrender/vercel). Anything
// else is treated as a potential tenant custom domain and resolved via the
// internal lookup endpoint.
function isCanonicalHost(host: string, rootDomain: string): boolean {
  if (!host) return true
  const bare = host.replace(/:\d+$/, '').toLowerCase()
  const canonical = (process.env.CANONICAL_APP_HOST || rootDomain).toLowerCase()

  if (bare === canonical) return true
  if (bare === `www.${canonical}`) return true
  if (bare === `app.${canonical}`) return true
  if (bare === 'localhost' || bare.endsWith('.localhost')) return true
  if (bare.endsWith('.onrender.com')) return true
  if (bare.endsWith('.vercel.app')) return true
  if (!bare.includes('.')) return true
  return false
}

export async function proxy(req: NextRequest) {
  const url = req.nextUrl

  // Derive root domain dynamically for any port
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || (req.headers.get('host')?.startsWith('localhost') ? req.headers.get('host')! : 'localhost:3000')

  // Get hostname of request (e.g. demo.vercel.pub, demo.localhost:3000)
  let hostname = req.headers.get('host')!

  if (process.env.NEXT_PUBLIC_ROOT_DOMAIN) {
    hostname = hostname.replace(/\.localhost:\d+/, `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`)
  }

  const searchParams = req.nextUrl.searchParams.toString()
  const path = `${url.pathname}${searchParams.length > 0 ? `?${searchParams}` : ''}`
  const isLocalHost =
    hostname.startsWith('localhost:') || hostname.startsWith('127.0.0.1:')

  // ─── Custom-domain resolution (tenant storefronts) ───
  // Runs ONLY for non-canonical hosts and non-/store/ paths. If the hostname
  // is registered in StoreDomain with status "active", rewrite to the
  // canonical storefront route. On any failure we fall through so the rest
  // of the proxy logic can still handle the request.
  if (!isCanonicalHost(hostname, rootDomain) && !url.pathname.startsWith('/store/')) {
    try {
      const bare = hostname.replace(/:\d+$/, '').toLowerCase()
      const lookupUrl = new URL(`/api/internal/domain-lookup?host=${encodeURIComponent(bare)}`, req.url)
      const res = await fetch(lookupUrl, {
        headers: { 'x-internal-lookup': '1' },
        next: { revalidate: 60, tags: [`domain:${bare}`] },
      })
      if (res.ok) {
        const data = (await res.json()) as { slug?: string | null; status?: string }
        if (data.slug && data.status === 'active') {
          const rewritten = url.clone()
          rewritten.pathname = `/store/${data.slug}${url.pathname === '/' ? '' : url.pathname}`
          return NextResponse.rewrite(rewritten)
        }
      }
    } catch {
      // Never break the request on lookup failure — fall through.
    }
  }

  // ─── Auth guard for admin routes ──────────────────────────────────────
  // Runs BEFORE the filesystem passthrough. If the request is for /admin/*
  // and there's no session cookie, redirect to login instead of letting
  // the RSC tree load and do its own redirect (saves DB queries + latency).
  if (url.pathname.startsWith('/admin')) {
    const sessionCookie = req.cookies.get(SESSION_COOKIE)
    if (!sessionCookie?.value) {
      const loginUrl = url.clone()
      loginUrl.pathname = '/home/login'
      loginUrl.searchParams.set('from', url.pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // ─── Direct filesystem route passthrough ───
  // /home/*, /welcome/*, /admin/* and /store/* are actual app routes in the filesystem.
  // They must NEVER be rewritten by domain-based proxy logic to avoid double-rewriting
  // (e.g. /home/login → /home/home/login → 404).
  if (
    url.pathname.startsWith('/home') ||
    url.pathname.startsWith('/welcome') ||
    url.pathname.startsWith('/admin') ||
    url.pathname === '/store' ||
    url.pathname.startsWith('/store/')
  ) {
    return NextResponse.next()
  }

  // ─── Staging / unconfigured domain passthrough ───
  // When NEXT_PUBLIC_ROOT_DOMAIN is not set and we're not on localhost,
  // rewrite public paths to /home/* (same as localhost behavior) so the
  // landing page, login, register, etc. work on Render/staging deploys.
  if (!process.env.NEXT_PUBLIC_ROOT_DOMAIN && !isLocalHost) {
    return NextResponse.rewrite(new URL(`/home${path}`, req.url))
  }

  // ─── Localhost passthrough for known app-level routes ───
  // /admin/* and /welcome/* live at the root of /src/app, NOT under /home
  if (isLocalHost && (url.pathname.startsWith('/admin') || url.pathname.startsWith('/welcome'))) {
    return NextResponse.next()
  }

  // On localhost, allow direct storefront access via /[storeSlug] path
  // Any path segment that isn't a known public route is treated as a store slug
  if (isLocalHost && !url.pathname.startsWith('/home') && !url.pathname.startsWith('/admin')) {
    const firstSegment = url.pathname.split('/')[1]
    const publicRoutes = ['home', 'admin', 'login', 'register', 'pricing', 'welcome', 'check-email', 'verify-email']
    if (firstSegment && !publicRoutes.includes(firstSegment)) {
      return NextResponse.next()
    }
  }

  // ─── Rewrite for app admin (app.domain) ───
  if (hostname === `app.${rootDomain}`) {
    if (path.startsWith('/welcome')) {
      return NextResponse.rewrite(new URL(path, req.url))
    }
    return NextResponse.rewrite(new URL(`/admin${path === '/' ? '/dashboard' : path}`, req.url))
  }

  // ─── Rewrite for public website (Landing / marketing) ───
  // Only rewrite paths that belong under /home (login, register, pricing, landing)
  // Do NOT rewrite /welcome/* — those are app-level routes
  if (
    hostname === rootDomain ||
    hostname.startsWith('localhost:') ||
    hostname === `www.${rootDomain}`
  ) {
    return NextResponse.rewrite(new URL(`/home${path}`, req.url))
  }

  // ─── Rewrite for storefronts (Tenant matching) ───
  const rootAppHostname = process.env.NEXT_PUBLIC_APP_DOMAIN || `app.${rootDomain}`;
  const rootWwwHostname = process.env.NEXT_PUBLIC_ROOT_DOMAIN || `www.${rootDomain}`;

  if (hostname !== rootAppHostname && hostname !== rootWwwHostname && hostname !== `app.${rootDomain}`) {
    return NextResponse.rewrite(new URL(`/${hostname}${path}`, req.url))
  }

  return NextResponse.next()
}
