"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ArrowRight,
  Box,
  CheckCircle2,
  ChevronRight,
  Download,
  ExternalLink,
  Globe2,
  LayoutGrid,
  Loader2,
  Network,
  PackageCheck,
  Search,
  ShoppingCart,
  Truck,
  UploadCloud,
  XCircle,
  RefreshCw,
  PlayCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getProvidersAction,
  getConnectedProvidersAction,
  getImportedProductsAction,
  connectProviderAction,
  getMockProviderExternalProductsAction,
  importProductAction,
} from "@/lib/sourcing/actions";
import { enqueueProviderSyncJob, getProviderSyncJobs } from "@/lib/sourcing/workers/actions";
import type { SourcingProvider, ProviderConnection, CatalogMirrorProduct, ProviderProduct, Product } from "@prisma/client";

// ─── Types ───

type TabKey = "discover" | "connected" | "imports" | "sync";

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

export function SourcingPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("discover");
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
      <div className="flex items-center gap-6 border-b border-[#E5E5E5] px-1">
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
          Workers & Sync
        </TabButton>
      </div>

      {/* ─── Content ─── */}
      <div className="mt-6">
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
        "group relative flex items-center gap-2 pb-3 text-[13px] font-semibold transition-colors",
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

function DiscoverTab({ providers, connections, onConnect, isPending }: { providers: SourcingProvider[]; connections: ConnectedProviderData[]; onConnect: (id: string) => void; isPending: boolean }) {
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
                    <span>{p.supportedChannels.split(",").join(" · ")}</span>
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
        <p className="mt-1 max-w-sm text-[13px] text-[#999999]">Buscá en la pestaña "Descubrir" e integrá tu cuenta con proveedores de dropshipping.</p>
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
    getMockProviderExternalProductsAction(connection.providerId).then(res => {
      setProducts(res);
      setIsLoading(false);
    });
  }, [connection.providerId]);

  const handleImport = async (p: any) => {
    setImportingIds(prev => new Set(prev).add(p.externalId));
    try {
      await importProductAction(connection.id, p);
      onImportSuccess();
    } catch (e) {
      console.error(e);
      alert("Error o el producto ya existe.");
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
        <div className="w-32">Estado Canales</div>
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
                <span className={cn("h-1.5 w-1.5 rounded-full", m.publicationStatusML === "published" ? "bg-emerald-500" : "bg-[#CCCCCC]")}/>
                <span className="text-[11px] font-medium text-[#777777]">M. Libre</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn("h-1.5 w-1.5 rounded-full", m.publicationStatusShopify === "published" ? "bg-emerald-500" : "bg-[#CCCCCC]")}/>
                <span className="text-[11px] font-medium text-[#777777]">Shopify</span>
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
          Ejecutá los workers de fondo para consultar catálogos vivos de los proveedores activos.
          Las variaciones de costo y stock impactarán la base de datos interna de Nexora instantáneamente.
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
          <h3 className="text-[14px] font-extrabold text-[#111111]">Historial de Tareas (Workers)</h3>
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
