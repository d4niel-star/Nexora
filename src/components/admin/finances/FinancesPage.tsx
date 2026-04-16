"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Clock,
  DollarSign,
  Download,
  FileSpreadsheet,
  Filter,
  Layers,
  Percent,
  RotateCcw,
  Search,
  TrendingUp,
  X,
} from "lucide-react";

import { FinanceDrawer } from "@/components/admin/finances/FinanceDrawer";
import { FinanceStatusBadge, MarginHealthBadge, ChannelBadge, ExportTypeBadge } from "@/components/admin/finances/FinanceBadge";
import { ProfitabilityView } from "@/components/admin/finances/ProfitabilityView";
import { TableSkeleton } from "@/components/admin/orders/TableSkeleton";
import { cn, formatCurrency } from "@/lib/utils";
import type { FinanceMovement, PendingPayment, Refund, CommissionEntry, MarginEntry, ExportRecord, FinanceStatus, FinanceSummary } from "@/types/finances";
import type { ProfitabilityReport } from "@/types/profitability";
import type { AdminFinanceData } from "@/lib/finances/queries";

type TabValue = "resumen" | "cobrado" | "pendiente" | "reembolsos" | "comisiones" | "margenes" | "rentabilidad" | "exportaciones";

type DrawerContent =
  | { kind: "movement"; data: FinanceMovement }
  | { kind: "pending"; data: PendingPayment }
  | { kind: "refund"; data: Refund }
  | { kind: "commission"; data: CommissionEntry }
  | { kind: "margin"; data: MarginEntry }
  | { kind: "export"; data: ExportRecord };

interface ToastMessage { id: string; title: string; description: string; }

const timeFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function FinancesPage({ initialData, profitabilityReport, hideHeader = false, initialTab = "resumen" }: { initialData: AdminFinanceData; profitabilityReport?: ProfitabilityReport; hideHeader?: boolean; initialTab?: TabValue }) {
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | FinanceStatus>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [drawerContent, setDrawerContent] = useState<DrawerContent | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => { if (!isLoading) return; const t = window.setTimeout(() => setIsLoading(false), 720); return () => window.clearTimeout(t); }, [isLoading]);

  const tabs: Array<{ label: string; value: TabValue; icon: React.ReactNode }> = [
    { label: "Resumen", value: "resumen", icon: <Layers className="h-3.5 w-3.5" /> },
    { label: "Cobrado", value: "cobrado", icon: <Banknote className="h-3.5 w-3.5" /> },
    { label: "Pendiente", value: "pendiente", icon: <Clock className="h-3.5 w-3.5" /> },
    { label: "Reembolsos", value: "reembolsos", icon: <RotateCcw className="h-3.5 w-3.5" /> },
    { label: "Comisiones", value: "comisiones", icon: <Percent className="h-3.5 w-3.5" /> },
    { label: "Margenes", value: "margenes", icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { label: "Salud de margen", value: "rentabilidad", icon: <DollarSign className="h-3.5 w-3.5" /> },
    { label: "Exportaciones", value: "exportaciones", icon: <FileSpreadsheet className="h-3.5 w-3.5" /> },
  ];

  const handleTabChange = (v: TabValue) => { if (v === activeTab) return; setActiveTab(v); setSearchQuery(""); setStatusFilter("all"); setIsLoading(true); };

  const pushToast = (title: string, description: string) => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setToasts((c) => [...c, { id, title, description }]);
    window.setTimeout(() => setToasts((c) => c.filter((t) => t.id !== id)), 3200);
  };

  const openDrawer = (c: DrawerContent) => setDrawerContent(c);
  const closeDrawer = () => setDrawerContent(null);
  const handleAction = (action: string) => { pushToast("Aviso", action); };
  const resetFilters = () => { setSearchQuery(""); setStatusFilter("all"); };

  const showToolbar = activeTab !== "resumen" && activeTab !== "rentabilidad";
  const showStatusFilter = activeTab !== "comisiones" && activeTab !== "margenes" && activeTab !== "resumen" && activeTab !== "cobrado" && activeTab !== "rentabilidad";

  const statusOptions: string[] = (() => {
    switch (activeTab) {
      case "cobrado": return ["all", "collected"];
      case "pendiente": return ["all", "pending", "review", "scheduled", "critical", "partial"];
      case "reembolsos": return ["all", "refunded", "partial", "review", "failed"];
      case "exportaciones": return ["all", "exported", "scheduled"];
      default: return ["all"];
    }
  })();

  return (
    <div className="animate-in fade-in space-y-8 pb-32 duration-700">
      {!hideHeader && (
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[#111111]">Finanzas</h1>
            <p className="mt-1 text-[15px] font-medium text-[#666666]">Ingresos, egresos, comisiones y salud de margen del negocio.</p>
          </div>
        </div>
      )}

      <div className="relative overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-sm">
        <div aria-label="Secciones de finanzas" className="flex items-center gap-8 overflow-x-auto border-b border-[#EAEAEA] bg-[#FAFAFA]/50 px-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" role="tablist">
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
                <input className="w-full rounded-xl border border-transparent bg-gray-50 py-2.5 pl-10 pr-4 text-[13px] font-medium text-[#111111] transition-all placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar referencia, cliente..." type="text" value={searchQuery} />
              </div>
              {showStatusFilter ? (
                <ToolbarSelect icon={<Filter className="h-4 w-4" />} label="Estado" onChange={(v) => setStatusFilter(v as "all" | FinanceStatus)} options={statusOptions} value={statusFilter} />
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="min-h-[420px] bg-[#FAFAFA]/30">
          {isLoading ? (
            <TableSkeleton />
          ) : activeTab === "resumen" ? (
            <SummaryView onNavigate={handleTabChange} openDrawer={openDrawer} onAction={handleAction} data={initialData} />
          ) : activeTab === "cobrado" ? (
            <CollectedView searchQuery={searchQuery} statusFilter={statusFilter} openDrawer={openDrawer} onReset={resetFilters} data={initialData.movements} />
          ) : activeTab === "pendiente" ? (
            <PendingView searchQuery={searchQuery} statusFilter={statusFilter} openDrawer={openDrawer} onReset={resetFilters} data={initialData.pending} />
          ) : activeTab === "reembolsos" ? (
            <RefundsView searchQuery={searchQuery} statusFilter={statusFilter} openDrawer={openDrawer} onReset={resetFilters} data={initialData.refunds} />
          ) : activeTab === "comisiones" ? (
            <CommissionsView searchQuery={searchQuery} openDrawer={openDrawer} onReset={resetFilters} data={initialData.commissions} />
          ) : activeTab === "margenes" ? (
            <MarginsView searchQuery={searchQuery} openDrawer={openDrawer} onReset={resetFilters} data={initialData.margins} />
          ) : activeTab === "rentabilidad" ? (
            profitabilityReport ? <ProfitabilityView report={profitabilityReport} /> : <TableSkeleton />
          ) : (
            <ExportsView searchQuery={searchQuery} statusFilter={statusFilter} openDrawer={openDrawer} onAction={handleAction} onReset={resetFilters} data={initialData.exports} />
          )}
        </div>
      </div>

      <FinanceDrawer content={drawerContent} isOpen={drawerContent !== null} onClose={closeDrawer} onAction={handleAction} />
      <ToastViewport onDismiss={(id) => setToasts((c) => c.filter((t) => t.id !== id))} toasts={toasts} />
    </div>
  );
}

/* ─── Summary ─── */

function SummaryView({ onNavigate, openDrawer, onAction, data }: { onNavigate: (t: TabValue) => void; openDrawer: (c: DrawerContent) => void; onAction: (a: string) => void; data: AdminFinanceData }) {
  const s = data.summary;

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard label="Ingresos cobrados" value={formatCurrency(s.totalCollected)} accent />
        <SummaryCard label="Pendientes" value={formatCurrency(s.totalPending)} />
        <SummaryCard label="Reembolsos" value={formatCurrency(s.totalRefunded)} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard label="Ticket promedio" value={formatCurrency(s.avgTicket)} />
        <SummaryCard label="Margen estimado" value={`${s.estimatedMarginPercent}%`} />
        <SummaryCard label="Neto estimado" value={formatCurrency(s.estimatedNet)} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard label="Comisiones totales" value={formatCurrency(s.totalCommissions)} />
        <SummaryCard label="Envío cobrado al cliente" value={formatCurrency(s.totalShipping)} />
        <SummaryCard label="Pendientes activos" value={s.pendingCount.toString()} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NavCard icon={<Banknote className="h-5 w-5 text-emerald-500" />} title="Cobrado" description={`${data.movements.length} movimientos`} onClick={() => onNavigate("cobrado")} />
        <NavCard icon={<Clock className="h-5 w-5 text-amber-500" />} title="Pendiente" description={`${data.pending.length} por cobrar`} onClick={() => onNavigate("pendiente")} />
        <NavCard icon={<RotateCcw className="h-5 w-5 text-gray-500" />} title="Reembolsos" description={`${data.refunds.length} procesados`} onClick={() => onNavigate("reembolsos")} />
        <NavCard icon={<Percent className="h-5 w-5 text-blue-500" />} title="Comisiones" description={formatCurrency(s.totalCommissions)} onClick={() => onNavigate("comisiones")} />
        <NavCard icon={<TrendingUp className="h-5 w-5 text-purple-500" />} title="Margenes" description={`${s.estimatedMarginPercent}% estimado`} onClick={() => onNavigate("margenes")} />
        <NavCard icon={<FileSpreadsheet className="h-5 w-5 text-pink-500" />} title="Exportaciones" description={`${data.exports.length} archivos`} onClick={() => onNavigate("exportaciones")} />
      </div>

      {/* Alerts */}
      {data.pending.filter(p => p.status === "critical").length > 0 || data.margins.filter(m => m.health === "critical").length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Alertas financieras</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.pending.filter(p => p.status === "critical").slice(0, 2).map((p) => (
              <button key={p.id} className="flex items-start gap-3 rounded-2xl border border-[#EAEAEA] bg-white p-4 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => openDrawer({ kind: "pending", data: p })} type="button">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50"><AlertTriangle className="h-4 w-4 text-red-500" /></div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#111111]">{p.reference}</p>
                  <p className="mt-1 line-clamp-1 text-xs font-medium text-gray-500">{p.cause} — {formatCurrency(p.amount)}</p>
                </div>
              </button>
            ))}
            {data.margins.filter(m => m.health === "critical").slice(0, 2).map((m) => (
              <button key={m.id} className="flex items-start gap-3 rounded-2xl border border-[#EAEAEA] bg-white p-4 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => openDrawer({ kind: "margin", data: m })} type="button">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50"><TrendingUp className="h-4 w-4 text-amber-500" /></div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#111111]">{m.name}</p>
                  <p className="mt-1 line-clamp-1 text-xs font-medium text-gray-500">Margen critico: {m.marginPercent}%</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Quick action */}
      <div className="flex items-center gap-3">
        <button disabled className="flex items-center gap-2 rounded-xl bg-[#111111] px-5 py-2.5 text-[13px] font-bold text-white opacity-50" type="button">
          <Download className="h-3.5 w-3.5" />
          Exportar (Próximamente)
        </button>
        <button className="flex items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-5 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => onNavigate("pendiente")} type="button">
          Revisar pendientes
        </button>
      </div>
    </div>
  );
}

/* ─── Collected ─── */

function CollectedView({ searchQuery, statusFilter, openDrawer, onReset, data }: { searchQuery: string; statusFilter: "all" | FinanceStatus; openDrawer: (c: DrawerContent) => void; onReset: () => void; data: FinanceMovement[] }) {
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data.filter((m) => {
      const s = !q || m.reference.toLowerCase().includes(q) || m.customer.toLowerCase().includes(q) || m.channel.toLowerCase().includes(q);
      const st = statusFilter === "all" || m.status === statusFilter;
      return s && st;
    });
  }, [searchQuery, statusFilter, data]);

  if (filtered.length === 0) return <NoResultsState onReset={onReset} />;

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left">
          <thead>
            <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]/70">
              <TableHead label="Referencia" />
              <TableHead label="Cliente" />
              <TableHead label="Canal" />
              <TableHead label="Fecha" />
              <TableHead label="Bruto" />
              <TableHead label="Comision" />
              <TableHead label="Envio" />
              <TableHead label="Neto" />
              <TableHead label="Estado" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAEAEA]/80">
            {filtered.map((m) => (
              <tr key={m.id} className="group cursor-pointer bg-white transition-colors hover:bg-gray-50/60 focus-within:bg-gray-50/80" onClick={() => openDrawer({ kind: "movement", data: m })} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrawer({ kind: "movement", data: m }); } }}>
                <td className="px-6 py-4 text-sm font-bold text-[#111111]">{m.reference}</td>
                <td className="px-6 py-4 text-sm font-medium text-[#111111]">{m.customer}</td>
                <td className="px-6 py-4"><ChannelBadge channel={m.channel} /></td>
                <td className="px-6 py-4 text-xs font-bold tabular-nums text-gray-500">{timeFormatter.format(new Date(m.date))}</td>
                <td className="px-6 py-4 text-sm font-bold tabular-nums text-[#111111]">{formatCurrency(m.gross)}</td>
                <td className="px-6 py-4 text-sm font-medium tabular-nums text-gray-500">{formatCurrency(m.commission)}</td>
                <td className="px-6 py-4 text-sm font-medium tabular-nums text-gray-500">{formatCurrency(m.shipping)}</td>
                <td className="px-6 py-4 text-sm font-bold tabular-nums text-emerald-600">{formatCurrency(m.net)}</td>
                <td className="px-6 py-4"><FinanceStatusBadge status={m.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TableFooter count={filtered.length} total={data.length} />
    </div>
  );
}

