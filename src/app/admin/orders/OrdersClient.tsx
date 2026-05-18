"use client";

import { useMemo, useState, useTransition, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Package, ShoppingBag, CalendarDays, Zap, Truck, AlertTriangle, ChevronLeft, ChevronRight, Download, CheckCircle2, XCircle, Copy, ExternalLink } from "lucide-react";
import { Order } from "../../../types/order";
import { OrderStatusBadge, PaymentStatusBadge } from "../../../components/admin/orders/StatusBadge";
import { OrderDrawer } from "../../../components/admin/orders/OrderDrawer";
import { deriveOrderNextAction, orderNeedsAction, type OrderNextAction } from "@/lib/orders/workqueue";
import { bulkUpdateFulfillment } from "@/lib/store-engine/orders/bulk-actions";
import { exportOrdersCsv } from "@/lib/store-engine/orders/export-csv";
import { cancelOrder } from "@/lib/store-engine/orders/actions";
import type { PaginationMeta } from "@/lib/pagination";
import type { OrderStatusCounts } from "@/lib/store-engine/orders/queries";
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

type TabValue = "all" | "new" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

interface OrdersClientProps {
  orders: Order[];
  pagination: PaginationMeta;
  counts: OrderStatusCounts;
  hideHeader?: boolean;
  /**
   * Resolved server-side from `isRealFiscalIntegrationEnabled()` and
   * forwarded to <OrderDrawer>. Defaults to `false` so any caller that
   * forgets to pass it falls into the safe "no fiscal CTA" branch.
   * Today only `/admin/orders` and `/admin/ai/operations` mount this
   * client; both pass the flag explicitly.
   */
  fiscalReal?: boolean;
}

