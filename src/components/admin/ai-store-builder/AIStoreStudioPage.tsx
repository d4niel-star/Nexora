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
        <Loader2 className="h-5 w-5 animate-spin text-ink-5" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-[var(--dur-slow)]">
      {/* Header */}
      <div className="border-b border-[color:var(--hairline)] bg-[var(--surface-0)] px-6 py-7 lg:px-10">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-4">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
          </div>
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-5">AI Store Studio</span>
        </div>
        <h1 className="text-[28px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink-0 lg:text-[34px]">Crear tienda con IA.</h1>
        <p className="mt-2 text-[14px] leading-[1.55] text-ink-5">
          Definí tu marca, generá propuestas y lanzá tu tienda en minutos.
        </p>

        {/* Phase indicator */}
        <div className="mt-7 flex items-center gap-1">
          {(["brief", "generating", "proposals", "customize", "preview"] as StudioPhase[]).map((p, i) => {
            const labels = ["Brief", "Generación", "Propuestas", "Personalizar", "Preview"];
            const isActive = p === phase;
            const isDone = ["brief"].includes(p) && phase !== "brief";
            const isDoneGen = p === "generating" && !["brief", "generating"].includes(phase);
            return (
              <div key={p} className="flex items-center gap-1">
                {i > 0 && <div className="h-px w-4 bg-[color:var(--hairline-strong)] lg:w-8" />}
                <button
                  onClick={() => { if (isDone || isDoneGen) setPhase(p); }}
                  disabled={!isDone && !isDoneGen && !isActive}
                  className={cn(
                    "inline-flex items-center gap-1.5 h-7 rounded-[var(--r-xs)] border px-2.5 text-[11px] font-medium transition-colors",
                    isActive
                      ? "border-ink-0 bg-ink-0 text-ink-12"
                      : isDone || isDoneGen
                        ? "border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-0 hover:bg-[var(--surface-2)] cursor-pointer"
                        : "border-[color:var(--hairline)] bg-transparent text-ink-6 cursor-default"
                  )}
                  type="button"
                >
                  {(isDone || isDoneGen) && <CheckCircle2 className="h-3 w-3 text-[color:var(--signal-success)]" strokeWidth={2} />}
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
              description="Sin créditos de IA disponibles. Podés comprar créditos adicionales o actualizar tu plan desde la sección de facturación."
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
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-3 fade-in rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-4 py-3 text-[13px] font-medium text-ink-0 shadow-[var(--shadow-overlay)]">
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
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink-0">Definí tu marca.</h2>
        <p className="mt-1.5 text-[13px] text-ink-5">Estos datos guiarán a la IA para generar propuestas personalizadas.</p>
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
        <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-5">Estilo visual</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {styles.map((s) => (
            <button
              key={s.id}
              onClick={() => update("style", s.id)}
              className={cn(
                "flex flex-col gap-1.5 rounded-[var(--r-md)] border p-5 text-left transition-colors",
                brief.style === s.id
                  ? "border-ink-0 bg-[var(--surface-1)]"
                  : "border-[color:var(--hairline)] bg-[var(--surface-0)] hover:border-[color:var(--hairline-strong)]"
              )}
              type="button"
            >
              <span className="text-[14px] font-medium text-ink-0">{s.label}</span>
              <span className="text-[12px] text-ink-5">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-6">
        <Field label="Color principal">
          <div className="flex items-center gap-3">
            <input type="color" value={brief.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} className="h-9 w-9 rounded-[var(--r-sm)] border border-[color:var(--hairline)] cursor-pointer" />
            <input value={brief.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} className="studio-input font-mono text-[12px] flex-1" />
          </div>
        </Field>
        <Field label="Color secundario">
          <div className="flex items-center gap-3">
            <input type="color" value={brief.secondaryColor} onChange={(e) => update("secondaryColor", e.target.value)} className="h-9 w-9 rounded-[var(--r-sm)] border border-[color:var(--hairline)] cursor-pointer" />
            <input value={brief.secondaryColor} onChange={(e) => update("secondaryColor", e.target.value)} className="studio-input font-mono text-[12px] flex-1" />
          </div>
        </Field>
      </div>

      {/* CTA */}
      <div className="flex justify-end border-t border-[color:var(--hairline)] pt-8">
        <button
          onClick={onGenerate}
          className="inline-flex items-center gap-2 rounded-full bg-ink-0 px-7 h-12 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
          type="button"
        >
          <Wand2 className="h-4 w-4" strokeWidth={1.75} />
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
      <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] text-ink-4">
        <Sparkles className="h-5 w-5 animate-pulse" strokeWidth={1.5} />
      </div>
      <h2 className="font-semibold text-[24px] leading-[1.1] tracking-[-0.03em] text-ink-0">Generando propuestas…</h2>
      <p className="mt-3 max-w-sm text-[13px] leading-[1.55] text-ink-5">
        La IA está analizando tu marca, rubro y objetivos para crear 3 propuestas personalizadas.
      </p>
      <div className="mt-8 flex items-center gap-2 text-[12px] text-ink-5">
        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
        Procesando brief…
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
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink-0">Propuestas generadas.</h2>
          <p className="mt-1.5 text-[13px] text-ink-5">Seleccioná la que mejor se adapte a tu negocio.</p>
        </div>
        <button
          onClick={onRegenerate}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] h-9 px-4 text-[12px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50"
          type="button"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isPending && "animate-spin")} strokeWidth={1.75} />
          Regenerar todo
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {proposals.map((p) => {
          const isSelected = selected?.id === p.id;
          const styleLabels: Record<string, string> = {
            minimal_premium: "Minimal Premium",
            high_conversion: "Alta Conversión",
            editorial: "Editorial",
          };

          return (
            <div
              key={p.id}
              className={cn(
                "group flex flex-col rounded-[var(--r-md)] border bg-[var(--surface-0)] transition-colors overflow-hidden",
                isSelected
                  ? "border-ink-0"
                  : "border-[color:var(--hairline)] hover:border-[color:var(--hairline-strong)]"
              )}
            >
              {/* Header (eyebrow) */}
              <div className="border-b border-[color:var(--hairline)] bg-[var(--surface-1)] px-5 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-5">
                    Propuesta {p.label}
                  </span>
                  {isSelected && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[color:var(--signal-success)]" strokeWidth={2} />
                  )}
                </div>
                <h3 className="mt-2 text-[16px] font-semibold tracking-[-0.01em] text-ink-0">{p.name}</h3>
                <span className="mt-2 inline-flex items-center h-5 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-4">
                  {styleLabels[p.style]}
                </span>
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col p-5">
                <p className="text-[13px] leading-[1.55] text-ink-4 line-clamp-3">{p.summary}</p>

                <div className="mt-4 space-y-2 border-t border-[color:var(--hairline)] pt-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Fortalezas</p>
                  <ul className="space-y-1.5">
                    {p.strengths.slice(0, 3).map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[12px] leading-[1.5] text-ink-4">
                        <Zap className="mt-0.5 h-3 w-3 shrink-0 text-ink-5" strokeWidth={1.75} />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Hero preview */}
                <div className="mt-4 rounded-[var(--r-sm)] bg-[var(--surface-1)] p-3 border border-[color:var(--hairline)]">
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Hero</p>
                  <p className="text-[13px] font-medium text-ink-0 leading-tight">{p.output.hero.headline}</p>
                  <p className="mt-1 text-[11px] text-ink-5">{p.output.hero.subheadline}</p>
                </div>

                <div className="mt-auto pt-5 flex gap-2">
                  <button
                    onClick={() => onSelect(p)}
                    className={cn(
                      "flex-1 inline-flex items-center justify-center h-10 rounded-full text-[12px] font-medium transition-colors",
                      isSelected
                        ? "border border-[color:var(--hairline-strong)] bg-[var(--surface-1)] text-ink-0"
                        : "bg-ink-0 text-ink-12 hover:bg-ink-2"
                    )}
                    type="button"
                  >
                    {isSelected ? "Seleccionada" : "Seleccionar"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      {selected && (
        <div className="flex justify-end border-t border-[color:var(--hairline)] pt-6">
          <button
            onClick={onCustomize}
            className="inline-flex items-center gap-2 rounded-full bg-ink-0 px-7 h-12 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2"
            type="button"
          >
            Personalizar propuesta
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
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
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink-0">Personalizar · {proposal.name}</h2>
        <p className="mt-1.5 text-[13px] text-ink-5">Regenerá secciones individuales sin afectar el resto de la propuesta.</p>
      </div>

      {/* Section list */}
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] overflow-hidden">
        {proposal.output.blocks.map((block, i) => (
          <div
            key={`${block.type}-${i}`}
            className={cn("flex items-center justify-between p-5 transition-colors hover:bg-[var(--surface-1)]", i > 0 && "border-t border-[color:var(--hairline)]")}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] tabular text-[11px] font-medium text-ink-5">
                {(i + 1).toString().padStart(2, "0")}
              </div>
              <div>
                <p className="text-[13px] font-medium text-ink-0">{sectionLabels[block.type] || block.type}</p>
                <p className="text-[11px] text-ink-5 max-w-md truncate">
                  {block.type === "hero" ? proposal.output.hero.headline :
                   (block.settings as any)?.title || "Contenido generado por IA"}
                </p>
              </div>
            </div>
            <button
              onClick={() => onRegenerateSection(block.type as AISectionType)}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] h-8 px-3.5 text-[11px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50"
              type="button"
            >
              <RefreshCw className={cn("h-3 w-3", isPending && "animate-spin")} strokeWidth={1.75} />
              Regenerar
            </button>
          </div>
        ))}
      </div>

      {/* Tone & Visual */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Tono de copy</p>
          <p className="text-[13px] font-medium text-ink-0">{proposal.output.copyTone}</p>
        </div>
        <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Recomendaciones visuales</p>
          <p className="text-[13px] font-medium text-ink-0">{proposal.output.visualRecommendations}</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between border-t border-[color:var(--hairline)] pt-6">
        <button onClick={onBack} className="rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-5 h-10 text-[12px] font-medium text-ink-0 hover:bg-[var(--surface-2)] transition-colors" type="button">
          Atrás
        </button>
        <button
          onClick={onPreview}
          className="inline-flex items-center gap-2 rounded-full bg-ink-0 px-7 h-12 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2"
          type="button"
        >
          <Monitor className="h-4 w-4" strokeWidth={1.75} />
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
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink-0">Preview · {proposal.name}</h2>
          <p className="mt-1.5 text-[13px] text-ink-5">
            {isApplied
              ? "La propuesta ya fue aplicada. Podés publicar o volver a editar."
              : "Revisá cómo se verá tu tienda antes de aplicar los cambios."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-1">
            <button
              onClick={() => setDevice("desktop")}
              className={cn("rounded-[var(--r-xs)] px-3 py-1.5 transition-colors", device === "desktop" ? "bg-[var(--surface-0)] text-ink-0" : "text-ink-5 hover:text-ink-0")}
              type="button"
              aria-label="Desktop"
            >
              <Monitor className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <button
              onClick={() => setDevice("mobile")}
              className={cn("rounded-[var(--r-xs)] px-3 py-1.5 transition-colors", device === "mobile" ? "bg-[var(--surface-0)] text-ink-0" : "text-ink-5 hover:text-ink-0")}
              type="button"
              aria-label="Mobile"
            >
              <Smartphone className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--hairline-strong)] h-9 px-4 text-[12px] font-medium text-ink-0 hover:bg-[var(--surface-2)] transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
            Abrir
          </a>
        </div>
      </div>

      {/* Preview iframe */}
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-4 flex justify-center overflow-hidden min-h-[600px]">
        <div className={cn(
          "bg-[var(--surface-0)] border border-[color:var(--hairline)] shadow-[var(--shadow-overlay)] rounded-[var(--r-sm)] overflow-hidden transition-all duration-[var(--dur-slow)]",
          device === "desktop" ? "w-full max-w-5xl h-[560px]" : "w-[375px] h-[560px]"
        )}>
          {/* Browser chrome */}
          <div className="h-8 bg-[var(--surface-1)] border-b border-[color:var(--hairline)] flex items-center px-3 gap-1.5">
            <div className="h-2 w-2 rounded-full bg-[var(--surface-3)]" />
            <div className="h-2 w-2 rounded-full bg-[var(--surface-3)]" />
            <div className="h-2 w-2 rounded-full bg-[var(--surface-3)]" />
            <div className="ml-3 flex-1 rounded-[var(--r-xs)] bg-[var(--surface-0)] border border-[color:var(--hairline)] px-3 py-0.5 font-mono text-[10px] text-ink-5 truncate">
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
      <div className="flex flex-col gap-3 border-t border-[color:var(--hairline)] pt-6 md:flex-row md:justify-between">
        <button onClick={onBack} className="rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-5 h-10 text-[12px] font-medium text-ink-0 hover:bg-[var(--surface-2)] transition-colors" type="button">
          Volver a personalizar
        </button>
        <div className="flex gap-3">
          <button
            onClick={onApplyDraft}
            disabled={isPending || isApplied}
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-5 h-10 text-[12px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50"
            type="button"
          >
            <Save className="h-4 w-4" strokeWidth={1.75} />
            {isApplied ? "Borrador guardado" : "Guardar como borrador"}
          </button>
          <button
            onClick={onPublish}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-full bg-ink-0 px-7 h-12 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:opacity-50"
            type="button"
          >
            <Rocket className="h-4 w-4" strokeWidth={1.75} />
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
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-ink-5">{label}</span>
      {children}
    </label>
  );
}
