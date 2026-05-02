"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Edit,
  Filter as FilterIcon,
  Loader2,
  Package,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Product, CatalogSignal } from "../../../types/product";
import { publishDraftProduct } from "@/app/admin/ai/execution-actions";
import {
  deleteProductsAction,
  setProductsStatusAction,
} from "@/lib/store-engine/catalog/actions";
import { buildVariantHref } from "@/lib/navigation/hrefs";

import { ProductStatusBadge } from "../../../components/admin/catalog/ProductStatusBadge";
import { ProductDrawer } from "../../../components/admin/catalog/ProductDrawer";
import { ManualProductModal } from "../../../components/admin/catalog/ManualProductModal";
import {
  NexoraPageHeader,
  NexoraTableShell,
  NexoraCmdBar,
  NexoraSearch,
  NexoraFilters,
  NexoraActions,
  NexoraBulkBar,
  NexoraEmpty,
  NexoraTabs,
} from "@/components/admin/nexora";

// ─── Catalog admin surface ────────────────────────────────────────────────
//
// Single client component for `/admin/catalog`. It receives a fully hydrated
// list of products from the server (see `./page.tsx`) and provides:
//
//   • Tab filters (status: all / active / draft / archived / out_of_stock /
//     issues) plus a free-text search.
//   • Manual product creation via ManualProductModal.
//   • Real CSV export (client-side Blob — respects current filter +
//     selection).
//   • Bulk activate / archive / delete with confirmation, all wired to
//     server actions that enforce tenant scope.
//   • Inline publish action for drafts.
//   • A right-side ProductDrawer for viewing a single product.
//
// Intentionally minimalist: a single elev-card-strong frame, tabs row,
// toolbar, table and a floating bulk action bar. No paginated chrome that
// would not actually paginate yet.

type TabValue = "all" | "active" | "draft" | "archived" | "out_of_stock" | "issues";

interface CatalogClientProps {
  products: Product[];
  hideHeader?: boolean;
  initialTab?: TabValue;
  focusProductId?: string;
  focusSection?: string;
}

