"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronDown, Filter, AlertTriangle, Users, ExternalLink } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { CustomerBadge } from "./CustomerBadge";
import type { AggregatedCustomer } from "@/lib/customers/queries";

type TabValue = "all" | "new" | "recurring" | "vip" | "inactive" | "risk";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function CustomersClient({ initialCustomers }: { initialCustomers: AggregatedCustomer[] }) {
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const tabCounts = useMemo(() => ({
    all: initialCustomers.length,
    new: initialCustomers.filter((c) => c.segment === "new").length,
    recurring: initialCustomers.filter((c) => c.segment === "recurring").length,
    vip: initialCustomers.filter((c) => c.segment === "vip").length,
    inactive: initialCustomers.filter((c) => c.lifecycleStatus === "inactive").length,
    risk: initialCustomers.filter((c) => c.lifecycleStatus === "risk").length,
  }), [initialCustomers]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return initialCustomers.filter((c) => {
      const matchesTab =
        activeTab === "all" ? true
        : activeTab === "inactive" ? c.lifecycleStatus === "inactive"
        : activeTab === "risk" ? c.lifecycleStatus === "risk"
        : c.segment === activeTab;
      
      const matchesSearch = !q || c.email.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
      
      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchQuery, initialCustomers]);

  const tabs: Array<{ label: string; value: TabValue; count: number }> = [
    { label: "Todos", value: "all", count: tabCounts.all },
    { label: "Nuevos", value: "new", count: tabCounts.new },
    { label: "Recurrentes", value: "recurring", count: tabCounts.recurring },
    { label: "VIP", value: "vip", count: tabCounts.vip },
    { label: "Inactivos", value: "inactive", count: tabCounts.inactive },
    { label: "Riesgo", value: "risk", count: tabCounts.risk },
  ];

  function getInitials(name: string) {
    return name.substring(0, 2).toUpperCase() || "--";
  }

  return (
    <div className="animate-in fade-in space-y-8 pb-32 duration-700">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-[var(--tracking-display)] text-ink-0">Clientes</h1>
          <p className="mt-1 text-[15px] font-medium text-ink-4">Base agregada de clientes según órdenes abonadas en la plataforma.</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-8 overflow-x-auto border-b border-[color:var(--hairline)] bg-[var(--surface-1)] px-6 no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              className={cn("group relative whitespace-nowrap py-4 text-[13px] font-semibold transition-colors", activeTab === tab.value ? "text-ink-0" : "text-ink-5 hover:text-ink-0")}
              onClick={() => setActiveTab(tab.value)}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                <span className={cn("rounded-[var(--r-xs)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]", activeTab === tab.value ? "bg-[var(--surface-3)] text-ink-0" : "bg-[var(--surface-2)] text-ink-5 group-hover:bg-[var(--surface-3)]")}>{tab.count}</span>
              </span>
              {activeTab === tab.value ? <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-ink-0" /> : null}
            </button>
          ))}
        </div>

        <div className="p-4 border-b border-[color:var(--hairline)] bg-[var(--surface-0)]">
          <div className="relative w-full md:max-w-md group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-6 group-focus-within:text-accent-500 transition-colors" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface-1)] border border-[color:var(--hairline)] rounded-[var(--r-sm)] text-[13px] font-medium focus:outline-none focus:bg-[var(--surface-0)] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)] text-ink-0 placeholder:text-ink-6 transition-[box-shadow,border-color]"
            />
          </div>
        </div>

        <div className="min-h-[400px] bg-[var(--surface-0)] overflow-x-auto">
          {filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[var(--r-sm)] bg-[var(--surface-1)] border border-[color:var(--hairline)]">
                <Users className="h-8 w-8 text-ink-8" />
              </div>
              <h3 className="text-xl font-bold text-ink-0">No hay clientes</h3>
              <p className="mt-2 text-[15px] font-medium text-ink-5">No se encontraron clientes que coincidan con la búsqueda.</p>
            </div>
          ) : (
            <table className="w-full min-w-[1000px] text-left">
              <thead>
                <tr className="border-b border-[color:var(--hairline)] bg-[var(--surface-1)]">
                  <th className="px-6 py-4 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-5">Cliente</th>
                  <th className="px-6 py-4 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-5">Canal Prominente</th>
                  <th className="px-6 py-4 text-[11px] text-right font-medium uppercase tracking-[0.18em] text-ink-5">Pedidos</th>
                  <th className="px-6 py-4 text-[11px] text-right font-medium uppercase tracking-[0.18em] text-ink-5">Ticket M.</th>
                  <th className="px-6 py-4 text-[11px] text-right font-medium uppercase tracking-[0.18em] text-ink-5">LTV</th>
                  <th className="px-6 py-4 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-5">Segmento</th>
                  <th className="px-6 py-4 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-5">Estado</th>
                  <th className="px-6 py-4 w-12"></th>
                </tr>
              </thead>
              {/* Rows are now a cross-module hyperlink. Clicking any cell
                  jumps to /admin/orders?customer=<email>, which
                  pre-seeds the search field in OrdersClient via its
                  URL param effect. No duplicate order table or CRM
                  inside customers — the existing orders surface is
                  the single source of truth for per-customer history. */}
              <tbody className="divide-y divide-[color:var(--hairline)]">
                {filteredCustomers.map((c) => (
                  <tr
                    key={c.id}
                    className="group bg-[var(--surface-0)] transition-colors hover:bg-[var(--surface-1)] cursor-pointer"
                    onClick={() => {
                      // Programmatic navigation to keep <tr> semantics
                      // (nested <a> inside tbody rows is invalid HTML).
                      if (typeof window !== "undefined") {
                        window.location.href = `/admin/orders?customer=${encodeURIComponent(c.email)}`;
                      }
                    }}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                         <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-[var(--surface-2)] text-xs font-semibold uppercase text-ink-0">
                           {getInitials(c.name)}
                         </div>
                         <div>
                           <p className="text-sm font-semibold text-ink-0 leading-tight">{c.name}</p>
                           <p className="text-xs font-medium text-ink-5 mt-0.5">{c.email}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-medium text-ink-4">{c.channel}</td>
                    <td className="px-6 py-5 text-right font-semibold tabular-nums text-ink-0">{c.ordersCount}</td>
                    <td className="px-6 py-5 text-right text-sm font-medium tabular-nums text-ink-4">{formatCurrency(c.averageTicket)}</td>
                    <td className="px-6 py-5 text-right text-[15px] font-semibold tracking-tight tabular-nums text-ink-0">{formatCurrency(c.totalSpent)}</td>
                    <td className="px-6 py-5"><CustomerBadge tone={c.segment} /></td>
                    <td className="px-6 py-5"><CustomerBadge tone={c.lifecycleStatus === "active" ? "active" : c.lifecycleStatus} /></td>
                    <td className="px-6 py-5 text-right">
                      <Link
                        href={`/admin/orders?customer=${encodeURIComponent(c.email)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-5 opacity-0 transition-opacity group-hover:opacity-100 hover:text-ink-0"
                        title={`Ver pedidos de ${c.name}`}
                      >
                        Pedidos
                        <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {filteredCustomers.length > 0 && (
          <div className="px-6 py-4 border-t border-[color:var(--hairline)] bg-[var(--surface-1)] text-xs font-medium uppercase tracking-wider text-ink-5">
            Mostrando <span className="text-ink-0 px-0.5">{filteredCustomers.length}</span> clientes
          </div>
        )}
      </div>
    </div>
  );
}
