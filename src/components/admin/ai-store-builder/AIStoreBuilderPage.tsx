"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart,
  Box,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileText,
  GripVertical,
  LayoutTemplate,
  Monitor,
  Package,
  Paintbrush,
  RefreshCw,
  Rocket,
  Settings2,
  Smartphone,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";

import { AIStoreDrawer } from "@/components/admin/ai-store-builder/AIStoreDrawer";
import {
  AIProjectStatusBadge,
  AIStyleBadge,
  AIRecommendationBadge,
} from "@/components/admin/ai-store-builder/AIStoreBadge";
import { TableSkeleton } from "@/components/admin/orders/TableSkeleton";
import { cn } from "@/lib/utils";
import { MOCK_AI_PROJECT } from "@/lib/mocks/ai-store-builder";
import { generateAIStoreDraft, publishStoreAction, saveDraftAction } from "@/lib/store-engine/actions";
import type { AIProposal } from "@/types/ai-store-builder";
import type { BlockType } from "@/types/store-engine";

type TabValue = "resumen" | "configuracion" | "estilo" | "catalogo" | "propuestas" | "ajustes" | "preview" | "publicacion";
type VisualScenario = "live" | "empty" | "error";

type DrawerContent =
  | { kind: "proposal"; data: AIProposal }
  | { kind: "block"; data: { label: string; description: string; type: string } }
  | { kind: "publish_check"; data: { item: string; status: boolean; detail: string } };

interface ToastMessage { id: string; title: string; description: string; }

