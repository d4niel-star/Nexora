"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
  Search as SearchIcon,
  Trash2,
  Upload,
  X as XIcon,
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ id: string; label: string } | null>(null);

  const [, startSinglePublish] = useTransition();
  const [isBulkPending, startBulk] = useTransition();
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkConfirmDelete, setBulkConfirmDelete] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  // Reset selection whenever the merchant switches tabs to avoid acting on
  // products that are no longer visible.
  useEffect(() => {
    setSelectedRows([]);
    setBulkConfirmDelete(false);
    setBulkError(null);
  }, [activeTab]);

  // Keep the open drawer in sync if the underlying products list refreshes
  // (e.g. after a server-action revalidatePath).
  useEffect(() => {
    if (selectedProduct) {
      const updated = products.find((p) => p.id === selectedProduct.id);
      if (updated && updated !== selectedProduct) setSelectedProduct(updated);
    }
  }, [products]);

  // Auto-open the drawer when a deep-link asks for a specific product.
  useEffect(() => {
    if (focusProductId && !selectedProduct) {
      const target = products.find((p) => p.id === focusProductId);
      if (target) setSelectedProduct(target);
    }
  }, [focusProductId, products]);

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
    setActioningId(productId);
    startSinglePublish(async () => {
      const result = await publishDraftProduct(productId);
      setActioningId(null);
      if (result.success) {
        setActionFeedback({ id: productId, label: "Publicado" });
        window.setTimeout(() => setActionFeedback(null), 1800);
        router.refresh();
      }
    });
  };

  // ── Bulk actions ──
  const runBulkStatus = (status: "active" | "draft" | "archived") => {
    if (selectedRows.length === 0) return;
    setBulkError(null);
    startBulk(async () => {
      const result = await setProductsStatusAction(selectedRows, status);
      if (!result.success) {
        setBulkError(result.error);
        return;
      }
      setSelectedRows([]);
      router.refresh();
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
    setBulkError(null);
    startBulk(async () => {
      const result = await deleteProductsAction(selectedRows);
      if (!result.success) {
        setBulkError(result.error);
        setBulkConfirmDelete(false);
        return;
      }
      setSelectedRows([]);
      setBulkConfirmDelete(false);
      router.refresh();
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
    <div className="space-y-7 pb-24">
      {/* Header */}
      {!hideHeader && (
        <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-[24px] font-semibold leading-[1.1] tracking-[-0.025em] text-ink-0 md:text-[28px]">
              Catálogo
            </h1>
            <p className="mt-1 text-[13px] leading-[1.5] text-ink-5">
              Administrá tus productos, ajustá precios, controlá publicación y exportá tu catálogo.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              disabled={filtered.length === 0}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-4 text-[13px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-50"
              title={filtered.length === 0 ? "Nada para exportar" : "Exportar CSV"}
            >
              Exportar CSV
            </button>
            <button
              onClick={() => setManualOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-ink-0 px-4 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              Agregar manual
            </button>
          </div>
        </header>
      )}

      {/* Main panel */}
      <section className="elev-card-strong relative overflow-hidden rounded-[var(--r-lg)]">
        {/* Tabs */}
        <div className="no-scrollbar flex items-center gap-7 overflow-x-auto border-b border-[color:var(--hairline)] bg-[var(--surface-1)] px-5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "relative flex items-center gap-2 whitespace-nowrap py-3.5 text-[12px] font-medium transition-colors",
                  isActive
                    ? tab.isSpecial
                      ? "text-[color:var(--signal-warning)]"
                      : "text-ink-0"
                    : "text-ink-5 hover:text-ink-0",
                )}
              >
                {tab.isSpecial && <AlertTriangle className="h-3 w-3" strokeWidth={1.75} />}
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={cn(
                      "tabular-nums inline-flex items-center rounded-[var(--r-xs)] px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.12em]",
                      isActive
                        ? tab.isSpecial
                          ? "bg-[color:color-mix(in_srgb,var(--signal-warning)_14%,transparent)] text-[color:var(--signal-warning)]"
                          : "bg-[var(--surface-2)] text-ink-0"
                        : "bg-transparent text-ink-6",
                    )}
                  >
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <span
                    className={cn(
                      "absolute bottom-0 left-0 right-0 h-[2px]",
                      tab.isSpecial ? "bg-[color:var(--signal-warning)]" : "bg-ink-0",
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-[color:var(--hairline)] bg-[var(--surface-0)] px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-6" strokeWidth={1.75} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o categoría…"
              className="h-9 w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-paper)] pl-9 pr-9 text-[13px] font-medium text-ink-0 outline-none transition-[box-shadow,border-color] placeholder:text-ink-6 focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-6 hover:bg-[var(--surface-2)] hover:text-ink-0"
                aria-label="Limpiar búsqueda"
              >
                <XIcon className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-ink-5">
            <span className="tabular-nums">
              {filtered.length} de {products.length} producto{products.length !== 1 ? "s" : ""}
            </span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">
                <FilterIcon className="h-3 w-3" /> filtrado
              </span>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[color:var(--hairline)] bg-[var(--surface-1)]">
                <th className="w-12 px-5 py-3">
                  <input
                    type="checkbox"
                    checked={everyVisibleSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 cursor-pointer accent-ink-0"
                    aria-label="Seleccionar todo"
                  />
                </th>
                <Th>Producto</Th>
                <Th>Salud</Th>
                <Th>Precio</Th>
                <Th>Estado</Th>
                <Th align="right">Stock</Th>
                <Th align="right">Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--hairline)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <EmptyState
                      hasSearch={searchQuery.length > 0}
                      onClear={() => {
                        setSearchQuery("");
                        setActiveTab("all");
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
                      onClick={() => setSelectedProduct(product)}
                      className={cn(
                        "group cursor-pointer transition-colors",
                        isSelected ? "bg-[color:color-mix(in_srgb,var(--accent-500)_5%,var(--surface-0))]" : "bg-[var(--surface-0)] hover:bg-[var(--surface-1)]",
                      )}
                    >
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleRow(product.id, e.target.checked)}
                          className="h-4 w-4 cursor-pointer accent-ink-0"
                          aria-label={`Seleccionar ${product.title}`}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
                            {product.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={product.image} alt={product.title} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-ink-6">
                                <Package className="h-4 w-4" strokeWidth={1.5} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-ink-0">{product.title}</p>
                            <p className="text-[11px] text-ink-5">
                              {product.category || "Sin categoría"} · {product.variants.length} variante
                              {product.variants.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
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
                      <td className="px-5 py-4">
                        <p className="tabular-nums text-[13px] font-semibold text-ink-0">
                          ${product.price.toLocaleString("es-AR")}
                        </p>
                        {product.costReal ? (
                          <p
                            className={cn(
                              "tabular-nums text-[10px] font-medium",
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
                          <p className="text-[10px] font-medium text-[color:var(--signal-danger)]">sin costo real</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <ProductStatusBadge status={product.status} />
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums text-[13px]">
                        {product.totalStock > 0 ? (
                          <span className="font-medium text-ink-0">{product.totalStock} u.</span>
                        ) : (
                          <span className="font-medium text-[color:var(--signal-danger)]">Agotado</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
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
                                  className="inline-flex h-7 items-center gap-1 rounded-[var(--r-xs)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-2 text-[11px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50"
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
                                  setSelectedProduct(product);
                                }}
                                title="Ver detalle"
                                className="rounded-[var(--r-xs)] border border-transparent p-1.5 text-ink-5 transition-colors hover:border-[color:var(--hairline)] hover:bg-[var(--surface-2)] hover:text-ink-0"
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

        {/* Footer count */}
        {filtered.length > 0 && (
          <div className="border-t border-[color:var(--hairline)] bg-[var(--surface-1)] px-5 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
            <span className="tabular-nums">
              <b className="text-ink-0">{filtered.length}</b> de {products.length} producto{products.length !== 1 ? "s" : ""}
              {selectedRows.length > 0 && (
                <>
                  <span className="mx-2 text-ink-7">·</span>
                  <b className="text-ink-0">{selectedRows.length}</b> seleccionado
                  {selectedRows.length !== 1 ? "s" : ""}
                </>
              )}
            </span>
          </div>
        )}
      </section>

      {/* Floating bulk action bar */}
      {selectedRows.length > 0 && (
        <div className="fixed bottom-8 left-1/2 z-30 -translate-x-1/2 animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className="flex items-center overflow-hidden rounded-[var(--r-md)] bg-ink-0 text-ink-12 shadow-[var(--shadow-overlay)]">
            <div className="flex items-center gap-2 border-r border-ink-12/15 px-4 py-2.5">
              <span className="tabular-nums text-[13px] font-medium">{selectedRows.length} seleccionados</span>
              <button
                onClick={() => setSelectedRows([])}
                disabled={isBulkPending}
                className="rounded-[var(--r-xs)] p-1 text-ink-12/60 transition-colors hover:bg-ink-12/10 hover:text-ink-12 disabled:opacity-50"
                aria-label="Limpiar selección"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-1 px-1.5 py-1.5">
              <button
                onClick={() => runBulkStatus("active")}
                disabled={isBulkPending}
                className="inline-flex h-8 items-center gap-1.5 rounded-[var(--r-xs)] px-2.5 text-[12px] font-medium transition-colors hover:bg-ink-12/10 disabled:opacity-50"
                title="Activar / publicar seleccionados"
              >
                <Upload className="h-3.5 w-3.5" /> Activar
              </button>
              <button
                onClick={() => runBulkStatus("archived")}
                disabled={isBulkPending}
                className="inline-flex h-8 items-center gap-1.5 rounded-[var(--r-xs)] px-2.5 text-[12px] font-medium transition-colors hover:bg-ink-12/10 disabled:opacity-50"
                title="Archivar seleccionados"
              >
                <Archive className="h-3.5 w-3.5" /> Archivar
              </button>
              <button
                onClick={runBulkDelete}
                disabled={isBulkPending}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-[var(--r-xs)] px-2.5 text-[12px] font-medium transition-colors disabled:opacity-50",
                  bulkConfirmDelete
                    ? "bg-[color:var(--signal-danger)] text-ink-12 hover:bg-[color:var(--signal-danger)]"
                    : "text-ink-12/70 hover:bg-ink-12/10 hover:text-[color:var(--signal-danger)]",
                )}
                title={bulkConfirmDelete ? "Confirmar eliminación" : "Eliminar seleccionados"}
              >
                {isBulkPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                {bulkConfirmDelete ? "Confirmar" : "Eliminar"}
              </button>
            </div>
          </div>
          {bulkError && (
            <div className="mt-2 rounded-[var(--r-xs)] bg-[color:var(--signal-danger)] px-3 py-1.5 text-center text-[11px] font-medium text-ink-12 shadow-[var(--shadow-overlay)]">
              {bulkError}
            </div>
          )}
        </div>
      )}

      {/* Drawers / Modals */}
      <ProductDrawer
        product={selectedProduct}
        isOpen={selectedProduct !== null}
        onClose={() => setSelectedProduct(null)}
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

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn(
        "px-5 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5",
        align === "right" && "text-right",
      )}
    >
      {children}
    </th>
  );
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
      <div className="space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
          <SearchIcon className="h-4 w-4 text-ink-5" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-[14px] font-medium text-ink-0">Sin resultados</p>
          <p className="mt-1 text-[12px] text-ink-5">Probá con otro nombre o limpiá los filtros.</p>
        </div>
        <button
          onClick={onClear}
          className="inline-flex h-9 items-center rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-4 text-[12px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)]"
        >
          Limpiar filtros
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
        <Package className="h-4 w-4 text-ink-5" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-[14px] font-medium text-ink-0">No tenés productos en esta vista</p>
        <p className="mt-1 text-[12px] text-ink-5">Agregá tu primer producto manualmente o importá desde un proveedor.</p>
      </div>
      <button
        onClick={onAdd}
        className="inline-flex h-9 items-center gap-2 rounded-full bg-ink-0 px-4 text-[12px] font-medium text-ink-12 transition-colors hover:bg-ink-2"
      >
        <Plus className="h-3.5 w-3.5" /> Agregar producto manual
      </button>
    </div>
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
