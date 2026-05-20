"use client";

// ─── Command Palette — Ctrl+K ─────────────────────────────────────────────
// Real operational command palette. Fuzzy search across routes, orders,
// products, and admin actions. Keyboard-driven. No AI, no copilot.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Package,
  ShoppingBag,
  LayoutDashboard,
  Settings,
  Users,
  BarChart3,
  Truck,
  Palette,
  Tag,
  FileText,
  ArrowRight,
  Zap,
  Command,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Route definitions ────────────────────────────────────────────────────

interface CommandItem {
  id: string;
  label: string;
  keywords: string;
  group: "navigate" | "action" | "search";
  icon: typeof Search;
  href?: string;
  action?: () => void;
}

const STATIC_COMMANDS: CommandItem[] = [
  { id: "nav-dashboard", label: "Dashboard", keywords: "inicio home panel", group: "navigate", icon: LayoutDashboard, href: "/admin/dashboard" },
  { id: "nav-orders", label: "Pedidos", keywords: "ordenes orders pedido", group: "navigate", icon: Package, href: "/admin/orders" },
  { id: "nav-catalog", label: "Catálogo", keywords: "productos catalog products", group: "navigate", icon: ShoppingBag, href: "/admin/catalog" },
  { id: "nav-inventory", label: "Inventario", keywords: "stock inventory warehouse", group: "navigate", icon: Truck, href: "/admin/inventory" },
  { id: "nav-customers", label: "Clientes", keywords: "customers compradores users", group: "navigate", icon: Users, href: "/admin/customers" },
  { id: "nav-analytics", label: "Analytics", keywords: "metricas analytics estadisticas", group: "navigate", icon: BarChart3, href: "/admin/analytics" },
  { id: "nav-store", label: "Tienda / Storefront", keywords: "store storefront tienda", group: "navigate", icon: Palette, href: "/admin/store" },
  { id: "nav-store-ai", label: "Store Studio", keywords: "store studio ai editor", group: "navigate", icon: Palette, href: "/admin/store-ai" },
  { id: "nav-settings", label: "Configuración", keywords: "settings configuracion ajustes", group: "navigate", icon: Settings, href: "/admin/settings" },
  { id: "nav-billing", label: "Facturación / Plan", keywords: "billing plan facturacion suscripcion", group: "navigate", icon: FileText, href: "/admin/billing" },
  { id: "nav-automations", label: "Automatizaciones", keywords: "automations cron jobs tareas", group: "navigate", icon: Zap, href: "/admin/automations" },
  { id: "nav-apps", label: "Apps", keywords: "apps marketplace integraciones", group: "navigate", icon: Tag, href: "/admin/apps" },
  { id: "nav-intelligence", label: "Inteligencia Comercial", keywords: "intelligence revenue inventory insights", group: "navigate", icon: BarChart3, href: "/admin/intelligence" },
  { id: "nav-recovery", label: "Recuperación", keywords: "recovery abandonados carritos", group: "navigate", icon: Zap, href: "/admin/recovery" },
  { id: "nav-shipping", label: "Envíos", keywords: "shipping envios carrier", group: "navigate", icon: Truck, href: "/admin/shipping/settings" },
  { id: "nav-branding", label: "Branding", keywords: "branding marca logo colores", group: "navigate", icon: Palette, href: "/admin/store-ai/branding" },
  { id: "act-new-product", label: "Crear producto", keywords: "nuevo producto agregar add product", group: "action", icon: ShoppingBag, href: "/admin/catalog?action=new" },
  { id: "act-export-orders", label: "Exportar pedidos CSV", keywords: "export csv orders pedidos descargar", group: "action", icon: FileText, href: "/admin/orders" },
  { id: "act-visual-editor", label: "Visual Editor PRO", keywords: "editor visual pro diseño", group: "action", icon: Palette, href: "/admin/store-ai/visual-editor" },
  { id: "act-low-stock", label: "Ver stock bajo", keywords: "low stock bajo critico alerta", group: "action", icon: Package, href: "/admin/inventory?filter=low" },
  { id: "act-pending-orders", label: "Pedidos pendientes", keywords: "pending orders sin despachar nuevos", group: "action", icon: Package, href: "/admin/orders?status=new" },
];

const GROUP_LABELS: Record<string, string> = {
  navigate: "Navegar",
  action: "Acciones",
  search: "Buscar",
};

function fuzzyMatch(text: string, query: string): boolean {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  // Simple contains + token match
  if (lower.includes(q)) return true;
  const tokens = q.split(/\s+/);
  return tokens.every((t) => lower.includes(t));
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // ── Keyboard shortcut: Ctrl+K ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // ── Filter commands ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!query.trim()) return STATIC_COMMANDS;
    return STATIC_COMMANDS.filter(
      (cmd) => fuzzyMatch(cmd.label + " " + cmd.keywords, query),
    );
  }, [query]);

  // ── Group results ──────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    for (const item of filtered) {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    }
    return groups;
  }, [filtered]);

  const flatList = useMemo(() => filtered, [filtered]);

  // ── Execute command ────────────────────────────────────────────────
  const execute = useCallback(
    (cmd: CommandItem) => {
      setOpen(false);
      if (cmd.action) {
        cmd.action();
      } else if (cmd.href) {
        router.push(cmd.href);
      }
    },
    [router],
  );

  // ── Keyboard navigation ───────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, flatList.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && flatList[activeIndex]) {
      e.preventDefault();
      execute(flatList[activeIndex]);
    }
  };

  // ── Scroll active item into view ──────────────────────────────────
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-cmd-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9999] bg-ink-0/30 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
        aria-hidden
      />

      {/* Palette */}
      <div className="fixed left-1/2 top-[15%] z-[10000] w-[520px] max-w-[92vw] -translate-x-1/2 rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-overlay)] overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-2.5 border-b border-[color:var(--hairline)] px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-ink-5" strokeWidth={1.75} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar acción, ruta, pedido..."
            className="flex-1 bg-transparent text-[13px] text-ink-0 placeholder:text-ink-6 outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-1.5 py-0.5 text-[10px] font-medium text-ink-5">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto py-1.5">
          {flatList.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12px] text-ink-5">
              Sin resultados para &ldquo;{query}&rdquo;
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-5">
                  {GROUP_LABELS[group] ?? group}
                </p>
                {items.map((cmd) => {
                  const idx = flatList.indexOf(cmd);
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      data-cmd-idx={idx}
                      onClick={() => execute(cmd)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors",
                        idx === activeIndex
                          ? "bg-[var(--surface-2)] text-ink-0"
                          : "text-ink-3 hover:bg-[var(--surface-1)]",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                      <span className="flex-1 text-[12px] font-medium">{cmd.label}</span>
                      <ArrowRight className="h-3 w-3 shrink-0 text-ink-6" strokeWidth={1.75} />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-[color:var(--hairline)] px-4 py-2 text-[10px] text-ink-5">
          <span className="flex items-center gap-1">
            <Command className="h-3 w-3" strokeWidth={1.75} />
            <span>↑↓ navegar · Enter ejecutar</span>
          </span>
          <span>Ctrl+K para abrir/cerrar</span>
        </div>
      </div>
    </>
  );
}