export function AIStoreBuilderPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("resumen");
  const [visualScenario, setVisualScenario] = useState<VisualScenario>("live");
  const [isLoading, setIsLoading] = useState(true);
  const [drawerContent, setDrawerContent] = useState<DrawerContent | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => { if (!isLoading) return; const t = window.setTimeout(() => setIsLoading(false), 720); return () => window.clearTimeout(t); }, [isLoading]);

  const tabs: Array<{ label: string; value: TabValue; icon: React.ReactNode }> = [
    { label: "Resumen", value: "resumen", icon: <BarChart className="h-3.5 w-3.5" /> },
    { label: "Configuracion", value: "configuracion", icon: <Settings2 className="h-3.5 w-3.5" /> },
    { label: "Estilo", value: "estilo", icon: <Paintbrush className="h-3.5 w-3.5" /> },
    { label: "Catalogo", value: "catalogo", icon: <Package className="h-3.5 w-3.5" /> },
    { label: "Propuestas IA", value: "propuestas", icon: <Sparkles className="h-3.5 w-3.5" /> },
    { label: "Ajustes rapidos", value: "ajustes", icon: <LayoutTemplate className="h-3.5 w-3.5" /> },
    { label: "Vista previa", value: "preview", icon: <Monitor className="h-3.5 w-3.5" /> },
    { label: "Publicacion", value: "publicacion", icon: <Rocket className="h-3.5 w-3.5" /> },
  ];

  const handleTabChange = (v: TabValue) => { if (v === activeTab) return; setActiveTab(v); setVisualScenario("live"); setIsLoading(true); };

  const pushToast = (title: string, description: string) => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setToasts((c) => [...c, { id, title, description }]);
    window.setTimeout(() => setToasts((c) => c.filter((t) => t.id !== id)), 3200);
  };

  const openDrawer = (c: DrawerContent) => setDrawerContent(c);
  const closeDrawer = () => setDrawerContent(null);
  const handleAction = (action: string) => { pushToast("Accion ejecutada", action); };

  return (
    <div className="animate-in fade-in space-y-8 pb-32 duration-700">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
              <Sparkles className="h-3 w-3" />
              Feature Exclusiva
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#111111]">Crear tienda con IA</h1>
          <p className="mt-1 text-[15px] font-medium text-[#666666]">Un constructor guiado paso a paso para generar tu e-commerce con inteligencia artificial.</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <ToolbarSelect icon={<AlertTriangle className="h-4 w-4" />} label="Escenario" onChange={(v) => setVisualScenario(v as VisualScenario)} options={["live", "empty", "error"]} value={visualScenario} />
          <button className="flex items-center gap-2 rounded-xl bg-[#111111] px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={async () => { try { await generateAIStoreDraft({ brandName: MOCK_AI_PROJECT.config.brandName, industry: MOCK_AI_PROJECT.config.industry, targetAudience: MOCK_AI_PROJECT.config.targetAudience, country: MOCK_AI_PROJECT.config.country, currency: MOCK_AI_PROJECT.config.currency, brandTone: MOCK_AI_PROJECT.brandStyle.copyTone, styleCategory: MOCK_AI_PROJECT.brandStyle.styleCategory, primaryColor: MOCK_AI_PROJECT.brandStyle.primaryColor, secondaryColor: MOCK_AI_PROJECT.brandStyle.secondaryColor, fontFamily: MOCK_AI_PROJECT.brandStyle.typography, suggestedHeroText: MOCK_AI_PROJECT.proposals[0]?.suggestedHeroText ?? "Bienvenidos", suggestedHomepageBlocks: ["hero", "featured_products", "benefits", "testimonials", "faq", "newsletter"] as BlockType[] }); handleAction("Tienda generada con IA correctamente"); } catch { handleAction("Error al generar tienda con IA"); } }} type="button">
            <Wand2 className="h-4 w-4" />
            Autocompletar con IA
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-sm">
        <div aria-label="Pasos de IA Builder" className="flex items-center gap-8 overflow-x-auto border-b border-[#EAEAEA] bg-[#FAFAFA]/50 px-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" role="tablist">
          {tabs.map((tab) => (
            <button key={tab.value} aria-selected={activeTab === tab.value} className={cn("group relative whitespace-nowrap py-4 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30", activeTab === tab.value ? "text-[#111111]" : "text-[#888888] hover:text-[#111111]")} onClick={() => handleTabChange(tab.value)} role="tab" type="button">
              <span className="flex items-center gap-2">{tab.icon}{tab.label}</span>
              {activeTab === tab.value ? <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-[#111111]" /> : null}
            </button>
          ))}
        </div>

        <div className="bg-[#FAFAFA]/30" role="tabpanel">
          {isLoading ? (
            <TableSkeleton />
          ) : visualScenario === "error" ? (
            <ErrorState onRetry={() => setVisualScenario("live")} />
          ) : visualScenario === "empty" ? (
            <EmptyState onReset={() => setVisualScenario("live")} />
          ) : activeTab === "resumen" ? (
            <SummaryView onNavigate={handleTabChange} project={MOCK_AI_PROJECT} />
          ) : activeTab === "configuracion" ? (
            <ConfigView onAction={handleAction} onNavigate={handleTabChange} />
          ) : activeTab === "estilo" ? (
            <StyleView onAction={handleAction} onNavigate={handleTabChange} project={MOCK_AI_PROJECT} />
          ) : activeTab === "catalogo" ? (
            <CatalogView onAction={handleAction} onNavigate={handleTabChange} project={MOCK_AI_PROJECT} />
          ) : activeTab === "propuestas" ? (
            <ProposalsView openDrawer={openDrawer} onAction={handleAction} project={MOCK_AI_PROJECT} />
          ) : activeTab === "ajustes" ? (
            <QuickAdjustView openDrawer={openDrawer} project={MOCK_AI_PROJECT} />
          ) : activeTab === "preview" ? (
            <PreviewView project={MOCK_AI_PROJECT} onAction={handleAction} />
          ) : (
            <PublishView openDrawer={openDrawer} project={MOCK_AI_PROJECT} onAction={handleAction} />
          )}
        </div>
      </div>

      <AIStoreDrawer content={drawerContent} isOpen={drawerContent !== null} onClose={closeDrawer} onAction={handleAction} />
      <ToastViewport onDismiss={(id) => setToasts((c) => c.filter((t) => t.id !== id))} toasts={toasts} />
    </div>
  );
}

/* ─── Vistas ─── */

function SummaryView({ onNavigate, project }: { onNavigate: (t: TabValue) => void; project: typeof MOCK_AI_PROJECT }) {
  return (
    <div className="space-y-8 p-6 lg:p-10">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Estado del proyecto" value={<AIProjectStatusBadge status={project.status} />} />
        <KpiCard label="Propuestas Generadas" value={project.proposals.length.toString()} accent />
        <KpiCard label="Estilo Actual" value={<AIStyleBadge style={project.brandStyle.styleCategory} />} />
        <KpiCard label="Modo Catalogo" value={project.catalogStructure.useRealCatalog ? "Catalogo Real" : "Demo Mocks"} />
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><Sparkles className="h-6 w-6" /></div>
            <div>
              <h3 className="text-lg font-black text-[#111111]">¡Tus propuestas estan listas!</h3>
              <p className="mt-1 max-w-xl text-sm font-medium text-emerald-800/80">La IA ha analizado tu marca "{project.config.brandName}" y ha generado {project.proposals.length} variantes estructuradas y pensadas para vender en la industria de {project.config.industry}.</p>
            </div>
          </div>
          <div className="shrink-0">
            <button className="flex items-center gap-2 rounded-xl bg-[#111111] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => onNavigate("propuestas")} type="button">
              Ver propuestas
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Progreso del Setup</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StepCard number="01" title="Configuracion Inicial" description="Inputs definidos" isDone onClick={() => onNavigate("configuracion")} />
          <StepCard number="02" title="Estilo y Catalogo" description="Assets y tono mapeados" isDone onClick={() => onNavigate("estilo")} />
          <StepCard number="03" title="Seleccion IA" description="Propuesta elegida" isDone={!!project.selectedProposalId} onClick={() => onNavigate("propuestas")} />
        </div>
      </div>
    </div>
  );
}

function ConfigView({ onAction, onNavigate }: { onAction: (a: string) => void; onNavigate: (t: TabValue) => void }) {
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6 lg:p-10">
      <div>
        <h2 className="text-xl font-extrabold text-[#111111]">Definicion de Marca</h2>
        <p className="mt-1 text-sm text-gray-500">Estos inputs guiarán a la IA para redactar copy y armar la estructura semantica de tu tienda.</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormBlock label="Nombre de tu marca">
            <input className="w-full rounded-xl border border-[#EAEAEA] bg-white px-4 py-2.5 text-sm font-medium text-[#111111] outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" defaultValue="Aura Essentials" type="text" />
          </FormBlock>
          <FormBlock label="Rubro / Industria">
            <select className="w-full rounded-xl border border-[#EAEAEA] bg-white px-4 py-2.5 text-sm font-medium text-[#111111] outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
              <option>Cuidado Personal & Belleza</option>
              <option>Indumentaria y Moda</option>
              <option>Electronica</option>
            </select>
          </FormBlock>
        </div>
        <FormBlock label="Publico objetivo (target)">
          <textarea className="h-20 w-full resize-none rounded-xl border border-[#EAEAEA] bg-white px-4 py-2.5 text-sm font-medium text-[#111111] outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" defaultValue="Mujeres 25-45, interesadas en skincare organico y cruelty-free" />
        </FormBlock>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormBlock label="Pais principal">
            <input className="w-full rounded-xl border border-[#EAEAEA] bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-500 outline-none" disabled defaultValue="Argentina" type="text" />
          </FormBlock>
          <FormBlock label="Moneda base">
            <input className="w-full rounded-xl border border-[#EAEAEA] bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-500 outline-none" disabled defaultValue="ARS" type="text" />
          </FormBlock>
        </div>
      </div>

      <div className="flex justify-end border-t border-[#EAEAEA] pt-6">
        <button className="flex items-center gap-2 rounded-xl bg-[#111111] px-6 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => { onAction("Configuracion guardada"); onNavigate("estilo"); }} type="button">
          Siguiente paso
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function StyleView({ onAction, onNavigate, project }: { onAction: (a: string) => void; onNavigate: (t: TabValue) => void; project: typeof MOCK_AI_PROJECT }) {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 lg:p-10">
      <div>
        <h2 className="text-xl font-extrabold text-[#111111]">Aspecto y Tono</h2>
        <p className="mt-1 text-sm text-gray-500">La identidad visual base que la IA tomará para renderizar las propuestas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {["Minimal Premium", "Conversion Alta", "Editorial / Fashion"].map((v) => (
          <button key={v} className={cn("flex flex-col gap-2 rounded-2xl border p-5 text-left transition-all", v === "Minimal Premium" ? "border-[#111111] bg-[#FAFAFA] shadow-sm" : "border-[#EAEAEA] bg-white opacity-60 hover:opacity-100")} onClick={() => onAction(`Estilo preferido: ${v}`)} type="button">
            <AIStyleBadge style={v === "Minimal Premium" ? "minimal_premium" : v === "Conversion Alta" ? "high_conversion" : "editorial"} />
            <span className="mt-2 text-sm font-bold text-[#111111]">{v}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 pt-4">
        <FormBlock label="Color Principal">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full border border-gray-200 shadow-inner" style={{ backgroundColor: project.brandStyle.primaryColor }} />
            <input className="w-full rounded-xl border border-[#EAEAEA] bg-white px-4 py-2.5 text-sm font-medium text-[#111111] font-mono outline-none" defaultValue={project.brandStyle.primaryColor} type="text" />
          </div>
        </FormBlock>
        <FormBlock label="Color Secundario">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full border border-gray-200 shadow-inner" style={{ backgroundColor: project.brandStyle.secondaryColor }} />
            <input className="w-full rounded-xl border border-[#EAEAEA] bg-white px-4 py-2.5 text-sm font-medium text-[#111111] font-mono outline-none" defaultValue={project.brandStyle.secondaryColor} type="text" />
          </div>
        </FormBlock>
      </div>

      <div className="flex justify-end border-t border-[#EAEAEA] pt-6 gap-3">
        <button className="rounded-xl border border-[#EAEAEA] bg-white px-6 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => onNavigate("configuracion")} type="button">Atras</button>
        <button className="flex items-center gap-2 rounded-xl bg-[#111111] px-6 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => { onAction("Estilos guardados"); onNavigate("catalogo"); }} type="button">
          Siguiente paso
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function CatalogView({ onAction, onNavigate, project }: { onAction: (a: string) => void; onNavigate: (t: TabValue) => void; project: typeof MOCK_AI_PROJECT }) {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 lg:p-10">
      <div>
        <h2 className="text-xl font-extrabold text-[#111111]">Catálogo y Estructura</h2>
        <p className="mt-1 text-sm text-gray-500">¿Qué tipo de información mostrará tu tienda al lanzarse?</p>
      </div>

      <div className="rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center space-x-3">
          <input defaultChecked={project.catalogStructure.useRealCatalog} id="use-real" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600" />
          <label htmlFor="use-real" className="text-sm font-bold text-[#111111]">Forzar uso de Productos Reales del Catalogo Nexora (Ignorar mocks IA)</label>
        </div>

        <div className="space-y-4 pt-4 border-t border-[#EAEAEA]">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Estructura de navegacion inferida</h3>
          <div className="flex flex-wrap gap-2">
            {project.catalogStructure.suggestedNavigation.map((cat) => (
              <span key={cat} className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600">{cat}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t border-[#EAEAEA] pt-6 gap-3">
        <button className="rounded-xl border border-[#EAEAEA] bg-white px-6 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => onNavigate("estilo")} type="button">Atras</button>
        <button className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={async () => { try { await generateAIStoreDraft({ brandName: project.config.brandName, industry: project.config.industry, targetAudience: project.config.targetAudience, country: project.config.country, currency: project.config.currency, brandTone: project.brandStyle.copyTone, styleCategory: project.brandStyle.styleCategory, primaryColor: project.brandStyle.primaryColor, secondaryColor: project.brandStyle.secondaryColor, fontFamily: project.brandStyle.typography, suggestedHeroText: project.proposals[0]?.suggestedHeroText ?? "Bienvenidos", suggestedHomepageBlocks: ["hero", "featured_products", "benefits", "testimonials", "faq", "newsletter"] as BlockType[] }); onAction("Propuestas generadas exitosamente"); onNavigate("propuestas"); } catch { onAction("Error al generar propuestas"); } }} type="button">
          <Sparkles className="h-4 w-4" />
          Generar Propuestas (IA)
        </button>
      </div>
    </div>
  );
}

function ProposalsView({ openDrawer, onAction, project }: { openDrawer: (c: DrawerContent) => void; onAction: (a: string) => void; project: typeof MOCK_AI_PROJECT }) {
  return (
    <div className="space-y-8 p-6 lg:p-10">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-extrabold text-[#111111]">Propuestas Visules IA</h2>
          <p className="mt-1 text-sm text-gray-500">Seleccioná la que mejor se adapte a tu objetivo comercial.</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-5 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => onAction("Regenerando todo (mock)")} type="button">
          <RefreshCw className="h-4 w-4" />
          Regenerar Lote
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {project.proposals.map((prop) => {
          const isSelected = project.selectedProposalId === prop.id;
          return (
            <div key={prop.id} className={cn("group flex flex-col gap-5 rounded-2xl border p-1 shadow-sm transition-all", isSelected ? "border-[#111111] bg-[#111111]/5" : "border-[#EAEAEA] bg-white hover:border-gray-300")}>
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-gray-100 border border-gray-100">
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <Monitor className="h-10 w-10 opacity-20" />
                </div>
                {/* Visual mock of preview */}
                <div className="absolute top-0 left-0 w-full bg-white h-4 border-b border-gray-100 flex items-center px-2 gap-1.5 opacity-50">
                   <div className="rounded-full w-1.5 h-1.5 bg-gray-300"></div><div className="rounded-full w-1.5 h-1.5 bg-gray-300"></div><div className="rounded-full w-1.5 h-1.5 bg-gray-300"></div>
                </div>
                
                {isSelected && (
                  <div className="absolute right-3 top-7">
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm"><CheckCircle2 className="h-3 w-3" /> Seleccionada</span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-1 flex-col px-4 pb-4">
                <div className="mb-3"><AIStyleBadge style={prop.styleCategory} /></div>
                <h3 className="text-base font-extrabold text-[#111111]">{prop.name}</h3>
                <p className="mt-2 text-sm font-medium text-gray-500 line-clamp-2">{prop.shortSummary}</p>
                
                <div className="mt-4 pt-4 border-t border-[#EAEAEA] space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#888888]">Fortalezas top</p>
                  <ul className="text-xs font-semibold text-gray-600 space-y-1">
                    {prop.strengths.slice(0, 2).map((str, i) => <li key={i}>• {str}</li>)}
                  </ul>
                </div>
                
                <div className="mt-auto pt-6 flex items-center gap-2">
                  <button className="flex-1 justify-center rounded-xl border border-[#EAEAEA] bg-white px-4 py-2.5 text-[12px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => openDrawer({ kind: "proposal", data: prop })} type="button">Detalles</button>
                  <button className={cn("flex-1 justify-center rounded-xl px-4 py-2.5 text-[12px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30", isSelected ? "bg-emerald-100 text-emerald-800" : "bg-[#111111] text-white hover:bg-black")} onClick={() => onAction(`Seleccionaste: ${prop.name}`)} type="button">
                    {isSelected ? "Seleccionada" : "Usar propuesta"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuickAdjustView({ openDrawer, project }: { openDrawer: (c: DrawerContent) => void; project: typeof MOCK_AI_PROJECT }) {
  const [blocks, setBlocks] = useState(project.catalogStructure.suggestedHomepageBlocks);
  
  const moveBlock = (index: number, up: boolean) => {
    if ((up && index === 0) || (!up && index === blocks.length - 1)) return;
    const newBlocks = [...blocks];
    const target = up ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[target]] = [newBlocks[target], newBlocks[index]];
    setBlocks(newBlocks);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 lg:p-10">
      <div>
        <h2 className="text-xl font-extrabold text-[#111111]">Ajustes Rapidos de Homepage</h2>
        <p className="mt-1 text-sm text-gray-500">Ordená o editá levemente los bloques estructurales que la IA generó antes de ver el preview final.</p>
      </div>

      <div className="rounded-2xl border border-[#EAEAEA] bg-white shadow-sm overflow-hidden">
        <ul className="divide-y divide-[#EAEAEA]">
          {blocks.map((block, i) => (
            <li key={i} className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-0.5 text-gray-300">
                  <button className="hover:text-[#111111]" onClick={() => moveBlock(i, true)} disabled={i===0} type="button"><GripVertical className="h-4 w-4" /></button>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#111111]">{block}</p>
                  <p className="text-xs text-gray-500 max-w-sm truncate">Bloque pre-renderizado segun estilo base.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" onClick={() => openDrawer({ kind: "block", data: { label: block, description: "Content goes here", type: "Visual Block" } })} type="button"><Settings2 className="h-4 w-4" /></button>
                 <button className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors" type="button"><X className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PreviewView({ project, onAction }: { project: typeof MOCK_AI_PROJECT; onAction: (a: string) => void }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  return (
    <div className="space-y-6 p-6 lg:p-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-[#111111]">Vista Previa (Mock)</h2>
        <div className="flex rounded-lg border border-[#EAEAEA] bg-gray-50 p-1">
          <button className={cn("rounded-md px-3 py-1.5 text-sm font-bold transition-all", device === "desktop" ? "bg-white text-[#111111] shadow-sm" : "text-gray-500 hover:text-[#111111]")} onClick={() => setDevice("desktop")} type="button"><Monitor className="h-4 w-4" /></button>
          <button className={cn("rounded-md px-3 py-1.5 text-sm font-bold transition-all", device === "mobile" ? "bg-white text-[#111111] shadow-sm" : "text-gray-500 hover:text-[#111111]")} onClick={() => setDevice("mobile")} type="button"><Smartphone className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#EAEAEA] bg-gray-100 p-8 flex justify-center overflow-hidden min-h-[600px] relative items-center">
         <div className={cn("bg-white border border-gray-200 shadow-2xl relative transition-all duration-500 rounded-lg overflow-hidden flex flex-col", device === "desktop" ? "w-full max-w-4xl h-[500px]" : "w-[320px] h-[600px]")}>
            <div className="h-10 bg-gray-50 border-b border-gray-200 flex items-center px-4 gap-2">
               <div className="rounded-full w-2.5 h-2.5 bg-gray-300"></div><div className="rounded-full w-2.5 h-2.5 bg-gray-300"></div><div className="rounded-full w-2.5 h-2.5 bg-gray-300"></div>
               <div className="ml-4 bg-white border border-gray-200 rounded px-3 py-0.5 text-[10px] text-gray-400 font-mono w-48 truncate">https://{project.config.brandName.toLowerCase().replace(" ", "")}.nexora.style</div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-gray-50 to-white">
                <Box className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-xl w-full font-black text-gray-800">{project.proposals[0].suggestedHeroText}</p>
                <div className="mt-6 px-6 py-2 bg-[#111111] text-white rounded font-bold text-xs">Simulacion de tienda</div>
            </div>
         </div>
         
         <div className="absolute right-6 bottom-6 flex gap-3">
            <button className="flex items-center gap-2 rounded-xl bg-white border border-[#EAEAEA] px-5 py-2.5 text-[13px] font-bold text-[#111111] shadow-sm transition-colors hover:bg-gray-50" onClick={() => onAction("Abriendo en nueva ventana (mock)")} type="button">
              <ExternalLink className="h-4 w-4" /> Expandir
            </button>
         </div>
      </div>
    </div>
  );
}

function PublishView({ openDrawer, project, onAction }: { openDrawer: (c: DrawerContent) => void; project: typeof MOCK_AI_PROJECT; onAction: (a: string) => void }) {
  const pr = project.publishReadiness;
  const readyChecks = [
    { id: "branding", label: "Branding Base", ok: pr.branding, message: "Logo y fuentes" },
    { id: "catalog", label: "Catalogo Conectado", ok: pr.catalog, message: "Productos mapeados" },
    { id: "navigation", label: "Menús Navegacion", ok: pr.navigation, message: "Requiere review de links" },
    { id: "payments", label: "Pasarela Pagos", ok: pr.payments, message: "No conectada" },
    { id: "policies", label: "Politicas Legales", ok: pr.policies, message: "Plantillas generadas" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 lg:p-10">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div>
           <h2 className="text-2xl font-black tracking-tight text-[#111111]">¡Todo listo para desplegar!</h2>
           <p className="mt-1 text-[15px] font-medium text-gray-500">Revisa los items antes de habilitar tu tienda generada por IA al publico.</p>
        </div>
        <div className="flex flex-col gap-2 min-w-[200px]">
           <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-[14px] font-bold text-white transition-colors hover:bg-emerald-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={async () => { try { await publishStoreAction(); onAction("Tienda publicada correctamente"); } catch { onAction("Error al publicar tienda"); } }} type="button">
            <Rocket className="h-4 w-4" />
            Publicar Tienda
          </button>
           <button className="w-full justify-center rounded-xl border border-[#EAEAEA] bg-white px-6 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={async () => { try { await saveDraftAction(); onAction("Guardado como borrador correctamente"); } catch { onAction("Error al guardar borrador"); } }} type="button">Guardar borrador</button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-sm">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888] mb-4">Readiness Checklist</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {readyChecks.map(chk => (
             <button key={chk.id} className="text-left flex items-start gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => openDrawer({ kind: "publish_check", data: { item: chk.label, status: chk.ok, detail: chk.message }})} type="button">
               <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-1", chk.ok ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600")}>
                  {chk.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
               </div>
               <div>
                  <p className="text-sm font-bold text-[#111111]">{chk.label}</p>
                  <p className="text-xs font-medium text-gray-500">{chk.message}</p>
               </div>
             </button>
           ))}
        </div>
      </div>
      
      <div className="rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-sm flex items-center justify-between">
         <div className="flex items-center gap-4">
             <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50"><Box className="h-5 w-5 text-gray-400" /></div>
             <div>
                <p className="text-sm font-bold text-[#111111]">Estructura de alojamiento (Hosting)</p>
                <p className="text-xs font-medium text-gray-500">La tienda se servirá bajo Edge Caching de Nexora.</p>
             </div>
         </div>
      </div>
    </div>
  );
}


/* ─── Shared Components ─── */

function KpiCard({ label, value, accent = false }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl border border-[#EAEAEA] p-5 shadow-sm", accent ? "bg-[#111111]" : "bg-white")}>
      <p className={cn("text-[11px] font-bold uppercase tracking-[0.18em]", accent ? "text-gray-400" : "text-[#888888]")}>{label}</p>
      <div className={cn("mt-3 flex items-center truncate text-base font-black tracking-tight h-8", accent ? "text-white" : "text-[#111111]")}>{value}</div>
    </div>
  );
}

function StepCard({ number, title, description, isDone, onClick }: { number: string; title: string; description: string; isDone: boolean; onClick: () => void }) {
  return (
    <button className={cn("group flex flex-col items-start gap-4 rounded-2xl border p-5 text-left shadow-sm transition-all text-sm", isDone ? "border-[#111111]/20 bg-white hover:border-[#111111]/40" : "border-[#EAEAEA] bg-gray-50 opacity-60")} onClick={onClick} type="button">
       <div className="flex w-full items-center justify-between">
          <span className="font-mono text-xs font-bold text-gray-400">{number}</span>
          {isDone ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <div className="h-4 w-4 rounded-full border-2 border-gray-300" />}
       </div>
       <div>
         <p className="font-bold text-[#111111]">{title}</p>
         <p className="mt-1 text-xs font-medium text-gray-500">{description}</p>
       </div>
    </button>
  );
}

function FormBlock({ label, children, optional }: { label: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-bold text-[#111111]">
        {label}
        {optional ? <span className="ml-1 font-medium text-[#888888]">(Opcional)</span> : null}
      </span>
      {children}
    </label>
  );
}

function ToolbarSelect({ icon, label, onChange, options, value }: { icon: React.ReactNode; label: string; onChange: (v: string) => void; options: string[]; value: string }) {
  return (
    <label className="flex min-w-[170px] items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-3 py-2.5 text-[13px] font-bold text-gray-600 shadow-sm">
      <span className="shrink-0 text-gray-400">{icon}</span>
      <span className="text-[#666666]">{label}</span>
      <select className="w-full bg-transparent text-right font-semibold text-[#111111] outline-none" onChange={(e) => onChange(e.target.value)} value={value} aria-label={label}>
        {options.map((o) => <option key={o} value={o}>{o === "live" ? "Operativa" : o === "empty" ? "Vacio" : "Error"}</option>)}
      </select>
    </label>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-gray-100 bg-gray-50 shadow-sm"><FileText className="h-8 w-8 text-gray-300" /></div>
      <h3 className="text-xl font-extrabold text-[#111111]">Aun no configuraste tu tienda</h3>
      <p className="mt-2 max-w-md text-[15px] font-medium text-[#888888]">Estado vacio simulado para QA. Empieza configurando los valores requeridos.</p>
      <button className="mt-6 rounded-xl bg-[#111111] px-6 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={onReset} type="button">Volver al editor</button>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-red-100 bg-red-50 shadow-sm"><AlertTriangle className="h-8 w-8 text-red-400" /></div>
      <h3 className="text-xl font-extrabold text-[#111111]">La IA no pudo procesar tu pedido</h3>
      <p className="mt-2 max-w-md text-[15px] font-medium text-[#888888]">Hubo un pico de demanda o el prompt ingresado fue invalido. Estado mock para QA.</p>
      <button className="mt-6 rounded-xl bg-[#111111] px-6 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={onRetry} type="button">Reintentar generacion</button>
    </div>
  );
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div aria-live="polite" className="fixed right-6 top-20 z-[60] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((t) => (
        <div key={t.id} className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-xl animate-in slide-in-from-right-5 fade-in duration-300">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-sm font-bold text-[#111111]">{t.title}</p><p className="mt-1 text-sm font-medium text-gray-500">{t.description}</p></div>
            <button aria-label="Cerrar" className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#111111]" onClick={() => onDismiss(t.id)} type="button"><X className="h-4 w-4" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}