export default function OrdersClient({
  orders,
  pagination,
  counts,
  hideHeader = false,
  fiscalReal = false,
}: OrdersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const urlParams = useSearchParams();

  // Read current URL state
  const currentTab = (urlParams?.get("status") ?? "all") as TabValue;
  const currentQuery = urlParams?.get("q") ?? "";
  const currentDateFrom = urlParams?.get("dateFrom") ?? "";
  const currentDateTo = urlParams?.get("dateTo") ?? "";

  // Local state for inputs (synced to URL on submit/change)
  const [searchInput, setSearchInput] = useState(currentQuery);
  const [dateFrom, setDateFrom] = useState(currentDateFrom);
  const [dateTo, setDateTo] = useState(currentDateTo);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [bulkPending, startBulkTransition] = useTransition();
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);
  const [bulkCancelConfirm, setBulkCancelConfirm] = useState(false);

  // ── URL navigation helper ────────────────────────────────────────────
  const pushParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const sp = new URLSearchParams(urlParams?.toString() ?? "");
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "" || value === "all" && key === "status") {
          sp.delete(key);
        } else {
          sp.set(key, value);
        }
      }
      // Reset to page 1 when filters change (except when explicitly setting page)
      if (!("page" in updates)) {
        sp.delete("page");
      }
      const qs = sp.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    },
    [router, pathname, urlParams],
  );

  // ── Next-action map (for current page only) ──────────────────────────
  const nextActions = useMemo(() => {
    const map = new Map<string, OrderNextAction | null>();
    for (const o of orders) map.set(o.id, deriveOrderNextAction(o));
    return map;
  }, [orders]);

  // ── Tab handling ─────────────────────────────────────────────────────
  const handleTabChange = (tab: string) => {
    setSelectedRows([]);
    pushParams({ status: tab === "all" ? undefined : tab });
  };

  // ── Search ───────────────────────────────────────────────────────────
  const handleSearchSubmit = () => {
    pushParams({ q: searchInput || undefined });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearchSubmit();
  };

  // ── Date filters ─────────────────────────────────────────────────────
  const handleDateFromChange = (v: string) => {
    setDateFrom(v);
    pushParams({ dateFrom: v || undefined });
  };

  const handleDateToChange = (v: string) => {
    setDateTo(v);
    pushParams({ dateTo: v || undefined });
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setDateFrom("");
    setDateTo("");
    pushParams({ q: undefined, dateFrom: undefined, dateTo: undefined, status: undefined, page: undefined });
  };

  // ── Pagination ───────────────────────────────────────────────────────
  const goToPage = (p: number) => {
    pushParams({ page: p > 1 ? String(p) : undefined });
  };

  // ── Bulk actions ─────────────────────────────────────────────────────
  const selectedSet = useMemo(() => new Set(selectedRows), [selectedRows]);
  const selectedOrders = useMemo(() => orders.filter((o) => selectedSet.has(o.id)), [orders, selectedSet]);

  const bulkEligible = useMemo(() => {
    const preparing = selectedOrders.filter((o) => o.shipping?.shippingStatus === "unfulfilled" && o.paymentStatus === "paid").map((o) => o.id);
    const shipped = selectedOrders.filter((o) => o.shipping?.shippingStatus === "preparing").map((o) => o.id);
    const delivered = selectedOrders.filter((o) => o.shipping?.shippingStatus === "shipped").map((o) => o.id);
    const cancellable = selectedOrders.filter((o) => o.status !== "cancelled" && o.status !== "refunded" && o.shipping?.shippingStatus !== "delivered").map((o) => o.id);
    return { preparing, shipped, delivered, cancellable };
  }, [selectedOrders]);

  const runBulkFulfillment = (status: "preparing" | "shipped" | "delivered", ids: string[], label: string) => {
    if (ids.length === 0 || bulkPending) return;
    setBulkFeedback(null);
    startBulkTransition(async () => {
      try {
        const result = await bulkUpdateFulfillment(ids, status);
        const ok = result.succeeded.length;
        const fail = result.failed.length;
        setBulkFeedback(fail === 0 ? `${ok} pedido${ok !== 1 ? "s" : ""} → ${label}.` : `${ok} OK · ${fail} con error.`);
        setSelectedRows([]);
        router.refresh();
      } catch (err) {
        setBulkFeedback(err instanceof Error ? err.message : "Error al actualizar.");
      }
    });
  };

  const handleBulkCancel = () => {
    if (bulkEligible.cancellable.length === 0 || bulkPending) return;
    if (!bulkCancelConfirm) { setBulkCancelConfirm(true); setTimeout(() => setBulkCancelConfirm(false), 5000); return; }
    setBulkFeedback(null);
    startBulkTransition(async () => {
      try {
        const results = await Promise.allSettled(
          bulkEligible.cancellable.map((id) => cancelOrder(id, "Cancelación masiva", false)),
        );
        const ok = results.filter((r) => r.status === "fulfilled").length;
        const fail = results.length - ok;
        setBulkFeedback(fail === 0 ? `${ok} pedido${ok !== 1 ? "s" : ""} cancelado${ok !== 1 ? "s" : ""}.` : `${ok} OK · ${fail} con error.`);
        setSelectedRows([]);
        setBulkCancelConfirm(false);
        router.refresh();
      } catch (err) {
        setBulkFeedback(err instanceof Error ? err.message : "Error al cancelar.");
        setBulkCancelConfirm(false);
      }
    });
  };

  const handleExportCsv = () => {
    setBulkFeedback(null);
    startBulkTransition(async () => {
      const result = await exportOrdersCsv({
        status: currentTab !== "all" ? currentTab : undefined,
        query: currentQuery || undefined,
        dateFrom: currentDateFrom || undefined,
        dateTo: currentDateTo || undefined,
        orderIds: selectedRows.length > 0 ? selectedRows : undefined,
      });
      if (!result.success) { setBulkFeedback(result.error); return; }
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const ts = new Date();
      const stamp = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, "0")}-${String(ts.getDate()).padStart(2, "0")}`;
      const a = document.createElement("a"); a.href = url; a.download = `nexora-pedidos-${stamp}.csv`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      setBulkFeedback(`${result.count} pedidos exportados.`);
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows(orders.map((o) => o.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedRows((prev) => [...prev, id]);
    } else {
      setSelectedRows((prev) => prev.filter((r) => r !== id));
    }
  };

  // ── Tab definitions ──────────────────────────────────────────────────
  const tabs: { label: string; value: TabValue; count?: number }[] = [
    { label: "Todos", value: "all", count: counts.all },
    { label: "Nuevos", value: "new", count: counts.new },
    { label: "Pagados", value: "paid", count: counts.paid },
    { label: "Preparando", value: "processing", count: counts.processing },
    { label: "Enviados", value: "shipped", count: counts.shipped },
    { label: "Entregados", value: "delivered", count: counts.delivered },
    { label: "Cancelados", value: "cancelled", count: counts.cancelled },
    { label: "Reembolsados", value: "refunded", count: counts.refunded },
  ];

  const hasActiveFilters = currentQuery || currentDateFrom || currentDateTo;

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
              label: "Total pedidos",
              value: String(counts.all),
              hint: "Todos los pedidos",
            },
            {
              label: "Pendientes de pago",
              value: String(counts.pendingPayment),
              hint: "No cuentan como venta",
            },
            {
              label: "Por preparar",
              value: String(counts.paid + counts.processing),
              hint: "Pagados, sin despachar",
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
        active={currentTab}
        onChange={handleTabChange}
      />

      {/* DataBoard — cmd bar + bulk + table fused under one hairline frame */}
      <NexoraTableShell>
        <NexoraCmdBar>
          <NexoraSearch
            value={searchInput}
            onChange={setSearchInput}
            onKeyDown={handleSearchKeyDown}
            onBlur={handleSearchSubmit}
            placeholder="Buscar pedido, cliente, tracking…"
          />
          <NexoraFilters>
            <label className="nx-chip" style={{ paddingLeft: 8 }}>
              <CalendarDays className="h-3 w-3" />
              <span className="hidden sm:inline" style={{ opacity: 0.6 }}>Desde</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => handleDateFromChange(e.target.value)}
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
                onChange={(e) => handleDateToChange(e.target.value)}
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
            {hasActiveFilters ? (
              <button
                type="button"
                className="nx-action nx-action--ghost nx-action--sm"
                onClick={handleClearFilters}
              >
                Limpiar
              </button>
            ) : null}
          </NexoraFilters>
          <NexoraActions>
            <button type="button" onClick={handleExportCsv} disabled={bulkPending || pagination.total === 0} className="nx-action nx-action--ghost nx-action--sm" title="Exportar CSV">
              <Download className="h-3.5 w-3.5" strokeWidth={1.75} /> CSV
            </button>
            <span className="nx-cmd-bar__count">
              {pagination.total} pedido{pagination.total !== 1 ? "s" : ""}
            </span>
          </NexoraActions>
        </NexoraCmdBar>

        <NexoraBulkBar selected={selectedRows.length} onClear={() => { setSelectedRows([]); setBulkCancelConfirm(false); }}>
          <button type="button" onClick={() => runBulkFulfillment("preparing", bulkEligible.preparing, "preparando")} disabled={bulkPending || bulkEligible.preparing.length === 0} className="nx-action nx-action--sm" title={bulkEligible.preparing.length === 0 ? "Sin pedidos elegibles" : `${bulkEligible.preparing.length} pedido(s)`}>
            <Package className="h-3.5 w-3.5" strokeWidth={1.75} /> Preparar
          </button>
          <button type="button" onClick={() => runBulkFulfillment("shipped", bulkEligible.shipped, "enviado")} disabled={bulkPending || bulkEligible.shipped.length === 0} className="nx-action nx-action--sm" title={bulkEligible.shipped.length === 0 ? "Sin pedidos en preparación" : `${bulkEligible.shipped.length} pedido(s)`}>
            <Truck className="h-3.5 w-3.5" strokeWidth={1.75} /> Enviado
          </button>
          <button type="button" onClick={() => runBulkFulfillment("delivered", bulkEligible.delivered, "entregado")} disabled={bulkPending || bulkEligible.delivered.length === 0} className="nx-action nx-action--sm" title={bulkEligible.delivered.length === 0 ? "Sin pedidos enviados" : `${bulkEligible.delivered.length} pedido(s)`}>
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} /> Entregado
          </button>
          <button type="button" onClick={handleBulkCancel} disabled={bulkPending || bulkEligible.cancellable.length === 0} className={`nx-action nx-action--sm ${bulkCancelConfirm ? "nx-action--primary" : ""}`} style={bulkCancelConfirm ? { background: "var(--signal-danger)", borderColor: "var(--signal-danger)" } : undefined} title={bulkCancelConfirm ? "Confirmar cancelación" : "Cancelar seleccionados"}>
            <XCircle className="h-3.5 w-3.5" strokeWidth={1.75} /> {bulkCancelConfirm ? "Confirmar" : "Cancelar"}
          </button>
          <button type="button" onClick={handleExportCsv} disabled={bulkPending} className="nx-action nx-action--ghost nx-action--sm" title="Exportar seleccionados">
            <Download className="h-3.5 w-3.5" strokeWidth={1.75} /> CSV
          </button>
          {bulkFeedback ? (
            <span style={{ fontSize: 11, color: "var(--ink-5)", marginLeft: 8 }}>
              {bulkFeedback}
            </span>
          ) : null}
        </NexoraBulkBar>

        {/* Table */}
        <div className="overflow-x-auto">
          {counts.all === 0 && !hasActiveFilters ? (
            <NexoraEmpty
              title="Sin pedidos aún"
              body="Cuando tus compradores paguen desde el storefront, los pedidos aparecerán acá en tiempo real."
              actions={
                <a href="/admin/store" className="nx-action nx-action--sm">
                  Ver storefront
                </a>
              }
            />
          ) : orders.length === 0 ? (
            <NexoraEmpty
              title="Sin resultados"
              body="Ajustá los filtros o limpiá la búsqueda para ver todos los pedidos."
              actions={
                <button
                  type="button"
                  className="nx-action nx-action--sm"
                  onClick={handleClearFilters}
                >
                  Limpiar filtros
                </button>
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
                      checked={selectedRows.length === orders.length && orders.length > 0}
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
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const isSelected = selectedRows.includes(order.id);
                  const nextAction = nextActions.get(order.id) ?? null;
                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      data-selected={isSelected ? "true" : undefined}
                      style={{ cursor: "pointer" }}
                      className="group/row"
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
                      <td className="nx-cell-meta" style={{ fontVariantNumeric: "tabular-nums" }}>{new Date(order.createdAt).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
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
                        {order.channel === "Storefront" ? (
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
                      <td className="nx-cell-num nx-cell-strong">${order.total.toLocaleString("es-AR")}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                          {order.shipping?.trackingNumber && (
                            <button type="button" onClick={() => copyToClipboard(order.shipping.trackingNumber!)} className="nx-action nx-action--ghost nx-action--sm" style={{ padding: "2px 4px" }} title="Copiar tracking">
                              <Copy className="h-3 w-3" strokeWidth={1.75} />
                            </button>
                          )}
                          {order.customer?.email && (
                            <a href={`mailto:${order.customer.email}`} className="nx-action nx-action--ghost nx-action--sm" style={{ padding: "2px 4px" }} title="Email cliente" onClick={(e) => e.stopPropagation()}>
                              <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination bar */}
        {pagination.pageCount > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              borderTop: "1px solid var(--hairline)",
              fontSize: 12,
              color: "var(--ink-4)",
            }}
          >
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              Página {pagination.page} de {pagination.pageCount} · {pagination.total} pedidos
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                type="button"
                className="nx-action nx-action--ghost nx-action--sm"
                disabled={!pagination.hasPreviousPage}
                onClick={() => goToPage(pagination.page - 1)}
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>
              <button
                type="button"
                className="nx-action nx-action--ghost nx-action--sm"
                disabled={!pagination.hasNextPage}
                onClick={() => goToPage(pagination.page + 1)}
                aria-label="Página siguiente"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </NexoraTableShell>

      {/* Slide-in Drawer Component */}
      <OrderDrawer
        order={selectedOrder}
        isOpen={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
        fiscalReal={fiscalReal}
      />
    </div>
  );
}
