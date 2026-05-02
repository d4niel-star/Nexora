"use client";

import { useState } from "react";
import {
  Clock, CheckCircle, AlertTriangle, XCircle, Mail, Package,
  CreditCard, Truck, ChevronDown, ChevronUp, RefreshCw, Timer, User, Bot,
} from "lucide-react";
import type { OrderTimelineEvent } from "@/lib/store-engine/orders/timeline";

interface Props {
  events: OrderTimelineEvent[];
}

const SEVERITY_STYLES: Record<string, { dot: string; icon: typeof CheckCircle; bg: string }> = {
  success: { dot: "bg-emerald-500", icon: CheckCircle, bg: "text-emerald-600" },
  warning: { dot: "bg-amber-500", icon: AlertTriangle, bg: "text-amber-600" },
  danger: { dot: "bg-red-500", icon: XCircle, bg: "text-red-500" },
  neutral: { dot: "bg-[var(--ink-5)]", icon: Clock, bg: "text-ink-5" },
};

const TYPE_ICONS: Record<string, typeof CreditCard> = {
  order_created: Package,
  order_cancelled: XCircle,
  order_refunded: RefreshCw,
  order_shipped: Truck,
  order_delivered: CheckCircle,
  payment_approved: CreditCard,
  payment_pending: Timer,
  payment_rejected: XCircle,
  payment_failed: XCircle,
  payment_refunded: RefreshCw,
  payment_in_process: Timer,
  email_order_created: Mail,
  email_payment_approved: Mail,
  email_payment_pending: Mail,
  email_payment_failed: Mail,
  email_order_shipped: Mail,
  email_pickup_ready: Mail,
};

function getActorLabel(actor: string): string {
  switch (actor) {
    case "customer": return "Cliente";
    case "merchant": return "Admin";
    case "payment_provider": return "Proveedor de pago";
    case "cron": return "Tarea automática";
    default: return "Sistema";
  }
}

function getActorIcon(actor: string) {
  switch (actor) {
    case "customer": return User;
    case "merchant": return User;
    case "cron": return Timer;
    default: return Bot;
  }
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrderTimeline({ events }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (events.length === 0) {
    return (
      <div className="flex items-center gap-3 px-4 py-6 text-ink-6 text-[13px]">
        <Clock className="w-4 h-4" />
        <span>No hay eventos registrados para esta orden.</span>
      </div>
    );
  }

  const visible = showAll ? events : events.slice(0, 8);

  return (
    <section className="space-y-0">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5 border-b border-[color:var(--hairline)] pb-2 mb-4 flex items-center gap-2">
        <Clock className="w-3.5 h-3.5" />
        Actividad de la orden
        <span className="ml-auto text-ink-6 normal-case tracking-normal font-normal">
          {events.length} evento{events.length !== 1 ? "s" : ""}
        </span>
      </h3>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[var(--hairline)]" />

        <div className="space-y-0">
          {visible.map((ev) => {
            const style = SEVERITY_STYLES[ev.severity] ?? SEVERITY_STYLES.neutral;
            const TypeIcon = TYPE_ICONS[ev.type] ?? style.icon;
            const ActorIcon = getActorIcon(ev.actor);
            const isExpanded = expandedId === ev.id;
            const hasMetadata = ev.metadata && Object.keys(ev.metadata).length > 0;

            return (
              <div key={ev.id} className="relative pl-8 pb-5 group">
                {/* Dot */}
                <div className={`absolute left-[7px] top-[6px] w-[9px] h-[9px] rounded-full ${style.dot} ring-2 ring-[var(--surface-0)] z-[1]`} />

                <div className="flex items-start gap-3">
                  <TypeIcon className={`w-4 h-4 mt-[1px] shrink-0 ${style.bg}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-medium text-ink-0 leading-tight">
                        {ev.title}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-ink-6 bg-[var(--surface-1)] px-1.5 py-0.5 rounded-[var(--r-xs)] shrink-0">
                        <ActorIcon className="w-2.5 h-2.5" />
                        {getActorLabel(ev.actor)}
                      </span>
                    </div>

                    {ev.description && (
                      <p className="text-[12px] text-ink-5 mt-0.5 leading-relaxed">
                        {ev.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-ink-6 font-mono">
                        {formatTimestamp(ev.occurredAt)}
                      </span>

                      {hasMetadata && (
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                          className="text-[10px] text-ink-6 hover:text-ink-3 flex items-center gap-0.5 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          detalles
                        </button>
                      )}
                    </div>

                    {isExpanded && ev.metadata && (
                      <div className="mt-2 p-3 bg-[var(--surface-1)] border border-[color:var(--hairline)] rounded-[var(--r-sm)] text-[11px] font-mono text-ink-5 overflow-x-auto">
                        <pre className="whitespace-pre-wrap break-all">
                          {JSON.stringify(ev.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {events.length > 8 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="w-full text-center text-[12px] text-ink-5 hover:text-ink-0 py-2 transition-colors flex items-center justify-center gap-1"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-3 h-3" /> Mostrar menos
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" /> Ver {events.length - 8} eventos más
            </>
          )}
        </button>
      )}
    </section>
  );
}
