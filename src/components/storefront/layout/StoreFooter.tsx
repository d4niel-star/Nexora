import Link from "next/link";
import type { StoreConfig } from "@/types/storefront";
import { storePath } from "@/lib/store-engine/urls";

// ─── Store Footer ───
// Sober editorial footer. Zones:
//  1. Brand + description
//  2. Footer navigation groups (tenant-defined)
//  3. Contact info + social links (from Comunicación admin)
//  4. Newsletter
//  5. Legal row (privacy/terms/refunds + "botón de arrepentimiento" required
//     by Argentine Res. 424/2020)
// Visual tokens only — copy and data flow untouched.

export function StoreFooter({
  config,
  showTrackingLink = false,
}: {
  config: StoreConfig;
  /** Renders the "Seguir mi pedido" CTA when the order-tracking-widget app
   *  is installed + active for this tenant. Defaults to false so the
   *  footer stays neutral when the app is not present. */
  showTrackingLink?: boolean;
}) {
  const currentYear = new Date().getFullYear();
  const hasContact = config.contactInfo &&
    (config.contactInfo.email || config.contactInfo.phone || config.contactInfo.address);
  const hasSocial = config.socialLinks && config.socialLinks.length > 0;

  return (
    <footer
      data-section-type="footer"
      className="border-t border-[color:var(--hairline-strong)] bg-[var(--surface-1)]"
      aria-labelledby="footer-heading"
    >
      <h2 id="footer-heading" className="sr-only">
        Navegación secundaria
      </h2>

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pt-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-3">
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt={config.name}
                className="h-8 w-auto"
              />
            ) : (
              <span
                className="font-semibold text-[26px] leading-none tracking-[-0.03em] text-ink-0"
                style={{ color: config.primaryColor }}
              >
                {config.name}
              </span>
            )}
            <p className="mt-6 max-w-xs text-[14px] leading-[1.55] text-ink-5">
              {config.description}
            </p>

            {/* Social links — below brand description */}
            {hasSocial && (
              <div className="mt-5 flex items-center gap-3">
                {config.socialLinks!.map((link) => (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.label}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-2)] text-ink-4 transition-colors hover:bg-ink-9 hover:text-ink-0"
                  >
                    <SocialIcon platform={link.platform} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Navigation groups */}
          <div className="grid grid-cols-2 gap-8 lg:col-span-3 lg:grid-cols-2">
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

          {/* Contact info — from Comunicación admin */}
          {hasContact && (
            <div className="lg:col-span-3">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
                Contacto
              </h3>
              <ul role="list" className="mt-5 space-y-3">
                {config.contactInfo!.email && (
                  <li>
                    <a
                      href={`mailto:${config.contactInfo!.email}`}
                      className="flex items-center gap-2 text-[14px] text-ink-3 transition-colors hover:text-ink-0"
                    >
                      <MailIcon />
                      {config.contactInfo!.email}
                    </a>
                  </li>
                )}
                {config.contactInfo!.phone && (
                  <li>
                    <a
                      href={`tel:${config.contactInfo!.phone.replace(/\s/g, "")}`}
                      className="flex items-center gap-2 text-[14px] text-ink-3 transition-colors hover:text-ink-0"
                    >
                      <PhoneIcon />
                      {config.contactInfo!.phone}
                    </a>
                  </li>
                )}
                {config.contactInfo!.address && (
                  <li className="flex items-start gap-2 text-[14px] text-ink-3">
                    <MapPinIcon />
                    <span>{config.contactInfo!.address}</span>
                  </li>
                )}
                {config.contactInfo!.schedule && (
                  <li className="flex items-center gap-2 text-[14px] text-ink-3">
                    <ClockIcon />
                    {config.contactInfo!.schedule}
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Newsletter */}
          <div className={hasContact ? "lg:col-span-3" : "lg:col-span-6"}>
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
              {showTrackingLink && (
                <Link
                  href={storePath(config.slug, "tracking")}
                  className="text-[12px] text-ink-5 transition-colors hover:text-ink-0"
                >
                  Seguir mi pedido
                </Link>
              )}
            </div>

            <Link
              href={storePath(config.slug, "arrepentimiento")}
              className="group inline-flex h-10 items-center gap-2.5 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-4 text-[12px] font-medium text-ink-0 transition-colors hover:bg-ink-11"
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

// ─── Inline SVG icons (no extra dependency for footer) ──────────────────

function SocialIcon({ platform }: { platform: string }) {
  switch (platform) {
    case "whatsapp":
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      );
    case "instagram":
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      );
    case "facebook":
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    default:
      return null;
  }
}

function MailIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-ink-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-ink-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg className="mt-0.5 h-4 w-4 shrink-0 text-ink-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-ink-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

