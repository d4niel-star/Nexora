"use client";

import { useState } from "react";
import { Search, Download, Filter, MoreHorizontal, ChevronDown, Package, FileText, Ban, X, ShoppingBag, CalendarDays } from "lucide-react";
import { Order } from "../../../types/order";
import { OrderStatusBadge, PaymentStatusBadge } from "../../../components/admin/orders/StatusBadge";
import { OrderDrawer } from "../../../components/admin/orders/OrderDrawer";

type TabValue = 'all' | 'new' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

interface OrdersClientProps {
  orders: Order[];
  hideHeader?: boolean;
  initialTab?: TabValue;
}

export default function OrdersClient({ orders, hideHeader = false, initialTab = 'all' }: OrdersClientProps) {
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const filteredOrders = orders.filter(order => {
    const matchesTab = activeTab === 'all' || order.status === activeTab;
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
    { label: "Todos", value: "all", count: orders.length },
    { label: "Nuevos", value: "new", count: orders.filter(o => o.status === 'new').length },
    { label: "Pagados", value: "paid", count: orders.filter(o => o.status === 'paid').length },
    { label: "Preparando", value: "processing", count: orders.filter(o => o.status === 'processing').length },
    { label: "Enviados", value: "shipped", count: orders.filter(o => o.status === 'shipped').length },
    { label: "Entregados", value: "delivered", count: orders.filter(o => o.status === 'delivered').length },
    { label: "Cancelados", value: "cancelled", count: orders.filter(o => o.status === 'cancelled').length },
    { label: "Reembolsados", value: "refunded", count: orders.filter(o => o.status === 'refunded').length },
  ];

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
    <div className="space-y-8 animate-in fade-in duration-700 pb-32">
      
      {/* 1. Page Header */}
      {!hideHeader && (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-[28px] lg:text-[32px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink-0">Pedidos.</h1>
            <p className="text-ink-5 text-[15px] mt-1 font-medium">Gestioná el motor logístico corporativo. Todo en un solo lugar.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-5 py-2.5 text-[13px] font-bold text-ink-0 bg-[var(--surface-0)] border border-[color:var(--hairline)] rounded-[var(--r-lg)] hover:bg-[var(--surface-2)] flex items-center gap-2 transition-all active:scale-95 shadow-[var(--shadow-soft)]">
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
            <button className="px-5 py-2.5 text-[13px] font-bold text-white bg-ink-0 rounded-[var(--r-lg)] hover:bg-ink-2 transition-all active:scale-95 shadow-[var(--shadow-soft)]">
              Crear Pedido
            </button>
          </div>
        </div>
      )}

      {!hideHeader && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-5 py-4 shadow-[var(--shadow-soft)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-6">Ventas reales</p>
            <p className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-ink-0 tabular-nums">${realRevenue.toLocaleString("es-AR")}</p>
            <p className="mt-1 text-xs font-medium text-ink-6">Solo pagos confirmados por webhook.</p>
          </div>
          <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-5 py-4 shadow-[var(--shadow-soft)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-6">Pendientes de pago</p>
            <p className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[color:var(--signal-warning)] tabular-nums">{pendingPayment.length}</p>
            <p className="mt-1 text-xs font-medium text-ink-6">No cuentan como venta real.</p>
          </div>
          <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-5 py-4 shadow-[var(--shadow-soft)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-6">Por preparar</p>
            <p className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-ink-0 tabular-nums">{toPrepare.length}</p>
            <p className="mt-1 text-xs font-medium text-ink-6">Pagados sin despacho final.</p>
          </div>
        </div>
      )}

      {/* 2. Main Container (SaaS Data Grid) */}
      <div className="bg-[var(--surface-0)] border rounded-[var(--r-lg)] border-[color:var(--hairline)] shadow-none overflow-hidden relative">
        
        {/* Tabs */}
        <div className="flex items-center gap-8 px-6 border-b border-[color:var(--hairline)] overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`relative py-4 text-[13px] font-bold whitespace-nowrap transition-colors flex items-center gap-2 group
                ${activeTab === tab.value ? "text-ink-0" : "text-ink-6 hover:text-ink-0"}`
              }
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`tabular inline-flex items-center h-5 px-1.5 rounded-[var(--r-xs)] text-[10px] uppercase tracking-[0.12em] font-medium transition-colors ${activeTab === tab.value ? 'bg-[var(--surface-2)] text-ink-0' : 'bg-transparent text-ink-6 group-hover:bg-[var(--surface-2)]'}`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.value && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink-0" />
              )}
            </button>
          ))}
        </div>

        {/* Toolbar (Filters & Search) */}
        <div className="p-3 flex flex-col xl:flex-row gap-4 justify-between items-center bg-[var(--surface-0)] border-b border-[color:var(--hairline)]">
          <div className="relative w-full md:max-w-md group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-6 group-focus-within:text-ink-0 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar pedido, cliente, tracking..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-[13px] font-medium bg-transparent border border-transparent focus:outline-none text-ink-0 transition-all placeholder:text-ink-6"
            />
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full xl:w-auto">
            <label className="flex items-center gap-2 rounded-md border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3 py-1.5 text-[12px] font-bold text-ink-5">
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Desde</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-[12px] font-semibold text-ink-0 outline-none"
              />
            </label>
            <label className="flex items-center gap-2 rounded-md border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3 py-1.5 text-[12px] font-bold text-ink-5">
              <span className="hidden sm:inline">Hasta</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-[12px] font-semibold text-ink-0 outline-none"
              />
            </label>
            <button
              onClick={() => { setSearchQuery(""); setDateFrom(""); setDateTo(""); setActiveTab("all"); }}
              className="w-full sm:w-auto px-3 py-1.5 text-[12px] font-bold text-ink-5 bg-[var(--surface-0)] border border-[color:var(--hairline)] rounded-md hover:bg-[var(--surface-2)] flex items-center justify-center gap-2 transition-colors"
            >
              <Filter className="w-3.5 h-3.5" /> Limpiar
            </button>
          </div>
        </div>

        {/* 3. Data Table */}
        <div className="overflow-x-auto min-h-[400px]">
          {orders.length === 0 ? (
            /* Empty State — no orders at all */
            <div className="flex flex-col items-center justify-center py-24 px-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-[var(--r-sm)] bg-[var(--surface-1)] mb-6 border border-[color:var(--hairline)]">
                <ShoppingBag className="w-5 h-5 text-ink-5" strokeWidth={1.5} />
              </div>
              <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-ink-0">Sin pedidos aún.</h3>
              <p className="text-[15px] font-medium text-ink-6 mt-2 max-w-sm mx-auto text-center">
                Cuando tus clientes realicen compras desde el storefront, los pedidos aparecerán acá en tiempo real.
              </p>
            </div>
          ) : (
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-[color:var(--hairline)] bg-[var(--surface-1)]/90">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-ink-6 w-12">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll}
                      checked={selectedRows.length === filteredOrders.length && filteredOrders.length > 0}
                      className="w-4 h-4 rounded border-[color:var(--hairline)] text-ink-0 focus:ring-ink-0 cursor-pointer" 
                    />
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-ink-6">Pedido</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-ink-6">Fecha</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-ink-6">Cliente</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-ink-6">Productos</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-ink-6">Origen</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-ink-6">Estado Cobro</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-ink-6">Logística</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-ink-6 text-right">Monto</th>
                  <th className="px-6 py-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--hairline)]">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-24 text-center">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-[var(--r-sm)] bg-[var(--surface-1)] mb-6 border border-[color:var(--hairline)]">
                         <Search className="w-5 h-5 text-ink-5" strokeWidth={1.5} />
                      </div>
                      <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-ink-0">No encontramos tu orden.</h3>
                      <p className="text-[15px] font-medium text-ink-6 mt-2 max-w-sm mx-auto">Limpiá los filtros o asegurate de haber escrito bien el ID de seguimiento.</p>
                      <button onClick={() => {setSearchQuery(''); setDateFrom(''); setDateTo(''); setActiveTab('all')}} className="mt-6 px-6 py-2.5 bg-[var(--surface-0)] border border-[color:var(--hairline)] text-ink-0 font-bold text-[13px] rounded-[var(--r-lg)] hover:bg-[var(--surface-2)] transition-colors">
                        Limpiar Filtros
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const isSelected = selectedRows.includes(order.id);
                    return (
                    <tr 
                      key={order.id} 
                      onClick={() => setSelectedOrder(order)}
                      className={`group transition-colors cursor-pointer ${isSelected ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]/50'}`}
                    >
                      <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                         <input 
                           type="checkbox" 
                           checked={isSelected}
                           onChange={(e) => handleSelectRow(e, order.id)}
                           className="w-4 h-4 rounded border-[color:var(--hairline)] text-ink-0 focus:ring-ink-0 cursor-pointer" 
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
                           <div className="inline-flex items-center gap-1.5 h-6 px-2 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-[10px] font-medium uppercase tracking-[0.14em] text-ink-3 w-fit">
                              <ShoppingBag className="w-3 h-3" strokeWidth={1.75} /> Tienda
                           </div>
                        ) : (
                           <span className="text-xs font-bold text-ink-6 bg-[var(--surface-2)] px-2 py-1 rounded-md uppercase tracking-wider">{order.channel}</span>
                        )}
                      </td>
                      <td className="px-6 py-5"><PaymentStatusBadge status={order.paymentStatus} /></td>
                      <td className="px-6 py-5"><OrderStatusBadge status={order.status} /></td>
                      <td className="px-6 py-5 text-right font-semibold text-ink-0 tabular-nums tracking-[-0.01em] text-[15px]">${order.total.toLocaleString('es-AR')}</td>
                      <td className="px-6 py-5 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={(e) => e.stopPropagation()} className="p-2 hover:bg-[var(--surface-2)] border hover:border-[color:var(--hairline)] border-transparent rounded-[var(--r-sm)] text-ink-6 hover:text-ink-0 transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                         </button>
                      </td>
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
              <button disabled className="px-4 py-2 border border-[color:var(--hairline)] rounded-[var(--r-lg)] text-[13px] font-bold text-ink-7 bg-[var(--surface-0)] opacity-50 cursor-not-allowed">Anterior</button>
              <button className="px-4 py-2 border border-[color:var(--hairline)] rounded-[var(--r-lg)] text-[13px] font-bold text-ink-0 bg-[var(--surface-0)] hover:bg-[var(--surface-2)] transition-colors shadow-[var(--shadow-soft)]">Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bulk Actions Toolbar (Linear-Style) */}
      {selectedRows.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-ink-0 text-ink-12 px-2 py-2 rounded-[var(--r-md)] shadow-[var(--shadow-overlay)] flex items-center gap-1 animate-in slide-in-from-bottom-5 fade-in duration-[var(--dur-base)] z-30">
           <div className="px-3 border-r border-ink-12/15">
             <span className="tabular text-[13px] font-medium">{selectedRows.length} seleccionados</span>
           </div>
           <div className="flex items-center gap-1 px-1">
             <button className="inline-flex items-center gap-2 px-3 h-9 text-[13px] font-medium hover:bg-ink-12/10 rounded-[var(--r-sm)] transition-colors">
               <Package className="w-4 h-4" strokeWidth={1.75} /> Preparar
             </button>
             <button className="inline-flex items-center gap-2 px-3 h-9 text-[13px] font-medium hover:bg-ink-12/10 rounded-[var(--r-sm)] transition-colors">
               <FileText className="w-4 h-4" strokeWidth={1.75} /> Etiquetas
             </button>
             <button className="inline-flex items-center gap-2 px-3 h-9 text-[13px] font-medium text-ink-12/60 hover:bg-ink-12/10 hover:text-[color:var(--signal-danger)] rounded-[var(--r-sm)] transition-colors">
               <Ban className="w-4 h-4" /> Cancelar
             </button>
           </div>
           <button 
              onClick={() => setSelectedRows([])}
              className="p-2 mr-1 hover:bg-ink-12/10 rounded-[var(--r-sm)] transition-colors shrink-0 text-ink-12/50 hover:text-ink-12"
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
