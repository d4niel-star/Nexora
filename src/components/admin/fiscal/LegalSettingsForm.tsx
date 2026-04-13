"use client"

import { useState, useTransition } from "react"
import { Building2, Save, ExternalLink, ScrollText } from "lucide-react"
import { upsertFiscalProfileAction, upsertLegalSettingsAction } from "@/lib/fiscal/arca/actions"
import { cn } from "@/lib/utils"
import Link from "next/link"

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

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex items-center justify-between">
         <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#111111]">Configurar Legal y Fiscal</h1>
            <p className="mt-2 text-sm text-[#666666]">
               Administrá tu identidad en ARCA y las normativas de Defensa del Consumidor.
            </p>
         </div>
         <div className="flex gap-4">
            <Link href="/admin/fiscal" className="px-4 py-2 border border-[#EAEAEA] bg-white text-[#111111] rounded-lg text-[13px] font-bold hover:bg-[#FAFAFA] transition-colors">Cancelar</Link>
            <button onClick={handleSave} disabled={isPending} className="px-5 py-2 bg-[#111111] text-white rounded-lg text-[13px] font-bold hover:bg-black transition-colors flex items-center gap-2">
               <Save className="w-4 h-4" />
               {isPending ? "Guardando..." : "Guardar configuración"}
            </button>
         </div>
      </div>
      
      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg text-sm border border-emerald-200 font-bold">
           {successMsg}
        </div>
      )}

      {/* ARCA CONFIG */}
      <section className="bg-white border text-sm border-[#EAEAEA] rounded-2xl shadow-sm p-6 lg:p-8 space-y-6">
         <div className="flex items-center gap-3 border-b border-[#F0F0F0] pb-4 mb-2">
            <Building2 className="w-5 h-5 text-[#888888]" />
            <h2 className="text-base font-bold text-[#111111] uppercase tracking-wider">Perfil ARCA (AFIP)</h2>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
               <label className="text-xs font-bold text-[#666666] uppercase tracking-wider">Razón Social</label>
               <input value={businessName} onChange={e => setBusinessName(e.target.value)} type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-[#EAEAEA] rounded-xl outline-none focus:border-black focus:ring-1 focus:ring-black transition-all" />
            </div>
            <div className="space-y-2">
               <label className="text-xs font-bold text-[#666666] uppercase tracking-wider">CUIT</label>
               <input value={taxId} onChange={e => setTaxId(e.target.value)} type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-[#EAEAEA] rounded-xl outline-none focus:border-black focus:ring-1 focus:ring-black transition-all" placeholder="Ej: 30123456789" />
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
               <label className="text-xs font-bold text-[#666666] uppercase tracking-wider">Condición Frente al IVA</label>
               <select value={ivaCondition} onChange={e => setIvaCondition(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-[#EAEAEA] rounded-xl outline-none focus:border-black focus:ring-1 focus:ring-black transition-all">
                  <option value="responsable_inscripto">Responsable Inscripto</option>
                  <option value="monotributo">Monotributo</option>
                  <option value="exento">Sujeto Exento</option>
               </select>
            </div>
            <div className="space-y-2">
               <label className="text-xs font-bold text-[#666666] uppercase tracking-wider">Punto de Venta Web</label>
               <input value={pointOfSale} onChange={e => setPointOfSale(e.target.value)} type="number" className="w-full px-4 py-2.5 bg-gray-50 border border-[#EAEAEA] rounded-xl outline-none focus:border-black focus:ring-1 focus:ring-black transition-all" placeholder="Ej: 4" />
            </div>
            <div className="space-y-2">
               <label className="text-xs font-bold text-[#666666] uppercase tracking-wider">Entorno WebService</label>
               <select value={arcaMode} onChange={e => setArcaMode(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-[#EAEAEA] rounded-xl outline-none focus:border-black focus:ring-1 focus:ring-black transition-all">
                  <option value="testing">Homologación / Testing (Sin validez fiscal)</option>
                  <option value="production">Producción Comercial</option>
               </select>
            </div>
         </div>

         <div className="space-y-2">
            <label className="text-xs font-bold text-[#666666] uppercase tracking-wider">Domicilio Legal</label>
            <input value={address} onChange={e => setAddress(e.target.value)} type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-[#EAEAEA] rounded-xl outline-none focus:border-black focus:ring-1 focus:ring-black transition-all" />
         </div>

         {arcaMode === "production" && (
           <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-blue-900 mt-4">
              <p className="font-bold flex items-center gap-2 mb-1">
                Requiere Certificados
              </p>
              <p className="text-xs">
                Para el modo productivo, debes tener configurado tu Alias de WebService en AFIP asociado al CUIT <strong>{taxId}</strong> delegando autorización al CUIT de Nexora (30-00000000-1). Contactá a operaciones para provisionar tus certificados privados si vas a emitir en nombre propio.
              </p>
           </div>
         )}
      </section>

      {/* LEGAL TEXTS CONFIG */}
      <section className="bg-white border text-sm border-[#EAEAEA] rounded-2xl shadow-sm p-6 lg:p-8 space-y-6">
         <div className="flex items-center gap-3 border-b border-[#F0F0F0] pb-4 mb-2">
            <ScrollText className="w-5 h-5 text-[#888888]" />
            <h2 className="text-base font-bold text-[#111111] uppercase tracking-wider">Documentos Legales de la Tienda</h2>
         </div>

         <div className="space-y-2">
            <label className="text-xs font-bold text-[#666666] uppercase tracking-wider">Identidad Legal (Pie de página)</label>
            <input value={businessInfo} onChange={e => setBusinessInfo(e.target.value)} type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-[#EAEAEA] rounded-xl outline-none focus:border-black transition-all" placeholder="Ej: Razón Social - CUIT 30... - Dirección" />
         </div>

         <div className="space-y-4">
            <div className="space-y-2">
               <label className="text-xs font-bold text-[#666666] uppercase tracking-wider">Términos y Condiciones</label>
               <textarea rows={6} value={termsOfService} onChange={e => setTermsOfService(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-[#EAEAEA] rounded-xl outline-none focus:border-black focus:ring-1 focus:ring-black transition-all resize-none font-mono text-xs" placeholder="Usá Markdown o texto estructurado..." />
            </div>
            
            <div className="space-y-2">
               <label className="text-xs font-bold text-[#666666] uppercase tracking-wider">Política de Privacidad (AAIP)</label>
               <textarea rows={6} value={privacyPolicy} onChange={e => setPrivacyPolicy(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-[#EAEAEA] rounded-xl outline-none focus:border-black focus:ring-1 focus:ring-black transition-all resize-none font-mono text-xs" placeholder="Usá Markdown o texto estructurado..." />
            </div>

            <div className="space-y-2">
               <label className="text-xs font-bold text-[#666666] uppercase tracking-wider">Política de Cambios y Devoluciones</label>
               <textarea rows={6} value={refundPolicy} onChange={e => setRefundPolicy(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-[#EAEAEA] rounded-xl outline-none focus:border-black focus:ring-1 focus:ring-black transition-all resize-none font-mono text-xs" placeholder="Usá Markdown o texto estructurado..." />
            </div>
         </div>
         
         <div className="bg-[#FAFAFA] border border-[#EAEAEA] p-4 rounded-xl text-[#666666] mt-4 flex items-start gap-4">
            <p className="text-xs">Estos datos formarán el marco legal ante consumos y se vinculan explícitamente en el Storefront, incluyendo el mandato del Botón de Arrepentimiento automático gestionado por la plataforma en nombre de tu cuenta.</p>
         </div>
      </section>

    </div>
  )
}
