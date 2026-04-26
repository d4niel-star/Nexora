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

  const tabs: { label: string; value: TabValue; count?: number }[] = [
    { label: "Todo el inventario", value: "all", count: items.length },
    { label: "Stock bajo", value: "low_stock", count: items.filter((i) => i.status === "low_stock").length },
    { label: "Agotado", value: "out_of_stock", count: items.filter((i) => i.status === "out_of_stock").length },
    { label: "Carritos y reservas", value: "reserved", count: items.filter((i) => i.reservedStock > 0).length },
    { label: "Riesgo por variante", value: "variant_risk", count: variantRiskCount },
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
      {/* Header — matches Catalog scale for a coherent operational tone */}
      <header className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold leading-[1.1] tracking-[-0.025em] text-ink-0 md:text-[28px]">Inventario</h1>
            {outOfStockCount > 0 && (
              <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-[color:var(--signal-danger)] text-[10px] font-medium uppercase tracking-[0.14em]">
                <AlertCircle className="w-3 h-3" strokeWidth={1.75} /> {outOfStockCount} agotado{outOfStockCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] leading-[1.5] text-ink-5">Stock real por variante. Ajustá ingresos, mermas o conteos físicos en cualquier momento.</p>
        </div>
      </header>

      {/* Main panel — same elevation utility as Catalog for visual coherence */}
      <section className="elev-card-strong relative overflow-hidden rounded-[var(--r-lg)]">
        {/* Tabs */}
        <div className="flex items-center gap-8 px-6 border-b border-[color:var(--hairline)] overflow-x-auto no-scrollbar bg-[var(--surface-1)]">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`relative py-4 text-[13px] font-medium whitespace-nowrap transition-colors flex items-center gap-2 group
                ${activeTab === tab.value ? "text-ink-0" : "text-ink-5 hover:text-ink-0"}`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`tabular inline-flex items-center h-5 px-1.5 rounded-[var(--r-xs)] text-[10px] font-medium uppercase tracking-[0.14em] transition-colors ${activeTab === tab.value ? "bg-[var(--surface-2)] text-ink-0" : "bg-transparent text-ink-6 group-hover:bg-[var(--surface-2)]"}`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.value && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink-0" />}
            </button>
          ))}
        </div>

        {/* Variant Risk Panel (separate view) */}
        {activeTab === "variant_risk" ? (
          <VariantRiskPanel report={variantIntel} onAdjustStock={handleVariantAdjust} focusVariantId={focusVariantId} focusAction={(focusAction as "adjust" | "reorder" | null)} />
        ) : (
        <>
        {/* Toolbar */}
        <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-[var(--surface-0)] border-b border-[color:var(--hairline)]">
          <div className="relative w-full md:w-[400px] group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-6 group-focus-within:text-ink-0 transition-colors" strokeWidth={1.75} />
            <input
              type="text"
              placeholder="Buscar por SKU, producto o variante…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 h-10 text-[13px] bg-[var(--surface-1)] border border-[color:var(--hairline)] rounded-[var(--r-sm)] outline-none transition-[box-shadow,border-color] focus:bg-[var(--surface-0)] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)] text-ink-0 placeholder:text-ink-6"
            />
          </div>
        </div>

        {/* Table */}
        <div className="min-h-[400px] bg-[var(--surface-0)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-[color:var(--hairline)] bg-[var(--surface-1)]">
                  <th className="px-6 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 w-12">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedRows.length === filteredItems.length && filteredItems.length > 0}
                      className="w-4 h-4 rounded-[var(--r-xs)] border-[color:var(--hairline-strong)] accent-ink-0 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">SKU / ítem</th>
                  <th className="px-6 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Origen</th>
                  <th className="px-6 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Estado</th>
                  <th className="px-6 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 text-right">Reservado</th>
                  <th className="px-6 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 text-right">Disponible</th>
                  <th className="px-6 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 text-right">Reorden</th>
                  <th className="px-6 py-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--hairline)]">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-24 text-center">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] mb-6">
                        <PackageOpen className="w-5 h-5 text-ink-5" strokeWidth={1.5} />
                      </div>
                      <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-ink-0">No hay inventario aquí.</h3>
                      <p className="text-[13px] leading-[1.55] text-ink-5 mt-2 max-w-sm mx-auto">No hay variantes que coincidan con estos filtros.</p>
                      <button
                        onClick={() => { setSearchQuery(""); setActiveTab("all"); }}
                        className="mt-6 inline-flex items-center h-10 px-5 bg-[var(--surface-0)] border border-[color:var(--hairline-strong)] text-ink-0 text-[13px] font-medium rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] transition-colors"
                      >
                        Limpiar filtros
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isSelected = selectedRows.includes(item.variantId);
                    return (
                      <tr
                        key={item.variantId}
                        className={`group transition-colors ${isSelected ? "bg-[var(--surface-2)]" : "hover:bg-[var(--surface-1)] bg-[var(--surface-0)]"}`}
                      >
                        <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectRow(e, item.variantId)}
                            className="w-4 h-4 rounded-[var(--r-xs)] border-[color:var(--hairline-strong)] accent-ink-0 cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-[var(--r-sm)] bg-[var(--surface-1)] border border-[color:var(--hairline)] overflow-hidden shrink-0">
                              {item.image ? (
                                <img src={item.image} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-ink-6"><PackageOpen className="w-4 h-4" strokeWidth={1.5} /></div>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-medium text-ink-5 uppercase tracking-[0.14em] font-mono mb-0.5">{item.sku}</span>
                              <span className="text-[13px] font-medium text-ink-0 truncate max-w-[200px]">{item.productTitle}</span>
                              {item.variantTitle !== "Default" && (
                                <span className="text-[11px] font-medium text-ink-5 mt-0.5">{item.variantTitle}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="inline-flex items-center h-6 px-2 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-[color:var(--signal-warning)] text-[10px] font-medium uppercase tracking-[0.14em]">
                            {item.supplier}
                          </span>
                        </td>
                        <td className="px-6 py-5"><StockStatusBadge status={item.status} /></td>
                        <td className="px-6 py-5 text-right">
                          {item.reservedStock > 0 ? (
                            <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-[color:var(--signal-warning)] text-[10px] font-medium uppercase tracking-[0.14em]">
                              <ShoppingCart className="w-3 h-3" strokeWidth={1.75} /> {item.reservedStock} u.
                            </span>
                          ) : (
                            <span className="text-[10px] text-ink-6">—</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right font-semibold tabular-nums tracking-[-0.01em] text-[15px]">
                          {item.available > 0 ? (
                            <span className="text-ink-0">{item.available} <span className="text-ink-5 text-[11px] font-medium ml-0.5">u.</span></span>
                          ) : (
                            <span className="text-[color:var(--signal-danger)]">—</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <InlineReorderPoint variantId={item.variantId} currentValue={item.reorderPoint} />
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                            <button
                              onClick={() => openAdjust(item)}
                              className="p-2 hover:bg-[var(--surface-2)] border hover:border-[color:var(--hairline)] border-transparent rounded-[var(--r-sm)] text-ink-5 hover:text-ink-0 transition-colors"
                              title="Ajustar stock"
                            >
                              <Edit2 className="w-4 h-4" strokeWidth={1.75} />
                            </button>
                            <Link
                              href={`/admin/catalog`}
                              className="p-2 hover:bg-[var(--surface-2)] border hover:border-[color:var(--hairline)] border-transparent rounded-[var(--r-sm)] text-ink-5 hover:text-ink-0 transition-colors"
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
          <div className="px-6 py-3 border-t border-[color:var(--hairline)] bg-[var(--surface-1)] flex items-center justify-between">
            <span className="text-[10px] text-ink-5 font-medium uppercase tracking-[0.14em] block">
              Resultados: <b className="text-ink-0 px-1 font-semibold">{filteredItems.length}</b> variantes
            </span>
          </div>
        )}
        </>
        )}
      </section>

      {/* Adjust Stock Modal */}
      {adjustTarget && (
        <>
          <div className="fixed inset-0 bg-ink-0/40 z-40" onClick={() => !isPending && setAdjustTarget(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--surface-0)] border border-[color:var(--hairline)] rounded-[var(--r-md)] shadow-[var(--shadow-overlay)] w-full max-w-md animate-in fade-in zoom-in-95 duration-[var(--dur-slow)]">
              <div className="px-6 py-5 border-b border-[color:var(--hairline)] flex items-center justify-between">
                <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-ink-0">Ajustar stock</h3>
                <button onClick={() => !isPending && setAdjustTarget(null)} className="p-2 text-ink-5 hover:text-ink-0 hover:bg-[var(--surface-2)] rounded-[var(--r-sm)] transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-[var(--r-sm)] bg-[var(--surface-1)] border border-[color:var(--hairline)] overflow-hidden shrink-0">
                    {adjustTarget.image ? <img src={adjustTarget.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full" />}
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-ink-5 uppercase tracking-[0.14em] font-mono">{adjustTarget.sku}</p>
                    <p className="text-[14px] font-medium text-ink-0">{adjustTarget.productTitle}</p>
                    {adjustTarget.variantTitle !== "Default" && <p className="text-[11px] text-ink-5">{adjustTarget.variantTitle}</p>}
                  </div>
                </div>

                <div className="bg-[var(--surface-1)] border border-[color:var(--hairline)] rounded-[var(--r-sm)] p-4 flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Stock actual</span>
                  <span className="text-[18px] font-semibold text-ink-0 tabular-nums">{adjustTarget.stock} u.</span>
                </div>

                {adjustError && (
                  <div className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-[color:var(--signal-danger)] p-3 text-[13px] font-medium">{adjustError}</div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-ink-5">Ajuste (+ ingreso, − egreso)</label>
                  <input
                    type="number"
                    value={adjustDelta}
                    onChange={(e) => { setAdjustDelta(e.target.value); setAdjustError(""); }}
                    placeholder="Ej: +50 o -10"
                    className="w-full px-3.5 h-11 text-[14px] font-medium bg-[var(--surface-0)] border border-[color:var(--hairline)] rounded-[var(--r-sm)] outline-none transition-[box-shadow,border-color] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)] text-ink-0 tabular-nums"
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-ink-5">Razón del ajuste</label>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => { setAdjustReason(e.target.value); setAdjustError(""); }}
                    placeholder="Ej: ingreso de proveedor, merma, conteo físico…"
                    className="w-full px-3.5 h-11 text-[14px] bg-[var(--surface-0)] border border-[color:var(--hairline)] rounded-[var(--r-sm)] outline-none transition-[box-shadow,border-color] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)] text-ink-0"
                    disabled={isPending}
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-[color:var(--hairline)] bg-[var(--surface-1)] flex items-center justify-end gap-2">
                <button
                  onClick={() => !isPending && setAdjustTarget(null)}
                  disabled={isPending}
                  className="inline-flex items-center h-10 px-4 text-[13px] font-medium text-ink-0 bg-[var(--surface-0)] border border-[color:var(--hairline-strong)] rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAdjust}
                  disabled={isPending}
                  className="inline-flex items-center h-10 px-5 text-[13px] font-medium text-ink-12 bg-ink-0 rounded-[var(--r-sm)] hover:bg-ink-2 transition-colors disabled:opacity-50"
                >
                  {isPending ? "Aplicando…" : "Confirmar ajuste"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bulk Toolbar */}
      {selectedRows.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-ink-0 text-ink-12 px-2 h-12 rounded-[var(--r-md)] shadow-[var(--shadow-overlay)] flex items-center gap-2 animate-in slide-in-from-bottom-5 fade-in duration-[var(--dur-slow)] z-30">
          <div className="px-4 border-r border-ink-12/15">
            <span className="text-[13px] font-medium">{selectedRows.length} ítems</span>
          </div>
          <div className="flex items-center gap-1 px-2">
            <button onClick={() => setSelectedRows([])} className="px-3 h-8 text-[12px] font-medium hover:bg-ink-12/10 rounded-[var(--r-sm)] transition-colors">
              Deseleccionar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
