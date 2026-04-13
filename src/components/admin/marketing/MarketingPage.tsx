"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  ChevronDown,
  Copy,
  Download,
  Filter,
  Gift,
  Globe,
  Megaphone,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Search,
  ShoppingCart,
  Tag,
  Ticket,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

import { MarketingDrawer } from "@/components/admin/marketing/MarketingDrawer";
import {
  MarketingStatusBadge,
  CouponTypeBadge,
  PromoTypeBadge,
  AutomationTypeBadge,
  CaptureTypeBadge,
  PerformanceBadge,
} from "@/components/admin/marketing/MarketingBadge";
import { TableSkeleton } from "@/components/admin/orders/TableSkeleton";
import {
  MOCK_COUPONS,
  MOCK_PROMOTIONS,
  MOCK_ABANDONED_CARTS,
  MOCK_AUTOMATIONS,
  MOCK_CAPTURE_FORMS,
  MOCK_MARKETING_SUMMARY,
} from "@/lib/mocks/marketing";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  Coupon,
  Promotion,
  AbandonedCart,
  Automation,
  CaptureForm,
  MarketingStatus,
} from "@/types/marketing";

type TabValue = "resumen" | "cupones" | "promociones" | "recuperacion" | "automatizaciones" | "captacion";
type VisualScenario = "live" | "empty" | "error";

type DrawerContent =
  | { kind: "coupon"; data: Coupon }
  | { kind: "promotion"; data: Promotion }
  | { kind: "automation"; data: Automation }
  | { kind: "capture"; data: CaptureForm }
  | { kind: "cart"; data: AbandonedCart };

interface ToastMessage {
  id: string;
  title: string;
  description: string;
}

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const statusFilterOptions: Array<"all" | MarketingStatus> = [
  "all",
  "active",
  "paused",
  "scheduled",
  "draft",
  "expired",
  "archived",
];

