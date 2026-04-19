"use client";

import { useState, useTransition } from "react";
import { updateOrderFulfillment, ShippingStatus } from "@/lib/store-engine/fulfillment/actions";
import { createRealShipment } from "@/lib/logistics/actions";
import { Package, Truck, CheckCircle, RefreshCw, AlertCircle, Zap } from "lucide-react";
import { Order } from "@/types/order";

export function FulfillmentControls({ order }: { order: Order }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingTracking, setEditingTracking] = useState(false);

  const handleStatusChange = (newStatus: ShippingStatus) => {
    startTransition(async () => {
      setError(null);
      try {
        await updateOrderFulfillment({ orderId: order.id, shippingStatus: newStatus });
      } catch (err: any) {
        setError(err.message || "Error al actualizar estado logístico");
      }
    });
  };

  const handleCreateShipment = async (providerId: string) => {
    startTransition(async () => {
      setError(null);
      try {
        await createRealShipment(order.id, providerId);
      } catch (err: any) {
        setError(err.message || "Error al conectar con proveedor logístico externo");
      }
    });
  };

  const handleSaveTracking = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const trackingCode = formData.get("trackingCode") as string;
    const trackingUrl = formData.get("trackingUrl") as string;
    const carrier = formData.get("carrier") as string;

    startTransition(async () => {
      setError(null);
      try {
        await updateOrderFulfillment({ 
          orderId: order.id, 
          trackingCode, 
          trackingUrl, 
          carrier,
          shippingStatus: "shipped" // Prompts shipping status directly if they add tracking manually
        });
        setEditingTracking(false);
      } catch (err: any) {
        setError(err.message || "Error al actualizar tracking");
      }
    });
  };

  const currentStatus = order.shipping.shippingStatus || "unfulfilled";

  return (
    <div className="bg-[var(--surface-1)] rounded-[var(--r-md)] p-6 border border-[color:var(--hairline)]">
      <div className="flex items-center justify-between mb-6">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Logística de envío</span>
        {isPending && <RefreshCw className="w-3.5 h-3.5 text-ink-5 animate-spin" strokeWidth={1.75} />}
      </div>

      {error && (
        <div className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-3 mb-4 flex items-center gap-2 text-[13px] text-[color:var(--signal-danger)]">
           <AlertCircle className="w-4 h-4" strokeWidth={1.75} /> {error}
        </div>
      )}

      {order.status === "cancelled" && (
        <div className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4 mb-6 text-[13px] text-[color:var(--signal-danger)]">
          Logística detenida: el pedido fue cancelado.
        </div>
      )}

      {/* Progress Track */}
      <div className="relative pl-5 space-y-6 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-px before:bg-[color:var(--hairline-strong)]">
        
        {/* Step 1: Prep */}
        <div className="relative">
          <div className={`absolute -left-[27px] top-1 w-3 h-3 rounded-full ring-4 ring-[var(--surface-1)] transition-colors ${currentStatus !== 'unfulfilled' ? 'bg-ink-0' : 'bg-[var(--surface-3)]'}`} />
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-[13px] font-medium ${currentStatus !== 'unfulfilled' ? 'text-ink-0' : 'text-ink-5'}`}>En preparación</p>
              {currentStatus === "unfulfilled" && (
                <p className="text-[11px] text-ink-5 mt-1">El pedido aún no fue armado.</p>
              )}
            </div>
            {currentStatus === "unfulfilled" && order.paymentStatus === "paid" && order.status !== "cancelled" && (
              <button 
                onClick={() => handleStatusChange("preparing")}
                disabled={isPending}
                 className="inline-flex items-center h-8 px-3 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-[11px] font-medium text-ink-0 hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50"
               >
                 Comenzar
              </button>
            )}
          </div>
        </div>

        {/* Step 2: Dispatch */}
        <div className="relative">
          <div className={`absolute -left-[27px] top-1 w-3 h-3 rounded-full ring-4 ring-[var(--surface-1)] transition-colors ${currentStatus === 'shipped' || currentStatus === 'delivered' ? 'bg-ink-0' : 'bg-[var(--surface-3)]'}`} />
          <div className="flex justify-between items-start">
            <div className="w-full">
              <p className={`text-[13px] font-medium ${currentStatus === 'shipped' || currentStatus === 'delivered' ? 'text-ink-0' : 'text-ink-5'}`}>Despachado</p>
              
              {(currentStatus === "preparing" || currentStatus === "shipped") && !editingTracking && (
                <div className="mt-3 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-3">
                  {order.shipping.trackingNumber ? (
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 mb-1">Rastreo activo</p>
                      <p className="font-mono text-[13px] text-ink-0">{order.shipping.trackingNumber}</p>
                      {order.shipping.carrier && <p className="text-[11px] text-ink-4 mt-0.5">{order.shipping.carrier}</p>}
                    </div>
                  ) : (
                    <p className="text-[11px] text-ink-5 italic">Aún no hay código de tracking.</p>
                  )}
                  {order.status !== "cancelled" && (
                    <button onClick={() => setEditingTracking(true)} className="text-[11px] font-medium text-ink-0 mt-2 block hover:underline">
                      {order.shipping.trackingNumber ? 'Modificar' : 'Cargar tracking (despachar)'}
                    </button>
                  )}
                </div>
              )}

              {editingTracking && (
                <form onSubmit={handleSaveTracking} className="mt-3 rounded-[var(--r-md)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] p-4 space-y-3">
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 mb-1.5 block">Logística (opcional)</label>
                    <input name="carrier" type="text" defaultValue={order.shipping.carrier || ''} placeholder="Ej: Andreani, OCA" className="w-full px-3 h-10 text-[13px] bg-[var(--surface-0)] border border-[color:var(--hairline)] rounded-[var(--r-sm)] text-ink-0 placeholder:text-ink-6 outline-none transition-[box-shadow,border-color] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 mb-1.5 block">Código / remito</label>
                    <input name="trackingCode" type="text" defaultValue={order.shipping.trackingNumber || ''} placeholder="Ej: TRK-99213" className="w-full px-3 h-10 text-[13px] bg-[var(--surface-0)] border border-[color:var(--hairline)] rounded-[var(--r-sm)] text-ink-0 placeholder:text-ink-6 outline-none transition-[box-shadow,border-color] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 mb-1.5 block">URL rastreo (opcional)</label>
                    <input name="trackingUrl" type="url" defaultValue={order.shipping.trackingUrl || ''} placeholder="https://" className="w-full px-3 h-10 text-[13px] bg-[var(--surface-0)] border border-[color:var(--hairline)] rounded-[var(--r-sm)] text-ink-0 placeholder:text-ink-6 outline-none transition-[box-shadow,border-color] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)]" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="submit" disabled={isPending} className="flex-1 inline-flex items-center justify-center h-9 rounded-[var(--r-sm)] bg-ink-0 text-ink-12 text-[12px] font-medium hover:bg-ink-2 transition-colors disabled:opacity-50">Guardar y despachar</button>
                    <button type="button" onClick={() => setEditingTracking(false)} disabled={isPending} className="inline-flex items-center h-9 px-3 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-ink-0 text-[12px] font-medium hover:bg-[var(--surface-2)] transition-colors">Cancelar</button>
                  </div>
                  <p className="text-[10px] text-ink-5 text-center mt-1">Al guardar, se enviará el correo ORDER_SHIPPED al cliente.</p>
                </form>
              )}
            </div>
            
            {currentStatus === "preparing" && !editingTracking && order.status !== "cancelled" && (
              <div className="flex flex-col gap-2 shrink-0 ml-2">
                <button 
                  onClick={() => handleCreateShipment("mock_carrier")}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-[11px] font-medium text-ink-0 hover:bg-[var(--surface-2)] transition-colors"
                  title="Genera un ticket automático vía API externa"
                >
                  <Zap className="w-3.5 h-3.5" strokeWidth={1.75} /> Auto-etiqueta
                </button>
                <button 
                  onClick={() => handleStatusChange("shipped")}
                  disabled={isPending}
                  className="inline-flex items-center justify-center h-8 px-3 rounded-[var(--r-sm)] bg-ink-0 text-ink-12 text-[11px] font-medium hover:bg-ink-2 transition-colors w-full"
                >
                  Despachar (manual)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Delivered */}
        <div className="relative">
          <div className={`absolute -left-[27px] top-1 w-3 h-3 rounded-full ring-4 ring-[var(--surface-1)] transition-colors ${currentStatus === 'delivered' ? 'bg-[color:var(--signal-success)]' : 'bg-[var(--surface-3)]'}`} />
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-[13px] font-medium ${currentStatus === 'delivered' ? 'text-ink-0' : 'text-ink-5'}`}>Entregado</p>
            </div>
            {currentStatus === "shipped" && order.status !== "cancelled" && (
              <button 
                onClick={() => handleStatusChange("delivered")}
                disabled={isPending}
                 className="inline-flex items-center h-8 px-3 rounded-[var(--r-sm)] bg-ink-0 text-ink-12 text-[11px] font-medium hover:bg-ink-2 transition-colors"
               >
                 Marcar entregado
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
