"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Edit3,
  Layers,
  Palette,
  Pencil,
  Sparkles,
  Store,
  Wrench,
} from "lucide-react";

import { ThemeCurrentHero } from "@/components/admin/themes/ThemeCurrentHero";
// NexoraCopilot moved to /admin/store-ai/editor
import { ReadinessPanel } from "@/components/admin/readiness/ReadinessPanel";
import type { ReadinessSnapshot } from "@/lib/readiness/snapshot";
import type { StoreTemplate } from "@/types/store-templates";
import { cn } from "@/lib/utils";

// ─── Tienda IA — module landing (v3) ────────────────────────────────────
//
// Transformed from a "builder wizard" into a "store design centre".
//
// Architecture:
//   1. Module header — identity + status + "Editar contenido" CTA
//   2. ThemeCurrentHero — ONE dominant visual showing the active theme
//      with CTAs to edit and explore more themes
//   3. Quick editor shortcuts — direct links to edit surfaces
//   4. Readiness panel — publication readiness (compacted)
//   5. Advanced tools — the old wizard, collapsed behind a disclosure
//   6. NexoraCopilot — floating AI assistant (bottom-right)
//
// What changed from v2:
//   · The 8-tab AIStoreBuilderPage wizard is RELEGATED — it lives behind
//     "Herramientas avanzadas" and is no longer the primary path.
//   · The primary flow is now: see theme → edit directly → use copilot.
//   · StatusStrip + RecommendedActions REMOVED from the landing.
//   · NexoraCopilot added as a persistent floating assistant.
//   · Quick editor links surface the real editing surfaces.

interface CurrentThemeView {
  themeStyle: string | null;
  appliedTemplate: { id: string; name: string; themeStyle: string } | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  fontFamily: string | null;
  blocks: { total: number; bySource: Record<string, number> };
}

interface StoreAIModuleProps {
  initialDraft: any;
  readiness?: ReadinessSnapshot | null;
  themeState?: CurrentThemeView;
  templates?: readonly StoreTemplate[];
}

export function StoreAIModule({
  initialDraft,
  readiness,
  themeState,
  templates,
}: StoreAIModuleProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const appliedTemplateFull = useMemo(() => {
    if (!themeState?.appliedTemplate?.id || !templates) return null;
    return templates.find((t) => t.id === themeState.appliedTemplate!.id) ?? null;
  }, [themeState, templates]);

  const draftStatus = initialDraft?.status ?? "draft";
  const statusInfo = deriveStatus(draftStatus, themeState);

  return (
    <div className="space-y-8">
      {/* ── 1. Module header ─────────────────────────────── */}
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-5">
            <Store className="h-3 w-3" strokeWidth={1.75} />
            Centro de diseño
          </div>
          <h1 className="text-[30px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink-0 lg:text-[34px]">
            Tienda IA.
          </h1>
          <p className="mt-2 max-w-xl text-[14px] leading-[1.55] text-ink-5">
            Diseñá, editá y optimizá tu tienda con herramientas profesionales y asistencia de IA en tiempo real.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <StatusPill label={statusInfo.label} tone={statusInfo.tone} />
          <Link
            href="/admin/store-ai/editor"
            className="inline-flex h-10 items-center gap-2 rounded-[var(--r-sm)] bg-ink-0 px-5 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none"
          >
            <Pencil className="h-4 w-4" strokeWidth={1.75} />
            Editar contenido
          </Link>
        </div>
      </header>

      {/* ── 2. Theme current hero ────────────────────────── */}
      {themeState && (
        <ThemeCurrentHero
          current={themeState}
          appliedTemplateFull={appliedTemplateFull}
        />
      )}

      {/* ── 3. Quick editor shortcuts ────────────────────── */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ShortcutCard
          icon={Pencil}
          label="Editor de tema"
          value="Abrir editor"
          href="/admin/store-ai/editor"
          hint="Editá colores, tipografía, secciones y más"
          sparkle
        />
        <ShortcutCard
          icon={Layers}
          label="Galería de temas"
          value={`${templates?.length ?? 0} disponibles`}
          href="/admin/store-ai/themes"
          hint="Explorá y aplicá bases de diseño"
        />
        <ShortcutCard
          icon={Edit3}
          label="Mi tienda"
          value="Configuración"
          href="/admin/store"
          hint="Dominio, pagos, navegación y páginas"
        />
      </section>

      {/* ── 4. Readiness panel ───────────────────────────── */}
      {readiness && <ReadinessPanel snapshot={readiness} />}

      {/* ── 5. Advanced tools (old wizard) ───────────────── */}
      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-[var(--surface-1)]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-3">
              <Wrench className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[13px] font-semibold tracking-[-0.01em] text-ink-0">
                Herramientas avanzadas
              </p>
              <p className="mt-0.5 text-[11px] text-ink-5">
                Constructor guiado con IA · Generar propuestas · Publicar
              </p>
            </div>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-ink-5 transition-transform duration-200",
              showAdvanced && "rotate-180",
            )}
            strokeWidth={1.75}
          />
        </button>
        {showAdvanced && (
          <AdvancedToolsPanel initialDraft={initialDraft} />
        )}
      </section>

      {/* Copiloto IA now lives inside /admin/store-ai/editor */}
    </div>
  );
}

