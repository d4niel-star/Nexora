"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Package, Truck, CheckCircle2, Clock, CreditCard, MapPin, ChevronRight, AlertCircle } from "lucide-react";
import { storePath } from "@/lib/store-engine/urls";

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
  { key: "new", label: "Orden recibida", icon: Package },
  { key: "paid", label: "Pago confirmado", icon: CreditCard },
  { key: "processing", label: "Preparando envío", icon: Clock },
  { key: "shipped", label: "En camino", icon: Truck },
  { key: "delivered", label: "Entregado", icon: CheckCircle2 },
];

function getCompositeStatusIndex(order: TrackedOrder | null): number {
  if (!order) return -1;
  const { status, paymentStatus, shippingStatus } = order;
  
  if (status === "cancelled" || status === "refunded" || paymentStatus === "cancelled" || paymentStatus === "refunded") return -1;
  
  if (shippingStatus === "delivered") return 4;
  if (shippingStatus === "shipped") return 3;
  if (shippingStatus === "preparing") return 2;
  if (paymentStatus === "paid") return 1;
  return 0; // new / order received
}

export function TrackingClient({ storeSlug, locale, currency, initialOrder, initialOrderNumber, initialEmail }: TrackingClientProps) {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [email, setEmail] = useState(initialEmail);
  const [isSearching, setIsSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const order = initialOrder;

  const priceFormatted = (price: number) => new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  }).format(price);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !email.trim()) return;
    
    setIsSearching(true);
    setNotFound(false);
    
    // Navigate with search params — the server component will do the lookup
    const params = new URLSearchParams({
      order: orderNumber.trim(),
      email: email.trim().toLowerCase(),
    });
    router.push(`${storePath(storeSlug, "tracking")}?${params.toString()}`);
    
    // After a small delay, check if we have an order
    setTimeout(() => {
      setIsSearching(false);
    }, 1500);
  };

  // Detect "not found" after initial render with search params but no order
  const showNotFound = !!(initialOrderNumber && initialEmail && !initialOrder);
  const statusIndex = getCompositeStatusIndex(order);
  const isCancelled = order?.status === "cancelled" || order?.status === "refunded" || order?.shippingStatus === "cancelled" || order?.paymentStatus === "cancelled";

  return (
    <div className="bg-gray-50 min-h-[80vh]">
      
      {/* Search Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-900 mb-4">
              <Package className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Seguimiento de pedido</h1>
            <p className="text-gray-500 mt-2 text-sm">Ingresá tu número de orden y email para ver el estado de tu compra.</p>
          </div>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Ej: #12345"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
                required
              />
            </div>
            <div className="flex-1">
              <input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-6 py-3 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSearching ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Buscar
            </button>
          </form>

          {showNotFound && (
            <div className="mt-6 bg-red-50 border border-red-100 rounded-xl px-5 py-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-800">No encontramos esa orden</p>
                <p className="text-xs text-red-600 mt-1">Verificá que el número de orden y el email sean los correctos e intentá nuevamente.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Results */}
      {order && (
        <div className="max-w-2xl mx-auto px-4 py-10 sm:px-6 lg:px-8 space-y-8">
          
          {/* Order Header */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Orden</p>
                <p className="text-xl font-extrabold text-gray-900 tracking-tight mt-1">{order.orderNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fecha</p>
                <p className="text-sm font-semibold text-gray-700 mt-1">
                  {new Date(order.createdAt).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>

            {/* Status Timeline */}
            {isCancelled ? (
              <div className="px-6 py-8">
                <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-5 py-4">
                  <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-red-800">
                      {order.status === "cancelled" ? "Orden cancelada" : "Orden reembolsada"}
                    </p>
                    <p className="text-xs text-red-600 mt-0.5">
                      Si tenés alguna consulta, contactanos por email.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-6 py-8">
                <div className="flex items-center justify-between">
                  {STATUS_STEPS.map((step, i) => {
                    const isActive = i <= statusIndex;
                    const isCurrent = i === statusIndex;
                    const StepIcon = step.icon;
                    return (
                      <div key={step.key} className="flex items-center flex-1 last:flex-initial">
                        <div className="flex flex-col items-center gap-2 relative z-10">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                            isCurrent ? "bg-gray-900 shadow-lg shadow-gray-900/20 scale-110" :
                            isActive ? "bg-emerald-500" : "bg-gray-200"
                          }`}>
                            <StepIcon className={`w-4 h-4 ${isActive ? "text-white" : "text-gray-400"}`} />
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider text-center max-w-[80px] leading-tight ${
                            isActive ? "text-gray-900" : "text-gray-400"
                          }`}>
                            {step.label}
                          </span>
                        </div>
                        {i < STATUS_STEPS.length - 1 && (
                          <div className={`flex-1 h-0.5 mx-1 -mt-6 transition-colors duration-500 ${
                            i < statusIndex ? "bg-emerald-500" : "bg-gray-200"
                          }`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Shipping Address & Details */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-4">
              <MapPin className="w-3.5 h-3.5" /> Envío
            </h3>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-6">
              <div>
                <p className="text-sm font-semibold text-gray-900">{order.firstName} {order.lastName}</p>
                <p className="text-sm text-gray-500 mt-1">{order.addressLine1}</p>
                <p className="text-sm text-gray-500">{order.city}, {order.province} {order.postalCode}</p>
              </div>
              <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-gray-100 pt-4 sm:pt-0 sm:pl-6">
                 <p className="text-sm font-semibold text-gray-900">{order.shippingMethodLabel || "Método de envío"}</p>
                 {order.shippingCarrier && (
                    <p className="text-xs font-medium text-gray-500 mt-1">Carrier: {order.shippingCarrier}</p>
                 )}
                 {order.trackingCode && (
                    <div className="mt-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tracking Code</p>
                      {order.trackingUrl ? (
                         <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#009EE3] bg-[#009EE3]/10 hover:bg-[#009EE3]/20 px-2 py-1 rounded transition-colors">
                           {order.trackingCode} <ChevronRight className="w-3 h-3" />
                         </a>
                      ) : (
                         <span className="inline-block text-xs font-mono font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                           {order.trackingCode}
                         </span>
                      )}
                    </div>
                 )}
              </div>
            </div>

            {/* Live External Tracking Events */}
            {order.liveTracking && order.liveTracking.events && order.liveTracking.events.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                 <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                   <Truck className="w-3.5 h-3.5" /> Eventos del Transporte
                 </h4>
                 <div className="space-y-4">
                   {order.liveTracking.events.map((ev: any, idx: number) => (
                     <div key={idx} className="flex gap-4">
                       <div className="w-1.5 flex flex-col items-center">
                         <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5"></div>
                         {idx < order.liveTracking!.events.length - 1 && <div className="w-0.5 h-full bg-blue-100 my-1"></div>}
                       </div>
                       <div>
                         <p className="text-sm font-semibold text-gray-900">{ev.description}</p>
                         <p className="text-xs text-gray-500 mt-0.5">
                           {new Date(ev.timestamp).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}
                           {ev.location && ` en ${ev.location}`}
                         </p>
                       </div>
                     </div>
                   ))}
                 </div>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Productos</h3>
            </div>
            <ul className="divide-y divide-gray-100">
              {order.items.map((item) => (
                <li key={item.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="w-14 h-14 flex-shrink-0 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                    {item.image ? (
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-5 h-5 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.variantTitle} · Cant. {item.quantity}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 tabular-nums">{priceFormatted(item.lineTotal)}</p>
                </li>
              ))}
            </ul>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50 space-y-2">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span className="tabular-nums">{priceFormatted(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Envío</span>
                <span className="tabular-nums">{order.shippingAmount > 0 ? priceFormatted(order.shippingAmount) : "Gratis"}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total</span>
                <span className="tabular-nums">{priceFormatted(order.total)}</span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
