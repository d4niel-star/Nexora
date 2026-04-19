"use client";

import { useEffect, useRef } from "react";
import { Copy, Download, RefreshCw, X } from "lucide-react";

import type { FinanceMovement, PendingPayment, Refund, CommissionEntry, MarginEntry, ExportRecord } from "@/types/finances";
import { FinanceStatusBadge, MarginHealthBadge, ChannelBadge, ExportTypeBadge } from "@/components/admin/finances/FinanceBadge";
import { formatCurrency } from "@/lib/utils";

type DrawerContent =
  | { kind: "movement"; data: FinanceMovement }
  | { kind: "pending"; data: PendingPayment }
  | { kind: "refund"; data: Refund }
  | { kind: "commission"; data: CommissionEntry }
  | { kind: "margin"; data: MarginEntry }
  | { kind: "export"; data: ExportRecord };

interface FinanceDrawerProps {
  content: DrawerContent | null;
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
}

function MetricCard({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`p-5 ${muted ? "bg-[var(--surface-1)]" : "bg-[var(--surface-0)]"}`}>
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">{label}</p>
      <p className="mt-2 text-[18px] font-semibold tracking-[-0.02em] text-ink-0 tabular-nums">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">{label}</p>
      <div className="text-[13px] text-ink-0 leading-[1.55]">{value}</div>
    </div>
  );
}

const timeFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function FinanceDrawer({ content, isOpen, onClose, onAction }: FinanceDrawerProps) {
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
      <div aria-hidden="true" className="fixed inset-0 z-40 bg-ink-0/40 transition-opacity" onClick={onClose} />
      <div
        ref={panelRef}
        aria-labelledby="finance-drawer-title"
        aria-modal="true"
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-y-auto border-l border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-overlay)] outline-none animate-in slide-in-from-right-5 duration-[var(--dur-slow)] sm:max-w-xl"
        role="dialog"
        tabIndex={-1}
      >
        <div className="sticky top-0 z-20 border-b border-[color:var(--hairline)] bg-[var(--surface-0)]/95 px-6 py-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <h2 id="finance-drawer-title" className="truncate text-[18px] font-semibold tracking-[-0.02em] text-ink-0">
                {getTitle(content)}
              </h2>
              <div className="flex flex-wrap gap-1.5">{getBadges(content)}</div>
            </div>
            <button aria-label="Cerrar drawer" className="shrink-0 rounded-[var(--r-sm)] p-2 text-ink-5 transition-colors hover:bg-[var(--surface-2)] hover:text-ink-0 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]" onClick={onClose} type="button">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-8 p-6 sm:p-8">
          {content.kind === "movement" ? <MovementDetail data={content.data} onAction={onAction} /> : null}
          {content.kind === "pending" ? <PendingDetail data={content.data} onAction={onAction} /> : null}
          {content.kind === "refund" ? <RefundDetail data={content.data} onAction={onAction} /> : null}
          {content.kind === "commission" ? <CommissionDetail data={content.data} onAction={onAction} /> : null}
          {content.kind === "margin" ? <MarginDetail data={content.data} onAction={onAction} /> : null}
          {content.kind === "export" ? <ExportDetail data={content.data} onAction={onAction} /> : null}
        </div>
      </div>
    </>
  );
}

function getTitle(c: DrawerContent): string {
  switch (c.kind) {
    case "movement": return c.data.reference;
    case "pending": return c.data.reference;
    case "refund": return c.data.reference;
    case "commission": return c.data.source;
    case "margin": return c.data.name;
    case "export": return `Exportacion ${c.data.type}`;
  }
}

function getBadges(c: DrawerContent) {
  switch (c.kind) {
    case "movement": return <><FinanceStatusBadge status={c.data.status} /><ChannelBadge channel={c.data.channel} /></>;
    case "pending": return <><FinanceStatusBadge status={c.data.status} /><ChannelBadge channel={c.data.channel} /></>;
    case "refund": return <FinanceStatusBadge status={c.data.status} />;
    case "commission": return <ExportTypeBadge type={c.data.type} />;
    case "margin": return <MarginHealthBadge health={c.data.health} />;
    case "export": return <><FinanceStatusBadge status={c.data.status} /><ExportTypeBadge type={c.data.type} /></>;
  }
}

