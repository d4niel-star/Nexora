"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart,
  Box,
  CheckCircle2,
  ExternalLink,
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
  FileText
} from "lucide-react";

import { AIStoreDrawer } from "@/components/admin/ai-store-builder/AIStoreDrawer";
import {
  AIProjectStatusBadge,
  AIStyleBadge,
} from "@/components/admin/ai-store-builder/AIStoreBadge";
import { TableSkeleton } from "@/components/admin/orders/TableSkeleton";
import { cn } from "@/lib/utils";

import { saveAIBuilderConfig, generateAIProposalsAction, selectProposalAction, applyAIProposalToStoreAction } from "@/lib/store-engine/ai-builder/actions";
import type { AIProposal } from "@/types/ai-store-builder";

type TabValue = "resumen" | "configuracion" | "estilo" | "catalogo" | "propuestas" | "ajustes" | "preview" | "publicacion";
type VisualScenario = "live" | "empty" | "error";

type DrawerContent =
  | { kind: "proposal"; data: any }
  | { kind: "block"; data: { label: string; description: string; type: string } }
  | { kind: "publish_check"; data: { item: string; status: boolean; detail: string } };

interface ToastMessage { id: string; title: string; description: string; }

export function AIStoreBuilderPage({ initialDraft }: { initialDraft: any }) {
  const [isPending, startTransition] = useTransition();
  const brief = initialDraft?.briefJson ? JSON.parse(initialDraft.briefJson) : { brandName: "", industry: "General", targetAudience: "", country: "AR", currency: "ARS" };
  const baseStyle = initialDraft?.style || "minimal_premium";

  const [project, setProject] = useState({
    storeId: initialDraft?.storeId || "unknown", // Need valid store ID
    config: brief,
    brandStyle: { styleCategory: baseStyle, primaryColor: brief?.primaryColor || "#111111", secondaryColor: brief?.secondaryColor || "#10B981", typography: brief?.typography || "Inter", copyTone: brief?.copyTone || "Elegante" },
    proposals: initialDraft?.proposals || [],
    catalogStructure: { useRealCatalog: true, suggestedNavigation: [], suggestedHomepageBlocks: [] },
    status: initialDraft?.status || "draft",
    publishReadiness: { branding: false, catalog: false, navigation: false, payments: false, policies: false },
    selectedProposalId: initialDraft?.selectedProposalId || null,
  });

  const isEmpty = !initialDraft && !project.config.brandName;
  const [activeTab, setActiveTab] = useState<TabValue>("resumen");
  const [visualScenario, setVisualScenario] = useState<VisualScenario>(isEmpty ? "empty" : "live");
  const [isLoading, setIsLoading] = useState(true);
  const [drawerContent, setDrawerContent] = useState<DrawerContent | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => { 
    if (!isLoading) return; 
    const t = window.setTimeout(() => setIsLoading(false), 720); 
    return () => window.clearTimeout(t); 
  }, [isLoading]);

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

  const handleTabChange = (v: TabValue) => { if (v === activeTab) return; setActiveTab(v); };

  const pushToast = (title: string, description: string) => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setToasts((c) => [...c, { id, title, description }]);
    window.setTimeout(() => setToasts((c) => c.filter((t) => t.id !== id)), 3200);
  };

  const openDrawer = (c: DrawerContent) => setDrawerContent(c);
  const closeDrawer = () => setDrawerContent(null);
  const handleAction = (action: string) => { pushToast("Accion ejecutada", action); };

  const onUpdateConfig = (key: string, value: string) => {
    setProject(prev => ({ ...prev, config: { ...prev.config, [key]: value } }));
  };

  const onUpdateStyle = (key: string, value: string) => {
    setProject(prev => ({ ...prev, brandStyle: { ...prev.brandStyle, [key]: value } }));
  };

  const handleSaveDraft = () => {
    startTransition(async () => {
      try {
        const fullBrief = { ...project.config, ...project.brandStyle };
        await saveAIBuilderConfig(project.storeId, fullBrief, project.brandStyle);
        pushToast("Borrador actulizado", "Guardado en Nexora Drafts.");
      } catch {
        pushToast("Error", "No se pudo actualizar el borrador.");
      }
    });
  };

  return (
    <div className="animate-in fade-in space-y-8 pb-32 duration-700 relative">
      {(isPending || isLoading) && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--surface-0)]/60 pointer-events-none">
            <div className="inline-flex items-center gap-2.5 bg-ink-0 text-ink-12 px-4 h-10 rounded-[var(--r-sm)] shadow-[var(--shadow-overlay)]">
               <RefreshCw className="h-4 w-4 animate-spin" strokeWidth={1.75} />
               <span className="text-[13px] font-medium">Sincronizando…</span>
            </div>
         </div>
      )}
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-5">
              <Sparkles className="h-3 w-3" strokeWidth={1.75} />
              Feature exclusiva
            </span>
          </div>
          <h1 className="text-[28px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink-0 lg:text-[32px]">Crear tienda con IA.</h1>
          <p className="mt-2 text-[14px] leading-[1.55] text-ink-5">Un constructor guiado paso a paso para generar tu e-commerce con inteligencia artificial.</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <ToolbarSelect icon={<AlertTriangle className="h-4 w-4" />} label="Escenario" onChange={(v) => setVisualScenario(v as VisualScenario)} options={["live", "empty", "error"]} value={visualScenario} />
          <button className="inline-flex items-center gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] h-9 px-3.5 text-[12px] font-medium text-ink-0 hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] transition-colors" onClick={handleSaveDraft} type="button">
            Guardar draft
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
        <div aria-label="Pasos de IA Builder" className="flex items-center gap-7 overflow-x-auto border-b border-[color:var(--hairline)] bg-[var(--surface-1)] px-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" role="tablist">
          {tabs.map((tab) => (
            <button key={tab.value} aria-selected={activeTab === tab.value} className={cn("group relative whitespace-nowrap py-4 text-[13px] font-medium transition-colors focus-visible:outline-none", activeTab === tab.value ? "text-ink-0" : "text-ink-5 hover:text-ink-0")} onClick={() => handleTabChange(tab.value)} role="tab" type="button">
              <span className="flex items-center gap-2">{tab.icon}{tab.label}</span>
              {activeTab === tab.value ? <div className="absolute inset-x-0 bottom-0 h-[2px] bg-ink-0" /> : null}
            </button>
          ))}
        </div>

        <div className="bg-[var(--surface-0)]" role="tabpanel">
          {isLoading ? (
            <TableSkeleton />
          ) : visualScenario === "error" ? (
            <ErrorState onRetry={() => setVisualScenario("live")} />
          ) : visualScenario === "empty" ? (
            <EmptyState onReset={() => { setVisualScenario("live"); setActiveTab("configuracion"); }} />
          ) : activeTab === "resumen" ? (
            <SummaryView onNavigate={handleTabChange} project={project as any} />
          ) : activeTab === "configuracion" ? (
            <ConfigView project={project as any} onChange={onUpdateConfig} onSave={handleSaveDraft} onNavigate={handleTabChange} />
          ) : activeTab === "estilo" ? (
            <StyleView project={project as any} onChange={onUpdateStyle} onSave={handleSaveDraft} onNavigate={handleTabChange} />
          ) : activeTab === "catalogo" ? (
            <CatalogView project={project as any} onGenerate={() => { 
                startTransition(async () => {
                  try {
                    await generateAIProposalsAction(project.storeId);
                    pushToast("Generacion exitosa", "Revisa tus nuevas propuestas IA.");
                    window.location.reload(); // Hard real reload to fetch new proposals
                  } catch (e: any) {
                    pushToast("Error", e.message || "Error al generar");
                  }
                });
             }} onNavigate={handleTabChange} />
          ) : activeTab === "propuestas" ? (
            <ProposalsView 
               project={project as any} 
               openDrawer={openDrawer} 
               onSelect={(id) => {
                  startTransition(async () => {
                    await selectProposalAction(project.storeId, id);
                    pushToast("Propuesta elegida", "Configuración y bloques base asegurados.");
                    setProject(p => ({...p, selectedProposalId: id }));
                  });
               }} 
            />
          ) : activeTab === "ajustes" ? (
            <QuickAdjustView openDrawer={openDrawer} project={project as any} />
          ) : activeTab === "preview" ? (
            <PreviewView project={project as any} onAction={handleAction} />
          ) : (
            <PublishView openDrawer={openDrawer} project={project as any} onPublish={() => {
                startTransition(async () => {
                   try {
                     await applyAIProposalToStoreAction(project.storeId);
                     pushToast("¡Tienda Publicada!", "Los contenidos fueron volcados al Store real.");
                     setTimeout(() => window.location.href = "/admin/store", 1500);
                   } catch(e: any) {
                     pushToast("Error", e.message || "Error al aplicar propuesta al store.");
                   }
                });
            }} />
          )}
        </div>
      </div>

      <AIStoreDrawer content={drawerContent} isOpen={drawerContent !== null} onClose={closeDrawer} onAction={handleAction} />
      <ToastViewport onDismiss={(id) => setToasts((c) => c.filter((t) => t.id !== id))} toasts={toasts} />
    </div>
  );
}

