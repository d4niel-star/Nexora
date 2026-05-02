"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ChevronRight,
  Code2,
  LayoutDashboard,
  Mail,
  MapPin,
  Megaphone,
  Menu,
  Network,
  Recycle,
  Filter,
  Package,
  Puzzle,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  Target,
  TrendingUp,
  Truck,
  Users,
  Video,
  Wrench,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { TopbarUserMenu } from "./layout/TopbarUserMenu";
import { NexoraLogo } from "./layout/NexoraLogo";
import { NexoraGlobalChat } from "./store-ai/NexoraGlobalChat";
import type { AssistantMemoryScope } from "@/lib/assistants/memory/scope";

// ─── Admin Shell v4 ──────────────────────────────────────────────────────
// Dark sidebar against a cool neutral canvas. Previous revisions shipped a
// flat list of 11 top-level items; this version introduces a real
// information architecture:
//
//   · Inicio            (single)  → /admin/dashboard
//   · Ventas            (group)   → pedidos, clientes, crecimiento
//   · Catálogo          (group)   → productos, inventario, abastecimiento
//   · Tienda            (group)   → tienda IA, mi tienda
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
//
// IA notes:
//   · Estadísticas is a *family* (group) that owns analytic surfaces.
//     Rendimiento answers "¿cómo va la tienda?" with KPIs and evolución
//     de ventas. Conversión answers "¿dónde se cae el embudo?" using
//     the real cart → checkout → order → paid signals captured by the
//     storefront. The legacy /admin/diagnostics (readiness panel) and
//     /admin/finances surfaces still exist for compatibility but are
//     no longer in the sidebar — they were operational, not analytical.
//   · Ventas owns operational surfaces. "Crecimiento" (post-purchase
//     lifecycle hub) overlapped with Estadísticas; it was renamed and
//     refocused as Recuperación, which surfaces inactive customers,
//     pending/failed payments and reorder opportunities — i.e. revenue
//     to win back, not analytics to look at.
//   · Comunicación was a top-level leaf. It now lives as a tab inside
//     Mi tienda, between Resumen and Dominio, because contact info,
//     WhatsApp button, redes and emails automáticos are part of the
//     storefront's public surface, not a separate operational area.
//   · Truck is reserved for Envíos (parent). Carrier leaves use
//     destination-specific icons (Mail / MapPin) so the Envíos sub-tree
//     no longer renders three identical truck rows.
//   · "Abastecimiento" → "Proveedores": the module is, in practice, the
//     supplier connection / catalog import surface. "Proveedores" is the
//     word merchants actually use. Icon switches from Truck (collided
//     with Envíos) to Network (a graph of supplier connections).
const primaryNav: readonly NavEntry[] = [
  { kind: "leaf", href: "/admin/dashboard", label: "Panel de control", icon: LayoutDashboard },
  {
    kind: "group",
    id: "analytics",
    label: "Estadísticas",
    icon: BarChart3,
    items: [
      { kind: "leaf", href: "/admin/stats", label: "Rendimiento", icon: TrendingUp },
      { kind: "leaf", href: "/admin/conversion", label: "Conversión", icon: Filter },
    ],
  },
  {
    kind: "group",
    id: "sales",
    label: "Ventas",
    icon: ShoppingBag,
    items: [
      { kind: "leaf", href: "/admin/orders", label: "Pedidos", icon: ShoppingCart },
      { kind: "leaf", href: "/admin/customers", label: "Clientes", icon: Users },
      { kind: "leaf", href: "/admin/recovery", label: "Recuperación", icon: Recycle },
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
      { kind: "leaf", href: "/admin/sourcing", label: "Proveedores", icon: Network },
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
      // Local físico — Tienda > Local físico. New surface that lets the
      // merchant administer their physical retail store from Nexora:
      // perfil + horarios, retiro en tienda, stock local independiente
      // del online, ventas presenciales y caja diaria. MapPin is the
      // most direct iconography for "ubicación física".
      { kind: "leaf", href: "/admin/store/local", label: "Local físico", icon: MapPin },
    ],
  },
  // Marketing replaces the old generic "Ads" sub-leaf with one explicit
  // surface per advertising network (Meta, TikTok, Google) plus a
  // dedicated "Píxeles y tags" hub that owns all the technical, non-OAuth
  // configuration (Pixel IDs, Conversions API tokens, Google Tag, etc).
  // The legacy /admin/ads route still works as a permanent redirect to
  // the first provider so deep-linked dashboards / OAuth callbacks
  // continue to land somewhere meaningful.
  {
    kind: "group",
    id: "marketing",
    label: "Marketing",
    icon: Megaphone,
    basePath: "/admin/ads",
    items: [
      { kind: "leaf", href: "/admin/ads/meta", label: "Meta Ads", icon: Target },
      { kind: "leaf", href: "/admin/ads/tiktok", label: "TikTok Ads", icon: Video },
      { kind: "leaf", href: "/admin/ads/google", label: "Google Ads", icon: Search },
      { kind: "leaf", href: "/admin/ads/pixels", label: "Píxeles y tags", icon: Code2 },
    ],
  },
  {
    kind: "group",
    id: "shipping",
    label: "Envíos",
    icon: Truck,
    basePath: "/admin/shipping",
    items: [
      { kind: "leaf", href: "/admin/shipping/correo-argentino", label: "Correo Argentino", icon: Mail },
      { kind: "leaf", href: "/admin/shipping/andreani", label: "Andreani", icon: MapPin },
      { kind: "leaf", href: "/admin/shipping/settings", label: "Ajustes de envío", icon: Settings },
    ],
  },
  // Operación was removed as a sidebar entry. Its data (alerts on orders /
  // inventory / catalog / sourcing / AI) is already a strict subset of the
  // CommandCenter that lives at /admin/dashboard, so /admin/operations now
  // 307-redirects to the dashboard. No orphans, no dead links.
  {
    kind: "group",
    id: "apps",
    label: "Apps y herramientas",
    icon: Puzzle,
    items: [
      { kind: "leaf", href: "/admin/marketplace", label: "Marketplace", icon: Puzzle },
      { kind: "leaf", href: "/admin/market", label: "Herramientas", icon: Wrench },
    ],
  },
];

