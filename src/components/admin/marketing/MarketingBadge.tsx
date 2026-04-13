import type { MarketingStatus, CouponType, PromoType, AutomationType, CaptureType } from "@/types/marketing";
import { cn } from "@/lib/utils";

const statusLabels: Record<MarketingStatus, string> = {
  active: "Activo",
  paused: "Pausado",
  archived: "Archivado",
  scheduled: "Programado",
  draft: "Borrador",
  expired: "Expirado",
};

const statusStyles: Record<MarketingStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  paused: "bg-amber-50 text-amber-700 ring-amber-600/15",
  archived: "bg-gray-100 text-gray-500 ring-gray-500/10",
  scheduled: "bg-blue-50 text-blue-700 ring-blue-600/15",
  draft: "bg-gray-100 text-gray-600 ring-gray-500/10",
  expired: "bg-red-50 text-red-600 ring-red-600/10",
};

const couponTypeLabels: Record<CouponType, string> = {
  percentage: "Porcentaje",
  fixed_amount: "Monto fijo",
  free_shipping: "Envio gratis",
};

const couponTypeStyles: Record<CouponType, string> = {
  percentage: "bg-purple-50 text-purple-700 border-purple-100",
  fixed_amount: "bg-blue-50 text-blue-700 border-blue-100",
  free_shipping: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

const promoTypeLabels: Record<PromoType, string> = {
  auto_discount: "Descuento auto",
  bundle: "Bundle",
  free_shipping: "Envio gratis",
  upsell: "Upsell",
  cross_sell: "Cross-sell",
  banner: "Banner",
};

const promoTypeStyles: Record<PromoType, string> = {
  auto_discount: "bg-purple-50 text-purple-700 border-purple-100",
  bundle: "bg-amber-50 text-amber-700 border-amber-100",
  free_shipping: "bg-emerald-50 text-emerald-700 border-emerald-100",
  upsell: "bg-blue-50 text-blue-700 border-blue-100",
  cross_sell: "bg-indigo-50 text-indigo-700 border-indigo-100",
  banner: "bg-pink-50 text-pink-700 border-pink-100",
};

const automationTypeLabels: Record<AutomationType, string> = {
  cart_reminder: "Carrito",
  post_purchase_coupon: "Post-compra",
  bundle_suggestion: "Bundle",
  vip_message: "VIP",
  exit_intent_popup: "Exit intent",
};

const captureTypeLabels: Record<CaptureType, string> = {
  email_form: "Email",
  whatsapp: "WhatsApp",
  popup: "Popup",
  banner_subscription: "Banner",
};

export function MarketingStatusBadge({
  status,
  className,
}: {
  status: MarketingStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ring-1 ring-inset",
        statusStyles[status],
        className
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

export function CouponTypeBadge({
  type,
  className,
}: {
  type: CouponType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
        couponTypeStyles[type],
        className
      )}
    >
      {couponTypeLabels[type]}
    </span>
  );
}

export function PromoTypeBadge({
  type,
  className,
}: {
  type: PromoType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
        promoTypeStyles[type],
        className
      )}
    >
      {promoTypeLabels[type]}
    </span>
  );
}

export function AutomationTypeBadge({
  type,
  className,
}: {
  type: AutomationType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-600",
        className
      )}
    >
      {automationTypeLabels[type]}
    </span>
  );
}

export function CaptureTypeBadge({
  type,
  className,
}: {
  type: CaptureType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-600",
        className
      )}
    >
      {captureTypeLabels[type]}
    </span>
  );
}

export function PerformanceBadge({
  conversions,
  impressions,
}: {
  conversions: number;
  impressions: number;
}) {
  if (impressions === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500 ring-1 ring-inset ring-gray-500/10">
        Sin datos
      </span>
    );
  }

  const rate = (conversions / impressions) * 100;

  if (rate >= 8) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
        Alto
      </span>
    );
  }

  if (rate >= 3) {
    return null;
  }

  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700 ring-1 ring-inset ring-amber-600/15">
      Bajo
    </span>
  );
}
