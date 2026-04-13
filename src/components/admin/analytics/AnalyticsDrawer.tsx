"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import type { TopProduct, CustomerSegmentMetric, MarketingMetric, AnalyticsAlert } from "@/types/analytics";
import { formatCurrency } from "@/lib/utils";
import { PerformanceBadge, TrendBadge, SeverityBadge, CategoryBadge } from "@/components/admin/analytics/AnalyticsBadge";

type DrawerContent =
  | { kind: "product"; data: TopProduct }
  | { kind: "segment"; data: CustomerSegmentMetric }
  | { kind: "campaign"; data: MarketingMetric }
  | { kind: "alert"; data: AnalyticsAlert };

interface AnalyticsDrawerProps {
  content: DrawerContent | null;
  isOpen: boolean;
  onClose: () => void;
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

export function AnalyticsDrawer({ content, isOpen, onClose }: AnalyticsDrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "unset";
      return;
    }

    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !content) return null;

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-[#111111]/28 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        aria-labelledby="analytics-drawer-title"
        aria-modal="true"
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-y-auto border-l border-[#EAEAEA] bg-white shadow-2xl outline-none animate-in slide-in-from-right-5 duration-300 sm:max-w-xl"
        role="dialog"
        tabIndex={-1}
      >
        <div className="sticky top-0 z-20 border-b border-[#EAEAEA] bg-white/90 px-6 py-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <h2
                id="analytics-drawer-title"
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
          {content.kind === "product" ? (
            <ProductDetail product={content.data} />
          ) : content.kind === "segment" ? (
            <SegmentDetail segment={content.data} />
          ) : content.kind === "campaign" ? (
            <CampaignDetail campaign={content.data} />
          ) : (
            <AlertDetail alert={content.data} />
          )}
        </div>
      </div>
    </>
  );
}

function getDrawerTitle(content: DrawerContent): string {
  switch (content.kind) {
    case "product": return content.data.name;
    case "segment": return `Segmento: ${content.data.segment}`;
    case "campaign": return content.data.name;
    case "alert": return content.data.title;
  }
}

function getDrawerBadges(content: DrawerContent) {
  switch (content.kind) {
    case "product":
      return (
        <>
          <PerformanceBadge level={content.data.performance} />
          <CategoryBadge category={content.data.category} />
        </>
      );
    case "segment":
      return <TrendBadge trend={content.data.trend} />;
    case "campaign":
      return <PerformanceBadge level={content.data.performance} />;
    case "alert":
      return (
        <>
          <SeverityBadge severity={content.data.severity} />
          <CategoryBadge category={content.data.category} />
        </>
      );
  }
}

function ProductDetail({ product }: { product: TopProduct }) {
  return (
    <>
      <section className="grid grid-cols-2 gap-0 overflow-hidden rounded-2xl border border-[#EAEAEA] shadow-sm">
        <MetricCard label="Unidades vendidas" value={product.unitsSold.toLocaleString("es-AR")} />
        <MetricCard label="Ingresos" value={formatCurrency(product.revenue)} muted />
        <MetricCard label="Vistas" value={product.views.toLocaleString("es-AR")} muted />
        <MetricCard label="Conversion" value={`${product.conversionRate}%`} />
      </section>

      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">
          Detalles
        </h3>
        <div className="space-y-3">
          <InfoRow label="Categoria" value={product.category} />
          <InfoRow label="Stock actual" value={product.stock === 0 ? <span className="font-bold text-red-600">Agotado</span> : product.stock.toString()} />
          <InfoRow label="Rendimiento" value={<PerformanceBadge level={product.performance} />} />
        </div>
      </section>
    </>
  );
}

function SegmentDetail({ segment }: { segment: CustomerSegmentMetric }) {
  return (
    <>
      <section className="grid grid-cols-2 gap-0 overflow-hidden rounded-2xl border border-[#EAEAEA] shadow-sm">
        <MetricCard label="Clientes" value={segment.count.toLocaleString("es-AR")} />
        <MetricCard label="Ingresos" value={formatCurrency(segment.revenue)} muted />
        <MetricCard label="Ticket promedio" value={segment.avgTicket > 0 ? formatCurrency(segment.avgTicket) : "—"} muted />
        <MetricCard label="Frecuencia" value={segment.frequency > 0 ? `${segment.frequency}x` : "—"} />
      </section>

      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">
          Tendencia
        </h3>
        <div className="space-y-3">
          <InfoRow label="Segmento" value={segment.segment} />
          <InfoRow label="Tendencia" value={<TrendBadge trend={segment.trend} />} />
        </div>
      </section>
    </>
  );
}

function CampaignDetail({ campaign }: { campaign: MarketingMetric }) {
  return (
    <>
      <section className="grid grid-cols-2 gap-0 overflow-hidden rounded-2xl border border-[#EAEAEA] shadow-sm">
        <MetricCard label="Conversiones" value={campaign.conversions.toLocaleString("es-AR")} />
        <MetricCard label="Ingresos" value={formatCurrency(campaign.revenue)} muted />
        <MetricCard label="ROI" value={campaign.roi > 0 ? `${campaign.roi}%` : "—"} muted />
        <MetricCard label="Tipo" value={campaign.type} />
      </section>
    </>
  );
}

function AlertDetail({ alert }: { alert: AnalyticsAlert }) {
  return (
    <>
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">
          Detalle de la alerta
        </h3>
        <div className="space-y-3">
          <InfoRow label="Descripcion" value={alert.description} />
          <InfoRow label="Categoria" value={<CategoryBadge category={alert.category} />} />
          <InfoRow label="Severidad" value={<SeverityBadge severity={alert.severity} />} />
        </div>
      </section>
    </>
  );
}
