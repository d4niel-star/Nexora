"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, Package, Plus, Trash2, Edit, AlertTriangle, CheckCircle2, Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Product, CatalogSignal } from "../../../types/product";
import { publishDraftProduct } from "@/app/admin/ai/execution-actions";
import { buildVariantHref } from "@/lib/navigation/hrefs";

import { ProductStatusBadge } from "../../../components/admin/catalog/ProductStatusBadge";
import { ProductDrawer } from "../../../components/admin/catalog/ProductDrawer";


type TabValue = 'all' | 'active' | 'draft' | 'archived' | 'out_of_stock' | 'issues';

interface CatalogClientProps {
  products: Product[];
  hideHeader?: boolean;
  initialTab?: TabValue;
  focusProductId?: string;
  focusSection?: string;
}

export default function CatalogClient({ products, hideHeader = false, initialTab = 'all', focusProductId, focusSection }: CatalogClientProps) {
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ id: string; label: string } | null>(null);
  
  // Selection States
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  
  // Bulk Actions
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  useEffect(() => {
    setSelectedRows([]);
  }, [activeTab]);

  // Sync open drawer with refreshed product data (e.g. after inline cost edit)
  useEffect(() => {
    if (selectedProduct) {
      const updated = products.find((p) => p.id === selectedProduct.id);
      if (updated && updated !== selectedProduct) {
        setSelectedProduct(updated);
      }
    }
  }, [products]);

  // Auto-open drawer when focusProductId is provided (deep-link from variant cost review)
  useEffect(() => {
    if (focusProductId && !selectedProduct) {
      const targetProduct = products.find((p) => p.id === focusProductId);
      if (targetProduct) {
        setSelectedProduct(targetProduct);
      }
    }
  }, [focusProductId, products]);

  // Filtering Logic
  const filteredCatalog = products.filter(product => {
    let matchesTab = true;
    if (activeTab === 'active') matchesTab = product.status === 'active';
    if (activeTab === 'draft') matchesTab = product.status === 'draft';
    if (activeTab === 'archived') matchesTab = product.status === 'archived';
    if (activeTab === 'out_of_stock') matchesTab = product.totalStock === 0;
    if (activeTab === 'issues') matchesTab = product.issueCount > 0;

    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const issueCount = products.filter(p => p.issueCount > 0).length;

  // Inline actions
  const handlePublish = (productId: string) => {
    setActioningId(productId);
    startTransition(async () => {
      const result = await publishDraftProduct(productId);
      setActioningId(null);
      if (result.success) {
        setActionFeedback({ id: productId, label: "Publicado" });
        setTimeout(() => setActionFeedback(null), 2000);
        router.refresh();
      }
    });
  };

  const tabs: { label: string, value: TabValue, count?: number, isSpecial?: boolean }[] = [
    { label: "Catálogo", value: "all", count: products.length },
    { label: "Activos", value: "active", count: products.filter(p => p.status === 'active').length },
    { label: "Borradores", value: "draft", count: products.filter(p => p.status === 'draft').length },
    { label: "Archivados", value: "archived", count: products.filter(p => p.status === 'archived').length },
    { label: "Sin Stock", value: "out_of_stock", count: products.filter(p => p.totalStock === 0).length },
    { label: "Con Problemas", value: "issues", count: issueCount, isSpecial: issueCount > 0 },
  ];

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedRows(filteredCatalog.map(p => p.id));
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
      {!hideHeader && (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-ink-0">Catálogo de Productos</h1>
            <p className="text-ink-5 text-[15px] mt-1 font-medium">Administra tu inventario y descubre productos ganadores listos para importar.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-5 py-2.5 text-[13px] font-bold text-ink-0 bg-[var(--surface-0)] border border-[color:var(--hairline)] rounded-[var(--r-lg)] hover:bg-[var(--surface-2)] transition-all active:scale-95 shadow-[var(--shadow-soft)]">
              Exportar CSV
            </button>
            <button className="px-5 py-2.5 text-[13px] font-bold text-white bg-ink-0 rounded-[var(--r-lg)] hover:bg-ink-2 transition-all active:scale-95 shadow-[var(--shadow-soft)] flex items-center gap-2">
              <Plus className="w-4 h-4" /> Agregar Manual
            </button>
          </div>
        </div>
      )}

      {/* 2. Main Container Layer */}
      <div className="bg-[var(--surface-0)] border rounded-[var(--r-lg)] border-[color:var(--hairline)] shadow-none overflow-hidden relative">
        
        {/* Tabs Bar */}
        <div className="flex items-center gap-8 px-6 border-b border-[color:var(--hairline)] overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`relative py-4 text-[13px] font-bold whitespace-nowrap transition-colors flex items-center gap-2 group
                ${activeTab === tab.value ? (tab.isSpecial ? "text-amber-600" : "text-ink-0") : "text-ink-6 hover:text-ink-0"}
              `}
            >
              {tab.isSpecial && <AlertTriangle className={`w-3.5 h-3.5 ${activeTab === tab.value ? 'text-amber-500' : 'text-ink-6'}`} />}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`tabular inline-flex items-center h-5 px-1.5 rounded-[var(--r-xs)] text-[10px] uppercase tracking-[0.12em] font-medium transition-colors ${activeTab === tab.value ? 'bg-[var(--surface-2)] text-ink-0' : 'bg-transparent text-ink-6 group-hover:bg-[var(--surface-2)]'}`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.value && (
                <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${tab.isSpecial ? 'bg-amber-500' : 'bg-ink-0'}`} />
              )}
            </button>
          ))}
        </div>

        {/* Filters Toolbar */}
        <div className="p-3 flex flex-col md:flex-row gap-4 justify-between items-center bg-[var(--surface-0)] border-b border-[color:var(--hairline)]">
          <div className="relative w-full md:max-w-md group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-6 group-focus-within:text-ink-0 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar SKU o nombre de producto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-[13px] font-medium bg-transparent border border-transparent focus:outline-none text-ink-0 transition-all placeholder:text-ink-6"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button className="w-full md:w-auto px-3 py-1.5 text-[12px] font-bold text-ink-5 bg-[var(--surface-0)] border border-[color:var(--hairline)] rounded-md hover:bg-[var(--surface-2)] flex items-center justify-center gap-2 transition-colors">
              <Filter className="w-3.5 h-3.5" /> Filtros
            </button>
          </div>
        </div>

        {/* 3. Dynamic Rendering based on Tab */}
        <div className="min-h-[400px] bg-[var(--surface-1)]/50">

              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-[color:var(--hairline)] bg-[var(--surface-1)]">
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-ink-6 w-12">
                        <input 
                          type="checkbox" 
                          onChange={handleSelectAll}
                          checked={selectedRows.length === filteredCatalog.length && filteredCatalog.length > 0}
                          className="w-4 h-4 rounded border-[color:var(--hairline)] text-ink-0 focus:ring-ink-0 cursor-pointer" 
                        />
                      </th>
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-ink-6">Producto</th>
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-ink-6">Salud</th>
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-ink-6">Precio</th>
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-ink-6">Estado</th>
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-ink-6 text-right">Stock</th>
                      <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-ink-6 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--hairline)]">
                    {filteredCatalog.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-24 text-center">
                          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[var(--r-sm)] bg-[var(--surface-1)] mb-6 border border-[color:var(--hairline)]">
                            <Package className="w-5 h-5 text-ink-5" strokeWidth={1.5} />
                          </div>
                          <h3 className="text-xl font-extrabold text-ink-0">Catálogo Vacío</h3>
                          <p className="text-[15px] font-medium text-ink-6 mt-2 max-w-sm mx-auto">No tienes productos en esta vista. Prueba importando desde dropshipping.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredCatalog.map(product => {
                        const isSelected = selectedRows.includes(product.id);
                        return (
                          <tr 
                            key={product.id}
                            onClick={() => setSelectedProduct(product)}
                            className={`group transition-all cursor-pointer ${isSelected ? 'bg-emerald-50/30' : 'hover:bg-[var(--surface-2)]/50 bg-[var(--surface-0)]'}`}
                          >
                            <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={isSelected}
                                onChange={(e) => handleSelectRow(e, product.id)}
                                className="w-4 h-4 rounded border-[color:var(--hairline)] text-ink-0 focus:ring-ink-0 cursor-pointer" 
                              />
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-[var(--surface-2)] border border-[color:var(--hairline)] overflow-hidden shadow-[var(--shadow-soft)] shrink-0">
                                  {product.image ? (
                                    <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-ink-7"><Package className="w-5 h-5" /></div>
                                  )}
                                </div>
                                <div>
                                  <p className="text-[13px] font-bold text-ink-0">{product.title}</p>
                                  <p className="text-xs font-semibold text-ink-6 mt-0.5">{product.variants.length} variante{product.variants.length !== 1 ? 's' : ''}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <SignalChips
                                signals={product.signals}
                                providerName={product.providerName}
                                variantCriticalId={product.variantCriticalId}
                                variantHiddenId={product.variantHiddenId}
                                variantStuckId={product.variantStuckId}
                                variantNegativeId={product.variantNegativeId}
                                variantUrgentReorderId={product.variantUrgentReorderId}
                              />
                            </td>
                            <td className="px-6 py-5">
                              <p className="text-[15px] font-black text-ink-0 tabular-nums tracking-tight">${product.price.toLocaleString('es-AR')}</p>
                              {product.costReal ? (
                                <p className={cn("text-[11px] font-bold mt-0.5 tabular-nums", product.margin >= 0.2 ? "text-emerald-600" : product.margin >= 0.05 ? "text-amber-600" : "text-red-500")}>
                                  Margen {Math.round(product.margin * 100)}% &middot; Costo ${product.cost.toLocaleString('es-AR')}
                                </p>
                              ) : (
                                <p className="text-[11px] font-bold text-red-400 mt-0.5">Sin costo real</p>
                              )}
                            </td>
                            <td className="px-6 py-5"><ProductStatusBadge status={product.status} /></td>
                            <td className="px-6 py-5 text-right font-black text-ink-0 text-sm tabular-nums">
                              {product.totalStock > 0 ? (
                                <span className="text-ink-0">{product.totalStock} u.</span>
                              ) : (
                                <span className="text-red-500">Agotado</span>
                              )}
                            </td>
                            <td className="px-6 py-5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {actionFeedback?.id === product.id ? (
                                  <span className="text-[11px] font-bold text-emerald-600 animate-in fade-in">{actionFeedback.label}</span>
                                ) : (
                                  <>
                                    {product.status === 'draft' && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handlePublish(product.id); }}
                                        disabled={actioningId === product.id}
                                        className="p-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all disabled:opacity-50 flex items-center gap-1"
                                        title="Publicar producto"
                                      >
                                        {actioningId === product.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                        <span className="hidden lg:inline">Publicar</span>
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); }}
                                      className="p-1.5 hover:bg-[var(--surface-2)] border border-transparent hover:border-[color:var(--hairline)] rounded-lg text-ink-6 hover:text-ink-0 transition-all"
                                      title="Ver detalle"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                
                {/* Pagination Footer */}
                {filteredCatalog.length > 0 && (
                  <div className="px-6 py-4 border-t border-[color:var(--hairline)] bg-[var(--surface-1)] flex items-center justify-between">
                    <span className="text-xs text-ink-6 font-bold uppercase tracking-wider block">
                      Mostrando <b className="text-ink-0 px-1">{filteredCatalog.length}</b> de {products.length}
                    </span>
                    <div className="flex gap-2">
                      <button disabled className="px-4 py-2 border border-[color:var(--hairline)] rounded-[var(--r-lg)] text-[13px] font-bold text-ink-7 bg-[var(--surface-0)] opacity-50 cursor-not-allowed">Anterior</button>
                      <button className="px-4 py-2 border border-[color:var(--hairline)] rounded-[var(--r-lg)] text-[13px] font-bold text-ink-0 bg-[var(--surface-0)] hover:bg-[var(--surface-2)] transition-colors shadow-[var(--shadow-soft)]">Siguiente</button>
                    </div>
                  </div>
                )}
              </div>
        </div>
      </div>

      {/* Floating Bulk Actions Toolbar */}
      {selectedRows.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-ink-0 text-ink-12 px-2 py-2 rounded-[var(--r-md)] shadow-[var(--shadow-overlay)] flex items-center gap-1 animate-in slide-in-from-bottom-5 fade-in duration-[var(--dur-base)] z-30">
           <div className="px-3 border-r border-ink-12/15">
             <span className="tabular text-[13px] font-medium">{selectedRows.length} seleccionados</span>
           </div>
           <div className="flex items-center gap-1 px-1">
             <button className="inline-flex items-center gap-2 px-3 h-9 text-[13px] font-medium hover:bg-ink-12/10 rounded-[var(--r-sm)] transition-colors">
               Activar
             </button>
             <button className="inline-flex items-center gap-2 px-3 h-9 text-[13px] font-medium hover:bg-ink-12/10 rounded-[var(--r-sm)] transition-colors">
               Archivar
             </button>
             <button className="inline-flex items-center gap-2 px-3 h-9 text-[13px] font-medium text-ink-12/60 hover:bg-ink-12/10 hover:text-[color:var(--signal-danger)] rounded-[var(--r-sm)] transition-colors">
               <Trash2 className="w-4 h-4" /> Eliminar
             </button>
           </div>
        </div>
      )}

      {/* Drawers */}
      <ProductDrawer
        product={selectedProduct}
        isOpen={selectedProduct !== null}
        onClose={() => setSelectedProduct(null)}
        onProductUpdated={() => router.refresh()}
        focusSection={focusSection}
      />


    </div>
  );
}

