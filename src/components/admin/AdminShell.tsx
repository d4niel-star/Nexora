"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ChevronRight,
  LayoutDashboard,
  LineChart,
  Megaphone,
  Menu,
  Sparkles,
  Package,
  PackageSearch,
  Puzzle,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
  TrendingUp,
  Truck,
  Users,
  Wrench,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { TopbarUserMenu } from "./layout/TopbarUserMenu";
import { NexoraLogo } from "./layout/NexoraLogo";
import { NexoraGlobalChat } from "./store-ai/NexoraGlobalChat";

// ─── Admin Shell v4 ──────────────────────────────────────────────────────
// Dark sidebar against a cool neutral canvas. Previous revisions shipped a
// flat list of 11 top-level items; this version introduces a real
// information architecture:
//
//   · Inicio            (single)  → /admin/dashboard
//   · Ventas            (group)   → pedidos, clientes, crecimiento
//   · Catálogo          (group)   → productos, inventario, abastecimiento
//   · Tienda            (group)   → tienda IA, mi tienda
//   · Operación         (single)  → /admin/operations
//   · Apps y herramientas (group) → apps, market
//   · Marketing         (group)   → ads
//   · Configuración     (leaf)    → /admin/settings                ← pinned
//
// Each group is collapsible, auto-expands when the current pathname lives
// inside it, and reuses the exact same row styling as a top-level item so
// there is zero visual noise between levels. Nothing mimics Tiendanube /
// Shopify — just honest information architecture.

type NavLeaf = {
  readonly kind: "leaf";
  readonly href: string;
  readonly label: string;
  readonly icon: LucideIcon;
};

type NavGroup = {
  readonly kind: "group";
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly items: readonly NavLeaf[];
  /**
   * Optional path prefix that also activates the group. Useful when the
   * group has a hub page (e.g. /admin/shipping) that isn't itself a
   * sidebar leaf — visiting the hub still highlights the parent group.
   */
  readonly basePath?: string;
};

type NavEntry = NavLeaf | NavGroup;

// Primary navigation. Every href here MUST resolve to a page under
// src/app/admin/* — no dead links, no placeholders.
const primaryNav: readonly NavEntry[] = [
  { kind: "leaf", href: "/admin/dashboard", label: "Panel de control", icon: LayoutDashboard },
  { kind: "leaf", href: "/admin/stats", label: "Estadísticas", icon: BarChart3 },
  {
    kind: "group",
    id: "sales",
    label: "Ventas",
    icon: ShoppingBag,
    items: [
      { kind: "leaf", href: "/admin/orders", label: "Pedidos", icon: ShoppingCart },
      { kind: "leaf", href: "/admin/customers", label: "Clientes", icon: Users },
      { kind: "leaf", href: "/admin/growth", label: "Crecimiento", icon: LineChart },
    ],
  },
  {
    kind: "group",
    id: "catalog",
    label: "Catálogo",
    icon: Package,
    items: [
      { kind: "leaf", href: "/admin/catalog", label: "Productos", icon: Tag },
      { kind: "leaf", href: "/admin/inventory", label: "Inventario", icon: Boxes },
      { kind: "leaf", href: "/admin/sourcing", label: "Abastecimiento", icon: Truck },
    ],
  },
  {
    kind: "group",
    id: "store",
    label: "Tienda",
    icon: Store,
    items: [
      { kind: "leaf", href: "/admin/store-ai", label: "Tienda IA", icon: Sparkles },
      { kind: "leaf", href: "/admin/store", label: "Mi tienda", icon: Store },
    ],
  },
  {
    kind: "group",
    id: "marketing",
    label: "Marketing",
    icon: Megaphone,
    items: [
      { kind: "leaf", href: "/admin/ads", label: "Ads", icon: Megaphone },
    ],
  },
  {
    kind: "group",
    id: "shipping",
    label: "Envíos",
    icon: Truck,
    basePath: "/admin/shipping",
    items: [
      { kind: "leaf", href: "/admin/shipping/correo-argentino", label: "Correo Argentino", icon: Truck },
      { kind: "leaf", href: "/admin/shipping/andreani", label: "Andreani", icon: Truck },
      { kind: "leaf", href: "/admin/shipping/settings", label: "Ajustes de envío", icon: Settings },
    ],
  },
  { kind: "leaf", href: "/admin/finances", label: "Finanzas", icon: TrendingUp },
  { kind: "leaf", href: "/admin/operations", label: "Operación", icon: PackageSearch },
  {
    kind: "group",
    id: "apps",
    label: "Apps y herramientas",
    icon: Puzzle,
    items: [
      { kind: "leaf", href: "/admin/apps", label: "Apps", icon: Puzzle },
      { kind: "leaf", href: "/admin/market", label: "Herramientas", icon: Wrench },
    ],
  },
];

