// ─── Centralised route constants for E2E ────────────────────────────────
//
// One source of truth for the URLs we navigate to. If a route ever moves,
// every spec stays in sync via this module instead of grepping the suite.

export const ROUTES = {
  login: "/home/login",
  admin: "/admin",
  dashboard: "/admin/dashboard",
  catalog: "/admin/catalog",
  orders: "/admin/orders",
  inventory: "/admin/inventory",
  communication: "/admin/communication",
  envCheck: "/api/internal/env-check",
} as const;

export function storefrontHome(slug: string): string {
  return `/store/${slug}`;
}

export function storefrontProducts(slug: string): string {
  return `/store/${slug}/products`;
}

export function storefrontCart(slug: string): string {
  return `/store/${slug}/cart`;
}
