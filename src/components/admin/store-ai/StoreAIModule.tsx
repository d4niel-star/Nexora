"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Palette,
  Rocket,
  Settings2,
  Sparkles,
  Store,
  Wand2,
} from "lucide-react";

import { AIStoreBuilderPage } from "@/components/admin/ai-store-builder/AIStoreBuilderPage";
import { ReadinessPanel } from "@/components/admin/readiness/ReadinessPanel";
import { ThemeCurrentHero } from "@/components/admin/themes/ThemeCurrentHero";
import type { ReadinessSnapshot } from "@/lib/readiness/snapshot";
import type { StoreTemplate } from "@/types/store-templates";
import { cn } from "@/lib/utils";

interface CurrentThemeView {
  themeStyle: string | null;
  appliedTemplate: { id: string; name: string; themeStyle: string } | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  fontFamily: string | null;
  blocks: { total: number; bySource: Record<string, number> };
}

// ─── Tienda IA — module landing (v2) ────────────────────────────────────
//
// Redesigned architecture:
//
//   1. Module header      — identity + status chip + primary CTA
//   2. Theme current hero — ONE dominant piece showing the active theme
//                           with visual preview + "Editar" + "Ver más temas"
//   3. Readiness panel    — publication/sales readiness (when available)
//   4. Builder workspace  — the existing AIStoreBuilderPage, below fold
//
// What changed from v1:
//   · ThemeLibrary (gallery + importer + exporter) was REMOVED from this
//     landing — it lives at /admin/store-ai/themes now.
//   · ThemeCurrentHero replaces the flat "current state strip" with a
//     visual preview hero and clear CTAs.
//   · StatusStrip + RecommendedActions remain as fallback when readiness
//     is unavailable.
//   · The overall surface is cleaner: one theme, one hero, one workspace.

type BuilderTab =
  | "resumen"
  | "configuracion"
  | "estilo"
  | "catalogo"
  | "propuestas"
  | "ajustes"
  | "preview"
  | "publicacion";

interface StoreAIModuleProps {
  initialDraft: any;
  readiness?: ReadinessSnapshot | null;
  themeState?: CurrentThemeView;
  /** Built-in templates that ship with Nexora. Safe to be a readonly list. */
  templates?: readonly StoreTemplate[];
}

export function StoreAIModule({
  initialDraft,
  readiness,
  themeState,
  templates,
}: StoreAIModuleProps) {
  const [activeTab, setActiveTab] = useState<BuilderTab>("resumen");

  const snapshot = useMemo(() => deriveSnapshot(initialDraft), [initialDraft]);

  // Resolve the full template object for the hero visual preview
  const appliedTemplateFull = useMemo(() => {
    if (!themeState?.appliedTemplate?.id || !templates) return null;
    return templates.find((t) => t.id === themeState.appliedTemplate!.id) ?? null;
  }, [themeState, templates]);

  const goToTab = (tab: BuilderTab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const target = document.getElementById("store-ai-workspace");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="space-y-8">
      <ModuleHeader snapshot={snapshot} onStart={() => goToTab(snapshot.primaryActionTab)} />

      {/* ── Theme current hero ──
       *
       * The single dominant piece on this landing. Shows the active
       * theme with a visual preview and two CTAs:
       *   · "Editar tema"   → /admin/store?tab=home
       *   · "Ver más temas" → /admin/store-ai/themes */}
      {themeState && (
        <ThemeCurrentHero
          current={themeState}
          appliedTemplateFull={appliedTemplateFull}
        />
      )}

      {/* ── Publication / sales readiness ──
       *
       * Real multi-signal readiness (payments, catalog, branding, etc.).
       * Falls back to the AI-draft-derived sections when the snapshot
       * is unavailable. */}
      {readiness ? (
        <ReadinessPanel snapshot={readiness} />
      ) : (
        <>
          <StatusStrip snapshot={snapshot} />
          <RecommendedActions snapshot={snapshot} onGoTo={goToTab} />
        </>
      )}

      {/* ── Builder workspace ── */}
      <section
        id="store-ai-workspace"
        className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)]"
      >
        <header className="flex items-center justify-between border-b border-[color:var(--hairline)] px-6 py-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-5">
              Constructor
            </p>
            <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-ink-0">
              Espacio de trabajo
            </h2>
          </div>
          <span className="hidden items-center gap-1.5 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 md:inline-flex">
            <Sparkles className="h-3 w-3" strokeWidth={1.75} />
            Impulsado por IA
          </span>
        </header>
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <AIStoreBuilderPage
            initialDraft={initialDraft}
            embedded
            initialTab={activeTab}
            key={activeTab}
          />
        </div>
      </section>
    </div>
  );
}

