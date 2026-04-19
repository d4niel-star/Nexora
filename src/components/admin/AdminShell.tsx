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
  Puzzle,
  ShoppingCart,
  Sparkles,
  Truck,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { TopbarUserMenu } from "./layout/TopbarUserMenu";
import { NexoraLogo } from "./layout/NexoraLogo";

// ─── Admin Shell  v3 ───
// Dark shell (sidebar + topbar) against a cool neutral canvas. Nexora IA
// stays pinned bottom-left — structure unchanged, tokens only.

const navigation = [
  { href: "/admin/dashboard", label: "Panel de control", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Pedidos", icon: ShoppingCart },
  { href: "/admin/catalog", label: "Catálogo", icon: Package },
  { href: "/admin/inventory", label: "Inventario", icon: Boxes },
  { href: "/admin/sourcing", label: "Abastecimiento", icon: Truck },
  { href: "/admin/operations", label: "Operaciones", icon: PackageSearch },
  { href: "/admin/apps", label: "Apps", icon: Puzzle },
];

interface AdminShellProps {
  children: React.ReactNode;
  storeName: string;
  storeInitials: string;
  dunningBanner?: React.ReactNode;
}

export function AdminShell({ children, storeName, storeInitials, dunningBanner }: AdminShellProps) {
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
      {/* Header — logo on dark */}
      <div className="flex h-14 items-center justify-between border-b border-[color:var(--sidebar-hairline)] px-5">
        <div className="flex items-center gap-2.5">
          <NexoraLogo className="h-[22px] w-[22px]" dark />
          <span className="font-semibold text-[17px] leading-none tracking-[-0.03em] text-[var(--sidebar-fg-active)]">
            nexora
          </span>
        </div>
        <button
          aria-label="Cerrar menú"
          type="button"
          onClick={closeSidebar}
          className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--r-sm)] text-[var(--sidebar-fg)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-fg-active)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus-on-dark)] md:hidden"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      {/* Navigation */}
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
                    className="absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-r-full bg-[var(--accent-400)]"
                    style={{ width: 2 }}
                  />
                )}
                <Link
                  href={item.href}
                  onClick={closeSidebar}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[var(--r-sm)] px-3 py-2 text-[13px] transition-colors outline-none focus-visible:shadow-[var(--shadow-focus)]",
                    isActive
                      ? "bg-[var(--sidebar-active-bg)] font-medium text-[var(--sidebar-fg-active)]"
                      : "text-[var(--sidebar-fg)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-fg-active)]",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      isActive ? "text-[var(--sidebar-fg-active)]" : "text-[var(--sidebar-fg)]",
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

      {/* ─── Nexora IA — módulo dedicado, bottom sidebar ─── */}
      <NexoraIAEntry pathname={pathname} onNavigate={closeSidebar} />
    </>
  );

  return (
    <div className="flex h-screen bg-[var(--surface-1)] font-sans text-ink-0">
      {/* Mobile sidebar overlay */}
      {sidebarOpen ? (
        <div
          aria-hidden
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-ink-0/50 md:hidden"
        />
      ) : null}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[var(--sidebar-bg)] transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)] md:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden w-60 flex-col bg-[var(--sidebar-bg)] md:flex">
        {sidebarContent}
      </aside>

      {/* Main column */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[color:var(--chrome-border)] bg-[var(--chrome-bg)] px-4 md:px-8">
          <div className="flex items-center gap-3">
            <button
              aria-label="Abrir menú"
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="-ml-1 inline-flex h-11 w-11 items-center justify-center rounded-[var(--r-sm)] text-[var(--chrome-fg-muted)] transition-colors hover:bg-[var(--chrome-hover)] hover:text-[var(--chrome-fg)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus-on-dark)] md:hidden"
            >
              <Menu className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--chrome-fg-muted)]">
              Tienda activa
            </span>
            <span className="hidden h-3 w-px bg-[color:var(--chrome-border)] sm:block" />
            <span className="hidden text-[13px] font-medium text-[var(--chrome-fg)] sm:block">
              {storeName}
            </span>
          </div>
          <TopbarUserMenu storeName={storeName} storeInitials={storeInitials} />
        </div>

        {/* Dunning banner — persistent, above content */}
        {dunningBanner}

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

// ─── Nexora IA — Sidebar bottom entry (dark context) ───

function NexoraIAEntry({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  const isActive = pathname.startsWith("/admin/ai");

  return (
    <div className="border-t border-[color:var(--sidebar-hairline)] px-3 py-3">
      <Link
        href="/admin/ai"
        onClick={onNavigate}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-[var(--r-sm)] px-3 py-2.5 text-[13px] transition-colors outline-none focus-visible:shadow-[var(--shadow-focus)]",
          isActive
            ? "bg-[var(--sidebar-active-bg)] font-medium text-[var(--sidebar-fg-active)]"
            : "text-[var(--sidebar-fg)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-fg-active)]",
        )}
      >
        {isActive && (
          <span
            aria-hidden
            className="absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-r-full bg-[var(--accent-400)]"
            style={{ width: 2 }}
          />
        )}
        <Sparkles
          className={cn(
            "h-4 w-4 shrink-0",
            isActive ? "text-[var(--sidebar-fg-active)]" : "text-[var(--sidebar-fg)] group-hover:text-[var(--sidebar-fg-active)]",
          )}
          strokeWidth={1.75}
        />
        <span className="flex-1">Nexora IA</span>
        <span
          className={cn(
            "inline-flex h-[18px] items-center rounded-[var(--r-xs)] px-1.5 text-[9px] font-semibold uppercase tracking-[0.08em]",
            isActive
              ? "bg-[var(--accent-500)] text-white"
              : "bg-[var(--sidebar-hover)] text-[var(--sidebar-fg)] group-hover:bg-[var(--accent-500)]/20 group-hover:text-[var(--accent-200)]",
          )}
        >
          AI
        </span>
      </Link>
    </div>
  );
}
