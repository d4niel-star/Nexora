import { useState } from "react";
import { Globe, Plus, AlertCircle, CheckCircle2, ChevronRight, Loader2, ArrowRight } from "lucide-react";
import { addCustomDomain, setPrimaryDomain, removeCustomDomain, verifyDomainStatus } from "@/lib/store-engine/domains/actions";
import { StoreStatusBadge } from "@/components/admin/store/StoreBadge";
import { Button } from "@/components/ui/button";

function getDomainType(hostname: string) {
  // Simple heuristic: if it has only one dot (e.g. nexora.com), it's probably APEX.
  // Otherwise (e.g. shop.nexora.com), it's a subdomain.
  const parts = hostname.toLowerCase().split(".");
  // We consider APEX if 2 parts (mimarca.com), or 3 parts ending in country code (mimarca.com.ar / mimarca.co.uk)
  const isCountryCode = parts.length === 3 && parts[2].length === 2 && (parts[1] === "com" || parts[1] === "co" || parts[1] === "net" || parts[1] === "org");
  return (parts.length === 2 || isCountryCode) ? "apex" : "subdomain";
}

export function DomainSettingsView({ initialData, onAction, storeId }: { initialData: any; onAction: (a: string) => void; storeId?: string }) {
  const [newDomain, setNewDomain] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [addingDomain, setAddingDomain] = useState(false);

  const d = initialData?.store;
  if (!d) return null;

  const dnsSubdomain = d.subdomain || "Sin subdominio";
  const customDomains = initialData?.domains || [];

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain || !storeId) return;
    setLoadingAction("add");
    try {
      await addCustomDomain(storeId, newDomain);
      setNewDomain("");
      setAddingDomain(false);
      onAction("Dominio enlazado. Requiere configuración DNS.");
    } catch (err: any) {
      onAction(`Error: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleVerify = async (domainId: string) => {
    setLoadingAction(`verify-${domainId}`);
    try {
      await verifyDomainStatus(domainId, storeId!);
      onAction("Conexión validada exitosamente.");
    } catch (err: any) {
      onAction(`No se pudo verificar: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRemove = async (domainId: string) => {
    setLoadingAction(`remove-${domainId}`);
    try {
      await removeCustomDomain(domainId, storeId!);
      onAction("Dominio removido.");
    } catch (err: any) {
      onAction(`Error: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSetPrimary = async (hostname: string) => {
     setLoadingAction(`primary-${hostname}`);
     try {
       await setPrimaryDomain(storeId!, hostname);
       onAction("Dominio fijado como primario.");
     } catch (err: any) {
       onAction(`Error: ${err.message}`);
     } finally {
       setLoadingAction(null);
     }
  };

  return (
    <div className="space-y-10 p-6 sm:p-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-ink-0">Gestión de Dominios</h2>
           <p className="mt-2 text-[13px] leading-[1.55] text-ink-5">
             Conectá un dominio personalizado para dar un aspecto profesional a tu tienda.
           </p>
        </div>
        {!addingDomain && (
          <Button
             onClick={() => setAddingDomain(true)}
             className="h-10 px-5 rounded-[var(--r-sm)] bg-ink-0 text-ink-12 text-[13px] font-medium hover:bg-ink-2"
          >
             <Plus className="w-4 h-4 mr-2" /> Agregar Dominio
          </Button>
        )}
      </div>

      {/* Adding Domain Card */}
      {addingDomain && (
        <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-6">
           <div className="flex justify-between items-start mb-4">
             <h3 className="text-[14px] font-semibold text-ink-0">Conectar dominio existente</h3>
             <button onClick={() => setAddingDomain(false)} className="p-2 rounded-[var(--r-sm)] text-ink-5 hover:text-ink-0 hover:bg-[var(--surface-2)] transition-colors">
                <Globe className="w-4 h-4" />
             </button>
           </div>

           <p className="text-[13px] leading-[1.55] text-ink-5 mb-6 max-w-2xl">
             Ingresá el dominio (ej: <span className="font-mono text-[11px] text-ink-3">mimarca.com</span>) o el subdominio (ej: <span className="font-mono text-[11px] text-ink-3">shop.mimarca.com</span>) que ya has comprado en un registrador externo como GoDaddy, Hostinger o DonWeb.
           </p>

           <form onSubmit={handleAddDomain} className="flex flex-col sm:flex-row gap-3">
             <div className="flex-1 relative group">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-6 group-focus-within:text-ink-0 transition-colors" strokeWidth={1.75} />
                <input
                  type="text"
                  placeholder="midominio.com"
                  className="w-full h-11 pl-10 pr-4 text-[13px] font-medium bg-[var(--surface-0)] border border-[color:var(--hairline)] rounded-[var(--r-sm)] outline-none transition-[box-shadow,border-color] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)] text-ink-0 placeholder:text-ink-6"
                  value={newDomain}
                  autoFocus
                  onChange={e => setNewDomain(e.target.value)}
                  disabled={loadingAction !== null}
                />
             </div>
             <Button
               type="submit"
               disabled={loadingAction !== null || !newDomain}
               className="h-11 px-6 rounded-[var(--r-sm)] bg-ink-0 text-ink-12 text-[13px] font-medium hover:bg-ink-2"
             >
               {loadingAction === "add" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Siguiente"}
             </Button>
           </form>
        </div>
      )}

      <div className="space-y-6">
        
        {/* Subdominio Operativo Tienda base */}
        <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
           <div>
              <div className="flex items-center gap-2 mb-2">
                 <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
                    Dominio Interno de Nexora
                 </p>
                 <StoreStatusBadge status="active" />
                 {d.primaryDomain === d.subdomain && (
                   <span className="inline-flex items-center h-6 px-2 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-[color:var(--signal-success)] text-[10px] font-medium uppercase tracking-[0.14em]">Primario</span>
                 )}
              </div>
              <p className="text-[16px] font-semibold tracking-[-0.01em] text-ink-0">{dnsSubdomain}</p>
              <p className="text-[12px] text-ink-5 mt-1">Este dominio siempre apuntará a tu tienda, pero no es recomendable para usar frente a clientes.</p>
           </div>

           <div className="shrink-0 flex items-center gap-3">
             {d.primaryDomain !== d.subdomain && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetPrimary(d.subdomain)}
                  disabled={loadingAction !== null}
                  className="h-9 px-4 rounded-[var(--r-sm)] text-[13px] font-medium text-ink-0 bg-[var(--surface-0)] border border-[color:var(--hairline-strong)] hover:bg-[var(--surface-2)]"
                >
                  {loadingAction === `primary-${d.subdomain}` ? <Loader2 className="w-4 h-4 animate-spin" /> : "Hacer Principal"}
                </Button>
             )}
           </div>
        </div>

        {/* Dominios Customizados */}
        {customDomains.length > 0 && (
           <div className="space-y-4">
             <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 border-b border-[color:var(--hairline)] pb-2 mt-8">
               Dominios Conectados
             </h3>

             {customDomains.map((custom: any) => {
                const isPending = custom.status === "pending" || custom.status === "failed";
                const domainType = getDomainType(custom.hostname);

                return (
                  <div key={custom.id} className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] overflow-hidden">
                     <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                           <div className="flex items-center gap-2 mb-2">
                              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
                                 Personalizado
                              </p>
                              <StoreStatusBadge status={(custom.status === "failed" ? "error" : custom.status) as any} />
                              {custom.isPrimary && (
                                <span className="inline-flex items-center h-6 px-2 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-[color:var(--signal-success)] text-[10px] font-medium uppercase tracking-[0.14em]">Primario</span>
                              )}
                           </div>
                           <p className="text-[16px] font-semibold tracking-[-0.01em] text-ink-0">{custom.hostname}</p>
                           {isPending && (
                              <p className="text-[12px] font-medium text-[color:var(--signal-warning)] mt-1">Requiere configuración DNS. Validando conexión...</p>
                           )}
                           {custom.status === "active" && (
                              <p className="text-[12px] font-medium text-[color:var(--signal-success)] mt-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" strokeWidth={1.75} /> Tráfico enrutando correctamente a tu tienda.
                              </p>
                           )}
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {isPending && (
                             <Button
                               variant="default"
                               size="sm"
                               onClick={() => handleVerify(custom.id)}
                               disabled={loadingAction !== null}
                               className="h-9 px-4 rounded-[var(--r-sm)] text-[13px] font-medium bg-ink-0 text-ink-12 hover:bg-ink-2"
                             >
                               {loadingAction === `verify-${custom.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verificar Conexión"}
                             </Button>
                          )}
                          {!isPending && !custom.isPrimary && (
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => handleSetPrimary(custom.hostname)}
                               disabled={loadingAction !== null}
                               className="h-9 px-4 rounded-[var(--r-sm)] text-[13px] font-medium text-ink-0 bg-[var(--surface-0)] border border-[color:var(--hairline-strong)] hover:bg-[var(--surface-2)]"
                             >
                               {loadingAction === `primary-${custom.hostname}` ? <Loader2 className="w-4 h-4 animate-spin" /> : "Hacer Principal"}
                             </Button>
                          )}
                          <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => handleRemove(custom.id)}
                             disabled={loadingAction !== null}
                             className="h-9 px-4 rounded-[var(--r-sm)] text-[13px] font-medium text-[color:var(--signal-danger)] hover:bg-[var(--surface-2)]"
                          >
                             {loadingAction === `remove-${custom.id}` ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : "Remover"}
                          </Button>
                        </div>
                     </div>

                     {/* DNS Instructions if pending */}
                     {isPending && (
                       <div className="border-t border-[color:var(--hairline)] bg-[var(--surface-1)] p-6">
                           <div className="flex items-start gap-3">
                              <AlertCircle className="w-4 h-4 text-[color:var(--signal-warning)] shrink-0 mt-0.5" strokeWidth={1.75} />
                              <div className="space-y-4 w-full">
                                <h4 className="text-[13px] font-semibold text-ink-0">Configurá los registros DNS en tu proveedor</h4>
                                <p className="text-[13px] leading-[1.55] text-ink-5">
                                  Iniciá sesión en la plataforma donde compraste el dominio (ej. Hostinger o Godaddy). Ve a la sección de configuración DNS y asegurate de tener los siguientes registros.
                                </p>

                                <div className="mt-4 bg-[var(--surface-0)] rounded-[var(--r-sm)] border border-[color:var(--hairline)] overflow-hidden">
                                  {domainType === "apex" ? (
                                    <table className="w-full text-left text-[13px]">
                                       <thead className="bg-[var(--surface-1)] text-[10px] uppercase tracking-[0.14em] text-ink-5 border-b border-[color:var(--hairline)]">
                                         <tr>
                                           <th className="font-medium py-2 px-3">Tipo</th>
                                           <th className="font-medium py-2 px-3">Nombre / Host</th>
                                           <th className="font-medium py-2 px-3">Valor / Destino</th>
                                         </tr>
                                       </thead>
                                       <tbody className="divide-y divide-[color:var(--hairline)]">
                                         <tr>
                                           <td className="py-3 px-3 font-mono font-semibold text-ink-0">A</td>
                                           <td className="py-3 px-3 font-mono text-ink-0">@</td>
                                           <td className="py-3 px-3 font-mono font-semibold text-[color:var(--signal-success)]">76.76.21.21</td>
                                         </tr>
                                         <tr>
                                           <td className="py-3 px-3 font-mono font-semibold text-ink-0">CNAME</td>
                                           <td className="py-3 px-3 font-mono text-ink-0">www</td>
                                           <td className="py-3 px-3 font-mono font-semibold text-[color:var(--signal-success)]">cname.vercel-dns.com</td>
                                         </tr>
                                       </tbody>
                                    </table>
                                  ) : (
                                    <table className="w-full text-left text-[13px]">
                                       <thead className="bg-[var(--surface-1)] text-[10px] uppercase tracking-[0.14em] text-ink-5 border-b border-[color:var(--hairline)]">
                                         <tr>
                                           <th className="font-medium py-2 px-3">Tipo</th>
                                           <th className="font-medium py-2 px-3">Nombre / Host</th>
                                           <th className="font-medium py-2 px-3">Valor / Destino</th>
                                         </tr>
                                       </thead>
                                       <tbody>
                                         <tr>
                                           <td className="py-3 px-3 font-mono font-semibold text-ink-0">CNAME</td>
                                           <td className="py-3 px-3 font-mono text-ink-0">{custom.hostname.split('.')[0]}</td>
                                           <td className="py-3 px-3 font-mono font-semibold text-[color:var(--signal-success)]">cname.vercel-dns.com</td>
                                         </tr>
                                       </tbody>
                                    </table>
                                  )}
                                </div>
                                <p className="text-[12px] text-ink-5 mt-2">
                                  Nota: Los cambios DNS pueden tardar algunas horas en propagarse en internet. Una vez agregados, hacé clic en "Verificar Conexión".
                                </p>
                              </div>
                           </div>
                       </div>
                     )}
                  </div>
                )
             })}
           </div>
        )}

      </div>
    </div>
  );
}
