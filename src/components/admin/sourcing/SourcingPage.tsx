"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  Globe2,
  LayoutGrid,
  Link2,
  Loader2,
  Network,
  PackageCheck,
  ShoppingCart,
  UploadCloud,
  XCircle,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getProvidersAction,
  getConnectedProvidersAction,
  getImportedProductsAction,
  connectProviderAction,
  getProviderExternalProductsAction,
  importProductAction,
  previewCsvImportAction,
  importCsvProductsAction,
  previewFeedImportAction,
  importFeedProductsAction,
  previewApiImportAction,
  importApiProductsAction,
} from "@/lib/sourcing/actions";
import { getProviderSyncJobs } from "@/lib/sourcing/workers/actions";
import type { SourcingProvider, ProviderConnection, CatalogMirrorProduct, ProviderProduct, Product } from "@prisma/client";
import type { SourcingIntelData } from "@/types/sourcing-intel";
import type { ProviderScoreReport } from "@/types/provider-score";
import { SOURCING_CSV_TEMPLATE, type SourcingImportPreview, type SourcingImportSource } from "@/lib/sourcing/import-parsers";
import { SourcingIntelligence } from "./SourcingIntelligence";
import { ProviderScorePanel } from "./ProviderScorePanel";

// ─── Types ───

type TabKey = "intel" | "scoring" | "real-import" | "discover" | "connected" | "imports" | "sync";

interface ConnectedProviderData extends ProviderConnection {
  provider: SourcingProvider;
}

interface MirrorData extends CatalogMirrorProduct {
  providerProduct: ProviderProduct;
  internalProduct: Product | null;
  providerConnection: {
    provider: SourcingProvider;
  };
}

// ─── Main Component ───