function MovementDetail({ data, onAction }: { data: FinanceMovement; onAction: (a: string) => void }) {
  return (
    <>
      <section className="grid grid-cols-2 gap-0 overflow-hidden rounded-[var(--r-md)] border border-[color:var(--hairline)] divide-x divide-y divide-[color:var(--hairline)]">
        <MetricCard label="Bruto" value={formatCurrency(data.gross)} />
        <MetricCard label="Comision" value={formatCurrency(data.commission)} muted />
        <MetricCard label="Envio" value={formatCurrency(data.shipping)} muted />
        <MetricCard label="Neto" value={formatCurrency(data.net)} />
      </section>
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[color:var(--hairline)] pb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">Detalles</h3>
        <div className="space-y-3">
          <InfoRow label="Cliente" value={data.customer} />
          <InfoRow label="Canal" value={<ChannelBadge channel={data.channel} />} />
          <InfoRow label="Fecha" value={timeFormatter.format(new Date(data.date))} />
          <InfoRow label="Estado" value={<FinanceStatusBadge status={data.status} />} />
        </div>
      </section>
      <section className="flex flex-wrap gap-2">
        <DrawerAction icon={<Copy className="h-3.5 w-3.5" />} label="Copiar referencia" onClick={() => onAction(`Referencia copiada: ${data.reference}`)} />
      </section>
    </>
  );
}

function PendingDetail({ data, onAction }: { data: PendingPayment; onAction: (a: string) => void }) {
  return (
    <>
      <section className="grid grid-cols-2 gap-0 overflow-hidden rounded-[var(--r-md)] border border-[color:var(--hairline)] divide-x divide-y divide-[color:var(--hairline)]">
        <MetricCard label="Monto" value={formatCurrency(data.amount)} />
        <MetricCard label="Vencimiento" value={timeFormatter.format(new Date(data.dueDate))} muted />
      </section>
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[color:var(--hairline)] pb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">Detalles</h3>
        <div className="space-y-3">
          <InfoRow label="Cliente" value={data.customer} />
          <InfoRow label="Causa" value={data.cause} />
          <InfoRow label="Canal" value={<ChannelBadge channel={data.channel} />} />
          <InfoRow label="Fecha" value={timeFormatter.format(new Date(data.date))} />
          <InfoRow label="Estado" value={<FinanceStatusBadge status={data.status} />} />
        </div>
      </section>
      <section className="flex flex-wrap gap-2">
        <DrawerAction icon={<Copy className="h-3.5 w-3.5" />} label="Copiar referencia" onClick={() => onAction(`Referencia copiada: ${data.reference}`)} />
      </section>
    </>
  );
}

function RefundDetail({ data, onAction }: { data: Refund; onAction: (a: string) => void }) {
  return (
    <>
      <section className="grid grid-cols-2 gap-0 overflow-hidden rounded-[var(--r-md)] border border-[color:var(--hairline)] divide-x divide-y divide-[color:var(--hairline)]">
        <MetricCard label="Monto" value={formatCurrency(data.amount)} />
        <MetricCard label="Metodo" value={data.method} muted />
      </section>
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[color:var(--hairline)] pb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">Detalles</h3>
        <div className="space-y-3">
          <InfoRow label="Cliente" value={data.customer} />
          <InfoRow label="Motivo" value={data.reason} />
          <InfoRow label="Fecha" value={timeFormatter.format(new Date(data.date))} />
          <InfoRow label="Estado" value={<FinanceStatusBadge status={data.status} />} />
        </div>
      </section>
      <section className="flex flex-wrap gap-2">
        <DrawerAction icon={<Copy className="h-3.5 w-3.5" />} label="Copiar referencia" onClick={() => onAction(`Referencia copiada: ${data.reference}`)} />
      </section>
    </>
  );
}