// ─── Shortcut card ───────────────────────────────────────────────────────

function ShortcutCard({
  icon: Icon,
  label,
  value,
  href,
  hint,
  sparkle,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  label: string;
  value: string;
  href?: string;
  hint: string;
  sparkle?: boolean;
}) {
  const content = (
    <div
      className={cn(
        "group flex flex-col rounded-[var(--r-md)] border bg-[var(--surface-0)] p-5 transition-all",
        href
          ? "border-[color:var(--hairline)] hover:border-[color:var(--hairline-strong)] hover:shadow-[var(--shadow-card)] cursor-pointer"
          : "border-[color:var(--hairline)]",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-3">
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
        </div>
        {sparkle && (
          <span className="inline-flex h-5 items-center gap-1 rounded-[var(--r-xs)] bg-ink-0 px-1.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-ink-12">
            <Sparkles className="h-2.5 w-2.5" strokeWidth={2} />
            IA
          </span>
        )}
        {href && (
          <ArrowRight className="h-3.5 w-3.5 text-ink-6 transition-colors group-hover:text-ink-0" strokeWidth={1.75} />
        )}
      </div>
      <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-5">
        {label}
      </p>
      <p className="mt-1 truncate text-[15px] font-semibold tracking-[-0.01em] text-ink-0">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-ink-5 line-clamp-1">{hint}</p>
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }
  return content;
}

// ─── Advanced tools (old wizard, lazy-loaded) ────────────────────────────

function AdvancedToolsPanel({ initialDraft }: { initialDraft: any }) {
  const [AIBuilder, setAIBuilder] = useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(true);

  // Lazy-load the full builder only when the user expands
  useState(() => {
    import("@/components/admin/ai-store-builder/AIStoreBuilderPage").then((mod) => {
      setAIBuilder(() => mod.AIStoreBuilderPage);
      setLoading(false);
    });
  });

  return (
    <div className="border-t border-[color:var(--hairline)] px-4 py-6 sm:px-6 lg:px-8">
      {loading || !AIBuilder ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-[13px] text-ink-5">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-ink-6 border-t-ink-0" />
            Cargando herramientas…
          </div>
        </div>
      ) : (
        <AIBuilder initialDraft={initialDraft} embedded />
      )}
    </div>
  );
}

// ─── Status pill ─────────────────────────────────────────────────────────

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

// ─── Status derivation ───────────────────────────────────────────────────

function deriveStatus(
  draftStatus: string,
  themeState?: CurrentThemeView | null,
): { label: string; tone: "success" | "warning" | "neutral" } {
  if (draftStatus === "applied" || themeState?.blocks.total && themeState.blocks.total > 0) {
    if (themeState?.appliedTemplate) {
      return { label: "Tema activo", tone: "success" };
    }
    return { label: "Diseño activo", tone: "success" };
  }
  return { label: "En construcción", tone: "neutral" };
}

interface CurrentThemeView {
  themeStyle: string | null;
  appliedTemplate: { id: string; name: string; themeStyle: string } | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  fontFamily: string | null;
  blocks: { total: number; bySource: Record<string, number> };
}
