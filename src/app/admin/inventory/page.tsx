"use client";

import { useState, useEffect } from "react";
import { Search, Download, Filter, MoreHorizontal, ChevronDown, Plus, PackageOpen, AlertCircle, ShoppingCart } from "lucide-react";
import { InventoryItem } from "../../../types/inventory";
import { MOCK_INVENTORY } from "../../../lib/mocks/inventory";
import { StockStatusBadge, SyncStatusIcon } from "../../../components/admin/inventory/StockBadge";
import { InventoryDrawer } from "../../../components/admin/inventory/InventoryDrawer";
import { TableSkeleton } from "../../../components/admin/orders/TableSkeleton"; // Reusing the same standard skeleton

type TabValue = 'all' | 'low_stock' | 'out_of_stock' | 'reserved' | 'syncing' | 'movements';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selection States
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  // Bulk Actions
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    setSelectedRows([]); 
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, [activeTab]);

  // Filtering Logic
  const filteredInventory = MOCK_INVENTORY.filter(item => {
    let matchesTab = true;
    if (activeTab === 'low_stock') matchesTab = item.stockStatus === 'low_stock';
    if (activeTab === 'out_of_stock') matchesTab = item.stockStatus === 'out_of_stock';
    if (activeTab === 'reserved') matchesTab = item.reserved > 0;
    if (activeTab === 'syncing') matchesTab = item.syncStatus !== 'unlinked';
    
    // Using movements tab to filter out anything that hasn't had a movement recently (mock logic)
    if (activeTab === 'movements') matchesTab = item.movements.length > 0; 

    const matchesSearch = item.sku.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const tabs: { label: string, value: TabValue, count?: number, badgeColor?: string }[] = [
    { label: "Todo el Inventario", value: "all", count: MOCK_INVENTORY.length },
    { label: "Stock Bajo", value: "low_stock", count: MOCK_INVENTORY.filter(i => i.stockStatus === 'low_stock').length, badgeColor: "bg-yellow-200 text-yellow-800" },
    { label: "Agotado", value: "out_of_stock", count: MOCK_INVENTORY.filter(i => i.stockStatus === 'out_of_stock').length, badgeColor: "bg-red-200 text-red-800" },
    { label: "Carritos & Reservas", value: "reserved", count: MOCK_INVENTORY.filter(i => i.reserved > 0).length },
    { label: "Conexiones", value: "syncing" }
  ];

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedRows(filteredInventory.map(p => p.id));
    else setSelectedRows([]);
  };

  const handleSelectRow = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    e.stopPropagation();
    if (e.target.checked) setSelectedRows(prev => [...prev, id]);
    else setSelectedRows(prev => prev.filter(r => r !== id));
  };


  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-32">
      
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="flex items-center gap-3">
             <h1 className="text-3xl font-black tracking-tight text-[#111111]">Control de Inventario</h1>
             {MOCK_INVENTORY.filter(i => i.stockStatus === 'out_of_stock').length > 0 && (
               <span className="flex items-center gap-1.5 px-2 py-0.5 bg-red-50 border border-red-100 text-red-700 text-[10px] font-black uppercase tracking-widest rounded-md shadow-sm">
                 <AlertCircle className="w-3 h-3" /> Faltantes detectados
               </span>
             )}
           </div>
          <p className="text-[#666666] text-[15px] mt-1 font-medium">Visualizá disponibilidad real, niveles físicos, depósitos y mercancía en tránsito.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-5 py-2.5 text-[13px] font-bold text-[#111111] bg-white border border-[#EAEAEA] rounded-xl hover:bg-gray-50 transition-all active:scale-95 shadow-sm flex items-center gap-2">
            <Download className="w-4 h-4" /> Bajar Reporte
          </button>
          <button className="px-5 py-2.5 text-[13px] font-bold text-white bg-[#111111] rounded-xl hover:bg-black transition-all active:scale-95 shadow-md shadow-black/10 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Movimiento Manual
          </button>
        </div>
      </div>

      {/* 2. Main Container Layer */}
      <div className="bg-white border rounded-2xl border-[#EAEAEA] shadow-sm overflow-hidden relative">
        
        {/* Tabs Bar */}
        <div className="flex items-center gap-8 px-6 border-b border-[#EAEAEA] overflow-x-auto no-scrollbar bg-[#FAFAFA]/50">
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
                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold transition-colors 
                   ${activeTab === tab.value 
                      ? (tab.badgeColor ? tab.badgeColor : 'bg-gray-200 text-[#111111]') 
                      : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.value && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#111111] rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Filters Toolbar */}
        <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-white border-b border-[#EAEAEA]">
          <div className="relative w-full md:w-[400px] group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Escanear o buscar SKU, Nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-[13px] font-medium bg-gray-50 border border-transparent rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-[#111111] transition-all placeholder:text-gray-400"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button className="w-full md:w-auto px-4 py-2.5 text-[13px] font-bold text-gray-600 bg-white border border-[#EAEAEA] rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors">
              <Filter className="w-4 h-4" /> Vistas Personalizadas <ChevronDown className="w-3 h-3 ml-1" />
            </button>
          </div>
        </div>

        {/* 3. Table View */}
        <div className="min-h-[400px] bg-[#FAFAFA]/30">
          {isLoading ? (
             <TableSkeleton />
          ) : (
             <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]">
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888] w-12">
                        <input 
                          type="checkbox" 
                          onChange={handleSelectAll}
                          checked={selectedRows.length === filteredInventory.length && filteredInventory.length > 0}
                          className="w-4 h-4 rounded border-gray-300 text-[#111111] focus:ring-[#111111] cursor-pointer" 
                        />
                      </th>
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888]">SKU / Ítem</th>
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888]">Origen</th>
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888]">Estado</th>
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888]">Conexión</th>
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888] text-right">Reservado</th>
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888] text-right">Disponible</th>
                      <th className="px-6 py-4 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAEAEA]/80">
                    {filteredInventory.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-24 text-center">
                          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 mb-6 border border-gray-100 shadow-sm">
                            <PackageOpen className="w-8 h-8 text-gray-300" />
                          </div>
                          <h3 className="text-xl font-extrabold text-[#111111]">No hay inventario aquí</h3>
                          <p className="text-[15px] font-medium text-[#888888] mt-2 max-w-sm mx-auto">No tienes productos que coincidan con estos parámetros o filtros de stock.</p>
                          <button onClick={() => {setSearchQuery(''); setActiveTab('all')}} className="mt-6 px-6 py-2.5 bg-white border border-[#EAEAEA] text-[#111111] font-bold text-[13px] rounded-xl hover:bg-gray-50 transition-colors">
                             Limpiar Filtros
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredInventory.map(item => {
                        const isSelected = selectedRows.includes(item.id);
                        return (
                          <tr 
                            key={item.id}
                            onClick={() => setSelectedItem(item)}
                            className={`group transition-all cursor-pointer ${isSelected ? 'bg-emerald-50/30' : 'hover:bg-gray-50/50 bg-white'}`}
                          >
                            <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={isSelected}
                                onChange={(e) => handleSelectRow(e, item.id)}
                                className="w-4 h-4 rounded border-gray-300 text-[#111111] focus:ring-[#111111] cursor-pointer" 
                              />
                            </td>
                            <td className="px-6 py-5">
                               <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 overflow-hidden shadow-sm shrink-0">
                                   <img src={item.image} alt="pic" className="w-full h-full object-cover" />
                                 </div>
                                 <div className="flex flex-col">
                                   <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest font-mono mb-0.5">{item.sku}</span>
                                   <span className="text-[13px] font-bold text-[#111111] truncate max-w-[200px]">{item.title}</span>
                                   {item.variantTitle && <span className="text-xs font-medium text-gray-400 mt-0.5">{item.variantTitle}</span>}
                                 </div>
                               </div>
                            </td>
                            <td className="px-6 py-5">
                               <span className={`text-[11px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${item.supplier === 'Own' ? 'bg-gray-100 text-gray-700' : 'bg-blue-50 text-blue-700'}`}>
                                 {item.supplier}
                               </span>
                            </td>
                            <td className="px-6 py-5"><StockStatusBadge status={item.stockStatus} /></td>
                            <td className="px-6 py-5"><SyncStatusIcon status={item.syncStatus} /></td>
                            
                            <td className="px-6 py-5 text-right">
                               <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md">
                                 <ShoppingCart className="w-3 h-3" /> {item.reserved} u.
                               </span>
                            </td>
                            
                            <td className="px-6 py-5 text-right font-black tabular-nums tracking-tight text-[15px]">
                               {item.available > 0 ? (
                                 <span className="text-[#111111]">{item.available} <span className="text-gray-400 text-xs font-semibold ml-0.5">u.</span></span>
                               ) : (
                                 <span className="text-red-500">—</span>
                               )}
                            </td>

                            <td className="px-6 py-5 opacity-0 group-hover:opacity-100 transition-opacity text-right">
                               <button className="p-2 hover:bg-white border hover:border-[#EAEAEA] border-transparent shadow-sm rounded-lg text-gray-500 hover:text-[#111111] transition-all">
                                   <MoreHorizontal className="w-4 h-4" />
                               </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
             </div>
          )}
        </div>
        
        {/* Pagination */}
        {!isLoading && filteredInventory.length > 0 && (
          <div className="px-6 py-4 border-t border-[#EAEAEA] bg-[#FAFAFA]/50 flex items-center justify-between">
            <span className="text-xs text-[#888888] font-bold uppercase tracking-wider block">
              Resultados: <b className="text-[#111111] px-1">{filteredInventory.length}</b> SKUs
            </span>
            <div className="flex gap-2">
              <button disabled className="px-4 py-2 border border-[#EAEAEA] rounded-xl text-[13px] font-bold text-gray-400 bg-white opacity-50 cursor-not-allowed">Anterior</button>
              <button className="px-4 py-2 border border-[#EAEAEA] rounded-xl text-[13px] font-bold text-[#111111] bg-white hover:bg-gray-50 transition-colors shadow-sm">Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Toolbars */}
      {selectedRows.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#111111] text-white px-2 py-2 rounded-2xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-5 fade-in duration-300 z-30">
           <div className="px-4 border-r border-gray-700">
             <span className="text-[13px] font-bold">{selectedRows.length} ítems</span>
           </div>
           <div className="flex items-center gap-1 px-2">
             <button className="px-4 py-2 text-[13px] font-bold hover:bg-gray-800 rounded-xl transition-colors">Ajustar Stock</button>
             <button className="px-4 py-2 text-[13px] font-bold hover:bg-gray-800 rounded-xl transition-colors">Sincronizar</button>
           </div>
        </div>
      )}

      {/* Stock Drawer */}
      <InventoryDrawer 
        item={selectedItem} 
        isOpen={selectedItem !== null} 
        onClose={() => setSelectedItem(null)} 
      />

    </div>
  );
}
