"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CalendarDays,
  Clock,
  HelpCircle,
  Inbox,
  LifeBuoy,
  MessageSquare,
  PhoneCall,
  Search,
  Server,
  Terminal,
  Ticket,
  X,
} from "lucide-react";

import { SupportDrawer } from "@/components/admin/support/SupportDrawer";
import {
  SupportTicketStatusBadge,
  SupportPriorityBadge,
  SupportSystemStatusBadge,
  SupportSeverityBadge,
  SupportArticleStatusBadge,
} from "@/components/admin/support/SupportBadge";
import { TableSkeleton } from "@/components/admin/orders/TableSkeleton";
import { cn } from "@/lib/utils";
import {
  MOCK_TICKETS,
  MOCK_HELP_ARTICLES,
  MOCK_SYSTEM_STATUS,
  MOCK_GUIDES,
  MOCK_CONTACT_CHANNELS,
  MOCK_SUPPORT_ACTIVITIES,
  MOCK_SUPPORT_SUMMARY,
} from "@/lib/mocks/support";
import type {
  Ticket as TicketType,
  HelpArticle,
  Guide,
  ContactChannel,
  SupportActivity,
} from "@/types/support";

type TabValue = "resumen" | "tickets" | "centro_ayuda" | "estado_sistema" | "guias" | "contacto" | "actividad";
type VisualScenario = "live" | "empty" | "error";

type DrawerContent =
  | { kind: "ticket"; data: TicketType }
  | { kind: "article"; data: HelpArticle }
  | { kind: "guide"; data: Guide }
  | { kind: "activity"; data: SupportActivity }
  | { kind: "contact"; data: ContactChannel };

interface ToastMessage { id: string; title: string; description: string; }

const timeFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const dateFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" });

export function SupportPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("resumen");
  const [searchQuery, setSearchQuery] = useState("");
  const [visualScenario, setVisualScenario] = useState<VisualScenario>("live");
  const [isLoading, setIsLoading] = useState(true);
  const [drawerContent, setDrawerContent] = useState<DrawerContent | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => { if (!isLoading) return; const t = window.setTimeout(() => setIsLoading(false), 720); return () => window.clearTimeout(t); }, [isLoading]);

  const tabs: Array<{ label: string; value: TabValue; icon: React.ReactNode }> = [
    { label: "Resumen", value: "resumen", icon: <LifeBuoy className="h-3.5 w-3.5" /> },
    { label: "Tickets", value: "tickets", icon: <Inbox className="h-3.5 w-3.5" /> },
    { label: "Centro de ayuda", value: "centro_ayuda", icon: <HelpCircle className="h-3.5 w-3.5" /> },
    { label: "Estado del sistema", value: "estado_sistema", icon: <Server className="h-3.5 w-3.5" /> },
    { label: "Guias", value: "guias", icon: <BookOpen className="h-3.5 w-3.5" /> },
    { label: "Contacto", value: "contacto", icon: <PhoneCall className="h-3.5 w-3.5" /> },
    { label: "Actividad", value: "actividad", icon: <Activity className="h-3.5 w-3.5" /> },
  ];

  const handleTabChange = (v: TabValue) => { if (v === activeTab) return; setActiveTab(v); setSearchQuery(""); setVisualScenario("live"); setIsLoading(true); };

  const pushToast = (title: string, description: string) => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setToasts((c) => [...c, { id, title, description }]);
    window.setTimeout(() => setToasts((c) => c.filter((t) => t.id !== id)), 3200);
  };

  const openDrawer = (c: DrawerContent) => setDrawerContent(c);
  const closeDrawer = () => setDrawerContent(null);
  const handleAction = (action: string) => { pushToast("Accion ejecutada", action); };

  const showToolbar = activeTab === "tickets" || activeTab === "centro_ayuda" || activeTab === "actividad";
  const showSearch = activeTab === "tickets" || activeTab === "centro_ayuda";

  return (
    <div className="animate-in fade-in space-y-8 pb-32 duration-700">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#111111]">Soporte y Ayuda</h1>
          <p className="mt-1 text-[15px] font-medium text-[#666666]">Obtene ayuda, revisa el estado del sistema y gestiona tus tickets.</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-sm">
        <div aria-label="Secciones de soporte" className="flex items-center gap-8 overflow-x-auto border-b border-[#EAEAEA] bg-[#FAFAFA]/50 px-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" role="tablist">
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
              {showSearch && (
                <div className="group relative w-full lg:max-w-sm">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-emerald-500" />
                  <input aria-label="Buscar" className="w-full rounded-xl border border-transparent bg-gray-50 py-2.5 pl-10 pr-4 text-[13px] font-medium text-[#111111] transition-all placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" onChange={(e) => setSearchQuery(e.target.value)} placeholder={activeTab === "tickets" ? "Buscar por ID, asunto..." : "Buscar articulo..."} type="text" value={searchQuery} />
                </div>
              )}
              <ToolbarSelect icon={<AlertTriangle className="h-4 w-4" />} label="Escenario" onChange={(v) => setVisualScenario(v as VisualScenario)} options={["live", "empty", "error"]} value={visualScenario} />
            </div>
            {activeTab === "tickets" && (
              <button className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-[#111111] px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 w-full justify-center md:w-auto" onClick={() => handleAction("Nuevo ticket creado (mock)")} type="button">
                <MessageSquare className="h-4 w-4" />
                Crear ticket
              </button>
            )}
          </div>
        ) : null}

        <div className="bg-[#FAFAFA]/30" role="tabpanel">
          {isLoading ? (
            <TableSkeleton />
          ) : visualScenario === "error" && showToolbar ? (
            <ErrorState onRetry={() => setVisualScenario("live")} />
          ) : visualScenario === "empty" && showToolbar ? (
            <EmptyState onReset={() => setVisualScenario("live")} />
          ) : activeTab === "resumen" ? (
            <SummaryView onNavigate={handleTabChange} onAction={handleAction} />
          ) : activeTab === "tickets" ? (
            <TicketsView searchQuery={searchQuery} openDrawer={openDrawer} />
          ) : activeTab === "centro_ayuda" ? (
            <HelpCenterView searchQuery={searchQuery} openDrawer={openDrawer} />
          ) : activeTab === "estado_sistema" ? (
            <SystemStatusView onAction={handleAction} />
          ) : activeTab === "guias" ? (
            <GuidesView openDrawer={openDrawer} />
          ) : activeTab === "contacto" ? (
            <ContactView openDrawer={openDrawer} onAction={handleAction} />
          ) : (
            <ActivityView openDrawer={openDrawer} />
          )}
        </div>
      </div>

      <SupportDrawer content={drawerContent} isOpen={drawerContent !== null} onClose={closeDrawer} onAction={handleAction} />
      <ToastViewport onDismiss={(id) => setToasts((c) => c.filter((t) => t.id !== id))} toasts={toasts} />
    </div>
  );
}