// ─── Catalog Intelligence: Signal Chips ───

function SignalChips({
  signals,
  providerName,
  variantCriticalId,
  variantHiddenId,
  variantStuckId,
  variantNegativeId,
  variantUrgentReorderId,
}: {
  signals: CatalogSignal[];
  providerName: string | null;
  variantCriticalId: string | null;
  variantHiddenId: string | null;
  variantStuckId: string | null;
  variantNegativeId: string | null;
  variantUrgentReorderId: string | null;
}) {
  const router = useRouter();

  // Map variant signal keys to their variant IDs and actions
  const variantSignalMap: Record<string, { variantId: string | null; action?: "adjust" | "reorder" }> = {
    variant_critical: { variantId: variantCriticalId, action: "adjust" },
    variant_stuck: { variantId: variantStuckId },
    variant_negative: { variantId: variantNegativeId },
    variant_hidden: { variantId: variantHiddenId }, // Use specific hidden variant ID
    variant_urgent: { variantId: variantUrgentReorderId, action: "reorder" },
  };

  const handleVariantSignalClick = (e: React.MouseEvent, variantId: string, action?: "adjust" | "reorder") => {
    e.stopPropagation();
    if (!variantId) return; // Prevent navigation if variantId is empty
    router.push(buildVariantHref(variantId, action));
  };

  return (
    <div className="flex flex-wrap gap-1 max-w-[220px]">
      {signals.map((s) => {
        const variantInfo = variantSignalMap[s.key];
        const isVariantSignal = variantInfo && variantInfo.variantId;

        return (
          <span
            key={s.key}
            className={cn(
              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors",
              s.severity === "blocker" ? "bg-red-50 text-red-700 border border-red-200" :
              s.severity === "warning" ? "bg-amber-50 text-amber-700 border border-amber-200" :
              s.severity === "ok" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
              "bg-[var(--surface-2)] text-ink-6 border border-[color:var(--hairline)]",
              isVariantSignal && "cursor-pointer hover:bg-opacity-80 underline decoration-dotted underline-offset-2"
            )}
            onClick={(e) => isVariantSignal ? handleVariantSignalClick(e, variantInfo.variantId!, variantInfo.action) : undefined}
            title={isVariantSignal ? "Ver en inventory" : undefined}
          >
            {s.severity === "blocker" && <AlertTriangle className="w-2.5 h-2.5" />}
            {s.severity === "ok" && <CheckCircle2 className="w-2.5 h-2.5" />}
            {s.label}
          </span>
        );
      })}
      {providerName && (
        <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
          {providerName}
        </span>
      )}
    </div>
  );
}
