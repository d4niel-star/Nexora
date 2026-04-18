"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShoppingBag, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { StoreConfig } from "@/types/storefront";
import { storePath } from "@/lib/store-engine/urls";

export function StoreHeader({ config }: { config: StoreConfig }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Mobile menu trigger */}
        <div className="flex flex-1 items-center lg:hidden">
          <button 
            type="button" 
            className="p-2 -ml-2 text-gray-500 hover:text-gray-900"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Logo */}
        <Link href={storePath(config.slug)} className="flex shrink-0 items-center justify-center lg:flex-1 lg:justify-start outline-none focus-visible:ring-2 focus-visible:ring-black rounded-sm">
          {config.logoUrl ? (
            <img src={config.logoUrl} alt={config.name} className="h-8 w-auto" />
          ) : (
            <span className="text-xl font-extrabold tracking-tight text-gray-900 uppercase" style={{ color: config.primaryColor }}>
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
                   "text-[13px] uppercase tracking-widest font-bold transition-colors outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-black",
                   isActive ? "text-gray-900" : "text-gray-500 hover:text-gray-900"
                 )}
               >
                 {item.label}
               </Link>
             );
          })}
        </nav>

        {/* Actions */}
        <div className="flex flex-1 items-center justify-end gap-x-4">
          <button type="button" className="p-2 text-gray-500 hover:text-gray-900 hidden sm:block outline-none focus-visible:ring-2 rounded-sm focus-visible:ring-black" aria-label="Buscar">
            <Search className="h-5 w-5" />
          </button>
          
          <Link href={storePath(config.slug, "cart")} className="group flex items-center p-2 text-gray-500 hover:text-gray-900 outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-black">
            <span className="sr-only">Ver carrito</span>
            <ShoppingBag className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="ml-2 text-xs font-bold text-gray-900 group-hover:text-gray-800">{config.cartItemCount || 0}</span>
          </Link>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
          <div className="fixed inset-y-0 left-0 w-full max-w-xs bg-white px-6 py-6 border-r border-gray-100 shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-lg font-extrabold tracking-tight text-gray-900 uppercase">{config.name}</span>
              <button type="button" className="-m-2 p-2 text-gray-500" onClick={() => setMobileMenuOpen(false)} aria-label="Cerrar menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-8">
              <div className="space-y-6">
                {config.headerNavigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="-m-2 block p-2 text-base font-bold text-gray-900"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
