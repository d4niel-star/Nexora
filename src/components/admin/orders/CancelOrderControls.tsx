"use client";

import { useState } from "react";
import { Order } from "../../../types/order";
import { AlertCircle, Ban, RefreshCw, Undo2 } from "lucide-react";
import { cancelOrder } from "@/lib/store-engine/orders/actions";
import { useRouter } from "next/navigation";

interface CancelOrderControlsProps {
  order: Order;
}

export function CancelOrderControls({ order }: CancelOrderControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [doRefund, setDoRefund] = useState(order.paymentStatus === "paid");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();

  if (order.status === "cancelled") {
    return null; // Already cancelled
  }

  const handleCancel = async () => {
    if (!reason.trim()) {
      setError("Por favor ingresá un motivo para la cancelación.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await cancelOrder(order.id, reason, doRefund);
      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Ocurrió un error al cancelar el pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="mt-8 border-t border-red-100 pt-8">
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors active:scale-95"
        >
          <Ban className="w-4 h-4" />
          Cancelar Pedido
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-red-100 pt-8">
      <div className="bg-red-50/50 border border-red-100 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
        <h3 className="text-[13px] font-bold uppercase tracking-widest text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Zona de Peligro: Cancelar Pedido
        </h3>
        
        {error && (
          <div className="bg-white border-l-4 border-red-500 text-red-700 p-3 rounded text-sm font-medium">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-semibold text-[#111111]">Motivo de cancelación</label>
          <input 
            type="text" 
            placeholder="Ej: A pedido del cliente, falta de stock..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isSubmitting}
            className="w-full bg-white border border-[#EAEAEA] rounded-xl px-4 py-2.5 text-sm font-medium text-[#111111] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#111111]/10 focus:border-[#111111] transition-all"
          />
        </div>

        {order.paymentStatus === "paid" && order.paymentProvider === "mercadopago" && (
          <label className="flex items-start gap-3 p-3 bg-white border border-[#EAEAEA] rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center h-5">
              <input 
                type="checkbox" 
                checked={doRefund}
                onChange={(e) => setDoRefund(e.target.checked)}
                disabled={isSubmitting}
                className="w-4 h-4 text-black rounded border-gray-300 focus:ring-black focus:ring-offset-0 transition-all"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[#111111]">Reembolsar en Mercado Pago</span>
              <span className="text-xs font-medium text-gray-500 mt-0.5">
                Se devolverán ${order.total.toLocaleString('es-AR')} al cliente automáticamente.
              </span>
            </div>
          </label>
        )}

        <div className="bg-orange-50 text-orange-800 p-3 rounded-lg text-xs leading-relaxed border border-orange-100 font-medium">
          <strong>Atención:</strong> Si el stock ya había sido descontado, se restaurará de forma automática al confirmar. Esta acción no se puede deshacer.
        </div>

        <div className="flex gap-3 pt-2">
          <button 
            onClick={handleCancel}
            disabled={isSubmitting}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-sm"
          >
            {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
            Confirmar Cancelación
          </button>
          <button 
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
            className="px-4 py-2.5 bg-white border border-[#EAEAEA] text-[#111111] font-semibold rounded-xl text-sm hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Undo2 className="w-4 h-4" />
            Atrás
          </button>
        </div>
      </div>
    </div>
  );
}
