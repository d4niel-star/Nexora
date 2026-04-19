"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { Product } from "../../../types/product";
import { ProductStatusBadge } from "./ProductStatusBadge";
import { X, MoreHorizontal, Package, Tag, Layers, RefreshCw, BarChart2, Check, Loader2, Pencil } from "lucide-react";
import { updateProductCost } from "@/app/admin/ai/execution-actions";
import { cn } from "@/lib/utils";

interface ProductDrawerProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onProductUpdated?: () => void;
  focusSection?: string;
}

export function ProductDrawer({ product, isOpen, onClose, onProductUpdated, focusSection }: ProductDrawerProps) {
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleEsc);

      // Scroll to cost section if focusSection is "cost"
      if (focusSection === "cost") {
        setTimeout(() => {
          const costSection = document.getElementById("pricing-cost-section");
          if (costSection) {
            costSection.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
      }

      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleEsc);
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen, focusSection]); // Removed onClose to prevent re-renders breaking state

  if (!isOpen || !product) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-ink-0/40 z-40 transition-opacity duration-[var(--dur-base)] ease-[var(--ease-out)]"
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div 
        className="fixed right-0 top-0 bottom-0 w-full sm:max-w-xl bg-[var(--surface-0)] shadow-[var(--shadow-overlay)] z-50 overflow-y-auto transform transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)] border-l border-[color:var(--hairline)] outline-none flex flex-col"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        
        {/* Header - Glassmorphism effect */}
        <div className="sticky top-0 bg-[var(--surface-0)]/95 backdrop-blur-xl border-b border-[color:var(--hairline)] px-6 sm:px-8 py-5 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-ink-0 truncate max-w-[250px]">{product.title}</h2>
            <ProductStatusBadge status={product.status} />
          </div>
          <div className="flex items-center gap-1">
            <button className="h-9 px-3.5 text-[13px] font-medium text-ink-0 border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] hover:bg-[var(--surface-2)] rounded-[var(--r-sm)] transition-colors">
              Editar
            </button>
            <button className="p-2 text-ink-5 hover:text-ink-0 hover:bg-[var(--surface-2)] rounded-[var(--r-sm)] transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-[color:var(--hairline)] mx-1" />
            <button onClick={onClose} className="p-2 text-ink-5 hover:text-ink-0 hover:bg-[var(--surface-2)] rounded-[var(--r-sm)] transition-colors">
               <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-10 flex-1">
          
          {/* Main Visuals & Details */}
          <section className="flex gap-6">
            <div className="w-32 h-32 rounded-[var(--r-md)] bg-[var(--surface-2)] border border-[color:var(--hairline)] overflow-hidden shrink-0">
              <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
            </div>
            <div className="space-y-3 flex-1">
               <div className="flex flex-wrap gap-1.5">
                 <span className="inline-flex items-center gap-1.5 px-2 h-6 bg-[var(--surface-1)] text-ink-4 text-[10px] font-medium uppercase tracking-[0.14em] rounded-[var(--r-xs)] border border-[color:var(--hairline)]">
                    <Tag className="w-3 h-3" /> {product.category}
                 </span>
                 <span className="inline-flex items-center gap-1.5 px-2 h-6 bg-[var(--surface-1)] text-[color:var(--signal-success)] text-[10px] font-medium uppercase tracking-[0.14em] rounded-[var(--r-xs)] border border-[color:var(--hairline)]">
                    <Package className="w-3 h-3" /> Prov: {product.supplier}
                 </span>
               </div>
               <p className="text-[14px] leading-[1.55] text-ink-4">
                 {product.description || "Sin descripción proporcionada por el proveedor."}
               </p>
            </div>
          </section>

          {/* Pricing & Margins Grid — Editable Cost */}
          <div id="pricing-cost-section">
            <InlineCostSection
              product={product}
              onCostSaved={onProductUpdated}
            />
          </div>

          {/* Variables / Variants Table */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-[color:var(--hairline)] pb-2">
               <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">Variantes y stock</h3>
               <span className="tabular text-[11px] font-medium text-ink-0 bg-[var(--surface-2)] px-2 py-0.5 rounded-[var(--r-xs)]">{product.variants.length} SKUs</span>
            </div>
            
            <div className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] overflow-hidden">
               <table className="w-full text-left whitespace-nowrap">
                 <thead className="bg-[var(--surface-1)] border-b border-[color:var(--hairline)]">
                   <tr>
                     <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">SKU / variante</th>
                     <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 text-right">Stock</th>
                     <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 text-right">Precio</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-[color:var(--hairline)]">
                   {product.variants.map(v => (
                     <tr key={v.id} className="hover:bg-[var(--surface-1)] transition-colors">
                       <td className="px-4 py-3">
                         <p className="text-[13px] font-medium text-ink-0">{v.title}</p>
                         <p className="text-[11px] font-mono text-ink-5 mt-0.5">{v.sku}</p>
                       </td>
                       <td className="px-4 py-3 text-right">
                         <span className={cn("tabular inline-flex items-center h-5 px-1.5 text-[11px] font-medium rounded-[var(--r-xs)] border", (v.availableStock || v.stock) > 10 ? 'border-[color:var(--hairline)] bg-[var(--surface-1)] text-[color:var(--signal-success)]' : 'border-[color:var(--hairline)] bg-[var(--surface-1)] text-[color:var(--signal-danger)]')}>
                           {v.availableStock ?? v.stock} u.
                         </span>
                       </td>
                       <td className="px-4 py-3 text-right tabular text-[13px] font-medium text-ink-0">
                         ${v.price.toLocaleString('es-AR')}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </section>

          {/* Status Sync */}
          <section className="bg-[var(--surface-1)] rounded-[var(--r-md)] p-5 border border-[color:var(--hairline)] flex items-center justify-between">
             <div>
                <p className="text-[13px] font-medium text-ink-0">Última sincronización</p>
                <p className="tabular text-[12px] text-ink-5 mt-0.5">{new Date(product.updatedAt).toLocaleString('es-AR')}</p>
             </div>
             <button className="p-2 bg-[var(--surface-0)] border border-[color:var(--hairline)] rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] transition-colors text-ink-4 hover:text-ink-0">
               <RefreshCw className="w-4 h-4" />
             </button>
          </section>

        </div>
      </div>
    </>
  );
}

// ─── Inline Cost Editor ───

function InlineCostSection({ product, onCostSaved }: { product: Product; onCostSaved?: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Live margin calculation based on current input
  const parsedCost = parseFloat(value);
  const hasValidInput = value !== "" && !isNaN(parsedCost) && isFinite(parsedCost) && parsedCost >= 0;
  const liveMargin = hasValidInput && product.price > 0 ? (product.price - parsedCost) / product.price : null;

  // Reset state when product changes
  useEffect(() => {
    setEditing(false);
    setError(null);
    setSaved(false);
  }, [product.id]);

  const startEditing = () => {
    setValue(product.costReal ? String(product.cost) : "");
    setError(null);
    setSaved(false);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const cancelEditing = () => {
    setEditing(false);
    setError(null);
  };

  const saveCost = () => {
    if (!hasValidInput) {
      setError("Ingresá un costo válido (número ≥ 0)");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateProductCost(product.id, parsedCost);
      if (result.success) {
        setEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        onCostSaved?.();
      } else {
        setError(result.error || "Error al guardar");
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); saveCost(); }
    if (e.key === "Escape") { cancelEditing(); }
  };

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-[color:var(--hairline)] rounded-[var(--r-md)] overflow-hidden">
      {/* Cost cell — editable */}
      <div className={cn(
        "p-5 border-b sm:border-b-0 sm:border-r border-[color:var(--hairline)] transition-colors",
        editing ? "bg-[var(--surface-1)]" : !product.costReal ? "bg-[var(--surface-1)]" : "bg-[var(--surface-0)]"
      )}>
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 mb-1.5 flex items-center gap-1.5">
          <Layers className="w-3 h-3" /> Costo base
        </p>

        {editing ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="tabular text-[18px] font-semibold text-ink-0">$</span>
              <input
                ref={inputRef}
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={(e) => { setValue(e.target.value); setError(null); }}
                onKeyDown={handleKeyDown}
                disabled={isPending}
                className="w-full tabular text-[18px] font-semibold text-ink-0 bg-[var(--surface-0)] border border-[color:var(--hairline)] rounded-[var(--r-sm)] px-2.5 py-1.5 focus:outline-none focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)] transition-[box-shadow,border-color] disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0.00"
              />
            </div>
            {hasValidInput && liveMargin !== null && (
              <p className={cn("tabular text-[11px] font-medium",
                liveMargin >= 0.2 ? "text-[color:var(--signal-success)]" : liveMargin >= 0.05 ? "text-[color:var(--signal-warning)]" : "text-[color:var(--signal-danger)]"
              )}>
                Margen resultante: {Math.round(liveMargin * 100)}%
              </p>
            )}
            {error && <p className="text-[11px] font-medium text-[color:var(--signal-danger)]">{error}</p>}
            <div className="flex gap-1.5">
              <button
                onClick={saveCost}
                disabled={isPending || !hasValidInput}
                className="inline-flex items-center gap-1 px-3 h-8 text-[12px] font-medium text-ink-12 bg-ink-0 rounded-[var(--r-sm)] hover:bg-ink-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Guardar
              </button>
              <button
                onClick={cancelEditing}
                disabled={isPending}
                className="px-3 h-8 text-[12px] font-medium text-ink-5 bg-[var(--surface-0)] border border-[color:var(--hairline)] rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] hover:text-ink-0 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {product.costReal ? (
              <p className="tabular text-[20px] font-semibold text-ink-0">${product.cost.toLocaleString('es-AR')}</p>
            ) : (
              <p className="text-[13px] font-medium text-[color:var(--signal-danger)]">Sin costo</p>
            )}
            {saved ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[color:var(--signal-success)] animate-in fade-in">
                <Check className="w-3 h-3" /> Guardado
              </span>
            ) : (
              <button
                onClick={startEditing}
                className={cn(
                  "p-1.5 rounded-[var(--r-sm)] transition-colors",
                  product.costReal
                    ? "text-ink-6 hover:text-ink-0 hover:bg-[var(--surface-2)]"
                    : "text-[color:var(--signal-danger)] hover:bg-[var(--surface-2)] border border-[color:var(--hairline-strong)]"
                )}
                title={product.costReal ? "Editar costo" : "Cargar costo real"}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Margin cell */}
      <div className={cn(
        "p-5 border-b sm:border-b-0 sm:border-r border-[color:var(--hairline)]",
        product.costReal ? "bg-[var(--surface-0)]" : "bg-[var(--surface-1)]"
      )}>
        <p className={cn("text-[10px] font-medium uppercase tracking-[0.14em] mb-1.5 flex items-center gap-1.5",
          product.costReal ? "text-[color:var(--signal-success)]" : "text-ink-6"
        )}>
          <BarChart2 className="w-3 h-3" /> Margen est.
        </p>
        {product.costReal ? (
          <p className="tabular text-[20px] font-semibold text-ink-0">{(product.margin * 100).toFixed(0)}%</p>
        ) : (
          <p className="text-[13px] font-medium text-ink-6">—</p>
        )}
      </div>

      {/* PVP cell */}
      <div className="p-5 bg-[var(--surface-1)]">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 mb-1.5">PVP sugerido</p>
        <p className="tabular text-[20px] font-semibold text-ink-0">${product.price.toLocaleString('es-AR')}</p>
      </div>
    </section>
  );
}