// Bottom-pinned Configuración entry. Configuración is a SINGLE sidebar
// leaf on purpose: clicking it opens a dedicated settings surface
// (/admin/settings) that owns its own right-side category nav.
const settingsLeaf: NavLeaf = {
  kind: "leaf",
  href: "/admin/settings",
  label: "Configuración",
  icon: Settings,
};

// An entry is "active" when it owns the current pathname. For leaves:
//   · /admin/dashboard is an exact match only (otherwise every admin
//     page would highlight it).
//   · every other leaf matches by prefix so deep links stay selected.
function isLeafActive(leaf: NavLeaf, pathname: string): boolean {
  if (leaf.href === "/admin/dashboard") return pathname === leaf.href;
  return pathname === leaf.href || pathname.startsWith(`${leaf.href}/`);
}

function isGroupActive(group: NavGroup, pathname: string): boolean {
  if (group.items.some((leaf) => isLeafActive(leaf, pathname))) return true;
  if (group.basePath && (pathname === group.basePath || pathname.startsWith(`${group.basePath}/`))) {
    return true;
  }
  return false;
}

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

  // Groups whose child pathname is currently visited auto-expand on
  // mount and after every client navigation. Anything else stays
  // collapsed until the merchant clicks its header. We deliberately
  // don't persist collapse state across sessions — the auto-expand
  // rule already points at the relevant group on every page load.
  const initialExpanded = useMemo<Record<string, boolean>>(() => {
    const seed: Record<string, boolean> = {};
    for (const entry of primaryNav) {
      if (entry.kind === "group" && isGroupActive(entry, pathname)) {
        seed[entry.id] = true;
      }
    }
    return seed;
  }, [pathname]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(initialExpanded);

  // When pathname changes, adjust state during render (React-recommended
  // pattern instead of useEffect + setState). We auto-expand the group
  // that owns the new route and close the mobile sidebar.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setSidebarOpen(false);
    setExpanded((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const entry of primaryNav) {
        if (entry.kind === "group" && isGroupActive(entry, pathname) && !prev[entry.id]) {
          next[entry.id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }

  const toggleGroup = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

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

      {/* Primary navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Navegación principal">
        <ul className="flex flex-col gap-0.5">
          {primaryNav.map((entry) =>
            entry.kind === "leaf" ? (
              <SidebarLeaf
                key={entry.href}
                leaf={entry}
                pathname={pathname}
                onNavigate={closeSidebar}
              />
            ) : (
              <SidebarGroup
                key={entry.id}
                group={entry}
                pathname={pathname}
                expanded={Boolean(expanded[entry.id])}
                onToggle={toggleGroup}
                onNavigate={closeSidebar}
              />
            ),
          )}
        </ul>
      </nav>

      {/* ─── Pinned bottom area: Configuración ─── */}
      <div className="border-t border-[color:var(--sidebar-hairline)] px-3 py-3">
        <ul className="flex flex-col gap-0.5">
          <SidebarLeaf
            leaf={settingsLeaf}
            pathname={pathname}
            onNavigate={closeSidebar}
          />
        </ul>
      </div>
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
          {pathname.startsWith("/admin/store-ai/editor") ? (
            <div className="h-full">
              {children}
            </div>
          ) : pathname.startsWith("/admin/store-ai/themes") ? (
            <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-10 md:py-12">
              {children}
            </div>
          ) : (
            <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-10 md:py-12">
              {children}
            </div>
          )}
        </div>
      </main>

      {/* ── Nexora IA Global Chat ──────────────────────────────── */}
      {/* Visible on ALL admin pages EXCEPT the store editor, which has its own copilot. */}
      {!pathname.startsWith("/admin/store-ai/editor") && <NexoraGlobalChat />}
    </div>
  );
}

// ─── Sidebar row primitives ──────────────────────────────────────────────
//
// A leaf is a single link; a group is a button that toggles a nested list
// of leaves. Both share identical spacing, font-size and active/hover
// tokens so there is zero visual noise between levels. The only
// chrome-difference is the ChevronRight indicator on groups. Nested
// leaves use the exact same row, left-padded to show hierarchy.

interface SidebarLeafProps {
  leaf: NavLeaf;
  pathname: string;
  onNavigate: () => void;
  nested?: boolean;
}

function SidebarLeaf({ leaf, pathname, onNavigate, nested = false }: SidebarLeafProps) {
  const active = isLeafActive(leaf, pathname);
  const Icon = leaf.icon;
  return (
    <li className="relative">
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-r-full bg-[var(--accent-400)]"
          style={{ width: 2 }}
        />
      )}
      <Link
        href={leaf.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-2.5 rounded-[var(--r-sm)] py-2 text-[13px] transition-colors outline-none focus-visible:shadow-[var(--shadow-focus)]",
          nested ? "pl-9 pr-3" : "px-3",
          active
            ? "bg-[var(--sidebar-active-bg)] font-medium text-[var(--sidebar-fg-active)]"
            : "text-[var(--sidebar-fg)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-fg-active)]",
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            active ? "text-[var(--sidebar-fg-active)]" : "text-[var(--sidebar-fg)]",
          )}
          strokeWidth={1.75}
        />
        <span className="truncate">{leaf.label}</span>
      </Link>
    </li>
  );
}