/* ─── Pending ─── */

function PendingView({ searchQuery, statusFilter, openDrawer, onReset, data }: { searchQuery: string; statusFilter: "all" | FinanceStatus; openDrawer: (c: DrawerContent) => void; onReset: () => void; data: PendingPayment[] }) {
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data.filter((p) => {
      const s = !q || p.reference.toLowerCase().includes(q) || p.customer.toLowerCase().includes(q) || p.cause.toLowerCase().includes(q);
      const st = statusFilter === "all" || p.status === statusFilter;
      return s && st;
    });
  }, [searchQuery, statusFilter, data]);

  if (filtered.length === 0) return <NoResultsState onReset={onReset} />;

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]/70">
              <TableHead label="Referencia" />
              <TableHead label="Cliente" />
              <TableHead label="Fecha" />
              <TableHead label="Monto" />
              <TableHead label="Causa" />
              <TableHead label="Vencimiento" />
              <TableHead label="Canal" />
              <TableHead label="Estado" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAEAEA]/80">
            {filtered.map((p) => (
              <tr key={p.id} className="group cursor-pointer bg-white transition-colors hover:bg-gray-50/60 focus-within:bg-gray-50/80" onClick={() => openDrawer({ kind: "pending", data: p })} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrawer({ kind: "pending", data: p }); } }}>
                <td className="px-6 py-4 text-sm font-bold text-[#111111]">{p.reference}</td>
                <td className="px-6 py-4 text-sm font-medium text-[#111111]">{p.customer}</td>
                <td className="px-6 py-4 text-xs font-bold tabular-nums text-gray-500">{timeFormatter.format(new Date(p.date))}</td>
                <td className="px-6 py-4 text-sm font-bold tabular-nums text-[#111111]">{formatCurrency(p.amount)}</td>
                <td className="px-6 py-4"><div className="max-w-[180px] truncate text-sm font-medium text-[#111111]">{p.cause}</div></td>
                <td className="px-6 py-4 text-xs font-bold tabular-nums text-gray-500">{timeFormatter.format(new Date(p.dueDate))}</td>
                <td className="px-6 py-4"><ChannelBadge channel={p.channel} /></td>
                <td className="px-6 py-4"><FinanceStatusBadge status={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TableFooter count={filtered.length} total={data.length} />
    </div>
  );
}

