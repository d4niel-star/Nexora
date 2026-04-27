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
          <h1 className="text-[28px] lg:text-[32px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink-0">Fiscal y legal.</h1>
          <p className="mt-2 text-sm text-ink-5">
            Gestión de facturación electrónica ARCA/AFIP y compliance de comercio electrónico.
          </p>
        </div>
        <Link href="/admin/fiscal/settings" className="inline-flex h-9 items-center px-3.5 bg-[var(--surface-0)] border border-[color:var(--hairline-strong)] rounded-[var(--r-sm)] text-[13px] font-medium text-ink-0 hover:bg-[var(--surface-2)] transition-colors">
          Configurar Perfil Fiscal
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* ARCA STatus */}
         <div className="p-6 bg-[var(--surface-0)] rounded-[var(--r-md)] border border-[color:var(--hairline)] flex items-start gap-4">
            <div className={cn("flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] shrink-0", profile?.status === "active" ? "text-[color:var(--signal-success)]" : "text-[color:var(--signal-warning)]")}>
               <Building2 className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
               <h3 className="text-sm font-bold uppercase tracking-wider text-ink-0 mb-1">Estado ARCA / AFIP</h3>
               <p className="text-ink-5 text-[13px] leading-relaxed mb-4">
                 {profile?.status === "active" 
                   ? "Nexora está enlazado a los servicios de AFIP. Los comprobantes se emiten correctamente." 
                   : "Perfil fiscal incompleto. Para poder emitir comprobantes necesitás configurar la clave fiscal / punto de venta en ajustes."}
               </p>
               {profile && (
                 <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--surface-1)] border border-[color:var(--hairline)] text-[11px] font-mono text-ink-6">
                    CUIT: {profile.taxId} · PTO VTA: {profile.pointOfSale} · MODO: {profile.arcaMode}
                 </div>
               )}
            </div>
         </div>

         {/* Revocaciones Status */}
         <div className="p-6 bg-[var(--surface-0)] rounded-[var(--r-md)] border border-[color:var(--hairline)] flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-4 shrink-0">
               <RotateCcw className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
               <h3 className="text-sm font-bold uppercase tracking-wider text-ink-0 mb-1">Botón de Arrepentimiento</h3>
               <p className="text-ink-5 text-[13px] leading-relaxed mb-4">
                 Módulo AAIP/DefensaConsumidor activo. Las solicitudes de revocación impactan directamente en el flujo logístico de órdenes.
               </p>
               <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--surface-1)] border border-[color:var(--hairline)] text-[11px] font-mono text-ink-6">
                  {requests.filter(r => r.status === "pending").length} SOLICITUDES PENDIENTES
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Comprobantes Emitidos */}
        <div className="bg-[var(--surface-0)] border border-[color:var(--hairline)] rounded-[var(--r-md)] overflow-hidden">
          <div className="p-5 border-b border-[color:var(--hairline)] flex items-center justify-between bg-[var(--surface-1)]">
             <h2 className="text-[12px] font-medium uppercase tracking-[0.14em] text-ink-0 flex items-center gap-2">
                <FileText className="w-4 h-4 text-ink-6" strokeWidth={1.75} />
                Últimos Comprobantes
             </h2>
          </div>
          <div className="p-0">
             {invoices.length === 0 ? (
               <div className="p-10 text-center text-sm text-ink-6">No hay facturas emitidas aún.</div>
             ) : (
               <ul className="divide-y divide-[color:var(--hairline)]">
                 {invoices.map(inv => (
                    <li key={inv.id} className="p-4 hover:bg-[var(--surface-2)] transition-colors flex items-center justify-between">
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                             <span className="font-bold text-[13px] text-ink-0">{inv.invoiceType}</span>
                             <span className="text-[11px] text-ink-6 font-mono">{inv.pointOfSale.toString().padStart(4,"0")}-{inv.invoiceNumber ? inv.invoiceNumber.toString().padStart(8,"0") : "Borrador"}</span>
                          </div>
                          <div className="text-[12px] text-ink-5">
                             Cliente: {inv.customerName}
                          </div>
                       </div>
                       <div className="text-right">
                          <div className="font-bold text-[13px] text-ink-0 mb-1">${inv.total.toFixed(2)}</div>
                          {inv.fiscalStatus === "authorized" ? (
                             <span className="inline-flex items-center text-[10px] uppercase font-medium tracking-[0.14em] text-[color:var(--signal-success)]">
                                <CheckCircle2 className="w-3 h-3 mr-1" strokeWidth={1.75} /> CAE aprobado
                             </span>
                          ) : inv.fiscalStatus === "error" || inv.fiscalStatus === "rejected" ? (
                             <span className="inline-flex items-center text-[10px] uppercase font-medium tracking-[0.14em] text-[color:var(--signal-danger)]">
                                <AlertCircle className="w-3 h-3 mr-1" strokeWidth={1.75} /> Rechazo ARCA
                             </span>
                          ) : (
                             <span className="inline-flex items-center text-[10px] uppercase font-medium tracking-[0.14em] text-[color:var(--signal-warning)]">
                                Pendiente
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
        <div className="bg-[var(--surface-0)] border border-[color:var(--hairline)] rounded-[var(--r-md)] overflow-hidden">
          <div className="p-5 border-b border-[color:var(--hairline)] flex items-center justify-between bg-[var(--surface-1)]">
             <h2 className="text-[12px] font-medium uppercase tracking-[0.14em] text-ink-0 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-ink-6" strokeWidth={1.75} />
                Solicitudes de Arrepentimiento
             </h2>
          </div>
          <div className="p-0">
             {requests.length === 0 ? (
               <div className="p-10 text-center text-sm text-ink-6">No hay solicitudes vigentes.</div>
             ) : (
               <ul className="divide-y divide-[color:var(--hairline)]">
                 {requests.map(req => (
                    <li key={req.id} className="p-4 hover:bg-[var(--surface-2)] transition-colors flex items-center justify-between">
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                             <span className="font-bold text-[13px] text-ink-0">{req.customerName}</span>
                             <span className="text-[11px] bg-[var(--surface-2)] px-1.5 py-0.5 rounded font-mono text-ink-5">Ord: {req.orderId}</span>
                          </div>
                          <div className="text-[12px] text-ink-5 max-w-[200px] truncate">
                             {req.reason || "Sin justificación"}
                          </div>
                       </div>
                       <div className="text-right">
                          <div className="text-[11px] text-ink-6 mb-1">{req.createdAt.toLocaleDateString("es-AR")}</div>
                          {req.status === "resolved" ? (
                             <span className="inline-flex items-center text-[10px] uppercase font-medium tracking-[0.14em] text-[color:var(--signal-success)]">
                                Resuelto
                             </span>
                          ) : (
                             <span className="inline-flex items-center text-[10px] uppercase font-medium tracking-[0.14em] text-[color:var(--signal-warning)]">
                                Pendiente
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
