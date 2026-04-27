"use client"

import { useState, useTransition } from "react"
import { Building2, Save, ExternalLink, ScrollText } from "lucide-react"
import { upsertFiscalProfileAction, upsertLegalSettingsAction } from "@/lib/fiscal/arca/actions"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader"

export function LegalSettingsForm({ storeId, initialProfile, initialSettings }: { storeId: string, initialProfile: any, initialSettings: any }) {
  const [isPending, startTransition] = useTransition()
  const [successMsg, setSuccessMsg] = useState("")
  
  // Fiscal State
  const [taxId, setTaxId] = useState(initialProfile?.taxId || "")
  const [businessName, setBusinessName] = useState(initialProfile?.businessName || "")
  const [ivaCondition, setIvaCondition] = useState(initialProfile?.ivaCondition || "responsable_inscripto")
  const [address, setAddress] = useState(initialProfile?.address || "")
  const [pointOfSale, setPointOfSale] = useState(initialProfile?.pointOfSale?.toString() || "1")
  const [arcaMode, setArcaMode] = useState(initialProfile?.arcaMode || "testing")
  
  // Legal Settings
  const [privacyPolicy, setPrivacyPolicy] = useState(initialSettings?.privacyPolicy || "")
  const [termsOfService, setTermsOfService] = useState(initialSettings?.termsOfService || "")
  const [refundPolicy, setRefundPolicy] = useState(initialSettings?.refundPolicy || "")
  const [businessInfo, setBusinessInfo] = useState(initialSettings?.businessInfo || "")

  const handleSave = () => {
    setSuccessMsg("")
    startTransition(async () => {
      try {
        await upsertFiscalProfileAction(storeId, {
           taxId,
           businessName,
           ivaCondition,
           address,
           pointOfSale: parseInt(pointOfSale, 10),
           arcaMode,
           status: taxId && pointOfSale ? "active" : "incomplete"
        });
        
        await upsertLegalSettingsAction(storeId, {
           privacyPolicy,
           termsOfService,
           refundPolicy,
           businessInfo
        });

        setSuccessMsg("Configuración Legal y Fiscal actualizada correctamente.")
        setTimeout(() => setSuccessMsg(""), 3000)
      } catch (err: any) {
        alert(err.message)
      }
    })
  }

  const inputCls = "w-full h-10 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 text-[13px] text-ink-0 outline-none transition-[box-shadow,border-color] placeholder:text-ink-6 focus:bg-[var(--surface-0)] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)]";
  const textareaCls = "w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 py-2.5 text-[12px] font-mono text-ink-0 outline-none transition-[box-shadow,border-color] placeholder:text-ink-6 focus:bg-[var(--surface-0)] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)] resize-none";
  const labelCls = "text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5";
  const primaryBtn = "inline-flex items-center justify-center gap-2 h-10 px-5 rounded-full bg-ink-0 text-[12px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]";
  const secondaryBtn = "inline-flex items-center justify-center h-10 px-5 rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-[12px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]";

  return (
    <div className="space-y-10 animate-in fade-in duration-[var(--dur-slow)]">

      {/* HEADER */}
      <AdminPageHeader
        eyebrow="Legal y Fiscal"
        title="Configurar legal y fiscal"
        subtitle="Administrá tu identidad en ARCA y las normativas de Defensa del Consumidor."
      />
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
         <div>
         </div>
         <div className="flex gap-2">
            <Link href="/admin/fiscal" className={secondaryBtn}>Cancelar</Link>
            <button onClick={handleSave} disabled={isPending} className={primaryBtn}>
               <Save className="w-4 h-4" strokeWidth={1.75} />
               {isPending ? "Guardando…" : "Guardar configuración"}
            </button>
         </div>
      </div>

      {successMsg && (
        <div role="status" className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3 text-[13px] font-medium text-[color:var(--signal-success)]">
           {successMsg}
        </div>
      )}

      {/* ARCA CONFIG */}
      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 lg:p-8 space-y-6">
         <div className="flex items-center gap-2 border-b border-[color:var(--hairline)] pb-4 mb-2">
            <Building2 className="w-4 h-4 text-ink-5" strokeWidth={1.75} />
            <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-ink-0">Perfil ARCA (AFIP)</h2>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
               <label className={labelCls}>Razón social</label>
               <input value={businessName} onChange={e => setBusinessName(e.target.value)} type="text" className={inputCls} />
            </div>
            <div className="space-y-2">
               <label className={labelCls}>CUIT</label>
               <input value={taxId} onChange={e => setTaxId(e.target.value)} type="text" className={inputCls} placeholder="Ej: 30123456789" />
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
               <label className={labelCls}>Condición frente al IVA</label>
               <select value={ivaCondition} onChange={e => setIvaCondition(e.target.value)} className={inputCls}>
                  <option value="responsable_inscripto">Responsable Inscripto</option>
                  <option value="monotributo">Monotributo</option>
                  <option value="exento">Sujeto Exento</option>
               </select>
            </div>
            <div className="space-y-2">
               <label className={labelCls}>Punto de venta web</label>
               <input value={pointOfSale} onChange={e => setPointOfSale(e.target.value)} type="number" className={inputCls} placeholder="Ej: 4" />
            </div>
            <div className="space-y-2">
               <label className={labelCls}>Entorno WebService</label>
               <select value={arcaMode} onChange={e => setArcaMode(e.target.value)} className={inputCls}>
                  <option value="testing">Homologación / Testing (sin validez fiscal)</option>
                  <option value="production">Producción comercial</option>
               </select>
            </div>
         </div>

         <div className="space-y-2">
            <label className={labelCls}>Domicilio legal</label>
            <input value={address} onChange={e => setAddress(e.target.value)} type="text" className={inputCls} />
         </div>

         {arcaMode === "production" && (
           <div role="note" className="mt-4 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-4">
              <p className="text-[13px] font-semibold text-ink-0 mb-1">
                Requiere certificados
              </p>
              <p className="text-[12px] leading-[1.55] text-ink-5">
                Para el modo productivo debés tener configurado tu alias de WebService en AFIP asociado al CUIT <strong className="text-ink-0 font-semibold">{taxId}</strong> delegando autorización al CUIT de Nexora (30-00000000-1). Contactá a operaciones para provisionar tus certificados privados si vas a emitir en nombre propio.
              </p>
           </div>
         )}
      </section>

      {/* LEGAL TEXTS CONFIG */}
      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 lg:p-8 space-y-6">
         <div className="flex items-center gap-2 border-b border-[color:var(--hairline)] pb-4 mb-2">
            <ScrollText className="w-4 h-4 text-ink-5" strokeWidth={1.75} />
            <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-ink-0">Documentos legales de la tienda</h2>
         </div>

         <div className="space-y-2">
            <label className={labelCls}>Identidad legal (pie de página)</label>
            <input value={businessInfo} onChange={e => setBusinessInfo(e.target.value)} type="text" className={inputCls} placeholder="Ej: Razón Social - CUIT 30… - Dirección" />
         </div>

         <div className="space-y-4">
            <div className="space-y-2">
               <label className={labelCls}>Términos y condiciones</label>
               <textarea rows={6} value={termsOfService} onChange={e => setTermsOfService(e.target.value)} className={textareaCls} placeholder="Usá Markdown o texto estructurado…" />
            </div>

            <div className="space-y-2">
               <label className={labelCls}>Política de privacidad (AAIP)</label>
               <textarea rows={6} value={privacyPolicy} onChange={e => setPrivacyPolicy(e.target.value)} className={textareaCls} placeholder="Usá Markdown o texto estructurado…" />
            </div>

            <div className="space-y-2">
               <label className={labelCls}>Política de cambios y devoluciones</label>
               <textarea rows={6} value={refundPolicy} onChange={e => setRefundPolicy(e.target.value)} className={textareaCls} placeholder="Usá Markdown o texto estructurado…" />
            </div>
         </div>

         <div role="note" className="mt-4 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-4">
            <p className="text-[12px] leading-[1.55] text-ink-5">Estos datos formarán el marco legal ante consumos y se vinculan explícitamente en el Storefront, incluyendo el mandato del Botón de Arrepentimiento automático gestionado por la plataforma en nombre de tu cuenta.</p>
         </div>
      </section>

    </div>
  )
}
