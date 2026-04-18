"use client";

import { useTransition } from "react";
import { retryPayment } from "@/lib/payments/mercadopago/actions";
import { Loader2 } from "lucide-react";

export function RetryButton({ orderId, storeSlug }: { orderId: string, storeSlug: string }) {
  const [isPending, startTransition] = useTransition();

  const handleRetry = () => {
    startTransition(async () => {
      try {
        const { redirectUrl } = await retryPayment(orderId, storeSlug);
        window.location.href = redirectUrl;
      } catch (error) {
        alert("No se pudo recuperar el pago. Por favor contactá a soporte.");
      }
    });
  };

  return (
    <button
      onClick={handleRetry}
      disabled={isPending}
      className="px-6 py-3 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black transition-all active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed flex items-center gap-2"
    >
      {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Conectando...</> : "Reintentar pago"}
    </button>
  );
}
