"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, PackageOpen, AlertCircle, ShoppingCart, Edit2, MoreHorizontal, X } from "lucide-react";
import { InlineReorderPoint } from "./InlineReorderPoint";
import type { AdminInventoryItem } from "@/lib/store-engine/inventory/queries";
import { adjustStock } from "@/lib/store-engine/inventory/queries";
import { StockStatusBadge } from "@/components/admin/inventory/StockBadge";
import { VariantRiskPanel } from "@/components/admin/inventory/VariantRiskPanel";
import type { VariantIntelligenceReport } from "@/types/variant-intelligence";
import Link from "next/link";

type TabValue = "all" | "low_stock" | "out_of_stock" | "reserved" | "variant_risk";

interface InventoryClientProps {
  items: AdminInventoryItem[];
  variantIntel: VariantIntelligenceReport;
  focusVariantId?: string;
  focusAction?: string;
}

export function InventoryClient({ items, variantIntel, focusVariantId, focusAction }: InventoryClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // Adjust stock modal
  const [adjustTarget, setAdjustTarget] = useState<AdminInventoryItem | null>(null);
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustError, setAdjustError] = useState("");
  const [isPending, startTransition] = useTransition();

  // Auto-switch to variant_risk tab when a specific variant is focused from Decision/Command Center
  useEffect(() => {
    if (focusVariantId) {
      setActiveTab("variant_risk");
    }
  }, [focusVariantId]);

  const filteredItems = items.filter((item) => {
    let matchesTab = true;
    if (activeTab === "low_stock") matchesTab = item.status === "low_stock";
    if (activeTab === "out_of_stock") matchesTab = item.status === "out_of_stock";
    if (activeTab === "reserved") matchesTab = item.reservedStock > 0;

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      item.sku.toLowerCase().includes(q) ||
      item.productTitle.toLowerCase().includes(q) ||
      item.variantTitle.toLowerCase().includes(q);

    return matchesTab && matchesSearch;
  });

  const variantRiskCount = variantIntel.summary.stockoutVariants + variantIntel.summary.criticalVariants + variantIntel.summary.lowVariants;

  const tabs: { label: string; value: TabValue; count?: number; badgeColor?: string }[] = [
    { label: "Todo el Inventario", value: "all", count: items.length },
    { label: "Stock Bajo", value: "low_stock", count: items.filter((i) => i.status === "low_stock").length, badgeColor: "bg-yellow-200 text-yellow-800" },
    { label: "Agotado", value: "out_of_stock", count: items.filter((i) => i.status === "out_of_stock").length, badgeColor: "bg-red-200 text-red-800" },
    { label: "Carritos & Reservas", value: "reserved", count: items.filter((i) => i.reservedStock > 0).length },
    { label: "Riesgo por Variante", value: "variant_risk", count: variantRiskCount, badgeColor: variantRiskCount > 0 ? "bg-purple-200 text-purple-800" : undefined },
  ];

  const handleVariantAdjust = (variantId: string, productTitle: string, variantTitle: string, stock: number, image: string) => {
    setAdjustTarget({
      variantId,
      productId: "",
      sku: "",
      productTitle,
      variantTitle,
      image,
      category: "",
      supplier: "",
      stock,
      reservedStock: 0,
      available: stock,
      trackInventory: true,
      reorderPoint: null,
      status: "in_stock",
      productHandle: "",
    });
    setAdjustDelta("");
    setAdjustReason("");
    setAdjustError("");
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedRows(filteredItems.map((p) => p.variantId));
    else setSelectedRows([]);
  };

  const handleSelectRow = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    e.stopPropagation();
    if (e.target.checked) setSelectedRows((prev) => [...prev, id]);
    else setSelectedRows((prev) => prev.filter((r) => r !== id));
  };

  const openAdjust = (item: AdminInventoryItem) => {
    setAdjustTarget(item);
    setAdjustDelta("");
    setAdjustReason("");
    setAdjustError("");
  };

  const handleAdjust = () => {
    if (!adjustTarget) return;
    const delta = parseInt(adjustDelta);
    if (isNaN(delta) || delta === 0) {
      setAdjustError("Ingresá una cantidad válida distinta a 0");
      return;
    }
    if (!adjustReason.trim()) {
      setAdjustError("Ingresá la razón del ajuste");
      return;
    }

    startTransition(async () => {
      const result = await adjustStock(adjustTarget.variantId, delta, adjustReason);
      if (result.success) {
        setAdjustTarget(null);
        // Clear focus params after successful action to remove visual highlight
        router.replace("/admin/inventory", { scroll: false });
      } else {
        setAdjustError(result.error || "Error al ajustar stock");
      }
    });
  };

  const outOfStockCount = items.filter((i) => i.status === "out_of_stock").length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-[#111111]">Control de Inventario</h1>
            {outOfStockCount > 0 && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-red-50 border border-red-100 text-red-700 text-[10px] font-black uppercase tracking-widest rounded-md shadow-sm">
                <AlertCircle className="w-3 h-3" /> {outOfStockCount} agotado{outOfStockCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-[#666666] text-[15px] mt-1 font-medium">Stock real por variante de producto. Datos en tiempo real desde la base de datos.</p>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white border rounded-2xl border-[#EAEAEA] shadow-sm overflow-hidden relative">
        {/* Tabs */}
        <div className="flex items-center gap-8 px-6 border-b border-[#EAEAEA] overflow-x-auto no-scrollbar bg-[#FAFAFA]/50">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`relative py-4 text-[13px] font-bold whitespace-nowrap transition-colors flex items-center gap-2 group
                ${activeTab === tab.value ? "text-[#111111]" : "text-[#888888] hover:text-[#111111]"}`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold transition-colors 
                   ${activeTab === tab.value ? (tab.badgeColor ? tab.badgeColor : "bg-gray-200 text-[#111111]") : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"}`}
                >
                  {tab.count}
                </span>
              )}
              {activeTab === tab.value && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#111111] rounded-t-full" />}
            </button>
          ))}
        </div>

        {/* Variant Risk Panel (separate view) */}
        {activeTab === "variant_risk" ? (
          <VariantRiskPanel report={variantIntel} onAdjustStock={handleVariantAdjust} focusVariantId={focusVariantId} focusAction={(focusAction as "adjust" | "reorder" | null)} />
        ) : (
        <>
        {/* Toolbar */}
        <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-white border-b border-[#EAEAEA]">
          <div className="relative w-full md:w-[400px] group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
            <input
              type="text"
              placeholder="Buscar por SKU, producto o variante..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-[13px] font-medium bg-gray-50 border border-transparent rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-[#111111] transition-all placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Table */}
        <div className="min-h-[400px] bg-[#FAFAFA]/30">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888] w-12">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedRows.length === filteredItems.length && filteredItems.length > 0}
                      className="w-4 h-4 rounded border-gray-300 text-[#111111] focus:ring-[#111111] cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888]">SKU / Ítem</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888]">Origen</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888]">Estado</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888] text-right">Reservado</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888] text-right">Disponible</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#888888] text-right">Reorden</th>
                  <th className="px-6 py-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEAEA]/80">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-24 text-center">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 mb-6 border border-gray-100 shadow-sm">
                        <PackageOpen className="w-8 h-8 text-gray-300" />
                      </div>
                      <h3 className="text-xl font-extrabold text-[#111111]">No hay inventario aquí</h3>
                      <p className="text-[15px] font-medium text-[#888888] mt-2 max-w-sm mx-auto">No hay variantes que coincidan con estos filtros.</p>
                      <button
                        onClick={() => { setSearchQuery(""); setActiveTab("all"); }}
                        className="mt-6 px-6 py-2.5 bg-white border border-[#EAEAEA] text-[#111111] font-bold text-[13px] rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        Limpiar Filtros
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isSelected = selectedRows.includes(item.variantId);
                    return (
                      <tr
                        key={item.variantId}
                        className={`group transition-all ${isSelected ? "bg-emerald-50/30" : "hover:bg-gray-50/50 bg-white"}`}
                      >
                        <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectRow(e, item.variantId)}
                            className="w-4 h-4 rounded border-gray-300 text-[#111111] focus:ring-[#111111] cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 overflow-hidden shadow-sm shrink-0">
                              {item.image ? (
                                <img src={item.image} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300"><PackageOpen className="w-5 h-5" /></div>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest font-mono mb-0.5">{item.sku}</span>
                              <span className="text-[13px] font-bold text-[#111111] truncate max-w-[200px]">{item.productTitle}</span>
                              {item.variantTitle !== "Default" && (
                                <span className="text-xs font-medium text-gray-400 mt-0.5">{item.variantTitle}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`text-[11px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${item.supplier === "Propio" ? "bg-gray-100 text-gray-700" : "bg-blue-50 text-blue-700"}`}>
                            {item.supplier}
                          </span>
                        </td>
                        <td className="px-6 py-5"><StockStatusBadge status={item.status} /></td>
                        <td className="px-6 py-5 text-right">
                          {item.reservedStock > 0 ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md">
                              <ShoppingCart className="w-3 h-3" /> {item.reservedStock} u.
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right font-black tabular-nums tracking-tight text-[15px]">
                          {item.available > 0 ? (
                            <span className="text-[#111111]">{item.available} <span className="text-gray-400 text-xs font-semibold ml-0.5">u.</span></span>
                          ) : (
                            <span className="text-red-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <InlineReorderPoint variantId={item.variantId} currentValue={item.reorderPoint} />
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                            <button
                              onClick={() => openAdjust(item)}
                              className="p-2 hover:bg-white border hover:border-[#EAEAEA] border-transparent shadow-sm rounded-lg text-gray-500 hover:text-[#111111] transition-all"
                              title="Ajustar stock"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <Link
                              href={`/admin/catalog`}
                              className="p-2 hover:bg-white border hover:border-[#EAEAEA] border-transparent shadow-sm rounded-lg text-gray-500 hover:text-[#111111] transition-all"
                              title="Ver en catálogo"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Count */}
        {filteredItems.length > 0 && (
          <div className="px-6 py-4 border-t border-[#EAEAEA] bg-[#FAFAFA]/50 flex items-center justify-between">
            <span className="text-xs text-[#888888] font-bold uppercase tracking-wider block">
              Resultados: <b className="text-[#111111] px-1">{filteredItems.length}</b> variantes
            </span>
          </div>
        )}
        </>
        )}
      </div>

      {/* Adjust Stock Modal */}
      {adjustTarget && (
        <>
          <div className="fixed inset-0 bg-[#111111]/30 backdrop-blur-[2px] z-40" onClick={() => !isPending && setAdjustTarget(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-[#EAEAEA] rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-5 border-b border-[#EAEAEA] flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-[#111111]">Ajustar Stock</h3>
                <button onClick={() => !isPending && setAdjustTarget(null)} className="p-2 text-gray-400 hover:text-[#111111] hover:bg-gray-100 rounded-full transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 border border-[#EAEAEA] overflow-hidden shrink-0">
                    {adjustTarget.image ? <img src={adjustTarget.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100" />}
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest font-mono">{adjustTarget.sku}</p>
                    <p className="text-sm font-bold text-[#111111]">{adjustTarget.productTitle}</p>
                    {adjustTarget.variantTitle !== "Default" && <p className="text-xs text-gray-500">{adjustTarget.variantTitle}</p>}
                  </div>
                </div>

                <div className="bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl p-4 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Stock actual</span>
                  <span className="text-lg font-black text-[#111111] tabular-nums">{adjustTarget.stock} u.</span>
                </div>

                {adjustError && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium">{adjustError}</div>
                )}

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Ajuste (+ ingreso, - egreso)</label>
                  <input
                    type="number"
                    value={adjustDelta}
                    onChange={(e) => { setAdjustDelta(e.target.value); setAdjustError(""); }}
                    placeholder="Ej: +50 o -10"
                    className="w-full px-4 py-3 text-sm font-bold bg-white border border-[#EAEAEA] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-[#111111] tabular-nums"
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Razón del ajuste</label>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => { setAdjustReason(e.target.value); setAdjustError(""); }}
                    placeholder="Ej: Ingreso de proveedor, merma, conteo físico..."
                    className="w-full px-4 py-3 text-sm font-medium bg-white border border-[#EAEAEA] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-[#111111]"
                    disabled={isPending}
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-[#EAEAEA] bg-[#FAFAFA]/50 flex items-center justify-end gap-3 rounded-b-2xl">
                <button
                  onClick={() => !isPending && setAdjustTarget(null)}
                  disabled={isPending}
                  className="px-5 py-2.5 text-[13px] font-bold text-[#111111] bg-white border border-[#EAEAEA] rounded-xl hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAdjust}
                  disabled={isPending}
                  className="px-5 py-2.5 text-[13px] font-bold text-white bg-[#111111] rounded-xl hover:bg-black transition-all shadow-md shadow-black/10 disabled:opacity-50"
                >
                  {isPending ? "Aplicando..." : "Confirmar Ajuste"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bulk Toolbar */}
      {selectedRows.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#111111] text-white px-2 py-2 rounded-2xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-5 fade-in duration-300 z-30">
          <div className="px-4 border-r border-gray-700">
            <span className="text-[13px] font-bold">{selectedRows.length} ítems</span>
          </div>
          <div className="flex items-center gap-1 px-2">
            <button onClick={() => setSelectedRows([])} className="px-4 py-2 text-[13px] font-bold hover:bg-gray-800 rounded-xl transition-colors">
              Deseleccionar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
