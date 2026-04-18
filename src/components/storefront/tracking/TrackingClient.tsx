"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  CreditCard,
  MapPin,
  ChevronRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { storePath } from "@/lib/store-engine/urls";
import { cn } from "@/lib/utils";

// ─── Tracking Client ───
// All state, logic, URL params and data contracts are preserved. Rewritten
// visually to match the monochrome token system:
//  · Search header uses hairline card + token inputs
//  · Status timeline drops the colored stepper for a clean progress bar
//    built from two hairlines (traveled / remaining) and circular dots
//  · Carrier tracking code becomes a hairline chip in ink tones
//  · Live tracking events use a single-column timeline with ink dots

interface TrackedOrderItem {
  id: string;
  title: string;
  variantTitle: string;
  quantity: number;
  price: number;
  lineTotal: number;
  image: string | null;
}

interface TrackedOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  email: string;
  firstName: string;
  lastName: string;
  addressLine1: string;
  city: string;
  province: string;
  postalCode: string;
  subtotal: number;
  shippingAmount: number;
  total: number;
  currency: string;
  shippingMethodLabel?: string | null;
  shippingCarrier?: string | null;
  shippingEstimate?: string | null;
  shippingStatus?: string | null;
  trackingCode?: string | null;
  trackingUrl?: string | null;
  items: TrackedOrderItem[];
  liveTracking?: any;
}

interface TrackingClientProps {
  storeSlug: string;
  locale: string;
  currency: string;
  initialOrder: TrackedOrder | null;
  initialOrderNumber: string;
  initialEmail: string;
}

const STATUS_STEPS = [
  { key: "new", label: "Recibida", icon: Package },
  { key: "paid", label: "Pago", icon: CreditCard },
  { key: "processing", label: "Preparando", icon: Clock },
  { key: "shipped", label: "En camino", icon: Truck },
  { key: "delivered", label: "Entregado", icon: CheckCircle2 },
];

function getCompositeStatusIndex(order: TrackedOrder | null): number {
  if (!order) return -1;
  const { status, paymentStatus, shippingStatus } = order;
  if (
    status === "cancelled" ||
    status === "refunded" ||
    paymentStatus === "cancelled" ||
    paymentStatus === "refunded"
  )
    return -1;
  if (shippingStatus === "delivered") return 4;
  if (shippingStatus === "shipped") return 3;
  if (shippingStatus === "preparing") return 2;
  if (paymentStatus === "paid") return 1;
  return 0;
}

const inputClass =
  "flex h-11 w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3.5 text-[15px] text-ink-0 placeholder:text-ink-6 " +
  "transition-[box-shadow,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)] " +
  "focus:border-[var(--accent-500)] focus:outline-none focus:shadow-[var(--shadow-focus)]";

