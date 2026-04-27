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
        <Loader2 className="h-5 w-5 animate-spin text-ink-6" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-[var(--dur-slow)] space-y-8">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] lg:text-[32px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink-0">Abastecimiento.</h1>
          <p className="mt-2 text-[14px] leading-[1.55] text-ink-5">
            Conectá proveedores, importá productos y armá tu catálogo B2B.
          </p>
        </div>
        <div className="flex gap-2">
          {connections.length > 0 && (
            <div className="inline-flex items-center gap-1.5 h-8 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3">
              <Network className="h-3.5 w-3.5 text-ink-4" strokeWidth={1.75} />
              <span className="text-[12px] font-semibold text-ink-0">{connections.length}</span>
              <span className="text-[11px] text-ink-5">conectados</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex items-center gap-6 overflow-x-auto border-b border-[color:var(--hairline)] px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
        "group relative flex shrink-0 items-center gap-2 pb-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
        active ? "text-ink-0" : "text-ink-5 hover:text-ink-0"
      )}
    >
      <span className={cn(active ? "text-ink-0" : "text-ink-6 group-hover:text-ink-0")}>{icon}</span>
      {children}
      {typeof badge === "number" && badge > 0 && (
        <span className={cn("inline-flex items-center h-4 px-1 rounded-[var(--r-xs)] text-[10px] font-medium uppercase tracking-[0.14em]", active ? "bg-ink-0 text-ink-12" : "bg-[var(--surface-2)] text-ink-5")}>
          {badge}
        </span>
      )}
      {active && <span className="absolute bottom-0 left-0 h-[2px] w-full bg-ink-0" />}
    </button>
  );
}

function detectionLabel(source: NonNullable<SourcingImportPreview["detectedSource"]>): string {
  switch (source) {
    case "feed-csv": return "Feed CSV";
    case "feed-xml": return "Feed XML";
    case "product": return "Producto individual";
    case "feed-json": return "Feed JSON";
    case "shopify": return "Shopify";
    case "structured-data": return "schema.org Product";
    case "sitemap": return "Sitemap";
    case "html-catalog": return "Catálogo HTML";
    case "unknown":
    default: return "Sin detectar";
  }
}