// Bottom-pinned Configuración entry. Configuración is a SINGLE sidebar
// leaf on purpose: clicking it opens the dedicated settings dashboard
// (/admin/settings), where the category cards are the only local index.
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
  /** Authenticated user's email — surfaced in the topbar dropdown so the
   *  account identity is visible without repeating the store name. */
  userEmail?: string | null;
  dunningBanner?: React.ReactNode;
  /** Enables cross-session assistant memory + trace telemetry for the global chat. */
  assistantMemoryScope?: AssistantMemoryScope;
}

export function AdminShell({
  children,
  storeName,
  storeInitials,
  userEmail,
  dunningBanner,
  assistantMemoryScope,
}: AdminShellProps) {
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
      {/* Header — logo on dark, slimmer */}
      <div className="flex h-12 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <NexoraLogo className="h-[18px] w-[18px]" dark />
          <span className="font-semibold text-[14.5px] leading-none tracking-[-0.02em] text-white">
            nexora
          </span>
        </div>
        <button
          aria-label="Cerrar menú"
          type="button"
          onClick={closeSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white/65 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus-on-dark)] md:hidden"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      {/* Primary navigation — denser, no separators */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-2" aria-label="Navegación principal">
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
      <div className="px-2.5 py-2">
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

  // ─── Nexora Studio v4 shell ──────────────────────────────────────────
  // Replaces the v3 "navy frame + floating paper". The chrome is now:
  //   • navy sidebar full-height, edge-to-edge on the left
  //   • light topbar (paper) with a single hairline border-bottom
  //   • paper canvas edge-to-edge, no rounded floating wrapper
  //   • 14px content padding instead of 24/32 so the workspace breathes
  //     without feeling cramped
  // The store-ai editor stays full-bleed because it owns its own canvas.
  return (
    <div className="flex h-screen bg-[var(--studio-canvas)] font-sans text-ink-0">
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
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[var(--studio-sidebar-bg)] transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)] md:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar — flat navy column, no rounded paper around it */}
      <aside className="hidden w-[228px] flex-col bg-[var(--studio-sidebar-bg)] md:flex">
        {sidebarContent}
      </aside>

      {/* Main column — paper canvas edge-to-edge */}
      <main className="flex flex-1 flex-col overflow-hidden bg-[var(--studio-canvas)]">
        {/* Topbar — paper bg, single hairline border-bottom (Shopify-clear) */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[color:var(--studio-line)] bg-[var(--studio-paper)] px-3 md:px-5">
          <div className="flex items-center gap-3">
            <button
              aria-label="Abrir menú"
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-4 transition-colors hover:bg-[var(--studio-row-hover)] hover:text-ink-0 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] md:hidden"
            >
              <Menu className="h-4 w-4" strokeWidth={1.75} />
            </button>
            {/* Store badge — single line, no eyebrow chrome */}
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[var(--brand)] text-[10px] font-semibold text-white">
                {storeInitials}
              </span>
              <span className="text-[12.5px] font-medium text-ink-1">
                {storeName}
              </span>
            </div>
          </div>
          <TopbarUserMenu
            storeName={storeName}
            storeInitials={storeInitials}
            userEmail={userEmail}
          />
        </div>

        {/* Dunning banner */}
        {dunningBanner}

        {/* Content area — edge-to-edge paper canvas, no floating wrapper */}
        {pathname.startsWith("/admin/store-ai/editor") ? (
          <div className="flex-1 overflow-auto">
            <div className="h-full">{children}</div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto bg-[var(--studio-canvas)]">
            <div className="mx-auto w-full max-w-[1280px] px-5 py-6 md:px-8 md:py-8">
              {children}
            </div>
          </div>
        )}
      </main>

      {/* ── Nexora IA Global Chat ──────────────────────────────── */}
      {/* Visible on ALL admin pages EXCEPT the store editor, which has its own copilot. */}
      {!pathname.startsWith("/admin/store-ai/editor") && (
        <NexoraGlobalChat memoryScope={assistantMemoryScope} />
      )}
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
    <li>
      <Link
        href={leaf.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-2 rounded-md py-1.5 text-[12.5px] transition-colors outline-none focus-visible:shadow-[var(--shadow-focus-on-dark)]",
          nested ? "pl-8 pr-2.5" : "px-2.5",
          active
            ? "bg-white/10 font-medium text-white"
            : "text-white/65 hover:bg-white/5 hover:text-white",
        )}
      >
        <Icon
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            active ? "text-white" : "text-white/55",
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
    <li>
      <button
        type="button"
        onClick={() => onToggle(group.id)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[12.5px] transition-colors outline-none focus-visible:shadow-[var(--shadow-focus-on-dark)]",
          active
            ? "font-medium text-white"
            : "text-white/65 hover:bg-white/5 hover:text-white",
        )}
      >
        <Icon
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            active ? "text-white" : "text-white/55",
          )}
          strokeWidth={1.75}
        />
        <span className="flex-1 truncate text-left">{group.label}</span>
        <ChevronRight
          className={cn(
            "h-3 w-3 shrink-0 transition-transform duration-[var(--dur-fast)]",
            expanded ? "rotate-90" : "rotate-0",
            active ? "text-white" : "text-white/40",
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
