"use client";

import { useState } from "react";
import { Search, Download, Filter, MoreHorizontal, Handshake, ChevronDown, Package, FileText, Ban, X, ShoppingBag } from "lucide-react";
import { Order } from "../../../types/order";
import { OrderStatusBadge, PaymentStatusBadge } from "../../../components/admin/orders/StatusBadge";
import { OrderDrawer } from "../../../components/admin/orders/OrderDrawer";

type TabValue = 'all' | 'new' | 'processing' | 'shipped' | 'cancelled';

interface OrdersClientProps {
  orders: Order[];
  hideHeader?: boolean;
  initialTab?: TabValue;
}

export default function OrdersClient({ orders, hideHeader = false, initialTab = 'all' }: OrdersClientProps) {
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const filteredOrders = orders.filter(order => {
    const matchesTab = activeTab === 'all' || order.status === activeTab;
    const matchesSearch = order.number.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          order.customer.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const tabs: { label: string, value: TabValue, count?: number }[] = [
    { label: "Todos", value: "all", count: orders.length },
    { label: "Nuevos", value: "new", count: orders.filter(o => o.status === 'new').length },
    { label: "Preparando", value: "processing", count: orders.filter(o => o.status === 'processing').length },
    { label: "Enviados", value: "shipped", count: orders.filter(o => o.status === 'shipped').length },
    { label: "Cancelados", value: "cancelled", count: orders.filter(o => o.status === 'cancelled').length },
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
            <h1 className="text-3xl font-black tracking-tight text-[#111111]">Pedidos</h1>
            <p className="text-[#666666] text-[15px] mt-1 font-medium">Gestioná el motor logístico corporativo. Todo en un solo lugar.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-5 py-2.5 text-[13px] font-bold text-[#111111] bg-white border border-[#EAEAEA] rounded-xl hover:bg-gray-50 flex items-center gap-2 transition-all active:scale-95 shadow-sm">
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
            <button className="px-5 py-2.5 text-[13px] font-bold text-white bg-[#111111] rounded-xl hover:bg-black transition-all active:scale-95 shadow-md shadow-black/10">
              Crear Pedido
            </button>
          </div>
        </div>
      )}

      {/* 2. Main Container (SaaS Data Grid) */}
      <div className="bg-white border rounded-xl border-[#EAEAEA] shadow-none overflow-hidden relative">
        
        {/* Tabs */}
        <div className="flex items-center gap-8 px-6 border-b border-[#EAEAEA] overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`relative py-4 text-[13px] font-bold whitespace-nowrap transition-colors flex items-center gap-2 group
                ${activeTab === tab.value ? "text-[#111111]" : "text-[#888888] hover:text-[#111111]"}`
              }
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold transition-colors ${activeTab === tab.value ? 'bg-gray-100 text-[#111111]' : 'bg-transparent text-gray-500 group-hover:bg-gray-50'}`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.value && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#111111]" />
              )}
            </button>
          ))}
        </div>

        {/* Toolbar (Filters & Search) */}
        <div className="p-3 flex flex-col md:flex-row gap-4 justify-between items-center bg-white border-b border-[#EAEAEA]">
          <div className="relative w-full md:max-w-md group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar pedido, cliente, tracking..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-[13px] font-medium bg-transparent border border-transparent focus:outline-none text-[#111111] transition-all placeholder:text-gray-400"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button className="w-full md:w-auto px-3 py-1.5 text-[12px] font-bold text-gray-600 bg-white border border-[#EAEAEA] rounded-md hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors">
              <Filter className="w-3.5 h-3.5" /> Filtros
            </button>
          </div>
        </div>

        {/* 3. Data Table */}
        <div className="overflow-x-auto min-h-[400px]">
          {orders.length === 0 ? (
            /* Empty State — no orders at all */
            <div className="flex flex-col items-center justify-center py-24 px-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 mb-6 border border-gray-100 shadow-sm">
                <ShoppingBag className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-xl font-extrabold text-[#111111]">Sin pedidos aún</h3>
              <p className="text-[15px] font-medium text-[#888888] mt-2 max-w-sm mx-auto text-center">
                Cuando tus clientes realicen compras desde el storefront, los pedidos aparecerán acá en tiempo real.
              </p>
            </div>
          ) : (
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]/50">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888] w-12">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll}
                      checked={selectedRows.length === filteredOrders.length && filteredOrders.length > 0}
                      className="w-4 h-4 rounded border-gray-300 text-[#111111] focus:ring-[#111111] cursor-pointer" 
                    />
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888]">Pedido</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888]">Fecha</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888]">Cliente</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888]">Origen</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888]">Estado Cobro</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888]">Logística</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888] text-right">Monto</th>
                  <th className="px-6 py-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEAEA]/80">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-24 text-center">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 mb-6 border border-gray-100 shadow-sm">
                         <Search className="w-8 h-8 text-gray-300" />
                      </div>
                      <h3 className="text-xl font-extrabold text-[#111111]">No encontramos tu orden</h3>
                      <p className="text-[15px] font-medium text-[#888888] mt-2 max-w-sm mx-auto">Limpiá los filtros o asegurate de haber escrito bien el ID de seguimiento.</p>
                      <button onClick={() => {setSearchQuery(''); setActiveTab('all')}} className="mt-6 px-6 py-2.5 bg-white border border-[#EAEAEA] text-[#111111] font-bold text-[13px] rounded-xl hover:bg-gray-50 transition-colors">
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
                      className={`group transition-all cursor-pointer ${isSelected ? 'bg-emerald-50/30' : 'hover:bg-gray-50/50'}`}
                    >
                      <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                         <input 
                           type="checkbox" 
                           checked={isSelected}
                           onChange={(e) => handleSelectRow(e, order.id)}
                           className="w-4 h-4 rounded border-gray-300 text-[#111111] focus:ring-[#111111] cursor-pointer" 
                         />
                      </td>
                      <td className="px-6 py-5 font-bold text-[#111111] text-sm tabular-nums tracking-tight">{order.number}</td>
                      <td className="px-6 py-5 text-[13px] font-medium text-gray-500 tabular-nums">{new Date(order.createdAt).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-bold text-[#111111]">{order.customer.name}</div>
                        <div className="text-xs font-medium text-[#888888] truncate max-w-[150px] mt-0.5">{order.customer.email}</div>
                      </td>
                      <td className="px-6 py-5">
                        {order.channel === 'Mercado Libre' ? (
                           <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FFE600] text-[#2D3277] text-[10px] font-black uppercase tracking-widest rounded-md w-fit shadow-sm">
                              <Handshake className="w-3 h-3" /> ML
                           </div>
                        ) : order.channel === 'Shopify' ? (
                           <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#95BF47] text-white text-[10px] font-black uppercase tracking-widest rounded-md w-fit shadow-sm">
                              Shopify
                           </div>
                        ) : order.channel === 'Storefront' ? (
                           <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-md w-fit shadow-sm">
                              <ShoppingBag className="w-3 h-3" /> Tienda
                           </div>
                        ) : (
                           <span className="text-xs font-bold text-[#888888] bg-gray-100 px-2 py-1 rounded-md uppercase tracking-wider">{order.channel}</span>
                        )}
                      </td>
                      <td className="px-6 py-5"><PaymentStatusBadge status={order.paymentStatus} /></td>
                      <td className="px-6 py-5"><OrderStatusBadge status={order.status} /></td>
                      <td className="px-6 py-5 text-right font-black text-[#111111] tabular-nums tracking-tight text-[15px]">${order.total.toLocaleString('es-AR')}</td>
                      <td className="px-6 py-5 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button className="p-2 hover:bg-white border hover:border-[#EAEAEA] border-transparent shadow-sm hover:shadow-gray-200/50 rounded-lg text-gray-500 hover:text-[#111111] transition-all">
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
          <div className="px-6 py-4 border-t border-[#EAEAEA] bg-[#FAFAFA]/50 flex items-center justify-between">
            <span className="text-xs text-[#888888] font-bold uppercase tracking-wider block">
              Mostrando <b className="text-[#111111] px-1">{filteredOrders.length}</b> de {orders.length}
            </span>
            <div className="flex gap-2">
              <button disabled className="px-4 py-2 border border-[#EAEAEA] rounded-xl text-[13px] font-bold text-gray-400 bg-white opacity-50 cursor-not-allowed">Anterior</button>
              <button className="px-4 py-2 border border-[#EAEAEA] rounded-xl text-[13px] font-bold text-[#111111] bg-white hover:bg-gray-50 transition-colors shadow-sm">Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bulk Actions Toolbar (Linear-Style) */}
      {selectedRows.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#111111] text-white px-2 py-2 rounded-2xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-5 fade-in duration-300 z-30">
           <div className="px-4 border-r border-gray-700">
             <span className="text-[13px] font-bold">{selectedRows.length} seleccionados</span>
           </div>
           <div className="flex items-center gap-1 px-2">
             <button className="px-4 py-2 text-[13px] font-bold hover:bg-gray-800 rounded-xl transition-colors flex items-center gap-2">
               <Package className="w-4 h-4 text-emerald-400" /> Preparar
             </button>
             <button className="px-4 py-2 text-[13px] font-bold hover:bg-gray-800 rounded-xl transition-colors flex items-center gap-2">
               <FileText className="w-4 h-4" /> Etiquetas
             </button>
             <button className="px-4 py-2 text-[13px] font-bold hover:bg-red-950/50 hover:text-red-400 text-gray-300 rounded-xl transition-colors flex items-center gap-2">
               <Ban className="w-4 h-4" /> Cancelar
             </button>
           </div>
           <button 
              onClick={() => setSelectedRows([])}
              className="p-2 mr-1 hover:bg-gray-800 rounded-xl transition-colors shrink-0 text-gray-400 hover:text-white"
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
