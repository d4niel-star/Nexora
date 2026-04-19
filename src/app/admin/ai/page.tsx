import { NexoraAIShell } from "@/components/admin/ai/NexoraAIShell";
import { WorkQueue } from "@/components/admin/ai/WorkQueue";
import { DecisionQueue } from "@/components/admin/ai/DecisionQueue";
import { AptitudePanel } from "@/components/admin/ai/AptitudePanel";
import { Sparkles, Megaphone, TrendingUp, Clock, CheckCircle2, Target } from "lucide-react";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { GlobalCommandInput } from "@/components/admin/ai/GlobalCommandInput";
import { getAIHubData } from "@/app/admin/ai/queries";
import { getDecisionRecommendations } from "@/lib/ai/decisions";
import { getAptitudeReport } from "@/lib/aptitude/queries";

export default async function AIGeneralPage() {
  noStore();
  const [data, decisions, aptitude] = await Promise.all([
    getAIHubData(),
    getDecisionRecommendations(),
    getAptitudeReport(),
  ]);

  const hasFin = data.financeSummary && (data.financeSummary.totalCollected > 0 || data.financeSummary.totalPending > 0);

  // Ad-specific interactive items only (recommendations + drafts with dismiss/promote/archive)
  const adWorkItems: any[] = [];

  data.recommendations.slice(0, 3).forEach((r: any) => {
    const payload = JSON.parse(r.recommendationJson);
    adWorkItems.push({
      type: "recommendation",
      id: `reco-${r.id}`,
      recoId: r.id,
      title: r.title,
      description: r.summary,
      meta: `${r.platform.toUpperCase()} · $${(payload.budgetSuggestion || 0).toLocaleString()}/día`,
      priority: r.priority === "high" ? "high" : "medium",
      href: "/admin/ai/ads",
      budgetLabel: `${r.platform.toUpperCase()} · $${(payload.budgetSuggestion || 0).toLocaleString()}/día`,
    });
  });

  data.drafts.slice(0, 2).forEach((d: any) => {
    adWorkItems.push({
      type: "draft",
      id: `draft-${d.id}`,
      draftId: d.id,
      title: d.aiSummary || "Campaña sin título",
      description: `${d.platform.toUpperCase()} · ${d.objective} · $${(d.budgetDaily || 0).toLocaleString()}/día`,
      meta: `Score IA: ${d.aiScore || "—"}%`,
      priority: "medium",
      href: "/admin/ai/ads",
      scoreLabel: `Score IA: ${d.aiScore || "—"}%`,
    });
  });

  const hasDecisions = decisions.recommendations.length > 0;
  const hasAdWork = adWorkItems.length > 0;

  return (
    <div className="h-[calc(100vh-8rem)]">
      <NexoraAIShell contextName="General" contextIcon={<Sparkles className="w-5 h-5 text-ink-0" />}>
        
        <div className="space-y-8">

          {/* ─── Row 1: Decision Intelligence ─── */}
          <DecisionQueue data={decisions} />

          {/* ─── Row 2: Ad-specific Interactive WorkQueue ─── */}
          <WorkQueue items={adWorkItems} />

          {/* ─── Row 3: Context Status Cards ─── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Finance snapshot */}
            {hasFin && data.financeSummary && (
              <Link href={data.financeSummary.totalPending > 0 ? "/admin/ai/finances?tab=pendiente" : "/admin/ai/finances"} className="block group">
                <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 transition-colors hover:border-[color:var(--hairline-strong)] h-full">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-3.5 h-3.5 text-ink-4" strokeWidth={1.75} />
                    <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Finanzas</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-ink-6 ml-auto" strokeWidth={1.75} />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] text-ink-5 font-medium uppercase tracking-[0.14em] mb-1">Cobrado</p>
                      <p className="tabular text-[16px] font-semibold text-ink-0">${Math.round(data.financeSummary.totalCollected).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-ink-5 font-medium uppercase tracking-[0.14em] mb-1">Pendiente</p>
                      <p className="tabular text-[16px] font-semibold text-[color:var(--signal-warning)]">${Math.round(data.financeSummary.totalPending).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-ink-5 font-medium uppercase tracking-[0.14em] mb-1">Retención</p>
                      <p className="tabular text-[16px] font-semibold text-[color:var(--signal-success)]">{data.financeSummary.estimatedMarginPercent}%</p>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* Ads context entry */}
            <Link href="/admin/ai/ads" className="block group">
              <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 transition-colors hover:border-[color:var(--hairline-strong)] h-full">
                <div className="flex items-center gap-2 mb-4">
                  <Megaphone className="w-3.5 h-3.5 text-ink-4" strokeWidth={1.75} />
                  <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Ads &amp; Performance</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-ink-6 ml-auto" strokeWidth={1.75} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] text-ink-5 font-medium uppercase tracking-[0.14em] mb-1">Alertas</p>
                    <p className="tabular text-[16px] font-semibold text-ink-0">{data.recommendations.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-5 font-medium uppercase tracking-[0.14em] mb-1">Borradores</p>
                    <p className="tabular text-[16px] font-semibold text-[color:var(--signal-warning)]">{data.drafts.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-5 font-medium uppercase tracking-[0.14em] mb-1">Estado</p>
                    <p className={`text-[13px] font-medium ${data.recommendations.length > 0 || data.drafts.length > 0 ? "text-[color:var(--signal-success)]" : "text-ink-6"}`}>
                      {data.recommendations.length > 0 || data.drafts.length > 0 ? "Con actividad" : "Sin actividad"}
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Aptitude summary card */}
            {aptitude.summary.totalProducts > 0 && (
              <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-3.5 h-3.5 text-ink-4" strokeWidth={1.75} />
                  <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Aptitud</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-ink-6 ml-auto" strokeWidth={1.75} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] text-ink-5 font-medium uppercase tracking-[0.14em] mb-1">Tienda apta</p>
                    <p className="tabular text-[16px] font-semibold text-[color:var(--signal-success)]">{aptitude.summary.channelApt}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-5 font-medium uppercase tracking-[0.14em] mb-1">Ads apto</p>
                    <p className="tabular text-[16px] font-semibold text-[color:var(--signal-success)]">{aptitude.summary.adsApt}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-5 font-medium uppercase tracking-[0.14em] mb-1">Bloqueados</p>
                    <p className="tabular text-[16px] font-semibold text-[color:var(--signal-danger)]">{aptitude.summary.channelNotApt + aptitude.summary.adsNotApt}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent commands */}
            {data.recentCommands.length > 0 && (
              <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-3.5 h-3.5 text-ink-5" strokeWidth={1.75} />
                  <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Últimos comandos</span>
                </div>
                <div className="space-y-2.5">
                  {data.recentCommands.slice(0, 3).map((cmd) => {
                    const label = cmd.message.replace('Comando recibido: "', '').replace('"', '');
                    return (
                      <div key={cmd.id} className="flex items-center gap-3">
                        <Sparkles className="w-3 h-3 text-ink-6 shrink-0" strokeWidth={1.75} />
                        <span className="text-[12px] text-ink-0 truncate flex-1">{label}</span>
                        <span className="tabular text-[10px] text-ink-5 font-medium shrink-0">{getRelativeTime(cmd.createdAt)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ─── Row 4: Aptitude Panel ─── */}
          {aptitude.summary.totalProducts > 0 && <AptitudePanel report={aptitude} />}

          {/* ─── Row 5: Command Input ─── */}
          <GlobalCommandInput />

          {/* ─── Zero State ─── */}
          {!hasDecisions && !hasAdWork && !hasFin && (
            <div className="text-center py-16 border border-dashed border-[color:var(--hairline-strong)] rounded-[var(--r-md)] bg-[var(--surface-0)]">
              <Sparkles className="w-8 h-8 text-ink-6 mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-[15px] font-medium text-ink-0 mb-2">Nexora AI está lista.</h3>
              <p className="text-[13px] text-ink-5 max-w-md mx-auto leading-[1.55]">
                Usá el comando o entrá a un contexto para empezar a operar. Las alertas y tareas aparecerán acá automáticamente.
              </p>
            </div>
          )}

        </div>

      </NexoraAIShell>
    </div>
  );
}

function getRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
