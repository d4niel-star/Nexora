"use client";

import { useEffect, useState } from "react";
import { ImportableProduct } from "../../../types/product";
import { X, Check, Star, Truck, ShieldCheck, Box, RefreshCw } from "lucide-react";

interface ImportPreviewDrawerProps {
  product: ImportableProduct | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ImportPreviewDrawer({ product, isOpen, onClose }: ImportPreviewDrawerProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [imported, setImported] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setImported(false);
      setIsImporting(false);
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
  }, [isOpen]); // Removed onClose to prevent unexpected state reset mid-import

  if (!isOpen || !product) return null;

  const handleImport = () => {
    setIsImporting(true);
    setTimeout(() => {
      setIsImporting(false);
      setImported(true);
      setTimeout(() => onClose(), 1500);
    }, 1200);
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-[#111111]/40 backdrop-blur-sm z-40 transition-all duration-300 ease-in-out"
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div 
        className="fixed right-0 top-0 bottom-0 w-full sm:max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto transform transition-transform duration-300 ease-out border-l border-[#EAEAEA] outline-none flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        tabIndex={-1}
      >
        <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-[#EAEAEA] px-6 sm:px-8 py-5 flex items-center justify-between z-10 transition-colors shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                 <Box className="w-4 h-4 text-emerald-600" />
             </div>
             <h2 id="import-title" className="text-xl font-extrabold text-[#111111] tracking-tight">Análisis de Importación</h2>
          </div>
          <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all active:scale-95">
             <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-8 flex-1">
          
          <div className="aspect-[21/9] w-full rounded-2xl bg-gray-100 overflow-hidden relative border border-[#EAEAEA]">
             <img src={product.images[0]} alt="product" className="w-full h-full object-cover" />
             <div className="absolute top-4 left-4 flex gap-2">
                <span className="px-3 py-1 bg-[#111111]/80 backdrop-blur text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                  Proveedor Verificado
                </span>
             </div>
          </div>

          <div className="space-y-2">
             <h1 className="text-2xl font-black text-[#111111] leading-tight">{product.originalTitle}</h1>
             <div className="flex items-center gap-4 text-[13px] font-bold text-gray-500">
               <span className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> {product.rating} / 5</span>
               <span>{product.totalSales.toLocaleString()} vendidos globales</span>
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="bg-[#FAFAFA] rounded-2xl p-5 border border-[#EAEAEA]">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#888888] mb-1">Costo Mayorista Drop</p>
                <p className="text-3xl font-black text-[#111111] tabular-nums">${product.baseCost.toLocaleString('es-AR')}</p>
                <div className="mt-3 flex items-center gap-2">
                   <ShieldCheck className="w-4 h-4 text-emerald-500" />
                   <p className="text-xs font-semibold text-emerald-700">{product.stockAvailable.toLocaleString()} en stock central</p>
                </div>
             </div>
             <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700 mb-1">Margen / Rentabilidad</p>
                <p className="text-3xl font-black text-emerald-700 tabular-nums">+{(product.estimatedMargin * 100).toFixed(0)}%</p>
                <p className="mt-4 text-xs font-bold text-emerald-800">Sugerido vender a: ${product.suggestedPrice.toLocaleString('es-AR')}</p>
             </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#888888] border-b border-[#EAEAEA] pb-2">Características Extraídas</h3>
             <ul className="space-y-2">
                {product.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm font-medium text-[#111111]">
                    <Check className="w-4 h-4 text-emerald-500" /> {f}
                  </li>
                ))}
             </ul>
          </div>

        </div>

        {/* Sticky Footer CTA */}
        <div className="p-6 border-t border-[#EAEAEA] bg-white sticky bottom-0">
           <button 
             onClick={handleImport}
             disabled={isImporting || imported}
             className={`w-full py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${imported ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-[#111111] hover:bg-black text-white shadow-black/10'}`}
           >
             {isImporting ? (
               <><RefreshCw className="w-4 h-4 animate-spin" /> Conectando API...</>
             ) : imported ? (
               <><Check className="w-5 h-5" /> Importado al Catálogo</>
             ) : (
               <><Box className="w-4 h-4" /> Importar como Borrador</>
             )}
           </button>
           <p className="text-center text-[11px] font-medium text-gray-400 mt-3 flex items-center justify-center gap-1">
             <Truck className="w-3 h-3" /> Logística manejada por {product.supplier} ({product.deliveryTimeDays})
           </p>
        </div>
      </div>
    </>
  );
}
