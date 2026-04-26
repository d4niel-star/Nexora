"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, Crown, LogOut } from "lucide-react";

// ─── Topbar User Menu ───
//
// Strict no-duplication contract:
//
//   · The trigger is an avatar-only chip. The active store name already
//     shows in the topbar ("Tienda activa · {name}") to the left of the
//     trigger, so it does not repeat here.
//
//   · The dropdown's identity row uses the user's email (signed-in
//     account) and never the store name — that lives in the topbar.
//
//   · The dropdown only carries actions that aren't already in the
//     sidebar. Today: "Plan y créditos" (no sidebar entry) + the
//     destructive "Cerrar sesión". "Configuración" is intentionally
//     not duplicated here because it's pinned at the bottom of the
//     sidebar (/admin/settings).

interface TopbarUserMenuProps {
  /** Active store name — used only for the trigger's aria-label. */
  storeName: string;
  storeInitials: string;
  /** Authenticated user's email; rendered as the dropdown identity row. */
  userEmail?: string | null;
}

export function TopbarUserMenu({
  storeName,
  storeInitials,
  userEmail,
}: TopbarUserMenuProps) {
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

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const handleLogout = async () => {
    const { logoutAction } = await import("@/app/home/auth-actions");
    await logoutAction();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Abrir menú de cuenta de ${storeName}`}
        className="inline-flex h-9 items-center gap-1 rounded-[var(--r-sm)] border border-[color:var(--chrome-border)] bg-[var(--chrome-hover)] pl-0.5 pr-1.5 text-[var(--chrome-fg)] transition-colors hover:bg-[color:var(--chrome-border)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus-on-dark)]"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--r-xs)] bg-[var(--accent-500)] text-[11px] font-semibold text-[var(--accent-ink)]">
          {storeInitials}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[var(--chrome-fg-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`}
          strokeWidth={1.75}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 origin-top-right overflow-hidden rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-elevated)] z-50"
        >
          {/* Identity row — user account, not the store. */}
          <div className="border-b border-[color:var(--hairline)] px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
              Sesión iniciada
            </p>
            <p
              className="mt-0.5 truncate text-[13px] font-medium text-ink-0"
              title={userEmail ?? undefined}
            >
              {userEmail ?? "Cuenta activa"}
            </p>
          </div>

          {/* Plan — kept here because it has no sidebar entry. */}
          <div className="p-2">
            <Link
              href="/admin/billing"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between rounded-[var(--r-sm)] px-2.5 py-2 transition-colors hover:bg-[var(--surface-2)]"
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

          {/* Logout — the only required action of this menu. */}
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
