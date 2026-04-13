"use client";

import { useEffect, useRef } from "react";
import { Copy, Download, Eye, LogOut, Pencil, RefreshCw, Send, X } from "lucide-react";

import type { TeamUser, PaymentMethod, ShippingMethod, TaxRule, Invoice, SecuritySession } from "@/types/settings";
import { SettingsStatusBadge, RoleBadge } from "@/components/admin/settings/SettingsBadge";
import { formatCurrency } from "@/lib/utils";

type DrawerContent =
  | { kind: "user"; data: TeamUser }
  | { kind: "payment"; data: PaymentMethod }
  | { kind: "shipping"; data: ShippingMethod }
  | { kind: "tax"; data: TaxRule }
  | { kind: "invoice"; data: Invoice }
  | { kind: "session"; data: SecuritySession };

interface SettingsDrawerProps {
  content: DrawerContent | null;
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{label}</p>
      <div className="text-sm font-medium text-[#111111]">{value}</div>
    </div>
  );
}

const timeFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function SettingsDrawer({ content, isOpen, onClose, onAction }: SettingsDrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) { document.body.style.overflow = "unset"; return; }
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const handleEscape = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEscape);
    return () => { document.body.style.overflow = "unset"; window.removeEventListener("keydown", handleEscape); };
  }, [isOpen, onClose]);

  if (!isOpen || !content) return null;

  return (
    <>
      <div aria-hidden="true" className="fixed inset-0 z-40 bg-[#111111]/28 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panelRef}
        aria-labelledby="settings-drawer-title"
        aria-modal="true"
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-y-auto border-l border-[#EAEAEA] bg-white shadow-2xl outline-none animate-in slide-in-from-right-5 duration-300 sm:max-w-xl"
        role="dialog"
        tabIndex={-1}
      >
        <div className="sticky top-0 z-20 border-b border-[#EAEAEA] bg-white/90 px-6 py-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <h2 id="settings-drawer-title" className="truncate text-xl font-extrabold tracking-tight text-[#111111]">
                {getTitle(content)}
              </h2>
              <div className="flex flex-wrap gap-2">{getBadges(content)}</div>
            </div>
            <button aria-label="Cerrar drawer" className="rounded-full p-2.5 text-gray-400 transition-all hover:bg-gray-100 hover:text-[#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={onClose} type="button">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-8 p-6 sm:p-8">
          {content.kind === "user" ? <UserDetail data={content.data} onAction={onAction} /> : null}
          {content.kind === "payment" ? <PaymentDetail data={content.data} onAction={onAction} /> : null}
          {content.kind === "shipping" ? <ShippingDetail data={content.data} onAction={onAction} /> : null}
          {content.kind === "tax" ? <TaxDetail data={content.data} onAction={onAction} /> : null}
          {content.kind === "invoice" ? <InvoiceDetail data={content.data} onAction={onAction} /> : null}
          {content.kind === "session" ? <SessionDetail data={content.data} onAction={onAction} /> : null}
        </div>
      </div>
    </>
  );
}

function getTitle(c: DrawerContent): string {
  switch (c.kind) {
    case "user": return c.data.name;
    case "payment": return c.data.name;
    case "shipping": return c.data.name;
    case "tax": return c.data.name;
    case "invoice": return c.data.description;
    case "session": return c.data.device;
  }
}

function getBadges(c: DrawerContent) {
  switch (c.kind) {
    case "user": return <><SettingsStatusBadge status={c.data.status} /><RoleBadge role={c.data.role} /></>;
    case "payment": return <SettingsStatusBadge status={c.data.status} />;
    case "shipping": return <SettingsStatusBadge status={c.data.status} />;
    case "tax": return <SettingsStatusBadge status={c.data.status} />;
    case "invoice": return <SettingsStatusBadge status={c.data.status} />;
    case "session": return c.data.current ? <SettingsStatusBadge status="active" /> : <SettingsStatusBadge status="inactive" />;
  }
}

/* ─── Details ─── */

function UserDetail({ data, onAction }: { data: TeamUser; onAction: (a: string) => void }) {
  return (
    <>
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Detalle de usuario</h3>
        <div className="space-y-3">
          <InfoRow label="Email" value={<span className="break-all font-mono text-xs text-gray-500">{data.email}</span>} />
          <InfoRow label="Rol" value={<RoleBadge role={data.role} />} />
          <InfoRow label="Estado" value={<SettingsStatusBadge status={data.status} />} />
          <InfoRow label="Ultimo acceso" value={data.lastAccess ? timeFormatter.format(new Date(data.lastAccess)) : "Sin acceso"} />
        </div>
      </section>
      <section className="flex flex-wrap gap-2">
        <DrawerAction icon={<Pencil className="h-3.5 w-3.5" />} label="Editar rol" onClick={() => onAction(`Rol de ${data.name} editado (mock)`)} primary />
        {data.status === "active" ? <DrawerAction icon={<Eye className="h-3.5 w-3.5" />} label="Desactivar" onClick={() => onAction(`${data.name} desactivado (mock)`)} /> : <DrawerAction icon={<Eye className="h-3.5 w-3.5" />} label="Activar" onClick={() => onAction(`${data.name} activado (mock)`)} />}
        {data.status === "pending" ? <DrawerAction icon={<Send className="h-3.5 w-3.5" />} label="Reenviar invitacion" onClick={() => onAction(`Invitacion reenviada a ${data.email} (mock)`)} /> : null}
        <DrawerAction icon={<Eye className="h-3.5 w-3.5" />} label="Ver actividad" onClick={() => onAction(`Actividad de ${data.name} (mock)`)} />
      </section>
    </>
  );
}

function PaymentDetail({ data, onAction }: { data: PaymentMethod; onAction: (a: string) => void }) {
  return (
    <>
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Detalle de pago</h3>
        <div className="space-y-3">
          <InfoRow label="Proveedor" value={data.provider} />
          <InfoRow label="Cuenta" value={data.account || "No configurada"} />
          <InfoRow label="Moneda" value={data.currency} />
          <InfoRow label="Estado" value={<SettingsStatusBadge status={data.status} />} />
          <InfoRow label="Ultima verificacion" value={data.lastVerified ? timeFormatter.format(new Date(data.lastVerified)) : "Nunca"} />
        </div>
      </section>
      <section className="flex flex-wrap gap-2">
        {data.status === "pending" ? <DrawerAction icon={<RefreshCw className="h-3.5 w-3.5" />} label="Conectar" onClick={() => onAction(`${data.name} conectado (mock)`)} primary /> : <DrawerAction icon={<RefreshCw className="h-3.5 w-3.5" />} label="Verificar" onClick={() => onAction(`${data.name} verificado (mock)`)} primary />}
        <DrawerAction icon={<RefreshCw className="h-3.5 w-3.5" />} label="Reconectar" onClick={() => onAction(`${data.name} reconectado (mock)`)} />
        {data.status !== "pending" ? <DrawerAction icon={<Eye className="h-3.5 w-3.5" />} label="Desactivar" onClick={() => onAction(`${data.name} desactivado (mock)`)} /> : null}
      </section>
    </>
  );
}

function ShippingDetail({ data, onAction }: { data: ShippingMethod; onAction: (a: string) => void }) {
  return (
    <>
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Detalle de envio</h3>
        <div className="space-y-3">
          <InfoRow label="Transportista" value={data.carrier} />
          <InfoRow label="Costo base" value={formatCurrency(data.baseCost)} />
          <InfoRow label="Tiempo estimado" value={data.estimatedDays} />
          <InfoRow label="Zonas" value={data.zones.join(", ")} />
          <InfoRow label="Estado" value={<SettingsStatusBadge status={data.status} />} />
        </div>
      </section>
      <section className="flex flex-wrap gap-2">
        <DrawerAction icon={<Pencil className="h-3.5 w-3.5" />} label="Editar" onClick={() => onAction(`${data.name} editado (mock)`)} primary />
        {data.status === "active" ? <DrawerAction icon={<Eye className="h-3.5 w-3.5" />} label="Desactivar" onClick={() => onAction(`${data.name} desactivado (mock)`)} /> : <DrawerAction icon={<Eye className="h-3.5 w-3.5" />} label="Activar" onClick={() => onAction(`${data.name} activado (mock)`)} />}
      </section>
    </>
  );
}

function TaxDetail({ data, onAction }: { data: TaxRule; onAction: (a: string) => void }) {
  return (
    <>
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Detalle de impuesto</h3>
        <div className="space-y-3">
          <InfoRow label="Alicuota" value={`${data.rate}%`} />
          <InfoRow label="Pais" value={data.country} />
          <InfoRow label="Region" value={data.region} />
          <InfoRow label="Estado" value={<SettingsStatusBadge status={data.status} />} />
          <InfoRow label="Ultima actualizacion" value={timeFormatter.format(new Date(data.lastUpdated))} />
        </div>
      </section>
      <section className="flex flex-wrap gap-2">
        <DrawerAction icon={<Pencil className="h-3.5 w-3.5" />} label="Editar regla" onClick={() => onAction(`${data.name} editada (mock)`)} primary />
        <DrawerAction icon={<Copy className="h-3.5 w-3.5" />} label="Duplicar" onClick={() => onAction(`${data.name} duplicada (mock)`)} />
        <DrawerAction icon={<Eye className="h-3.5 w-3.5" />} label="Revisar" onClick={() => onAction(`Revisando ${data.name} (mock)`)} />
      </section>
    </>
  );
}

function InvoiceDetail({ data, onAction }: { data: Invoice; onAction: (a: string) => void }) {
  return (
    <>
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Detalle de factura</h3>
        <div className="space-y-3">
          <InfoRow label="ID" value={<span className="font-mono text-xs text-gray-500">{data.id}</span>} />
          <InfoRow label="Fecha" value={timeFormatter.format(new Date(data.date))} />
          <InfoRow label="Monto" value={formatCurrency(data.amount)} />
          <InfoRow label="Estado" value={<SettingsStatusBadge status={data.status} />} />
        </div>
      </section>
      <section className="flex flex-wrap gap-2">
        <DrawerAction icon={<Download className="h-3.5 w-3.5" />} label="Descargar factura" onClick={() => onAction(`Factura ${data.id} descargada (mock)`)} primary />
        <DrawerAction icon={<Copy className="h-3.5 w-3.5" />} label="Copiar ID" onClick={() => onAction(`ID copiado: ${data.id}`)} />
      </section>
    </>
  );
}

function SessionDetail({ data, onAction }: { data: SecuritySession; onAction: (a: string) => void }) {
  return (
    <>
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Detalle de sesion</h3>
        <div className="space-y-3">
          <InfoRow label="Dispositivo" value={data.device} />
          <InfoRow label="Ubicacion" value={data.location} />
          <InfoRow label="Ultima actividad" value={timeFormatter.format(new Date(data.lastActive))} />
          <InfoRow label="Sesion actual" value={data.current ? "Si" : "No"} />
        </div>
      </section>
      <section className="flex flex-wrap gap-2">
        {!data.current ? <DrawerAction icon={<LogOut className="h-3.5 w-3.5" />} label="Cerrar sesion" onClick={() => onAction(`Sesion en ${data.device} cerrada (mock)`)} primary /> : null}
        <DrawerAction icon={<Eye className="h-3.5 w-3.5" />} label="Ver actividad" onClick={() => onAction(`Actividad de ${data.device} (mock)`)} />
      </section>
    </>
  );
}

function DrawerAction({ icon, label, onClick, primary = false }: { icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      className={primary
        ? "flex items-center gap-2 rounded-xl bg-[#111111] px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        : "flex items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-4 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
      }
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}
