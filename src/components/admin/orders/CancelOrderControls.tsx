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
      <div className="mt-8 border-t border-[color:var(--hairline)] pt-8">
        <button 
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-[var(--r-sm)] text-[12px] font-medium text-[color:var(--signal-danger)] hover:bg-[var(--surface-2)] transition-colors"
        >
          <Ban className="w-4 h-4" strokeWidth={1.75} />
          Cancelar pedido
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-[color:var(--hairline)] pt-8">
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-5 sm:p-6 space-y-4">
        <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--signal-danger)] flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" strokeWidth={1.75} /> Zona de peligro · cancelar pedido
        </h3>
        
        {error && (
          <div className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-3 text-[13px] text-[color:var(--signal-danger)]">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-ink-5">Motivo de cancelación</label>
          <input 
            type="text" 
            placeholder="Ej: a pedido del cliente, falta de stock…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-3.5 h-11 text-[14px] bg-[var(--surface-0)] border border-[color:var(--hairline)] rounded-[var(--r-sm)] text-ink-0 placeholder:text-ink-6 outline-none transition-[box-shadow,border-color] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)]"
          />
        </div>

        {order.paymentStatus === "paid" && order.paymentProvider === "mercadopago" && (
          <label className="flex items-start gap-3 p-3 bg-[var(--surface-0)] border border-[color:var(--hairline)] rounded-[var(--r-sm)] cursor-pointer hover:bg-[var(--surface-2)] transition-colors">
            <div className="flex items-center h-5">
              <input 
                type="checkbox" 
                checked={doRefund}
                onChange={(e) => setDoRefund(e.target.checked)}
                disabled={isSubmitting}
                className="w-4 h-4 rounded-[var(--r-xs)] border-[color:var(--hairline-strong)] accent-ink-0"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-medium text-ink-0">Reembolsar en Mercado Pago</span>
              <span className="text-[11px] text-ink-5 mt-0.5">
                Se devolverán ${order.total.toLocaleString('es-AR')} al cliente automáticamente.
              </span>
            </div>
          </label>
        )}

        <div className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-3 text-[11px] leading-[1.55] text-ink-4">
          <strong className="text-ink-0">Atención:</strong> si el stock ya había sido descontado, se restaurará de forma automática al confirmar. Esta acción no se puede deshacer.
        </div>

        <div className="flex gap-2 pt-2">
          <button 
            onClick={handleCancel}
            disabled={isSubmitting}
            className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-[var(--r-sm)] bg-ink-0 text-ink-12 text-[12px] font-medium hover:bg-ink-2 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" strokeWidth={1.75} /> : <Ban className="w-4 h-4" strokeWidth={1.75} />}
            Confirmar cancelación
          </button>
          <button 
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-ink-0 text-[12px] font-medium hover:bg-[var(--surface-2)] transition-colors"
          >
            <Undo2 className="w-4 h-4" strokeWidth={1.75} />
            Atrás
          </button>
        </div>
      </div>
    </div>
  );
}
