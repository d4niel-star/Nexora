"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BellDot,
  ChevronDown,
  Copy,
  Crown,
  Download,
  Filter,
  History,
  MoreHorizontal,
  Search,
  Tag,
  Users,
  X,
} from "lucide-react";

import { CustomerDrawer } from "@/components/admin/customers/CustomerDrawer";
import {
  CustomerBadge,
  CustomerChannelBadge,
} from "@/components/admin/customers/CustomerBadge";
import { TableSkeleton } from "@/components/admin/orders/TableSkeleton";
import { MOCK_CUSTOMERS } from "@/lib/mocks/customers";
import { cn, formatCurrency } from "@/lib/utils";
import type { Customer, CustomerChannel, CustomerLifecycleStatus } from "@/types/customer";

type TabValue = "all" | "new" | "recurring" | "vip" | "inactive" | "risk";
type VisualScenario = "live" | "empty" | "error";
type StatusFilter = "all" | CustomerLifecycleStatus | "high_value";

interface ToastMessage {
  id: string;
  title: string;
  description: string;
}

interface ConfirmationState {
  customerIds: string[];
  title: string;
  description: string;
}

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const channelOptions: Array<"all" | CustomerChannel> = [
  "all",
  "Shopify",
  "Mercado Libre",
  "Tienda Nube",
  "Instagram",
  "Manual",
];

