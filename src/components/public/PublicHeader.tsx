import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicWordmark } from "./PublicWordmark";

// ─── PublicHeader v3 ──────────────────────────────────────────────────────
// Light marketing chrome. The previous header was navy-on-dark with white
// text and an accent-blue "Empezar" pill — that read as a continuation of
// the admin sidebar and made the whole page feel like a logged-in product
// dashboard instead of a public marketing site.
//
// v3 ships a clean light bar:
//   · Warm off-white surface (matches .public-canvas).
//   · Hairline bottom border.
//   · Three text links (Producto, Plataforma, Planes).
//   · "Iniciar sesión" as a ghost button + "Probar gratis" as a brand pill.
// No motion wrapper here — Header is a server-component-friendly chrome
// element; the home body still gets PageReveal where appropriate.

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--hairline)] bg-[#f6f4ef]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <PublicWordmark />

        {/* Center nav — visible on lg+, collapses on small viewports.
            Links read as plain text, NOT as pills, so the bar stays
            quiet until the merchant interacts. */}
        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label="Secciones del sitio"
        >
          <Link
            href="/home"
            className="inline-flex h-9 items-center rounded-full px-3.5 text-[13.5px] font-medium text-ink-2 transition-colors hover:bg-[rgba(0,0,32,0.05)] hover:text-ink-0 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
          >
            Plataforma
          </Link>
          <Link
            href="/home#modulos"
            className="inline-flex h-9 items-center rounded-full px-3.5 text-[13.5px] font-medium text-ink-2 transition-colors hover:bg-[rgba(0,0,32,0.05)] hover:text-ink-0 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
          >
            Módulos
          </Link>
          <Link
            href="/home/pricing"
            className="inline-flex h-9 items-center rounded-full px-3.5 text-[13.5px] font-medium text-ink-2 transition-colors hover:bg-[rgba(0,0,32,0.05)] hover:text-ink-0 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
          >
            Planes
          </Link>
        </nav>

        {/* Right side: account access. Login is ghost, register is the
            single brand-navy pill — clean Shopify-style hierarchy. */}
        <div className="flex items-center gap-2">
          <Link
            href="/home/login"
            className="hidden h-10 items-center rounded-full px-4 text-[13.5px] font-medium text-ink-1 transition-colors hover:bg-[rgba(0,0,32,0.06)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] sm:inline-flex"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/home/register"
            className="group inline-flex h-10 items-center gap-1.5 rounded-full bg-[var(--brand)] px-4 text-[13.5px] font-medium text-white transition-colors hover:bg-[var(--brand-hover)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
          >
            Probar gratis
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-[var(--dur-base)] group-hover:translate-x-0.5"
              strokeWidth={2}
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
