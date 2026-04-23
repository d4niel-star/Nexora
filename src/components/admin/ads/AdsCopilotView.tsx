"use client";

import { useState } from "react";
import { Sparkles, Megaphone, CheckCircle2, AlertCircle, Plus, Loader2, ArrowRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NexoraAIShell } from "@/components/admin/ai/NexoraAIShell";
import { generateAdsCopilotRecommendations } from "@/lib/ads/ai/actions";
import { createCampaignDraft } from "@/lib/ads/drafts/actions";
import { syncAdsInsights } from "@/lib/ads/sync/actions";

export function AdsCopilotView({ storeId, connections, recommendations, drafts, insights, searchParams, standalone = false }: any) {
  const [activeTab, setActiveTab] = useState("recomendaciones");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const metaConnection = connections.find((c: any) => c.platform === "meta");
  const googleConnection = connections.find((c: any) => c.platform === "google");
  const tiktokConnection = connections.find((c: any) => c.platform === "tiktok");

  const handleSync = async (connectionId: string) => {
     setSyncLoading(connectionId);
     setSyncError(null);
     try {
       await syncAdsInsights(connectionId);
       window.location.reload();
     } catch (e: any) {
       setSyncError(e.message);
     } finally {
       setSyncLoading(null);
     }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    await generateAdsCopilotRecommendations(storeId);
    window.location.reload();
  };

  const handleConnect = (platform: string) => {
    setIsConnecting(true);
    window.location.href = `/api/ads/oauth/${platform}/start`;
  };

  const handleCreateDraft = async (recoId: string) => {
     setActionLoading(recoId);
     try {
       await createCampaignDraft(storeId, recoId);
       window.location.reload();
     } finally {
       setActionLoading(null);
     }
  };

  const content = (
    <>
      {/* Quick Actions / Analysis Engine */}
      <div className="mb-8 p-6 bg-[var(--surface-0)] border border-[color:var(--hairline)] rounded-[var(--r-md)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div>
           <h3 className="font-semibold text-ink-0 mb-1">Mapeo Estructural</h3>
           <p className="text-[13px] text-ink-4">
             Generá sugerencias pautables basadas en tus artículos de mayor rentabilidad actual y la disponibilidad de inventario.
           </p>
         </div>
         <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="bg-ink-0 hover:bg-ink-1 text-ink-12 px-6 font-semibold rounded-[var(--r-sm)] shadow-[var(--shadow-soft)] shrink-0"
         >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2 text-ink-12" />}
            Analizar negocio
         </Button>
      </div>

      {/* OAuth Error Rendering */}
      {searchParams?.error && (
        <div className="mb-8 rounded-[var(--r-md)] bg-[var(--surface-2)] border border-[color:var(--hairline)] p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-[color:var(--signal-danger)] shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-[color:var(--signal-danger)]">
              Error de autorización: {searchParams.error === "missing_params" ? "Flujo cancelado o inválido." : searchParams.error === "auth_denied" ? "El usuario denegó los permisos." : "Hubo un error al intentar conectar la cuenta."}
            </p>
            {searchParams.detail && <p className="text-[12px] text-[color:var(--signal-danger)] mt-0.5">{decodeURIComponent(searchParams.detail)}</p>}
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
     <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-[color:var(--hairline)]">
       {["recomendaciones", "conexiones", "borradores", "insights"].map(tab => (
         <button 
           key={tab}
           onClick={() => setActiveTab(tab)}
           className={`px-5 py-3 text-[13px] font-semibold rounded-t-[var(--r-md)] transition-all ${
             activeTab === tab ? "border-b-2 border-ink-0 text-ink-0" : "text-ink-6 hover:text-ink-0"
           }`}
         >
           {tab.charAt(0).toUpperCase() + tab.slice(1)}
           {tab === "recomendaciones" && recommendations.length > 0 && (
             <span className="ml-2 rounded-[var(--r-xs)] bg-ink-0 text-ink-12 text-[10px] px-2 py-0.5 font-semibold">{recommendations.length}</span>
           )}
           {tab === "borradores" && drafts.length > 0 && (
             <span className="ml-2 rounded-[var(--r-xs)] bg-[var(--surface-2)] text-[color:var(--signal-success)] text-[10px] px-2 py-0.5 font-semibold">{drafts.length}</span>
           )}
         </button>
       ))}
     </div>

     <div className="pt-2">
       {/* CONEXIONES TAB */}
       {activeTab === "conexiones" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <ConnectionCard 
               title="Meta Ads" 
               icon="Facebook / Instagram" 
               connection={metaConnection}
               loading={isConnecting}
               syncLoading={syncLoading === metaConnection?.id}
               onConnect={() => handleConnect("meta")} 
               onSync={metaConnection ? () => handleSync(metaConnection.id) : undefined}
             />
             <ConnectionCard 
               title="Google Ads" 
               icon="Search / Shopping" 
               connection={googleConnection}
               loading={isConnecting}
               syncLoading={syncLoading === googleConnection?.id}
               onConnect={() => handleConnect("google")} 
               onSync={googleConnection ? () => handleSync(googleConnection.id) : undefined}
             />
             <ConnectionCard 
               title="TikTok Ads" 
               icon="Video Ads" 
               connection={tiktokConnection}
               loading={isConnecting}
               syncLoading={syncLoading === tiktokConnection?.id}
               onConnect={() => handleConnect("tiktok")} 
               onSync={tiktokConnection ? () => handleSync(tiktokConnection.id) : undefined}
             />
           </div>
       )}
       {activeTab === "conexiones" && syncError && (
           <div className="mt-6 p-4 bg-[var(--surface-2)] text-[color:var(--signal-danger)] border border-[color:var(--hairline)] rounded-[var(--r-md)] flex items-start gap-3">
             <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
             <div>
               <p className="font-semibold">Error de sincronización</p>
               <p className="text-sm mt-1">{syncError}</p>
             </div>
           </div>
       )}

       {/* RECOMENDACIONES TAB */}
       {activeTab === "recomendaciones" && (
          <div className="space-y-6">
            {recommendations.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-[color:var(--hairline-strong)] rounded-[var(--r-md)]">
                 <Megaphone className="w-10 h-10 text-ink-8 mx-auto mb-4" />
                 <h3 className="text-lg font-semibold text-ink-5">Sin recomendaciones activas</h3>
                 <p className="text-sm text-ink-5 mt-2">Hacé clic en analizar para obtener sugerencias contextuales.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {recommendations.map((r: any) => {
                    const payload = JSON.parse(r.recommendationJson);
                    return (
                      <div key={r.id} className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 sm:p-8 shadow-[var(--shadow-soft)] flex flex-col hover:border-[color:var(--hairline-strong)] transition-colors">
                         <div className="flex justify-between items-start mb-6">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-0.5 rounded-[var(--r-xs)] text-[10px] font-semibold uppercase tracking-wider border border-[color:var(--hairline)] ${r.platform === 'meta' ? 'bg-[var(--surface-2)] text-accent-500' : 'bg-[var(--surface-2)] text-[color:var(--signal-danger)]'}`}>
                                  {r.platform}
                                </span>
                                <span className={`px-2 py-0.5 rounded-[var(--r-xs)] text-[10px] font-semibold uppercase tracking-wider border border-[color:var(--hairline)] ${r.priority === 'high' ? 'bg-[var(--surface-2)] text-[color:var(--signal-warning)]' : 'bg-[var(--surface-2)] text-ink-4'}`}>
                                  {r.priority} Priority
                                </span>
                              </div>
                              <h3 className="text-xl font-bold text-ink-0 tracking-tight">{r.title}</h3>
                            </div>
                         </div>
                         <p className="text-[14px] text-ink-4 leading-relaxed flex-1 mb-8">{r.summary}</p>
                        
                         <div className="bg-[var(--surface-1)] rounded-[var(--r-md)] p-5 mb-8 border border-[color:var(--hairline)] space-y-4">
                            <div>
                              <p className="text-[11px] font-medium text-ink-5 uppercase tracking-widest mb-1">Audiencia Sugerida</p>
                              <p className="text-sm font-medium text-ink-0">{payload.audience}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-ink-5 uppercase tracking-widest mb-1">Hook Text</p>
                              <p className="text-sm font-medium text-ink-0">"{payload.hook}"</p>
                            </div>
                         </div>

                         <Button 
                           onClick={() => handleCreateDraft(r.id)}
                           disabled={actionLoading === r.id}
                           className="w-full bg-ink-0 hover:bg-ink-1 text-ink-12 font-semibold rounded-[var(--r-sm)] py-6 h-auto"
                         >
                           {actionLoading === r.id ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Crear Borrador Seguro"}
                         </Button>
                      </div>
                    )
                 })}
              </div>
            )}
          </div>
       )}

       {/* BORRADORES TAB */}
       {activeTab === "borradores" && (
          <div className="space-y-4">
             {drafts.length === 0 ? (
               <p className="text-ink-5 text-sm">No hay borradores creados.</p>
             ) : (
               <div className="grid grid-cols-1 gap-4">
                 {drafts.map((d: any) => {
                   const copy = JSON.parse(d.copyJson);
                   return (
                     <div key={d.id} className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 shadow-[var(--shadow-soft)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                             <span className="px-2 py-0.5 rounded-[var(--r-xs)] bg-[var(--surface-2)] text-ink-4 text-[10px] font-semibold uppercase tracking-wider border border-[color:var(--hairline)]">{d.platform}</span>
                             <span className="px-2 py-0.5 rounded-[var(--r-xs)] bg-[var(--surface-2)] border border-[color:var(--hairline)] text-[color:var(--signal-warning)] text-[10px] font-semibold uppercase tracking-wider">{d.status}</span>
                          </div>
                          <h4 className="text-lg font-semibold text-ink-0">{d.aiSummary}</h4>
                          <p className="text-sm text-ink-5 mt-1 max-w-xl truncate">{copy.primaryText}</p>
                        </div>
                        <div className="shrink-0 text-right">
                           <p className="text-[11px] font-medium text-ink-5 uppercase tracking-widest mb-1">Presupuesto Sugerido</p>
                           <p className="text-lg font-semibold text-[color:var(--signal-success)]">${d.budgetDaily}/día</p>
                           <Button variant="outline" className="mt-3 rounded-[var(--r-sm)] border-[color:var(--hairline-strong)] font-semibold" disabled>
                             Revisar y Publicar
                           </Button>
                        </div>
                     </div>
                   )
                 })}
               </div>
             )}
          </div>
       )}
       
       {/* INSIGHTS */}
       {activeTab === "insights" && (
          <div className="space-y-4">
             {insights?.length === 0 ? (
               <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-12 text-center shadow-[var(--shadow-soft)]">
                  <TrendingUp className="w-12 h-12 text-ink-8 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-ink-0">Insights y Performance</h3>
                  <p className="text-ink-5 mt-2">Conectá cuentas publicitarias con campañas activas y sincronizalas para ver el ROAS real del negocio integrado con tus ventas de Nexora.</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {insights.slice(0, 6).map((insight: any) => {
                   const metrics = JSON.parse(insight.metricsJson || "{}");
                   return (
                     <div key={insight.id} className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 shadow-[var(--shadow-soft)] flex flex-col justify-between">
                       <div className="flex justify-between items-start mb-4">
                         <span className="px-2 py-0.5 rounded-[var(--r-xs)] bg-[var(--surface-2)] text-ink-4 text-[10px] font-semibold uppercase tracking-wider border border-[color:var(--hairline)]">{insight.platform}</span>
                         <span className="text-[10px] text-ink-6 font-medium">{new Date(insight.snapshotAt).toLocaleDateString("es-AR")}</span>
                       </div>
                       <div className="space-y-3">
                         <div className="flex justify-between">
                           <span className="text-xs font-medium text-ink-5 uppercase tracking-widest">Inversión (30d)</span>
                           <span className="text-sm font-semibold text-ink-0">${Number(metrics.spend || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}</span>
                         </div>
                         <div className="flex justify-between">
                           <span className="text-xs font-medium text-ink-5 uppercase tracking-widest">Impresiones</span>
                           <span className="text-sm font-semibold text-ink-0">{Number(metrics.impressions || 0).toLocaleString("es-AR")}</span>
                         </div>
                         <div className="flex justify-between">
                           <span className="text-xs font-medium text-ink-5 uppercase tracking-widest">Clics</span>
                           <span className="text-sm font-semibold text-ink-0">{Number(metrics.clicks || 0).toLocaleString("es-AR")}</span>
                         </div>
                         <div className="flex justify-between border-t border-[color:var(--hairline)] pt-2">
                           <span className="text-xs font-medium text-ink-5 uppercase tracking-widest">Conversiones</span>
                           <span className="text-sm font-semibold text-[color:var(--signal-success)]">{Number(metrics.conversions || 0).toLocaleString("es-AR")}</span>
                         </div>
                       </div>
                     </div>
                   )
                 })}
               </div>
             )}
          </div>
       )}
     </div>
    </>
  );

  // Standalone: render with own page header. Embedded: render inside NexoraAIShell.
  if (standalone) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="text-[28px] lg:text-[32px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink-0">Ads & Performance.</h1>
            <p className="mt-2 text-[14px] leading-[1.55] text-ink-5">
              Conectá Meta, Google y TikTok Ads. Recomendaciones de IA, borradores y métricas de paid media.
            </p>
          </div>
        </div>
        {content}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <NexoraAIShell contextName="Ads & Performance" contextIcon={<Megaphone className="w-5 h-5 text-ink-0" />}>
        {content}
      </NexoraAIShell>
    </div>
  );
}

function ConnectionCard({ title, icon, connection, loading, syncLoading, onConnect, onSync }: any) {
  const active = !!connection;
  const status = connection?.status;
  const lastError = connection?.lastError;

  return (
    <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 sm:p-8 shadow-[var(--shadow-soft)] flex flex-col h-full hover:border-[color:var(--hairline-strong)] transition-colors">
       <div className="w-12 h-12 rounded-[var(--r-sm)] bg-[var(--surface-1)] flex items-center justify-center mb-6 border border-[color:var(--hairline)]">
         <Megaphone className="w-6 h-6 text-ink-4" />
       </div>
       <h3 className="text-xl font-bold tracking-tight text-ink-0">{title}</h3>
       <p className="text-[13px] font-medium text-ink-5 uppercase tracking-widest mt-1 mb-6">{icon}</p>
       
       <div className="mt-auto space-y-3">
         {active ? (
           <>
             <div className="flex items-center gap-2 text-[color:var(--signal-success)] font-semibold bg-[var(--surface-2)] py-3 px-4 rounded-[var(--r-sm)] mb-3">
               <CheckCircle2 className="w-5 h-5 shrink-0" /> <span className="truncate">{connection.accountName || "Cuenta Conectada"}</span>
             </div>
             {status === "error" && lastError && (
               <p className="text-[11px] font-medium text-[color:var(--signal-danger)] bg-[var(--surface-2)] p-2 rounded-[var(--r-sm)] line-clamp-2">
                 {lastError}
               </p>
             )}
             <Button 
               variant="outline" 
               className="w-full border-[color:var(--hairline-strong)] text-ink-0 hover:bg-[var(--surface-1)] font-semibold"
               onClick={onSync}
               disabled={syncLoading}
             >
               {syncLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TrendingUp className="w-4 h-4 mr-2" />}
               Sincronizar Métricas
             </Button>
           </>
         ) : (
           <Button 
             variant="outline" 
             className="w-full border-[color:var(--hairline-strong)] text-ink-0 hover:bg-[var(--surface-1)] font-semibold py-6 rounded-[var(--r-sm)]"
             onClick={onConnect}
             disabled={loading}
           >
             {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Conectar Cuenta"}
           </Button>
         )}
       </div>
    </div>
  )
}