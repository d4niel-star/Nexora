"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Building2,
  Copy,
  CreditCard,
  FileText,
  Key,
  Layers,
  Receipt,
  Save,
  Search,
  Settings,
  Shield,
  Sliders,
  Smartphone,
  Truck,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { SettingsDrawer } from "@/components/admin/settings/SettingsDrawer";
import { SettingsStatusBadge, RoleBadge, FrequencyBadge, StrengthBadge } from "@/components/admin/settings/SettingsBadge";
import { TableSkeleton } from "@/components/admin/orders/TableSkeleton";
import { cn, formatCurrency } from "@/lib/utils";
import {
  MOCK_ACCOUNT,
  MOCK_USERS,
  MOCK_PAYMENTS,
  MOCK_SHIPPING,
  MOCK_TAXES,
  MOCK_NOTIFICATIONS,
  MOCK_BILLING,
  MOCK_SECURITY,
  MOCK_PREFERENCES,
  MOCK_SETTINGS_SUMMARY,
} from "@/lib/mocks/settings";
import type { TeamUser, PaymentMethod, ShippingMethod, TaxRule, Invoice, SecuritySession } from "@/types/settings";

type TabValue = "resumen" | "cuenta" | "usuarios" | "pagos" | "envios" | "impuestos" | "notificaciones" | "facturacion" | "seguridad" | "preferencias";
type VisualScenario = "live" | "empty" | "error";

type DrawerContent =
  | { kind: "user"; data: TeamUser }
  | { kind: "payment"; data: PaymentMethod }
  | { kind: "shipping"; data: ShippingMethod }
  | { kind: "tax"; data: TaxRule }
  | { kind: "invoice"; data: Invoice }
  | { kind: "session"; data: SecuritySession };

interface ToastMessage { id: string; title: string; description: string; }

const timeFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const dateFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" });

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("resumen");
  const [searchQuery, setSearchQuery] = useState("");
  const [visualScenario, setVisualScenario] = useState<VisualScenario>("live");
  const [isLoading, setIsLoading] = useState(true);
  const [drawerContent, setDrawerContent] = useState<DrawerContent | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => { if (!isLoading) return; const t = window.setTimeout(() => setIsLoading(false), 720); return () => window.clearTimeout(t); }, [isLoading]);

  const tabs: Array<{ label: string; value: TabValue; icon: React.ReactNode }> = [
    { label: "Resumen", value: "resumen", icon: <Layers className="h-3.5 w-3.5" /> },
    { label: "Cuenta", value: "cuenta", icon: <Building2 className="h-3.5 w-3.5" /> },
    { label: "Usuarios", value: "usuarios", icon: <Users className="h-3.5 w-3.5" /> },
    { label: "Pagos", value: "pagos", icon: <CreditCard className="h-3.5 w-3.5" /> },
    { label: "Envios", value: "envios", icon: <Truck className="h-3.5 w-3.5" /> },
    { label: "Impuestos", value: "impuestos", icon: <Receipt className="h-3.5 w-3.5" /> },
    { label: "Notificaciones", value: "notificaciones", icon: <Bell className="h-3.5 w-3.5" /> },
    { label: "Facturacion", value: "facturacion", icon: <FileText className="h-3.5 w-3.5" /> },
    { label: "Seguridad", value: "seguridad", icon: <Shield className="h-3.5 w-3.5" /> },
    { label: "Preferencias", value: "preferencias", icon: <Sliders className="h-3.5 w-3.5" /> },
  ];

  const handleTabChange = (v: TabValue) => { if (v === activeTab) return; setActiveTab(v); setSearchQuery(""); setVisualScenario("live"); setIsLoading(true); };

  const pushToast = (title: string, description: string) => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setToasts((c) => [...c, { id, title, description }]);
    window.setTimeout(() => setToasts((c) => c.filter((t) => t.id !== id)), 3200);
  };

  const openDrawer = (c: DrawerContent) => setDrawerContent(c);
  const closeDrawer = () => setDrawerContent(null);
  const handleAction = (action: string) => { pushToast(action, "Accion simulada correctamente (mock)."); };

  const showToolbar = activeTab === "usuarios";

  return (
    <div className="animate-in fade-in space-y-8 pb-32 duration-700">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#111111]">Configuracion</h1>
          <p className="mt-1 text-[15px] font-medium text-[#666666]">Administra tu cuenta, equipo, pagos, envios y preferencias.</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-sm">
        <div aria-label="Secciones de configuracion" className="flex items-center gap-8 overflow-x-auto border-b border-[#EAEAEA] bg-[#FAFAFA]/50 px-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" role="tablist">
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
                <input aria-label="Buscar usuarios" className="w-full rounded-xl border border-transparent bg-gray-50 py-2.5 pl-10 pr-4 text-[13px] font-medium text-[#111111] transition-all placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar usuario..." type="text" value={searchQuery} />
              </div>
              <ToolbarSelect icon={<AlertTriangle className="h-4 w-4" />} label="Escenario" onChange={(v) => setVisualScenario(v as VisualScenario)} options={["live", "empty", "error"]} value={visualScenario} />
            </div>
          </div>
        ) : null}

        <div className="min-h-[420px] bg-[#FAFAFA]/30" role="tabpanel">
          {isLoading ? (
            <TableSkeleton />
          ) : visualScenario === "error" && showToolbar ? (
            <ErrorState onRetry={() => setVisualScenario("live")} />
          ) : visualScenario === "empty" && showToolbar ? (
            <EmptyState onReset={() => setVisualScenario("live")} />
          ) : activeTab === "resumen" ? (
            <SummaryView onNavigate={handleTabChange} onAction={handleAction} />
          ) : activeTab === "cuenta" ? (
            <AccountView onAction={handleAction} />
          ) : activeTab === "usuarios" ? (
            <UsersView searchQuery={searchQuery} openDrawer={openDrawer} onAction={handleAction} />
          ) : activeTab === "pagos" ? (
            <PaymentsView openDrawer={openDrawer} onAction={handleAction} />
          ) : activeTab === "envios" ? (
            <ShippingView openDrawer={openDrawer} onAction={handleAction} />
          ) : activeTab === "impuestos" ? (
            <TaxesView openDrawer={openDrawer} onAction={handleAction} />
          ) : activeTab === "notificaciones" ? (
            <NotificationsView onAction={handleAction} />
          ) : activeTab === "facturacion" ? (
            <BillingView openDrawer={openDrawer} onAction={handleAction} />
          ) : activeTab === "seguridad" ? (
            <SecurityView openDrawer={openDrawer} onAction={handleAction} />
          ) : (
            <PreferencesView onAction={handleAction} />
          )}
        </div>
      </div>

      <SettingsDrawer content={drawerContent} isOpen={drawerContent !== null} onClose={closeDrawer} onAction={handleAction} />
      <ToastViewport onDismiss={(id) => setToasts((c) => c.filter((t) => t.id !== id))} toasts={toasts} />
    </div>
  );
}

