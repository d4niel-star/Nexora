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
    <div className="bg-gray-50/50 rounded-2xl p-6 border border-[#EAEAEA] shadow-sm shadow-gray-100/50">
      <div className="flex items-center justify-between mb-6">
        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Logística de Envío</span>
        {isPending && <RefreshCw className="w-3.5 h-3.5 text-gray-400 animate-spin" />}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4 flex items-center gap-2 border border-red-100">
           <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {order.status === "cancelled" && (
        <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-100 text-sm font-medium mb-6">
          Logística detenida: El pedido fue cancelado.
        </div>
      )}

      {/* Progress Track */}
      <div className="relative pl-5 space-y-6 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-[2px] before:bg-[#EAEAEA]">
        
        {/* Step 1: Prep */}
        <div className="relative">
          <div className={`absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full ring-4 ring-white shadow-sm transition-colors ${currentStatus !== 'unfulfilled' ? 'bg-amber-500' : 'bg-gray-300'}`} />
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-sm font-bold ${currentStatus !== 'unfulfilled' ? 'text-[#111111]' : 'text-gray-500'}`}>En Preparación</p>
              {currentStatus === "unfulfilled" && (
                <p className="text-xs text-gray-400 mt-1">El pedido aún no fue armado.</p>
              )}
            </div>
            {currentStatus === "unfulfilled" && order.paymentStatus === "paid" && order.status !== "cancelled" && (
              <button 
                onClick={() => handleStatusChange("preparing")}
                disabled={isPending}
                 className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-bold transition-colors"
               >
                 Comenzar
              </button>
            )}
          </div>
        </div>

        {/* Step 2: Dispatch */}
        <div className="relative">
          <div className={`absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full ring-4 ring-white shadow-sm transition-colors ${currentStatus === 'shipped' || currentStatus === 'delivered' ? 'bg-blue-500' : 'bg-[#EAEAEA]'}`} />
          <div className="flex justify-between items-start">
            <div className="w-full">
              <p className={`text-sm font-bold ${currentStatus === 'shipped' || currentStatus === 'delivered' ? 'text-[#111111]' : 'text-gray-400'}`}>Despachado</p>
              
              {(currentStatus === "preparing" || currentStatus === "shipped") && !editingTracking && (
                <div className="mt-3 bg-white p-3 rounded-lg border border-[#EAEAEA] shadow-sm">
                  {order.shipping.trackingNumber ? (
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-1">Rastreo activo</p>
                      <p className="font-mono text-[13px] text-[#111111]">{order.shipping.trackingNumber}</p>
                      {order.shipping.carrier && <p className="text-xs text-blue-600 font-semibold mt-0.5">{order.shipping.carrier}</p>}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">Aún no hay código de tracking.</p>
                  )}
                  {order.status !== "cancelled" && (
                    <button onClick={() => setEditingTracking(true)} className="text-xs font-bold text-[#111111] mt-2 block hover:underline">
                      {order.shipping.trackingNumber ? 'Modificar' : 'Cargar Tracking (Despachar)'}
                    </button>
                  )}
                </div>
              )}

              {editingTracking && (
                <form onSubmit={handleSaveTracking} className="mt-3 bg-white p-4 rounded-xl border border-blue-100 shadow-sm space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#888888] mb-1.5 block">Logística (Opcional)</label>
                    <input name="carrier" type="text" defaultValue={order.shipping.carrier || ''} placeholder="Ej: Andreani, OCA" className="w-full px-3 py-2 text-sm bg-gray-50 border border-[#EAEAEA] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#888888] mb-1.5 block">Código / Remito</label>
                    <input name="trackingCode" type="text" defaultValue={order.shipping.trackingNumber || ''} placeholder="Ej: TRK-99213" className="w-full px-3 py-2 text-sm bg-gray-50 border border-[#EAEAEA] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#888888] mb-1.5 block">URL Rastreo (Opcional)</label>
                    <input name="trackingUrl" type="url" defaultValue={order.shipping.trackingUrl || ''} placeholder="https://" className="w-full px-3 py-2 text-sm bg-gray-50 border border-[#EAEAEA] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="submit" disabled={isPending} className="flex-1 bg-blue-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-blue-700">Guardar & Despachar</button>
                    <button type="button" onClick={() => setEditingTracking(false)} disabled={isPending} className="px-3 bg-gray-100 text-gray-600 text-xs font-bold py-2 rounded-lg hover:bg-gray-200">Cancelar</button>
                  </div>
                  <p className="text-[10px] text-gray-400 text-center mt-1">Al guardar, se enviará el correo ORDER_SHIPPED al cliente.</p>
                </form>
              )}
            </div>
            
            {currentStatus === "preparing" && !editingTracking && order.status !== "cancelled" && (
              <div className="flex flex-col gap-2 shrink-0 ml-2">
                <button 
                  onClick={() => handleCreateShipment("mock_carrier")}
                  disabled={isPending}
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 border border-indigo-100 shadow-sm"
                  title="Genera un ticket automático vía API externa"
                >
                  <Zap className="w-3.5 h-3.5" /> Auto-Etiqueta
                </button>
                <button 
                  onClick={() => handleStatusChange("shipped")}
                  disabled={isPending}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors w-full text-center"
                >
                  Despachar (Manual)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Delivered */}
        <div className="relative">
          <div className={`absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full ring-4 ring-white shadow-sm transition-colors ${currentStatus === 'delivered' ? 'bg-emerald-500' : 'bg-[#EAEAEA]'}`} />
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-sm font-bold ${currentStatus === 'delivered' ? 'text-[#111111]' : 'text-gray-400'}`}>Entregado</p>
            </div>
            {currentStatus === "shipped" && order.status !== "cancelled" && (
              <button 
                onClick={() => handleStatusChange("delivered")}
                disabled={isPending}
                 className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors"
               >
                 Marcar Entregado
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
