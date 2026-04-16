"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, PackageOpen, ChevronDown, ChevronRight, Edit2, AlertTriangle, CheckCircle, Clock, PauseCircle, HelpCircle, Pencil, X } from "lucide-react";
import type { VariantIntelligenceReport, VariantIntelligence, ProductVariantSummary, VariantRiskTier, VariantInventoryHealth, VariantInventoryAction } from "@/types/variant-intelligence";
import { InlineReorderPoint } from "./InlineReorderPoint";
import { updateVariantPrice } from "@/lib/store-engine/inventory/queries";

// ─── Inline Price Section (Variant Pricing v1) ───

function InlinePriceSection({ variantId, currentPrice }: { variantId: string; currentPrice: number }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const startEditing = () => {
    setValue(String(currentPrice));
    setError(null);
    setSaved(false);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setError(null);
  };

  const savePrice = () => {
    const parsedPrice = parseFloat(value);
    if (isNaN(parsedPrice) || !isFinite(parsedPrice) || parsedPrice < 0) {
      setError("Precio inválido");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateVariantPrice(variantId, parsedPrice);
      if (result.success) {
        setEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        // Clear focus params after successful action
        router.replace("/admin/inventory", { scroll: false });
      } else {
        setError(result.error || "Error al guardar");
      }
    });
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 mt-0.5">
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); savePrice(); } if (e.key === "Escape") cancelEditing(); }}
          disabled={isPending}
          placeholder="0.00"
          className="w-20 text-[11px] font-bold text-[#111111] tabular-nums bg-white border border-[#EAEAEA] rounded px-1.5 py-0.5 focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-all disabled:opacity-50"
        />
        <button
          onClick={savePrice}
          disabled={isPending}
          className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded transition-all disabled:opacity-40"
          title="Guardar"
        >
          {isPending ? <CheckCircle className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
        </button>
        <button
          onClick={cancelEditing}
          disabled={isPending}
          className="p-0.5 text-gray-400 hover:text-[#111111] hover:bg-gray-100 rounded transition-all disabled:opacity-50"
          title="Cancelar"
        >
          <X className="w-3 h-3" />
        </button>
        {error && <span className="text-[9px] font-bold text-red-500 ml-1">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-0.5">
      {saved ? (
        <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 animate-in fade-in">
          <CheckCircle className="w-2.5 h-2.5" /> Guardado
        </span>
      ) : (
        <>
          <span className="text-[10px] text-gray-400 font-medium">
            ${currentPrice.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <button
            onClick={startEditing}
            className="p-0.5 text-gray-300 hover:text-[#111111] hover:bg-gray-100 rounded transition-all"
            title="Editar precio"
          >
            <Pencil className="w-2.5 h-2.5" />
          </button>
        </>
      )}
    </div>
  );
}

type RiskFilter = "all" | "stockout" | "critical" | "low" | "hidden";

interface VariantRiskPanelProps {
  report: VariantIntelligenceReport;
  onAdjustStock: (variantId: string, productTitle: string, variantTitle: string, stock: number, image: string) => void;
  focusVariantId?: string | null;
  focusAction?: "adjust" | "reorder" | null;
}

const riskStyles: Record<VariantRiskTier, { bg: string; text: string; ring: string; label: string }> = {
  stockout: { bg: "bg-red-50", text: "text-red-700", ring: "ring-red-600/10", label: "Agotada" },
  critical: { bg: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-600/10", label: "Critica" },
  low: { bg: "bg-yellow-50", text: "text-yellow-800", ring: "ring-yellow-600/20", label: "Stock Bajo" },
  healthy: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-600/20", label: "Sana" },
  no_data: { bg: "bg-gray-50", text: "text-gray-500", ring: "ring-gray-300/30", label: "Sin Datos" },
};

function RiskBadge({ risk }: { risk: VariantRiskTier }) {
  const s = riskStyles[risk];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${s.bg} ${s.text} ${s.ring}`}>
      {s.label}
    </span>
  );
}

function HiddenBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset bg-purple-50 text-purple-700 ring-purple-600/10">
      <Eye className="w-3 h-3" /> Riesgo Oculto
    </span>
  );
}

function HealthBadge({ health, action }: { health: VariantInventoryHealth; action: VariantInventoryAction }) {
  const healthStyles: Record<VariantInventoryHealth, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
    critical: { bg: "bg-red-50", text: "text-red-700", icon: <AlertTriangle className="w-3 h-3" />, label: "Crítica" },
    weak: { bg: "bg-orange-50", text: "text-orange-700", icon: <AlertTriangle className="w-3 h-3" />, label: "Débil" },
    stable: { bg: "bg-emerald-50", text: "text-emerald-700", icon: <CheckCircle className="w-3 h-3" />, label: "Estable" },
    stuck: { bg: "bg-gray-100", text: "text-gray-700", icon: <Clock className="w-3 h-3" />, label: "Estancada" },
    uncertain: { bg: "bg-yellow-50", text: "text-yellow-700", icon: <HelpCircle className="w-3 h-3" />, label: "Incierta" },
    no_data: { bg: "bg-gray-50", text: "text-gray-400", icon: <HelpCircle className="w-3 h-3" />, label: "Sin datos" },
  };

  const actionLabels: Record<VariantInventoryAction, string> = {
    reorder: "Reponer",
    push: "Empujar",
    monitor: "Monitorear",
    pause: "Pausar",
    review: "Revisar",
    skip: "Saltar",
  };

  const style = healthStyles[health];
  return (
    <div title={`${style.label} → ${actionLabels[action]}`}>
      <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${style.bg} ${style.text} ring-opacity-10`}>
        {style.icon} {style.label}
      </span>
    </div>
  );
}

