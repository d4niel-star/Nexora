"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  Crown,
  FileText,
  Globe,
  LayoutGrid,
  MessageSquare,
  Plug,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";

// ─── Settings shell ──────────────────────────────────────────────────────
//
// Clicking "Configuración" in the global sidebar drops the merchant into
// this shell. The shell owns the internal information architecture of
// every platform-level setting: payments, legal, domains, communication,
// billing, payouts and integrations.
//
// Layout
//   · Main zone (left/center): the selected category's content — forms,
//     summaries and actions rendered by each /admin/settings/<slug>
//     page.tsx.
//   · Nav zone (right, sticky on desktop): category index with active
//     state, grouped by topic. On mobile the nav collapses above the
//     content so the merchant can still jump between categories.
//
// We deliberately do NOT expand this nav into the global sidebar — the
// global sidebar only gets merchants here; the shell is the settings
// center.

interface CategoryLink {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

interface CategoryGroup {
  title: string;
  items: readonly CategoryLink[];
}

// Every category listed here corresponds to a real page.tsx under
// /admin/settings/<slug>. If you want to add a new category, add the
// page FIRST and the link SECOND — never list a dead route.
const SETTINGS_CATEGORIES: readonly CategoryGroup[] = [
  {
    title: "Resumen",
    items: [
      {
        href: "/admin/settings",
        label: "General",
        icon: LayoutGrid,
        description: "Estado consolidado de todas las configuraciones",
      },
    ],
  },
  {
    title: "Pagos y checkout",
    items: [
      {
        href: "/admin/settings/pagos",
        label: "Medios de pago",
        icon: Wallet,
        description: "Mercado Pago OAuth y estado del checkout",
      },
    ],
  },
  {
    title: "Tienda y dominios",
    items: [
      {
        href: "/admin/settings/dominios",
        label: "Dominios",
        icon: Globe,
        description: "Subdominio, dominios propios y DNS",
      },
    ],
  },
  {
    title: "Legal y fiscal",
    items: [
      {
        href: "/admin/settings/legal",
        label: "Legal y ARCA",
        icon: FileText,
        description: "Perfil fiscal, facturación electrónica y políticas",
      },
    ],
  },
  {
    title: "Comunicación",
    items: [
      {
        href: "/admin/settings/comunicacion",
        label: "WhatsApp y mensajes",
        icon: MessageSquare,
        description: "Recuperación por WhatsApp y mensajes al cliente",
      },
    ],
  },
  {
    title: "Cuenta y plataforma",
    items: [
      {
        href: "/admin/settings/plan",
        label: "Plan y facturación",
        icon: Crown,
        description: "Suscripción, límites y compra de créditos IA",
      },
      {
        href: "/admin/settings/finanzas",
        label: "Finanzas y retiros",
        icon: CreditCard,
        description: "Cuentas bancarias y solicitudes de retiro",
      },
      {
        href: "/admin/settings/integraciones",
        label: "Integraciones",
        icon: Plug,
        description: "Proveedores externos, APIs y webhooks",
      },
    ],
  },
];

function isCategoryActive(href: string, pathname: string): boolean {
  if (href === "/admin/settings") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="animate-in fade-in duration-500">
      {/* Shell header — same AdminPageHeader rhythm as every admin hub */}
      <AdminPageHeader
        eyebrow="Configuración"
        title="Configuración"
        subtitle="Ajustes transversales de tu tienda y tu cuenta. Cada categoría agrupa settings reales del producto; los módulos operativos (ventas, catálogo, operaciones, growth) viven en su propia sección del menú."
      />

      {/* Mobile category picker — replaces the right nav on narrow screens.
          Uses a native <select> to stay accessible without extra chrome. */}
      <div className="mb-6 lg:hidden">
        <label htmlFor="settings-category-mobile" className="sr-only">
          Categoría de configuración
        </label>
        <select
          id="settings-category-mobile"
          value={
            SETTINGS_CATEGORIES.flatMap((g) => g.items).find((i) =>
              isCategoryActive(i.href, pathname),
            )?.href ?? "/admin/settings"
          }
          onChange={(event) => {
            // Server-safe client navigation via anchor fallback —
            // avoids hooking the router purely to mutate pathname.
            window.location.assign(event.target.value);
          }}
          className="h-11 w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3 text-[13px] font-medium text-ink-0 outline-none focus-visible:shadow-[var(--shadow-focus)]"
        >
          {SETTINGS_CATEGORIES.flatMap((group) =>
            group.items.map((item) => (
              <option key={item.href} value={item.href}>
                {group.title !== "Resumen" ? `${group.title} — ` : ""}{item.label}
              </option>
            )),
          )}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_260px]">
        {/* Main content zone. Each category page fills this column. */}
        <div className="min-w-0">{children}</div>

        {/* Right-hand category nav — desktop only. Sticky so it remains
            visible while the category content scrolls. */}
        <aside
          aria-label="Categorías de configuración"
          className="sticky top-20 hidden h-fit w-[260px] shrink-0 lg:block"
        >
          <nav className="flex flex-col gap-6 rounded-[var(--r-lg)] border border-[color:var(--card-border)] bg-[var(--surface-paper)] p-4">
            {SETTINGS_CATEGORIES.map((group) => (
              <div key={group.title} className="flex flex-col gap-2">
                <h2 className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-6">
                  {group.title}
                </h2>
                <ul className="flex flex-col gap-1">
                  {group.items.map((item) => {
                    const active = isCategoryActive(item.href, pathname);
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-2.5 rounded-full px-3 py-1.5 text-[13px] transition-colors outline-none focus-visible:shadow-[var(--shadow-focus)]",
                            active
                              ? "bg-[var(--brand)] font-medium text-white"
                              : "text-ink-3 hover:bg-[rgba(0,0,32,0.05)] hover:text-ink-0",
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              active ? "text-white" : "text-ink-6",
                            )}
                            strokeWidth={1.75}
                          />
                          <span className="flex-1 truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  );
}

export { SETTINGS_CATEGORIES };
export type { CategoryGroup, CategoryLink };
