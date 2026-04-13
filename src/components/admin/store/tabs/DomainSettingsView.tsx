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
           <h2 className="text-xl font-extrabold text-[#111111]">Gestión de Dominios</h2>
           <p className="mt-1 text-sm text-[#666666]">
             Conectá un dominio personalizado para dar un aspecto profesional a tu tienda.
           </p>
        </div>
        {!addingDomain && (
          <Button 
             onClick={() => setAddingDomain(true)}
             className="bg-[#111111] hover:bg-black text-white font-bold rounded-xl"
          >
             <Plus className="w-4 h-4 mr-2" /> Agregar Dominio
          </Button>
        )}
      </div>

      {/* Adding Domain Card */}
      {addingDomain && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/10 p-6 shadow-sm">
           <div className="flex justify-between items-start mb-4">
             <h3 className="font-bold text-[#111111]">Conectar dominio existente</h3>
             <button onClick={() => setAddingDomain(false)} className="text-gray-400 hover:text-[#111111]">
                <Globe className="w-5 h-5" />
             </button>
           </div>
           
           <p className="text-sm text-[#666666] mb-6 max-w-2xl">
             Ingresá el dominio (ej: <span className="font-mono text-xs">mimarca.com</span>) o el subdominio (ej: <span className="font-mono text-xs">shop.mimarca.com</span>) que ya has comprado en un registrador externo como GoDaddy, Hostinger o DonWeb.
           </p>

           <form onSubmit={handleAddDomain} className="flex flex-col sm:flex-row gap-3">
             <div className="flex-1 relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="midominio.com" 
                  className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all" 
                  value={newDomain} 
                  autoFocus
                  onChange={e => setNewDomain(e.target.value)} 
                  disabled={loadingAction !== null} 
                />
             </div>
             <Button 
               type="submit" 
               disabled={loadingAction !== null || !newDomain} 
               className="rounded-xl bg-[#111111] hover:bg-black text-white px-8 py-6 h-auto font-bold"
             >
               {loadingAction === "add" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Siguiente"}
             </Button>
           </form>
        </div>
      )}

      <div className="space-y-6">
        
        {/* Subdominio Operativo Tienda base */}
        <div className="rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
           <div>
              <div className="flex items-center gap-2 mb-1">
                 <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#888888]">
                    Dominio Interno de Nexora
                 </p>
                 <StoreStatusBadge status="active" />
                 {d.primaryDomain === d.subdomain && (
                   <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Primario</span>
                 )}
              </div>
              <p className="text-lg font-black tracking-tight text-[#111111]">{dnsSubdomain}</p>
              <p className="text-xs text-gray-500 mt-1">Este dominio siempre apuntará a tu tienda, pero no es recomendable para usar frente a clientes.</p>
           </div>

           <div className="shrink-0 flex items-center gap-3">
             {d.primaryDomain !== d.subdomain && (
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetPrimary(d.subdomain)}
                  disabled={loadingAction !== null}
                  className="rounded-lg font-bold text-[#111111] border-[#EAEAEA]"
                >
                  {loadingAction === `primary-${d.subdomain}` ? <Loader2 className="w-4 h-4 animate-spin" /> : "Hacer Principal"}
                </Button>
             )}
           </div>
        </div>

        {/* Dominios Customizados */}
        {customDomains.length > 0 && (
           <div className="space-y-4">
             <h3 className="text-sm font-bold text-[#111111] border-b border-[#EAEAEA] pb-2 mt-8">
               Dominios Conectados
             </h3>
             
             {customDomains.map((custom: any) => {
                const isPending = custom.status === "pending" || custom.status === "failed";
                const domainType = getDomainType(custom.hostname);
                
                return (
                  <div key={custom.id} className="rounded-2xl border border-[#EAEAEA] bg-white overflow-hidden shadow-sm">
                     <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#888888]">
                                 Personalizado
                              </p>
                              <StoreStatusBadge status={(custom.status === "failed" ? "error" : custom.status) as any} />
                              {custom.isPrimary && (
                                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Primario</span>
                              )}
                           </div>
                           <p className="text-lg font-black tracking-tight text-[#111111]">{custom.hostname}</p>
                           {isPending && (
                              <p className="text-xs text-amber-600 font-medium mt-1">Requiere configuración DNS. Validando conexión...</p>
                           )}
                           {custom.status === "active" && (
                              <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Tráfico enrutando correctamente a tu tienda.
                              </p>
                           )}
                        </div>

                        <div className="shrink-0 flex items-center gap-3">
                          {isPending && (
                             <Button 
                               variant="default"
                               size="sm"
                               onClick={() => handleVerify(custom.id)}
                               disabled={loadingAction !== null}
                               className="rounded-lg font-bold bg-[#111111] text-white"
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
                               className="rounded-lg font-bold text-[#111111] border-[#EAEAEA]"
                             >
                               {loadingAction === `primary-${custom.hostname}` ? <Loader2 className="w-4 h-4 animate-spin" /> : "Hacer Principal"}
                             </Button>
                          )}
                          <Button 
                             variant="ghost"
                             size="sm"
                             onClick={() => handleRemove(custom.id)}
                             disabled={loadingAction !== null}
                             className="rounded-lg font-bold text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                             {loadingAction === `remove-${custom.id}` ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : "Remover"}
                          </Button>
                        </div>
                     </div>

                     {/* DNS Instructions if pending */}
                     {isPending && (
                       <div className="border-t border-[#EAEAEA] bg-amber-50/30 p-6">
                           <div className="flex items-start gap-3">
                              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                              <div className="space-y-4 w-full">
                                <h4 className="text-sm font-bold text-[#111111]">Configurá los registros DNS en tu proveedor</h4>
                                <p className="text-[13px] text-[#666666]">
                                  Iniciá sesión en la plataforma donde compraste el dominio (ej. Hostinger o Godaddy). Ve a la sección de configuración DNS y asegurate de tener los siguientes registros. 
                                </p>
                                
                                <div className="space-y-2 mt-4 bg-white p-1 rounded-xl border border-gray-200">
                                  {domainType === "apex" ? (
                                    <>
                                       <table className="w-full text-left text-[13px]">
                                          <thead className="text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
                                            <tr>
                                              <th className="font-bold py-2 px-3">Tipo</th>
                                              <th className="font-bold py-2 px-3">Nombre / Host</th>
                                              <th className="font-bold py-2 px-3">Valor / Destino</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr className="border-b border-gray-50">
                                              <td className="py-3 px-3 font-mono font-bold text-[#111111]">A</td>
                                              <td className="py-3 px-3 font-mono">@</td>
                                              <td className="py-3 px-3 font-mono text-emerald-600 font-bold">76.76.21.21</td>
                                            </tr>
                                            <tr>
                                              <td className="py-3 px-3 font-mono font-bold text-[#111111]">CNAME</td>
                                              <td className="py-3 px-3 font-mono">www</td>
                                              <td className="py-3 px-3 font-mono text-emerald-600 font-bold">cname.vercel-dns.com</td>
                                            </tr>
                                          </tbody>
                                       </table>
                                    </>
                                  ) : (
                                    <>
                                       <table className="w-full text-left text-[13px]">
                                          <thead className="text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
                                            <tr>
                                              <th className="font-bold py-2 px-3">Tipo</th>
                                              <th className="font-bold py-2 px-3">Nombre / Host</th>
                                              <th className="font-bold py-2 px-3">Valor / Destino</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr className="border-b border-gray-50">
                                              <td className="py-3 px-3 font-mono font-bold text-[#111111]">CNAME</td>
                                              <td className="py-3 px-3 font-mono">{custom.hostname.split('.')[0]}</td>
                                              <td className="py-3 px-3 font-mono text-emerald-600 font-bold">cname.vercel-dns.com</td>
                                            </tr>
                                          </tbody>
                                       </table>
                                    </>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
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