// ─── Module header ───────────────────────────────────────────────────────

function ModuleHeader({
  snapshot,
  onStart,
}: {
  snapshot: StoreSnapshot;
  onStart: () => void;
}) {
  return (
    <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-5">
          <Store className="h-3 w-3" strokeWidth={1.75} />
          Módulo
        </div>
        <h1 className="text-[30px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink-0 lg:text-[34px]">
          Tienda IA.
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-[1.55] text-ink-5">
          Centro de construcción y optimización de tu tienda. Diagnosticá el estado
          actual, ejecutá las acciones recomendadas y publicá cuando esté lista.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <StatusPill label={snapshot.statusLabel} tone={snapshot.statusTone} />
        <button
          type="button"
          onClick={onStart}
          className="inline-flex h-10 items-center gap-2 rounded-[var(--r-sm)] bg-ink-0 px-5 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none"
        >
          {snapshot.primaryActionLabel}
          <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <Link
          href="/admin/store?tab=home"
          className="inline-flex h-10 items-center gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-5 text-[13px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none"
        >
          Editar contenido
          <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
        </Link>
      </div>
    </header>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "success" | "warning" | "neutral" }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-[var(--r-full)] border px-3 text-[11px] font-medium uppercase tracking-[0.14em]",
        tone === "success" &&
          "border-[color:var(--signal-success)]/30 bg-[color:var(--signal-success)]/10 text-[color:var(--signal-success)]",
        tone === "warning" &&
          "border-[color:var(--signal-warning)]/30 bg-[color:var(--signal-warning)]/10 text-[color:var(--signal-warning)]",
        tone === "neutral" &&
          "border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-5",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "success" && "bg-[color:var(--signal-success)]",
          tone === "warning" && "bg-[color:var(--signal-warning)]",
          tone === "neutral" && "bg-ink-5",
        )}
      />
      {label}
    </span>
  );
}

// ─── Status strip ────────────────────────────────────────────────────────

function StatusStrip({ snapshot }: { snapshot: StoreSnapshot }) {
  const cards: Array<{
    label: string;
    value: string;
    hint: string;
    done: boolean;
  }> = [
    {
      label: "Marca",
      value: snapshot.brandName ?? "Sin definir",
      hint: snapshot.brandName ? "Nombre de marca cargado" : "Definí tu identidad base",
      done: Boolean(snapshot.brandName),
    },
    {
      label: "Estilo",
      value: snapshot.styleLabel,
      hint: snapshot.hasStyle ? "Paleta y tono elegidos" : "Elegí una dirección visual",
      done: snapshot.hasStyle,
    },
    {
      label: "Propuestas IA",
      value: snapshot.proposalsCount.toString(),
      hint:
        snapshot.proposalsCount > 0
          ? `${snapshot.proposalsCount} variantes disponibles`
          : "Pendiente de generar",
      done: snapshot.proposalsCount > 0,
    },
    {
      label: "Selección",
      value: snapshot.hasSelection ? "Elegida" : "Ninguna",
      hint: snapshot.hasSelection
        ? "Propuesta lista para publicar"
        : "Elegí la propuesta que usará la tienda",
      done: snapshot.hasSelection,
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5"
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-5">
              {c.label}
            </p>
            {c.done ? (
              <CheckCircle2
                className="h-3.5 w-3.5 text-[color:var(--signal-success)]"
                strokeWidth={2}
              />
            ) : (
              <Circle className="h-3.5 w-3.5 text-ink-6" strokeWidth={1.5} />
            )}
          </div>
          <p
            className="mt-3 truncate text-[18px] font-semibold tracking-[-0.02em] text-ink-0"
            title={c.value}
          >
            {c.value}
          </p>
          <p className="mt-1 text-[12px] text-ink-5">{c.hint}</p>
        </div>
      ))}
    </section>
  );
}