/* ─── Summary ─── */

function SummaryView({ onNavigate, onAction }: { onNavigate: (t: TabValue) => void; onAction: (a: string) => void }) {
  const s = MOCK_SETTINGS_SUMMARY;
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Plan" value={s.plan} accent />
        <KpiCard label="Estado" value="Activo" />
        <KpiCard label="Alertas pendientes" value={s.pendingAlerts.toString()} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Usuarios" value={s.usersCount.toString()} />
        <KpiCard label="Pagos configurados" value={s.paymentsConfigured.toString()} />
        <KpiCard label="Envios activos" value={s.shippingConfigured.toString()} />
        <KpiCard label="Seguridad" value="Seguro" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Proximo cobro" value={dateFormatter.format(new Date(s.nextInvoice))} />
        <KpiCard label="Monto" value={formatCurrency(s.nextInvoiceAmount)} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickNavCard icon={<Building2 className="h-5 w-5 text-blue-500" />} title="Cuenta" description="Datos del negocio" onClick={() => onNavigate("cuenta")} />
        <QuickNavCard icon={<Users className="h-5 w-5 text-purple-500" />} title="Usuarios" description={`${s.usersCount} miembros`} onClick={() => onNavigate("usuarios")} />
        <QuickNavCard icon={<Shield className="h-5 w-5 text-emerald-500" />} title="Seguridad" description="2FA activo" onClick={() => onNavigate("seguridad")} />
        <QuickNavCard icon={<FileText className="h-5 w-5 text-amber-500" />} title="Facturacion" description={`Plan ${s.plan}`} onClick={() => onNavigate("facturacion")} />
      </div>
    </div>
  );
}

/* ─── Account ─── */

