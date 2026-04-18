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
      className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--r-sm)] bg-ink-0 px-7 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-75 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
    >
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Conectando…
        </>
      ) : (
        "Reintentar pago"
      )}
    </button>
  );
}