interface SidebarGroupProps {
  group: NavGroup;
  pathname: string;
  expanded: boolean;
  onToggle: (id: string) => void;
  onNavigate: () => void;
}

function SidebarGroup({ group, pathname, expanded, onToggle, onNavigate }: SidebarGroupProps) {
  const active = isGroupActive(group, pathname);
  const Icon = group.icon;
  const panelId = `sidebar-group-${group.id}`;

  return (
    <li className="relative">
      {active && !expanded && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-r-full bg-[var(--accent-400)]"
          style={{ width: 2 }}
        />
      )}
      <button
        type="button"
        onClick={() => onToggle(group.id)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-[var(--r-sm)] px-3 py-2 text-[13px] transition-colors outline-none focus-visible:shadow-[var(--shadow-focus)]",
          active
            ? "font-medium text-[var(--sidebar-fg-active)]"
            : "text-[var(--sidebar-fg)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-fg-active)]",
          active && !expanded ? "bg-[var(--sidebar-active-bg)]" : "",
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            active ? "text-[var(--sidebar-fg-active)]" : "text-[var(--sidebar-fg)]",
          )}
          strokeWidth={1.75}
        />
        <span className="flex-1 truncate text-left">{group.label}</span>
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-[var(--dur-fast)]",
            expanded ? "rotate-90" : "rotate-0",
            active ? "text-[var(--sidebar-fg-active)]" : "text-[var(--sidebar-fg)]",
          )}
          strokeWidth={2}
        />
      </button>
      {expanded && (
        <ul id={panelId} className="mt-0.5 flex flex-col gap-0.5">
          {group.items.map((leaf) => (
            <SidebarLeaf
              key={leaf.href}
              leaf={leaf}
              pathname={pathname}
              onNavigate={onNavigate}
              nested
            />
          ))}
        </ul>
      )}
    </li>
  );
}