// ─── Recommended actions ─────────────────────────────────────────────────

function RecommendedActions({
  snapshot,
  onGoTo,
}: {
  snapshot: StoreSnapshot;
  onGoTo: (tab: BuilderTab) => void;
}) {
  if (snapshot.actions.length === 0) {
    return (
      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-[color:var(--signal-success)]">
            <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-ink-0">
              Tu tienda está lista para publicar.
            </h2>
            <p className="mt-0.5 text-[12px] text-ink-5">
              No hay acciones pendientes detectadas por Nexora. Podés revisar el
              constructor abajo o volver a generar propuestas cuando quieras.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
      <header className="flex items-center justify-between border-b border-[color:var(--hairline)] px-6 py-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-5">
            Acciones recomendadas
          </p>
          <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-ink-0">
            Próximos pasos ordenados por impacto
          </h2>
        </div>
        <span className="inline-flex items-center rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
          {snapshot.actions.length} {snapshot.actions.length === 1 ? "acción" : "acciones"}
        </span>
      </header>
      <ul className="divide-y divide-[color:var(--hairline)]">
        {snapshot.actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <li key={action.id}>
              <button
                type="button"
                onClick={() => onGoTo(action.tab)}
                className="group flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-[var(--surface-1)] focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-3">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-ink-6 tabular-nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p className="truncate text-[13px] font-medium text-ink-0">
                      {action.title}
                    </p>
                    <PriorityChip priority={action.priority} />
                  </div>
                  <p className="mt-0.5 text-[12px] leading-[1.5] text-ink-5">
                    {action.description}
                  </p>
                </div>
                <span className="hidden shrink-0 items-center gap-1 text-[12px] text-ink-3 group-hover:text-ink-0 md:inline-flex">
                  {action.cta}
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PriorityChip({ priority }: { priority: "high" | "medium" | "low" }) {
  return (
    <span
      className={cn(
        "inline-flex h-4 items-center rounded-[var(--r-xs)] px-1.5 text-[9px] font-semibold uppercase tracking-[0.1em]",
        priority === "high" &&
          "bg-[color:var(--signal-warning)]/15 text-[color:var(--signal-warning)]",
        priority === "medium" && "bg-[var(--surface-2)] text-ink-3",
        priority === "low" && "bg-[var(--surface-1)] text-ink-5",
      )}
    >
      {priority === "high" ? "Alta" : priority === "medium" ? "Media" : "Baja"}
    </span>
  );
}

// ─── Derivation logic (no invented data) ─────────────────────────────────

interface RecommendedAction {
  id: string;
  title: string;
  description: string;
  cta: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  tab: BuilderTab;
  priority: "high" | "medium" | "low";
}

interface StoreSnapshot {
  brandName: string | null;
  hasStyle: boolean;
  styleLabel: string;
  proposalsCount: number;
  hasSelection: boolean;
  statusLabel: string;
  statusTone: "success" | "warning" | "neutral";
  primaryActionLabel: string;
  primaryActionTab: BuilderTab;
  actions: RecommendedAction[];
}

function deriveSnapshot(draft: any): StoreSnapshot {
  const brief = safeParseJson(draft?.briefJson);
  const brandName = typeof brief?.brandName === "string" && brief.brandName.trim()
    ? brief.brandName.trim()
    : null;
  const primaryColor = typeof brief?.primaryColor === "string" ? brief.primaryColor : null;
  const style = draft?.style ?? null;
  const proposalsCount = Array.isArray(draft?.proposals) ? draft.proposals.length : 0;
  const hasSelection = Boolean(draft?.selectedProposalId);
  const draftStatus = (draft?.status ?? "draft") as string;

  const hasStyle = Boolean(primaryColor) || Boolean(style);
  const styleLabel = hasStyle ? humanizeStyle(style) : "Sin definir";

  // Ordered recommendation pipeline — the first gap found becomes the
  // primary CTA; each subsequent one surfaces in the actions list.
  const actions: RecommendedAction[] = [];
  if (!brandName) {
    actions.push({
      id: "configure-brand",
      title: "Cargá los datos base de tu marca",
      description:
        "Nombre, industria y público objetivo. Sin esto la IA no puede redactar ni estructurar la tienda.",
      cta: "Completar",
      icon: Settings2,
      tab: "configuracion",
      priority: "high",
    });
  }
  if (!hasStyle) {
    actions.push({
      id: "define-style",
      title: "Elegí una dirección visual",
      description:
        "Paleta, tono y estilo base. Determina cómo se verán las propuestas generadas.",
      cta: "Definir",
      icon: Palette,
      tab: "estilo",
      priority: brandName ? "high" : "medium",
    });
  }
  if (proposalsCount === 0) {
    actions.push({
      id: "generate-proposals",
      title: "Generá las primeras propuestas con IA",
      description:
        "Nexora produce variantes de landing y navegación en base a tu marca y catálogo real.",
      cta: "Generar",
      icon: Wand2,
      tab: "catalogo",
      priority: brandName && hasStyle ? "high" : "medium",
    });
  } else if (!hasSelection) {
    actions.push({
      id: "select-proposal",
      title: "Elegí la propuesta que usará tu tienda",
      description: `Hay ${proposalsCount} variantes generadas. Seleccioná una para avanzar a publicación.`,
      cta: "Seleccionar",
      icon: Sparkles,
      tab: "propuestas",
      priority: "high",
    });
  } else if (draftStatus !== "applied") {
    actions.push({
      id: "publish-store",
      title: "Publicar la propuesta seleccionada",
      description:
        "Volcá el contenido al storefront real. Podés revisar la vista previa antes.",
      cta: "Publicar",
      icon: Rocket,
      tab: "publicacion",
      priority: "high",
    });
  }

  const [primary] = actions;
  const primaryActionLabel = primary
    ? primary.cta
    : draftStatus === "applied"
      ? "Revisar tienda"
      : "Abrir constructor";
  const primaryActionTab: BuilderTab = primary?.tab ?? "resumen";

  let statusLabel = "Borrador";
  let statusTone: StoreSnapshot["statusTone"] = "neutral";
  if (draftStatus === "applied") {
    statusLabel = "Publicada";
    statusTone = "success";
  } else if (hasSelection) {
    statusLabel = "Lista para publicar";
    statusTone = "success";
  } else if (proposalsCount > 0) {
    statusLabel = "Propuestas generadas";
    statusTone = "warning";
  } else if (brandName && hasStyle) {
    statusLabel = "Configurada";
    statusTone = "warning";
  }

  return {
    brandName,
    hasStyle,
    styleLabel,
    proposalsCount,
    hasSelection,
    statusLabel,
    statusTone,
    primaryActionLabel,
    primaryActionTab,
    actions,
  };
}

function humanizeStyle(style: string | null): string {
  switch (style) {
    case "minimal_premium":
      return "Minimal Premium";
    case "high_conversion":
      return "Alta conversión";
    case "editorial":
      return "Editorial";
    default:
      return "Personalizado";
  }
}

function safeParseJson(raw: unknown): any {
  if (typeof raw !== "string" || raw.length === 0) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
