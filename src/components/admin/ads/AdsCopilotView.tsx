"use client";

import { useState } from "react";
import { Sparkles, Megaphone, CheckCircle2, AlertCircle, Plus, Loader2, ArrowRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NexoraAIShell } from "@/components/admin/ai/NexoraAIShell";
import { generateAdsCopilotRecommendations } from "@/lib/ads/ai/actions";
import { createCampaignDraft } from "@/lib/ads/drafts/actions";
import { syncAdsInsights } from "@/lib/ads/sync/actions";

export function AdsCopilotView({ storeId, connections, recommendations, drafts, insights }: any) {
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

  return (
    <div className="h-[calc(100vh-8rem)]">
      <NexoraAIShell contextName="Ads & Performance" contextIcon={<Megaphone className="w-5 h-5 text-[#111111]" />}>
        {/* Quick Actions / Analysis Engine */}
        <div className="mb-8 p-6 bg-white border border-[#EAEAEA] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <div>
             <h3 className="font-bold text-[#111111] mb-1">Mapeo Estructural</h3>
             <p className="text-[13px] text-[#666666]">
               Generá sugerencias pautables basadas en tus artículos de mayor rentabilidad actual y la disponibilidad de inventario.
             </p>
           </div>
           <Button 
              onClick={handleGenerate} 
              disabled={isGenerating}
              className="bg-[#111111] hover:bg-black text-white px-6 font-bold rounded-xl shadow-sm shrink-0"
           >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2 text-amber-300" />}
              Analizar negocio
           </Button>
        </div>

        {/* Tabs Navigation */}
       <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-[#EAEAEA]">
         {["recomendaciones", "conexiones", "borradores", "insights"].map(tab => (
           <button 
             key={tab}
             onClick={() => setActiveTab(tab)}
             className={`px-5 py-3 text-[13px] font-bold rounded-t-xl transition-all ${
               activeTab === tab ? "border-b-2 border-[#111111] text-[#111111]" : "text-gray-400 hover:text-gray-700"
             }`}
           >
             {tab.charAt(0).toUpperCase() + tab.slice(1)}
             {tab === "recomendaciones" && recommendations.length > 0 && (
               <span className="ml-2 rounded-full bg-[#111111] text-white text-[10px] px-2 py-0.5">{recommendations.length}</span>
             )}
             {tab === "borradores" && drafts.length > 0 && (
               <span className="ml-2 rounded-full bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5">{drafts.length}</span>
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
             <div className="mt-6 p-4 bg-red-50 text-red-700 border border-red-100 rounded-xl flex items-start gap-3">
               <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
               <div>
                 <p className="font-bold">Error de sincronización</p>
                 <p className="text-sm mt-1">{syncError}</p>
               </div>
             </div>
         )}

         {/* RECOMENDACIONES TAB */}
         {activeTab === "recomendaciones" && (
            <div className="space-y-6">
              {recommendations.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-[#EAEAEA] rounded-3xl">
                   <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-4" />
                   <h3 className="text-lg font-bold text-gray-400">Sin recomendaciones activas</h3>
                   <p className="text-sm text-gray-400 mt-2">Hacé clic en analizar para obtener sugerencias contextuales.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   {recommendations.map((r: any) => {
                      const payload = JSON.parse(r.recommendationJson);
                      return (
                        <div key={r.id} className="rounded-3xl border border-[#EAEAEA] bg-white p-6 sm:p-8 shadow-sm flex flex-col hover:border-gray-300 transition-colors">
                           <div className="flex justify-between items-start mb-6">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${r.platform === 'meta' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                    {r.platform}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${r.priority === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {r.priority} Priority
                                  </span>
                                </div>
                                <h3 className="text-xl font-black text-[#111111] tracking-tight">{r.title}</h3>
                              </div>
                           </div>
                           <p className="text-[14px] text-[#666666] leading-relaxed flex-1 mb-8">{r.summary}</p>
                           
                           <div className="bg-gray-50 rounded-2xl p-5 mb-8 border border-gray-100 space-y-4">
                              <div>
                                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">Audiencia Sugerida</p>
                                <p className="text-sm font-medium text-[#111111]">{payload.audience}</p>
                              </div>
                              <div>
                                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">Hook Text</p>
                                <p className="text-sm font-medium text-[#111111]">"{payload.hook}"</p>
                              </div>
                           </div>

                           <Button 
                             onClick={() => handleCreateDraft(r.id)}
                             disabled={actionLoading === r.id}
                             className="w-full bg-[#111111] hover:bg-black text-white font-bold rounded-xl py-6 h-auto"
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
                 <p className="text-gray-400 text-sm">No hay borradores creados.</p>
               ) : (
                 <div className="grid grid-cols-1 gap-4">
                   {drafts.map((d: any) => {
                     const copy = JSON.parse(d.copyJson);
                     return (
                       <div key={d.id} className="rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                               <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-wider">{d.platform}</span>
                               <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-wider">{d.status}</span>
                            </div>
                            <h4 className="text-lg font-bold text-[#111111]">{d.aiSummary}</h4>
                            <p className="text-sm text-gray-500 mt-1 max-w-xl truncate">{copy.primaryText}</p>
                          </div>
                          <div className="shrink-0 text-right">
                             <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Presupuesto Sugerido</p>
                             <p className="text-lg font-black text-emerald-600">${d.budgetDaily}/día</p>
                             <Button variant="outline" className="mt-3 rounded-lg border-gray-200 font-bold" disabled>
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
                 <div className="rounded-3xl border border-[#EAEAEA] bg-white p-12 text-center shadow-sm">
                    <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-[#111111]">Insights y Performance</h3>
                    <p className="text-gray-500 mt-2">Conectá cuentas publicitarias con campañas activas y sincronizalas para ver el ROAS real del negocio integrado con tus ventas de Nexora.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {insights.slice(0, 6).map((insight: any) => {
                     const metrics = JSON.parse(insight.metricsJson || "{}");
                     return (
                       <div key={insight.id} className="rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-sm flex flex-col justify-between">
                         <div className="flex justify-between items-start mb-4">
                           <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-wider">{insight.platform}</span>
                           <span className="text-[10px] text-gray-400 font-bold">{new Date(insight.snapshotAt).toLocaleDateString("es-AR")}</span>
                         </div>
                         <div className="space-y-3">
                           <div className="flex justify-between">
                             <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Inversión (30d)</span>
                             <span className="text-sm font-black text-[#111111]">${Number(metrics.spend || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}</span>
                           </div>
                           <div className="flex justify-between">
                             <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Impresiones</span>
                             <span className="text-sm font-black text-[#111111]">{Number(metrics.impressions || 0).toLocaleString("es-AR")}</span>
                           </div>
                           <div className="flex justify-between">
                             <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Clics</span>
                             <span className="text-sm font-black text-[#111111]">{Number(metrics.clicks || 0).toLocaleString("es-AR")}</span>
                           </div>
                           <div className="flex justify-between border-t border-gray-100 pt-2">
                             <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Conversiones</span>
                             <span className="text-sm font-black text-emerald-600">{Number(metrics.conversions || 0).toLocaleString("es-AR")}</span>
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
      </NexoraAIShell>
    </div>
  );
}

function ConnectionCard({ title, icon, connection, loading, syncLoading, onConnect, onSync }: any) {
  const active = !!connection;
  const status = connection?.status;
  const lastError = connection?.lastError;

  return (
    <div className="rounded-3xl border border-[#EAEAEA] bg-white p-6 sm:p-8 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
       <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mb-6 border border-gray-100">
         <Megaphone className="w-6 h-6 text-gray-600" />
       </div>
       <h3 className="text-xl font-black tracking-tight text-[#111111]">{title}</h3>
       <p className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mt-1 mb-6">{icon}</p>
       
       <div className="mt-auto space-y-3">
         {active ? (
           <>
             <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 py-3 px-4 rounded-xl mb-3">
               <CheckCircle2 className="w-5 h-5 shrink-0" /> <span className="truncate">{connection.accountName || "Cuenta Conectada"}</span>
             </div>
             {status === "error" && lastError && (
               <p className="text-[11px] font-medium text-red-600 bg-red-50 p-2 rounded-lg line-clamp-2">
                 {lastError}
               </p>
             )}
             <Button 
               variant="outline" 
               className="w-full border-gray-200 text-[#111111] hover:bg-gray-50 font-bold"
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
             className="w-full border-gray-200 text-[#111111] hover:bg-gray-50 font-bold py-6 rounded-xl"
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