function AccountView({ onAction }: { onAction: (a: string) => void }) {
  const a = MOCK_ACCOUNT;
  return (
    <div className="space-y-8 p-6">
      <div className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Datos del negocio</h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FormBlock label="Nombre del negocio" value={a.businessName} />
          <FormBlock label="Email principal" value={a.email} />
          <FormBlock label="Telefono" value={a.phone} />
          <FormBlock label="ID de cuenta" value={a.accountId} mono />
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Regional</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormBlock label="Pais" value={a.country} />
          <FormBlock label="Moneda" value={a.currency} />
          <FormBlock label="Idioma" value={a.language} />
          <FormBlock label="Zona horaria" value={a.timezone} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="flex items-center gap-2 rounded-xl bg-[#111111] px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => onAction("Cuenta guardada (mock)")} type="button"><Save className="h-3.5 w-3.5" />Guardar cambios</button>
        <button className="flex items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-5 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => onAction(`ID copiado: ${a.accountId}`)} type="button"><Copy className="h-3.5 w-3.5" />Copiar ID</button>
      </div>
    </div>
  );
}

/* ─── Users ─── */

function UsersView({ searchQuery, openDrawer, onAction }: { searchQuery: string; openDrawer: (c: DrawerContent) => void; onAction: (a: string) => void }) {
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return MOCK_USERS.filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [searchQuery]);

  if (filtered.length === 0) return <NoResultsState />;

  return (
    <div className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#EAEAEA] bg-white px-6 py-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">{filtered.length} usuarios</span>
        <button className="flex items-center gap-2 rounded-xl bg-[#111111] px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => onAction("Invitacion enviada (mock)")} type="button"><UserPlus className="h-3.5 w-3.5" />Invitar</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left">
          <thead>
            <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]/70">
              <TH label="Usuario" />
              <TH label="Email" />
              <TH label="Rol" />
              <TH label="Ultimo acceso" />
              <TH label="Estado" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAEAEA]/80">
            {filtered.map((u) => (
              <tr key={u.id} className="group cursor-pointer bg-white transition-colors hover:bg-gray-50/60 focus-within:bg-gray-50/80" onClick={() => openDrawer({ kind: "user", data: u })} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrawer({ kind: "user", data: u }); } }}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">{u.avatar}</div>
                    <span className="text-sm font-bold text-[#111111]">{u.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-medium text-gray-500">{u.email}</td>
                <td className="px-6 py-4"><RoleBadge role={u.role} /></td>
                <td className="px-6 py-4 text-xs font-bold tabular-nums text-gray-500">{u.lastAccess ? timeFormatter.format(new Date(u.lastAccess)) : "—"}</td>
                <td className="px-6 py-4"><SettingsStatusBadge status={u.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Payments ─── */

function PaymentsView({ openDrawer, onAction }: { openDrawer: (c: DrawerContent) => void; onAction: (a: string) => void }) {
  return (
    <div className="space-y-4 p-6">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Metodos de pago</h3>
      <div className="space-y-2">
        {MOCK_PAYMENTS.map((p) => (
          <button key={p.id} className="group flex w-full items-center gap-4 rounded-2xl border border-[#EAEAEA] bg-white p-4 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => openDrawer({ kind: "payment", data: p })} type="button">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-400 transition-colors group-hover:bg-gray-100"><CreditCard className="h-5 w-5" /></div>
            <div className="flex flex-1 items-center justify-between gap-3 min-w-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#111111]">{p.name}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-gray-500">{p.account || "Sin configurar"} · {p.currency}</p>
              </div>
              <SettingsStatusBadge status={p.status} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Shipping ─── */

function ShippingView({ openDrawer, onAction }: { openDrawer: (c: DrawerContent) => void; onAction: (a: string) => void }) {
  return (
    <div className="space-y-4 p-6">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Metodos de envio</h3>
      <div className="space-y-2">
        {MOCK_SHIPPING.map((s) => (
          <button key={s.id} className="group flex w-full items-center gap-4 rounded-2xl border border-[#EAEAEA] bg-white p-4 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => openDrawer({ kind: "shipping", data: s })} type="button">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-400 transition-colors group-hover:bg-gray-100"><Truck className="h-5 w-5" /></div>
            <div className="flex flex-1 items-center justify-between gap-3 min-w-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#111111]">{s.name}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-gray-500">{s.carrier} · {s.estimatedDays} · {formatCurrency(s.baseCost)}</p>
              </div>
              <SettingsStatusBadge status={s.status} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Taxes ─── */

function TaxesView({ openDrawer, onAction }: { openDrawer: (c: DrawerContent) => void; onAction: (a: string) => void }) {
  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left">
          <thead>
            <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]/70">
              <TH label="Regla" />
              <TH label="Alicuota" />
              <TH label="Region" />
              <TH label="Actualizado" />
              <TH label="Estado" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAEAEA]/80">
            {MOCK_TAXES.map((t) => (
              <tr key={t.id} className="group cursor-pointer bg-white transition-colors hover:bg-gray-50/60 focus-within:bg-gray-50/80" onClick={() => openDrawer({ kind: "tax", data: t })} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrawer({ kind: "tax", data: t }); } }}>
                <td className="px-6 py-4 text-sm font-bold text-[#111111]">{t.name}</td>
                <td className="px-6 py-4 text-sm font-bold tabular-nums text-[#111111]">{t.rate}%</td>
                <td className="px-6 py-4 text-xs font-medium text-gray-500">{t.region}</td>
                <td className="px-6 py-4 text-xs font-bold tabular-nums text-gray-500">{timeFormatter.format(new Date(t.lastUpdated))}</td>
                <td className="px-6 py-4"><SettingsStatusBadge status={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Notifications ─── */

function NotificationsView({ onAction }: { onAction: (a: string) => void }) {
  return (
    <div className="space-y-4 p-6">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Eventos notificables</h3>
      <div className="space-y-2">
        {MOCK_NOTIFICATIONS.map((n) => (
          <div key={n.id} className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[#111111]">{n.event}</p>
                  <SettingsStatusBadge status={n.status} />
                </div>
                <p className="mt-1 text-xs font-medium text-gray-500">{n.description}</p>
              </div>
              <FrequencyBadge frequency={n.frequency} />
            </div>
            <div className="mt-3 flex items-center gap-4">
              <ToggleItem label="Email" checked={n.email} onToggle={() => onAction(`Email ${n.email ? "desactivado" : "activado"} para ${n.event} (mock)`)} />
              <ToggleItem label="Push" checked={n.push} onToggle={() => onAction(`Push ${n.push ? "desactivado" : "activado"} para ${n.event} (mock)`)} />
              <ToggleItem label="Dashboard" checked={n.dashboard} onToggle={() => onAction(`Dashboard ${n.dashboard ? "desactivado" : "activado"} para ${n.event} (mock)`)} />
            </div>
          </div>
        ))}
      </div>
      <button className="flex items-center gap-2 rounded-xl bg-[#111111] px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => onAction("Notificaciones guardadas (mock)")} type="button"><Save className="h-3.5 w-3.5" />Guardar preferencias</button>
    </div>
  );
}

/* ─── Billing ─── */

function BillingView({ openDrawer, onAction }: { openDrawer: (c: DrawerContent) => void; onAction: (a: string) => void }) {
  const b = MOCK_BILLING;
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Plan actual" value={b.plan} accent />
        <KpiCard label="Proximo cobro" value={dateFormatter.format(new Date(b.nextCharge))} />
        <KpiCard label="Metodo de pago" value={b.paymentMethod} />
        <KpiCard label="Estado" value="Activo" />
      </div>
      <div className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Historial de facturas</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-left">
            <thead>
              <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]/70">
                <TH label="Descripcion" />
                <TH label="Fecha" />
                <TH label="Monto" />
                <TH label="Estado" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA]/80">
              {b.invoices.map((inv) => (
                <tr key={inv.id} className="group cursor-pointer bg-white transition-colors hover:bg-gray-50/60 focus-within:bg-gray-50/80" onClick={() => openDrawer({ kind: "invoice", data: inv })} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrawer({ kind: "invoice", data: inv }); } }}>
                  <td className="px-6 py-4 text-sm font-bold text-[#111111]">{inv.description}</td>
                  <td className="px-6 py-4 text-xs font-bold tabular-nums text-gray-500">{dateFormatter.format(new Date(inv.date))}</td>
                  <td className="px-6 py-4 text-sm font-bold tabular-nums text-[#111111]">{formatCurrency(inv.amount)}</td>
                  <td className="px-6 py-4"><SettingsStatusBadge status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="flex items-center gap-2 rounded-xl bg-[#111111] px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => onAction("Plan actualizado (mock)")} type="button">Actualizar plan</button>
        <button className="flex items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-5 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => onAction("Metodo de pago cambiado (mock)")} type="button">Cambiar metodo</button>
      </div>
    </div>
  );
}

/* ─── Security ─── */

function SecurityView({ openDrawer, onAction }: { openDrawer: (c: DrawerContent) => void; onAction: (a: string) => void }) {
  const sec = MOCK_SECURITY;
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Autenticacion 2FA</p>
          <div className="mt-3"><SettingsStatusBadge status={sec.twoFactorEnabled ? "secure" : "risk"} /></div>
        </div>
        <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Fortaleza de contraseña</p>
          <div className="mt-3"><StrengthBadge strength={sec.passwordStrength} /></div>
        </div>
        <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Ultimo acceso</p>
          <p className="mt-2 text-sm font-bold tabular-nums text-[#111111]">{timeFormatter.format(new Date(sec.lastLogin))}</p>
        </div>
        <KpiCard label="Sesiones activas" value={sec.sessions.length.toString()} />
      </div>
      <div className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Sesiones activas</h3>
        <div className="space-y-2">
          {sec.sessions.map((s) => (
            <button key={s.id} className="group flex w-full items-center gap-4 rounded-2xl border border-[#EAEAEA] bg-white p-4 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => openDrawer({ kind: "session", data: s })} type="button">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-400 transition-colors group-hover:bg-gray-100"><Smartphone className="h-5 w-5" /></div>
              <div className="flex flex-1 items-center justify-between gap-3 min-w-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#111111]">{s.device} {s.current ? <span className="text-emerald-600">(actual)</span> : null}</p>
                  <p className="mt-0.5 truncate text-xs font-medium text-gray-500">{s.location} · {timeFormatter.format(new Date(s.lastActive))}</p>
                </div>
                <SettingsStatusBadge status={s.current ? "active" : "inactive"} />
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="flex items-center gap-2 rounded-xl bg-[#111111] px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => onAction(sec.twoFactorEnabled ? "2FA desactivado (mock)" : "2FA activado (mock)")} type="button"><Shield className="h-3.5 w-3.5" />{sec.twoFactorEnabled ? "Desactivar 2FA" : "Activar 2FA"}</button>
        <button className="flex items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-5 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => onAction("Sesiones cerradas (mock)")} type="button">Cerrar otras sesiones</button>
        <button className="flex items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-5 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => onAction("Credenciales regeneradas (mock)")} type="button"><Key className="h-3.5 w-3.5" />Regenerar credenciales</button>
      </div>
    </div>
  );
}

/* ─── Preferences ─── */

function PreferencesView({ onAction }: { onAction: (a: string) => void }) {
  const p = MOCK_PREFERENCES;
  return (
    <div className="space-y-8 p-6">
      <div className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Regional y formato</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormBlock label="Idioma" value={p.language} />
          <FormBlock label="Formato de fecha" value={p.dateFormat} />
          <FormBlock label="Formato monetario" value={p.currencyFormat} />
          <FormBlock label="Densidad visual" value={p.density === "comfortable" ? "Comoda" : "Compacta"} />
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Preferencias generales</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ToggleCard label="Resumen diario por email" description="Recibir un email diario con el resumen de actividad." checked={p.emailDigest} onToggle={() => onAction(`Email digest ${p.emailDigest ? "desactivado" : "activado"} (mock)`)} />
          <ToggleCard label="Modo oscuro" description="Activar tema oscuro en el panel de administracion." checked={p.darkMode} onToggle={() => onAction(`Dark mode ${p.darkMode ? "desactivado" : "activado"} (mock)`)} />
        </div>
      </div>
      <button className="flex items-center gap-2 rounded-xl bg-[#111111] px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => onAction("Preferencias guardadas (mock)")} type="button"><Save className="h-3.5 w-3.5" />Guardar preferencias</button>
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
      <span className="ml-auto shrink-0 text-gray-300 transition-colors group-hover:text-[#111111]">→</span>
    </button>
  );
}

function FormBlock({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
      <p className="text-xs font-bold text-[#111111]">{label}</p>
      <p className={cn("mt-2 text-sm font-medium text-gray-500", mono && "font-mono text-xs")}>{value}</p>
    </div>
  );
}

function ToggleItem({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button className="flex items-center gap-2 text-xs font-bold text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 rounded-full pr-2" onClick={onToggle} type="button" aria-label={`Toggle ${label}`}>
      <div className={cn("flex h-5 w-9 items-center rounded-full p-0.5 transition-colors", checked ? "bg-emerald-500" : "bg-gray-200")}>
        <div className={cn("h-4 w-4 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-4" : "translate-x-0")} />
      </div>
      {label}
    </button>
  );
}

function ToggleCard({ label, description, checked, onToggle }: { label: string; description: string; checked: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#111111]">{label}</p>
          <p className="mt-1 text-xs font-medium text-gray-500">{description}</p>
        </div>
        <button className="shrink-0" onClick={onToggle} type="button" aria-label={`Toggle ${label}`}>
          <div className={cn("flex h-6 w-11 items-center rounded-full p-0.5 transition-colors", checked ? "bg-emerald-500" : "bg-gray-200")}>
            <div className={cn("h-5 w-5 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-5" : "translate-x-0")} />
          </div>
        </button>
      </div>
    </div>
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
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-gray-100 bg-gray-50 shadow-sm"><Settings className="h-8 w-8 text-gray-300" /></div>
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
