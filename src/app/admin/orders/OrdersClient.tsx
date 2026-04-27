"use client";

import { useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Package, ShoppingBag, CalendarDays, Zap, Truck, AlertTriangle } from "lucide-react";
import { Order } from "../../../types/order";
import { OrderStatusBadge, PaymentStatusBadge } from "../../../components/admin/orders/StatusBadge";
import { OrderDrawer } from "../../../components/admin/orders/OrderDrawer";
import { deriveOrderNextAction, orderNeedsAction, type OrderNextAction } from "@/lib/orders/workqueue";
import { bulkUpdateFulfillment } from "@/lib/store-engine/orders/bulk-actions";
import {
  NexoraPageHeader,
  NexoraStatRow,
  NexoraTabs,
  NexoraTableShell,
  NexoraCmdBar,
  NexoraSearch,
  NexoraFilters,
  NexoraActions,
  NexoraBulkBar,
  NexoraEmpty,
} from "@/components/admin/nexora";

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

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-16">
      {/* Page header — compact inline */}
      {!hideHeader && (
        <NexoraPageHeader
          title="Pedidos"
          subtitle="Pedidos en tiempo real con estado de cobro y logística."
        />
      )}

      {/* Flat 3-up KPI band, hairline-divided */}
      {!hideHeader && (
        <NexoraStatRow
          stats={[
            {
              label: "Ventas reales (30d)",
              value: `$${realRevenue.toLocaleString("es-AR")}`,
              hint: "Solo pagos confirmados",
            },
            {
              label: "Pendientes de pago",
              value: String(pendingPayment.length),
              hint: "No cuentan como venta",
              onClick: () => {
                setActiveTab("action");
                setSearchQuery("");
              },
            },
            {
              label: "Por preparar",
              value: String(toPrepare.length),
              hint: "Pagados, sin despachar",
              onClick: () => {
                setActiveTab("action");
                setSearchQuery("");
              },
            },
          ]}
          cols={3}
        />
      )}

      {/* Status tabs — sober underline tabs */}
      <NexoraTabs
        tabs={tabs.map((t) => ({
          value: t.value,
          label: t.label,
          count: t.count,
        }))}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* DataBoard — cmd bar + bulk + table fused under one hairline frame */}
      <NexoraTableShell>
        <NexoraCmdBar>
          <NexoraSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar pedido, cliente, tracking…"
          />
          <NexoraFilters>
            <label className="nx-chip" style={{ paddingLeft: 8 }}>
              <CalendarDays className="h-3 w-3" />
              <span className="hidden sm:inline" style={{ opacity: 0.6 }}>Desde</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: "var(--ink-1)",
                  fontVariantNumeric: "tabular-nums",
                  width: 100,
                }}
              />
            </label>
            <label className="nx-chip" style={{ paddingLeft: 8 }}>
              <span className="hidden sm:inline" style={{ opacity: 0.6 }}>Hasta</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: "var(--ink-1)",
                  fontVariantNumeric: "tabular-nums",
                  width: 100,
                }}
              />
            </label>
            {(searchQuery || dateFrom || dateTo) ? (
              <button
                type="button"
                className="nx-action nx-action--ghost nx-action--sm"
                onClick={() => {
                  setSearchQuery("");
                  setDateFrom("");
                  setDateTo("");
                  setActiveTab("all");
                }}
              >
                Limpiar
              </button>
            ) : null}
          </NexoraFilters>
          <NexoraActions>
            <span className="nx-cmd-bar__count">
              {filteredOrders.length} de {orders.length}
            </span>
          </NexoraActions>
        </NexoraCmdBar>

        <NexoraBulkBar selected={selectedRows.length} onClear={() => setSelectedRows([])}>
          <button
            type="button"
            onClick={handleBulkMarkPreparing}
            disabled={bulkPending || bulkPreparingEligibleIds.length === 0}
            title={
              bulkPreparingEligibleIds.length === 0
                ? "Seleccioná pedidos pagados y sin despacho iniciado."
                : `Marcar ${bulkPreparingEligibleIds.length} como preparando`
            }
            className="nx-action nx-action--sm"
          >
            <Package className="h-3.5 w-3.5" strokeWidth={1.75} />
            {bulkPending ? "Actualizando…" : "Marcar preparando"}
          </button>
          {bulkFeedback ? (
            <span style={{ fontSize: 11, color: "var(--ink-5)", marginLeft: 8 }}>
              {bulkFeedback}
            </span>
          ) : null}
        </NexoraBulkBar>

        {/* Table */}
        <div className="overflow-x-auto">
          {orders.length === 0 ? (
            <NexoraEmpty
              title="Sin pedidos aún"
              body="Cuando tus compradores paguen desde el storefront, los pedidos aparecerán acá en tiempo real."
              actions={
                <a href="/admin/store" className="nx-action nx-action--sm">
                  Ver storefront
                </a>
              }
            />
          ) : (
            <table className="nx-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedRows.length === filteredOrders.length && filteredOrders.length > 0}
                      className="h-4 w-4 cursor-pointer accent-[var(--brand)]"
                    />
                  </th>
                  <th>Pedido</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Productos</th>
                  <th>Origen</th>
                  <th>Cobro</th>
                  <th>Logística</th>
                  <th>Próxima acción</th>
                  <th style={{ textAlign: "right" }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: 0 }}>
                      <NexoraEmpty
                        title="Sin resultados"
                        body="Ajustá los filtros o limpiá la búsqueda para ver todos los pedidos."
                        actions={
                          <button
                            type="button"
                            className="nx-action nx-action--sm"
                            onClick={() => {
                              setSearchQuery("");
                              setDateFrom("");
                              setDateTo("");
                              setActiveTab("all");
                            }}
                          >
                            Limpiar filtros
                          </button>
                        }
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
                      data-selected={isSelected ? "true" : undefined}
                      style={{ cursor: "pointer" }}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                         <input
                           type="checkbox"
                           checked={isSelected}
                           onChange={(e) => handleSelectRow(e, order.id)}
                           className="h-4 w-4 cursor-pointer accent-[var(--brand)]"
                         />
                      </td>
                      <td className="nx-cell-strong" style={{ fontVariantNumeric: "tabular-nums" }}>{order.number}</td>
                      <td className="nx-cell-meta" style={{ fontVariantNumeric: "tabular-nums" }}>{new Date(order.createdAt).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                      <td>
                        <div className="nx-cell-strong">{order.customer.name}</div>
                        <div className="nx-cell-meta truncate" style={{ maxWidth: 160 }}>{order.customer.email}</div>
                      </td>
                      <td>
                        <div className="nx-cell-strong">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</div>
                        <div className="nx-cell-meta truncate" style={{ maxWidth: 180 }}>
                          {order.items[0]?.title || "Sin items"}
                        </div>
                      </td>
                      <td>
                        {order.channel === 'Storefront' ? (
                           <span className="nx-chip" style={{ pointerEvents: "none", height: 22, fontSize: 11 }}>
                              <ShoppingBag className="w-3 h-3" strokeWidth={1.75} /> Tienda
                           </span>
                        ) : (
                           <span className="nx-cell-meta">{order.channel}</span>
                        )}
                      </td>
                      <td><PaymentStatusBadge status={order.paymentStatus} /></td>
                      <td><OrderStatusBadge status={order.status} /></td>
                      <td>
                        {nextAction ? (
                          <span
                            className={`inline-flex items-center gap-1.5 h-[22px] px-2 rounded-full text-[11px] font-medium ${
                              nextAction.urgent
                                ? "bg-[color:var(--signal-danger)]/10 text-[color:var(--signal-danger)]"
                                : "bg-[var(--studio-canvas)] text-ink-1"
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
                          <span className="nx-cell-meta">—</span>
                        )}
                      </td>
                      <td className="nx-cell-num nx-cell-strong">${order.total.toLocaleString('es-AR')}</td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          )}
        </div>
      </NexoraTableShell>

      {/* Slide-in Drawer Component */}
      <OrderDrawer 
        order={selectedOrder} 
        isOpen={selectedOrder !== null} 
        onClose={() => setSelectedOrder(null)} 
      />

    </div>
  );
}