/* ─── Summary ─── */

function SummaryView({ onNavigate, onAction }: { onNavigate: (t: TabValue) => void; onAction: (a: string) => void }) {
  const s = MOCK_SUPPORT_SUMMARY;
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Tickets abiertos" value={s.openTickets.toString()} accent={s.openTickets > 0} />
        <KpiCard label="Tickets resueltos" value={s.resolvedTickets.toString()} />
        <KpiCard label="Tiempo de respuesta" value={s.avgResponseTime} />
        <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Estado del sistema</p>
          <div className="mt-3"><SupportSystemStatusBadge status={s.overallSystemStatus} /></div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Accesos rapidos</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickNavCard icon={<HelpCircle className="h-5 w-5 text-blue-500" />} title="Centro de Ayuda" description="Articulos y resolucion" onClick={() => onNavigate("centro_ayuda")} />
          <QuickNavCard icon={<Inbox className="h-5 w-5 text-purple-500" />} title="Mis Tickets" description="Seguimiento de casos" onClick={() => onNavigate("tickets")} />
          <QuickNavCard icon={<BookOpen className="h-5 w-5 text-emerald-500" />} title="Guias" description="Tutoriales paso a paso" onClick={() => onNavigate("guias")} />
          <QuickNavCard icon={<PhoneCall className="h-5 w-5 text-amber-500" />} title="Contacto directly" description="Comunicate con nosotros" onClick={() => onNavigate("contacto")} />
        </div>
      </div>
    </div>
  );
}

/* ─── Tickets ─── */

function TicketsView({ searchQuery, openDrawer }: { searchQuery: string; openDrawer: (c: DrawerContent) => void }) {
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return MOCK_TICKETS.filter((t) => !q || t.subject.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
  }, [searchQuery]);

  if (filtered.length === 0) return <NoResultsState />;

  return (
    <div className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#EAEAEA] bg-white px-6 py-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">{filtered.length} tickets</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left">
          <thead>
            <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]/70">
              <TH label="ID / Asunto" />
              <TH label="Categoría" />
              <TH label="Prioridad" />
              <TH label="Estado" />
              <TH label="Actualizado" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAEAEA]/80">
            {filtered.map((t) => (
              <tr key={t.id} className="group cursor-pointer bg-white transition-colors hover:bg-gray-50/60 focus-within:bg-gray-50/80" onClick={() => openDrawer({ kind: "ticket", data: t })} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrawer({ kind: "ticket", data: t }); } }}>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-xs text-gray-500">{t.id}</span>
                    <span className="text-sm font-bold text-[#111111]">{t.subject}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">{t.category}</td>
                <td className="px-6 py-4"><SupportPriorityBadge priority={t.priority} /></td>
                <td className="px-6 py-4"><SupportTicketStatusBadge status={t.status} /></td>
                <td className="px-6 py-4 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500"><CalendarDays className="h-3 w-3" />{dateFormatter.format(new Date(t.updatedAt))}</div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400"><Clock className="h-3 w-3" />{new Date(t.updatedAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Help Center ─── */