function CommissionDetail({ data, onAction }: { data: CommissionEntry; onAction: (a: string) => void }) {
  return (
    <>
      <section className="grid grid-cols-2 gap-0 overflow-hidden rounded-[var(--r-md)] border border-[color:var(--hairline)] divide-x divide-y divide-[color:var(--hairline)]">
        <MetricCard label="Total comision" value={formatCurrency(data.amount)} />
        <MetricCard label="Tasa" value={`${data.percentage}%`} muted />
        <MetricCard label="Transacciones" value={data.transactions.toString()} muted />
        <MetricCard label="Periodo" value={data.period} />
      </section>
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[color:var(--hairline)] pb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">Detalles</h3>
        <div className="space-y-3">
          <InfoRow label="Fuente" value={data.source} />
          <InfoRow label="Tipo" value={<ExportTypeBadge type={data.type} />} />
        </div>
      </section>
      <section className="flex flex-wrap gap-2">
        <DrawerAction icon={<Copy className="h-3.5 w-3.5" />} label="Copiar detalle" onClick={() => onAction(`Comision ${data.source} copiada`)} />
      </section>
    </>
  );
}

function MarginDetail({ data, onAction }: { data: MarginEntry; onAction: (a: string) => void }) {
  return (
    <>
      <section className="grid grid-cols-2 gap-0 overflow-hidden rounded-[var(--r-md)] border border-[color:var(--hairline)] divide-x divide-y divide-[color:var(--hairline)]">
        <MetricCard label="Ingresos" value={formatCurrency(data.revenue)} />
        <MetricCard label="Costo" value={formatCurrency(data.cost)} muted />
        <MetricCard label="Margen" value={formatCurrency(data.margin)} muted />
        <MetricCard label="Margen %" value={`${data.marginPercent}%`} />
      </section>
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[color:var(--hairline)] pb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">Impactos</h3>
        <div className="space-y-3">
          <InfoRow label="Categoria" value={data.category} />
          <InfoRow label="Impacto descuentos" value={formatCurrency(data.discountImpact)} />
          <InfoRow label="Impacto envio" value={formatCurrency(data.shippingImpact)} />
          <InfoRow label="Salud" value={<MarginHealthBadge health={data.health} />} />
        </div>
      </section>
      <section className="flex flex-wrap gap-2">
        <DrawerAction icon={<Copy className="h-3.5 w-3.5" />} label="Copiar detalle" onClick={() => onAction(`Margen ${data.name} copiado`)} />
      </section>
    </>
  );
}

function ExportDetail({ data, onAction }: { data: ExportRecord; onAction: (a: string) => void }) {
  return (
    <>
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[color:var(--hairline)] pb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">Detalle de exportacion</h3>
        <div className="space-y-3">
          <InfoRow label="Tipo" value={<ExportTypeBadge type={data.type} />} />
          <InfoRow label="Rango" value={data.range} />
          <InfoRow label="Fecha" value={timeFormatter.format(new Date(data.date))} />
          <InfoRow label="Tamaño" value={data.fileSize} />
          <InfoRow label="Estado" value={<FinanceStatusBadge status={data.status} />} />
        </div>
      </section>
      <section className="flex flex-wrap gap-2">
        <DrawerAction icon={<Copy className="h-3.5 w-3.5" />} label="Copiar ID" onClick={() => onAction(`ID copiado: ${data.id}`)} />
      </section>
    </>
  );
}

function DrawerAction({ icon, label, onClick, primary = false }: { icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      className={primary
        ? "inline-flex items-center gap-2 rounded-[var(--r-sm)] bg-ink-0 h-9 px-4 text-[12px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
        : "inline-flex items-center gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] h-9 px-3.5 text-[12px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
      }
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}
