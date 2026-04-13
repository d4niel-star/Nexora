"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import type { Coupon, Promotion, Automation, CaptureForm, AbandonedCart } from "@/types/marketing";
import { formatCurrency } from "@/lib/utils";
import {
  MarketingStatusBadge,
  CouponTypeBadge,
  PromoTypeBadge,
  AutomationTypeBadge,
  CaptureTypeBadge,
} from "@/components/admin/marketing/MarketingBadge";

type DrawerContent =
  | { kind: "coupon"; data: Coupon }
  | { kind: "promotion"; data: Promotion }
  | { kind: "automation"; data: Automation }
  | { kind: "capture"; data: CaptureForm }
  | { kind: "cart"; data: AbandonedCart };

interface MarketingDrawerProps {
  content: DrawerContent | null;
  isOpen: boolean;
  onClose: () => void;
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

export function MarketingDrawer({ content, isOpen, onClose }: MarketingDrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "unset";
      return;
    }

    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !content) {
    return null;
  }

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-[#111111]/28 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        aria-labelledby="marketing-drawer-title"
        aria-modal="true"
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-y-auto border-l border-[#EAEAEA] bg-white shadow-2xl outline-none animate-in slide-in-from-right-5 duration-300 sm:max-w-xl"
        role="dialog"
        tabIndex={-1}
      >
        <div className="sticky top-0 z-20 border-b border-[#EAEAEA] bg-white/90 px-6 py-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <h2
                id="marketing-drawer-title"
                className="truncate text-xl font-extrabold tracking-tight text-[#111111]"
              >
                {getDrawerTitle(content)}
              </h2>
              <div className="flex flex-wrap gap-2">
                {getDrawerBadges(content)}
              </div>
            </div>

            <button
              aria-label="Cerrar drawer"
              className="rounded-full p-2.5 text-gray-400 transition-all hover:bg-gray-100 hover:text-[#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-8 p-6 sm:p-8">
          {content.kind === "coupon" ? (
            <CouponDetail coupon={content.data} />
          ) : content.kind === "promotion" ? (
            <PromotionDetail promotion={content.data} />
          ) : content.kind === "automation" ? (
            <AutomationDetail automation={content.data} />
          ) : content.kind === "capture" ? (
            <CaptureDetail capture={content.data} />
          ) : (
            <CartDetail cart={content.data} />
          )}
        </div>
      </div>
    </>
  );
}

function getDrawerTitle(content: DrawerContent): string {
  switch (content.kind) {
    case "coupon":
      return content.data.name;
    case "promotion":
      return content.data.name;
    case "automation":
      return content.data.name;
    case "capture":
      return content.data.name;
    case "cart":
      return `Carrito de ${content.data.customerName}`;
  }
}

function getDrawerBadges(content: DrawerContent) {
  switch (content.kind) {
    case "coupon":
      return (
        <>
          <MarketingStatusBadge status={content.data.status} />
          <CouponTypeBadge type={content.data.type} />
        </>
      );
    case "promotion":
      return (
        <>
          <MarketingStatusBadge status={content.data.status} />
          <PromoTypeBadge type={content.data.type} />
        </>
      );
    case "automation":
      return (
        <>
          <MarketingStatusBadge status={content.data.status} />
          <AutomationTypeBadge type={content.data.type} />
        </>
      );
    case "capture":
      return (
        <>
          <MarketingStatusBadge status={content.data.status} />
          <CaptureTypeBadge type={content.data.type} />
        </>
      );
    case "cart":
      return content.data.recovered ? (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
          Recuperado
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700 ring-1 ring-inset ring-amber-600/15">
          Pendiente
        </span>
      );
  }
}