/* ─── Vistas ─── */

function SummaryView({ onNavigate, project }: { onNavigate: (t: TabValue) => void; project: any }) {
  return (
    <div className="space-y-8 p-6 lg:p-10">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Estado del proyecto" value={<AIProjectStatusBadge status={project.status} />} />
        <KpiCard label="Propuestas Generadas" value={project.proposals.length.toString()} accent />
        <KpiCard label="Estilo Actual" value={<AIStyleBadge style={project.brandStyle.styleCategory} />} />
        <KpiCard label="Store Seleccionado" value={project.config.brandName || "Sin definir"} />
      </div>

      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] text-ink-4"><Sparkles className="h-4 w-4" strokeWidth={1.75} /></div>
            <div>
              <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-ink-0">
                  {project.proposals.length > 0 ? "Tus propuestas están listas." : "IA lista para generar."}
              </h3>
              <p className="mt-1 max-w-xl text-[13px] leading-[1.55] text-ink-5">
                  {project.proposals.length > 0 
                  ? `La IA analizó tu marca "${project.config.brandName}" y generó ${project.proposals.length} variantes.` 
                  : "Completá la configuración base y dale click a generar."}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <button className="inline-flex items-center gap-2 rounded-[var(--r-sm)] bg-ink-0 h-10 px-5 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]" onClick={() => onNavigate(project.proposals.length > 0 ? "propuestas" : "configuracion")} type="button">
              {project.proposals.length > 0 ? "Ver propuestas" : "Empezar"}
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">Progreso del setup</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StepCard number="01" title="Configuración inicial" description="Inputs definidos" isDone={!!project.config.brandName} onClick={() => onNavigate("configuracion")} />
          <StepCard number="02" title="Estilo y catálogo" description="Assets y tono mapeados" isDone={!!project.brandStyle.primaryColor} onClick={() => onNavigate("estilo")} />
          <StepCard number="03" title="Selección IA" description="Propuesta elegida" isDone={!!project.selectedProposalId} onClick={() => onNavigate("propuestas")} />
        </div>
      </div>
    </div>
  );
}