export function MarketingPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("resumen");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MarketingStatus>("all");
  const [visualScenario, setVisualScenario] = useState<VisualScenario>("live");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [drawerContent, setDrawerContent] = useState<DrawerContent | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isLoading) return;
    const timer = window.setTimeout(() => setIsLoading(false), 720);
    return () => window.clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    if (!openActionMenuId) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!actionMenuRef.current?.contains(event.target as Node)) {
        setOpenActionMenuId(null);
      }
    };
    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [openActionMenuId]);

  const tabs: Array<{ label: string; value: TabValue; icon: React.ReactNode }> = [
    { label: "Resumen", value: "resumen", icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { label: "Cupones", value: "cupones", icon: <Ticket className="h-3.5 w-3.5" /> },
    { label: "Promociones", value: "promociones", icon: <Tag className="h-3.5 w-3.5" /> },
    { label: "Recuperacion", value: "recuperacion", icon: <ShoppingCart className="h-3.5 w-3.5" /> },
    { label: "Automatizaciones", value: "automatizaciones", icon: <Zap className="h-3.5 w-3.5" /> },
    { label: "Captacion", value: "captacion", icon: <Globe className="h-3.5 w-3.5" /> },
  ];

  const handleTabChange = (value: TabValue) => {
    if (value === activeTab) return;
    setActiveTab(value);
    setSelectedRows([]);
    setSearchQuery("");
    setStatusFilter("all");
    setVisualScenario("live");
    setIsLoading(true);
  };

  const pushToast = (title: string, description: string) => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
    setToasts((c) => [...c, { id, title, description }]);
    window.setTimeout(() => {
      setToasts((c) => c.filter((t) => t.id !== id));
    }, 3200);
  };

  const openDrawer = (content: DrawerContent) => {
    setDrawerContent(content);
    setOpenActionMenuId(null);
  };

  const closeDrawer = () => setDrawerContent(null);

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSelectedRows([]);
    setVisualScenario("live");
  };

  const handleCopyCode = async (code: string) => {
    setOpenActionMenuId(null);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
        pushToast("Codigo copiado", `${code} quedo listo para pegar.`);
        return;
      }
    } catch { /* ignore */ }
    pushToast("Codigo listo", `${code} no pudo copiarse, pero ya quedo visible.`);
  };

  const handleMockAction = (action: string, count?: number) => {
    setOpenActionMenuId(null);
    setSelectedRows([]);
    pushToast(
      action,
      count ? `${count} elemento${count === 1 ? "" : "s"} procesado${count === 1 ? "" : "s"} (mock).` : "Accion simulada correctamente."
    );
  };

  return (
    <div className="animate-in fade-in space-y-8 pb-32 duration-700">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#111111]">Marketing</h1>
          <p className="mt-1 text-[15px] font-medium text-[#666666]">
            Herramientas de crecimiento, promociones y captacion en un solo lugar.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-5 py-2.5 text-[13px] font-bold text-[#111111] shadow-sm transition-all hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
            onClick={() => handleMockAction("Exportacion simulada")}
            type="button"
          >
            <Download className="h-4 w-4" />
            Exportar
          </button>
          <button
            className="flex items-center gap-2 rounded-xl bg-[#111111] px-5 py-2.5 text-[13px] font-bold text-white shadow-md shadow-black/10 transition-all hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
            onClick={() => handleMockAction("Creacion mock")}
            type="button"
          >
            <Plus className="h-4 w-4" />
            Crear nuevo
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-sm">
        <div
          aria-label="Secciones de marketing"
          className="flex items-center gap-8 overflow-x-auto border-b border-[#EAEAEA] bg-[#FAFAFA]/50 px-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
        >
          {tabs.map((tab) => (
            <button
              key={tab.value}
              aria-selected={activeTab === tab.value}
              className={cn(
                "group relative whitespace-nowrap py-4 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
                activeTab === tab.value
                  ? "text-[#111111]"
                  : "text-[#888888] hover:text-[#111111]"
              )}
              onClick={() => handleTabChange(tab.value)}
              role="tab"
              type="button"
            >
              <span className="flex items-center gap-2">
                {tab.icon}
                {tab.label}
              </span>
              {activeTab === tab.value ? (
                <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-[#111111]" />
              ) : null}
            </button>
          ))}
        </div>

        {activeTab !== "resumen" && activeTab !== "recuperacion" ? (
          <div className="flex flex-col gap-4 border-b border-[#EAEAEA] bg-white p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center">
              <div className="group relative w-full lg:max-w-sm">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-emerald-500" />
                <input
                  className="w-full rounded-xl border border-transparent bg-gray-50 py-2.5 pl-10 pr-4 text-[13px] font-medium text-[#111111] transition-all placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  onChange={(e) => { setSearchQuery(e.target.value); setSelectedRows([]); }}
                  placeholder="Buscar por nombre, codigo o tipo..."
                  type="text"
                  value={searchQuery}
                />
              </div>

              <ToolbarSelect
                icon={<Filter className="h-4 w-4" />}
                label="Estado"
                onChange={(v) => { setStatusFilter(v as "all" | MarketingStatus); setSelectedRows([]); }}
                options={statusFilterOptions}
                value={statusFilter}
              />

              <ToolbarSelect
                icon={<AlertTriangle className="h-4 w-4" />}
                label="Escenario"
                onChange={(v) => { setVisualScenario(v as VisualScenario); setSelectedRows([]); }}
                options={["live", "empty", "error"]}
                value={visualScenario}
              />
            </div>
          </div>
        ) : null}

        <div className="min-h-[420px] bg-[#FAFAFA]/30">
          {isLoading ? (
            <TableSkeleton />
          ) : visualScenario === "error" && activeTab !== "resumen" && activeTab !== "recuperacion" ? (
            <ErrorState onRetry={() => setVisualScenario("live")} />
          ) : visualScenario === "empty" && activeTab !== "resumen" && activeTab !== "recuperacion" ? (
            <EmptyState onReset={() => setVisualScenario("live")} />
          ) : activeTab === "resumen" ? (
            <SummaryView onNavigate={handleTabChange} />
          ) : activeTab === "cupones" ? (
            <CouponsView
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
              openActionMenuId={openActionMenuId}
              setOpenActionMenuId={setOpenActionMenuId}
              actionMenuRef={actionMenuRef}
              openDrawer={openDrawer}
              onCopyCode={handleCopyCode}
              onAction={handleMockAction}
              onResetFilters={resetFilters}
            />
          ) : activeTab === "promociones" ? (
            <PromotionsView
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
              openDrawer={openDrawer}
              openActionMenuId={openActionMenuId}
              setOpenActionMenuId={setOpenActionMenuId}
              actionMenuRef={actionMenuRef}
              onAction={handleMockAction}
              onResetFilters={resetFilters}
            />
          ) : activeTab === "recuperacion" ? (
            <RecoveryView
              searchQuery={searchQuery}
              openDrawer={openDrawer}
            />
          ) : activeTab === "automatizaciones" ? (
            <AutomationsView
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              openDrawer={openDrawer}
              onAction={handleMockAction}
              onResetFilters={resetFilters}
            />
          ) : (
            <CaptureView
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              openDrawer={openDrawer}
              onAction={handleMockAction}
              onResetFilters={resetFilters}
            />
          )}
        </div>
      </div>

      {selectedRows.length > 0 ? (
        <div className="fixed bottom-10 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-[#111111] px-2 py-2 text-white shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="border-r border-gray-700 px-4">
            <span className="text-[13px] font-bold">{selectedRows.length} seleccionados</span>
          </div>
          <div className="flex items-center gap-1 px-2">
            <BulkActionButton icon={<Pause className="h-4 w-4" />} label="Pausar" onClick={() => handleMockAction("Pausar", selectedRows.length)} />
            <BulkActionButton icon={<Play className="h-4 w-4 text-emerald-400" />} label="Activar" onClick={() => handleMockAction("Activar", selectedRows.length)} />
            <BulkActionButton icon={<Download className="h-4 w-4" />} label="Exportar" onClick={() => handleMockAction("Exportar", selectedRows.length)} />
          </div>
          <button
            aria-label="Limpiar seleccion"
            className="mr-1 rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            onClick={() => setSelectedRows([])}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <MarketingDrawer content={drawerContent} isOpen={drawerContent !== null} onClose={closeDrawer} />

      <ToastViewport
        onDismiss={(id) => setToasts((c) => c.filter((t) => t.id !== id))}
        toasts={toasts}
      />
    </div>
  );
}

/* ─── Summary ─── */

function SummaryView({ onNavigate }: { onNavigate: (tab: TabValue) => void }) {
  const s = MOCK_MARKETING_SUMMARY;
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Ingresos atribuidos" value={formatCurrency(s.attributedRevenue)} accent />
        <SummaryCard label="Cupones activos" value={s.activeCoupons.toString()} />
        <SummaryCard label="Tasa recuperacion" value={`${s.cartRecoveryRate}%`} />
        <SummaryCard label="Total leads" value={s.totalLeads.toLocaleString("es-AR")} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Campañas activas" value={s.activeCampaigns.toString()} />
        <SummaryCard label="Bundles activos" value={s.activeBundles.toString()} />
        <SummaryCard label="Uso de promos" value={`${s.promoUsageRate}%`} />
        <SummaryCard label="Carritos abandonados" value={s.abandonedCarts.toString()} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          icon={<Ticket className="h-5 w-5 text-purple-500" />}
          title="Cupones"
          description={`${MOCK_COUPONS.filter(c => c.status === "active").length} activos, ${MOCK_COUPONS.filter(c => c.status === "scheduled").length} programados`}
          onClick={() => onNavigate("cupones")}
        />
        <ActionCard
          icon={<Tag className="h-5 w-5 text-blue-500" />}
          title="Promociones"
          description={`${MOCK_PROMOTIONS.filter(p => p.status === "active").length} activas generando ingresos`}
          onClick={() => onNavigate("promociones")}
        />
        <ActionCard
          icon={<ShoppingCart className="h-5 w-5 text-amber-500" />}
          title="Recuperacion"
          description={`${MOCK_ABANDONED_CARTS.filter(c => !c.recovered).length} carritos pendientes de seguimiento`}
          onClick={() => onNavigate("recuperacion")}
        />
        <ActionCard
          icon={<Zap className="h-5 w-5 text-emerald-500" />}
          title="Automatizaciones"
          description={`${MOCK_AUTOMATIONS.filter(a => a.status === "active").length} reglas activas procesando`}
          onClick={() => onNavigate("automatizaciones")}
        />
        <ActionCard
          icon={<Globe className="h-5 w-5 text-pink-500" />}
          title="Captacion"
          description={`${MOCK_CAPTURE_FORMS.filter(f => f.status === "active").length} formularios capturando leads`}
          onClick={() => onNavigate("captacion")}
        />
        <ActionCard
          icon={<Megaphone className="h-5 w-5 text-gray-400" />}
          title="Recomendaciones"
          description="Activa exit-intent popup para mejorar retention"
          muted
        />
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn(
      "rounded-2xl border border-[#EAEAEA] p-5 shadow-sm",
      accent ? "bg-[#111111]" : "bg-white"
    )}>
      <p className={cn(
        "text-[11px] font-bold uppercase tracking-[0.18em]",
        accent ? "text-gray-400" : "text-[#888888]"
      )}>{label}</p>
      <p className={cn(
        "mt-2 text-2xl font-black tracking-tight",
        accent ? "text-white" : "text-[#111111]"
      )}>{value}</p>
    </div>
  );
}

function ActionCard({ icon, title, description, onClick, muted = false }: { icon: React.ReactNode; title: string; description: string; onClick?: () => void; muted?: boolean }) {
  return (
    <button
      className={cn(
        "group flex items-start gap-4 rounded-2xl border border-[#EAEAEA] bg-white p-5 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
        muted && "opacity-60"
      )}
      onClick={onClick}
      type="button"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 transition-colors group-hover:bg-gray-100">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-[#111111]">{title}</p>
        <p className="mt-1 text-xs font-medium text-gray-500">{description}</p>
      </div>
      {onClick ? <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-[#111111]" /> : null}
    </button>
  );
}

/* ─── Coupons ─── */

function CouponsView({
  searchQuery,
  statusFilter,
  selectedRows,
  setSelectedRows,
  openActionMenuId,
  setOpenActionMenuId,
  actionMenuRef,
  openDrawer,
  onCopyCode,
  onAction,
  onResetFilters,
}: {
  searchQuery: string;
  statusFilter: "all" | MarketingStatus;
  selectedRows: string[];
  setSelectedRows: React.Dispatch<React.SetStateAction<string[]>>;
  openActionMenuId: string | null;
  setOpenActionMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  actionMenuRef: React.RefObject<HTMLDivElement | null>;
  openDrawer: (c: DrawerContent) => void;
  onCopyCode: (code: string) => Promise<void>;
  onAction: (a: string, c?: number) => void;
  onResetFilters: () => void;
}) {
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return MOCK_COUPONS.filter((c) => {
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      const matchesSearch = q.length === 0 || [c.name, c.code].join(" ").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [searchQuery, statusFilter]);

  const allSelected = filtered.length > 0 && filtered.every((c) => selectedRows.includes(c.id));

  if (filtered.length === 0) {
    return <NoResultsState onReset={onResetFilters} />;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]/70">
              <th className="w-12 px-6 py-4">
                <input
                  aria-label="Seleccionar todos los cupones"
                  checked={allSelected}
                  className="h-4 w-4 cursor-pointer rounded border-gray-300 text-[#111111] focus:ring-[#111111]"
                  onChange={(e) => setSelectedRows(e.target.checked ? filtered.map((c) => c.id) : [])}
                  type="checkbox"
                />
              </th>
              <TableHead label="Nombre" />
              <TableHead label="Codigo" />
              <TableHead label="Tipo" />
              <TableHead label="Descuento" align="right" />
              <TableHead label="Uso" align="right" />
              <TableHead label="Vigencia" />
              <TableHead label="Estado" />
              <th className="w-14 px-6 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAEAEA]/80">
            {filtered.map((coupon) => {
              const isSelected = selectedRows.includes(coupon.id);
              const isMenuOpen = openActionMenuId === coupon.id;

              return (
                <tr
                  key={coupon.id}
                  className={cn(
                    "group cursor-pointer transition-colors focus-within:bg-gray-50/80",
                    isSelected ? "bg-emerald-50/35" : "bg-white hover:bg-gray-50/60"
                  )}
                  onClick={() => openDrawer({ kind: "coupon", data: coupon })}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrawer({ kind: "coupon", data: coupon }); } }}
                >
                  <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                    <input
                      aria-label={`Seleccionar ${coupon.name}`}
                      checked={isSelected}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 text-[#111111] focus:ring-[#111111]"
                      onChange={(e) => setSelectedRows((c) => e.target.checked ? [...c, coupon.id] : c.filter((id) => id !== coupon.id))}
                      type="checkbox"
                    />
                  </td>
                  <td className="px-6 py-5 text-sm font-bold text-[#111111]">{coupon.name}</td>
                  <td className="px-6 py-5">
                    <code className="rounded-md bg-gray-100 px-2 py-1 font-mono text-xs font-bold text-[#111111]">{coupon.code}</code>
                  </td>
                  <td className="px-6 py-5"><CouponTypeBadge type={coupon.type} /></td>
                  <td className="px-6 py-5 text-right text-sm font-bold tabular-nums text-[#111111]">
                    {coupon.type === "percentage" ? `${coupon.discount}%` : coupon.type === "fixed_amount" ? formatCurrency(coupon.discount) : "—"}
                  </td>
                  <td className="px-6 py-5 text-right text-sm font-bold tabular-nums text-[#111111]">
                    {coupon.usageCount}{coupon.usageLimit ? <span className="text-gray-400">/{coupon.usageLimit}</span> : null}
                  </td>
                  <td className="px-6 py-5 text-[13px] font-medium text-gray-500">
                    {coupon.expiresAt ? dateFormatter.format(new Date(coupon.expiresAt)) : "Permanente"}
                  </td>
                  <td className="px-6 py-5"><MarketingStatusBadge status={coupon.status} /></td>
                  <td className="relative px-6 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      aria-expanded={isMenuOpen}
                      aria-haspopup="menu"
                      className="rounded-lg border border-transparent p-2 text-gray-500 opacity-0 transition-all group-hover:opacity-100 hover:border-[#EAEAEA] hover:bg-white hover:text-[#111111] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                      onClick={() => setOpenActionMenuId((c) => c === coupon.id ? null : coupon.id)}
                      type="button"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {isMenuOpen ? (
                      <div ref={actionMenuRef} className="absolute right-6 top-14 z-10 w-52 rounded-xl border border-[#EAEAEA] bg-white p-2 shadow-xl" role="menu">
                        <RowMenuButton icon={<Copy className="h-4 w-4" />} label="Copiar codigo" onClick={() => onCopyCode(coupon.code)} />
                        <RowMenuButton icon={<Pause className="h-4 w-4" />} label="Pausar" onClick={() => onAction("Cupon pausado")} />
                        <RowMenuButton icon={<Gift className="h-4 w-4" />} label="Duplicar" onClick={() => onAction("Cupon duplicado")} />
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <TableFooter count={filtered.length} total={MOCK_COUPONS.length} />
    </>
  );
}

/* ─── Promotions ─── */

function PromotionsView({
  searchQuery,
  statusFilter,
  selectedRows,
  setSelectedRows,
  openDrawer,
  openActionMenuId,
  setOpenActionMenuId,
  actionMenuRef,
  onAction,
  onResetFilters,
}: {
  searchQuery: string;
  statusFilter: "all" | MarketingStatus;
  selectedRows: string[];
  setSelectedRows: React.Dispatch<React.SetStateAction<string[]>>;
  openDrawer: (c: DrawerContent) => void;
  openActionMenuId: string | null;
  setOpenActionMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  actionMenuRef: React.RefObject<HTMLDivElement | null>;
  onAction: (a: string, c?: number) => void;
  onResetFilters: () => void;
}) {
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return MOCK_PROMOTIONS.filter((p) => {
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      const matchesSearch = q.length === 0 || [p.name, p.type, p.targeting].join(" ").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [searchQuery, statusFilter]);

  const allSelected = filtered.length > 0 && filtered.every((p) => selectedRows.includes(p.id));

  if (filtered.length === 0) {
    return <NoResultsState onReset={onResetFilters} />;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left">
          <thead>
            <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]/70">
              <th className="w-12 px-6 py-4">
                <input
                  aria-label="Seleccionar todas las promociones"
                  checked={allSelected}
                  className="h-4 w-4 cursor-pointer rounded border-gray-300 text-[#111111] focus:ring-[#111111]"
                  onChange={(e) => setSelectedRows(e.target.checked ? filtered.map((p) => p.id) : [])}
                  type="checkbox"
                />
              </th>
              <TableHead label="Nombre" />
              <TableHead label="Tipo" />
              <TableHead label="Targeting" />
              <TableHead label="Conversiones" align="right" />
              <TableHead label="Ingresos" align="right" />
              <TableHead label="Rendimiento" />
              <TableHead label="Estado" />
              <th className="w-14 px-6 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAEAEA]/80">
            {filtered.map((promo) => {
              const isSelected = selectedRows.includes(promo.id);
              const isMenuOpen = openActionMenuId === promo.id;

              return (
                <tr
                  key={promo.id}
                  className={cn(
                    "group cursor-pointer transition-colors focus-within:bg-gray-50/80",
                    isSelected ? "bg-emerald-50/35" : "bg-white hover:bg-gray-50/60"
                  )}
                  onClick={() => openDrawer({ kind: "promotion", data: promo })}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrawer({ kind: "promotion", data: promo }); } }}
                >
                  <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                    <input
                      aria-label={`Seleccionar ${promo.name}`}
                      checked={isSelected}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 text-[#111111] focus:ring-[#111111]"
                      onChange={(e) => setSelectedRows((c) => e.target.checked ? [...c, promo.id] : c.filter((id) => id !== promo.id))}
                      type="checkbox"
                    />
                  </td>
                  <td className="px-6 py-5 text-sm font-bold text-[#111111]">{promo.name}</td>
                  <td className="px-6 py-5"><PromoTypeBadge type={promo.type} /></td>
                  <td className="max-w-[180px] truncate px-6 py-5 text-[13px] font-medium text-gray-500">{promo.targeting}</td>
                  <td className="px-6 py-5 text-right text-sm font-bold tabular-nums text-[#111111]">{promo.conversions.toLocaleString("es-AR")}</td>
                  <td className="px-6 py-5 text-right text-[15px] font-black tracking-tight tabular-nums text-[#111111]">{formatCurrency(promo.revenueGenerated)}</td>
                  <td className="px-6 py-5"><PerformanceBadge conversions={promo.conversions} impressions={promo.impressions} /></td>
                  <td className="px-6 py-5"><MarketingStatusBadge status={promo.status} /></td>
                  <td className="relative px-6 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      aria-expanded={isMenuOpen}
                      aria-haspopup="menu"
                      className="rounded-lg border border-transparent p-2 text-gray-500 opacity-0 transition-all group-hover:opacity-100 hover:border-[#EAEAEA] hover:bg-white hover:text-[#111111] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                      onClick={() => setOpenActionMenuId((c) => c === promo.id ? null : promo.id)}
                      type="button"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {isMenuOpen ? (
                      <div ref={actionMenuRef} className="absolute right-6 top-14 z-10 w-52 rounded-xl border border-[#EAEAEA] bg-white p-2 shadow-xl" role="menu">
                        <RowMenuButton icon={<Pause className="h-4 w-4" />} label="Pausar" onClick={() => onAction("Promocion pausada")} />
                        <RowMenuButton icon={<Gift className="h-4 w-4" />} label="Duplicar" onClick={() => onAction("Promocion duplicada")} />
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <TableFooter count={filtered.length} total={MOCK_PROMOTIONS.length} />
    </>
  );
}

/* ─── Recovery ─── */

function RecoveryView({
  searchQuery,
  openDrawer,
}: {
  searchQuery: string;
  openDrawer: (c: DrawerContent) => void;
}) {
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return MOCK_ABANDONED_CARTS.filter((c) => {
      return q.length === 0 || [c.customerName, c.customerEmail].join(" ").toLowerCase().includes(q);
    });
  }, [searchQuery]);

  const recovered = MOCK_ABANDONED_CARTS.filter((c) => c.recovered).length;
  const pending = MOCK_ABANDONED_CARTS.filter((c) => !c.recovered).length;
  const totalValue = MOCK_ABANDONED_CARTS.filter((c) => !c.recovered).reduce((sum, c) => sum + c.cartTotal, 0);

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Carritos pendientes" value={pending.toString()} />
        <SummaryCard label="Recuperados" value={recovered.toString()} />
        <SummaryCard label="Valor pendiente" value={formatCurrency(totalValue)} accent />
      </div>

      {filtered.length === 0 ? (
        <NoResultsState onReset={() => {}} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#EAEAEA] shadow-sm">
          <div className="divide-y divide-[#EAEAEA]">
            {filtered.map((cart) => (
              <button
                key={cart.id}
                className="flex w-full items-center justify-between gap-4 bg-white px-5 py-4 text-left transition-colors hover:bg-gray-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/30"
                onClick={() => openDrawer({ kind: "cart", data: cart })}
                type="button"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-[#111111]">{cart.customerName}</p>
                    {cart.recovered ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Recuperado</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">Pendiente</span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs font-medium text-gray-500">
                    {cart.customerEmail} — {cart.itemsCount} items — {cart.remindersSent} recordatorios
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-black tracking-tight text-[#111111]">{formatCurrency(cart.cartTotal)}</p>
                  <p className="mt-1 text-[11px] font-medium text-gray-500">{dateTimeFormatter.format(new Date(cart.abandonedAt))}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Automations ─── */

function AutomationsView({
  searchQuery,
  statusFilter,
  openDrawer,
  onAction,
  onResetFilters,
}: {
  searchQuery: string;
  statusFilter: "all" | MarketingStatus;
  openDrawer: (c: DrawerContent) => void;
  onAction: (a: string) => void;
  onResetFilters: () => void;
}) {
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return MOCK_AUTOMATIONS.filter((a) => {
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      const matchesSearch = q.length === 0 || [a.name, a.trigger, a.type].join(" ").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [searchQuery, statusFilter]);

  if (filtered.length === 0) {
    return <NoResultsState onReset={onResetFilters} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((auto) => (
        <button
          key={auto.id}
          className="group flex flex-col gap-4 rounded-2xl border border-[#EAEAEA] bg-white p-5 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
          onClick={() => openDrawer({ kind: "automation", data: auto })}
          type="button"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 transition-colors group-hover:bg-gray-100">
              <Bot className="h-5 w-5 text-gray-500" />
            </div>
            <MarketingStatusBadge status={auto.status} />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-bold text-[#111111]">{auto.name}</p>
            <p className="mt-1 text-xs font-medium text-gray-500">{auto.trigger}</p>
          </div>

          <div className="flex items-center gap-4 border-t border-[#EAEAEA] pt-4">
            <AutomationTypeBadge type={auto.type} />
            <div className="ml-auto text-right">
              <p className="text-xs font-bold tabular-nums text-[#111111]">{auto.executionsCount.toLocaleString("es-AR")} ejecuciones</p>
              <p className="text-[11px] font-medium text-gray-500">{auto.conversionRate}% conversion</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ─── Capture ─── */

function CaptureView({
  searchQuery,
  statusFilter,
  openDrawer,
  onAction,
  onResetFilters,
}: {
  searchQuery: string;
  statusFilter: "all" | MarketingStatus;
  openDrawer: (c: DrawerContent) => void;
  onAction: (a: string) => void;
  onResetFilters: () => void;
}) {
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return MOCK_CAPTURE_FORMS.filter((f) => {
      const matchesStatus = statusFilter === "all" || f.status === statusFilter;
      const matchesSearch = q.length === 0 || [f.name, f.placement, f.type].join(" ").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [searchQuery, statusFilter]);

  if (filtered.length === 0) {
    return <NoResultsState onReset={onResetFilters} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
      {filtered.map((form) => (
        <button
          key={form.id}
          className="group flex items-start gap-4 rounded-2xl border border-[#EAEAEA] bg-white p-5 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
          onClick={() => openDrawer({ kind: "capture", data: form })}
          type="button"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 transition-colors group-hover:bg-gray-100">
            <Globe className="h-5 w-5 text-gray-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold text-[#111111]">{form.name}</p>
              <MarketingStatusBadge status={form.status} />
            </div>
            <p className="mt-1 truncate text-xs font-medium text-gray-500">{form.placement}</p>
            <div className="mt-3 flex items-center gap-4">
              <CaptureTypeBadge type={form.type} />
              <span className="text-xs font-bold tabular-nums text-[#111111]">{form.leadsCollected.toLocaleString("es-AR")} leads</span>
              <span className="text-[11px] font-medium text-gray-500">{form.conversionRate}% conv.</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ─── Shared Utilities ─── */

function ToolbarSelect({
  icon,
  label,
  onChange,
  options,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="flex min-w-[170px] items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-3 py-2.5 text-[13px] font-bold text-gray-600 shadow-sm">
      <span className="shrink-0 text-gray-400">{icon}</span>
      <span className="text-[#666666]">{label}</span>
      <select
        className="w-full bg-transparent text-right font-semibold text-[#111111] outline-none"
        onChange={(e) => onChange(e.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {selectLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function TableHead({ label, align = "left" }: { label: string; align?: "left" | "right" }) {
  return (
    <th
      className={cn(
        "px-6 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]",
        align === "right" ? "text-right" : "text-left"
      )}
    >
      {label}
    </th>
  );
}

function RowMenuButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
      onClick={onClick}
      role="menuitem"
      type="button"
    >
      <span className="text-gray-500">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function BulkActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      className="flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function TableFooter({ count, total }: { count: number; total: number }) {
  return (
    <div className="flex items-center justify-between border-t border-[#EAEAEA] bg-[#FAFAFA]/50 px-6 py-4">
      <span className="block text-xs font-bold uppercase tracking-[0.18em] text-[#888888]">
        Mostrando <b className="px-1 text-[#111111]">{count}</b> de {total}
      </span>
      <div className="flex gap-2">
        <button className="cursor-not-allowed rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-[13px] font-bold text-gray-400 opacity-50" disabled type="button">Anterior</button>
        <button className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-[13px] font-bold text-[#111111] shadow-sm transition-colors hover:bg-gray-50" type="button">Siguiente</button>
      </div>
    </div>
  );
}

function NoResultsState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-gray-100 bg-gray-50 shadow-sm">
        <Search className="h-8 w-8 text-gray-300" />
      </div>
      <h3 className="text-xl font-extrabold text-[#111111]">No encontramos resultados</h3>
      <p className="mt-2 max-w-md text-[15px] font-medium text-[#888888]">
        Ajusta busqueda o estado y vuelve a intentarlo.
      </p>
      <button
        className="mt-6 rounded-xl border border-[#EAEAEA] bg-white px-6 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        onClick={onReset}
        type="button"
      >
        Limpiar filtros
      </button>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-gray-100 bg-gray-50 shadow-sm">
        <Tag className="h-8 w-8 text-gray-300" />
      </div>
      <h3 className="text-xl font-extrabold text-[#111111]">Todavia no hay datos en esta vista</h3>
      <p className="mt-2 max-w-md text-[15px] font-medium text-[#888888]">
        Estado vacio simulado para QA. Regresa a la vista operativa para ver datos.
      </p>
      <button
        className="mt-6 rounded-xl border border-[#EAEAEA] bg-white px-6 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        onClick={onReset}
        type="button"
      >
        Volver a la muestra
      </button>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-red-100 bg-red-50 shadow-sm">
        <AlertTriangle className="h-8 w-8 text-red-400" />
      </div>
      <h3 className="text-xl font-extrabold text-[#111111]">No pudimos cargar los datos</h3>
      <p className="mt-2 max-w-md text-[15px] font-medium text-[#888888]">
        Estado simulado para QA visual. El retry vuelve a la vista operativa sin tocar datos.
      </p>
      <button
        className="mt-6 rounded-xl bg-[#111111] px-6 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        onClick={onRetry}
        type="button"
      >
        Reintentar
      </button>
    </div>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div aria-live="polite" className="fixed right-6 top-6 z-[60] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div key={toast.id} className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-xl animate-in slide-in-from-right-5 fade-in duration-300">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#111111]">{toast.title}</p>
              <p className="mt-1 text-sm font-medium text-gray-500">{toast.description}</p>
            </div>
            <button
              aria-label="Cerrar notificacion"
              className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#111111]"
              onClick={() => onDismiss(toast.id)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function selectLabel(value: string) {
  switch (value) {
    case "all": return "Todos";
    case "active": return "Activo";
    case "paused": return "Pausado";
    case "archived": return "Archivado";
    case "scheduled": return "Programado";
    case "draft": return "Borrador";
    case "expired": return "Expirado";
    case "live": return "Operativa";
    case "empty": return "Vacio";
    case "error": return "Error";
    default: return value;
  }
}
