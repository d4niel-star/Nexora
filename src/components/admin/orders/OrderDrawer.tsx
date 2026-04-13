"use client";

import { useEffect } from "react";
import { Order } from "../../../types/order";
import { OrderStatusBadge, PaymentStatusBadge } from "./StatusBadge";
import { X, Truck, CreditCard, PackageOpen, MoreHorizontal, Copy, RefreshCw, Printer, UserCircle } from "lucide-react";
import { FulfillmentControls } from "./FulfillmentControls";
import { CancelOrderControls } from "./CancelOrderControls";
import { FiscalInvoiceControls } from "./FiscalInvoiceControls";

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
      {/* Backdrop (Darkened and blurred) */}
      <div 
        className="fixed inset-0 bg-[#111111]/30 backdrop-blur-[2px] z-40 transition-all duration-300 ease-in-out"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer Panel */}
      <div 
        className="fixed right-0 top-0 bottom-0 w-full sm:max-w-xl bg-white shadow-2xl z-50 overflow-y-auto transform transition-transform duration-300 ease-out border-l border-[#EAEAEA] outline-none flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        tabIndex={-1}
      >
        
        {/* Header - Glassmorphism effect */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-[#EAEAEA] px-6 sm:px-8 py-5 flex items-center justify-between z-10 transition-colors shrink-0">
          <div className="flex items-center gap-4">
            <h2 id="drawer-title" className="text-2xl font-extrabold text-[#111111] tracking-tight">{order.number}</h2>
            <OrderStatusBadge status={order.status} />
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2.5 text-gray-400 hover:text-[#111111] hover:bg-gray-100 rounded-full transition-all active:scale-95">
              <Printer className="w-4 h-4" />
            </button>
            <button className="p-2.5 text-gray-400 hover:text-[#111111] hover:bg-gray-100 rounded-full transition-all active:scale-95">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-[#EAEAEA] mx-1" />
            <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all active:scale-95">
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
             <div className="space-y-4">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#888888] flex items-center gap-2 border-b border-[#EAEAEA] pb-2">
                  <UserCircle className="w-4 h-4" /> Cliente
                </h3>
                <div>
                  <p className="text-[15px] font-bold text-[#111111]">{order.customer.name}</p>
                  <p className="text-sm font-medium text-gray-500 mt-1 hover:text-[#111111] cursor-pointer transition-colors max-w-full truncate">{order.customer.email}</p>
                  {order.customer.phone && <p className="text-sm font-medium text-gray-500 mt-1">{order.customer.phone}</p>}
                </div>
             </div>
             
             {/* Shipping Data */}
             <div className="space-y-4">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#888888] flex items-center gap-2 border-b border-[#EAEAEA] pb-2">
                  <Truck className="w-4 h-4" /> Envío y Logística
                </h3>
                <div className="text-sm">
                  <p className="font-bold text-[#111111] text-[15px]">{order.shipping.shippingMethodLabel || "Método no especificado"}</p>
                  {order.shipping.shippingEstimate && (
                     <p className="text-[#888888] font-medium text-[13px]">{order.shipping.shippingEstimate}</p>
                  )}
                  {order.shipping.carrier && (
                     <p className="text-gray-500 font-medium text-xs mt-1 border-l-2 pl-2 border-gray-200">Carrier: {order.shipping.carrier}</p>
                  )}
                  <p className="text-gray-500 mt-2 font-medium">{order.shipping.address}</p>
                  <p className="text-gray-500 font-medium">{order.shipping.city}, {order.shipping.state}</p>
                  {order.shipping.trackingNumber && (
                    <div className="mt-3 group flex flex-col gap-1 items-start">
                       <span className="text-[11px] font-bold uppercase tracking-widest text-[#888888]">Tracking</span>
                       <div className="flex items-center gap-2 text-[#111111] bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg w-fit cursor-pointer transition-colors active:scale-95 shadow-sm">
                         <span className="font-mono text-xs font-bold tracking-tight">{order.shipping.trackingNumber}</span>
                         <Copy className="w-3 h-3 text-gray-500 group-hover:text-[#111111]" />
                       </div>
                    </div>
                  )}
                </div>
             </div>
          </div>

          {/* Line Items */}
          <section className="space-y-4">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#888888] border-b border-[#EAEAEA] pb-2">Desglose de Productos</h3>
            <div className="space-y-4">
              {order.items.map(item => (
                <div key={item.id} className="flex justify-between items-start group">
                  <div className="flex gap-4">
                    <div className="w-14 h-14 bg-gray-50 rounded-xl border border-[#EAEAEA] flex items-center justify-center text-gray-300 font-bold text-xs shadow-sm transition-transform group-hover:scale-105 overflow-hidden">
                       {item.image ? (
                         <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                       ) : (
                         <span>IMG</span>
                       )}
                    </div>
                    <div className="pt-1">
                      <p className="text-sm font-bold text-[#111111] leading-tight">{item.title}</p>
                      {item.sku && <p className="text-xs text-[#888888] font-mono mt-1.5">SKU: {item.sku}</p>}
                      {item.variantTitle && <p className="text-xs text-gray-500 mt-0.5">{item.variantTitle}</p>}
                    </div>
                  </div>
                  <div className="text-right pt-1">
                    <p className="text-sm font-bold text-[#111111] leading-tight">${(item.lineTotal || item.price * item.quantity).toLocaleString('es-AR')}</p>
                    <p className="text-xs font-semibold text-gray-400 mt-1.5">Cant: {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Financial Totals */}
          <section className="bg-white rounded-2xl p-6 border-2 border-[#FAFAFA] shadow-sm">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#888888] flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4" /> Resumen Financiero
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-gray-500">Subtotal de productos</span>
                <span className="text-[#111111]">${order.subtotal.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="text-gray-500">Logística calculada</span>
                <span className="text-[#111111]">${order.shippingCost.toLocaleString('es-AR')}</span>
              </div>
              <div className="pt-4 mt-2 border-t border-[#EAEAEA]/80 flex justify-between items-end">
                <span className="font-bold text-[#111111] uppercase tracking-wider text-xs">Abonado por cliente</span>
                <div className="flex items-center gap-3">
                  <PaymentStatusBadge status={order.paymentStatus} />
                  <span className="text-2xl font-black text-[#111111] tracking-tighter">
                    ${order.total.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Notes Card */}
          {order.notes && (
            <div className="bg-orange-50 text-orange-900 p-5 rounded-2xl text-sm border border-orange-100 shadow-sm leading-relaxed">
              <span className="font-black text-orange-700 block mb-1 flex items-center gap-2">
                 Nota adjunta
              </span>
              <p className="font-medium text-orange-800">{order.notes}</p>
            </div>
          )}

          {/* Payment Provider Info */}
          {order.paymentProvider && (
            <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl text-sm">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#888888] mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Proveedor de Pago
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#009EE3] flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#111111] capitalize">{order.paymentProvider}</p>
                  {order.mpPaymentId && (
                    <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {order.mpPaymentId}</p>
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