function ConfigView({ project, onChange, onSave, onNavigate }: { project: any, onChange: (k:string,v:string) => void, onSave: ()=>void, onNavigate: (t: TabValue) => void }) {
  const inputClass = "w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] h-11 px-3.5 text-[14px] text-ink-0 placeholder:text-ink-6 outline-none transition-[box-shadow,border-color] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)]";
  const disabledInputClass = "w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] h-11 px-3.5 text-[14px] text-ink-5 outline-none";
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6 lg:p-10">
      <div>
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink-0">Definición de marca.</h2>
        <p className="mt-1.5 text-[13px] text-ink-5">Estos inputs guiarán a la IA para redactar copy y armar la estructura semántica de tu tienda.</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormBlock label="Nombre de tu marca">
            <input className={inputClass} value={project.config.brandName} onChange={(e) => onChange("brandName", e.target.value)} type="text" />
          </FormBlock>
          <FormBlock label="Rubro / industria">
            <select className={inputClass} value={project.config.industry} onChange={(e) => onChange("industry", e.target.value)}>
              <option>Cuidado Personal &amp; Belleza</option>
              <option>Indumentaria y Moda</option>
              <option>Electrónica</option>
              <option>General</option>
            </select>
          </FormBlock>
        </div>
        <FormBlock label="Público objetivo (target)">
          <textarea className="w-full resize-none rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] h-20 px-3.5 py-2.5 text-[14px] leading-[1.55] text-ink-0 placeholder:text-ink-6 outline-none transition-[box-shadow,border-color] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)]" value={project.config.targetAudience} onChange={(e) => onChange("targetAudience", e.target.value)} />
        </FormBlock>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormBlock label="País principal">
            <input className={disabledInputClass} disabled defaultValue="Argentina" type="text" />
          </FormBlock>
          <FormBlock label="Moneda base">
            <input className={disabledInputClass} disabled defaultValue="ARS" type="text" />
          </FormBlock>
        </div>
      </div>

      <div className="flex justify-end border-t border-[color:var(--hairline)] pt-6 gap-3">
        <button className="inline-flex items-center gap-2 rounded-[var(--r-sm)] bg-ink-0 h-10 px-5 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]" onClick={() => { onSave(); onNavigate("estilo"); }} type="button">
          Siguiente paso
          <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

function StyleView({ project, onChange, onSave, onNavigate }: { project: any, onChange: (k:string,v:string) => void, onSave: ()=>void, onNavigate: (t: TabValue) => void }) {
  const monoInputClass = "w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] h-11 px-3.5 text-[14px] text-ink-0 font-mono outline-none transition-[box-shadow,border-color] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)]";
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 lg:p-10">
      <div>
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink-0">Aspecto y tono.</h2>
        <p className="mt-1.5 text-[13px] text-ink-5">La identidad visual base que la IA tomará para renderizar las propuestas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {["Minimal Premium", "Conversion Alta", "Editorial / Fashion"].map((v) => {
          const valMap = v === "Minimal Premium" ? "minimal_premium" : v === "Conversion Alta" ? "high_conversion" : "editorial";
          const isSel = project.brandStyle.styleCategory === valMap;
          return (
          <button key={v} className={cn("flex flex-col gap-2 rounded-[var(--r-md)] border p-5 text-left transition-colors", isSel ? "border-ink-0 bg-[var(--surface-1)]" : "border-[color:var(--hairline)] bg-[var(--surface-0)] hover:border-[color:var(--hairline-strong)]")} onClick={() => onChange("styleCategory", valMap)} type="button">
            <AIStyleBadge style={valMap as any} />
            <span className="mt-2 text-[14px] font-medium text-ink-0">{v}</span>
          </button>
        )})}
      </div>

      <div className="grid grid-cols-2 gap-6 pt-4">
        <FormBlock label="Color principal (HEX)">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-[var(--r-sm)] border border-[color:var(--hairline)] shrink-0" style={{ backgroundColor: project.brandStyle.primaryColor }} />
            <input className={monoInputClass} value={project.brandStyle.primaryColor} onChange={(e) => onChange("primaryColor", e.target.value)} type="text" />
          </div>
        </FormBlock>
        <FormBlock label="Color secundario (HEX)">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-[var(--r-sm)] border border-[color:var(--hairline)] shrink-0" style={{ backgroundColor: project.brandStyle.secondaryColor }} />
            <input className={monoInputClass} value={project.brandStyle.secondaryColor} onChange={(e) => onChange("secondaryColor", e.target.value)} type="text" />
          </div>
        </FormBlock>
      </div>

      <div className="flex justify-end border-t border-[color:var(--hairline)] pt-6 gap-3">
        <button className="rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] h-10 px-5 text-[13px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)]" onClick={() => onNavigate("configuracion")} type="button">Atrás</button>
        <button className="inline-flex items-center gap-2 rounded-[var(--r-sm)] bg-ink-0 h-10 px-5 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2" onClick={() => { onSave(); onNavigate("catalogo"); }} type="button">
          Siguiente paso
          <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

function CatalogView({ project, onGenerate, onNavigate }: { project: any, onGenerate: () => void, onNavigate: (t: TabValue) => void }) {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 lg:p-10">
      <div>
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink-0">Catálogo y estructura.</h2>
        <p className="mt-1.5 text-[13px] text-ink-5">¿Qué tipo de información mostrará tu tienda al lanzarse?</p>
      </div>

      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 space-y-6">
        <div className="flex items-center gap-3">
          <input defaultChecked={project.catalogStructure.useRealCatalog} disabled id="use-real" type="checkbox" className="h-4 w-4 rounded-[var(--r-xs)] border-[color:var(--hairline-strong)] accent-ink-0" />
          <label htmlFor="use-real" className="text-[13px] font-medium text-ink-0">Usar esquema de catálogo real (los módulos fake fueron eliminados)</label>
        </div>
      </div>

      <div className="flex justify-end border-t border-[color:var(--hairline)] pt-6 gap-3">
        <button className="rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] h-10 px-5 text-[13px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)]" onClick={() => onNavigate("estilo")} type="button">Atrás</button>
        <button className="inline-flex items-center gap-2 rounded-[var(--r-sm)] bg-ink-0 h-10 px-5 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2" onClick={onGenerate} type="button">
          <Sparkles className="h-4 w-4" strokeWidth={1.75} />
          Generar propuestas
        </button>
      </div>
    </div>
  );
}

function ProposalsView({ project, openDrawer, onSelect }: { project: any, openDrawer: (c: DrawerContent) => void; onSelect: (id: string) => void }) {
  if (project.proposals.length === 0) {
     return <div className="p-10 text-center text-[13px] text-ink-5">No hay propuestas generadas. Volvé al paso anterior.</div>;
  }

  return (
    <div className="space-y-8 p-6 lg:p-10">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink-0">Propuestas visuales IA.</h2>
          <p className="mt-1.5 text-[13px] text-ink-5">Seleccioná la que mejor se adapte a tu objetivo comercial para volcar a la DB transaccional.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {project.proposals.map((prop: any) => {
          const isSelected = project.selectedProposalId === prop.id;
          return (
            <div key={prop.id} className={cn("group flex flex-col rounded-[var(--r-md)] border bg-[var(--surface-0)] transition-colors overflow-hidden", isSelected ? "border-ink-0" : "border-[color:var(--hairline)] hover:border-[color:var(--hairline-strong)]")}>
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--surface-1)] border-b border-[color:var(--hairline)]">
                <div className="absolute inset-0 flex items-center justify-center text-ink-6">
                  <Monitor className="h-10 w-10 opacity-30" strokeWidth={1.25} />
                </div>
                {isSelected && (
                  <div className="absolute right-3 top-3">
                    <span className="inline-flex items-center gap-1 h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--signal-success)]"><CheckCircle2 className="h-3 w-3" strokeWidth={2} /> Seleccionada</span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-1 flex-col p-5">
                <div className="mb-3"><AIStyleBadge style={prop.style} /></div>
                <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-ink-0">{prop.name}</h3>
                <p className="mt-2 text-[13px] leading-[1.55] text-ink-4 line-clamp-2">{prop.summary}</p>
                
                <div className="mt-4 pt-4 border-t border-[color:var(--hairline)] space-y-2">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Fortalezas top</p>
                  <ul className="text-[12px] leading-[1.5] text-ink-4 space-y-1">
                    {(JSON.parse(prop.strengthsJson || "[]")).slice(0, 2).map((str: string, i: number) => <li key={i}>· {str}</li>)}
                  </ul>
                </div>
                
                <div className="mt-auto pt-6 flex items-center gap-2">
                  <button className="flex-1 inline-flex items-center justify-center h-10 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-[12px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)]" onClick={() => openDrawer({ kind: "proposal", data: prop })} type="button">Detalles</button>
                  <button className={cn("flex-1 inline-flex items-center justify-center h-10 rounded-[var(--r-sm)] text-[12px] font-medium transition-colors", isSelected ? "border border-[color:var(--hairline-strong)] bg-[var(--surface-1)] text-ink-0" : "bg-ink-0 text-ink-12 hover:bg-ink-2")} onClick={() => onSelect(prop.id)} type="button">
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

function QuickAdjustView({ openDrawer, project }: { openDrawer: (c: DrawerContent) => void; project: any }) {
  if (!project.selectedProposalId) return <div className="p-10 text-[13px] text-ink-5">Elegí una propuesta primero.</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 lg:p-10">
      <div>
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink-0">Ajustes rápidos de homepage.</h2>
        <p className="mt-1.5 text-[13px] text-ink-5">Ordená o editá levemente los bloques estructurales que la IA generó antes de ver el preview final.</p>
      </div>

      <div className="rounded-[var(--r-md)] border border-dashed border-[color:var(--hairline-strong)] bg-[var(--surface-0)] overflow-hidden p-8 text-center text-[13px] text-ink-5 leading-[1.55]">
         El ajuste de bloques estará activo en la próxima versión. Por ahora la IA aplica la jerarquía óptima al publicar.
      </div>
    </div>
  );
}

function PreviewView({ project, onAction }: { project: any; onAction: (a: string) => void }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const prop = project.proposals.find((x: any) => x.id === project.selectedProposalId);
  const out = prop?.outputJson ? JSON.parse(prop.outputJson) : {};

  return (
    <div className="space-y-6 p-6 lg:p-10">
      <div className="flex items-center justify-between">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink-0">Vista previa analítica.</h2>
        <div className="flex rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-1">
          <button className={cn("rounded-[var(--r-xs)] px-3 py-1.5 transition-colors", device === "desktop" ? "bg-[var(--surface-0)] text-ink-0" : "text-ink-5 hover:text-ink-0")} onClick={() => setDevice("desktop")} type="button" aria-label="Desktop"><Monitor className="h-4 w-4" strokeWidth={1.75} /></button>
          <button className={cn("rounded-[var(--r-xs)] px-3 py-1.5 transition-colors", device === "mobile" ? "bg-[var(--surface-0)] text-ink-0" : "text-ink-5 hover:text-ink-0")} onClick={() => setDevice("mobile")} type="button" aria-label="Mobile"><Smartphone className="h-4 w-4" strokeWidth={1.75} /></button>
        </div>
      </div>

      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-8 flex justify-center overflow-hidden min-h-[600px] relative items-center">
         <div className={cn("bg-[var(--surface-0)] border border-[color:var(--hairline)] shadow-[var(--shadow-overlay)] rounded-[var(--r-sm)] overflow-hidden flex flex-col transition-all duration-[var(--dur-slow)]", device === "desktop" ? "w-full max-w-4xl h-[500px]" : "w-[320px] h-[600px]")}>
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <Box className="h-10 w-10 text-ink-6 mb-5" strokeWidth={1.25} />
                <p className="w-full text-[22px] font-semibold leading-[1.15] tracking-[-0.025em] text-ink-0">{out.suggestedHeroText || "Hero area"}</p>
                <div className="mt-6 inline-flex items-center rounded-[var(--r-xs)] bg-ink-0 h-7 px-3 text-[11px] font-medium text-ink-12">{prop?.name || "Sin propuesta"}</div>
            </div>
         </div>
      </div>
    </div>
  );
}

function PublishView({ openDrawer, project, onPublish }: { openDrawer: (c: DrawerContent) => void; project: any; onPublish: () => void }) {
  const isReady = project.selectedProposalId !== null;

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 lg:p-10">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div>
           <h2 className="text-[24px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink-0">Todo listo para desplegar.</h2>
           <p className="mt-1.5 text-[14px] leading-[1.55] text-ink-5">Revisá los items antes de habilitar tu tienda generada por IA al público.</p>
        </div>
        <div className="flex flex-col gap-2 min-w-[200px]">
           <button 
             disabled={!isReady}
             className="w-full inline-flex items-center justify-center gap-2 rounded-[var(--r-sm)] bg-ink-0 h-12 px-6 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:bg-ink-8 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]" 
             onClick={onPublish} 
             type="button"
            >
            <Rocket className="h-4 w-4" strokeWidth={1.75} />
            Volcar a producción
          </button>
        </div>
      </div>

      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <h3 className="mb-4 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">Readiness checklist</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button className="text-left flex items-start gap-3 p-4 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] transition-colors" type="button">
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)]", isReady ? "text-[color:var(--signal-success)]" : "text-[color:var(--signal-warning)]")}>
                  {isReady ? <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} /> : <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />}
                </div>
                <div>
                  <p className="text-[13px] font-medium text-ink-0">Draft seleccionado</p>
                  <p className="mt-0.5 text-[11px] text-ink-5">{isReady ? "Propuesta confirmada" : "Falta elegir propuesta"}</p>
                </div>
            </button>
        </div>
      </div>
    </div>
  );
}


/* ─── Shared Components ─── */

function KpiCard({ label, value, accent = false }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className={cn("rounded-[var(--r-md)] border p-5", accent ? "border-ink-0 bg-ink-0" : "border-[color:var(--hairline)] bg-[var(--surface-0)]")}>
      <p className={cn("text-[10px] font-medium uppercase tracking-[0.14em]", accent ? "text-ink-12/60" : "text-ink-5")}>{label}</p>
      <div className={cn("mt-3 flex items-center truncate text-[15px] font-semibold tracking-[-0.01em] h-8", accent ? "text-ink-12" : "text-ink-0")}>{value}</div>
    </div>
  );
}

function StepCard({ number, title, description, isDone, onClick }: { number: string; title: string; description: string; isDone: boolean; onClick: () => void }) {
  return (
    <button className={cn("group flex flex-col items-start gap-4 rounded-[var(--r-md)] border p-5 text-left transition-colors", isDone ? "border-[color:var(--hairline-strong)] bg-[var(--surface-0)] hover:bg-[var(--surface-1)]" : "border-[color:var(--hairline)] bg-[var(--surface-1)] opacity-70")} onClick={onClick} type="button">
       <div className="flex w-full items-center justify-between">
          <span className="font-mono tabular text-[11px] font-medium text-ink-5">{number}</span>
          {isDone ? <CheckCircle2 className="h-3.5 w-3.5 text-[color:var(--signal-success)]" strokeWidth={2} /> : <div className="h-3.5 w-3.5 rounded-full border border-[color:var(--hairline-strong)]" />}
       </div>
       <div>
         <p className="text-[14px] font-medium text-ink-0">{title}</p>
         <p className="mt-0.5 text-[12px] text-ink-5">{description}</p>
       </div>
    </button>
  );
}

function FormBlock({ label, children, optional }: { label: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-ink-5">
        {label}
        {optional ? <span className="ml-1 text-ink-6">(opcional)</span> : null}
      </span>
      {children}
    </label>
  );
}

function ToolbarSelect({ icon, label, onChange, options, value }: { icon: React.ReactNode; label: string; onChange: (v: string) => void; options: string[]; value: string }) {
  return (
    <label className="inline-flex min-w-[170px] items-center gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] h-9 px-3 text-[12px] font-medium text-ink-5">
      <span className="shrink-0 text-ink-6">{icon}</span>
      <span className="text-ink-5">{label}</span>
      <select className="w-full bg-transparent text-right font-medium text-ink-0 outline-none" onChange={(e) => onChange(e.target.value)} value={value} aria-label={label}>
        {options.map((o) => <option key={o} value={o}>{o === "live" ? "Operativa" : o === "empty" ? "Vacío" : "Error"}</option>)}
      </select>
    </label>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-4"><FileText className="h-5 w-5" strokeWidth={1.5} /></div>
      <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-ink-0">Empezá tu viaje.</h3>
      <p className="mt-2 max-w-md text-[13px] leading-[1.55] text-ink-5">El configurador IA está listo para recabar los datos de tu tienda y generar la estructura base.</p>
      <button className="mt-7 inline-flex items-center rounded-[var(--r-sm)] bg-ink-0 h-10 px-5 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2" onClick={onReset} type="button">Empezar configuración base</button>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-[color:var(--signal-danger)]"><AlertTriangle className="h-5 w-5" strokeWidth={1.5} /></div>
      <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-ink-0">Hubo un problema.</h3>
      <p className="mt-2 max-w-md text-[13px] leading-[1.55] text-ink-5">Ocurrió un error leyendo el draft desde el servidor.</p>
      <button className="mt-7 inline-flex items-center rounded-[var(--r-sm)] bg-ink-0 h-10 px-5 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2" onClick={onRetry} type="button">Reintentar</button>
    </div>
  );
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div aria-live="polite" className="fixed right-6 top-20 z-[60] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((t) => (
        <div key={t.id} className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4 shadow-[var(--shadow-overlay)] animate-in slide-in-from-right-5 fade-in duration-[var(--dur-base)]">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-[13px] font-medium text-ink-0">{t.title}</p><p className="mt-1 text-[12px] leading-[1.5] text-ink-5">{t.description}</p></div>
            <button aria-label="Cerrar" className="rounded-[var(--r-sm)] p-1 text-ink-5 transition-colors hover:bg-[var(--surface-2)] hover:text-ink-0" onClick={() => onDismiss(t.id)} type="button"><X className="h-4 w-4" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}
