"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShoppingBag, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { StoreConfig } from "@/types/storefront";
import { storePath } from "@/lib/store-engine/urls";

// ─── Store Header ───
// Editorial rewrite. No glassmorphism: a solid surface with a single hairline
// reads cleaner at any scroll position and plays better with tenant logos on
// dark backgrounds. Nav typography dropped from uppercase-widest to a sober
// sentence case with tight tracking.
export function StoreHeader({ config }: { config: StoreConfig }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[color:var(--hairline)] bg-[var(--surface-0)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Mobile menu trigger */}
        <div className="flex flex-1 items-center lg:hidden">
          <button
            type="button"
            className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-[var(--r-md)] text-ink-4 transition-colors hover:bg-ink-11 hover:text-ink-0"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Logo */}
        <Link
          href={storePath(config.slug)}
          className="flex shrink-0 items-center justify-center rounded-[var(--r-xs)] outline-none focus-visible:shadow-[var(--shadow-focus)] lg:flex-1 lg:justify-start"
        >
          {config.logoUrl ? (
            <img src={config.logoUrl} alt={config.name} className="h-7 w-auto" />
          ) : (
            <span
              className="font-semibold text-[22px] leading-none tracking-[-0.03em] text-ink-0"
              style={{ color: config.primaryColor }}
            >
              {config.name}
            </span>
          )}
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex lg:gap-x-8">
          {config.headerNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative text-[14px] font-medium tracking-[-0.005em] transition-colors rounded-[var(--r-xs)] outline-none focus-visible:shadow-[var(--shadow-focus)]",
                  isActive ? "text-ink-0" : "text-ink-5 hover:text-ink-0",
                )}
              >
                {item.label}
                {isActive && (
                  <span className="absolute -bottom-[22px] left-0 right-0 h-px bg-ink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex flex-1 items-center justify-end gap-x-1">
          <button
            type="button"
            className="hidden h-11 w-11 items-center justify-center rounded-[var(--r-md)] text-ink-4 transition-colors hover:bg-ink-11 hover:text-ink-0 sm:inline-flex"
            aria-label="Buscar"
          >
            <Search className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>

          <Link
            href={storePath(config.slug, "cart")}
            className="group inline-flex h-11 items-center gap-2 rounded-[var(--r-md)] px-3 text-ink-4 transition-colors hover:bg-ink-11 hover:text-ink-0 outline-none focus-visible:shadow-[var(--shadow-focus)]"
          >
            <span className="sr-only">Ver carrito</span>
            <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
            <span className="tabular text-[13px] font-medium text-ink-0">
              {config.cartItemCount || 0}
            </span>
          </Link>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-ink-0/40"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 flex w-full max-w-xs flex-col border-r border-[color:var(--hairline)] bg-[var(--surface-0)]">
            <div className="flex h-16 items-center justify-between border-b border-[color:var(--hairline)] px-5">
              <span className="font-semibold text-[20px] tracking-[-0.03em] text-ink-0">
                {config.name}
              </span>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--r-md)] text-ink-4 transition-colors hover:bg-ink-11 hover:text-ink-0"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Cerrar menu"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-4">
              <ul className="flex flex-col">
                {config.headerNavigation.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center rounded-[var(--r-md)] px-4 py-3 text-[15px] font-medium text-ink-0 transition-colors hover:bg-ink-11"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