const statusOptions: StatusFilter[] = [
  "all",
  "active",
  "inactive",
  "risk",
  "high_value",
];

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | CustomerChannel>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [visualScenario, setVisualScenario] = useState<VisualScenario>("live");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [drawerFocusSection, setDrawerFocusSection] = useState<"history" | "notes" | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  const tabCounts = useMemo(
    () => ({
      all: customers.length,
      new: customers.filter((customer) => customer.segment === "new").length,
      recurring: customers.filter((customer) => customer.segment === "recurring").length,
      vip: customers.filter((customer) => customer.segment === "vip").length,
      inactive: customers.filter((customer) => customer.lifecycleStatus === "inactive").length,
      risk: customers.filter((customer) => customer.lifecycleStatus === "risk").length,
    }),
    [customers]
  );

  const filteredCustomers = useMemo(() => {
    if (visualScenario === "empty" || visualScenario === "error") {
      return [];
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesTab =
        activeTab === "all"
          ? true
          : activeTab === "inactive"
            ? customer.lifecycleStatus === "inactive"
            : activeTab === "risk"
              ? customer.lifecycleStatus === "risk"
              : customer.segment === activeTab;

      const matchesChannel =
        channelFilter === "all" ? true : customer.channel === channelFilter;

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "high_value"
            ? customer.isHighValue
            : customer.lifecycleStatus === statusFilter;

      const matchesSearch =
        normalizedQuery.length === 0
          ? true
          : [
              customer.name,
              customer.email,
              customer.phone ?? "",
              ...customer.tags,
              ...customer.orderHistory.map((order) => order.number),
            ]
              .join(" ")
              .toLowerCase()
              .includes(normalizedQuery);

      return matchesTab && matchesChannel && matchesStatus && matchesSearch;
    });
  }, [activeTab, channelFilter, customers, searchQuery, statusFilter, visualScenario]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsLoading(false);
    }, 720);

    return () => window.clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    if (!openActionMenuId) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!actionMenuRef.current?.contains(event.target as Node)) {
        setOpenActionMenuId(null);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [openActionMenuId]);

  const tabs: Array<{ label: string; value: TabValue; count: number }> = [
    { label: "Todos", value: "all", count: tabCounts.all },
    { label: "Nuevos", value: "new", count: tabCounts.new },
    { label: "Recurrentes", value: "recurring", count: tabCounts.recurring },
    { label: "VIP", value: "vip", count: tabCounts.vip },
    { label: "Inactivos", value: "inactive", count: tabCounts.inactive },
    { label: "Riesgo", value: "risk", count: tabCounts.risk },
  ];

  const visibleRowsCount = filteredCustomers.length;
  const allVisibleSelected =
    visibleRowsCount > 0 &&
    filteredCustomers.every((customer) => selectedRows.includes(customer.id));
  const hasNoResults =
    visualScenario === "live" &&
    !isLoading &&
    filteredCustomers.length === 0 &&
    (searchQuery.trim().length > 0 || channelFilter !== "all" || statusFilter !== "all");

  const triggerLoading = () => {
    setIsLoading(true);
    setOpenActionMenuId(null);
  };

  const clearSelection = () => setSelectedRows([]);

  const pushToast = (title: string, description: string) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    setToasts((current) => [...current, { id, title, description }]);

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  };

  const updateCustomers = (updater: (current: Customer[]) => Customer[]) => {
    setCustomers((current) => updater(current));
  };

  const handleTabChange = (value: TabValue) => {
    if (value === activeTab) {
      return;
    }

    setActiveTab(value);
    clearSelection();
    triggerLoading();
  };

  const handleScenarioChange = (value: VisualScenario) => {
    setVisualScenario(value);
    clearSelection();
    setSelectedCustomerId(null);
    triggerLoading();
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    clearSelection();
  };

  const handleChannelChange = (value: "all" | CustomerChannel) => {
    setChannelFilter(value);
    clearSelection();
  };

  const handleStatusChange = (value: StatusFilter) => {
    setStatusFilter(value);
    clearSelection();
  };

  const openDrawer = (customerId: string, section: "history" | "notes" | null = null) => {
    setSelectedCustomerId(customerId);
    setDrawerFocusSection(section);
    setOpenActionMenuId(null);
  };

  const closeDrawer = () => {
    setSelectedCustomerId(null);
    setDrawerFocusSection(null);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(filteredCustomers.map((customer) => customer.id));
      return;
    }

    clearSelection();
  };

  const handleSelectRow = (customerId: string, checked: boolean) => {
    setSelectedRows((current) =>
      checked ? [...current, customerId] : current.filter((id) => id !== customerId)
    );
  };

  const handleCopyEmail = async (customer: Customer) => {
    setOpenActionMenuId(null);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(customer.email);
        pushToast("Email copiado", `${customer.email} quedo listo para pegar.`);
        return;
      }
    } catch {
      // Ignore clipboard errors and fall back to the simulated toast.
    }

    pushToast("Email listo", `${customer.email} no pudo copiarse, pero ya quedo visible.`);
  };

  const handleExport = (targetIds?: string[]) => {
    const count =
      targetIds?.length ??
      (visualScenario === "live" ? filteredCustomers.length : customers.length);

    pushToast(
      "Exportacion simulada",
      `${count} cliente${count === 1 ? "" : "s"} preparados para CSV mock.`
    );
  };

  const handleAddTag = (customerId: string, tag: string) => {
    updateCustomers((current) =>
      current.map((customer) => {
        if (customer.id !== customerId || customer.tags.includes(tag)) {
          return customer;
        }

        return {
          ...customer,
          tags: [...customer.tags, tag],
          isHighValue: customer.isHighValue || tag === "Alto valor",
          pendingFollowUp: customer.pendingFollowUp || tag === "Seguimiento",
        };
      })
    );

    pushToast("Etiqueta agregada", `${tag} se aplico al cliente.`);
  };

  const handleAddNote = (customerId: string, note: string) => {
    updateCustomers((current) =>
      current.map((customer) => {
        if (customer.id !== customerId) {
          return customer;
        }

        return {
          ...customer,
          notes: [
            {
              id:
                typeof crypto !== "undefined" && "randomUUID" in crypto
                  ? crypto.randomUUID()
                  : `${Date.now()}-${Math.random()}`,
              body: note,
              createdAt: new Date().toISOString(),
              author: "Admin",
            },
            ...customer.notes,
          ],
        };
      })
    );

    pushToast("Nota guardada", "La nota interna se agrego en modo mock.");
  };

  const handleMarkFollowUp = (ids: string[]) => {
    setOpenActionMenuId(null);
    updateCustomers((current) =>
      current.map((customer) => {
        if (!ids.includes(customer.id)) {
          return customer;
        }

        return {
          ...customer,
          pendingFollowUp: true,
          tags: customer.tags.includes("Seguimiento")
            ? customer.tags
            : [...customer.tags, "Seguimiento"],
        };
      })
    );

    clearSelection();
    pushToast(
      "Seguimiento marcado",
      `${ids.length} cliente${ids.length === 1 ? "" : "s"} quedaron en seguimiento.`
    );
  };

  const handleApplyRecurringSegment = () => {
    setOpenActionMenuId(null);
    updateCustomers((current) =>
      current.map((customer) =>
        selectedRows.includes(customer.id) && customer.segment !== "vip"
          ? { ...customer, segment: "recurring" }
          : customer
      )
    );

    clearSelection();
    pushToast(
      "Segmento actualizado",
      `Se aplico el segmento Recurrente a ${selectedRows.length} clientes.`
    );
  };

  const requestVipConfirmation = (ids: string[]) => {
    setOpenActionMenuId(null);
    const candidateCount = customers.filter((customer) => ids.includes(customer.id)).length;
    setConfirmation({
      customerIds: ids,
      title: candidateCount === 1 ? "Marcar cliente como VIP" : "Marcar clientes como VIP",
      description:
        candidateCount === 1
          ? "Esta accion actualiza el segmento, mantiene el historial y agrega el badge de alto valor."
          : "Esta accion actualiza el segmento de los seleccionados y los deja listos para seguimiento premium.",
    });
  };

  const confirmVipUpdate = () => {
    if (!confirmation) {
      return;
    }

    updateCustomers((current) =>
      current.map((customer) => {
        if (!confirmation.customerIds.includes(customer.id)) {
          return customer;
        }

        return {
          ...customer,
          segment: "vip",
          lifecycleStatus: "active",
          isHighValue: true,
          tags: customer.tags.includes("Alto valor")
            ? customer.tags
            : [...customer.tags, "Alto valor"],
        };
      })
    );

    clearSelection();
    pushToast(
      "Segmento VIP aplicado",
      `${confirmation.customerIds.length} cliente${confirmation.customerIds.length === 1 ? "" : "s"} pasaron a cartera VIP.`
    );
    setConfirmation(null);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setChannelFilter("all");
    setStatusFilter("all");
    clearSelection();
  };

  return (
    <div className="animate-in fade-in space-y-8 pb-32 duration-700">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#111111]">Clientes</h1>
          <p className="mt-1 text-[15px] font-medium text-[#666666]">
            Gestiona recurrencia, valor y riesgo comercial sin salir del admin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-5 py-2.5 text-[13px] font-bold text-[#111111] shadow-sm transition-all hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
            onClick={() => handleExport()}
            type="button"
          >
            <Download className="h-4 w-4" />
            Exportar clientes
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-sm">
        <div
          aria-label="Segmentos de clientes"
          className="flex items-center gap-8 overflow-x-auto border-b border-[#EAEAEA] bg-[#FAFAFA]/50 px-6"
          role="tablist"
        >
          {tabs.map((tab) => (
            <button
              key={tab.value}
              aria-selected={activeTab === tab.value}
              className={cn(
                "group relative whitespace-nowrap py-4 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
                activeTab === tab.value
                  ? "text-[#111111]"
                  : "text-[#888888] hover:text-[#111111]"
              )}
              onClick={() => handleTabChange(tab.value)}
              role="tab"
              type="button"
            >
              <span className="flex items-center gap-2">
                {tab.label}
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.18em] transition-colors",
                    activeTab === tab.value
                      ? "bg-gray-200 text-[#111111]"
                      : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                  )}
                >
                  {tab.count}
                </span>
              </span>
              {activeTab === tab.value ? (
                <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-[#111111]" />
              ) : null}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4 border-b border-[#EAEAEA] bg-white p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center">
            <div className="group relative w-full lg:max-w-sm">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-emerald-500" />
              <input
                className="w-full rounded-xl border border-transparent bg-gray-50 py-2.5 pl-10 pr-4 text-[13px] font-medium text-[#111111] transition-all placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Buscar cliente, email o #pedido..."
                type="text"
                value={searchQuery}
              />
            </div>

            <ToolbarSelect
              icon={<Filter className="h-4 w-4" />}
              label="Canal"
              onChange={(value) => handleChannelChange(value as "all" | CustomerChannel)}
              options={channelOptions}
              value={channelFilter}
            />

            <ToolbarSelect
              icon={<ChevronDown className="h-4 w-4" />}
              label="Estado"
              onChange={(value) => handleStatusChange(value as StatusFilter)}
              options={statusOptions}
              value={statusFilter}
            />
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
            <ToolbarSelect
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Escenario"
              onChange={(value) => handleScenarioChange(value as VisualScenario)}
              options={["live", "empty", "error"]}
              value={visualScenario}
            />
          </div>
        </div>

        <div className="min-h-[420px] bg-[#FAFAFA]/30">
          {isLoading ? (
            <TableSkeleton />
          ) : visualScenario === "error" ? (
            <ErrorState onRetry={() => handleScenarioChange("live")} />
          ) : visualScenario === "empty" ? (
            <EmptyState onReset={() => handleScenarioChange("live")} />
          ) : hasNoResults ? (
            <NoResultsState onReset={resetFilters} />
          ) : filteredCustomers.length === 0 ? (
            <EmptyState onReset={() => handleScenarioChange("live")} />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1220px] w-full text-left">
                <thead>
                  <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]/70">
                    <th className="w-12 px-6 py-4">
                      <input
                        aria-label="Seleccionar todos los clientes visibles"
                        checked={allVisibleSelected}
                        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-[#111111] focus:ring-[#111111]"
                        onChange={(event) => handleSelectAll(event.target.checked)}
                        type="checkbox"
                      />
                    </th>
                    <TableHead label="Cliente" />
                    <TableHead label="Email" />
                    <TableHead label="Canal" />
                    <TableHead label="Pedidos" align="right" />
                    <TableHead label="Ticket promedio" align="right" />
                    <TableHead label="Total gastado" align="right" />
                    <TableHead label="Ultima compra" />
                    <TableHead label="Segmento" />
                    <TableHead label="Estado" />
                    <th className="w-14 px-6 py-4" />
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#EAEAEA]/80">
                  {filteredCustomers.map((customer) => {
                    const isSelected = selectedRows.includes(customer.id);
                    const isMenuOpen = openActionMenuId === customer.id;

                    return (
                      <tr
                        key={customer.id}
                        aria-selected={isSelected}
                        className={cn(
                          "group cursor-pointer transition-colors focus-within:bg-gray-50/80",
                          isSelected ? "bg-emerald-50/35" : "bg-white hover:bg-gray-50/60"
                        )}
                        onClick={() => openDrawer(customer.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openDrawer(customer.id);
                          }
                        }}
                        tabIndex={0}
                      >
                        <td
                          className="px-6 py-5"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <input
                            aria-label={`Seleccionar a ${customer.name}`}
                            checked={isSelected}
                            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-[#111111] focus:ring-[#111111]"
                            onChange={(event) =>
                              handleSelectRow(customer.id, event.target.checked)
                            }
                            type="checkbox"
                          />
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-xs font-black uppercase tracking-[0.2em] text-[#111111]">
                              {getInitials(customer.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-[#111111]">
                                {customer.name}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-2">
                                {customer.isHighValue ? <CustomerBadge tone="high_value" /> : null}
                                {customer.pendingFollowUp ? (
                                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                                    Seguimiento
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <p className="max-w-[220px] truncate text-[13px] font-medium text-gray-500">
                            {customer.email}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <CustomerChannelBadge channel={customer.channel} />
                        </td>

                        <td className="px-6 py-5 text-right text-sm font-bold tabular-nums text-[#111111]">
                          {customer.ordersCount}
                        </td>

                        <td className="px-6 py-5 text-right text-sm font-bold tabular-nums text-[#111111]">
                          {formatCurrency(customer.averageTicket)}
                        </td>

                        <td className="px-6 py-5 text-right text-[15px] font-black tracking-tight tabular-nums text-[#111111]">
                          {formatCurrency(customer.totalSpent)}
                        </td>

                        <td className="px-6 py-5 text-[13px] font-medium text-gray-500">
                          {dateFormatter.format(new Date(customer.lastPurchaseAt))}
                        </td>

                        <td className="px-6 py-5">
                          <CustomerBadge tone={customer.segment} />
                        </td>

                        <td className="px-6 py-5">
                          <CustomerBadge
                            tone={
                              customer.lifecycleStatus === "active"
                                ? "active"
                                : customer.lifecycleStatus
                            }
                          />
                        </td>

                        <td
                          className="relative px-6 py-5 text-right"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            aria-expanded={isMenuOpen}
                            aria-haspopup="menu"
                            className="rounded-lg border border-transparent p-2 text-gray-500 opacity-0 transition-all group-hover:opacity-100 hover:border-[#EAEAEA] hover:bg-white hover:text-[#111111] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                            onClick={() =>
                              setOpenActionMenuId((current) =>
                                current === customer.id ? null : customer.id
                              )
                            }
                            type="button"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {isMenuOpen ? (
                            <div
                              ref={actionMenuRef}
                              className="absolute right-6 top-14 z-10 w-52 rounded-xl border border-[#EAEAEA] bg-white p-2 shadow-xl"
                              role="menu"
                            >
                              <RowMenuButton
                                icon={<History className="h-4 w-4" />}
                                label="Ver historial"
                                onClick={() => openDrawer(customer.id, "history")}
                              />
                              <RowMenuButton
                                icon={<Tag className="h-4 w-4" />}
                                label="Agregar nota"
                                onClick={() => openDrawer(customer.id, "notes")}
                              />
                              <RowMenuButton
                                icon={<Crown className="h-4 w-4" />}
                                label="Marcar VIP"
                                onClick={() => requestVipConfirmation([customer.id])}
                              />
                              <RowMenuButton
                                icon={<BellDot className="h-4 w-4" />}
                                label="Marcar seguimiento"
                                onClick={() => handleMarkFollowUp([customer.id])}
                              />
                              <RowMenuButton
                                icon={<Copy className="h-4 w-4" />}
                                label="Copiar email"
                                onClick={() => handleCopyEmail(customer)}
                              />
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!isLoading && filteredCustomers.length > 0 && visualScenario === "live" ? (
          <div className="flex items-center justify-between border-t border-[#EAEAEA] bg-[#FAFAFA]/50 px-6 py-4">
            <span className="block text-xs font-bold uppercase tracking-[0.18em] text-[#888888]">
              Mostrando <b className="px-1 text-[#111111]">{filteredCustomers.length}</b> de{" "}
              {customers.length}
            </span>
            <div className="flex gap-2">
              <button
                className="cursor-not-allowed rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-[13px] font-bold text-gray-400 opacity-50"
                disabled
                type="button"
              >
                Anterior
              </button>
              <button
                className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-[13px] font-bold text-[#111111] shadow-sm transition-colors hover:bg-gray-50"
                type="button"
              >
                Siguiente
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {selectedRows.length > 0 ? (
        <div className="fixed bottom-10 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-[#111111] px-2 py-2 text-white shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="border-r border-gray-700 px-4">
            <span className="text-[13px] font-bold">{selectedRows.length} seleccionados</span>
          </div>

          <div className="flex items-center gap-1 px-2">
            <BulkActionButton
              icon={<Download className="h-4 w-4" />}
              label="Exportar"
              onClick={() => handleExport(selectedRows)}
            />
            <BulkActionButton
              icon={<Tag className="h-4 w-4 text-emerald-400" />}
              label="Segmentar"
              onClick={handleApplyRecurringSegment}
            />
            <BulkActionButton
              icon={<Crown className="h-4 w-4 text-amber-300" />}
              label="Marcar VIP"
              onClick={() => requestVipConfirmation(selectedRows)}
            />
            <BulkActionButton
              icon={<BellDot className="h-4 w-4" />}
              label="Seguimiento"
              onClick={() => handleMarkFollowUp(selectedRows)}
            />
          </div>

          <button
            aria-label="Limpiar seleccion"
            className="mr-1 rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            onClick={clearSelection}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <CustomerDrawer
        customer={selectedCustomer}
        focusSection={drawerFocusSection}
        isOpen={selectedCustomer !== null}
        onAddNote={handleAddNote}
        onAddTag={handleAddTag}
        onClose={closeDrawer}
        onCopyEmail={handleCopyEmail}
        onMarkFollowUp={(customerId) => handleMarkFollowUp([customerId])}
        onMarkVip={(customer) => requestVipConfirmation([customer.id])}
      />

      {confirmation ? (
        <ConfirmDialog
          description={confirmation.description}
          onCancel={() => setConfirmation(null)}
          onConfirm={confirmVipUpdate}
          title={confirmation.title}
        />
      ) : null}

      <ToastViewport
        onDismiss={(toastId) =>
          setToasts((current) => current.filter((toast) => toast.id !== toastId))
        }
        toasts={toasts}
      />
    </div>
  );
}

function ToolbarSelect({
  icon,
  label,
  onChange,
  options,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="flex min-w-[170px] items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-3 py-2.5 text-[13px] font-bold text-gray-600 shadow-sm">
      <span className="shrink-0 text-gray-400">{icon}</span>
      <span className="text-[#666666]">{label}</span>
      <select
        className="w-full bg-transparent text-right font-semibold text-[#111111] outline-none"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {selectLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function TableHead({
  label,
  align = "left",
}: {
  label: string;
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn(
        "px-6 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]",
        align === "right" ? "text-right" : "text-left"
      )}
    >
      {label}
    </th>
  );
}

function RowMenuButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
      onClick={onClick}
      role="menuitem"
      type="button"
    >
      <span className="text-gray-500">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function BulkActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-gray-100 bg-gray-50 shadow-sm">
        <Users className="h-8 w-8 text-gray-300" />
      </div>
      <h3 className="text-xl font-extrabold text-[#111111]">Todavia no hay clientes en esta vista</h3>
      <p className="mt-2 max-w-md text-[15px] font-medium text-[#888888]">
        Este estado vacio queda listo para cuando conectes backend o cargues tu primera base de clientes.
      </p>
      <button
        className="mt-6 rounded-xl border border-[#EAEAEA] bg-white px-6 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        onClick={onReset}
        type="button"
      >
        Volver a la muestra
      </button>
    </div>
  );
}

function NoResultsState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-gray-100 bg-gray-50 shadow-sm">
        <Search className="h-8 w-8 text-gray-300" />
      </div>
      <h3 className="text-xl font-extrabold text-[#111111]">No encontramos clientes para ese filtro</h3>
      <p className="mt-2 max-w-md text-[15px] font-medium text-[#888888]">
        Ajusta busqueda, canal o estado y vuelve a intentarlo.
      </p>
      <button
        className="mt-6 rounded-xl border border-[#EAEAEA] bg-white px-6 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        onClick={onReset}
        type="button"
      >
        Limpiar filtros
      </button>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-red-100 bg-red-50 shadow-sm">
        <AlertTriangle className="h-8 w-8 text-red-400" />
      </div>
      <h3 className="text-xl font-extrabold text-[#111111]">No pudimos cargar clientes</h3>
      <p className="mt-2 max-w-md text-[15px] font-medium text-[#888888]">
        Estado simulado para QA visual. El retry vuelve a la vista operativa sin tocar datos.
      </p>
      <button
        className="mt-6 rounded-xl bg-[#111111] px-6 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        onClick={onRetry}
        type="button"
      >
        Reintentar
      </button>
    </div>
  );
}

function ConfirmDialog({
  title,
  description,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onCancel]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-[#111111]/28 backdrop-blur-[2px]" onClick={onCancel} />
      <div
        aria-modal="true"
        className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        role="alertdialog"
      >
        <h3 className="text-lg font-extrabold text-[#111111]">{title}</h3>
        <p className="mt-2 text-sm font-medium leading-relaxed text-gray-500">{description}</p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2.5 text-sm font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="rounded-xl bg-[#111111] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
            onClick={onConfirm}
            type="button"
          >
            Confirmar
          </button>
        </div>
      </div>
    </>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (toastId: string) => void;
}) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="fixed right-6 top-6 z-[60] flex w-full max-w-sm flex-col gap-3"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-xl animate-in slide-in-from-right-5 fade-in duration-300"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#111111]">{toast.title}</p>
              <p className="mt-1 text-sm font-medium text-gray-500">{toast.description}</p>
            </div>
            <button
              aria-label="Cerrar notificacion"
              className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#111111]"
              onClick={() => onDismiss(toast.id)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0])
    .join("");
}

function selectLabel(value: string) {
  switch (value) {
    case "all":
      return "Todos";
    case "active":
      return "Activo";
    case "inactive":
      return "Inactivo";
    case "risk":
      return "Riesgo";
    case "high_value":
      return "Alto valor";
    case "live":
      return "Operativo";
    case "empty":
      return "Vacio";
    case "error":
      return "Error";
    default:
      return value;
  }
}
