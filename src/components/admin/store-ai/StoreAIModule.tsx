"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Edit3,
  Layers,
  Pencil,
  Sparkles,
  Store,
} from "lucide-react";

import { ThemeCurrentHero } from "@/components/admin/themes/ThemeCurrentHero";
// NexoraCopilot moved to /admin/store-ai/editor
import { ReadinessPanel } from "@/components/admin/readiness/ReadinessPanel";
import type { ReadinessSnapshot } from "@/lib/readiness/snapshot";
import type { StoreTemplate } from "@/types/store-templates";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";

// ─── Tienda IA — module landing (v4) ────────────────────────────────────
//
// Store design centre — the primary hub for visual editing.
//
// Architecture:
//   1. Module header — identity + status + "Editar contenido" CTA
//   2. ThemeCurrentHero — ONE dominant visual showing the active theme
//      with CTAs to edit and explore more themes
//   3. Quick editor shortcuts — direct links to edit surfaces
//   4. Readiness panel — publication readiness (compacted)
//
// The old 8-tab AIStoreBuilderPage wizard has been fully removed.
// The primary flow is: see theme → edit directly via the editor.

interface CurrentThemeView {
  themeStyle: string | null;
  appliedTemplate: { id: string; name: string; themeStyle: string } | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  fontFamily: string | null;
  blocks: { total: number; bySource: Record<string, number> };
}

interface StoreAIModuleProps {
  readiness?: ReadinessSnapshot | null;
  themeState?: CurrentThemeView;
  templates?: readonly StoreTemplate[];
}

export function StoreAIModule({
  readiness,
  themeState,
  templates,
}: StoreAIModuleProps) {

  const appliedTemplateFull = useMemo(() => {
    if (!themeState?.appliedTemplate?.id || !templates) return null;
    return templates.find((t) => t.id === themeState.appliedTemplate!.id) ?? null;
  }, [themeState, templates]);

  const statusInfo = deriveStatus(themeState);

  return (
    <div className="space-y-7">
      <AdminPageHeader
        eyebrow="Tienda IA · Centro de diseño"
        title="Tienda IA"
        subtitle="Diseñá, editá y optimizá tu tienda con herramientas profesionales y asistencia de IA en tiempo real."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill label={statusInfo.label} tone={statusInfo.tone} />
            <Link
              href="/admin/store-ai/editor"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--brand)] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[var(--brand-hover)] focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none"
            >
              <Pencil className="h-4 w-4" strokeWidth={1.75} />
              Editar contenido
            </Link>
          </div>
        }
      />

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
          hint="Estado, dominio y pagos"
        />
      </section>

      {/* ── 4. Readiness panel ───────────────────────────── */}
      {readiness && <ReadinessPanel snapshot={readiness} />}

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
  themeState?: CurrentThemeView | null,
): { label: string; tone: "success" | "warning" | "neutral" } {
  if (themeState?.blocks.total && themeState.blocks.total > 0) {
    if (themeState?.appliedTemplate) {
      return { label: "Tema activo", tone: "success" };
    }
    return { label: "Diseño activo", tone: "success" };
  }
  return { label: "En construcción", tone: "neutral" };
}