/* ─── Refunds ─── */

function RefundsView({ searchQuery, statusFilter, openDrawer, onReset, data }: { searchQuery: string; statusFilter: "all" | FinanceStatus; openDrawer: (c: DrawerContent) => void; onReset: () => void; data: Refund[] }) {
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data.filter((r) => {
      const s = !q || r.reference.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q) || r.reason.toLowerCase().includes(q);
      const st = statusFilter === "all" || r.status === statusFilter;
      return s && st;
    });
  }, [searchQuery, statusFilter, data]);

  if (filtered.length === 0) return <NoResultsState onReset={onReset} />;

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]/70">
              <TableHead label="Referencia" />
              <TableHead label="Cliente" />
              <TableHead label="Fecha" />
              <TableHead label="Monto" />
              <TableHead label="Motivo" />
              <TableHead label="Metodo" />
              <TableHead label="Estado" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAEAEA]/80">
            {filtered.map((r) => (
              <tr key={r.id} className="group cursor-pointer bg-white transition-colors hover:bg-gray-50/60 focus-within:bg-gray-50/80" onClick={() => openDrawer({ kind: "refund", data: r })} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrawer({ kind: "refund", data: r }); } }}>
                <td className="px-6 py-4 text-sm font-bold text-[#111111]">{r.reference}</td>
                <td className="px-6 py-4 text-sm font-medium text-[#111111]">{r.customer}</td>
                <td className="px-6 py-4 text-xs font-bold tabular-nums text-gray-500">{timeFormatter.format(new Date(r.date))}</td>
                <td className="px-6 py-4 text-sm font-bold tabular-nums text-red-600">{formatCurrency(r.amount)}</td>
                <td className="px-6 py-4"><div className="max-w-[160px] truncate text-sm font-medium text-[#111111]">{r.reason}</div></td>
                <td className="px-6 py-4 text-sm font-medium text-gray-500">{r.method}</td>
                <td className="px-6 py-4"><FinanceStatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TableFooter count={filtered.length} total={data.length} />
    </div>
  );
}

