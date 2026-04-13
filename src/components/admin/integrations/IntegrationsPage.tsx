"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CreditCard,
  Filter,
  Globe,
  Layers,
  ListChecks,
  Plug,
  Radio,
  Search,
  Truck,
  X,
} from "lucide-react";

import { IntegrationDrawer } from "@/components/admin/integrations/IntegrationDrawer";
import { StatusBadge, HealthBadge, HealthDot, LogSeverityBadge, LogStatusBadge } from "@/components/admin/integrations/IntegrationBadge";
import { TableSkeleton } from "@/components/admin/orders/TableSkeleton";
import {
  MOCK_CHANNELS,
  MOCK_PAYMENTS,
  MOCK_SUPPLIERS,
  MOCK_LOGISTICS,
  MOCK_TRACKING,
  MOCK_LOGS,
  MOCK_INTEGRATIONS_SUMMARY,
} from "@/lib/mocks/integrations";
import { cn } from "@/lib/utils";
import type { Integration, IntegrationLog, IntegrationStatus } from "@/types/integrations";

type TabValue = "resumen" | "canales" | "pagos" | "proveedores" | "logistica" | "tracking" | "logs";
type VisualScenario = "live" | "empty" | "error";

type DrawerContent =
  | { kind: "integration"; data: Integration }
  | { kind: "log"; data: IntegrationLog };

interface ToastMessage { id: string; title: string; description: string; }

const timeFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("resumen");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | IntegrationStatus>("all");
  const [visualScenario, setVisualScenario] = useState<VisualScenario>("live");
  const [isLoading, setIsLoading] = useState(true);
  const [drawerContent, setDrawerContent] = useState<DrawerContent | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => { if (!isLoading) return; const t = window.setTimeout(() => setIsLoading(false), 720); return () => window.clearTimeout(t); }, [isLoading]);

  const tabs: Array<{ label: string; value: TabValue; icon: React.ReactNode }> = [
    { label: "Resumen", value: "resumen", icon: <Layers className="h-3.5 w-3.5" /> },
    { label: "Canales", value: "canales", icon: <Globe className="h-3.5 w-3.5" /> },
    { label: "Pagos", value: "pagos", icon: <CreditCard className="h-3.5 w-3.5" /> },
    { label: "Proveedores", value: "proveedores", icon: <Plug className="h-3.5 w-3.5" /> },
    { label: "Logistica", value: "logistica", icon: <Truck className="h-3.5 w-3.5" /> },
    { label: "Tracking", value: "tracking", icon: <Radio className="h-3.5 w-3.5" /> },
    { label: "Logs", value: "logs", icon: <ListChecks className="h-3.5 w-3.5" /> },
  ];

  const handleTabChange = (v: TabValue) => { if (v === activeTab) return; setActiveTab(v); setSearchQuery(""); setStatusFilter("all"); setVisualScenario("live"); setIsLoading(true); };

  const pushToast = (title: string, description: string) => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setToasts((c) => [...c, { id, title, description }]);
    window.setTimeout(() => setToasts((c) => c.filter((t) => t.id !== id)), 3200);
  };

  const openDrawer = (c: DrawerContent) => setDrawerContent(c);
  const closeDrawer = () => setDrawerContent(null);
  const handleAction = (action: string) => { pushToast(action, "Accion simulada correctamente (mock)."); };
  const resetFilters = () => { setSearchQuery(""); setStatusFilter("all"); setVisualScenario("live"); };

  const showToolbar = activeTab !== "resumen";
  const showStatusFilter = activeTab !== "logs" && activeTab !== "resumen";

  return (
    <div className="animate-in fade-in space-y-8 pb-32 duration-700">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#111111]">Integraciones</h1>
          <p className="mt-1 text-[15px] font-medium text-[#666666]">Canales, pagos, proveedores y servicios conectados al ecosistema.</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-sm">
        <div aria-label="Secciones de integraciones" className="flex items-center gap-8 overflow-x-auto border-b border-[#EAEAEA] bg-[#FAFAFA]/50 px-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" role="tablist">
          {tabs.map((tab) => (
            <button key={tab.value} aria-selected={activeTab === tab.value} className={cn("group relative whitespace-nowrap py-4 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30", activeTab === tab.value ? "text-[#111111]" : "text-[#888888] hover:text-[#111111]")} onClick={() => handleTabChange(tab.value)} role="tab" type="button">
              <span className="flex items-center gap-2">{tab.icon}{tab.label}</span>
              {activeTab === tab.value ? <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-[#111111]" /> : null}
            </button>
          ))}
        </div>

        {showToolbar ? (
          <div className="flex flex-col gap-4 border-b border-[#EAEAEA] bg-white p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center">
              <div className="group relative w-full lg:max-w-sm">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-emerald-500" />
                <input className="w-full rounded-xl border border-transparent bg-gray-50 py-2.5 pl-10 pr-4 text-[13px] font-medium text-[#111111] transition-all placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar integracion..." type="text" value={searchQuery} />
              </div>
              {showStatusFilter ? (
                <ToolbarSelect icon={<Filter className="h-4 w-4" />} label="Estado" onChange={(v) => setStatusFilter(v as "all" | IntegrationStatus)} options={["all", "connected", "pending", "disconnected", "error", "syncing", "paused"]} value={statusFilter} />
              ) : null}
              <ToolbarSelect icon={<AlertTriangle className="h-4 w-4" />} label="Escenario" onChange={(v) => setVisualScenario(v as VisualScenario)} options={["live", "empty", "error"]} value={visualScenario} />
            </div>
          </div>
        ) : null}

        <div className="min-h-[420px] bg-[#FAFAFA]/30">
          {isLoading ? (
            <TableSkeleton />
          ) : visualScenario === "error" && activeTab !== "resumen" ? (
            <ErrorState onRetry={() => setVisualScenario("live")} />
          ) : visualScenario === "empty" && activeTab !== "resumen" ? (
            <EmptyState onReset={() => setVisualScenario("live")} />
          ) : activeTab === "resumen" ? (
            <SummaryView onNavigate={handleTabChange} openDrawer={openDrawer} />
          ) : activeTab === "canales" ? (
            <IntegrationGrid data={MOCK_CHANNELS} searchQuery={searchQuery} statusFilter={statusFilter} openDrawer={openDrawer} onAction={handleAction} onReset={resetFilters} />
          ) : activeTab === "pagos" ? (
            <IntegrationGrid data={MOCK_PAYMENTS} searchQuery={searchQuery} statusFilter={statusFilter} openDrawer={openDrawer} onAction={handleAction} onReset={resetFilters} />
          ) : activeTab === "proveedores" ? (
            <IntegrationGrid data={MOCK_SUPPLIERS} searchQuery={searchQuery} statusFilter={statusFilter} openDrawer={openDrawer} onAction={handleAction} onReset={resetFilters} />
          ) : activeTab === "logistica" ? (
            <IntegrationGrid data={MOCK_LOGISTICS} searchQuery={searchQuery} statusFilter={statusFilter} openDrawer={openDrawer} onAction={handleAction} onReset={resetFilters} />
          ) : activeTab === "tracking" ? (
            <IntegrationGrid data={MOCK_TRACKING} searchQuery={searchQuery} statusFilter={statusFilter} openDrawer={openDrawer} onAction={handleAction} onReset={resetFilters} />
          ) : (
            <LogsView searchQuery={searchQuery} openDrawer={openDrawer} onReset={resetFilters} />
          )}
        </div>
      </div>

      <IntegrationDrawer content={drawerContent} isOpen={drawerContent !== null} onClose={closeDrawer} onAction={handleAction} />
      <ToastViewport onDismiss={(id) => setToasts((c) => c.filter((t) => t.id !== id))} toasts={toasts} />
    </div>
  );
}

/* ─── Summary ─── */

function SummaryView({ onNavigate, openDrawer }: { onNavigate: (t: TabValue) => void; openDrawer: (c: DrawerContent) => void }) {
  const s = MOCK_INTEGRATIONS_SUMMARY;
  const allIntegrations = [...MOCK_CHANNELS, ...MOCK_PAYMENTS, ...MOCK_SUPPLIERS, ...MOCK_LOGISTICS, ...MOCK_TRACKING];
  const withIssues = allIntegrations.filter((i) => i.health !== "operational" || i.status === "error" || i.status === "disconnected");

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Integraciones activas" value={s.totalActive.toString()} accent />
        <SummaryCard label="Con alertas" value={s.totalAlerts.toString()} />
        <SummaryCard label="Desconectadas" value={s.totalDisconnected.toString()} />
        <SummaryCard label="Errores recientes" value={s.recentErrors.toString()} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Canales conectados" value={s.channelsConnected.toString()} />
        <SummaryCard label="Pagos operativos" value={s.paymentsOperational.toString()} />
        <SummaryCard label="Proveedores activos" value={s.suppliersActive.toString()} />
        <SummaryCard label="Ultima sync global" value={timeFormatter.format(new Date(s.lastGlobalSync))} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NavCard icon={<Globe className="h-5 w-5 text-blue-500" />} title="Canales" description={`${MOCK_CHANNELS.filter(c => c.status === "connected").length} conectados de ${MOCK_CHANNELS.length}`} onClick={() => onNavigate("canales")} />
        <NavCard icon={<CreditCard className="h-5 w-5 text-emerald-500" />} title="Pagos" description={`${MOCK_PAYMENTS.filter(p => p.health === "operational").length} operativos`} onClick={() => onNavigate("pagos")} />
        <NavCard icon={<Plug className="h-5 w-5 text-purple-500" />} title="Proveedores" description={`${MOCK_SUPPLIERS.filter(s => s.productsSynced).reduce((sum, s) => sum + (s.productsSynced ?? 0), 0)} productos sincronizados`} onClick={() => onNavigate("proveedores")} />
        <NavCard icon={<Truck className="h-5 w-5 text-amber-500" />} title="Logistica" description={`${MOCK_LOGISTICS.filter(l => l.health === "operational").length} servicios operativos`} onClick={() => onNavigate("logistica")} />
        <NavCard icon={<Radio className="h-5 w-5 text-pink-500" />} title="Tracking" description={`${MOCK_TRACKING.filter(t => t.status === "connected").length} pixeles activos`} onClick={() => onNavigate("tracking")} />
        <NavCard icon={<ListChecks className="h-5 w-5 text-gray-500" />} title="Logs" description={`${MOCK_LOGS.length} eventos recientes`} onClick={() => onNavigate("logs")} />
      </div>

      {withIssues.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Requieren atencion</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {withIssues.slice(0, 4).map((int) => (
              <button key={int.id} className="flex items-start gap-3 rounded-2xl border border-[#EAEAEA] bg-white p-4 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => openDrawer({ kind: "integration", data: int })} type="button">
                <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", int.health === "critical" ? "bg-red-50" : "bg-amber-50")}>
                  <AlertTriangle className={cn("h-4 w-4", int.health === "critical" ? "text-red-500" : "text-amber-500")} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#111111]">{int.name}</p>
                  <p className="mt-1 line-clamp-1 text-xs font-medium text-gray-500">{int.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ─── Integration Grid (reused for channels, payments, suppliers, logistics, tracking) ─── */

function IntegrationGrid({ data, searchQuery, statusFilter, openDrawer, onAction, onReset }: {
  data: Integration[];
  searchQuery: string;
  statusFilter: "all" | IntegrationStatus;
  openDrawer: (c: DrawerContent) => void;
  onAction: (a: string) => void;
  onReset: () => void;
}) {
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data.filter((i) => {
      const matchesSearch = !q || i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || i.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data, searchQuery, statusFilter]);

  if (filtered.length === 0) return <NoResultsState onReset={onReset} />;

  return (
    <div className="space-y-4 p-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtered.map((int) => (
          <button
            key={int.id}
            className="group flex flex-col gap-4 rounded-2xl border border-[#EAEAEA] bg-white p-5 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
            onClick={() => openDrawer({ kind: "integration", data: int })}
            type="button"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <HealthDot health={int.health} />
                  <h3 className="truncate text-sm font-bold text-[#111111]">{int.name}</h3>
                </div>
                <p className="mt-1 line-clamp-1 text-xs font-medium text-gray-500">{int.description}</p>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-[#111111]" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={int.status} />
              <HealthBadge health={int.health} />
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] font-medium text-gray-500">
              {int.account ? <span>Cuenta: <span className="font-bold text-[#111111]">{int.account}</span></span> : null}
              <span>Ultima sync: <span className="font-bold text-[#111111]">{int.lastSync ? timeFormatter.format(new Date(int.lastSync)) : "Nunca"}</span></span>
              {int.productsSynced !== null ? <span>Productos: <span className="font-bold text-[#111111]">{int.productsSynced}</span></span> : null}
              {int.eventsToday !== null ? <span>Eventos hoy: <span className="font-bold text-[#111111]">{int.eventsToday.toLocaleString("es-AR")}</span></span> : null}
              {int.recentIncidents > 0 ? <span className="font-bold text-amber-600">{int.recentIncidents} incidencia{int.recentIncidents > 1 ? "s" : ""}</span> : null}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Logs ─── */

function LogsView({ searchQuery, openDrawer, onReset }: { searchQuery: string; openDrawer: (c: DrawerContent) => void; onReset: () => void }) {
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return MOCK_LOGS.filter((l) => !q || l.integrationName.toLowerCase().includes(q) || l.event.toLowerCase().includes(q) || l.details.toLowerCase().includes(q));
  }, [searchQuery]);

  if (filtered.length === 0) return <NoResultsState onReset={onReset} />;

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]/70">
              <TableHead label="Integracion" />
              <TableHead label="Evento" />
              <TableHead label="Severidad" />
              <TableHead label="Estado" />
              <TableHead label="Timestamp" />
              <TableHead label="Referencia" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAEAEA]/80">
            {filtered.map((log) => (
              <tr
                key={log.id}
                className="group cursor-pointer bg-white transition-colors hover:bg-gray-50/60 focus-within:bg-gray-50/80"
                onClick={() => openDrawer({ kind: "log", data: log })}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrawer({ kind: "log", data: log }); } }}
              >
                <td className="px-6 py-4 text-sm font-bold text-[#111111]">{log.integrationName}</td>
                <td className="px-6 py-4"><div className="max-w-[200px] truncate text-sm font-medium text-[#111111]">{log.event}</div></td>
                <td className="px-6 py-4"><LogSeverityBadge severity={log.severity} /></td>
                <td className="px-6 py-4"><LogStatusBadge status={log.status} /></td>
                <td className="px-6 py-4 text-xs font-bold tabular-nums text-gray-500">{timeFormatter.format(new Date(log.timestamp))}</td>
                <td className="px-6 py-4 text-xs font-medium tabular-nums text-gray-400">{log.reference ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TableFooter count={filtered.length} total={MOCK_LOGS.length} />
    </div>
  );
}

/* ─── Shared ─── */

function SummaryCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl border border-[#EAEAEA] p-5 shadow-sm", accent ? "bg-[#111111]" : "bg-white")}>
      <p className={cn("text-[11px] font-bold uppercase tracking-[0.18em]", accent ? "text-gray-400" : "text-[#888888]")}>{label}</p>
      <p className={cn("mt-2 text-2xl font-black tracking-tight", accent ? "text-white" : "text-[#111111]")}>{value}</p>
    </div>
  );
}

function NavCard({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick: () => void }) {
  return (
    <button className="group flex items-start gap-4 rounded-2xl border border-[#EAEAEA] bg-white p-5 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={onClick} type="button">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 transition-colors group-hover:bg-gray-100">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-[#111111]">{title}</p>
        <p className="mt-1 text-xs font-medium text-gray-500">{description}</p>
      </div>
      <span className="ml-auto shrink-0 text-gray-300 transition-colors group-hover:text-[#111111]">→</span>
    </button>
  );
}

function ToolbarSelect({ icon, label, onChange, options, value }: { icon: React.ReactNode; label: string; onChange: (v: string) => void; options: string[]; value: string }) {
  return (
    <label className="flex min-w-[170px] items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-3 py-2.5 text-[13px] font-bold text-gray-600 shadow-sm">
      <span className="shrink-0 text-gray-400">{icon}</span>
      <span className="text-[#666666]">{label}</span>
      <select className="w-full bg-transparent text-right font-semibold text-[#111111] outline-none" onChange={(e) => onChange(e.target.value)} value={value}>
        {options.map((o) => <option key={o} value={o}>{selectLabel(o)}</option>)}
      </select>
    </label>
  );
}

function TableHead({ label }: { label: string }) {
  return <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">{label}</th>;
}

function TableFooter({ count, total }: { count: number; total: number }) {
  return (
    <div className="flex items-center justify-between border-t border-[#EAEAEA] bg-[#FAFAFA]/50 px-6 py-4">
      <span className="block text-xs font-bold uppercase tracking-[0.18em] text-[#888888]">Mostrando <b className="px-1 text-[#111111]">{count}</b> de {total}</span>
    </div>
  );
}

function NoResultsState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-gray-100 bg-gray-50 shadow-sm"><Search className="h-8 w-8 text-gray-300" /></div>
      <h3 className="text-xl font-extrabold text-[#111111]">No encontramos resultados</h3>
      <p className="mt-2 max-w-md text-[15px] font-medium text-[#888888]">Ajusta busqueda o estado y vuelve a intentarlo.</p>
      <button className="mt-6 rounded-xl border border-[#EAEAEA] bg-white px-6 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={onReset} type="button">Limpiar filtros</button>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-gray-100 bg-gray-50 shadow-sm"><Plug className="h-8 w-8 text-gray-300" /></div>
      <h3 className="text-xl font-extrabold text-[#111111]">Todavia no hay datos en esta vista</h3>
      <p className="mt-2 max-w-md text-[15px] font-medium text-[#888888]">Estado vacio simulado para QA. Regresa a la vista operativa para ver datos.</p>
      <button className="mt-6 rounded-xl border border-[#EAEAEA] bg-white px-6 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={onReset} type="button">Volver a la muestra</button>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-red-100 bg-red-50 shadow-sm"><AlertTriangle className="h-8 w-8 text-red-400" /></div>
      <h3 className="text-xl font-extrabold text-[#111111]">No pudimos cargar los datos</h3>
      <p className="mt-2 max-w-md text-[15px] font-medium text-[#888888]">Estado simulado para QA visual. El retry vuelve a la vista operativa sin tocar datos.</p>
      <button className="mt-6 rounded-xl bg-[#111111] px-6 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={onRetry} type="button">Reintentar</button>
    </div>
  );
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div aria-live="polite" className="fixed right-6 top-6 z-[60] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((t) => (
        <div key={t.id} className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-xl animate-in slide-in-from-right-5 fade-in duration-300">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-sm font-bold text-[#111111]">{t.title}</p><p className="mt-1 text-sm font-medium text-gray-500">{t.description}</p></div>
            <button aria-label="Cerrar" className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#111111]" onClick={() => onDismiss(t.id)} type="button"><X className="h-4 w-4" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function selectLabel(v: string): string {
  switch (v) {
    case "all": return "Todos";
    case "connected": return "Conectado";
    case "pending": return "Pendiente";
    case "disconnected": return "Desconectado";
    case "error": return "Error";
    case "verifying": return "Verificando";
    case "syncing": return "Sincronizando";
    case "paused": return "Pausado";
    case "live": return "Operativa";
    case "empty": return "Vacio";
    default: return v;
  }
}
