"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown, Filter, AlertTriangle, Users } from "lucide-react";
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
          <h1 className="text-3xl font-black tracking-tight text-[#111111]">Clientes</h1>
          <p className="mt-1 text-[15px] font-medium text-[#666666]">Base agregada de clientes según órdenes abonadas en la plataforma.</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-sm">
        <div className="flex items-center gap-8 overflow-x-auto border-b border-[#EAEAEA] bg-[#FAFAFA]/50 px-6 no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              className={cn("group relative whitespace-nowrap py-4 text-[13px] font-bold transition-colors", activeTab === tab.value ? "text-[#111111]" : "text-[#888888] hover:text-[#111111]")}
              onClick={() => setActiveTab(tab.value)}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.18em]", activeTab === tab.value ? "bg-gray-200 text-[#111111]" : "bg-gray-100 text-gray-500 group-hover:bg-gray-200")}>{tab.count}</span>
              </span>
              {activeTab === tab.value ? <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-[#111111]" /> : null}
            </button>
          ))}
        </div>

        <div className="p-4 border-b border-[#EAEAEA] bg-white">
          <div className="relative w-full md:max-w-md group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-[13px] font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="min-h-[400px] bg-[#FAFAFA]/30 overflow-x-auto">
          {filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 border border-gray-100 shadow-sm">
                <Users className="h-8 w-8 text-gray-300" />
              </div>
              <h3 className="text-xl font-extrabold text-[#111111]">No hay clientes</h3>
              <p className="mt-2 text-[15px] font-medium text-[#888888]">No se encontraron clientes que coincidan con la búsqueda.</p>
            </div>
          ) : (
            <table className="w-full min-w-[1000px] text-left">
              <thead>
                <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]/70">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Cliente</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Canal Prominente</th>
                  <th className="px-6 py-4 text-[11px] text-right font-bold uppercase tracking-[0.18em] text-[#888888]">Pedidos</th>
                  <th className="px-6 py-4 text-[11px] text-right font-bold uppercase tracking-[0.18em] text-[#888888]">Ticket M.</th>
                  <th className="px-6 py-4 text-[11px] text-right font-bold uppercase tracking-[0.18em] text-[#888888]">LTV</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Segmento</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEAEA]/80">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/60 bg-white transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                         <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xs font-black uppercase text-[#111111]">
                           {getInitials(c.name)}
                         </div>
                         <div>
                           <p className="text-sm font-bold text-[#111111] leading-tight">{c.name}</p>
                           <p className="text-xs font-medium text-gray-500 mt-0.5">{c.email}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-medium text-gray-600">{c.channel}</td>
                    <td className="px-6 py-5 text-right font-bold tabular-nums">{c.ordersCount}</td>
                    <td className="px-6 py-5 text-right text-sm font-medium tabular-nums">{formatCurrency(c.averageTicket)}</td>
                    <td className="px-6 py-5 text-right text-[15px] font-black tracking-tight tabular-nums">{formatCurrency(c.totalSpent)}</td>
                    <td className="px-6 py-5"><CustomerBadge tone={c.segment} /></td>
                    <td className="px-6 py-5"><CustomerBadge tone={c.lifecycleStatus === "active" ? "active" : c.lifecycleStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {filteredCustomers.length > 0 && (
          <div className="px-6 py-4 border-t border-[#EAEAEA] bg-[#FAFAFA]/50 text-xs font-bold uppercase tracking-wider text-gray-400">
            Mostrando <span className="text-[#111111] px-0.5">{filteredCustomers.length}</span> clientes
          </div>
        )}
      </div>
    </div>
  );
}
