import { getInvoicesAction, getStoreFiscalProfileAction, getWithdrawalRequestsAction } from "@/lib/fiscal/arca/actions";
import { getCurrentStore } from "@/lib/auth/session";
import { AlertCircle, CheckCircle2, RotateCcw, FileText, Send, Building2, Store } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function FiscalDashboardPage() {
  const store = await getCurrentStore();
  if (!store) return null;

  const profile = await getStoreFiscalProfileAction(store.id);
  const invoices = await getInvoicesAction(store.id);
  const requests = await getWithdrawalRequestsAction(store.id);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#111111]">Fiscal & Legal</h1>
          <p className="mt-2 text-sm text-[#666666]">
            Gestión de facturación electrónica ARCA/AFIP y compliance de comercio electrónico.
          </p>
        </div>
        <Link href="/admin/fiscal/settings" className="px-4 py-2 bg-white border border-[#EAEAEA] rounded-lg text-sm font-bold shadow-sm hover:bg-[#FAFAFA] transition-colors">
          Configurar Perfil Fiscal
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* ARCA STatus */}
         <div className="p-6 bg-white rounded-2xl border border-[#EAEAEA] shadow-sm flex items-start gap-4">
            <div className={cn("p-4 rounded-xl shrink-0", profile?.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
               <Building2 className="w-8 h-8" />
            </div>
            <div>
               <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111] mb-1">Estado ARCA / AFIP</h3>
               <p className="text-[#666666] text-[13px] leading-relaxed mb-4">
                 {profile?.status === "active" 
                   ? "Nexora está enlazado a los servicios de AFIP. Los comprobantes se emiten correctamente." 
                   : "Perfil fiscal incompleto. Para poder emitir comprobantes necesitás configurar la clave fiscal / punto de venta en ajustes."}
               </p>
               {profile && (
                 <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FAFAFA] border border-[#EAEAEA] text-[11px] font-mono text-[#888888]">
                    CUIT: {profile.taxId} · PTO VTA: {profile.pointOfSale} · MODO: {profile.arcaMode}
                 </div>
               )}
            </div>
         </div>

         {/* Revocaciones Status */}
         <div className="p-6 bg-white rounded-2xl border border-[#EAEAEA] shadow-sm flex items-start gap-4">
            <div className="p-4 rounded-xl bg-blue-50 text-blue-600 shrink-0">
               <RotateCcw className="w-8 h-8" />
            </div>
            <div>
               <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111] mb-1">Botón de Arrepentimiento</h3>
               <p className="text-[#666666] text-[13px] leading-relaxed mb-4">
                 Módulo AAIP/DefensaConsumidor activo. Las solicitudes de revocación impactan directamente en el flujo logístico de órdenes.
               </p>
               <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FAFAFA] border border-[#EAEAEA] text-[11px] font-mono text-[#888888]">
                  {requests.filter(r => r.status === "pending").length} SOLICITUDES PENDIENTES
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Comprobantes Emitidos */}
        <div className="bg-white border border-[#EAEAEA] rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="p-5 border-b border-[#F0F0F0] flex items-center justify-between bg-[#FAFAFA]">
             <h2 className="text-[13px] font-bold uppercase tracking-[0.1em] text-[#111111] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#888888]" />
                Últimos Comprobantes
             </h2>
          </div>
          <div className="p-0">
             {invoices.length === 0 ? (
               <div className="p-10 text-center text-sm text-[#888888]">No hay facturas emitidas aún.</div>
             ) : (
               <ul className="divide-y divide-[#EAEAEA]">
                 {invoices.map(inv => (
                    <li key={inv.id} className="p-4 hover:bg-[#FAFAFA] transition-colors flex items-center justify-between">
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                             <span className="font-bold text-[13px] text-[#111111]">{inv.invoiceType}</span>
                             <span className="text-[11px] text-[#888888] font-mono">{inv.pointOfSale.toString().padStart(4,"0")}-{inv.invoiceNumber ? inv.invoiceNumber.toString().padStart(8,"0") : "Borrador"}</span>
                          </div>
                          <div className="text-[12px] text-[#666666]">
                             Cliente: {inv.customerName}
                          </div>
                       </div>
                       <div className="text-right">
                          <div className="font-bold text-[13px] text-[#111111] mb-1">${inv.total.toFixed(2)}</div>
                          {inv.fiscalStatus === "authorized" ? (
                             <span className="inline-flex items-center text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> CAE APROBADO
                             </span>
                          ) : inv.fiscalStatus === "error" || inv.fiscalStatus === "rejected" ? (
                             <span className="inline-flex items-center text-[10px] uppercase font-bold text-red-600 tracking-wider">
                                <AlertCircle className="w-3 h-3 mr-1" /> RECHAZO ARCA
                             </span>
                          ) : (
                             <span className="inline-flex items-center text-[10px] uppercase font-bold text-amber-600 tracking-wider">
                                PENDIENTE
                             </span>
                          )}
                       </div>
                    </li>
                 ))}
               </ul>
             )}
          </div>
        </div>

        {/* Retornos y Revocaciones */}
        <div className="bg-white border border-[#EAEAEA] rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="p-5 border-b border-[#F0F0F0] flex items-center justify-between bg-[#FAFAFA]">
             <h2 className="text-[13px] font-bold uppercase tracking-[0.1em] text-[#111111] flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-[#888888]" />
                Solicitudes de Arrepentimiento
             </h2>
          </div>
          <div className="p-0">
             {requests.length === 0 ? (
               <div className="p-10 text-center text-sm text-[#888888]">No hay solicitudes vigentes.</div>
             ) : (
               <ul className="divide-y divide-[#EAEAEA]">
                 {requests.map(req => (
                    <li key={req.id} className="p-4 hover:bg-[#FAFAFA] transition-colors flex items-center justify-between">
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                             <span className="font-bold text-[13px] text-[#111111]">{req.customerName}</span>
                             <span className="text-[11px] bg-[#EEEEEE] px-1.5 py-0.5 rounded font-mono text-[#555555]">Ord: {req.orderId}</span>
                          </div>
                          <div className="text-[12px] text-[#666666] max-w-[200px] truncate">
                             {req.reason || "Sin justificación"}
                          </div>
                       </div>
                       <div className="text-right">
                          <div className="text-[11px] text-[#888888] mb-1">{req.createdAt.toLocaleDateString("es-AR")}</div>
                          {req.status === "resolved" ? (
                             <span className="inline-flex items-center text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                                RESUELTO
                             </span>
                          ) : (
                             <span className="inline-flex items-center text-[10px] uppercase font-bold text-amber-600 tracking-wider">
                                PENDIENTE
                             </span>
                          )}
                       </div>
                    </li>
                 ))}
               </ul>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
