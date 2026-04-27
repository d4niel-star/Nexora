"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";

// ─── MarketingChrome ──────────────────────────────────────────────────────
// Wraps the public layout with optional header + footer. Auth surfaces
// (login, register, check-email, verify-email) own their own visual
// shell — the split-shell pattern — so they should NOT render the
// PublicHeader / PublicFooter chrome on top of it.
//
// Marketing surfaces (home, pricing, anything else under /home) keep the
// chrome so the navigation between marketing pages stays continuous.
//
// Decision is made by pathname so the single root layout can serve both
// surfaces without a route-group refactor. A client component is the
// minimum-risk way to do this lookup.

const AUTH_PATH_PREFIXES = [
  "/home/login",
  "/home/register",
  "/home/check-email",
  "/home/verify-email",
] as const;

function isAuthRoute(pathname: string): boolean {
  return AUTH_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function MarketingChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const auth = isAuthRoute(pathname);

  if (auth) {
    // Full-bleed: the auth split-shell renders the entire viewport.
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-1)] text-ink-0 selection:bg-ink-0 selection:text-ink-12">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