export default function CatalogClient({
  products,
  hideHeader = false,
  initialTab = "all",
  focusProductId,
  focusSection,
}: CatalogClientProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    focusProductId ?? null,
  );
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ id: string; label: string } | null>(null);

  const [, startSinglePublish] = useTransition();
  const [isBulkPending, startBulk] = useTransition();
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkConfirmDelete, setBulkConfirmDelete] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const handleTabChange = (next: TabValue) => {
    setActiveTab(next);
    setSelectedRows([]);
    setBulkConfirmDelete(false);
    setBulkError(null);
  };

  // ── Filtering ──
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (activeTab === "active" && p.status !== "active") return false;
      if (activeTab === "draft" && p.status !== "draft") return false;
      if (activeTab === "archived" && p.status !== "archived") return false;
      if (activeTab === "out_of_stock" && p.totalStock !== 0) return false;
      if (activeTab === "issues" && p.issueCount === 0) return false;
      if (!q) return true;
      return p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    });
  }, [products, activeTab, searchQuery]);

  const issueCount = useMemo(
    () => products.filter((p) => p.issueCount > 0).length,
    [products],
  );

  const tabs: { label: string; value: TabValue; count: number; isSpecial?: boolean }[] = [
    { label: "Catálogo", value: "all", count: products.length },
    { label: "Activos", value: "active", count: products.filter((p) => p.status === "active").length },
    { label: "Borradores", value: "draft", count: products.filter((p) => p.status === "draft").length },
    { label: "Archivados", value: "archived", count: products.filter((p) => p.status === "archived").length },
    { label: "Sin stock", value: "out_of_stock", count: products.filter((p) => p.totalStock === 0).length },
    { label: "Con problemas", value: "issues", count: issueCount, isSpecial: issueCount > 0 },
  ];

  // ── Selection ──
  const allVisibleIds = filtered.map((p) => p.id);
  const everyVisibleSelected =
    allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedRows.includes(id));

  const handleSelectAll = (checked: boolean) => {
    setSelectedRows(checked ? allVisibleIds : []);
    setBulkConfirmDelete(false);
  };

  const toggleRow = (id: string, checked: boolean) => {
    setSelectedRows((prev) => (checked ? [...prev, id] : prev.filter((r) => r !== id)));
    setBulkConfirmDelete(false);
  };

  // ── Single inline actions ──
  const handlePublish = (productId: string) => {
    setBulkError(null);
    setActioningId(productId);
    startSinglePublish(async () => {
      try {
        const result = await publishDraftProduct(productId);
        if (!result.success) {
          setBulkError(result.error ?? "No se pudo publicar el producto.");
          return;
        }
        setActionFeedback({ id: productId, label: "Publicado" });
        window.setTimeout(() => setActionFeedback(null), 1800);
        router.refresh();
      } catch (error) {
        setBulkError(actionErrorMessage(error, "No se pudo publicar el producto."));
      } finally {
        setActioningId(null);
      }
    });
  };

  // ── Bulk actions ──
  const runBulkStatus = (status: "active" | "draft" | "archived") => {
    if (selectedRows.length === 0) return;
    const ids = [...selectedRows];
    setBulkError(null);
    setBulkConfirmDelete(false);
    startBulk(async () => {
      try {
        const result = await setProductsStatusAction(ids, status);
        if (!result.success) {
          setBulkError(result.error);
          return;
        }
        setSelectedRows([]);
        router.refresh();
      } catch (error) {
        setBulkError(actionErrorMessage(error, "No se pudo cambiar el estado de los productos."));
      }
    });
  };

  const runBulkDelete = () => {
    if (selectedRows.length === 0) return;
    if (!bulkConfirmDelete) {
      setBulkConfirmDelete(true);
      // Auto-cancel the confirm prompt after a few seconds so it doesn't
      // linger if the merchant changes their mind.
      window.setTimeout(() => setBulkConfirmDelete(false), 5000);
      return;
    }
    const ids = [...selectedRows];
    setBulkError(null);
    startBulk(async () => {
      try {
        const result = await deleteProductsAction(ids);
        if (!result.success) {
          setBulkError(result.error);
          setBulkConfirmDelete(false);
          return;
        }
        setSelectedRows([]);
        setBulkConfirmDelete(false);
        router.refresh();
      } catch (error) {
        setBulkError(actionErrorMessage(error, "No se pudieron eliminar los productos."));
        setBulkConfirmDelete(false);
      }
    });
  };

  // ── CSV export ──
  const handleExportCsv = () => {
    // Export the *currently visible* products (filter + tab applied) so the
    // file always matches what the merchant is looking at. If the merchant
    // has rows selected, only those are exported — that's the most useful
    // behaviour for ad-hoc operations (price reviews, supplier handoff…).
    const source = selectedRows.length > 0
      ? filtered.filter((p) => selectedRows.includes(p.id))
      : filtered;

    if (source.length === 0) return;

    const rows: (string | number)[][] = [];
    rows.push([
      "id",
      "handle",
      "title",
      "category",
      "supplier",
      "status",
      "price",
      "cost",
      "margin_percent",
      "total_stock",
      "variant_count",
      "issue_count",
      "updated_at",
    ]);

    for (const p of source) {
      rows.push([
        p.id,
        // Variants are computed in page.tsx — we don't have raw handle here,
        // so we derive a stable slug from the first variant SKU prefix.
        // (This matches the "uppercased title-variant" SKU shape produced
        // upstream; falling back to the title slug if no variant exists.)
        p.variants[0]?.sku?.split("-")[0]?.toLowerCase() ?? slugify(p.title),
        p.title,
        p.category,
        p.supplier ?? "",
        p.status,
        p.price,
        p.cost ?? "",
        p.costReal ? Math.round(p.margin * 100) : "",
        p.totalStock,
        p.variants.length,
        p.issueCount,
        new Date(p.updatedAt).toISOString(),
      ]);
    }

    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
    // BOM so Excel-on-Windows reads UTF-8 special characters correctly.
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const ts = new Date();
    const stamp = `${ts.getFullYear()}-${pad2(ts.getMonth() + 1)}-${pad2(ts.getDate())}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexora-catalogo-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Header — compact inline (Studio v4) */}
      {!hideHeader && (
        <NexoraPageHeader
          title="Productos"
          subtitle="Administrá tus productos, ajustá precios, controlá publicación y exportá tu catálogo."
          actions={
            <>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={filtered.length === 0}
                className="nx-action"
                title={filtered.length === 0 ? "Nada para exportar" : "Exportar CSV"}
              >
                Exportar CSV
              </button>
              <button
                type="button"
                onClick={() => setManualOpen(true)}
                className="nx-action nx-action--primary"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                Agregar producto
              </button>
            </>
          }
        />
      )}

      {/* Status tabs — sober underline tabs */}
      <NexoraTabs
        tabs={tabs.map((t) => ({
          value: t.value,
          label: t.label,
          count: t.count,
        }))}
        active={activeTab}
        onChange={handleTabChange}
      />

      {/* Single hairline-frame DataBoard: cmd bar + bulk bar + table */}
      <NexoraTableShell>
        <NexoraCmdBar>
          <NexoraSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar por nombre o categoría…"
          />
          {searchQuery ? (
            <NexoraFilters>
              <span className="nx-chip" data-active>
                <FilterIcon className="h-3 w-3" />
                {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
              </span>
            </NexoraFilters>
          ) : null}
          <NexoraActions>
            <span className="nx-cmd-bar__count">
              {filtered.length} de {products.length}
            </span>
          </NexoraActions>
        </NexoraCmdBar>

        {/* Bulk action strip — fused with the table, no floating bar */}
        <NexoraBulkBar
          selected={selectedRows.length}
          onClear={() => setSelectedRows([])}
        >
          <button
            type="button"
            className="nx-action nx-action--sm"
            onClick={() => runBulkStatus("active")}
            disabled={isBulkPending}
          >
            <Upload className="h-3.5 w-3.5" /> Activar
          </button>
          <button
            type="button"
            className="nx-action nx-action--sm"
            onClick={() => runBulkStatus("archived")}
            disabled={isBulkPending}
          >
            <Archive className="h-3.5 w-3.5" /> Archivar
          </button>
          <button
            type="button"
            onClick={runBulkDelete}
            disabled={isBulkPending}
            className={cn(
              "nx-action nx-action--sm",
              bulkConfirmDelete && "nx-action--primary",
            )}
            style={
              bulkConfirmDelete
                ? {
                    background: "var(--signal-danger)",
                    borderColor: "var(--signal-danger)",
                  }
                : undefined
            }
            title={bulkConfirmDelete ? "Confirmar eliminación" : "Eliminar"}
          >
            {isBulkPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {bulkConfirmDelete ? "Confirmar" : "Eliminar"}
          </button>
        </NexoraBulkBar>
        {bulkError ? (
          <div
            style={{
              padding: "8px 12px",
              borderBottom: "1px solid var(--studio-line)",
              background: "rgba(176, 53, 53, 0.08)",
              color: "#b03535",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {bulkError}
          </div>
        ) : null}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="nx-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={everyVisibleSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 cursor-pointer accent-[var(--brand)]"
                    aria-label="Seleccionar todo"
                  />
                </th>
                <th>Producto</th>
                <th>Salud</th>
                <th>Precio</th>
                <th>Estado</th>
                <th style={{ textAlign: "right" }}>Stock</th>
                <th style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 0 }}>
                    <EmptyState
                      hasSearch={searchQuery.length > 0}
                      onClear={() => {
                        setSearchQuery("");
                        handleTabChange("all");
                      }}
                      onAdd={() => setManualOpen(true)}
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((product) => {
                  const isSelected = selectedRows.includes(product.id);
                  return (
                    <tr
                      key={product.id}
                      onClick={() => setSelectedProductId(product.id)}
                      data-selected={isSelected ? "true" : undefined}
                      style={{ cursor: "pointer" }}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleRow(product.id, e.target.checked)}
                          className="h-4 w-4 cursor-pointer accent-[var(--brand)]"
                          aria-label={`Seleccionar ${product.title}`}
                        />
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div
                            style={{
                              height: 36,
                              width: 36,
                              flexShrink: 0,
                              borderRadius: 6,
                              border: "1px solid var(--studio-line)",
                              background: "var(--studio-canvas)",
                              overflow: "hidden",
                            }}
                          >
                            {product.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={product.image}
                                alt={product.title}
                                style={{ height: "100%", width: "100%", objectFit: "cover" }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-ink-6">
                                <Package className="h-4 w-4" strokeWidth={1.5} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="nx-cell-strong truncate">{product.title}</p>
                            <p className="nx-cell-meta">
                              {product.category || "Sin categoría"} · {product.variants.length} variante
                              {product.variants.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
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
                      <td>
                        <p className="nx-cell-strong" style={{ fontVariantNumeric: "tabular-nums" }}>
                          ${product.price.toLocaleString("es-AR")}
                        </p>
                        {product.costReal ? (
                          <p
                            style={{ fontVariantNumeric: "tabular-nums", fontSize: 11 }}
                            className={cn(
                              "font-medium",
                              product.margin >= 0.2
                                ? "text-[color:var(--signal-success)]"
                                : product.margin >= 0.05
                                  ? "text-[color:var(--signal-warning)]"
                                  : "text-[color:var(--signal-danger)]",
                            )}
                          >
                            margen {Math.round(product.margin * 100)}%
                          </p>
                        ) : (
                          <p className="text-[11px] font-medium text-[color:var(--signal-danger)]">
                            sin costo real
                          </p>
                        )}
                      </td>
                      <td>
                        <ProductStatusBadge status={product.status} />
                      </td>
                      <td className="nx-cell-num">
                        {product.totalStock > 0 ? (
                          <span className="font-medium text-ink-0">{product.totalStock} u.</span>
                        ) : (
                          <span className="font-medium text-[color:var(--signal-danger)]">
                            Agotado
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="flex items-center justify-end gap-1">
                          {actionFeedback?.id === product.id ? (
                            <span className="text-[11px] font-medium text-[color:var(--signal-success)]">
                              {actionFeedback.label}
                            </span>
                          ) : (
                            <>
                              {product.status === "draft" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePublish(product.id);
                                  }}
                                  disabled={actioningId === product.id}
                                  title="Publicar producto"
                                  className="nx-action nx-action--sm"
                                >
                                  {actioningId === product.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Upload className="h-3 w-3" />
                                  )}
                                  <span className="hidden lg:inline">Publicar</span>
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProductId(product.id);
                                }}
                                title="Ver detalle"
                                className="nx-action nx-action--ghost nx-action--sm"
                                aria-label="Ver detalle"
                              >
                                <Edit className="h-3.5 w-3.5" />
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
        </div>
      </NexoraTableShell>

      {/* Drawers / Modals */}
      <ProductDrawer
        product={selectedProduct}
        isOpen={selectedProduct !== null}
        onClose={() => setSelectedProductId(null)}
        onProductUpdated={() => router.refresh()}
        focusSection={focusSection}
      />
      <ManualProductModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onCreated={() => router.refresh()}
      />
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────

function actionErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

function EmptyState({
  hasSearch,
  onClear,
  onAdd,
}: {
  hasSearch: boolean;
  onClear: () => void;
  onAdd: () => void;
}) {
  if (hasSearch) {
    return (
      <NexoraEmpty
        title="Sin resultados"
        body="Probá con otro nombre o limpiá los filtros aplicados."
        actions={
          <button type="button" onClick={onClear} className="nx-action nx-action--sm">
            Limpiar filtros
          </button>
        }
      />
    );
  }

  return (
    <NexoraEmpty
      title="Sin productos en esta vista"
      body="Agregá tu primer producto manualmente o importá desde un proveedor para empezar a vender."
      actions={
        <button type="button" onClick={onAdd} className="nx-action nx-action--primary nx-action--sm">
          <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Agregar producto
        </button>
      }
    />
  );
}

// ─── Catalog Intelligence: Signal Chips ───────────────────────────────────

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

  const variantSignalMap: Record<string, { variantId: string | null; action?: "adjust" | "reorder" }> = {
    variant_critical: { variantId: variantCriticalId, action: "adjust" },
    variant_stuck: { variantId: variantStuckId },
    variant_negative: { variantId: variantNegativeId },
    variant_hidden: { variantId: variantHiddenId },
    variant_urgent: { variantId: variantUrgentReorderId, action: "reorder" },
  };

  const handleVariantSignalClick = (e: React.MouseEvent, variantId: string, action?: "adjust" | "reorder") => {
    e.stopPropagation();
    if (!variantId) return;
    router.push(buildVariantHref(variantId, action));
  };

  return (
    <div className="flex max-w-[220px] flex-wrap gap-1">
      {signals.map((s) => {
        const variantInfo = variantSignalMap[s.key];
        const isVariantSignal = variantInfo && variantInfo.variantId;
        return (
          <span
            key={s.key}
            className={cn(
              "inline-flex items-center gap-1 rounded-[var(--r-xs)] border px-1.5 py-0.5 text-[10px] font-medium",
              s.severity === "blocker" &&
                "border-[color:var(--hairline)] bg-[var(--surface-1)] text-[color:var(--signal-danger)]",
              s.severity === "warning" &&
                "border-[color:var(--hairline)] bg-[var(--surface-1)] text-[color:var(--signal-warning)]",
              s.severity === "ok" &&
                "border-[color:var(--hairline)] bg-[var(--surface-1)] text-[color:var(--signal-success)]",
              s.severity === "info" &&
                "border-[color:var(--hairline)] bg-[var(--surface-2)] text-ink-5",
              isVariantSignal && "cursor-pointer underline decoration-dotted underline-offset-2",
            )}
            onClick={(e) =>
              isVariantSignal ? handleVariantSignalClick(e, variantInfo!.variantId!, variantInfo!.action) : undefined
            }
            title={isVariantSignal ? "Ver en inventario" : undefined}
          >
            {s.severity === "blocker" && <AlertTriangle className="h-2.5 w-2.5" />}
            {s.severity === "ok" && <CheckCircle2 className="h-2.5 w-2.5" />}
            {s.label}
          </span>
        );
      })}
      {providerName && (
        <span className="inline-flex items-center gap-1 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-1.5 py-0.5 text-[10px] font-medium text-ink-5">
          {providerName}
        </span>
      )}
    </div>
  );
}

// ─── CSV helpers ──────────────────────────────────────────────────────────

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // RFC-4180 quoting: quote any value that contains comma, double quote,
  // CR, LF or leading / trailing whitespace; escape internal double quotes.
  if (/[",\r\n]/.test(s) || s !== s.trim()) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
