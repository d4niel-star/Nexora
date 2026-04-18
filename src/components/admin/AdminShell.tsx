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

const navigation = [
  { href: "/admin/dashboard", label: "Panel de Control", icon: LayoutDashboard },
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

  // Close sidebar on route change
  useEffect(() => {
    closeSidebar();
  }, [pathname, closeSidebar]);

  // Close sidebar on Escape
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
      <div className="flex h-16 items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <NexoraLogo />
          <span className="text-xl font-extrabold tracking-tighter text-[#111111]">
            Nexora
          </span>
        </div>
        <button
          aria-label="Cerrar menu"
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#111111] md:hidden"
          onClick={closeSidebar}
          type="button"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-6">
        {navigation.map((item) => {
          const isActive =
            item.href === "/admin/dashboard"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
                isActive
                  ? "bg-emerald-50/50 font-semibold text-emerald-600"
                  : "text-gray-500 hover:bg-gray-50 hover:text-[#111111]"
              )}
              href={item.href}
              onClick={closeSidebar}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

    </>
  );

  return (
    <div className="flex h-screen bg-[#FAFAFA] font-sans">
      {/* Mobile sidebar overlay */}
      {sidebarOpen ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-[#111111]/28 backdrop-blur-[2px] md:hidden"
          onClick={closeSidebar}
        />
      ) : null}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#EAEAEA] bg-white transition-transform duration-300 ease-in-out md:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-col border-r border-[#EAEAEA] bg-white md:flex">
        {sidebarContent}
      </aside>

      <main className="flex-1 overflow-auto bg-[#FAFAFA] md:m-2 md:rounded-2xl md:border md:border-[#EAEAEA] shadow-sm shadow-[#111111]/5">
        <div className="flex h-16 items-center justify-between border-b border-[#EAEAEA] bg-white px-4 md:px-8">
          <div className="flex items-center gap-3">
            <button
              aria-label="Abrir menu"
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-[#111111] md:hidden"
              onClick={() => setSidebarOpen(true)}
              type="button"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-sm font-medium text-gray-400">
              Tienda activa:{" "}
              <span className="font-bold text-[#111111]">{storeName}</span>
            </h2>
          </div>
          <TopbarUserMenu storeName={storeName} storeInitials={storeInitials} />
        </div>

        <div className="mx-auto max-w-6xl p-4 md:p-10">{children}</div>
      </main>
    </div>
  );
}
