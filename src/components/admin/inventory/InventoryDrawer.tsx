"use client";

import { useEffect, useState } from "react";
import { InventoryItem } from "../../../types/inventory";
import { StockStatusBadge, SyncStatusIcon } from "./StockBadge";
import { X, MoreHorizontal, Package, Tag, ArrowRightLeft, Target, AlertCircle, ShoppingCart, Repeat, Edit2, PlaySquare, Box, Truck } from "lucide-react";

interface InventoryDrawerProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InventoryDrawer({ item, isOpen, onClose }: InventoryDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'movements'>('overview');

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleEsc);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleEsc);
      };
    } else {
      document.body.style.overflow = 'unset';
      timeoutId = setTimeout(() => setActiveTab('overview'), 300); // Reset after close animation
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOpen]); 

  if (!isOpen || !item) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-[#111111]/30 backdrop-blur-[2px] z-40 transition-all duration-300 ease-in-out"
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div 
        className="fixed right-0 top-0 bottom-0 w-full sm:max-w-xl bg-white shadow-2xl z-50 overflow-y-auto transform transition-transform duration-300 ease-out border-l border-[#EAEAEA] outline-none flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        tabIndex={-1}
      >
        
        {/* Header */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-[#EAEAEA] px-6 sm:px-8 py-5 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-4">
            <h2 id="drawer-title" className="text-xl font-extrabold text-[#111111] tracking-tight">Ficha de Inventario</h2>
            <StockStatusBadge status={item.stockStatus} />
          </div>
          <div className="flex items-center gap-1">
            <button className="px-4 py-2 text-[13px] font-bold text-[#111111] bg-white border border-[#EAEAEA] hover:bg-gray-50 rounded-lg transition-all shadow-sm flex items-center gap-1.5">
              <Edit2 className="w-3.5 h-3.5" /> Ajustar Stock
            </button>
            <div className="w-px h-5 bg-[#EAEAEA] mx-1" />
            <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-[#111111] hover:bg-gray-100 rounded-full transition-all active:scale-95">
               <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Product Identity Block */}
        <div className="px-6 sm:px-8 pt-6 pb-2 shrink-0">
           <div className="flex gap-4">
              <div className="w-16 h-16 rounded-xl bg-gray-50 border border-[#EAEAEA] overflow-hidden shrink-0">
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                 <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 font-mono">{item.sku}</p>
                 <h3 className="text-[15px] font-bold text-[#111111] leading-tight truncate">{item.title}</h3>
                 <p className="text-[13px] font-medium text-gray-500 mt-0.5">{item.variantTitle}</p>
              </div>
           </div>
           
           {/* Internal Nav Tabs */}
           <div className="flex gap-6 mt-6 border-b border-[#EAEAEA]">
              <button 
                 onClick={() => setActiveTab('overview')}
                 className={`pb-3 text-[13px] font-bold transition-colors border-b-2 ${activeTab === 'overview' ? 'border-[#111111] text-[#111111]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                 Métricas y Alertas
              </button>
              <button 
                 onClick={() => setActiveTab('movements')}
                 className={`pb-3 text-[13px] font-bold transition-colors border-b-2 flex items-center gap-1.5 ${activeTab === 'movements' ? 'border-[#111111] text-[#111111]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                 Historial <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md text-[10px]">{item.movements.length}</span>
              </button>
           </div>
        </div>

        {/* Content Body - Scrollable */}
        <div className="p-6 sm:p-8 flex-1">
          
          {activeTab === 'overview' ? (
            <div className="space-y-8 animate-in fade-in duration-300">
               {/* Contextual Alerts */}
               {item.stockStatus === 'out_of_stock' && (
                 <div className="bg-red-50 text-red-800 p-4 rounded-xl text-sm border border-red-100 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <div>
                       <span className="font-bold block mb-1">SKU Agotado</span>
                       <p className="font-medium text-red-700">Se han deshabilitado las compras en los canales de venta. Se requiere reponer un mínimo de {item.reorderPoint} unidades.</p>
                    </div>
                 </div>
               )}
               {item.stockStatus === 'low_stock' && (
                 <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl text-sm border border-yellow-100 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                    <div>
                       <span className="font-bold block mb-1">Debajo del Punto de Pedido</span>
                       <p className="font-medium text-yellow-700">El stock físico actual ({item.available}) está por debajo de tu nivel de reorden configurado ({item.reorderPoint}).</p>
                    </div>
                 </div>
               )}
               {item.syncStatus === 'error' && (
                 <div className="bg-red-50 text-red-800 p-4 rounded-xl text-sm border border-red-100 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <div>
                       <span className="font-bold block mb-1">Error de Sincronización</span>
                       <p className="font-medium text-red-700">Falló la actualización del stock con el proveedor "{item.supplier}". Retentando en breve.</p>
                    </div>
                 </div>
               )}

               {/* Core Stock Grid */}
               <section>
                 <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3 border-b border-[#EAEAEA] pb-2">Desglose de Inventario</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-[#EAEAEA] rounded-2xl overflow-hidden shadow-sm">
                   
                   <div className="p-5 bg-white border-b sm:border-b-0 sm:border-r border-[#EAEAEA] flex flex-col justify-between">
                     <p className="text-[11px] font-bold uppercase tracking-widest text-[#111111] mb-1 flex items-center gap-1.5"><Box className="w-3 h-3 text-gray-400" /> Disponible Físico</p>
                     <p className="text-3xl font-black text-[#111111] tabular-nums mt-2">{item.available}</p>
                   </div>
                   
                   <div className="p-5 bg-orange-50/50 border-b sm:border-b-0 sm:border-r border-[#EAEAEA]">
                     <p className="text-[11px] font-bold uppercase tracking-widest text-orange-600 mb-1 flex items-center gap-1.5"><ShoppingCart className="w-3 h-3" /> Reservado (Carritos)</p>
                     <p className="text-2xl font-black text-orange-700 tabular-nums mt-2">{item.reserved}</p>
                   </div>

                   <div className="p-5 bg-[#FAFAFA]">
                     <p className="text-[11px] font-bold uppercase tracking-widest text-[#888888] mb-1">Total Teórico</p>
                     <p className="text-xl font-bold text-gray-500 tabular-nums mt-2">{item.total}</p>
                     <div className="mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                       P. Reorden: {item.reorderPoint}
                     </div>
                   </div>

                 </div>
               </section>

               {/* Logistics & Sync Link */}
               <section className="bg-gray-50 rounded-2xl p-5 border border-[#EAEAEA]">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1">Origen del Stock</p>
                      <p className="text-sm font-bold text-[#111111]">{item.supplier === 'Own' ? 'Almacén Propio' : `Mayorista: ${item.supplier}`}</p>
                      <div className="mt-2">
                        <SyncStatusIcon status={item.syncStatus} />
                      </div>
                    </div>
                    {item.supplier !== 'Own' && (
                      <button className="px-4 py-2 border border-[#EAEAEA] bg-white rounded-lg text-xs font-bold text-[#111111] hover:bg-gray-100 transition-colors shadow-sm">
                        Forzar Sincronización
                      </button>
                    )}
                 </div>
               </section>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
               {/* Timeline of movements */}
               <div className="border border-[#EAEAEA] bg-white rounded-2xl overflow-hidden shadow-sm">
                 <div className="bg-[#FAFAFA] border-b border-[#EAEAEA] px-5 py-3">
                   <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Últimos {item.movements.length} movimientos</p>
                 </div>
                 <div className="divide-y divide-[#EAEAEA]">
                   {item.movements.length === 0 ? (
                     <p className="p-5 text-sm font-medium text-gray-400 text-center">No hay registros recientes.</p>
                   ) : (
                     item.movements.map(mov => (
                       <div key={mov.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                          <div className="flex items-start gap-4">
                             <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                               mov.quantity > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                             }`}>
                                {mov.type === 'sale' ? <ShoppingCart className="w-4 h-4" /> :
                                 mov.type === 'restock' ? <Truck className="w-4 h-4" /> :
                                 mov.type === 'adjustment' ? <Edit2 className="w-4 h-4" /> :
                                 mov.type === 'return' ? <Repeat className="w-4 h-4" /> :
                                 <Target className="w-4 h-4" />}
                             </div>
                             <div>
                               <p className="text-[13px] font-bold text-[#111111]">
                                 {mov.type === 'sale' ? 'Venta (Automática)' :
                                  mov.type === 'restock' ? 'Ingreso Logístico' :
                                  mov.type === 'adjustment' ? 'Ajuste Manual' :
                                  mov.type === 'return' ? 'Devolución Técnica' :
                                  'Reserva Temporal'}
                               </p>
                               <div className="text-[11px] font-medium text-gray-500 mt-1 flex items-center gap-2">
                                 <span>{new Date(mov.date).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short'})}</span>
                                 {mov.reference && (
                                   <>
                                     <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                     <span className="font-mono">{mov.reference}</span>
                                   </>
                                 )}
                               </div>
                               {mov.user && <p className="text-[10px] font-bold text-blue-500 mt-1 uppercase tracking-wider">Por: {mov.user}</p>}
                             </div>
                          </div>
                          <div className="text-right">
                             <span className={`text-[15px] font-black tabular-nums tracking-tight ${mov.quantity > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                               {mov.quantity > 0 ? '+' : ''}{mov.quantity}
                             </span>
                          </div>
                       </div>
                     ))
                   )}
                 </div>
               </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
