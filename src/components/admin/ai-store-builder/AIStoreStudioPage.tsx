"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Loader2,
  Monitor,
  RefreshCw,
  Rocket,
  Save,
  Smartphone,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  generateStudioDraftAction,
  getStudioDataAction,
  selectProposalAction,
  applyProposalAction,
  applyAndPublishAction,
  regenerateSectionAction,
} from "@/lib/ai/actions";
import type { AIBrief, AIProposalOutput, AISectionType } from "@/types/ai";
import { UpgradePrompt } from "@/components/admin/billing/UpgradePrompt";

// ─── Types ───

interface ProposalView {
  id: string;
  label: string;
  name: string;
  style: string;
  summary: string;
  strengths: string[];
  output: AIProposalOutput;
}

interface DraftView {
  id: string;
  title: string;
  brief: AIBrief;
  style: string;
  status: string;
  selectedProposalId: string | null;
  usageTokens: number;
  proposals: ProposalView[];
}

type StudioPhase = "brief" | "generating" | "proposals" | "customize" | "preview";

// ─── Main Component ───

export function AIStoreStudioPage() {
  const [phase, setPhase] = useState<StudioPhase>("brief");
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [draft, setDraft] = useState<DraftView | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<ProposalView | null>(null);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [outOfCredits, setOutOfCredits] = useState(false);

  // Brief form state
  const [brief, setBrief] = useState<AIBrief>({
    brandName: "",
    industry: "Cuidado Personal & Belleza",
    targetAudience: "",
    objective: "Generar ventas directas",
    country: "Argentina",
    currency: "ARS",
    tone: "Elegante y profesional",
    style: "minimal_premium",
    primaryColor: "#0F172A",
    secondaryColor: "#E2E8F0",
    fontFamily: "Inter",
  });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Initialize
  useEffect(() => {
    getStudioDataAction().then((data) => {
      if (data) {
        setStoreId(data.storeId);
        setStoreName(data.storeName);
        setStoreSlug(data.storeSlug);
        setBrief((prev) => ({ ...prev, brandName: data.storeName }));

        if (data.draft && data.draft.proposals.length > 0) {
          setDraft(data.draft);
          const sel = data.draft.proposals.find(p => p.id === data.draft!.selectedProposalId) ?? data.draft.proposals[0];
          setSelectedProposal(sel);
          setPhase("proposals");
        }
      }
      setIsInitializing(false);
    });
  }, []);

  // ─── Actions ───

  const handleGenerate = () => {
    if (!brief.brandName.trim()) { showToast("Ingresá el nombre de tu marca"); return; }
    setPhase("generating");

    startTransition(async () => {
      try {
        const result = await generateStudioDraftAction(brief);
        // Reload draft data
        const data = await getStudioDataAction();
        if (data?.draft) {
          setDraft(data.draft);
          setSelectedProposal(data.draft.proposals[0]);
        }
        setPhase("proposals");
        showToast("¡Propuestas generadas exitosamente!");
        setOutOfCredits(false);
      } catch (e: any) {
        if (e.message.toLowerCase().includes("créditos") || e.message.toLowerCase().includes("reembolsados")) {
           setOutOfCredits(true);
        } else {
           showToast(`Error: ${e.message}`);
        }
        setPhase("brief");
      }
    });
  };

  const handleSelectProposal = (proposal: ProposalView) => {
    setSelectedProposal(proposal);
    if (draft) {
      startTransition(() => selectProposalAction(draft.id, proposal.id));
    }
  };

  const handleApplyDraft = () => {
    if (!draft || !selectedProposal) return;
    startTransition(async () => {
      try {
        await applyProposalAction(draft.id, selectedProposal.id);
        showToast("Propuesta aplicada a tu tienda como borrador");
        const data = await getStudioDataAction();
        if (data?.draft) setDraft(data.draft);
      } catch { showToast("Error al aplicar propuesta"); }
    });
  };

  const handleApplyAndPublish = () => {
    if (!draft || !selectedProposal) return;
    startTransition(async () => {
      try {
        await applyAndPublishAction(draft.id, selectedProposal.id);
        showToast("¡Tienda publicada exitosamente!");
        const data = await getStudioDataAction();
        if (data?.draft) setDraft(data.draft);
      } catch { showToast("Error al publicar"); }
    });
  };

  const handleRegenerateSection = (section: AISectionType) => {
    if (!draft || !selectedProposal) return;
    startTransition(async () => {
      try {
        const updatedOutput = await regenerateSectionAction(draft.id, selectedProposal.id, section);
        setSelectedProposal((prev) =>
          prev ? { ...prev, output: updatedOutput } : prev
        );
        showToast(`Sección "${section}" regenerada`);
      } catch { showToast("Error al regenerar sección"); }
    });
  };

  // ─── Render ───

  if (isInitializing) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      {/* Header */}
      <div className="border-b border-[#EAEAEA] bg-white px-6 py-6 lg:px-10">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">AI Store Studio</span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-[#111111] lg:text-3xl">Crear tienda con IA</h1>
        <p className="mt-1 text-sm font-medium text-[#888888]">
          Definí tu marca, generá propuestas y lanzá tu tienda en minutos.
        </p>

        {/* Phase indicator */}
        <div className="mt-6 flex items-center gap-1">
          {(["brief", "generating", "proposals", "customize", "preview"] as StudioPhase[]).map((p, i) => {
            const labels = ["Brief", "Generación", "Propuestas", "Personalizar", "Preview"];
            const isActive = p === phase;
            const isDone = ["brief"].includes(p) && phase !== "brief";
            const isDoneGen = p === "generating" && !["brief", "generating"].includes(phase);
            return (
              <div key={p} className="flex items-center gap-1">
                {i > 0 && <div className="h-px w-4 bg-gray-200 lg:w-8" />}
                <button
                  onClick={() => { if (isDone || isDoneGen) setPhase(p); }}
                  disabled={!isDone && !isDoneGen && !isActive}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-all",
                    isActive ? "bg-[#111111] text-white" :
                    isDone || isDoneGen ? "bg-gray-100 text-[#111111] hover:bg-gray-200 cursor-pointer" :
                    "bg-gray-50 text-gray-400 cursor-default"
                  )}
                  type="button"
                >
                  {(isDone || isDoneGen) && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                  {labels[i]}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-6 py-8 lg:px-10">
        {outOfCredits && (
           <UpgradePrompt 
              title="Límite de créditos alcanzado" 
              description="Te quedaste sin créditos de IA. Comprá más créditos o mejorá tu plan para seguir generando store concepts de altísimo nivel."
              feature="ai_credits"
              className="mb-8"
           />
        )}

        {phase === "brief" && !outOfCredits && (
          <BriefPanel brief={brief} setBrief={setBrief} onGenerate={handleGenerate} />
        )}
        {phase === "generating" && !outOfCredits && <GeneratingView />}
        {phase === "proposals" && draft && (
          <ProposalsPanel
            proposals={draft.proposals}
            selected={selectedProposal}
            onSelect={handleSelectProposal}
            onCustomize={() => setPhase("customize")}
            onRegenerate={handleGenerate}
            isPending={isPending}
          />
        )}
        {phase === "customize" && selectedProposal && (
          <CustomizePanel
            proposal={selectedProposal}
            onRegenerateSection={handleRegenerateSection}
            onPreview={() => setPhase("preview")}
            onBack={() => setPhase("proposals")}
            isPending={isPending}
          />
        )}
        {phase === "preview" && selectedProposal && (
          <PreviewPanel
            proposal={selectedProposal}
            storeSlug={storeSlug}
            onApplyDraft={handleApplyDraft}
            onPublish={handleApplyAndPublish}
            onBack={() => setPhase("customize")}
            isPending={isPending}
            draftStatus={draft?.status}
          />
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-3 fade-in rounded-xl border border-[#EAEAEA] bg-white px-5 py-3 text-sm font-bold text-[#111111] shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

// ─── Brief Panel ───

function BriefPanel({
  brief,
  setBrief,
  onGenerate,
}: {
  brief: AIBrief;
  setBrief: React.Dispatch<React.SetStateAction<AIBrief>>;
  onGenerate: () => void;
}) {
  const update = (k: keyof AIBrief, v: string) => setBrief((p) => ({ ...p, [k]: v }));

  const styles: { id: AIBrief["style"]; label: string; desc: string }[] = [
    { id: "minimal_premium", label: "Minimal Premium", desc: "Limpio, elegante, espacios amplios" },
    { id: "high_conversion", label: "Alta Conversión", desc: "CTAs fuertes, orientado a ventas" },
    { id: "editorial", label: "Editorial / Marca", desc: "Storytelling, visual inmersivo" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h2 className="text-xl font-black text-[#111111]">Definí tu marca</h2>
        <p className="mt-1 text-sm text-[#888888]">Estos datos guiarán a la IA para generar propuestas personalizadas.</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Nombre de tu marca">
            <input value={brief.brandName} onChange={(e) => update("brandName", e.target.value)} className="studio-input" placeholder="Ej: Aura Essentials" />
          </Field>
          <Field label="Rubro / Industria">
            <select value={brief.industry} onChange={(e) => update("industry", e.target.value)} className="studio-input">
              <option>Cuidado Personal & Belleza</option>
              <option>Indumentaria y Moda</option>
              <option>Electrónica</option>
              <option>Alimentos y Bebidas</option>
              <option>Hogar y Decoración</option>
              <option>Deportes y Fitness</option>
              <option>Juguetes y Niños</option>
              <option>Otro</option>
            </select>
          </Field>
        </div>

        <Field label="Público objetivo">
          <textarea value={brief.targetAudience} onChange={(e) => update("targetAudience", e.target.value)} className="studio-input resize-none h-20" placeholder="Ej: Mujeres 25-45, interesadas en skincare orgánico" />
        </Field>

        <Field label="Objetivo principal">
          <select value={brief.objective} onChange={(e) => update("objective", e.target.value)} className="studio-input">
            <option>Generar ventas directas</option>
            <option>Construir marca y comunidad</option>
            <option>Lanzar producto nuevo</option>
            <option>Escalar negocio existente</option>
          </select>
        </Field>

        <Field label="Tono de comunicación">
          <input value={brief.tone} onChange={(e) => update("tone", e.target.value)} className="studio-input" placeholder="Ej: Elegante y profesional" />
        </Field>
      </div>

      {/* Style selector */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-[0.18em] text-[#888888]">Estilo visual</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {styles.map((s) => (
            <button
              key={s.id}
              onClick={() => update("style", s.id)}
              className={cn(
                "flex flex-col gap-2 rounded-2xl border-2 p-5 text-left transition-all",
                brief.style === s.id
                  ? "border-violet-500 bg-violet-50/50 shadow-sm"
                  : "border-[#EAEAEA] bg-white hover:border-gray-300"
              )}
              type="button"
            >
              <span className="text-sm font-bold text-[#111111]">{s.label}</span>
              <span className="text-xs text-[#888888]">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-6">
        <Field label="Color principal">
          <div className="flex items-center gap-3">
            <input type="color" value={brief.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} className="h-9 w-9 rounded-lg border border-gray-200 cursor-pointer" />
            <input value={brief.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} className="studio-input font-mono text-xs flex-1" />
          </div>
        </Field>
        <Field label="Color secundario">
          <div className="flex items-center gap-3">
            <input type="color" value={brief.secondaryColor} onChange={(e) => update("secondaryColor", e.target.value)} className="h-9 w-9 rounded-lg border border-gray-200 cursor-pointer" />
            <input value={brief.secondaryColor} onChange={(e) => update("secondaryColor", e.target.value)} className="studio-input font-mono text-xs flex-1" />
          </div>
        </Field>
      </div>

      {/* CTA */}
      <div className="flex justify-end border-t border-[#EAEAEA] pt-8">
        <button
          onClick={onGenerate}
          className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition-all hover:shadow-xl hover:shadow-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          type="button"
        >
          <Wand2 className="h-4 w-4" />
          Generar propuestas con IA
        </button>
      </div>
    </div>
  );
}

// ─── Generating View ───

function GeneratingView() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="relative mb-8">
        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200">
          <Sparkles className="h-8 w-8 text-white animate-pulse" />
        </div>
        <div className="absolute -inset-4 rounded-3xl border-2 border-violet-200 animate-ping opacity-20" />
      </div>
      <h2 className="text-2xl font-black text-[#111111]">Generando propuestas...</h2>
      <p className="mt-2 text-sm text-[#888888] max-w-sm">
        La IA está analizando tu marca, rubro y objetivos para crear 3 propuestas personalizadas.
      </p>
      <div className="mt-8 flex items-center gap-3 text-xs text-[#888888]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Procesando brief...
      </div>
    </div>
  );
}

// ─── Proposals Panel ───

function ProposalsPanel({
  proposals,
  selected,
  onSelect,
  onCustomize,
  onRegenerate,
  isPending,
}: {
  proposals: ProposalView[];
  selected: ProposalView | null;
  onSelect: (p: ProposalView) => void;
  onCustomize: () => void;
  onRegenerate: () => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black text-[#111111]">Propuestas generadas</h2>
          <p className="mt-1 text-sm text-[#888888]">Seleccioná la que mejor se adapte a tu negocio.</p>
        </div>
        <button
          onClick={onRegenerate}
          disabled={isPending}
          className="flex items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-5 py-2.5 text-xs font-bold text-[#111111] transition-colors hover:bg-gray-50 disabled:opacity-50"
          type="button"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isPending && "animate-spin")} />
          Regenerar todo
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {proposals.map((p) => {
          const isSelected = selected?.id === p.id;
          const styleColors: Record<string, string> = {
            minimal_premium: "from-slate-800 to-slate-900",
            high_conversion: "from-orange-500 to-rose-500",
            editorial: "from-emerald-600 to-teal-600",
          };
          const styleLabels: Record<string, string> = {
            minimal_premium: "Minimal Premium",
            high_conversion: "Alta Conversión",
            editorial: "Editorial",
          };

          return (
            <div
              key={p.id}
              className={cn(
                "group flex flex-col rounded-2xl border-2 transition-all overflow-hidden",
                isSelected ? "border-violet-500 shadow-lg shadow-violet-100" : "border-[#EAEAEA] hover:border-gray-300"
              )}
            >
              {/* Style header */}
              <div className={cn("bg-gradient-to-r px-5 py-4 text-white", styleColors[p.style] || "from-gray-800 to-gray-900")}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Propuesta {p.label}</span>
                  {isSelected && <CheckCircle2 className="h-4 w-4" />}
                </div>
                <h3 className="mt-1 text-base font-black">{p.name}</h3>
                <span className="mt-1 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">
                  {styleLabels[p.style]}
                </span>
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col p-5">
                <p className="text-sm text-[#666666] line-clamp-3">{p.summary}</p>

                <div className="mt-4 space-y-2 border-t border-[#EAEAEA] pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#888888]">Fortalezas</p>
                  <ul className="space-y-1">
                    {p.strengths.slice(0, 3).map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-[#666666]">
                        <Zap className="mt-0.5 h-3 w-3 shrink-0 text-violet-500" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Hero preview */}
                <div className="mt-4 rounded-xl bg-gray-50 p-3 border border-gray-100">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#888888] mb-1">Hero</p>
                  <p className="text-sm font-bold text-[#111111] leading-tight">{p.output.hero.headline}</p>
                  <p className="mt-1 text-xs text-[#888888]">{p.output.hero.subheadline}</p>
                </div>

                <div className="mt-auto pt-5 flex gap-2">
                  <button
                    onClick={() => onSelect(p)}
                    className={cn(
                      "flex-1 rounded-xl py-2.5 text-xs font-bold transition-all text-center",
                      isSelected
                        ? "bg-violet-100 text-violet-700"
                        : "bg-[#111111] text-white hover:bg-black"
                    )}
                    type="button"
                  >
                    {isSelected ? "✓ Seleccionada" : "Seleccionar"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      {selected && (
        <div className="flex justify-end border-t border-[#EAEAEA] pt-6">
          <button
            onClick={onCustomize}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition-all hover:shadow-xl"
            type="button"
          >
            Personalizar propuesta
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Customize Panel (Section Regeneration) ───

function CustomizePanel({
  proposal,
  onRegenerateSection,
  onPreview,
  onBack,
  isPending,
}: {
  proposal: ProposalView;
  onRegenerateSection: (section: AISectionType) => void;
  onPreview: () => void;
  onBack: () => void;
  isPending: boolean;
}) {
  const sectionLabels: Record<string, string> = {
    hero: "Hero Principal",
    featured_products: "Productos Destacados",
    featured_categories: "Categorías",
    benefits: "Beneficios",
    testimonials: "Testimonios",
    faq: "Preguntas Frecuentes",
    newsletter: "Newsletter",
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h2 className="text-xl font-black text-[#111111]">Personalizar: {proposal.name}</h2>
        <p className="mt-1 text-sm text-[#888888]">Regenerá secciones individuales sin afectar el resto de la propuesta.</p>
      </div>

      {/* Section list */}
      <div className="rounded-2xl border border-[#EAEAEA] bg-white overflow-hidden shadow-sm">
        {proposal.output.blocks.map((block, i) => (
          <div
            key={`${block.type}-${i}`}
            className={cn("flex items-center justify-between p-5 transition-colors hover:bg-gray-50", i > 0 && "border-t border-[#EAEAEA]")}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-xs font-black text-gray-500">
                {(i + 1).toString().padStart(2, "0")}
              </div>
              <div>
                <p className="text-sm font-bold text-[#111111]">{sectionLabels[block.type] || block.type}</p>
                <p className="text-xs text-[#888888] max-w-md truncate">
                  {block.type === "hero" ? proposal.output.hero.headline :
                   (block.settings as any)?.title || "Contenido generado por IA"}
                </p>
              </div>
            </div>
            <button
              onClick={() => onRegenerateSection(block.type as AISectionType)}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg border border-[#EAEAEA] bg-white px-3 py-1.5 text-[11px] font-bold text-[#111111] transition-colors hover:bg-gray-50 disabled:opacity-50"
              type="button"
            >
              <RefreshCw className={cn("h-3 w-3", isPending && "animate-spin")} />
              Regenerar
            </button>
          </div>
        ))}
      </div>

      {/* Tone & Visual */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#888888] mb-2">Tono de copy</p>
          <p className="text-sm font-bold text-[#111111]">{proposal.output.copyTone}</p>
        </div>
        <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#888888] mb-2">Recomendaciones visuales</p>
          <p className="text-sm font-bold text-[#111111]">{proposal.output.visualRecommendations}</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between border-t border-[#EAEAEA] pt-6">
        <button onClick={onBack} className="rounded-xl border border-[#EAEAEA] bg-white px-6 py-2.5 text-xs font-bold text-[#111111] hover:bg-gray-50" type="button">
          Atrás
        </button>
        <button
          onClick={onPreview}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition-all hover:shadow-xl"
          type="button"
        >
          <Monitor className="h-4 w-4" />
          Ver preview y publicar
        </button>
      </div>
    </div>
  );
}

// ─── Preview Panel ───

function PreviewPanel({
  proposal,
  storeSlug,
  onApplyDraft,
  onPublish,
  onBack,
  isPending,
  draftStatus,
}: {
  proposal: ProposalView;
  storeSlug: string;
  onApplyDraft: () => void;
  onPublish: () => void;
  onBack: () => void;
  isPending: boolean;
  draftStatus?: string;
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const isApplied = draftStatus === "applied";
  const previewUrl = `/${storeSlug}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black text-[#111111]">Preview: {proposal.name}</h2>
          <p className="mt-1 text-sm text-[#888888]">
            {isApplied
              ? "La propuesta ya fue aplicada. Podés publicar o volver a editar."
              : "Revisá cómo se verá tu tienda antes de aplicar los cambios."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-[#EAEAEA] bg-gray-50 p-1">
            <button
              onClick={() => setDevice("desktop")}
              className={cn("rounded-md px-3 py-1.5 transition-all", device === "desktop" ? "bg-white text-[#111111] shadow-sm" : "text-gray-400")}
              type="button"
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDevice("mobile")}
              className={cn("rounded-md px-3 py-1.5 transition-all", device === "mobile" ? "bg-white text-[#111111] shadow-sm" : "text-gray-400")}
              type="button"
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-[#EAEAEA] px-3 py-1.5 text-xs font-bold text-[#111111] hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Abrir
          </a>
        </div>
      </div>

      {/* Preview iframe */}
      <div className="rounded-2xl border border-[#EAEAEA] bg-gray-100 p-4 flex justify-center overflow-hidden min-h-[600px]">
        <div className={cn(
          "bg-white border border-gray-200 shadow-2xl rounded-lg overflow-hidden transition-all duration-500",
          device === "desktop" ? "w-full max-w-5xl h-[560px]" : "w-[375px] h-[560px]"
        )}>
          {/* Browser chrome */}
          <div className="h-8 bg-gray-50 border-b border-gray-200 flex items-center px-3 gap-1.5">
            <div className="rounded-full w-2 h-2 bg-gray-300" />
            <div className="rounded-full w-2 h-2 bg-gray-300" />
            <div className="rounded-full w-2 h-2 bg-gray-300" />
            <div className="ml-3 flex-1 rounded bg-white border border-gray-200 px-3 py-0.5 text-[10px] text-gray-400 font-mono truncate">
              {storeSlug}.nexora.app
            </div>
          </div>
          {/* Real iframe preview */}
          <iframe
            src={previewUrl}
            className="w-full h-[calc(100%-32px)] border-0"
            title="Store Preview"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 border-t border-[#EAEAEA] pt-6 md:flex-row md:justify-between">
        <button onClick={onBack} className="rounded-xl border border-[#EAEAEA] bg-white px-6 py-2.5 text-xs font-bold text-[#111111] hover:bg-gray-50" type="button">
          Volver a personalizar
        </button>
        <div className="flex gap-3">
          <button
            onClick={onApplyDraft}
            disabled={isPending || isApplied}
            className="flex items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-6 py-2.5 text-xs font-bold text-[#111111] transition-colors hover:bg-gray-50 disabled:opacity-50"
            type="button"
          >
            <Save className="h-4 w-4" />
            {isApplied ? "Borrador guardado" : "Guardar como borrador"}
          </button>
          <button
            onClick={onPublish}
            disabled={isPending}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition-all hover:shadow-xl disabled:opacity-50"
            type="button"
          >
            <Rocket className="h-4 w-4" />
            Aplicar y publicar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared ───

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-bold text-[#111111]">{label}</span>
      {children}
    </label>
  );
}
