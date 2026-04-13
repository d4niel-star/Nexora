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
        <section className="bg-emerald-50 rounded-2xl p-6 border-2 border-emerald-100 shadow-sm">
           <h3 className="text-[11px] font-bold uppercase tracking-widest text-emerald-800 flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4" /> Facturado Electrónicamente
           </h3>
           <p className="text-sm font-medium text-emerald-700 mb-1">{order.fiscalInvoice.invoiceType} {order.fiscalInvoice.pointOfSale.toString().padStart(4,"0")}-{order.fiscalInvoice.invoiceNumber.toString().padStart(8,"0")}</p>
           <p className="text-xs text-emerald-600 font-mono">CAE: {order.fiscalInvoice.arcaCae}</p>
        </section>
     )
  }

  // Si hubo un error o rechazo
  if (order.fiscalInvoice?.fiscalStatus === "rejected" || order.fiscalInvoice?.fiscalStatus === "error") {
     return (
        <section className="bg-rose-50 rounded-2xl p-6 border-2 border-rose-100 shadow-sm">
           <h3 className="text-[11px] font-bold uppercase tracking-widest text-rose-800 flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4" /> Error en Facturación ARCA
           </h3>
           <p className="text-sm font-medium text-rose-700 mb-4 whitespace-pre-wrap">El intento de facturación falló. Podés volver a intentarlo o verificar la configuración fiscal.</p>
           
           <button 
             onClick={handleIssue} 
             disabled={isPending}
             className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-rose-700 disabled:opacity-50 transition-colors"
           >
             {isPending ? "Procesando..." : "Reintentar Emisión"}
           </button>
           {error && <p className="text-xs text-rose-600 mt-2 font-bold">{error}</p>}
        </section>
     )
  }

  // Aún no facturado
  return (
    <section className="bg-white rounded-2xl p-6 border-2 border-[#FAFAFA] shadow-sm">
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#888888] flex items-center gap-2 mb-4">
        <Building2 className="w-4 h-4" /> Facturación Electrónica (AFIP)
      </h3>
      <p className="text-[13px] text-gray-500 mb-4">
        La orden está paga pero no tiene un comprobante fiscal asociado. Podés emitirlo manualmente.
      </p>
      <button 
        onClick={handleIssue} 
        disabled={isPending || order.paymentStatus !== "paid"}
        className={cn(
          "px-4 py-2 text-sm font-bold rounded-lg shadow-sm w-full flex items-center justify-center gap-2 transition-colors",
          order.paymentStatus === "paid" 
            ? "bg-black text-white hover:bg-[#333333]" 
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        )}
      >
        <FileText className="w-4 h-4" />
        {isPending ? "Generando comprobante..." : order.paymentStatus !== "paid" ? "Requiere pago confirmado" : "Emitir Comprobante (AFIP)"}
      </button>
      {error && <p className="text-xs text-rose-600 mt-2 font-bold">{error}</p>}
    </section>
  )
}
