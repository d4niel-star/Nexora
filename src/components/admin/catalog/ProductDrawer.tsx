"use client";

import { useEffect } from "react";
import { Product } from "../../../types/product";
import { ProductStatusBadge } from "./ProductStatusBadge";
import { X, MoreHorizontal, Package, Tag, Layers, RefreshCw, BarChart2 } from "lucide-react";

interface ProductDrawerProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductDrawer({ product, isOpen, onClose }: ProductDrawerProps) {
  
  useEffect(() => {
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
    }
  }, [isOpen]); // Removed onClose to prevent re-renders breaking state

  if (!isOpen || !product) return null;

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
        tabIndex={-1}
      >
        
        {/* Header - Glassmorphism effect */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-[#EAEAEA] px-6 sm:px-8 py-5 flex items-center justify-between z-10 transition-colors shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-extrabold text-[#111111] tracking-tight truncate max-w-[250px]">{product.title}</h2>
            <ProductStatusBadge status={product.status} />
          </div>
          <div className="flex items-center gap-1">
            <button className="px-4 py-2 text-[13px] font-bold text-[#111111] bg-white border border-[#EAEAEA] hover:border-[#111111] rounded-lg transition-all shadow-sm">
              Editar
            </button>
            <button className="p-2.5 text-gray-400 hover:text-[#111111] hover:bg-gray-100 rounded-full transition-all active:scale-95">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-[#EAEAEA] mx-1" />
            <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all active:scale-95">
               <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-10 flex-1">
          
          {/* Main Visuals & Details */}
          <section className="flex gap-6">
            <div className="w-32 h-32 rounded-2xl bg-gray-50 border border-[#EAEAEA] overflow-hidden shrink-0">
              <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
            </div>
            <div className="space-y-3 flex-1">
               <div className="flex flex-wrap gap-2">
                 <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-md w-fit border border-[#EAEAEA]">
                    <Tag className="w-3 h-3" /> {product.category}
                 </span>
                 <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-md w-fit border border-emerald-100">
                    <Package className="w-3 h-3" /> Prov: {product.supplier}
                 </span>
               </div>
               <p className="text-[15px] font-medium text-[#666666] leading-relaxed">
                 {product.description || "Sin descripción proporcionada por el proveedor."}
               </p>
            </div>
          </section>

          {/* Pricing & Margins Grid Minimalist */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-[#EAEAEA] rounded-2xl overflow-hidden shadow-sm">
             <div className="p-5 bg-white border-b sm:border-b-0 sm:border-r border-[#EAEAEA]">
               <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1.5"><Layers className="w-3 h-3" /> Costo Base</p>
               <p className="text-xl font-black text-[#111111] tabular-nums">${product.cost.toLocaleString('es-AR')}</p>
             </div>
             <div className="p-5 bg-emerald-50/30 border-b sm:border-b-0 sm:border-r border-[#EAEAEA]">
               <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 mb-1 flex items-center gap-1.5"><BarChart2 className="w-3 h-3" /> Margen Est.</p>
               <p className="text-xl font-black text-emerald-700 tabular-nums">{(product.margin * 100).toFixed(0)}%</p>
             </div>
             <div className="p-5 bg-[#FAFAFA]">
               <p className="text-[11px] font-bold uppercase tracking-widest text-[#111111] mb-1">PVP Sugerido</p>
               <p className="text-xl font-black text-[#111111] tabular-nums">${product.price.toLocaleString('es-AR')}</p>
             </div>
          </section>

          {/* Variables / Variants Table */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-2">
               <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#888888]">Variantes y Stock</h3>
               <span className="text-[11px] font-bold text-[#111111] bg-gray-100 px-2 py-0.5 rounded-full">{product.variants.length} SKUs</span>
            </div>
            
            <div className="rounded-xl border border-[#EAEAEA] overflow-hidden">
               <table className="w-full text-left whitespace-nowrap">
                 <thead className="bg-[#FAFAFA] border-b border-[#EAEAEA]">
                   <tr>
                     <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">SKU / Variante</th>
                     <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 text-right">Stock</th>
                     <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 text-right">Precio</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-[#EAEAEA]">
                   {product.variants.map(v => (
                     <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                       <td className="px-4 py-3">
                         <p className="text-[13px] font-bold text-[#111111]">{v.title}</p>
                         <p className="text-[11px] font-mono text-gray-500 mt-0.5">{v.sku}</p>
                       </td>
                       <td className="px-4 py-3 text-right">
                         <span className={`inline-flex px-2 py-0.5 text-[11px] font-bold rounded-full ${(v.availableStock || v.stock) > 10 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                           {v.availableStock ?? v.stock} u.
                         </span>
                       </td>
                       <td className="px-4 py-3 text-right text-[13px] font-bold text-[#111111] tabular-nums">
                         ${v.price.toLocaleString('es-AR')}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </section>

          {/* Status Sync */}
          <section className="bg-gray-50 rounded-2xl p-5 border border-[#EAEAEA] flex items-center justify-between">
             <div>
                <p className="text-[13px] font-bold text-[#111111]">Última sincronización</p>
                <p className="text-xs font-medium text-gray-500 mt-0.5">{new Date(product.updatedAt).toLocaleString('es-AR')}</p>
             </div>
             <button className="p-2 bg-white border border-[#EAEAEA] rounded-lg shadow-sm hover:shadow hover:border-gray-300 transition-all text-gray-600 hover:text-[#111111]">
               <RefreshCw className="w-4 h-4" />
             </button>
          </section>

        </div>
      </div>
    </>
  );
}
