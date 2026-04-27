import Link from "next/link";
import { PublicWordmark } from "./PublicWordmark";

// ─── PublicFooter v3 ──────────────────────────────────────────────────────
// Replaces the previous single-row navy footer (logo + copyright on dark
// chrome) with a full 4-column light footer. Reads like a real SaaS
// product footer: nav columns + brand block + bottom copyright bar.

const COLS = [
  {
    title: "Producto",
    links: [
      { label: "Plataforma", href: "/home" },
      { label: "Planes", href: "/home/pricing" },
      { label: "Tienda IA", href: "/home" },
      { label: "Marketplace", href: "/home" },
    ],
  },
  {
    title: "Operación",
    links: [
      { label: "Catálogo", href: "/home#modulos" },
      { label: "Pedidos y envíos", href: "/home#modulos" },
      { label: "Pagos", href: "/home#modulos" },
      { label: "Estadísticas", href: "/home#modulos" },
    ],
  },
  {
    title: "Cuenta",
    links: [
      { label: "Iniciar sesión", href: "/home/login" },
      { label: "Crear cuenta", href: "/home/register" },
      { label: "Soporte", href: "mailto:soporte@nexora.io" },
    ],
  },
] as const;

export function PublicFooter() {
  return (
    <footer className="border-t border-[color:var(--hairline)] bg-[#f1ede5]">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          {/* Brand block */}
          <div className="col-span-2 md:col-span-1">
            <PublicWordmark />
            <p className="mt-4 max-w-xs text-[13px] leading-[1.6] text-ink-5">
              La plataforma de comercio para marcas argentinas. Catálogo, ventas,
              pagos, envíos y crecimiento, en un solo lugar.
            </p>
            <p className="mt-4 text-[12px] text-ink-6">
              Hecho en Argentina · soporte en español
            </p>
          </div>

          {/* Nav columns */}
          {COLS.map((col) => (
            <div key={col.title}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-6">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-[13px] text-ink-3 transition-colors hover:text-ink-0"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-[color:var(--hairline)] pt-6 sm:flex-row sm:items-center">
          <p className="text-[12px] text-ink-5">
            © {new Date().getFullYear()} Nexora. Todos los derechos reservados.
          </p>
          <p className="text-[12px] text-ink-5">
            Términos · Privacidad · Cookies
          </p>
        </div>
      </div>
    </footer>
  );
}
