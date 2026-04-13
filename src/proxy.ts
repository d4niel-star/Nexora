import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

export function proxy(req: NextRequest) {
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

  // ─── Localhost passthrough for known app-level routes ───
  // /admin/* and /welcome/* live at the root of /src/app, NOT under /home
  if (isLocalHost && (url.pathname.startsWith('/admin') || url.pathname.startsWith('/welcome'))) {
    return NextResponse.next()
  }

  // On localhost, allow direct storefront access via /[storeSlug] path
  // Any path segment that isn't a known public route is treated as a store slug
  if (isLocalHost && !url.pathname.startsWith('/home') && !url.pathname.startsWith('/admin')) {
    const firstSegment = url.pathname.split('/')[1]
    const publicRoutes = ['home', 'admin', 'login', 'register', 'pricing', 'welcome']
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