function diagnosticColor(status: "ok" | "warn" | "error" | "info"): string {
  if (status === "error") return "text-[color:var(--signal-danger)]";
  if (status === "warn") return "text-[color:var(--signal-warning)]";
  if (status === "ok") return "text-[color:var(--signal-success)]";
  return "text-ink-5";
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

  const inputCls = "w-full h-10 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 text-[13px] text-ink-0 outline-none transition-[box-shadow,border-color] placeholder:text-ink-6 focus:bg-[var(--surface-0)] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)]";
  const primaryBtn = "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--r-sm)] bg-ink-0 text-[12px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]";
  const secondaryBtn = "inline-flex items-center justify-center gap-2 h-10 px-3 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-[12px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]";

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-ink-0">Abastecimiento real</h2>
            <p className="mt-2 max-w-2xl text-[13px] leading-[1.55] text-ink-5">
              Importá productos reales desde un archivo, una URL de tienda o catálogo, o una API de proveedor.
              Nexora normaliza nombres, categorías y variantes sin inventar productos ni marcar sync cuando la
              fuente no responde.
            </p>
          </div>
          <button type="button" onClick={downloadTemplate} className={secondaryBtn}>
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
            title="URL de tienda o catálogo"
            description="Pegá una URL de tienda, colección, sitemap o feed directo. Nexora detecta la fuente."
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

      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        {sourceType === "csv" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <label className="block">
              <span className="text-[12px] font-medium text-ink-5">Subir CSV del proveedor</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => handleCsvFile(event.target.files?.[0] ?? null)}
                className="mt-2 block w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 py-2 text-[13px] text-ink-3 file:mr-3 file:rounded-[var(--r-xs)] file:border-0 file:bg-ink-0 file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-ink-12"
              />
              <span className="mt-2 block text-[12px] text-ink-5">
                Columnas obligatorias: externalId, title, cost, stock. Variantes por fila con el mismo externalId.
              </span>
            </label>
            <button type="button" onClick={runPreview} disabled={isPending || csvText.trim().length === 0} className={primaryBtn}>
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
              Previsualizar
            </button>
          </div>
        )}

        {sourceType === "feed" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <label className="block">
              <span className="text-[12px] font-medium text-ink-5">URL de tienda, catálogo o feed</span>
              <input
                value={feedUrl}
                onChange={(event) => { setFeedUrl(event.target.value); setPreview(null); }}
                placeholder="https://tienda.com, /collections/ofertas o /feed.csv"
                className={cn(inputCls, "mt-2")}
              />
              <span className="mt-2 block text-[12px] text-ink-5">
                Nexora intenta detectar automáticamente el tipo de fuente (producto individual, feed directo,
                Shopify, schema.org, sitemap o catálogo HTML). No toda URL es soportable: si no se puede extraer
                un resultado utilizable, se reporta el diagnóstico completo y no se importa nada.
              </span>
            </label>
            <button type="button" onClick={runPreview} disabled={isPending || feedUrl.trim().length === 0} className={primaryBtn}>
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
              Analizar URL
            </button>
          </div>
        )}

        {sourceType === "api" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px_auto] lg:items-end">
            <label className="block">
              <span className="text-[12px] font-medium text-ink-5">URL base / endpoint de productos</span>
              <input
                value={apiUrl}
                onChange={(event) => { setApiUrl(event.target.value); setPreview(null); }}
                placeholder="https://api.proveedor.com/products"
                className={cn(inputCls, "mt-2")}
              />
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-ink-5">API key opcional</span>
              <input
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="No se muestra en logs"
                type="password"
                className={cn(inputCls, "mt-2")}
              />
            </label>
            <button type="button" onClick={runPreview} disabled={isPending || apiUrl.trim().length === 0} className={primaryBtn}>
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
              Consultar API
            </button>
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3 text-[13px] text-[color:var(--signal-danger)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div role="status" className="flex items-start gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3 text-[13px] text-[color:var(--signal-success)]">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>{success}</span>
        </div>
      )}

      {preview && (
        <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-[color:var(--hairline)] bg-[var(--surface-1)] px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[14px] font-semibold text-ink-0">Preview de productos reales</h3>
                {preview.detectedSource && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--hairline)] bg-[var(--surface-0)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
                    {detectionLabel(preview.detectedSource)}
                  </span>
                )}
                {preview.extractorUsed && (
                  <span className="inline-flex items-center rounded-full bg-ink-0 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-12">
                    {preview.extractorUsed}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[12px] text-ink-5">
                {preview.products.length} producto(s) válidos, {preview.errors.length} alerta(s) de validación.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={toggleAll} disabled={preview.products.length === 0} className={secondaryBtn}>
                {selectedIds.size === preview.products.length ? "Deseleccionar" : "Seleccionar todo"}
              </button>
              <button type="button" onClick={runImport} disabled={isPending || selectedProducts.length === 0} className={primaryBtn}>
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Importar {selectedProducts.length}
              </button>
            </div>
          </div>

          {preview.diagnostics && preview.diagnostics.length > 0 && (
            <details className="border-b border-[color:var(--hairline)] bg-[var(--surface-1)] px-6 py-3 text-[12px] text-ink-5">
              <summary className="cursor-pointer select-none text-[11px] font-medium uppercase tracking-[0.1em] text-ink-3">
                Diagnóstico del pipeline ({preview.diagnostics.length} paso{preview.diagnostics.length === 1 ? "" : "s"})
              </summary>
              <ol className="mt-2 max-h-64 space-y-1 overflow-auto pl-0">
                {preview.diagnostics.map((d, i) => (
                  <li key={i} className="grid grid-cols-[64px_110px_90px_1fr] gap-2 rounded-[var(--r-xs)] px-2 py-1 font-mono text-[11px]">
                    <span className="tabular-nums text-ink-5">{d.elapsedMs}ms</span>
                    <span className="truncate text-ink-3" title={d.step}>{d.step}</span>
                    <span className={cn("uppercase tracking-[0.08em]", diagnosticColor(d.status))}>{d.status}</span>
                    <span className="truncate text-ink-3" title={d.message}>{d.message}</span>
                  </li>
                ))}
              </ol>
            </details>
          )}

          {preview.errors.length > 0 && (
            <div className="border-b border-[color:var(--hairline)] px-6 py-4">
              <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-[color:var(--signal-danger)]">
                <XCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
                Errores por fila
              </div>
              <div className="max-h-36 overflow-auto rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
                {preview.errors.slice(0, 12).map((item, index) => (
                  <div key={`${item.row}-${item.field}-${index}`} className="grid grid-cols-[64px_120px_1fr] gap-3 border-b border-[color:var(--hairline)] px-3 py-2 text-[12px] last:border-b-0">
                    <span className="font-semibold text-ink-0">Fila {item.row}</span>
                    <span className="text-ink-5">{item.field}</span>
                    <span className="text-[color:var(--signal-danger)]">{item.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {preview.products.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
                <PackageCheck className="h-5 w-5 text-ink-5" strokeWidth={1.5} />
              </div>
              <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-ink-0">Sin productos válidos</h3>
              <p className="mt-2 max-w-sm text-[13px] leading-[1.55] text-ink-5">Corregi los errores de formato y volvé a previsualizar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[color:var(--hairline)] bg-[var(--surface-1)]">
                    <th className="w-12 px-6 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === preview.products.length}
                        onChange={toggleAll}
                        aria-label="Seleccionar todos los productos"
                        className="h-4 w-4 rounded-[var(--r-xs)] border-[color:var(--hairline-strong)] accent-ink-0 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Producto</th>
                    <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Calidad</th>
                    <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Categoría</th>
                    <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 text-right">Precio</th>
                    <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 text-right">Variantes</th>
                    <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 text-right">Imgs</th>
                    <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 text-right">Specs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--hairline)]">
                  {preview.products.map((product) => {
                    const selected = selectedIds.has(product.externalId);
                    const price = product.suggestedPrice ?? product.cost;
                    const compareAt = product.compareAtPrice ?? null;
                    const hasCompare = typeof compareAt === "number" && compareAt > price;
                    const identifierBits = [
                      product.identifiers?.sku && `SKU ${product.identifiers.sku}`,
                      product.identifiers?.gtin && `GTIN ${product.identifiers.gtin}`,
                      product.identifiers?.mpn && `MPN ${product.identifiers.mpn}`,
                    ].filter(Boolean) as string[];
                    const variantsCount = product.variants.length;
                    const imagesCount = product.imageUrls.length;
                    const attributesCount = product.attributes?.length ?? 0;
                    const extraction = product.extraction;
                    const isDefaultVariant = variantsCount === 1 && product.variants[0]?.title === "Default";
                    const visibleVariants = isDefaultVariant ? 0 : variantsCount;
                    return (
                      <tr key={product.externalId} className={cn("transition-colors hover:bg-[var(--surface-1)]", selected && "bg-[var(--surface-2)]")}>
                        <td className="px-6 py-4 align-top">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleProduct(product.externalId)}
                            aria-label={`Seleccionar ${product.title}`}
                            className="h-4 w-4 rounded-[var(--r-xs)] border-[color:var(--hairline-strong)] accent-ink-0 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="max-w-[280px] truncate text-[13px] font-medium text-ink-0" title={product.title}>{product.title}</p>
                          <p className="mt-0.5 max-w-[280px] truncate text-[11px] text-ink-5" title={product.brand ?? undefined}>
                            {product.brand ?? <span className="italic">Sin marca</span>}
                          </p>
                          {identifierBits.length > 0 && (
                            <p className="mt-0.5 max-w-[280px] truncate text-[11px] font-mono text-ink-5" title={identifierBits.join(" · ")}>
                              {identifierBits.join(" · ")}
                            </p>
                          )}
                          <p className="mt-0.5 max-w-[280px] truncate text-[11px] font-mono text-ink-5" title={product.externalId}>
                            ID: {product.externalId}
                          </p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          {extraction ? (
                            <div className="space-y-1">
                              <span className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]",
                                extraction.confidence === "complete" && "bg-[color:var(--signal-success)]/15 text-[color:var(--signal-success)]",
                                extraction.confidence === "partial" && "bg-[color:var(--signal-warning)]/15 text-[color:var(--signal-warning)]",
                                extraction.confidence === "minimal" && "bg-[color:var(--signal-danger)]/15 text-[color:var(--signal-danger)]",
                              )}>
                                {extraction.confidence === "complete" && "Completa"}
                                {extraction.confidence === "partial" && "Parcial"}
                                {extraction.confidence === "minimal" && "Mínima"}
                              </span>
                              {extraction.missingCriticalFields.length > 0 && (
                                <p className="max-w-[200px] text-[11px] text-[color:var(--signal-danger)]" title={extraction.missingCriticalFields.join(", ")}>
                                  Faltan: {extraction.missingCriticalFields.join(", ")}
                                </p>
                              )}
                              {extraction.extractedFrom.length > 0 && (
                                <p className="max-w-[200px] truncate text-[10px] font-mono text-ink-5" title={extraction.extractedFrom.join(" + ")}>
                                  {extraction.extractedFrom.join(" + ")}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-ink-5">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 align-top text-ink-5">{product.category || "-"}</td>
                        <td className="px-4 py-4 align-top text-right tabular-nums">
                          {hasCompare && (
                            <div className="text-[11px] text-ink-5 line-through">${compareAt!.toLocaleString("es-AR")}</div>
                          )}
                          <div className={cn("font-semibold text-ink-0", product.suggestedPrice == null && "text-[color:var(--signal-warning)]")}>
                            ${price.toLocaleString("es-AR")}
                            {product.currency && <span className="ml-1 text-[10px] font-normal text-ink-5">{product.currency}</span>}
                          </div>
                          {product.suggestedPrice == null && (
                            <div className="text-[10px] text-[color:var(--signal-warning)]">precio estimado</div>
                          )}
                        </td>
                        <td className="px-4 py-4 align-top text-right tabular-nums text-ink-5">
                          {visibleVariants > 0 ? (
                            <span title={product.variants.map((v) => v.title).join(", ")}>{visibleVariants}</span>
                          ) : (
                            <span className="text-ink-5">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 align-top text-right tabular-nums text-ink-5">{imagesCount}</td>
                        <td className="px-4 py-4 align-top text-right tabular-nums text-ink-5">
                          {attributesCount > 0 ? (
                            <span title={product.attributes?.map((a) => `${a.key}: ${a.value}`).join("\n")}>{attributesCount}</span>
                          ) : (
                            <span>-</span>
                          )}
                        </td>
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
        "rounded-[var(--r-sm)] border p-4 text-left transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
        active ? "border-ink-0 bg-[var(--surface-1)]" : "border-[color:var(--hairline)] bg-[var(--surface-0)] hover:bg-[var(--surface-1)]",
      )}
    >
      <span className={cn("mb-3 inline-flex h-8 w-8 items-center justify-center rounded-[var(--r-xs)] border", active ? "border-ink-0 bg-[var(--surface-0)] text-ink-0" : "border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-5")}>
        {icon}
      </span>
      <span className="block text-[13px] font-semibold text-ink-0">{title}</span>
      <span className="mt-1 block text-[12px] leading-[1.55] text-ink-5">{description}</span>
    </button>
  );
}

function DiscoverTab({ providers, connections, onConnect, isPending }: { providers: SourcingProvider[]; connections: ConnectedProviderData[]; onConnect: (id: string) => void; isPending: boolean }) {
  if (providers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[var(--r-md)] border border-dashed border-[color:var(--hairline)] bg-[var(--surface-1)] py-20 text-center">
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
          <Globe2 className="h-5 w-5 text-ink-5" strokeWidth={1.5} />
        </div>
        <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-ink-0">Sin proveedores cargados</h3>
        <p className="mt-2 max-w-sm text-[13px] leading-[1.55] text-ink-5">
          Cargá un proveedor real desde CSV, URL de tienda/catálogo o API. No hay proveedores preinventados.
        </p>
      </div>
    );
  }

  const chipBase = "inline-flex items-center h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-medium uppercase tracking-[0.14em]";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map(p => {
          const isConnected = connections.some(c => c.providerId === p.id);
          return (
            <div key={p.id} className="flex flex-col justify-between rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 transition-colors hover:bg-[var(--surface-1)]">
              <div>
                <div className="flex items-start justify-between">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--r-sm)] bg-[var(--surface-1)] border border-[color:var(--hairline)]">
                    <img src={p.logoUrl || ""} alt="" className="h-6 w-6 object-contain opacity-60 grayscale" />
                  </div>
                  {isConnected ? (
                    <span className={cn(chipBase, "text-[color:var(--signal-success)]")}>Conectado</span>
                  ) : (
                    <span className={cn(chipBase, "text-ink-5")}>{p.integrationType}</span>
                  )}
                </div>
                <h3 className="mt-4 text-[14px] font-semibold text-ink-0">{p.name}</h3>
                <p className="mt-1.5 text-[13px] leading-[1.55] text-ink-5 line-clamp-2">{p.description}</p>

                <div className="mt-5 space-y-2">
                  <div className="flex items-center gap-2 text-[12px] text-ink-5">
                    <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.75} />
                    <span>{p.categories}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-ink-5">
                    <ShoppingCart className="h-3.5 w-3.5" strokeWidth={1.75} />
                    <span>Integración {p.integrationType}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-[color:var(--hairline)]">
                {isConnected ? (
                  <button disabled className="flex w-full items-center justify-center gap-1.5 h-10 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-[12px] font-medium text-ink-5">
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Ya conectado
                  </button>
                ) : (
                  <button
                    onClick={() => onConnect(p.id)}
                    disabled={isPending}
                    className="flex w-full items-center justify-center gap-1.5 h-10 rounded-[var(--r-sm)] bg-ink-0 text-[12px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
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
      <div className="flex flex-col items-center justify-center rounded-[var(--r-md)] border border-dashed border-[color:var(--hairline)] bg-[var(--surface-1)] py-20 text-center">
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
          <Network className="h-5 w-5 text-ink-5" strokeWidth={1.5} />
        </div>
        <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-ink-0">Ningún proveedor conectado</h3>
        <p className="mt-2 max-w-sm text-[13px] leading-[1.55] text-ink-5">Usa “Import real” para cargar productos desde CSV, URL de tienda o API del proveedor.</p>
      </div>
    );
  }

  if (selectedProvider) {
    return <ProviderWorkbench connection={selectedProvider} onBack={() => setSelectedProvider(null)} onImportSuccess={onRefresh} />;
  }

  const chipBase = "inline-flex items-center h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-medium uppercase tracking-[0.14em]";

  return (
    <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] overflow-hidden">
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 border-b border-[color:var(--hairline)] bg-[var(--surface-1)] px-6 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
        <div className="w-8"></div>
        <div>Proveedor</div>
        <div className="w-32">Integración</div>
        <div className="w-32">Estado</div>
        <div className="w-24 text-right">Acciones</div>
      </div>
      <div className="divide-y divide-[color:var(--hairline)]">
        {connections.map(c => (
          <div key={c.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-6 py-4 hover:bg-[var(--surface-1)] transition-colors">
            <div className="w-8">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
                <img src={c.provider.logoUrl || ""} alt="" className="h-5 w-5 object-contain grayscale opacity-60" />
              </div>
            </div>
            <div>
              <p className="text-[13px] font-medium text-ink-0">{c.provider.name}</p>
              <p className="text-[11px] text-ink-5">{c.provider.categories}</p>
            </div>
            <div className="w-32">
              <span className={cn(chipBase, "text-ink-5")}>
                {c.provider.integrationType}
              </span>
            </div>
            <div className="w-32">
              <div className="flex items-center gap-1.5">
                <span className={cn("h-1.5 w-1.5 rounded-full", c.status === "active" ? "bg-[var(--signal-success)]" : "bg-[var(--signal-warning)]")} />
                <span className="text-[12px] font-medium text-ink-3 capitalize">{c.status}</span>
              </div>
            </div>
            <div className="w-24 flex justify-end">
              <button
                onClick={() => setSelectedProvider(c)}
                className="inline-flex items-center h-9 px-3 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-[12px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
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
        <button onClick={onBack} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--hairline)] bg-[var(--surface-0)] text-ink-5 hover:text-ink-0 hover:bg-[var(--surface-2)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]">
          <ChevronRight className="h-4 w-4 rotate-180" strokeWidth={1.75} />
        </button>
        <div>
          <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-ink-0">Explorar {connection.provider.name}</h2>
          <p className="text-[12px] text-ink-5">Explorá e importá productos a tu catálogo espejo interno.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex py-20 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-6" strokeWidth={1.75} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.externalId} className="flex flex-col justify-between rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] overflow-hidden">
              <div className="aspect-[4/3] bg-[var(--surface-1)] relative">
                <img src={p.imageUrl} alt={p.title} className="absolute inset-0 w-full h-full object-cover" />
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <p className="text-[10px] font-medium text-ink-5 uppercase tracking-[0.14em] mb-1">{p.category}</p>
                <h4 className="text-[13px] font-medium text-ink-0 leading-tight mb-2 line-clamp-2">{p.title}</h4>
                <div className="mt-auto flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Costo</p>
                    <p className="text-[15px] font-semibold tabular-nums text-ink-0">${p.cost.toLocaleString("es-AR")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Stock</p>
                    <p className="text-[13px] font-semibold tabular-nums text-ink-0">{p.stock} u.</p>
                  </div>
                </div>
              </div>
              <div className="p-4 pt-0">
                <button
                  onClick={() => handleImport(p)}
                  disabled={importingIds.has(p.externalId)}
                  className="flex w-full items-center justify-center gap-1.5 h-10 rounded-[var(--r-sm)] bg-ink-0 text-[12px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
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
      <div className="flex flex-col items-center justify-center rounded-[var(--r-md)] border border-dashed border-[color:var(--hairline)] bg-[var(--surface-1)] py-20 text-center">
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
          <PackageCheck className="h-5 w-5 text-ink-5" strokeWidth={1.5} />
        </div>
        <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-ink-0">Catálogo espejo vacío</h3>
        <p className="mt-2 max-w-sm text-[13px] leading-[1.55] text-ink-5">Aún no importaste productos. Explorá proveedores y sumá productos a tu catálogo espejo para publicarlos.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b border-[color:var(--hairline)] bg-[var(--surface-1)] px-6 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
        <div>Producto interno</div>
        <div className="w-28">Proveedor</div>
        <div className="w-24 text-right">Costo / Precio</div>
        <div className="w-32">Estado interno</div>
        <div className="w-24 text-right">Acciones</div>
      </div>
      <div className="divide-y divide-[color:var(--hairline)]">
        {mirrors.map(m => (
          <div key={m.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-6 py-4 hover:bg-[var(--surface-1)] transition-colors">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-10 w-10 shrink-0 rounded-[var(--r-sm)] bg-[var(--surface-1)] overflow-hidden border border-[color:var(--hairline)]">
                {m.internalProduct?.featuredImage && <img src={m.internalProduct.featuredImage} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink-0 truncate">{m.internalProduct?.title || m.providerProduct.title}</p>
                <div className="flex items-center gap-2 text-[11px] text-ink-5 mt-0.5">
                  <span className="truncate font-mono">SKU: PROV-{m.providerProduct.externalId}</span>
                  <span className="text-ink-7">&bull;</span>
                  <span>{m.providerProduct.stock} stock</span>
                </div>
              </div>
            </div>

            <div className="w-28 flex items-center gap-1.5">
              <img src={m.providerConnection.provider.logoUrl || ""} className="h-3 w-3 grayscale opacity-60" />
              <span className="text-[12px] text-ink-3 truncate" title={m.providerConnection.provider.name}>
                {m.providerConnection.provider.name}
              </span>
            </div>

            <div className="w-24 text-right">
              <p className="text-[11px] text-ink-5 line-through decoration-ink-6 tabular-nums">${m.providerProduct.cost.toLocaleString("es-AR")}</p>
              <p className="text-[13px] font-semibold text-ink-0 tabular-nums">${m.finalPrice?.toLocaleString("es-AR")}</p>
            </div>

            <div className="w-32 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className={cn("h-1.5 w-1.5 rounded-full", m.importStatus === "imported" ? "bg-[var(--signal-success)]" : "bg-ink-6")}/>
                <span className="text-[11px] font-medium text-ink-5">Importado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn("h-1.5 w-1.5 rounded-full", m.syncStatus === "in_sync" ? "bg-[var(--signal-success)]" : "bg-[var(--signal-warning)]")}/>
                <span className="text-[11px] font-medium text-ink-5">{m.syncStatus.replace(/_/g, " ")}</span>
              </div>
            </div>

            <div className="w-24 flex justify-end">
              <button
                className="inline-flex items-center h-8 px-3 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] text-[11px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
                title="Editar en catálogo interno"
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

  const chipBase = "inline-flex items-center h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-medium uppercase tracking-[0.14em]";
  const getStatusTone = (s: string) => {
    if (s === "completed") return "text-[color:var(--signal-success)]";
    if (s === "failed") return "text-[color:var(--signal-danger)]";
    if (s === "running") return "text-ink-0";
    return "text-ink-5"; // pending
  };

  return (
    <div className="space-y-6">
      {/* Action Zone */}
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <h3 className="text-[14px] font-semibold text-ink-0 mb-2">Disparar sincronización</h3>
        <p className="text-[13px] leading-[1.55] text-ink-5 mb-6 max-w-2xl">
          Ejecuta una lectura real contra las fuentes configuradas (URL de tienda, feed o API). Si hay diferencias,
          Nexora marca el catálogo espejo como pendiente de revisión y no inventa cambios de stock ni precio.
        </p>

        <div className="flex gap-3 flex-wrap">
          {connections.map(c => (
            <button
              key={c.id}
              onClick={() => handleLaunchJob(c.id)}
              disabled={isPending}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-[12px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isPending && "animate-spin")} strokeWidth={1.75} />
              Sync {c.provider.name}
            </button>
          ))}
          {connections.length === 0 && (
             <span className="inline-flex items-center h-10 px-3 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-[13px] font-medium text-[color:var(--signal-warning)]">
                No hay proveedores conectados para sincronizar.
             </span>
          )}
        </div>
      </div>

      {/* Logs / Queue Table */}
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] overflow-hidden">
        <div className="border-b border-[color:var(--hairline)] bg-[var(--surface-1)] px-6 py-4">
          <h3 className="text-[14px] font-semibold text-ink-0">Historial de imports y sync</h3>
        </div>

        {jobs.length === 0 ? (
          <div className="p-8 text-center text-ink-5 text-[13px]">No hay ejecuciones recientes.</div>
        ) : (
          <table className="w-full text-[13px] text-left">
            <thead>
              <tr className="border-b border-[color:var(--hairline)] bg-[var(--surface-1)]">
                <th className="px-6 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Proveedor</th>
                <th className="px-6 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Estado</th>
                <th className="px-6 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Inicio / Fin</th>
                <th className="px-6 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--hairline)]">
              {jobs.map(job => (
                <tr key={job.id} className="hover:bg-[var(--surface-1)] transition-colors">
                  <td className="px-6 py-3 text-[13px] font-medium text-ink-0">
                    {job.providerConnection?.provider?.name || "-"}
                  </td>
                  <td className="px-6 py-3">
                    <span className={cn(chipBase, getStatusTone(job.status))}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-ink-5 text-[11px] tabular-nums">
                    <div>In: {job.startedAt ? new Date(job.startedAt).toLocaleString() : "-"}</div>
                    <div>Out: {job.completedAt || job.failedAt ? new Date(job.completedAt || job.failedAt).toLocaleString() : "-"}</div>
                  </td>
                  <td className="px-6 py-3">
                    {job.status === "failed" ? (
                      <span className="text-[color:var(--signal-danger)] text-[12px] font-medium block max-w-xs truncate" title={job.lastError || ""}>{job.lastError}</span>
                    ) : (
                      <span className="text-ink-3 text-[12px] block max-w-xs">{job.resultJson || "-"}</span>
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