/* ─── Commissions ─── */

function CommissionsView({ searchQuery, openDrawer, onReset, data }: { searchQuery: string; openDrawer: (c: DrawerContent) => void; onReset: () => void; data: CommissionEntry[] }) {
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data.filter((c) => !q || c.source.toLowerCase().includes(q) || c.type.toLowerCase().includes(q));
  }, [searchQuery, data]);

  const totalCommissions = data.reduce((sum, c) => sum + c.amount, 0);
  const totalTransactions = data.reduce((sum, c) => sum + c.transactions, 0);

  if (filtered.length === 0) return <NoResultsState onReset={onReset} />;

  return (
    <div className="space-y-0">
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
        <SummaryCard label="Comisiones totales" value={formatCurrency(totalCommissions)} accent />
        <SummaryCard label="Transacciones" value={totalTransactions.toString()} />
        <SummaryCard label="Periodo" value="Acumulado" />
      </div>
      <div className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead>
              <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]/70">
                <TableHead label="Fuente" />
                <TableHead label="Tipo" />
                <TableHead label="Comision" />
                <TableHead label="Tasa" />
                <TableHead label="Transacciones" />
                <TableHead label="Periodo" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA]/80">
              {filtered.map((c) => (
                <tr key={c.id} className="group cursor-pointer bg-white transition-colors hover:bg-gray-50/60 focus-within:bg-gray-50/80" onClick={() => openDrawer({ kind: "commission", data: c })} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrawer({ kind: "commission", data: c }); } }}>
                  <td className="px-6 py-4 text-sm font-bold text-[#111111]">{c.source}</td>
                  <td className="px-6 py-4"><ExportTypeBadge type={c.type} /></td>
                  <td className="px-6 py-4 text-sm font-bold tabular-nums text-[#111111]">{formatCurrency(c.amount)}</td>
                  <td className="px-6 py-4 text-sm font-medium tabular-nums text-gray-500">{c.percentage}%</td>
                  <td className="px-6 py-4 text-sm font-bold tabular-nums text-[#111111]">{c.transactions}</td>
                  <td className="px-6 py-4 text-xs font-medium text-gray-500">{c.period}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TableFooter count={filtered.length} total={data.length} />
      </div>
    </div>
  );
}

/* ─── Margins ─── */