function HelpCenterView({ searchQuery, openDrawer }: { searchQuery: string; openDrawer: (c: DrawerContent) => void }) {
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return MOCK_HELP_ARTICLES.filter((a) => !q || a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q));
  }, [searchQuery]);

  if (filtered.length === 0) return <NoResultsState />;

  return (
    <div className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#EAEAEA] bg-white px-6 py-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">{filtered.length} articulos</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left">
          <thead>
            <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]/70">
              <TH label="Articulo" />
              <TH label="Categoría" />
              <TH label="Lectura" />
              <TH label="Estado" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAEAEA]/80">
            {filtered.map((a) => (
              <tr key={a.id} className="group cursor-pointer bg-white transition-colors hover:bg-gray-50/60 focus-within:bg-gray-50/80" onClick={() => openDrawer({ kind: "article", data: a })} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrawer({ kind: "article", data: a }); } }}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-50 text-gray-400 transition-colors group-hover:bg-gray-100"><BookOpen className="h-4 w-4" /></div>
                    <span className="text-sm font-bold text-[#111111]">{a.title}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">{a.category}</td>
                <td className="px-6 py-4 text-xs font-bold text-gray-500">{a.readTime}</td>
                <td className="px-6 py-4"><SupportArticleStatusBadge status={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── System Status ─── */

function SystemStatusView({ onAction }: { onAction: (a: string) => void }) {
  const ss = MOCK_SYSTEM_STATUS;
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-[#111111]">Estado General</h2>
          <p className="mt-1 text-sm font-medium text-gray-500">{ss.history}</p>
        </div>
        <div className="flex items-center gap-3">
          <SupportSystemStatusBadge status={ss.overallStatus} />
          <span className="text-xs font-bold text-gray-400">Ultimo incidente: {timeFormatter.format(new Date(ss.lastIncident))}</span>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Modulos del sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ss.modules.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
              <span className="text-sm font-bold text-[#111111]">{m.name}</span>
              <SupportSystemStatusBadge status={m.status} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <button className="flex items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-5 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => onAction("Solicitud de chequeo enviada (mock)")} type="button">Refrescar estado</button>
      </div>
    </div>
  );
}

/* ─── Guides ─── */

function GuidesView({ openDrawer }: { openDrawer: (c: DrawerContent) => void }) {
  return (
    <div className="space-y-4 p-6">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Guias de usuario</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_GUIDES.map((g) => (
          <button key={g.id} className="group flex flex-col items-start gap-4 rounded-2xl border border-[#EAEAEA] bg-white p-5 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => openDrawer({ kind: "guide", data: g })} type="button">
            <div className="flex w-full items-start justify-between gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-400 transition-colors group-hover:bg-gray-100"><BookOpen className="h-5 w-5" /></div>
              <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-gray-600">{g.level}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-[#111111]">{g.title}</p>
              <p className="mt-1 text-xs font-bold text-gray-500 uppercase tracking-widest">{g.category} · {g.duration}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Contact ─── */

function ContactView({ openDrawer, onAction }: { openDrawer: (c: DrawerContent) => void; onAction: (a: string) => void }) {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {MOCK_CONTACT_CHANNELS.map((ch) => (
          <div key={ch.id} className="flex flex-col gap-4 rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-[#111111]">
              {ch.type === "chat" ? <MessageSquare className="h-5 w-5" /> : ch.type === "email" ? <Inbox className="h-5 w-5" /> : <PhoneCall className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111111]">{ch.name}</h3>
              <p className="mt-1 text-xs font-medium text-gray-500">{ch.description}</p>
            </div>
            <div className="mt-2 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Restricciones</p>
              <p className="text-xs font-bold text-[#111111]">{ch.availability}</p>
              <p className="text-[10px] font-bold text-gray-500">SLA: {ch.sla}</p>
            </div>
            <div className="mt-auto pt-4">
              <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#111111] px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => openDrawer({ kind: "contact", data: ch })} type="button">
                Ver detalle
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Activity ─── */

function ActivityView({ openDrawer }: { openDrawer: (c: DrawerContent) => void }) {
  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left">
          <thead>
            <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]/70">
              <TH label="Actividad / Evento" />
              <TH label="Referencia" />
              <TH label="Severidad" />
              <TH label="Fecha" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAEAEA]/80">
            {MOCK_SUPPORT_ACTIVITIES.map((act) => (
              <tr key={act.id} className="group cursor-pointer bg-white transition-colors hover:bg-gray-50/60 focus-within:bg-gray-50/80" onClick={() => openDrawer({ kind: "activity", data: act })} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrawer({ kind: "activity", data: act }); } }}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-colors group-hover:bg-gray-100"><Terminal className="h-4 w-4" /></div>
                    <span className="text-sm font-bold text-[#111111]">{act.description}</span>
                  </div>
                </td>
                <td className="px-6 py-4"><span className="font-mono text-xs text-[#111111] bg-gray-100 px-2 py-0.5 rounded">{act.referenceId}</span></td>
                <td className="px-6 py-4"><SupportSeverityBadge severity={act.severity} /></td>
                <td className="px-6 py-4 text-xs font-bold text-gray-500 tabular-nums">{timeFormatter.format(new Date(act.timestamp))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Shared Components ─── */

function KpiCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl border border-[#EAEAEA] p-5 shadow-sm", accent ? "bg-[#111111]" : "bg-white")}>
      <p className={cn("text-[11px] font-bold uppercase tracking-[0.18em]", accent ? "text-gray-400" : "text-[#888888]")}>{label}</p>
      <p className={cn("mt-2 truncate text-2xl font-black tracking-tight", accent ? "text-white" : "text-[#111111]")} title={value}>{value}</p>
    </div>
  );
}

function QuickNavCard({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick: () => void }) {
  return (
    <button className="group flex items-start gap-4 rounded-2xl border border-[#EAEAEA] bg-white p-5 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={onClick} type="button">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 transition-colors group-hover:bg-gray-100">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-[#111111]">{title}</p>
        <p className="mt-1 truncate text-xs font-medium text-gray-500">{description}</p>
      </div>
    </button>
  );
}

function ToolbarSelect({ icon, label, onChange, options, value }: { icon: React.ReactNode; label: string; onChange: (v: string) => void; options: string[]; value: string }) {
  return (
    <label className="flex min-w-[170px] items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-3 py-2.5 text-[13px] font-bold text-gray-600 shadow-sm">
      <span className="shrink-0 text-gray-400">{icon}</span>
      <span className="text-[#666666]">{label}</span>
      <select className="w-full bg-transparent text-right font-semibold text-[#111111] outline-none" onChange={(e) => onChange(e.target.value)} value={value}>
        {options.map((o) => <option key={o} value={o}>{o === "live" ? "Operativa" : o === "empty" ? "Vacio" : "Error"}</option>)}
      </select>
    </label>
  );
}

function TH({ label }: { label: string }) {
  return <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">{label}</th>;
}

function NoResultsState() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-gray-100 bg-gray-50 shadow-sm"><Search className="h-8 w-8 text-gray-300" /></div>
      <h3 className="text-xl font-extrabold text-[#111111]">No encontramos resultados</h3>
      <p className="mt-2 max-w-md text-[15px] font-medium text-[#888888]">Ajusta la busqueda y vuelve a intentarlo.</p>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-gray-100 bg-gray-50 shadow-sm"><Ticket className="h-8 w-8 text-gray-300" /></div>
      <h3 className="text-xl font-extrabold text-[#111111]">Todavia no hay datos en esta vista</h3>
      <p className="mt-2 max-w-md text-[15px] font-medium text-[#888888]">Estado vacio simulado para QA.</p>
      <button className="mt-6 rounded-xl border border-[#EAEAEA] bg-white px-6 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={onReset} type="button">Volver a la muestra</button>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-red-100 bg-red-50 shadow-sm"><AlertTriangle className="h-8 w-8 text-red-400" /></div>
      <h3 className="text-xl font-extrabold text-[#111111]">No pudimos cargar los datos</h3>
      <p className="mt-2 max-w-md text-[15px] font-medium text-[#888888]">Estado simulado para QA visual.</p>
      <button className="mt-6 rounded-xl bg-[#111111] px-6 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={onRetry} type="button">Reintentar</button>
    </div>
  );
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div aria-live="polite" className="fixed right-6 top-20 z-[60] flex w-full max-w-sm flex-col gap-3">
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