export function VariantRiskPanel({ report, onAdjustStock, focusVariantId, focusAction }: VariantRiskPanelProps) {
  const [filter, setFilter] = useState<RiskFilter>("all");
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const { summary, products } = report;

  // Auto-expand product containing the focused variant
  useEffect(() => {
    if (focusVariantId) {
      const productWithFocusedVariant = products.find((p) =>
        p.variants.some((v) => v.variantId === focusVariantId)
      );
      if (productWithFocusedVariant) {
        setExpandedProducts((prev) => new Set([...prev, productWithFocusedVariant.productId]));
      }
    }
  }, [focusVariantId, products]);

  // Filter products based on selected filter
  const filteredProducts = products.filter((p) => {
    if (filter === "all") return (p.stockoutVariants + p.criticalVariants + p.lowVariants) > 0 || p.hasHiddenRisk;
    if (filter === "stockout") return p.stockoutVariants > 0;
    if (filter === "critical") return p.criticalVariants > 0;
    if (filter === "low") return p.lowVariants > 0;
    if (filter === "hidden") return p.hasHiddenRisk;
    return true;
  });

  const toggleProduct = (id: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const totalAtRisk = summary.stockoutVariants + summary.criticalVariants + summary.lowVariants;

  // Filters
  const filters: { label: string; value: RiskFilter; count: number; color?: string }[] = [
    { label: "Con Riesgo", value: "all", count: filteredProducts.length },
    { label: "Agotadas", value: "stockout", count: summary.stockoutVariants, color: "bg-red-200 text-red-800" },
    { label: "Criticas", value: "critical", count: summary.criticalVariants, color: "bg-orange-200 text-orange-800" },
    { label: "Stock Bajo", value: "low", count: summary.lowVariants, color: "bg-yellow-200 text-yellow-800" },
    { label: "Riesgo Oculto", value: "hidden", count: summary.productsWithHiddenRisk, color: "bg-purple-200 text-purple-800" },
  ];

  if (totalAtRisk === 0 && summary.productsWithHiddenRisk === 0) {
    return (
      <div className="px-6 py-24 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 mb-6 border border-emerald-100 shadow-sm">
          <PackageOpen className="w-8 h-8 text-emerald-300" />
        </div>
        <h3 className="text-xl font-extrabold text-[#111111]">Sin variantes en riesgo</h3>
        <p className="text-[15px] font-medium text-[#888888] mt-2 max-w-sm mx-auto">
          Todas las variantes con seguimiento de inventario tienen cobertura adecuada.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary Bar */}
      <div className="px-6 py-4 border-b border-[#EAEAEA] bg-white">
        <div className="flex items-center gap-6 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex items-center gap-2 text-[13px] font-bold transition-colors ${filter === f.value ? "text-[#111111]" : "text-[#888888] hover:text-[#111111]"}`}
            >
              {f.label}
              {f.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold ${filter === f.value && f.color ? f.color : "bg-gray-100 text-gray-500"}`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Product list with variant details */}
      <div className="divide-y divide-[#EAEAEA]/80">
        {filteredProducts.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-[15px] font-medium text-[#888888]">No hay variantes con este filtro.</p>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <ProductRow
              key={product.productId}
              product={product}
              isExpanded={expandedProducts.has(product.productId)}
              onToggle={() => toggleProduct(product.productId)}
              onAdjustStock={onAdjustStock}
              riskFilter={filter}
              focusVariantId={focusVariantId}
              focusAction={focusAction}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {filteredProducts.length > 0 && (
        <div className="px-6 py-4 border-t border-[#EAEAEA] bg-[#FAFAFA]/50">
          <span className="text-xs text-[#888888] font-bold uppercase tracking-wider">
            {filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""} · {totalAtRisk} variante{totalAtRisk !== 1 ? "s" : ""} en riesgo
            {summary.productsWithHiddenRisk > 0 && (
              <span className="text-purple-600 ml-2">· {summary.productsWithHiddenRisk} con riesgo oculto</span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Product Row (collapsible) ───

interface ProductRowProps {
  product: ProductVariantSummary;
  isExpanded: boolean;
  onToggle: () => void;
  onAdjustStock: VariantRiskPanelProps["onAdjustStock"];
  riskFilter: RiskFilter;
  focusVariantId?: string | null;
  focusAction?: "adjust" | "reorder" | null;
}

function ProductRow({
  product,
  isExpanded,
  onToggle,
  onAdjustStock,
  riskFilter,
  focusVariantId,
  focusAction,
}: ProductRowProps) {
  const atRisk = product.stockoutVariants + product.criticalVariants + product.lowVariants;

  // Filter variants shown
  const shownVariants = product.variants.filter((v) => {
    if (riskFilter === "all") return v.risk !== "healthy" && v.risk !== "no_data";
    if (riskFilter === "stockout") return v.risk === "stockout";
    if (riskFilter === "critical") return v.risk === "critical";
    if (riskFilter === "low") return v.risk === "low";
    if (riskFilter === "hidden") return v.hiddenByAggregate;
    return true;
  });

  return (
    <div className={`${product.hasHiddenRisk ? "bg-purple-50/20" : "bg-white"}`}>
      {/* Product header */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center gap-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        <span className="text-gray-400">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[13px] font-bold text-[#111111] truncate">{product.productTitle}</span>
            {product.hasHiddenRisk && <HiddenBadge />}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-[#888888] font-medium">
            <span>{product.totalVariants} variante{product.totalVariants !== 1 ? "s" : ""}</span>
            {product.stockoutVariants > 0 && (
              <span className="text-red-600 font-bold">{product.stockoutVariants} agotada{product.stockoutVariants !== 1 ? "s" : ""}</span>
            )}
            {product.criticalVariants > 0 && (
              <span className="text-orange-600 font-bold">{product.criticalVariants} critica{product.criticalVariants !== 1 ? "s" : ""}</span>
            )}
            {product.lowVariants > 0 && (
              <span className="text-yellow-700 font-bold">{product.lowVariants} baja{product.lowVariants !== 1 ? "s" : ""}</span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${atRisk > 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
            {atRisk} en riesgo
          </span>
        </div>
      </button>

      {/* Expanded variant rows */}
      {isExpanded && shownVariants.length > 0 && (
        <div className="border-t border-[#EAEAEA]/50">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#FAFAFA]/80">
                <th className="px-10 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#888888]">Variante</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#888888] text-right">Precio</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#888888]">Riesgo</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#888888]">Evidencia</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#888888] text-right">Stock</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#888888] text-right">Vel. 30d</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#888888] text-right">Cobertura</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#888888] text-right">Sell-Through</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#888888] text-right">Salud</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#888888] text-right">Contrib/u.</th>
                <th className="px-4 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA]/50">
              {shownVariants.map((v) => (
                <VariantRow
                  key={v.variantId}
                  v={v}
                  onAdjustStock={onAdjustStock}
                  focusVariantId={focusVariantId}
                  focusAction={focusAction}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isExpanded && shownVariants.length === 0 && (
        <div className="px-10 py-4 text-xs text-[#888888] border-t border-[#EAEAEA]/50">
          Ninguna variante coincide con este filtro.
        </div>
      )}
    </div>
  );
}

// ─── Single variant row ───

function VariantRow({
  v,
  onAdjustStock,
  focusVariantId,
  focusAction,
}: {
  v: VariantIntelligence;
  onAdjustStock: VariantRiskPanelProps["onAdjustStock"];
  focusVariantId?: string | null;
  focusAction?: "adjust" | "reorder" | null;
}) {
  const isFocused = focusVariantId === v.variantId;

  return (
    <tr className={`group transition-colors ${v.hiddenByAggregate ? "bg-purple-50/30" : isFocused ? "bg-yellow-50/50 ring-2 ring-yellow-300 ring-inset" : "hover:bg-gray-50/50"}`}>
      <td className="px-10 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          {isFocused && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded ring-1 ring-blue-200">
              TARGET
            </span>
          )}
          <span className="text-[13px] font-bold text-[#111111]">{v.variantTitle}</span>
          {v.hiddenByAggregate && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">oculto</span>
          )}
          {isFocused && focusAction && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded ring-1 ring-orange-200">
              {focusAction === "adjust" ? "Ajustar stock" : focusAction === "reorder" ? "Editar reorden" : ""}
            </span>
          )}
        </div>
        <InlineReorderPoint variantId={v.variantId} currentValue={v.reorderPoint} />
      </td>
      <td className="px-4 py-3 text-right">
        <InlinePriceSection variantId={v.variantId} currentPrice={v.price} />
      </td>
      <td className="px-4 py-3">
        <RiskBadge risk={v.risk} />
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-[#666666] font-medium max-w-[240px] block truncate" title={v.riskEvidence}>
          {v.riskEvidence}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className={`text-sm font-black tabular-nums ${v.available <= 0 ? "text-red-500" : "text-[#111111]"}`}>
          {v.available}
        </span>
        <span className="text-[10px] text-gray-400 ml-0.5">u.</span>
        {v.reservedStock > 0 && (
          <span className="text-[10px] text-orange-500 font-bold ml-1.5">({v.reservedStock} res.)</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {v.unitsSold30d > 0 ? (
          <div>
            <span className="text-xs font-bold tabular-nums text-[#111111]">{v.unitsSold30d}</span>
            <span className="text-[10px] text-gray-400 ml-0.5">u.</span>
            {v.velocityPerDay > 0 && (
              <div className="text-[10px] text-gray-400 font-medium">{v.velocityPerDay}/dia</div>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {v.coverageDays !== null ? (
          <span className={`text-xs font-bold tabular-nums ${v.coverageDays <= 3 ? "text-red-600" : v.coverageDays <= 10 ? "text-yellow-700" : "text-[#111111]"}`}>
            {Math.round(v.coverageDays)}d
          </span>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {v.sellThroughPercent !== null ? (
          <div title={`${v.sellThroughLabel}: ${Math.round(v.sellThroughPercent)}%`}>
            <span className={`text-xs font-bold tabular-nums ${
              v.sellThroughPercent >= 70 ? "text-emerald-700" :
              v.sellThroughPercent >= 40 ? "text-emerald-600" :
              v.sellThroughPercent >= 20 ? "text-yellow-700" :
              "text-red-600"
            }`}>
              {Math.round(v.sellThroughPercent)}%
            </span>
            <div className="text-[9px] text-gray-400">{v.sellThroughLabel}</div>
          </div>
        ) : (
          <span className="text-xs text-gray-300">{v.sellThroughLabel}</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <HealthBadge health={v.health} action={v.action} />
      </td>
      <td className="px-4 py-3 text-right">
        {v.econHealth && v.econHealth !== "no_sales" ? (
          <div title={v.econDataQualityNote || undefined}>
            <span className={`text-xs font-bold tabular-nums ${
              v.econHealth === "negative" ? "text-red-600" :
              v.econHealth === "at_risk" ? "text-orange-600" :
              v.econHealth === "thin" ? "text-yellow-700" :
              "text-[#111111]"
            }`}>
              ${v.contributionPerUnit !== null && v.contributionPerUnit !== undefined ? v.contributionPerUnit.toFixed(2) : "—"}
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </td>
      <td className="px-4 py-3 w-10">
        <button
          onClick={() => onAdjustStock(v.variantId, v.productTitle, v.variantTitle, v.available, "")}
          className="w-8 h-8 rounded-full bg-[#FAFAFA] hover:bg-gray-100 border border-[#EAEAEA] flex items-center justify-center transition-colors"
          title="Ajustar stock"
        >
          <Pencil className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </td>
    </tr>
  );
}
