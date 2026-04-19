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
          className="w-20 text-[11px] font-medium text-ink-0 tabular-nums bg-[var(--surface-0)] border border-[color:var(--hairline)] rounded-[var(--r-xs)] px-1.5 py-0.5 outline-none focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)] transition-[box-shadow,border-color] disabled:opacity-50"
        />
        <button
          onClick={savePrice}
          disabled={isPending}
          className="p-0.5 text-[color:var(--signal-success)] hover:bg-[var(--surface-2)] rounded-[var(--r-xs)] transition-colors disabled:opacity-40"
          title="Guardar"
        >
          {isPending ? <CheckCircle className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
        </button>
        <button
          onClick={cancelEditing}
          disabled={isPending}
          className="p-0.5 text-ink-6 hover:text-ink-0 hover:bg-[var(--surface-2)] rounded-[var(--r-xs)] transition-colors disabled:opacity-50"
          title="Cancelar"
        >
          <X className="w-3 h-3" />
        </button>
        {error && <span className="text-[9px] font-medium text-[color:var(--signal-danger)] ml-1">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-0.5">
      {saved ? (
        <span className="flex items-center gap-0.5 text-[10px] font-medium text-[color:var(--signal-success)] animate-in fade-in">
          <CheckCircle className="w-2.5 h-2.5" strokeWidth={2} /> Guardado
        </span>
      ) : (
        <>
          <span className="text-[10px] text-ink-5 font-medium tabular-nums">
            ${currentPrice.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <button
            onClick={startEditing}
            className="p-0.5 text-ink-6 hover:text-ink-0 hover:bg-[var(--surface-2)] rounded-[var(--r-xs)] transition-colors"
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

const chipBase = "inline-flex items-center h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-medium uppercase tracking-[0.14em]";

const riskTone: Record<VariantRiskTier, { tone: string; label: string }> = {
  stockout: { tone: "text-[color:var(--signal-danger)]", label: "Agotada" },
  critical: { tone: "text-[color:var(--signal-danger)]", label: "Crítica" },
  low: { tone: "text-[color:var(--signal-warning)]", label: "Stock bajo" },
  healthy: { tone: "text-[color:var(--signal-success)]", label: "Sana" },
  no_data: { tone: "text-ink-5", label: "Sin datos" },
};

function RiskBadge({ risk }: { risk: VariantRiskTier }) {
  const r = riskTone[risk];
  return (
    <span className={`${chipBase} ${r.tone}`}>
      {r.label}
    </span>
  );
}

function HiddenBadge() {
  return (
    <span className={`${chipBase} gap-1 text-ink-4`}>
      <Eye className="w-3 h-3" strokeWidth={1.75} /> Riesgo oculto
    </span>
  );
}

function HealthBadge({ health, action }: { health: VariantInventoryHealth; action: VariantInventoryAction }) {
  const healthStyles: Record<VariantInventoryHealth, { tone: string; icon: React.ReactNode; label: string }> = {
    critical: { tone: "text-[color:var(--signal-danger)]", icon: <AlertTriangle className="w-3 h-3" strokeWidth={1.75} />, label: "Crítica" },
    weak: { tone: "text-[color:var(--signal-warning)]", icon: <AlertTriangle className="w-3 h-3" strokeWidth={1.75} />, label: "Débil" },
    stable: { tone: "text-[color:var(--signal-success)]", icon: <CheckCircle className="w-3 h-3" strokeWidth={1.75} />, label: "Estable" },
    stuck: { tone: "text-ink-4", icon: <Clock className="w-3 h-3" strokeWidth={1.75} />, label: "Estancada" },
    uncertain: { tone: "text-[color:var(--signal-warning)]", icon: <HelpCircle className="w-3 h-3" strokeWidth={1.75} />, label: "Incierta" },
    no_data: { tone: "text-ink-6", icon: <HelpCircle className="w-3 h-3" strokeWidth={1.75} />, label: "Sin datos" },
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
      <span className={`${chipBase} gap-1 ${style.tone}`}>
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
  const filters: { label: string; value: RiskFilter; count: number }[] = [
    { label: "Con riesgo", value: "all", count: filteredProducts.length },
    { label: "Agotadas", value: "stockout", count: summary.stockoutVariants },
    { label: "Críticas", value: "critical", count: summary.criticalVariants },
    { label: "Stock bajo", value: "low", count: summary.lowVariants },
    { label: "Riesgo oculto", value: "hidden", count: summary.productsWithHiddenRisk },
  ];

  if (totalAtRisk === 0 && summary.productsWithHiddenRisk === 0) {
    return (
      <div className="px-6 py-24 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] mb-6 text-[color:var(--signal-success)]">
          <PackageOpen className="w-5 h-5" strokeWidth={1.5} />
        </div>
        <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-ink-0">Sin variantes en riesgo.</h3>
        <p className="text-[13px] leading-[1.55] text-ink-5 mt-2 max-w-sm mx-auto">
          Todas las variantes con seguimiento de inventario tienen cobertura adecuada.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary Bar */}
      <div className="px-6 py-4 border-b border-[color:var(--hairline)] bg-[var(--surface-0)]">
        <div className="flex items-center gap-5 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex items-center gap-2 text-[12px] font-medium transition-colors ${filter === f.value ? "text-ink-0" : "text-ink-5 hover:text-ink-0"}`}
            >
              {f.label}
              {f.count > 0 && (
                <span className={`tabular inline-flex items-center h-5 px-1.5 rounded-[var(--r-xs)] text-[10px] font-medium uppercase tracking-[0.14em] ${filter === f.value ? "bg-[var(--surface-2)] text-ink-0" : "bg-[var(--surface-1)] text-ink-5"}`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Product list with variant details */}
      <div className="divide-y divide-[color:var(--hairline)]">
        {filteredProducts.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-[13px] text-ink-5">No hay variantes con este filtro.</p>
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
        <div className="px-6 py-3 border-t border-[color:var(--hairline)] bg-[var(--surface-1)]">
          <span className="text-[10px] text-ink-5 font-medium uppercase tracking-[0.14em]">
            {filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""} · {totalAtRisk} variante{totalAtRisk !== 1 ? "s" : ""} en riesgo
            {summary.productsWithHiddenRisk > 0 && (
              <span className="text-ink-4 ml-2">· {summary.productsWithHiddenRisk} con riesgo oculto</span>
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
    <div className="bg-[var(--surface-0)]">
      {/* Product header */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center gap-4 text-left hover:bg-[var(--surface-1)] transition-colors"
      >
        <span className="text-ink-5">
          {isExpanded ? <ChevronDown className="w-4 h-4" strokeWidth={1.75} /> : <ChevronRight className="w-4 h-4" strokeWidth={1.75} />}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[13px] font-medium text-ink-0 truncate">{product.productTitle}</span>
            {product.hasHiddenRisk && <HiddenBadge />}
          </div>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-ink-5 font-medium">
            <span>{product.totalVariants} variante{product.totalVariants !== 1 ? "s" : ""}</span>
            {product.stockoutVariants > 0 && (
              <span className="text-[color:var(--signal-danger)]">{product.stockoutVariants} agotada{product.stockoutVariants !== 1 ? "s" : ""}</span>
            )}
            {product.criticalVariants > 0 && (
              <span className="text-[color:var(--signal-danger)]">{product.criticalVariants} crítica{product.criticalVariants !== 1 ? "s" : ""}</span>
            )}
            {product.lowVariants > 0 && (
              <span className="text-[color:var(--signal-warning)]">{product.lowVariants} baja{product.lowVariants !== 1 ? "s" : ""}</span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className={`inline-flex items-center h-6 px-2 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-[10px] font-medium uppercase tracking-[0.14em] ${atRisk > 0 ? "text-[color:var(--signal-danger)]" : "text-[color:var(--signal-success)]"}`}>
            {atRisk} en riesgo
          </span>
        </div>
      </button>

      {/* Expanded variant rows */}
      {isExpanded && shownVariants.length > 0 && (
        <div className="border-t border-[color:var(--hairline)]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--surface-1)] border-b border-[color:var(--hairline)]">
                <th className="px-10 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Variante</th>
                <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 text-right">Precio</th>
                <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Riesgo</th>
                <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Evidencia</th>
                <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 text-right">Stock</th>
                <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 text-right">Vel. 30d</th>
                <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 text-right">Cobertura</th>
                <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 text-right">Sell-through</th>
                <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 text-right">Salud</th>
                <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 text-right">Contrib/u.</th>
                <th className="px-4 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--hairline)]">
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
        <div className="px-10 py-4 text-[12px] text-ink-5 border-t border-[color:var(--hairline)]">
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
    <tr className={`group transition-colors ${isFocused ? "bg-[var(--surface-2)] ring-1 ring-ink-0/30 ring-inset" : v.hiddenByAggregate ? "bg-[var(--surface-1)]" : "hover:bg-[var(--surface-1)] bg-[var(--surface-0)]"}`}>
      <td className="px-10 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          {isFocused && (
            <span className="inline-flex items-center h-4 px-1.5 rounded-[var(--r-xs)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-[9px] font-medium uppercase tracking-[0.14em] text-ink-0">
              Target
            </span>
          )}
          <span className="text-[13px] font-medium text-ink-0">{v.variantTitle}</span>
          {v.hiddenByAggregate && (
            <span className="inline-flex items-center h-4 px-1.5 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-[9px] font-medium uppercase tracking-[0.14em] text-ink-5">Oculto</span>
          )}
          {isFocused && focusAction && (
            <span className="inline-flex items-center h-4 px-1.5 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-[9px] font-medium uppercase tracking-[0.14em] text-[color:var(--signal-warning)]">
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
        <span className="text-[11px] text-ink-4 font-medium max-w-[240px] block truncate" title={v.riskEvidence}>
          {v.riskEvidence}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className={`text-[13px] font-semibold tabular-nums ${v.available <= 0 ? "text-[color:var(--signal-danger)]" : "text-ink-0"}`}>
          {v.available}
        </span>
        <span className="text-[10px] text-ink-6 ml-0.5">u.</span>
        {v.reservedStock > 0 && (
          <span className="text-[10px] text-[color:var(--signal-warning)] font-medium ml-1.5">({v.reservedStock} res.)</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {v.unitsSold30d > 0 ? (
          <div>
            <span className="text-[11px] font-semibold tabular-nums text-ink-0">{v.unitsSold30d}</span>
            <span className="text-[10px] text-ink-6 ml-0.5">u.</span>
            {v.velocityPerDay > 0 && (
              <div className="text-[10px] text-ink-5 font-medium">{v.velocityPerDay}/día</div>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-ink-6">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {v.coverageDays !== null ? (
          <span className={`text-[11px] font-semibold tabular-nums ${v.coverageDays <= 3 ? "text-[color:var(--signal-danger)]" : v.coverageDays <= 10 ? "text-[color:var(--signal-warning)]" : "text-ink-0"}`}>
            {Math.round(v.coverageDays)}d
          </span>
        ) : (
          <span className="text-[11px] text-ink-6">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {v.sellThroughPercent !== null ? (
          <div title={`${v.sellThroughLabel}: ${Math.round(v.sellThroughPercent)}%`}>
            <span className={`text-[11px] font-semibold tabular-nums ${
              v.sellThroughPercent >= 40 ? "text-[color:var(--signal-success)]" :
              v.sellThroughPercent >= 20 ? "text-[color:var(--signal-warning)]" :
              "text-[color:var(--signal-danger)]"
            }`}>
              {Math.round(v.sellThroughPercent)}%
            </span>
            <div className="text-[9px] text-ink-6">{v.sellThroughLabel}</div>
          </div>
        ) : (
          <span className="text-[11px] text-ink-6">{v.sellThroughLabel}</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <HealthBadge health={v.health} action={v.action} />
      </td>
      <td className="px-4 py-3 text-right">
        {v.econHealth && v.econHealth !== "no_sales" ? (
          <div title={v.econDataQualityNote || undefined}>
            <span className={`text-[11px] font-semibold tabular-nums ${
              v.econHealth === "negative" ? "text-[color:var(--signal-danger)]" :
              v.econHealth === "at_risk" ? "text-[color:var(--signal-warning)]" :
              v.econHealth === "thin" ? "text-[color:var(--signal-warning)]" :
              "text-ink-0"
            }`}>
              ${v.contributionPerUnit !== null && v.contributionPerUnit !== undefined ? v.contributionPerUnit.toFixed(2) : "—"}
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-ink-6">—</span>
        )}
      </td>
      <td className="px-4 py-3 w-10">
        <button
          onClick={() => onAdjustStock(v.variantId, v.productTitle, v.variantTitle, v.available, "")}
          className="w-8 h-8 rounded-[var(--r-sm)] bg-[var(--surface-0)] hover:bg-[var(--surface-2)] border border-[color:var(--hairline)] flex items-center justify-center transition-colors text-ink-5 hover:text-ink-0"
          title="Ajustar stock"
        >
          <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
      </td>
    </tr>
  );
}