export function TrackingClient({
  storeSlug,
  locale,
  currency,
  initialOrder,
  initialOrderNumber,
  initialEmail,
}: TrackingClientProps) {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [email, setEmail] = useState(initialEmail);
  const [isSearching, setIsSearching] = useState(false);
  const order = initialOrder;

  const priceFormatted = (price: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    }).format(price);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !email.trim()) return;
    setIsSearching(true);
    const params = new URLSearchParams({
      order: orderNumber.trim(),
      email: email.trim().toLowerCase(),
    });
    router.push(`${storePath(storeSlug, "tracking")}?${params.toString()}`);
    setTimeout(() => setIsSearching(false), 1500);
  };

  const showNotFound = !!(initialOrderNumber && initialEmail && !initialOrder);
  const statusIndex = getCompositeStatusIndex(order);
  const isCancelled =
    order?.status === "cancelled" ||
    order?.status === "refunded" ||
    order?.shippingStatus === "cancelled" ||
    order?.paymentStatus === "cancelled";

  return (
    <div className="bg-[var(--surface-1)] min-h-[80vh]">
      {/* ─── Search block ─── */}
      <div className="border-b border-[color:var(--hairline)] bg-[var(--surface-0)]">
        <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 lg:px-8 sm:py-16">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-4">
              <Package className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-5">
              Seguimiento
            </p>
            <h1 className="mt-2 font-semibold text-[28px] leading-[1.08] tracking-[-0.035em] text-ink-0 sm:text-[34px]">
              Seguimiento de pedido.
            </h1>
            <p className="mx-auto mt-3 max-w-md text-[14px] leading-[1.55] text-ink-5">
              Ingresá tu número de orden y email para ver el estado de tu compra.
            </p>
          </div>

          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-2.5 sm:flex-row"
          >
            <input
              type="text"
              placeholder="Número de orden"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className={inputClass}
              required
            />
            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              required
            />
            <button
              type="submit"
              disabled={isSearching}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[var(--r-sm)] bg-ink-0 px-5 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:opacity-50 sm:w-auto"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" strokeWidth={1.75} />
              )}
              Buscar
            </button>
          </form>

          {showNotFound && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-1)] px-4 py-3"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--signal-danger)]"
                strokeWidth={1.75}
              />
              <div>
                <p className="text-[13px] font-medium text-ink-0">
                  No encontramos esa orden.
                </p>
                <p className="mt-1 text-[12px] leading-[1.55] text-ink-5">
                  Verificá que el número de orden y el email sean los correctos
                  e intentá nuevamente.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Order result ─── */}
      {order && (
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-12 sm:px-6 lg:px-8">
          {/* Header card */}
          <div className="overflow-hidden rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
            <div className="flex items-center justify-between border-b border-[color:var(--hairline)] px-5 py-4">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
                  Orden
                </p>
                <p className="mt-1 font-mono text-[16px] font-medium tracking-wider text-ink-0">
                  {order.orderNumber}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
                  Fecha
                </p>
                <p className="mt-1 tabular text-[13px] text-ink-3">
                  {new Date(order.createdAt).toLocaleDateString(locale, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            {/* Timeline */}
            {isCancelled ? (
              <div className="p-5">
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-1)] px-4 py-3"
                >
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--signal-danger)]"
                    strokeWidth={1.75}
                  />
                  <div>
                    <p className="text-[13px] font-medium text-ink-0">
                      {order.status === "cancelled"
                        ? "Orden cancelada."
                        : "Orden reembolsada."}
                    </p>
                    <p className="mt-0.5 text-[12px] text-ink-5">
                      Si tenés alguna consulta, contactanos por email.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-5 py-8">
                <div className="flex items-start justify-between">
                  {STATUS_STEPS.map((step, i) => {
                    const isActive = i <= statusIndex;
                    const isCurrent = i === statusIndex;
                    const StepIcon = step.icon;
                    return (
                      <div
                        key={step.key}
                        className="flex flex-1 items-start last:flex-initial"
                      >
                        <div className="relative z-10 flex flex-col items-center gap-2">
                          <div
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
                              isCurrent
                                ? "border-ink-0 bg-ink-0 text-ink-12"
                                : isActive
                                  ? "border-ink-0 bg-ink-0 text-ink-12"
                                  : "border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-ink-6",
                            )}
                          >
                            <StepIcon
                              className="h-4 w-4"
                              strokeWidth={1.75}
                            />
                          </div>
                          <span
                            className={cn(
                              "max-w-[72px] text-center text-[10px] font-medium uppercase tracking-[0.12em] leading-tight",
                              isActive ? "text-ink-0" : "text-ink-5",
                            )}
                          >
                            {step.label}
                          </span>
                        </div>
                        {i < STATUS_STEPS.length - 1 && (
                          <div
                            className={cn(
                              "mx-1 mt-[18px] h-px flex-1 transition-colors",
                              i < statusIndex
                                ? "bg-ink-0"
                                : "bg-[color:var(--hairline-strong)]",
                            )}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Shipping address */}
          <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
            <h3 className="mb-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
              <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
              Envío
            </h3>
            <div className="flex flex-col gap-5 sm:flex-row sm:justify-between">
              <div>
                <p className="text-[14px] font-medium text-ink-0">
                  {order.firstName} {order.lastName}
                </p>
                <p className="mt-1 text-[13px] text-ink-5">{order.addressLine1}</p>
                <p className="text-[13px] text-ink-5">
                  {order.city}, {order.province} {order.postalCode}
                </p>
              </div>
              <div className="border-t border-[color:var(--hairline)] pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 sm:text-right">
                <p className="text-[14px] font-medium text-ink-0">
                  {order.shippingMethodLabel || "Método de envío"}
                </p>
                {order.shippingCarrier && (
                  <p className="mt-1 text-[12px] text-ink-5">
                    Carrier · {order.shippingCarrier}
                  </p>
                )}
                {order.trackingCode && (
                  <div className="mt-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
                      Tracking
                    </p>
                    {order.trackingUrl ? (
                      <a
                        href={order.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1.5 rounded-[var(--r-xs)] border border-[color:var(--hairline-strong)] bg-[var(--surface-1)] px-2.5 py-1 font-mono text-[12px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)]"
                      >
                        {order.trackingCode}
                        <ChevronRight className="h-3 w-3" strokeWidth={1.75} />
                      </a>
                    ) : (
                      <span className="mt-1.5 inline-block rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2.5 py-1 font-mono text-[12px] text-ink-0">
                        {order.trackingCode}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Live tracking events */}
            {order.liveTracking &&
              order.liveTracking.events &&
              order.liveTracking.events.length > 0 && (
                <div className="mt-6 border-t border-[color:var(--hairline)] pt-6">
                  <h4 className="mb-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
                    <Truck className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Eventos del transporte
                  </h4>
                  <div className="space-y-4">
                    {order.liveTracking.events.map((ev: any, idx: number) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex w-1.5 flex-col items-center">
                          <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-ink-0" />
                          {idx < order.liveTracking!.events.length - 1 && (
                            <div className="my-1 h-full w-px bg-[color:var(--hairline-strong)]" />
                          )}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-ink-0">
                            {ev.description}
                          </p>
                          <p className="mt-0.5 text-[12px] text-ink-5">
                            {new Date(ev.timestamp).toLocaleString(locale, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                            {ev.location && ` · ${ev.location}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* Order items */}
          <div className="overflow-hidden rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
            <div className="border-b border-[color:var(--hairline)] px-5 py-4">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
                Productos
              </h3>
            </div>
            <ul role="list" className="divide-y divide-[color:var(--hairline)]">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-2)]">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package
                        className="h-5 w-5 text-ink-6"
                        strokeWidth={1.5}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-ink-0">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[12px] text-ink-5">
                      {item.variantTitle} · Cant. {item.quantity}
                    </p>
                  </div>
                  <p className="tabular text-[14px] font-medium text-ink-0">
                    {priceFormatted(item.lineTotal)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="space-y-2 border-t border-[color:var(--hairline)] bg-[var(--surface-1)] px-5 py-4 text-[13px]">
              <div className="flex justify-between text-ink-5">
                <span>Subtotal</span>
                <span className="tabular">{priceFormatted(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-ink-5">
                <span>Envío</span>
                <span className="tabular">
                  {order.shippingAmount > 0
                    ? priceFormatted(order.shippingAmount)
                    : "Gratis"}
                </span>
              </div>
              <div className="flex justify-between border-t border-[color:var(--hairline)] pt-2 text-[15px] font-medium text-ink-0">
                <span>Total</span>
                <span className="tabular">{priceFormatted(order.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
