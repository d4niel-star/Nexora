"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { CustomerBadge } from "./CustomerBadge";
import type { AggregatedCustomer } from "@/lib/customers/queries";
import {
  NexoraPageHeader,
  NexoraTabs,
  NexoraTableShell,
  NexoraCmdBar,
  NexoraSearch,
  NexoraActions,
  NexoraEmpty,
} from "@/components/admin/nexora";

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

  const isFiltered = Boolean(searchQuery) || activeTab !== "all";

  return (
    <div className="animate-in fade-in space-y-5 pb-16 duration-300">
      <NexoraPageHeader
        title="Clientes"
        subtitle="Base agregada de clientes según órdenes abonadas en la plataforma."
      />

      <NexoraTabs
        tabs={tabs.map((t) => ({ value: t.value, label: t.label, count: t.count }))}
        active={activeTab}
        onChange={setActiveTab}
      />

      <NexoraTableShell>
        <NexoraCmdBar>
          <NexoraSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar por nombre o email…"
          />
          <NexoraActions>
            <span className="nx-cmd-bar__count">
              {filteredCustomers.length} de {initialCustomers.length}
            </span>
          </NexoraActions>
        </NexoraCmdBar>

        <div className="overflow-x-auto">
          {filteredCustomers.length === 0 ? (
            <NexoraEmpty
              title={isFiltered ? "Sin resultados" : "Aún no hay clientes"}
              body={
                isFiltered
                  ? "Ajustá la búsqueda o cambiá de segmento para volver a ver toda la base."
                  : "La base se arma automáticamente con cada pedido pagado."
              }
              actions={
                isFiltered ? (
                  <button
                    type="button"
                    className="nx-action nx-action--sm"
                    onClick={() => {
                      setSearchQuery("");
                      setActiveTab("all");
                    }}
                  >
                    Limpiar filtros
                  </button>
                ) : (
                  <Link href="/admin/orders" className="nx-action nx-action--sm">
                    Ver pedidos
                  </Link>
                )
              }
            />
          ) : (
            <table className="nx-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Canal</th>
                  <th style={{ textAlign: "right" }}>Pedidos</th>
                  <th>Última compra</th>
                  <th style={{ textAlign: "right" }}>Ticket M.</th>
                  <th style={{ textAlign: "right" }}>Total gastado</th>
                  <th>Segmento</th>
                  <th>Estado</th>
                  <th style={{ width: "3rem" }}></th>
                </tr>
              </thead>
              {/* Rows are now a cross-module hyperlink. Clicking any cell
                  jumps to /admin/orders?customer=<email>, which
                  pre-seeds the search field in OrdersClient via its
                  URL param effect. No duplicate order table or CRM
                  inside customers — the existing orders surface is
                  the single source of truth for per-customer history. */}
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr
                    key={c.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.location.href = `/admin/orders?customer=${encodeURIComponent(c.email)}`;
                      }
                    }}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                         <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--studio-canvas)] text-[11px] font-semibold uppercase text-ink-1">
                           {getInitials(c.name)}
                         </div>
                         <div className="min-w-0">
                           <p className="nx-cell-strong">{c.name}</p>
                           <p className="nx-cell-meta truncate">{c.email}</p>
                         </div>
                      </div>
                    </td>
                    <td className="nx-cell-meta">{c.channel}</td>
                    <td className="nx-cell-num nx-cell-strong">{c.ordersCount}</td>
                    <td className="nx-cell-meta" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {dateFormatter.format(new Date(c.lastPurchaseAt))}
                    </td>
                    <td className="nx-cell-num nx-cell-meta">{formatCurrency(c.averageTicket)}</td>
                    <td className="nx-cell-num nx-cell-strong">{formatCurrency(c.totalSpent)}</td>
                    <td><CustomerBadge tone={c.segment} /></td>
                    <td><CustomerBadge tone={c.lifecycleStatus === "active" ? "active" : c.lifecycleStatus} /></td>
                    <td style={{ textAlign: "right" }}>
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
      </NexoraTableShell>
    </div>
  );
}
