"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, LayoutGrid, Search, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Mobile Bottom Navigation ────────────────────────────────────────────
// Sticky bottom nav for mobile storefront. Safe area aware.
// Cart badge shows real count. Account shows "Próximamente" honestly.

interface MobileBottomNavProps {
  storeSlug: string;
  cartCount: number;
  onSearchOpen: () => void;
}

export function MobileBottomNav({ storeSlug, cartCount, onSearchOpen }: MobileBottomNavProps) {
  const pathname = usePathname();

  const basePath = `/store/${storeSlug}`;

  const items = [
    { href: basePath, icon: Home, label: "Inicio", active: pathname === basePath || pathname === `${basePath}/` },
    { href: `${basePath}/collections`, icon: LayoutGrid, label: "Categorías", active: pathname.includes("/collections") },
    { href: "#search", icon: Search, label: "Buscar", active: false, isSearch: true },
    { href: `${basePath}/cart`, icon: ShoppingBag, label: "Carrito", active: pathname.includes("/cart"), badge: cartCount },
    { href: "#account", icon: User, label: "Cuenta", active: false, disabled: true },
  ] as const;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[color:var(--hairline)] bg-[var(--surface-0)]/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
      aria-label="Navegación móvil"
    >
      <div className="flex items-center justify-around px-2 pt-2">
        {items.map((item) => {
          const Icon = item.icon;

          if ("isSearch" in item && item.isSearch) {
            return (
              <button
                key="search"
                type="button"
                onClick={onSearchOpen}
                className="flex flex-1 flex-col items-center gap-0.5 py-1 text-ink-5 transition-colors hover:text-ink-0"
                aria-label="Buscar"
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          }

          if ("disabled" in item && item.disabled) {
            return (
              <span
                key={item.label}
                className="flex flex-1 flex-col items-center gap-0.5 py-1 text-ink-7 cursor-not-allowed"
                title="Próximamente"
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 py-1 transition-colors",
                item.active ? "text-ink-0" : "text-ink-5 hover:text-ink-0",
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5" strokeWidth={item.active ? 2 : 1.75} />
                {"badge" in item && typeof item.badge === "number" && item.badge > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink-0 px-1 text-[9px] font-bold text-ink-12">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
              {item.active && (
                <span className="absolute -top-0.5 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-ink-0" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
