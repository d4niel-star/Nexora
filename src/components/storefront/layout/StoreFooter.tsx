import Link from "next/link";
import type { StoreConfig } from "@/types/storefront";
import { storePath } from "@/lib/store-engine/urls";

// ─── Store Footer ───
// Sober editorial footer. Three zones:
//  1. Brand + description
//  2. Footer navigation groups (tenant-defined) + newsletter
//  3. Legal row (privacy/terms/refunds + "botón de arrepentimiento" required
//     by Argentine Res. 424/2020)
// Visual tokens only — copy and data flow untouched.

export function StoreFooter({ config }: { config: StoreConfig }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="border-t border-[color:var(--hairline)] bg-[var(--surface-1)]"
      aria-labelledby="footer-heading"
    >
      <h2 id="footer-heading" className="sr-only">
        Navegación secundaria
      </h2>

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pt-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-4">
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt={config.name}
                className="h-8 w-auto"
              />
            ) : (
              <span
                className="font-display text-[26px] leading-none tracking-[-0.015em] text-ink-0"
                style={{ color: config.primaryColor }}
              >
                {config.name}
              </span>
            )}
            <p className="mt-6 max-w-xs text-[14px] leading-[1.55] text-ink-5">
              {config.description}
            </p>
          </div>

          {/* Navigation groups */}
          <div className="grid grid-cols-2 gap-8 lg:col-span-5 lg:grid-cols-2">
            {config.footerNavigation.map((group, idx) => (
              <div key={`${group.title}-${idx}`}>
                <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
                  {group.title}
                </h3>
                <ul role="list" className="mt-5 space-y-3">
                  {group.items.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className="text-[14px] text-ink-3 transition-colors hover:text-ink-0 focus-visible:outline-none focus-visible:text-ink-0"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-3">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
              Newsletter
            </h3>
            <p className="mt-5 text-[14px] leading-[1.55] text-ink-5">
              Enterate de nuevos lanzamientos y promociones especiales.
            </p>
            <form className="mt-5 flex flex-col gap-2 sm:flex-row">
              <label htmlFor="email-address" className="sr-only">
                Email
              </label>
              <input
                type="email"
                name="email-address"
                id="email-address"
                autoComplete="email"
                required
                placeholder="tu@email.com"
                className="h-11 w-full min-w-0 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3.5 text-[15px] text-ink-0 placeholder:text-ink-6 focus:border-[var(--accent-500)] focus:outline-none focus:shadow-[var(--shadow-focus)] transition-[box-shadow,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)]"
              />
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-[var(--r-md)] bg-ink-0 px-4 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 sm:shrink-0"
              >
                Suscribirse
              </button>
            </form>
          </div>
        </div>

        {/* Legal row */}
        <div className="mt-16 border-t border-[color:var(--hairline)] pt-8">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <Link
                href={storePath(config.slug, "legal?policy=privacy")}
                className="text-[12px] text-ink-5 transition-colors hover:text-ink-0"
              >
                Política de privacidad
              </Link>
              <Link
                href={storePath(config.slug, "legal?policy=terms")}
                className="text-[12px] text-ink-5 transition-colors hover:text-ink-0"
              >
                Términos y condiciones
              </Link>
              <Link
                href={storePath(config.slug, "legal?policy=refunds")}
                className="text-[12px] text-ink-5 transition-colors hover:text-ink-0"
              >
                Política de devoluciones
              </Link>
            </div>

            <Link
              href={storePath(config.slug, "arrepentimiento")}
              className="group inline-flex h-10 items-center gap-2.5 rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-4 text-[12px] font-medium text-ink-0 transition-colors hover:bg-ink-11"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--signal-danger)]" />
              Botón de arrepentimiento
            </Link>
          </div>

          <p className="mt-6 text-[11px] leading-[1.5] text-ink-6">
            Cumplimiento Resolución 424/2020 Secretaría de Comercio Interior.
          </p>
        </div>

        {/* Copyright */}
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-[color:var(--hairline)] pt-6 text-[12px] text-ink-5 lg:flex-row lg:items-center">
          <p>
            © {currentYear} {config.name}. Todos los derechos reservados.
          </p>
          <p className="text-ink-6">
            Powered by <span className="text-ink-3">Nexora</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
