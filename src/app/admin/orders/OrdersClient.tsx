"use client";

import { useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Filter, Package, X, ShoppingBag, CalendarDays, Zap, Truck, AlertTriangle } from "lucide-react";
import { Order } from "../../../types/order";
import { OrderStatusBadge, PaymentStatusBadge } from "../../../components/admin/orders/StatusBadge";
import { OrderDrawer } from "../../../components/admin/orders/OrderDrawer";
import { deriveOrderNextAction, orderNeedsAction, type OrderNextAction } from "@/lib/orders/workqueue";
import { bulkUpdateFulfillment } from "@/lib/store-engine/orders/bulk-actions";
import { EmptyState } from "@/components/ui/EmptyState";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";
import { AdminMetric } from "@/components/admin/primitives/AdminMetric";
import { AdminToolbar } from "@/components/admin/primitives/AdminToolbar";
import { AdminPillTabs, type AdminPillTab } from "@/components/admin/primitives/AdminPillTabs";

type TabValue = 'action' | 'all' | 'new' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

interface OrdersClientProps {
  orders: Order[];
  hideHeader?: boolean;
  initialTab?: TabValue;
}

export default function OrdersClient({ orders, hideHeader = false, initialTab = 'action' }: OrdersClientProps) {
  const urlParams = useSearchParams();

  const fromCustomer = urlParams?.get("customer") ?? "";
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [bulkPending, startBulkTransition] = useTransition();
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);

  // ── Cross-module navigation ────────────────────────────────────────────
  // When the merchant arrives from /admin/customers?customer=<email>,
  // seed the search field so the table immediately narrows to that
  // customer's orders. One-shot: subsequent typing must not be clobbered.
  const [activeTab, setActiveTab] = useState<TabValue>(fromCustomer ? "all" : initialTab);
  const [searchQuery, setSearchQuery] = useState(fromCustomer);

  // Compute the next-action map once per render so the table, the tab
  // count and the KPI all agree (single source of truth).
  const nextActions = useMemo(() => {
    const map = new Map<string, OrderNextAction | null>();
    for (const o of orders) map.set(o.id, deriveOrderNextAction(o));
    return map;
  }, [orders]);

  const actionCount = useMemo(
    () => orders.reduce((n, o) => n + (nextActions.get(o.id) ? 1 : 0), 0),
    [orders, nextActions],
  );

  const filteredOrders = orders.filter(order => {
    const matchesTab =
      activeTab === 'all'
        ? true
        : activeTab === 'action'
          ? orderNeedsAction(order)
          : order.status === activeTab;
    const matchesSearch = order.number.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          order.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          order.customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          order.items.some((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()));
    const orderDate = new Date(order.createdAt);
    const matchesDateFrom = !dateFrom || orderDate >= new Date(`${dateFrom}T00:00:00`);
    const matchesDateTo = !dateTo || orderDate <= new Date(`${dateTo}T23:59:59`);
    return matchesTab && matchesSearch && matchesDateFrom && matchesDateTo;
  });

  const realSales = orders.filter((order) => order.paymentStatus === "paid" && !["cancelled", "refunded"].includes(order.status));
  const pendingPayment = orders.filter((order) => order.paymentStatus === "pending" || order.paymentStatus === "in_process");
  const toPrepare = realSales.filter((order) => ["paid", "processing", "new"].includes(order.status) && order.shipping.shippingStatus !== "shipped" && order.shipping.shippingStatus !== "delivered");
  const realRevenue = realSales.reduce((acc, order) => acc + order.total, 0);

  const tabs: { label: string, value: TabValue, count?: number }[] = [
    { label: "Requiere acción", value: "action", count: actionCount },
    { label: "Todos", value: "all", count: orders.length },
    { label: "Nuevos", value: "new", count: orders.filter(o => o.status === 'new').length },
    { label: "Pagados", value: "paid", count: orders.filter(o => o.status === 'paid').length },
    { label: "Preparando", value: "processing", count: orders.filter(o => o.status === 'processing').length },
    { label: "Enviados", value: "shipped", count: orders.filter(o => o.status === 'shipped').length },
    { label: "Entregados", value: "delivered", count: orders.filter(o => o.status === 'delivered').length },
    { label: "Cancelados", value: "cancelled", count: orders.filter(o => o.status === 'cancelled').length },
    { label: "Reembolsados", value: "refunded", count: orders.filter(o => o.status === 'refunded').length },
  ];

  // ── Bulk action — mark preparing ───────────────────────────────────────
  // Real server call (no fake buttons). Only enabled when every selected
  // order is in a state where "preparing" is a valid forward transition:
  // paid/approved + shipping=unfulfilled. The backend also enforces this,
  // but filtering client-side avoids partial failures.
  const bulkPreparingEligibleIds = useMemo(() => {
    const set = new Set(selectedRows);
    return orders
      .filter((o) => set.has(o.id))
      .filter((o) => {
        const action = nextActions.get(o.id);
        return action?.kind === "mark_preparing";
      })
      .map((o) => o.id);
  }, [selectedRows, orders, nextActions]);

  const handleBulkMarkPreparing = () => {
    if (bulkPreparingEligibleIds.length === 0 || bulkPending) return;
    setBulkFeedback(null);
    startBulkTransition(async () => {
      try {
        const result = await bulkUpdateFulfillment(bulkPreparingEligibleIds, "preparing");
        const okCount = result.succeeded.length;
        const failCount = result.failed.length;
        setBulkFeedback(
          failCount === 0
            ? `${okCount} ${okCount === 1 ? "pedido pasó" : "pedidos pasaron"} a preparación.`
            : `${okCount} actualizadas · ${failCount} con error.`,
        );
        setSelectedRows([]);
      } catch (err) {
        setBulkFeedback(
          err instanceof Error ? err.message : "Error al actualizar los pedidos.",
        );
      }
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows(filteredOrders.map(o => o.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedRows(prev => [...prev, id]);
    } else {
      setSelectedRows(prev => prev.filter(r => r !== id));
    }
  };

  // Map legacy tabs to AdminPillTab shape.
  const pillTabs: AdminPillTab<TabValue>[] = tabs.map((t) => ({
    value: t.value,
    label: t.label,
    count: t.count ?? null,
    warning: t.value === "action" && (t.count ?? 0) > 0,
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-32">
      {/* 1. Page Header */}
      {!hideHeader && (
        <AdminPageHeader
          eyebrow="Pedidos"
          title="Pedidos"
          subtitle="Gestioná el motor logístico corporativo. Todo en un solo lugar."
        />
      )}

      {!hideHeader && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <AdminMetric
            label="Ventas reales"
            value={`$${realRevenue.toLocaleString("es-AR")}`}
            tone="accent"
            hint="Solo pagos confirmados por webhook."
          />
          <AdminMetric
            label="Pendientes de pago"
            value={String(pendingPayment.length)}
            tone={pendingPayment.length > 0 ? "warning" : "neutral"}
            hint="No cuentan como venta real."
            onClick={() => {
              setActiveTab("action");
              setSearchQuery("");
            }}
          />
          <AdminMetric
            label="Por preparar"
            value={String(toPrepare.length)}
            hint="Pagados sin despacho final."
            onClick={() => {
              setActiveTab("action");
              setSearchQuery("");
            }}
          />
        </div>
      )}

      {/* 2. Main Container — pill tabs + new toolbar + table */}
      <div className="admin-table-frame relative">
        <AdminPillTabs
          tabs={pillTabs}
          active={activeTab}
          onChange={(v) => setActiveTab(v)}
        />

        <AdminToolbar
          search={{
            value: searchQuery,
            onChange: setSearchQuery,
            placeholder: "Buscar pedido, cliente, tracking…",
          }}
          filters={
            <>
              <label className="flex h-8 items-center gap-1.5 rounded-full border border-[color:var(--hairline)] bg-[var(--surface-paper)] px-2.5 text-[11.5px] font-medium text-ink-5">
                <CalendarDays className="h-3 w-3" />
                <span className="hidden sm:inline">Desde</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-transparent text-[12px] font-semibold text-ink-0 outline-none"
                />
              </label>
              <label className="flex h-8 items-center gap-1.5 rounded-full border border-[color:var(--hairline)] bg-[var(--surface-paper)] px-2.5 text-[11.5px] font-medium text-ink-5">
                <span className="hidden sm:inline">Hasta</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-transparent text-[12px] font-semibold text-ink-0 outline-none"
                />
              </label>
            </>
          }
          actions={
            <button
              onClick={() => {
                setSearchQuery("");
                setDateFrom("");
                setDateTo("");
                setActiveTab("all");
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-paper)] px-3 text-[12px] font-medium text-ink-1 transition-colors hover:bg-[var(--surface-2)]"
            >
              <Filter className="h-3.5 w-3.5" /> Limpiar
            </button>
          }
        />

        {/* 3. Data Table */}
        <div className="overflow-x-auto min-h-[400px]">
          {orders.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="Sin pedidos aún"
              description="Cuando tus compradores paguen desde el storefront, los pedidos aparecerán acá en tiempo real con su estado de cobro y logística."
              action={{ label: "Ver storefront", href: "/admin/store" }}
              secondaryAction={{ label: "Cargar productos", href: "/admin/catalog" }}
            />
          ) : (
            <table className="admin-table whitespace-nowrap">
              <thead>
                <tr>
                  <th style={{ width: "3rem" }}>
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedRows.length === filteredOrders.length && filteredOrders.length > 0}
                      className="h-4 w-4 cursor-pointer accent-ink-0"
                    />
                  </th>
                  <th>Pedido</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Productos</th>
                  <th>Origen</th>
                  <th>Estado Cobro</th>
                  <th>Logística</th>
                  <th>Próxima acción</th>
                  <th style={{ textAlign: "right" }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-0">
                      <EmptyState
                        icon={Search}
                        title="Sin resultados para este filtro"
                        description="Ajustá los filtros o probá limpiar la búsqueda para volver a ver todo el catálogo de pedidos."
                        size="compact"
                        action={{
                          label: "Limpiar filtros",
                          onClick: () => {
                            setSearchQuery("");
                            setDateFrom("");
                            setDateTo("");
                            setActiveTab("all");
                          },
                        }}
                      />
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const isSelected = selectedRows.includes(order.id);
                    const nextAction = nextActions.get(order.id) ?? null;
                    return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className={`admin-table-row group cursor-pointer ${isSelected ? "admin-table-row--selected" : ""}`}
                    >
                      <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                         <input 
                           type="checkbox" 
                           checked={isSelected}
                           onChange={(e) => handleSelectRow(e, order.id)}
                           className="w-4 h-4 rounded border-[color:var(--hairline)] text-ink-0 cursor-pointer" 
                         />
                      </td>
                      <td className="px-6 py-5 font-bold text-ink-0 text-sm tabular-nums tracking-tight">{order.number}</td>
                      <td className="px-6 py-5 text-[13px] font-medium text-ink-6 tabular-nums">{new Date(order.createdAt).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-bold text-ink-0">{order.customer.name}</div>
                        <div className="text-xs font-medium text-ink-6 truncate max-w-[150px] mt-0.5">{order.customer.email}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-bold text-ink-0">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</div>
                        <div className="text-xs font-medium text-ink-6 truncate max-w-[180px] mt-0.5">
                          {order.items[0]?.title || "Sin items"}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {order.channel === 'Storefront' ? (
                           <div className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full border border-[color:var(--hairline)] bg-[var(--surface-1)] text-[10px] font-medium uppercase tracking-[0.14em] text-ink-3 w-fit">
                              <ShoppingBag className="w-3 h-3" strokeWidth={1.75} /> Tienda
                           </div>
                        ) : (
                           <span className="text-xs font-bold text-ink-6 bg-[var(--surface-2)] px-2 py-1 rounded-full uppercase tracking-wider">{order.channel}</span>
                        )}
                      </td>
                      <td className="px-6 py-5"><PaymentStatusBadge status={order.paymentStatus} /></td>
                      <td className="px-6 py-5"><OrderStatusBadge status={order.status} /></td>
                      <td className="px-6 py-5">
                        {nextAction ? (
                          <span
                            className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-[11px] font-semibold ${
                              nextAction.urgent
                                ? "bg-[color:var(--signal-danger)]/10 text-[color:var(--signal-danger)]"
                                : "bg-[var(--surface-2)] text-ink-0"
                            }`}
                          >
                            {nextAction.urgent ? (
                              <AlertTriangle className="w-3 h-3" strokeWidth={2} />
                            ) : nextAction.kind === "mark_shipped" || nextAction.kind === "add_tracking" ? (
                              <Truck className="w-3 h-3" strokeWidth={1.75} />
                            ) : (
                              <Zap className="w-3 h-3" strokeWidth={1.75} />
                            )}
                            {nextAction.label}
                          </span>
                        ) : (
                          <span className="text-[12px] font-medium text-ink-6">—</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right font-semibold text-ink-0 tabular-nums tracking-[-0.01em] text-[15px]">${order.total.toLocaleString('es-AR')}</td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination */}
        {filteredOrders.length > 0 && (
          <div className="px-6 py-4 border-t border-[color:var(--hairline)] bg-[var(--surface-1)]/90 flex items-center justify-between">
            <span className="text-xs text-ink-6 font-bold uppercase tracking-wider block">
              Mostrando <b className="text-ink-0 px-1">{filteredOrders.length}</b> de {orders.length}
            </span>
            <div className="flex gap-2">
              <button disabled className="btn-secondary px-4 py-2 text-[13px] font-bold opacity-50 cursor-not-allowed">Anterior</button>
              <button className="btn-secondary px-4 py-2 text-[13px] font-bold">Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bulk Actions Toolbar ──────────────────────────────────
       *
       * Previous iteration had three buttons (Preparar / Etiquetas /
       * Cancelar) with NO onClick. That read as automation that doesn't
       * exist. Replaced here with a single honest action — "Marcar
       * preparando" — that actually calls bulkUpdateFulfillment on the
       * server. Eligibility is computed from the same work-queue rules
       * the row chip uses; if nothing in the selection can transition
       * to preparing, the button is disabled with an explicit hint. */}
      {selectedRows.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-ink-0 text-ink-12 px-2 py-2 rounded-full shadow-[var(--shadow-overlay)] flex items-center gap-1 animate-in slide-in-from-bottom-5 fade-in duration-[var(--dur-base)] z-30">
           <div className="px-3 border-r border-ink-12/15">
             <span className="tabular text-[13px] font-medium">{selectedRows.length} seleccionados</span>
             {bulkPreparingEligibleIds.length !== selectedRows.length && (
               <span className="ml-2 text-[11px] text-ink-12/50">
                 {bulkPreparingEligibleIds.length} elegibles
               </span>
             )}
           </div>
           <div className="flex items-center gap-1 px-1">
             <button
               type="button"
               onClick={handleBulkMarkPreparing}
               disabled={bulkPending || bulkPreparingEligibleIds.length === 0}
               title={
                 bulkPreparingEligibleIds.length === 0
                   ? "Seleccioná pedidos pagados y sin despacho iniciado."
                   : `Marcar ${bulkPreparingEligibleIds.length} como preparando`
               }
               className="inline-flex items-center gap-2 px-3 h-9 text-[13px] font-medium hover:bg-ink-12/10 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
             >
               <Package className="w-4 h-4" strokeWidth={1.75} />
               {bulkPending ? "Actualizando…" : "Marcar preparando"}
             </button>
             {bulkFeedback && (
               <span className="ml-2 text-[11px] text-ink-12/75 px-2">{bulkFeedback}</span>
             )}
           </div>
           <button 
              onClick={() => setSelectedRows([])}
              className="p-2 mr-1 hover:bg-ink-12/10 rounded-full transition-colors shrink-0 text-ink-12/50 hover:text-ink-12"
           >
             <X className="w-4 h-4" />
           </button>
        </div>
      )}

      {/* Slide-in Drawer Component */}
      <OrderDrawer 
        order={selectedOrder} 
        isOpen={selectedOrder !== null} 
        onClose={() => setSelectedOrder(null)} 
      />

    </div>
  );
}