function MarginsView({ searchQuery, openDrawer, onReset, data }: { searchQuery: string; openDrawer: (c: DrawerContent) => void; onReset: () => void; data: MarginEntry[] }) {
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data.filter((m) => !q || m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q));
  }, [searchQuery, data]);

  const avgMargin = data.length > 0 ? data.reduce((sum, m) => sum + m.marginPercent, 0) / data.length : 0;
  const criticalCount = data.filter(m => m.health === "critical").length;

  if (filtered.length === 0) return <NoResultsState onReset={onReset} />;

  return (
    <div className="space-y-0">
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
        <SummaryCard label="Margen promedio" value={`${avgMargin.toFixed(1)}%`} accent />
        <SummaryCard label="Productos analizados" value={data.length.toString()} />
        <SummaryCard label="Margenes criticos" value={criticalCount.toString()} />
      </div>
      <div className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]/70">
                <TableHead label="Producto" />
                <TableHead label="Categoria" />
                <TableHead label="Ingresos" />
                <TableHead label="Costo" />
                <TableHead label="Margen" />
                <TableHead label="Margen %" />
                <TableHead label="Desc." />
                <TableHead label="Envio" />
                <TableHead label="Salud" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA]/80">
              {filtered.map((m) => (
                <tr key={m.id} className="group cursor-pointer bg-white transition-colors hover:bg-gray-50/60 focus-within:bg-gray-50/80" onClick={() => openDrawer({ kind: "margin", data: m })} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrawer({ kind: "margin", data: m }); } }}>
                  <td className="px-6 py-4"><div className="max-w-[200px] truncate text-sm font-bold text-[#111111]">{m.name}</div></td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-500">{m.category}</td>
                  <td className="px-6 py-4 text-sm font-bold tabular-nums text-[#111111]">{formatCurrency(m.revenue)}</td>
                  <td className="px-6 py-4 text-sm font-medium tabular-nums text-gray-500">{formatCurrency(m.cost)}</td>
                  <td className="px-6 py-4 text-sm font-bold tabular-nums text-emerald-600">{formatCurrency(m.margin)}</td>
                  <td className="px-6 py-4 text-sm font-bold tabular-nums text-[#111111]">{m.marginPercent}%</td>
                  <td className="px-6 py-4 text-sm font-medium tabular-nums text-gray-500">{formatCurrency(m.discountImpact)}</td>
                  <td className="px-6 py-4 text-sm font-medium tabular-nums text-gray-500">{formatCurrency(m.shippingImpact)}</td>
                  <td className="px-6 py-4"><MarginHealthBadge health={m.health} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TableFooter count={filtered.length} total={data.length} />
      </div>
    </div>
  );
}

/* ─── Exports ─── */

function ExportsView({ searchQuery, statusFilter, openDrawer, onAction, onReset, data }: { searchQuery: string; statusFilter: "all" | FinanceStatus; openDrawer: (c: DrawerContent) => void; onAction: (a: string) => void; onReset: () => void; data: ExportRecord[] }) {
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data.filter((e) => {
      const s = !q || e.type.toLowerCase().includes(q) || e.range.toLowerCase().includes(q);
      const st = statusFilter === "all" || e.status === statusFilter;
      return s && st;
    });
  }, [searchQuery, statusFilter, data]);

  if (filtered.length === 0) return <NoResultsState onReset={onReset} />;

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between p-6 pb-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Exportaciones recientes</h3>
        <button disabled className="flex items-center gap-2 rounded-xl bg-[#111111] px-4 py-2 text-[13px] font-bold text-white opacity-50" type="button">
          <Download className="h-3.5 w-3.5" />
          Exportar CSV
        </button>
      </div>
      <div className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead>
              <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]/70">
                <TableHead label="Tipo" />
                <TableHead label="Rango" />
                <TableHead label="Fecha" />
                <TableHead label="Tamaño" />
                <TableHead label="Estado" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA]/80">
              {filtered.map((e) => (
                <tr key={e.id} className="group cursor-pointer bg-white transition-colors hover:bg-gray-50/60 focus-within:bg-gray-50/80" onClick={() => openDrawer({ kind: "export", data: e })} tabIndex={0} onKeyDown={(e2) => { if (e2.key === "Enter" || e2.key === " ") { e2.preventDefault(); openDrawer({ kind: "export", data: e }); } }}>
                  <td className="px-6 py-4"><ExportTypeBadge type={e.type} /></td>
                  <td className="px-6 py-4 text-sm font-medium text-[#111111]">{e.range}</td>
                  <td className="px-6 py-4 text-xs font-bold tabular-nums text-gray-500">{timeFormatter.format(new Date(e.date))}</td>
                  <td className="px-6 py-4 text-sm font-medium tabular-nums text-gray-500">{e.fileSize}</td>
                  <td className="px-6 py-4"><FinanceStatusBadge status={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TableFooter count={filtered.length} total={data.length} />
      </div>
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
    case "collected": return "Cobrado";
    case "pending": return "Pendiente";
    case "refunded": return "Reembolsado";
    case "partial": return "Parcial";
    case "failed": return "Fallido";
    case "review": return "En revision";
    case "exported": return "Exportado";
    case "scheduled": return "Programado";
    case "critical": return "Critico";
    case "stable": return "Estable";
    default: return v;
  }
}