export function SourcingPage({ intelData, scoreReport }: { intelData: SourcingIntelData; scoreReport: ProviderScoreReport }) {
  const [activeTab, setActiveTab] = useState<TabKey>("intel");
  const [providers, setProviders] = useState<SourcingProvider[]>([]);
  const [connections, setConnections] = useState<ConnectedProviderData[]>([]);
  const [mirrors, setMirrors] = useState<MirrorData[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [provs, conns, mirs, syncJobs] = await Promise.all([
        getProvidersAction(),
        getConnectedProvidersAction(),
        getImportedProductsAction(),
        getProviderSyncJobs()
      ]);
      setProviders(provs);
      setConnections(conns as unknown as ConnectedProviderData[]);
      setMirrors(mirs as unknown as MirrorData[]);
      setJobs(syncJobs);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConnectProvider = (providerId: string) => {
    startTransition(async () => {
      await connectProviderAction(providerId);
      await loadData();
      setActiveTab("connected");
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#CCCCCC]" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-[#111111] leading-none">Abastecimiento</h1>
          <p className="mt-2 text-[13px] text-[#999999]">
            Conectá proveedores, importá productos y armá tu catálogo B2B.
          </p>
        </div>
        <div className="flex gap-2">
          {connections.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 shadow-sm">
              <Network className="h-3.5 w-3.5 text-[#111111]" />
              <span className="text-xs font-semibold text-[#111111]">{connections.length}</span>
              <span className="text-xs text-[#999999]">conectados</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex items-center gap-6 overflow-x-auto border-b border-[#E5E5E5] px-1">
        <TabButton
          active={activeTab === "intel"}
          onClick={() => setActiveTab("intel")}
          icon={<ShoppingCart className="h-3.5 w-3.5" />}
          badge={intelData.summary.readyToImport + intelData.summary.needsReview + intelData.summary.atRisk || undefined}
        >
          Inteligencia
        </TabButton>
        <TabButton
          active={activeTab === "scoring"}
          onClick={() => setActiveTab("scoring")}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          badge={scoreReport.summary.totalProviders || undefined}
        >
          Scoring
        </TabButton>
        <TabButton
          active={activeTab === "real-import"}
          onClick={() => setActiveTab("real-import")}
          icon={<UploadCloud className="h-3.5 w-3.5" />}
        >
          Import real
        </TabButton>
        <TabButton active={activeTab === "discover"} onClick={() => setActiveTab("discover")} icon={<Globe2 className="h-3.5 w-3.5" />}>
          Descubrir
        </TabButton>
        <TabButton
          active={activeTab === "connected"}
          onClick={() => setActiveTab("connected")}
          icon={<Network className="h-3.5 w-3.5" />}
          badge={connections.length}
        >
          Conectados
        </TabButton>
        <TabButton
          active={activeTab === "imports"}
          onClick={() => setActiveTab("imports")}
          icon={<Download className="h-3.5 w-3.5" />}
          badge={mirrors.length}
        >
          Importaciones
        </TabButton>
        <TabButton
          active={activeTab === "sync"}
          onClick={() => setActiveTab("sync")}
          icon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Historial
        </TabButton>
      </div>

      {/* ─── Content ─── */}
      <div className="mt-6">
        {activeTab === "intel" && <SourcingIntelligence data={intelData} />}
        {activeTab === "scoring" && <ProviderScorePanel report={scoreReport} />}
        {activeTab === "real-import" && <RealImportTab onImportComplete={loadData} />}
        {activeTab === "discover" && (
          <DiscoverTab providers={providers} connections={connections} onConnect={handleConnectProvider} isPending={isPending} />
        )}
        {activeTab === "connected" && <ConnectedTab connections={connections} onRefresh={loadData} />}
        {activeTab === "imports" && <ImportsTab mirrors={mirrors} />}
        {activeTab === "sync" && <SyncTab jobs={jobs} connections={connections} onReload={loadData} />}
      </div>
    </div>
  );
}

// ─── Sub-components: Tabs ───

function TabButton({ active, onClick, children, icon, badge }: { active: boolean; onClick: () => void; children: React.ReactNode; icon: React.ReactNode; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex shrink-0 items-center gap-2 pb-3 text-[13px] font-semibold transition-colors",
        active ? "text-[#111111]" : "text-[#999999] hover:text-[#111111]"
      )}
    >
      <span className={cn(active ? "text-[#111111]" : "text-[#CCCCCC] group-hover:text-[#111111]")}>{icon}</span>
      {children}
      {typeof badge === "number" && badge > 0 && (
        <span className={cn("ml-1 rounded-full px-1.5 py-0.5 text-[9px] leading-none text-white", active ? "bg-[#111111]" : "bg-[#BBBBBB]")}>
          {badge}
        </span>
      )}
      {active && <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[#111111] rounded-t-full" />}
    </button>
  );
}

function RealImportTab({ onImportComplete }: { onImportComplete: () => void }) {
  const [sourceType, setSourceType] = useState<SourcingImportSource>("csv");
  const [csvText, setCsvText] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [preview, setPreview] = useState<SourcingImportPreview | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedProducts = useMemo(() => {
    if (!preview) return [];
    return preview.products.filter((product) => selectedIds.has(product.externalId));
  }, [preview, selectedIds]);

  const switchSource = (next: SourcingImportSource) => {
    setSourceType(next);
    setPreview(null);
    setSelectedIds(new Set());
    setError(null);
    setSuccess(null);
  };

  const downloadTemplate = () => {
    const blob = new Blob([SOURCING_CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nexora-sourcing-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    setPreview(null);
    setSelectedIds(new Set());
    setError(null);
    setSuccess(null);
  };

  const runPreview = () => {
    startTransition(async () => {
      try {
        setError(null);
        setSuccess(null);
        const nextPreview =
          sourceType === "csv"
            ? await previewCsvImportAction(csvText)
            : sourceType === "feed"
              ? await previewFeedImportAction(feedUrl)
              : await previewApiImportAction(apiUrl, apiKey);

        setPreview(nextPreview);
        setSelectedIds(new Set(nextPreview.products.map((product) => product.externalId)));
        if (nextPreview.products.length === 0) {
          setError(nextPreview.errors[0]?.message || "La fuente no trajo productos validos.");
        }
      } catch (previewError) {
        setError(previewError instanceof Error ? previewError.message : "No se pudo leer la fuente.");
        setPreview(null);
        setSelectedIds(new Set());
      }
    });
  };

  const runImport = () => {
    if (selectedIds.size === 0) {
      setError("Selecciona al menos un producto para importar.");
      return;
    }

    startTransition(async () => {
      try {
        setError(null);
        setSuccess(null);
        const selected = Array.from(selectedIds);
        const result =
          sourceType === "csv"
            ? await importCsvProductsAction(csvText, selected)
            : sourceType === "feed"
              ? await importFeedProductsAction(feedUrl, selected)
              : await importApiProductsAction(apiUrl, selected, apiKey);

        setSuccess(`Importados: ${result.importedCount}. Existentes omitidos: ${result.skippedExistingCount}.`);
        setPreview(null);
        setSelectedIds(new Set());
        onImportComplete();
      } catch (importError) {
        setError(importError instanceof Error ? importError.message : "No se pudo importar la seleccion.");
      }
    });
  };

  const toggleProduct = (externalId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(externalId)) next.delete(externalId);
      else next.add(externalId);
      return next;
    });
  };

  const toggleAll = () => {
    if (!preview) return;
    if (selectedIds.size === preview.products.length) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(preview.products.map((product) => product.externalId)));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-[18px] font-extrabold text-[#111111]">Abastecimiento real</h2>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[#777777]">
              Importa productos que vienen de un archivo, feed o API real. Nexora normaliza nombres, categorias y
              variantes sin inventar productos ni marcar sync cuando la fuente no responde.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-[12px] font-bold text-[#111111] shadow-sm transition-colors hover:bg-[#F5F5F5]"
          >
            <Download className="h-3.5 w-3.5" />
            Template CSV
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <SourceButton
            active={sourceType === "csv"}
            title="CSV manual"
            description="Archivo local con columnas exactas y validacion fila por fila."
            icon={<FileText className="h-4 w-4" />}
            onClick={() => switchSource("csv")}
          />
          <SourceButton
            active={sourceType === "feed"}
            title="Feed URL"
            description="XML, JSON o CSV publicado por el proveedor."
            icon={<Link2 className="h-4 w-4" />}
            onClick={() => switchSource("feed")}
          />
          <SourceButton
            active={sourceType === "api"}
            title="API proveedor"
            description="Endpoint que devuelve productos reales. API key opcional."
            icon={<Globe2 className="h-4 w-4" />}
            onClick={() => switchSource("api")}
          />
        </div>
      </div>

      <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
        {sourceType === "csv" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <label className="block">
              <span className="text-[12px] font-bold text-[#111111]">Subir CSV del proveedor</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => handleCsvFile(event.target.files?.[0] ?? null)}
                className="mt-2 block w-full rounded-md border border-[#E5E5E5] bg-[#FAFAFA] px-3 py-2 text-[13px] text-[#555555] file:mr-3 file:rounded file:border-0 file:bg-[#111111] file:px-3 file:py-1.5 file:text-[12px] file:font-bold file:text-white"
              />
              <span className="mt-2 block text-[12px] text-[#999999]">
                Columnas obligatorias: externalId, title, cost, stock. Variantes por fila con el mismo externalId.
              </span>
            </label>
            <button
              type="button"
              onClick={runPreview}
              disabled={isPending || csvText.trim().length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#111111] px-4 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
              Previsualizar
            </button>
          </div>
        )}

        {sourceType === "feed" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <label className="block">
              <span className="text-[12px] font-bold text-[#111111]">URL del feed</span>
              <input
                value={feedUrl}
                onChange={(event) => {
                  setFeedUrl(event.target.value);
                  setPreview(null);
                }}
                placeholder="https://proveedor.com/feed.csv"
                className="mt-2 w-full rounded-md border border-[#E5E5E5] bg-[#FAFAFA] px-3 py-2 text-[13px] text-[#111111] outline-none transition-colors placeholder:text-[#BBBBBB] focus:border-[#111111] focus:bg-white"
              />
              <span className="mt-2 block text-[12px] text-[#999999]">Acepta CSV, JSON o XML si la URL responde publicamente.</span>
            </label>
            <button
              type="button"
              onClick={runPreview}
              disabled={isPending || feedUrl.trim().length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#111111] px-4 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
              Consultar feed
            </button>
          </div>
        )}

        {sourceType === "api" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px_auto] lg:items-end">
            <label className="block">
              <span className="text-[12px] font-bold text-[#111111]">URL base / endpoint de productos</span>
              <input
                value={apiUrl}
                onChange={(event) => {
                  setApiUrl(event.target.value);
                  setPreview(null);
                }}
                placeholder="https://api.proveedor.com/products"
                className="mt-2 w-full rounded-md border border-[#E5E5E5] bg-[#FAFAFA] px-3 py-2 text-[13px] text-[#111111] outline-none transition-colors placeholder:text-[#BBBBBB] focus:border-[#111111] focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="text-[12px] font-bold text-[#111111]">API key opcional</span>
              <input
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="No se muestra en logs"
                type="password"
                className="mt-2 w-full rounded-md border border-[#E5E5E5] bg-[#FAFAFA] px-3 py-2 text-[13px] text-[#111111] outline-none transition-colors placeholder:text-[#BBBBBB] focus:border-[#111111] focus:bg-white"
              />
            </label>
            <button
              type="button"
              onClick={runPreview}
              disabled={isPending || apiUrl.trim().length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#111111] px-4 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
              Consultar API
            </button>
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div role="status" className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {preview && (
        <div className="rounded-xl border border-[#E5E5E5] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#E5E5E5] bg-[#FAFAFA] px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-[14px] font-extrabold text-[#111111]">Preview de productos reales</h3>
              <p className="mt-1 text-[12px] text-[#888888]">
                {preview.products.length} producto(s) validos, {preview.errors.length} alerta(s) de validacion.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleAll}
                disabled={preview.products.length === 0}
                className="rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-[12px] font-bold text-[#111111] shadow-sm transition-colors hover:bg-[#F5F5F5] disabled:opacity-50"
              >
                {selectedIds.size === preview.products.length ? "Deseleccionar" : "Seleccionar todo"}
              </button>
              <button
                type="button"
                onClick={runImport}
                disabled={isPending || selectedProducts.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#111111] px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Importar {selectedProducts.length}
              </button>
            </div>
          </div>

          {preview.errors.length > 0 && (
            <div className="border-b border-[#F0F0F0] px-6 py-4">
              <div className="mb-2 flex items-center gap-2 text-[12px] font-bold text-red-700">
                <XCircle className="h-3.5 w-3.5" />
                Errores por fila
              </div>
              <div className="max-h-36 overflow-auto rounded-md border border-red-100 bg-red-50">
                {preview.errors.slice(0, 12).map((item, index) => (
                  <div key={`${item.row}-${item.field}-${index}`} className="grid grid-cols-[64px_120px_1fr] gap-3 border-b border-red-100 px-3 py-2 text-[12px] last:border-b-0">
                    <span className="font-bold text-red-700">Fila {item.row}</span>
                    <span className="text-red-600">{item.field}</span>
                    <span className="text-red-700">{item.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {preview.products.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <PackageCheck className="mb-4 h-8 w-8 text-[#CCCCCC]" />
              <h3 className="text-[15px] font-bold text-[#111111]">Sin productos validos</h3>
              <p className="mt-1 max-w-sm text-[13px] text-[#999999]">Corrige los errores de formato y vuelve a previsualizar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-[13px]">
                <thead className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[11px] font-bold uppercase tracking-[0.08em] text-[#888888]">
                  <tr>
                    <th className="w-12 px-6 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === preview.products.length}
                        onChange={toggleAll}
                        aria-label="Seleccionar todos los productos"
                        className="h-4 w-4 rounded border-[#CCCCCC]"
                      />
                    </th>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3 text-right">Costo</th>
                    <th className="px-4 py-3 text-right">Precio</th>
                    <th className="px-4 py-3 text-right">Stock</th>
                    <th className="px-4 py-3 text-right">Variantes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                  {preview.products.map((product) => {
                    const selected = selectedIds.has(product.externalId);
                    const price = product.suggestedPrice ?? product.cost;
                    return (
                      <tr key={product.externalId} className={cn("transition-colors hover:bg-[#FAFAFA]", selected && "bg-[#FCFCFC]")}>
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleProduct(product.externalId)}
                            aria-label={`Seleccionar ${product.title}`}
                            className="h-4 w-4 rounded border-[#CCCCCC]"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <p className="max-w-[280px] truncate font-bold text-[#111111]" title={product.title}>{product.title}</p>
                          <p className="mt-0.5 max-w-[280px] truncate text-[11px] text-[#999999]" title={product.externalId}>ID: {product.externalId}</p>
                        </td>
                        <td className="px-4 py-4 text-[#777777]">{product.category || "-"}</td>
                        <td className="px-4 py-4 text-right font-semibold text-[#111111]">${product.cost.toLocaleString("es-AR")}</td>
                        <td className="px-4 py-4 text-right font-semibold text-[#111111]">${price.toLocaleString("es-AR")}</td>
                        <td className="px-4 py-4 text-right text-[#777777]">{product.stock}</td>
                        <td className="px-4 py-4 text-right text-[#777777]">{product.variants.length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SourceButton({
  active,
  title,
  description,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border p-4 text-left transition-colors",
        active ? "border-[#111111] bg-[#FAFAFA]" : "border-[#E5E5E5] bg-white hover:border-[#CCCCCC]",
      )}
    >
      <span className={cn("mb-3 flex h-8 w-8 items-center justify-center rounded-md border", active ? "border-[#111111] bg-white text-[#111111]" : "border-[#E5E5E5] bg-[#FAFAFA] text-[#777777]")}>
        {icon}
      </span>
      <span className="block text-[13px] font-extrabold text-[#111111]">{title}</span>
      <span className="mt-1 block text-[12px] leading-relaxed text-[#888888]">{description}</span>
    </button>
  );
}

function DiscoverTab({ providers, connections, onConnect, isPending }: { providers: SourcingProvider[]; connections: ConnectedProviderData[]; onConnect: (id: string) => void; isPending: boolean }) {
  if (providers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAFA] py-20 text-center">
        <Globe2 className="mb-4 h-8 w-8 text-[#CCCCCC]" />
        <h3 className="text-[15px] font-bold text-[#111111]">Sin proveedores cargados</h3>
        <p className="mt-1 max-w-sm text-[13px] text-[#999999]">
          Carga un proveedor real desde CSV, feed o API. No hay proveedores preinventados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map(p => {
          const isConnected = connections.some(c => c.providerId === p.id);
          return (
            <div key={p.id} className="flex flex-col justify-between rounded-xl border border-[#E5E5E5] bg-white p-5 transition-all hover:border-[#CCCCCC] hover:shadow-sm">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#F5F5F5] border border-[#F0F0F0]">
                    <img src={p.logoUrl || ""} alt="" className="h-6 w-6 object-contain opacity-50 grayscale" />
                  </div>
                  {isConnected ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                      Conectado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#888888]">
                      {p.integrationType}
                    </span>
                  )}
                </div>
                <h3 className="mt-4 text-[15px] font-bold text-[#111111]">{p.name}</h3>
                <p className="mt-1.5 text-[13px] text-[#777777] leading-relaxed line-clamp-2">{p.description}</p>
                
                <div className="mt-5 space-y-2">
                  <div className="flex items-center gap-2 text-[12px] text-[#999999]">
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>{p.categories}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-[#999999]">
                    <ShoppingCart className="h-3.5 w-3.5" />
                    <span>Integracion {p.integrationType}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-[#F5F5F5]">
                {isConnected ? (
                  <button disabled className="flex w-full items-center justify-center gap-1.5 rounded-md bg-[#F5F5F5] py-2 text-[12px] font-bold text-[#AAAAAA]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Ya conectado
                  </button>
                ) : (
                  <button
                    onClick={() => onConnect(p.id)}
                    disabled={isPending}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md bg-[#111111] py-2 text-[12px] font-bold text-white transition-colors hover:bg-black disabled:opacity-50"
                  >
                    Conectar proveedor
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConnectedTab({ connections, onRefresh }: { connections: ConnectedProviderData[]; onRefresh: () => void }) {
  const [selectedProvider, setSelectedProvider] = useState<ConnectedProviderData | null>(null);

  if (connections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAFA] py-20 text-center">
        <Network className="h-8 w-8 text-[#CCCCCC] mb-4" />
        <h3 className="text-[15px] font-bold text-[#111111]">Ningún proveedor conectado</h3>
        <p className="mt-1 max-w-sm text-[13px] text-[#999999]">Usa "Import real" para cargar productos desde CSV, feed o API de tu proveedor.</p>
      </div>
    );
  }

  if (selectedProvider) {
    return <ProviderWorkbench connection={selectedProvider} onBack={() => setSelectedProvider(null)} onImportSuccess={onRefresh} />;
  }

  return (
    <div className="rounded-xl border border-[#E5E5E5] bg-white overflow-hidden">
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 border-b border-[#E5E5E5] bg-[#FAFAFA] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#888888]">
        <div className="w-8"></div>
        <div>Proveedor</div>
        <div className="w-32">Integración</div>
        <div className="w-32">Estado</div>
        <div className="w-24 text-right">Acciones</div>
      </div>
      <div className="divide-y divide-[#F0F0F0]">
        {connections.map(c => (
          <div key={c.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-6 py-4 hover:bg-[#FAFAFA] transition-colors">
            <div className="w-8">
              <div className="flex h-8 w-8 items-center justify-center rounded border border-[#E5E5E5] bg-white">
                <img src={c.provider.logoUrl || ""} alt="" className="h-5 w-5 object-contain grayscale" />
              </div>
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#111111]">{c.provider.name}</p>
              <p className="text-[12px] text-[#999999]">{c.provider.categories}</p>
            </div>
            <div className="w-32">
              <span className="rounded bg-[#F5F5F5] px-2 py-0.5 text-[11px] font-medium text-[#777777] uppercase tracking-wide">
                {c.provider.integrationType}
              </span>
            </div>
            <div className="w-32">
              <div className="flex items-center gap-1.5">
                <span className={cn("h-1.5 w-1.5 rounded-full", c.status === "active" ? "bg-emerald-500" : "bg-[#F5A623]")} />
                <span className="text-[13px] font-medium text-[#333333] capitalize">{c.status}</span>
              </div>
            </div>
            <div className="w-24 flex justify-end">
              <button
                onClick={() => setSelectedProvider(c)}
                className="rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-[12px] font-bold text-[#111111] shadow-sm hover:bg-[#F5F5F5] transition-colors"
              >
                Explorar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProviderWorkbench({ connection, onBack, onImportSuccess }: { connection: ConnectedProviderData; onBack: () => void; onImportSuccess: () => void }) {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getProviderExternalProductsAction(connection.providerId).then(res => {
      setProducts(res);
      setIsLoading(false);
    });
  }, [connection.providerId]);

  const handleImport = async (p: any) => {
    setImportingIds(prev => new Set(prev).add(p.externalId));
    try {
      const res = await importProductAction(connection.id, p.id);
      if (res?.existing) {
        alert(res.message); // O un toast más prolijo si tuviésemos
      } else {
        onImportSuccess();
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Ocurrió un error en la importación.");
    } finally {
      setImportingIds(prev => {
        const next = new Set(prev);
        next.delete(p.externalId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E5E5] bg-white text-[#888888] hover:text-[#111111] transition-colors">
          <ChevronRight className="h-4 w-4 rotate-180" />
        </button>
        <div>
          <h2 className="text-[18px] font-extrabold text-[#111111] leading-tight">Explorar {connection.provider.name}</h2>
          <p className="text-[12px] text-[#999999]">Explorá e importá productos a tu catálogo espejo interno.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex py-20 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#CCCCCC]" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.externalId} className="flex flex-col justify-between rounded-xl border border-[#E5E5E5] bg-white overflow-hidden">
              <div className="aspect-[4/3] bg-[#F5F5F5] relative">
                <img src={p.imageUrl} alt={p.title} className="absolute inset-0 w-full h-full object-cover" />
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <p className="text-[10px] font-bold text-[#BBBBBB] uppercase tracking-wider mb-1">{p.category}</p>
                <h4 className="text-[13px] font-bold text-[#111111] leading-tight mb-2 line-clamp-2">{p.title}</h4>
                <div className="mt-auto flex items-end justify-between">
                  <div>
                    <p className="text-[10px] text-[#888888]">Costo</p>
                    <p className="text-[15px] font-extrabold text-[#111111]">${p.cost.toLocaleString("es-AR")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[#888888]">Stock</p>
                    <p className="text-[13px] font-bold text-[#111111]">{p.stock} u.</p>
                  </div>
                </div>
              </div>
              <div className="p-4 pt-0">
                <button
                  onClick={() => handleImport(p)}
                  disabled={importingIds.has(p.externalId)}
                  className="flex w-full items-center justify-center gap-1.5 rounded bg-[#111111] py-2 text-[12px] font-bold text-white hover:bg-black disabled:opacity-50"
                  title="Importa al catálogo interno espejo"
                >
                  {importingIds.has(p.externalId) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  Importar a catálogo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ImportsTab({ mirrors }: { mirrors: MirrorData[] }) {
  if (mirrors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAFA] py-20 text-center">
        <PackageCheck className="h-8 w-8 text-[#CCCCCC] mb-4" />
        <h3 className="text-[15px] font-bold text-[#111111]">Catálogo Espejo Vacío</h3>
        <p className="mt-1 max-w-sm text-[13px] text-[#999999]">Aún no has importado productos. Explorá proveedores y sumá productos a tu catálogo espejo para publicarlos.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#E5E5E5] bg-white overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b border-[#E5E5E5] bg-[#FAFAFA] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#888888]">
        <div>Producto Interno</div>
        <div className="w-28">Proveedor</div>
        <div className="w-24 text-right">Costo/Precio</div>
        <div className="w-32">Estado interno</div>
        <div className="w-24 text-right">Acciones</div>
      </div>
      <div className="divide-y divide-[#F0F0F0]">
        {mirrors.map(m => (
          <div key={m.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-6 py-4 hover:bg-[#FAFAFA] transition-colors">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-10 w-10 shrink-0 rounded bg-[#F5F5F5] overflow-hidden border border-[#E5E5E5]">
                {m.internalProduct?.featuredImage && <img src={m.internalProduct.featuredImage} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[#111111] truncate">{m.internalProduct?.title || m.providerProduct.title}</p>
                <div className="flex items-center gap-2 text-[11px] text-[#999999] mt-0.5">
                  <span className="truncate">SKU: PROV-{m.providerProduct.externalId}</span>
                  <span className="text-[#E5E5E5]">&bull;</span>
                  <span>{m.providerProduct.stock} stock</span>
                </div>
              </div>
            </div>
            
            <div className="w-28 flex items-center gap-1.5">
              <img src={m.providerConnection.provider.logoUrl || ""} className="h-3 w-3 grayscale" />
              <span className="text-[12px] text-[#555555] truncate" title={m.providerConnection.provider.name}>
                {m.providerConnection.provider.name}
              </span>
            </div>

            <div className="w-24 text-right">
              <p className="text-[12px] text-[#999999] line-through decoration-[#CCCCCC]">${m.providerProduct.cost.toLocaleString("es-AR")}</p>
              <p className="text-[13px] font-bold text-[#111111]">${m.finalPrice?.toLocaleString("es-AR")}</p>
            </div>

            <div className="w-32 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className={cn("h-1.5 w-1.5 rounded-full", m.importStatus === "imported" ? "bg-emerald-500" : "bg-[#CCCCCC]")}/>
                <span className="text-[11px] font-medium text-[#777777]">Importado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn("h-1.5 w-1.5 rounded-full", m.syncStatus === "in_sync" ? "bg-emerald-500" : "bg-amber-500")}/>
                <span className="text-[11px] font-medium text-[#777777]">{m.syncStatus.replace(/_/g, " ")}</span>
              </div>
            </div>

            <div className="w-24 flex justify-end">
              <button
                className="rounded-md border border-[#E5E5E5] bg-white px-2.5 py-1 text-[11px] font-bold text-[#111111] shadow-sm hover:bg-[#F5F5F5] transition-colors"
                title="Editar en Catálogo Interno"
              >
                Editar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SyncTab({ jobs, connections, onReload }: { jobs: any[], connections: ConnectedProviderData[], onReload: () => void }) {
  const [isPending, startTransition] = useTransition();

  const handleLaunchJob = (connId: string) => {
    startTransition(async () => {
      try {
        const { enqueueProviderSyncJob } = await import("@/lib/sourcing/workers/actions");
        await enqueueProviderSyncJob(connId);
        onReload();
      } catch (e: any) {
        alert(e.message);
      }
    });
  };

  const getStatusColor = (s: string) => {
    if (s === "completed") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (s === "failed") return "bg-red-100 text-red-700 border-red-200";
    if (s === "running") return "bg-blue-100 text-blue-700 border-blue-200";
    return "bg-[#F5F5F5] text-[#888888] border-[#E5E5E5]"; // pending
  };

  return (
    <div className="space-y-6">
      {/* Action Zone */}
      <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
        <h3 className="text-[16px] font-extrabold text-[#111111] mb-2">Disparar Sincronización</h3>
        <p className="text-[13px] text-[#777777] mb-6 max-w-2xl">
          Ejecuta una lectura real contra feeds o APIs configuradas. Si hay diferencias, Nexora marca el catalogo espejo
          como pendiente de revision y no inventa cambios de stock ni precio.
        </p>

        <div className="flex gap-3 flex-wrap">
          {connections.map(c => (
            <button
              key={c.id}
              onClick={() => handleLaunchJob(c.id)}
              disabled={isPending}
              className="flex items-center gap-2 rounded-md border border-[#E5E5E5] bg-[#FAFAFA] px-4 py-2 text-[12px] font-bold text-[#111111] transition-colors hover:bg-white hover:shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isPending && "animate-spin")} />
              Sync {c.provider.name}
            </button>
          ))}
          {connections.length === 0 && (
             <span className="text-[13px] text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-200">
                No hay proveedores conectados para sincronizar.
             </span>
          )}
        </div>
      </div>

      {/* Logs / Queue Table */}
      <div className="rounded-xl border border-[#E5E5E5] bg-white overflow-hidden shadow-sm">
        <div className="border-b border-[#E5E5E5] bg-[#FAFAFA] px-6 py-4">
          <h3 className="text-[14px] font-extrabold text-[#111111]">Historial de imports y sync</h3>
        </div>

        {jobs.length === 0 ? (
          <div className="p-8 text-center text-[#999999] text-[13px]">No hay ejecuciones recientes.</div>
        ) : (
          <table className="w-full text-[13px] text-left">
            <thead className="bg-[#FAFAFA] text-[11px] font-bold uppercase tracking-wider text-[#888888] border-b border-[#E5E5E5]">
              <tr>
                <th className="px-6 py-3">Proveedor</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Inicio / Fin</th>
                <th className="px-6 py-3">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {jobs.map(job => (
                <tr key={job.id} className="hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-6 py-3 font-bold text-[#111111]">
                    {job.providerConnection?.provider?.name || "-"}
                  </td>
                  <td className="px-6 py-3">
                    <span className={cn("inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", getStatusColor(job.status))}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-[#777777] text-[11px]">
                    <div>In: {job.startedAt ? new Date(job.startedAt).toLocaleString() : "-"}</div>
                    <div>Out: {job.completedAt || job.failedAt ? new Date(job.completedAt || job.failedAt).toLocaleString() : "-"}</div>
                  </td>
                  <td className="px-6 py-3">
                    {job.status === "failed" ? (
                      <span className="text-red-500 text-[12px] font-medium block max-w-xs truncate" title={job.lastError || ""}>{job.lastError}</span>
                    ) : (
                      <span className="text-[#555555] text-[12px] font-medium block max-w-xs">{job.resultJson || "-"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
