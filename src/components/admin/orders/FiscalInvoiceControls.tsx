"use client"

import { useState, useTransition } from "react"
import { Building2, FileText, CheckCircle2, AlertCircle } from "lucide-react"
import { manualIssueInvoiceAction } from "@/lib/fiscal/arca/actions"
import { cn } from "@/lib/utils"

export function FiscalInvoiceControls({ order }: { order: any }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleIssue = () => {
    setError(null)
    startTransition(async () => {
      try {
        await manualIssueInvoiceAction(order.id)
      } catch (e: any) {
        setError(e.message)
      }
    })
  }

  // Si ya tiene una factura autorizada
  if (order.fiscalInvoice?.fiscalStatus === "authorized") {
     return (
        <section className="rounded-[var(--r-md)] p-6 border border-[color:var(--hairline)] bg-[var(--surface-0)]">
           <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--signal-success)] flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.75} /> Facturado electrónicamente
           </h3>
           <p className="text-[13px] font-medium text-ink-0 mb-1">{order.fiscalInvoice.invoiceType} {order.fiscalInvoice.pointOfSale.toString().padStart(4,"0")}-{order.fiscalInvoice.invoiceNumber.toString().padStart(8,"0")}</p>
           <p className="text-[11px] text-ink-5 font-mono">CAE: {order.fiscalInvoice.arcaCae}</p>
        </section>
     )
  }

  // Si hubo un error o rechazo
  if (order.fiscalInvoice?.fiscalStatus === "rejected" || order.fiscalInvoice?.fiscalStatus === "error") {
     return (
        <section className="rounded-[var(--r-md)] p-6 border border-[color:var(--hairline)] bg-[var(--surface-0)]">
           <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--signal-danger)] flex items-center gap-2 mb-3">
              <AlertCircle className="w-3.5 h-3.5" strokeWidth={1.75} /> Error en facturación ARCA
           </h3>
           <p className="text-[13px] text-ink-4 mb-4 leading-[1.55] whitespace-pre-wrap">El intento de facturación falló. Podés volver a intentarlo o verificar la configuración fiscal.</p>
           
           <button 
             onClick={handleIssue} 
             disabled={isPending}
             className="inline-flex items-center h-9 px-4 rounded-[var(--r-sm)] bg-ink-0 text-ink-12 text-[12px] font-medium hover:bg-ink-2 transition-colors disabled:opacity-50"
           >
             {isPending ? "Procesando…" : "Reintentar emisión"}
           </button>
           {error && <p className="text-[11px] text-[color:var(--signal-danger)] mt-2">{error}</p>}
        </section>
     )
  }

  // Aún no facturado
  return (
    <section className="rounded-[var(--r-md)] p-6 border border-[color:var(--hairline)] bg-[var(--surface-0)]">
      <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 flex items-center gap-2 mb-3">
        <Building2 className="w-3.5 h-3.5" strokeWidth={1.75} /> Facturación electrónica (AFIP)
      </h3>
      <p className="text-[13px] text-ink-4 leading-[1.55] mb-4">
        La orden está paga pero no tiene un comprobante fiscal asociado. Podés emitirlo manualmente.
      </p>
      <button 
        onClick={handleIssue} 
        disabled={isPending || order.paymentStatus !== "paid"}
        className={cn(
          "w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--r-sm)] text-[12px] font-medium transition-colors",
          order.paymentStatus === "paid" 
            ? "bg-ink-0 text-ink-12 hover:bg-ink-2" 
            : "bg-[var(--surface-1)] text-ink-6 border border-[color:var(--hairline)] cursor-not-allowed"
        )}
      >
        <FileText className="w-4 h-4" strokeWidth={1.75} />
        {isPending ? "Generando comprobante…" : order.paymentStatus !== "paid" ? "Requiere pago confirmado" : "Emitir comprobante (AFIP)"}
      </button>
      {error && <p className="text-[11px] text-[color:var(--signal-danger)] mt-2">{error}</p>}
    </section>
  )
}
