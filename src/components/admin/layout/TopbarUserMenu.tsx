"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Crown, LogOut, Settings, Activity } from "lucide-react";

// ─── Topbar User Menu ───
// Handler and logout action intact. Visual rewrite:
//  · trigger is a hairline chip (avatar + store name) instead of a bare avatar
//  · menu uses token surfaces + hairline dividers
//  · accents applied with discipline: ink-0 for the workspace row, accent-500
//    for the status dot, signal-danger for the destructive action only

interface TopbarUserMenuProps {
  storeName: string;
  storeInitials: string;
}

export function TopbarUserMenu({ storeName, storeInitials }: TopbarUserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const { logoutAction } = await import("@/app/home/auth-actions");
    await logoutAction();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Abrir menú de usuario"
        className="inline-flex h-9 items-center gap-2 rounded-full border border-[color:var(--hairline)] bg-[var(--surface-0)] pl-1 pr-3 text-[13px] font-medium text-ink-0 transition-colors hover:bg-ink-11 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink-0 text-[11px] font-semibold text-ink-12">
          {storeInitials}
        </span>
        <span className="hidden sm:inline">{storeName}</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 origin-top-right overflow-hidden rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-elevated)] z-50"
        >
          {/* Workspace */}
          <div className="border-b border-[color:var(--hairline)] px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
              Workspace activo
            </p>
            <p className="mt-0.5 truncate text-[14px] font-medium text-ink-0">
              {storeName}
            </p>
          </div>

          {/* Plan */}
          <div className="border-b border-[color:var(--hairline)] p-2">
            <Link
              href="/admin/billing"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between rounded-[var(--r-sm)] px-2.5 py-2 transition-colors hover:bg-ink-11"
              role="menuitem"
            >
              <div className="flex items-center gap-2.5">
                <Crown className="h-3.5 w-3.5 text-ink-4" strokeWidth={1.75} />
                <span className="text-[13px] font-medium text-ink-0">
                  Plan y créditos
                </span>
              </div>
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
                Ver
              </span>
            </Link>
          </div>

          {/* Actions */}
          <div className="p-2">
            <Link
              href="/admin/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-[var(--r-sm)] px-2.5 py-2 text-[13px] text-ink-3 transition-colors hover:bg-ink-11 hover:text-ink-0"
              role="menuitem"
            >
              <Settings className="h-4 w-4 text-ink-5" strokeWidth={1.75} />
              Configuración general
            </Link>
            <div className="flex items-center justify-between px-2.5 py-2">
              <div className="flex items-center gap-2.5">
                <Activity className="h-4 w-4 text-ink-5" strokeWidth={1.75} />
                <span className="text-[13px] text-ink-3">Estado del sistema</span>
              </div>
              <span
                aria-label="Operativo"
                className="inline-flex h-1.5 w-1.5 rounded-full bg-[var(--signal-success)]"
              />
            </div>
          </div>

          {/* Logout */}
          <div className="border-t border-[color:var(--hairline)] p-2">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-[var(--r-sm)] px-2.5 py-2 text-[13px] font-medium text-[color:var(--signal-danger)] transition-colors hover:bg-[var(--surface-2)]"
              role="menuitem"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
