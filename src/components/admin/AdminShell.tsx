"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  LayoutDashboard,
  Menu,
  Package,
  PackageSearch,
  ShoppingCart,
  Sparkles,
  Truck,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { TopbarUserMenu } from "./layout/TopbarUserMenu";
import { NexoraLogo } from "./layout/NexoraLogo";

// ─── Admin Shell ───
// Flat canvas with vertical hairline between sidebar and main — no rounded
// island (the prior "Vercel/Cal.com" tell). Active nav item is indicated by
// an ink-0 foreground + a 2px left accent bar, not a colored fill. Topbar
// uses a single hairline and the refactored TopbarUserMenu chip.

const navigation = [
  { href: "/admin/dashboard", label: "Panel de control", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Pedidos", icon: ShoppingCart },
  { href: "/admin/catalog", label: "Catálogo", icon: Package },
  { href: "/admin/inventory", label: "Inventario", icon: Boxes },
  { href: "/admin/sourcing", label: "Abastecimiento", icon: Truck },
  { href: "/admin/operations", label: "Operaciones", icon: PackageSearch },
  { href: "/admin/ai", label: "Nexora AI", icon: Sparkles },
];

interface AdminShellProps {
  children: React.ReactNode;
  storeName: string;
  storeInitials: string;
}

export function AdminShell({ children, storeName, storeInitials }: AdminShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    closeSidebar();
  }, [pathname, closeSidebar]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSidebar();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [sidebarOpen, closeSidebar]);

  const sidebarContent = (
    <>
      <div className="flex h-14 items-center justify-between border-b border-[color:var(--hairline)] px-5">
        <div className="flex items-center gap-2.5">
          <NexoraLogo className="h-[22px] w-[22px]" />
          <span className="font-display text-[18px] leading-none tracking-[-0.015em] text-ink-0">
            nexora
          </span>
        </div>
        <button
          aria-label="Cerrar menú"
          type="button"
          onClick={closeSidebar}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--r-sm)] text-ink-5 transition-colors hover:bg-ink-11 hover:text-ink-0 md:hidden"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-5">
        <ul className="flex flex-col gap-0.5">
          {navigation.map((item) => {
            const isActive =
              item.href === "/admin/dashboard"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <li key={item.href} className="relative">
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-r-full bg-[var(--accent-500)]"
                    style={{ width: 2 }}
                  />
                )}
                <Link
                  href={item.href}
                  onClick={closeSidebar}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[var(--r-sm)] px-3 py-2 text-[13px] transition-colors outline-none focus-visible:shadow-[var(--shadow-focus)]",
                    isActive
                      ? "font-medium text-ink-0"
                      : "text-ink-4 hover:bg-ink-11 hover:text-ink-0",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      isActive ? "text-ink-0" : "text-ink-5",
                    )}
                    strokeWidth={1.75}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );

  return (
    <div className="flex h-screen bg-[var(--surface-1)] font-sans text-ink-0">
      {/* Mobile sidebar overlay */}
      {sidebarOpen ? (
        <div
          aria-hidden
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-ink-0/40 md:hidden"
        />
      ) : null}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[color:var(--hairline)] bg-[var(--surface-0)] transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)] md:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden w-60 flex-col border-r border-[color:var(--hairline)] bg-[var(--surface-0)] md:flex">
        {sidebarContent}
      </aside>

      {/* Main column */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[color:var(--hairline)] bg-[var(--surface-0)] px-4 md:px-8">
          <div className="flex items-center gap-3">
            <button
              aria-label="Abrir menú"
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-[var(--r-sm)] text-ink-4 transition-colors hover:bg-ink-11 hover:text-ink-0 md:hidden"
            >
              <Menu className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
              Tienda activa
            </span>
            <span className="hidden h-3 w-px bg-[color:var(--hairline)] sm:block" />
            <span className="hidden text-[13px] font-medium text-ink-0 sm:block">
              {storeName}
            </span>
          </div>
          <TopbarUserMenu storeName={storeName} storeInitials={storeInitials} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-4 py-8 md:px-10 md:py-12">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