function MetricCard({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`p-5 ${muted ? "bg-[#FAFAFA]" : "bg-white"}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{label}</p>
      <p className="mt-2 text-xl font-black tracking-tight text-[#111111]">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{label}</p>
      <div className="text-sm font-medium text-[#111111]">{value}</div>
    </div>
  );
}

function CouponDetail({ coupon }: { coupon: Coupon }) {
  const discountDisplay =
    coupon.type === "percentage"
      ? `${coupon.discount}%`
      : coupon.type === "fixed_amount"
        ? formatCurrency(coupon.discount)
        : "Envio gratis";

  return (
    <>
      <section className="grid grid-cols-2 gap-0 overflow-hidden rounded-2xl border border-[#EAEAEA] shadow-sm">
        <MetricCard label="Descuento" value={discountDisplay} />
        <MetricCard label="Usos" value={`${coupon.usageCount}${coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}`} muted />
        <MetricCard label="Ingresos atribuidos" value={formatCurrency(coupon.revenueGenerated)} muted />
        <MetricCard label="Compra minima" value={coupon.minPurchase ? formatCurrency(coupon.minPurchase) : "Sin minimo"} />
      </section>

      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">
          Detalles
        </h3>
        <div className="space-y-3">
          <InfoRow label="Codigo" value={<code className="rounded-md bg-gray-100 px-2 py-1 font-mono text-sm font-bold text-[#111111]">{coupon.code}</code>} />
          <InfoRow label="Inicio" value={dateFormatter.format(new Date(coupon.startsAt))} />
          <InfoRow label="Expiracion" value={coupon.expiresAt ? dateFormatter.format(new Date(coupon.expiresAt)) : "Sin fecha de expiracion"} />
        </div>
      </section>
    </>
  );
}

function PromotionDetail({ promotion }: { promotion: Promotion }) {
  const convRate = promotion.impressions > 0 ? ((promotion.conversions / promotion.impressions) * 100).toFixed(1) : "0";

  return (
    <>
      <section className="grid grid-cols-2 gap-0 overflow-hidden rounded-2xl border border-[#EAEAEA] shadow-sm">
        <MetricCard label="Impresiones" value={promotion.impressions.toLocaleString("es-AR")} />
        <MetricCard label="Conversiones" value={promotion.conversions.toLocaleString("es-AR")} muted />
        <MetricCard label="Tasa" value={`${convRate}%`} muted />
        <MetricCard label="Ingresos" value={formatCurrency(promotion.revenueGenerated)} />
      </section>

      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">
          Configuracion
        </h3>
        <div className="space-y-3">
          <InfoRow label="Descuento" value={promotion.discount} />
          <InfoRow label="Targeting" value={promotion.targeting} />
          <InfoRow label="Inicio" value={dateFormatter.format(new Date(promotion.startsAt))} />
          <InfoRow label="Expiracion" value={promotion.expiresAt ? dateFormatter.format(new Date(promotion.expiresAt)) : "Sin limite"} />
        </div>
      </section>
    </>
  );
}

function AutomationDetail({ automation }: { automation: Automation }) {
  return (
    <>
      <section className="grid grid-cols-2 gap-0 overflow-hidden rounded-2xl border border-[#EAEAEA] shadow-sm">
        <MetricCard label="Ejecuciones" value={automation.executionsCount.toLocaleString("es-AR")} />
        <MetricCard label="Conversion" value={`${automation.conversionRate}%`} muted />
        <MetricCard label="Ultima ejecucion" value={automation.lastExecutedAt ? dateTimeFormatter.format(new Date(automation.lastExecutedAt)) : "Nunca"} muted />
        <MetricCard label="Creada" value={dateFormatter.format(new Date(automation.createdAt))} />
      </section>

      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">
          Configuracion
        </h3>
        <div className="space-y-3">
          <InfoRow label="Trigger" value={automation.trigger} />
          <InfoRow label="Estado" value={<MarketingStatusBadge status={automation.status} />} />
        </div>
      </section>
    </>
  );
}

function CaptureDetail({ capture }: { capture: CaptureForm }) {
  return (
    <>
      <section className="grid grid-cols-2 gap-0 overflow-hidden rounded-2xl border border-[#EAEAEA] shadow-sm">
        <MetricCard label="Leads" value={capture.leadsCollected.toLocaleString("es-AR")} />
        <MetricCard label="Conversion" value={`${capture.conversionRate}%`} muted />
        <MetricCard label="Ubicacion" value={capture.placement} muted />
        <MetricCard label="Creado" value={dateFormatter.format(new Date(capture.createdAt))} />
      </section>
    </>
  );
}

function CartDetail({ cart }: { cart: AbandonedCart }) {
  return (
    <>
      <section className="grid grid-cols-2 gap-0 overflow-hidden rounded-2xl border border-[#EAEAEA] shadow-sm">
        <MetricCard label="Total carrito" value={formatCurrency(cart.cartTotal)} />
        <MetricCard label="Items" value={`${cart.itemsCount} productos`} muted />
        <MetricCard label="Recordatorios" value={`${cart.remindersSent} enviados`} muted />
        <MetricCard label="Estado" value={cart.recovered ? "Recuperado" : "Pendiente"} />
      </section>

      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">
          Cliente
        </h3>
        <div className="space-y-3">
          <InfoRow label="Nombre" value={cart.customerName} />
          <InfoRow label="Email" value={cart.customerEmail} />
          <InfoRow label="Abandonado" value={dateTimeFormatter.format(new Date(cart.abandonedAt))} />
          <InfoRow label="Ultimo recordatorio" value={cart.lastReminderAt ? dateTimeFormatter.format(new Date(cart.lastReminderAt)) : "No se envio aun"} />
        </div>
      </section>
    </>
  );
}
