"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Order } from "../../../types/order";
import { OrderStatusBadge, PaymentStatusBadge } from "./StatusBadge";
import { X, Truck, CreditCard, PackageOpen, MoreHorizontal, Copy, RefreshCw, Printer, UserCircle } from "lucide-react";
import { FulfillmentControls } from "./FulfillmentControls";
import { CancelOrderControls } from "./CancelOrderControls";
import { FiscalInvoiceControls } from "./FiscalInvoiceControls";
import { buildVariantHref } from "@/lib/navigation/hrefs";

interface OrderDrawerProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderDrawer({ order, isOpen, onClose }: OrderDrawerProps) {
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleEsc);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleEsc);
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-ink-0/40 z-40 transition-opacity duration-[var(--dur-base)] ease-[var(--ease-out)]"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer Panel */}
      <div 
        className="fixed right-0 top-0 bottom-0 w-full sm:max-w-xl bg-[var(--surface-0)] shadow-[var(--shadow-overlay)] z-50 overflow-y-auto transform transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)] border-l border-[color:var(--hairline)] outline-none flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        tabIndex={-1}
      >
        
        {/* Header */}
        <div className="sticky top-0 bg-[var(--surface-0)]/95 backdrop-blur-xl border-b border-[color:var(--hairline)] px-6 sm:px-8 py-5 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <h2 id="drawer-title" className="font-mono text-[18px] font-medium tracking-wider text-ink-0">{order.number}</h2>
            <OrderStatusBadge status={order.status} />
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 text-ink-5 hover:text-ink-0 hover:bg-[var(--surface-2)] rounded-[var(--r-sm)] transition-colors">
              <Printer className="w-4 h-4" />
            </button>
            <button className="p-2 text-ink-5 hover:text-ink-0 hover:bg-[var(--surface-2)] rounded-[var(--r-sm)] transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-[color:var(--hairline)] mx-1" />
            <button onClick={onClose} className="p-2 text-ink-5 hover:text-ink-0 hover:bg-[var(--surface-2)] rounded-[var(--r-sm)] transition-colors">
               <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-10 flex-1">
          
          {/* Action Hub & Timeline */}
          <FulfillmentControls order={order} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
             {/* Customer Data */}
             <div className="space-y-3">
                <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5 flex items-center gap-2 border-b border-[color:var(--hairline)] pb-2">
                  <UserCircle className="w-3.5 h-3.5" /> Cliente
                </h3>
                <div>
                  <p className="text-[14px] font-medium text-ink-0">{order.customer.name}</p>
                  <p className="text-[13px] text-ink-5 mt-1 hover:text-ink-0 cursor-pointer transition-colors max-w-full truncate">{order.customer.email}</p>
                  {order.customer.phone && <p className="text-[13px] text-ink-5 mt-0.5">{order.customer.phone}</p>}
                  {order.customer.document && <p className="text-[11px] font-mono text-ink-6 mt-2">Doc: {order.customer.document}</p>}
                </div>
             </div>
             
             {/* Shipping Data */}
             <div className="space-y-3">
                <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5 flex items-center gap-2 border-b border-[color:var(--hairline)] pb-2">
                  <Truck className="w-3.5 h-3.5" /> Envío y logística
                </h3>
                <div className="text-[13px]">
                  <p className="font-medium text-ink-0 text-[14px]">{order.shipping.shippingMethodLabel || "Método no especificado"}</p>
                  {order.shipping.shippingEstimate && (
                     <p className="text-ink-5 text-[12px] mt-0.5">{order.shipping.shippingEstimate}</p>
                  )}
                  {order.shipping.carrier && (
                     <p className="text-ink-5 text-[11px] mt-1 border-l pl-2 border-[color:var(--hairline-strong)]">Carrier: {order.shipping.carrier}</p>
                  )}
                  <p className="text-ink-5 mt-2">{order.shipping.address}</p>
                  <p className="text-ink-5">{order.shipping.city}, {order.shipping.state}</p>
                  {order.shipping.trackingNumber && (
                    <div className="mt-3 group flex flex-col gap-1 items-start">
                       <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Tracking</span>
                       <div className="inline-flex items-center gap-2 text-ink-0 bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[color:var(--hairline)] px-2.5 py-1 rounded-[var(--r-xs)] w-fit cursor-pointer transition-colors">
                         <span className="font-mono text-[11px] font-medium tracking-tight">{order.shipping.trackingNumber}</span>
                         <Copy className="w-3 h-3 text-ink-5 group-hover:text-ink-0" />
                       </div>
                    </div>
                  )}
                </div>
             </div>
          </div>

          {/* Line Items */}
          <section className="space-y-4">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5 border-b border-[color:var(--hairline)] pb-2">Desglose de productos</h3>
            <div className="space-y-4">
              {order.items.map(item => (
                <div key={item.id} className="flex justify-between items-start gap-4">
                  <div className="flex gap-4 min-w-0">
                    <div className="w-14 h-14 bg-[var(--surface-2)] rounded-[var(--r-sm)] border border-[color:var(--hairline)] flex items-center justify-center text-ink-6 text-[10px] font-medium uppercase tracking-[0.12em] overflow-hidden shrink-0">
                       {item.image ? (
                         <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                       ) : (
                         <span>IMG</span>
                       )}
                    </div>
                    <div className="pt-0.5 min-w-0">
                      <p className="text-[13px] font-medium text-ink-0 leading-tight">{item.title}</p>
                      {item.sku && <p className="text-[11px] text-ink-5 font-mono mt-1">SKU: {item.sku}</p>}
                      {item.variantTitle && <p className="text-[11px] text-ink-5 mt-0.5">{item.variantTitle}</p>}
                      <Link
                        href={item.variantId ? buildVariantHref(item.variantId) : "/admin/inventory"}
                        className="mt-2 inline-flex text-[11px] font-medium text-ink-0 underline decoration-[color:var(--hairline-strong)] decoration-dotted underline-offset-4 hover:decoration-ink-0"
                      >
                        Ver en inventory
                      </Link>
                    </div>
                  </div>
                  <div className="text-right pt-0.5 shrink-0">
                    <p className="tabular text-[13px] font-medium text-ink-0 leading-tight">${(item.lineTotal || item.price * item.quantity).toLocaleString('es-AR')}</p>
                    <p className="tabular text-[11px] text-ink-5 mt-1">Cant: {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Financial Totals */}
          <section className="bg-[var(--surface-1)] rounded-[var(--r-md)] p-6 border border-[color:var(--hairline)]">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5 flex items-center gap-2 mb-4">
              <CreditCard className="w-3.5 h-3.5" /> Resumen financiero
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-[13px]">
                <span className="text-ink-5">Subtotal de productos</span>
                <span className="tabular text-ink-0">${order.subtotal.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-ink-5">Logística calculada</span>
                <span className="tabular text-ink-0">${order.shippingCost.toLocaleString('es-AR')}</span>
              </div>
              <div className="pt-4 mt-2 border-t border-[color:var(--hairline)] flex justify-between items-end">
                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Abonado por cliente</span>
                <div className="flex items-center gap-3">
                  <PaymentStatusBadge status={order.paymentStatus} />
                  <span className="tabular text-[22px] font-semibold tracking-[-0.02em] text-ink-0">
                    ${order.total.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Notes Card */}
          {order.notes && (
            <div className="border-l-2 border-[color:var(--signal-warning)] bg-[var(--surface-1)] p-4 rounded-r-[var(--r-sm)] text-[13px]">
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--signal-warning)] block mb-1">
                 Nota adjunta
              </span>
              <p className="leading-[1.55] text-ink-3">{order.notes}</p>
            </div>
          )}

          {/* Payment Provider Info */}
          {order.paymentProvider && (
            <div className="bg-[var(--surface-1)] border border-[color:var(--hairline)] p-5 rounded-[var(--r-md)] text-[13px]">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5 mb-3 flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5" /> Proveedor de pago
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[var(--r-sm)] bg-ink-0 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-ink-12" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-ink-0 capitalize">{order.paymentProvider}</p>
                  {order.mpPaymentId && (
                    <p className="text-[11px] text-ink-5 font-mono mt-0.5">ID: {order.mpPaymentId}</p>
                  )}
                  {!order.mpPaymentId && order.mpPreferenceId && (
                    <p className="text-[11px] text-ink-5 font-mono mt-0.5">Preference: {order.mpPreferenceId}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Fiscal Invoice Zone */}
          <FiscalInvoiceControls order={order} />

          {/* Danger Zone: Cancellation */}
          <CancelOrderControls order={order} />

        </div>
      </div>
    </>
  );
}
