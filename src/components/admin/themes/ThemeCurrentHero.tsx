"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Layers,
  Monitor,
  Palette,
  Pencil,
  Smartphone,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { getCategoryForTemplate, getCategoryById } from "@/lib/themes/categories";
import type { StoreTemplate } from "@/types/store-templates";

// ─── Theme Current Hero ─────────────────────────────────────────────────
// The single dominant piece on the Tienda IA landing. Shows the active
// theme with a visual preview, branding facts, and two clear CTAs:
//   · Editar tema  → /admin/store-ai/editor
//   · Ver más temas → /admin/store-ai/themes

interface CurrentThemeView {
  themeStyle: string | null;
  appliedTemplate: { id: string; name: string; themeStyle: string } | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  fontFamily: string | null;
  blocks: { total: number; bySource: Record<string, number> };
}

interface Props {
  current: CurrentThemeView;
  /** Full template when a built-in is applied — used for visual preview. */
  appliedTemplateFull?: StoreTemplate | null;
}

const THEME_STYLE_LABEL: Record<string, string> = {
  minimal: "Minimal",
  bold: "Bold",
  classic: "Classic",
};

export function ThemeCurrentHero({ current, appliedTemplateFull }: Props) {
  const themeName = current.appliedTemplate?.name
    ?? (current.blocks.bySource.ai ? "Generado con IA"
      : current.blocks.total > 0 ? "Personalizado" : "Sin tema");

  const categoryId = appliedTemplateFull
    ? getCategoryForTemplate(appliedTemplateFull)
    : null;
  const category = categoryId ? getCategoryById(categoryId) : null;

  // Build a visual preview: hero text + colour palette
  const heroBlock = appliedTemplateFull?.homeBlocks.find(
    (b) => b.blockType === "hero",
  );
  const heroHeadline = (heroBlock?.settings?.headline as string) ?? null;
  const heroSubheadline = (heroBlock?.settings?.subheadline as string) ?? null;
  const heroBg = (heroBlock?.settings?.backgroundImageUrl as string) ?? null;

  const primaryColor = current.primaryColor ?? appliedTemplateFull?.branding.primaryColor ?? "#111111";
  const secondaryColor = current.secondaryColor ?? appliedTemplateFull?.branding.secondaryColor ?? "#F4F4F5";

  return (
    <section
      id="theme-current-hero"
      aria-label="Tema actual"
      className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] overflow-hidden"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr]">
        {/* ── Visual preview ────────────────────────────── */}
        <div className="relative min-h-[320px] lg:min-h-[400px] overflow-hidden bg-[var(--surface-1)]">
          {/* Background image or gradient */}
          {heroBg ? (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30"
              style={{ backgroundImage: `url(${heroBg})` }}
            />
          ) : (
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
              }}
            />
          )}

          {/* Mock storefront frame */}
          <div className="relative flex h-full flex-col items-center justify-center p-8">
            {/* Device frame — desktop */}
            <div className="w-full max-w-md rounded-lg border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-card)] overflow-hidden">
              {/* Mockup nav bar */}
              <div
                className="flex items-center justify-between px-4 py-2.5 border-b border-[color:var(--hairline)]"
                style={{ backgroundColor: primaryColor }}
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-white/40" />
                  <div className="h-1.5 w-16 rounded-full bg-white/30" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-8 rounded-full bg-white/20" />
                  <div className="h-1.5 w-8 rounded-full bg-white/20" />
                  <div className="h-1.5 w-8 rounded-full bg-white/20" />
                </div>
              </div>
              {/* Hero mockup */}
              <div className="relative px-6 py-8" style={{ backgroundColor: secondaryColor }}>
                <p
                  className="text-[16px] font-semibold leading-[1.15] tracking-[-0.02em] line-clamp-2"
                  style={{ color: primaryColor }}
                >
                  {heroHeadline ?? themeName}
                </p>
                {heroSubheadline ? (
                  <p
                    className="mt-2 text-[11px] leading-[1.5] opacity-60 line-clamp-2"
                    style={{ color: primaryColor }}
                  >
                    {heroSubheadline}
                  </p>
                ) : null}
                <div className="mt-4 flex items-center gap-2">
                  <span
                    className="inline-flex h-7 items-center rounded-[var(--r-xs)] px-3 text-[10px] font-medium"
                    style={{
                      backgroundColor: primaryColor,
                      color: secondaryColor,
                    }}
                  >
                    CTA principal
                  </span>
                  <span className="h-7 w-16 rounded-[var(--r-xs)] border border-black/10" />
                </div>
              </div>
              {/* Content blocks mockup */}
              <div className="px-6 py-5 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] h-12" />
                  ))}
                </div>
                <div className="h-2.5 w-2/3 rounded-full bg-[var(--surface-1)]" />
                <div className="h-2.5 w-1/2 rounded-full bg-[var(--surface-1)]" />
              </div>
            </div>

            {/* Device toggle overlay */}
            <div className="absolute right-4 top-4 flex items-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)]/90 p-1 backdrop-blur-sm">
              <span className="rounded-[var(--r-xs)] bg-[var(--surface-1)] px-2 py-1" title="Desktop">
                <Monitor className="h-3.5 w-3.5 text-ink-0" strokeWidth={1.75} />
              </span>
              <span className="px-2 py-1" title="Mobile">
                <Smartphone className="h-3.5 w-3.5 text-ink-5" strokeWidth={1.75} />
              </span>
            </div>
          </div>
        </div>

        {/* ── Info panel ─────────────────────────────────── */}
        <div className="flex flex-col justify-between p-6 lg:p-8">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-5">
                Tema actual
              </p>
              {current.appliedTemplate && (
                <span className="inline-flex items-center gap-1 rounded-[var(--r-xs)] bg-[color:var(--signal-success)]/10 border border-[color:var(--signal-success)]/30 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-[color:var(--signal-success)]">
                  <CheckCircle2 className="h-2.5 w-2.5" strokeWidth={2} />
                  Activo
                </span>
              )}
            </div>
            <h2 className="mt-2 text-[22px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink-0 lg:text-[26px]">
              {themeName}
            </h2>
            {category && (
              <p className="mt-1.5 text-[12px] text-ink-5">
                Categoría · {category.label}
              </p>
            )}

            {/* Branding facts */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <FactChip
                label="Estilo"
                value={THEME_STYLE_LABEL[current.themeStyle ?? ""] ?? current.themeStyle ?? "—"}
              />
              <FactChip
                label="Tipografía"
                value={current.fontFamily ?? "—"}
              />
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-5 w-5 rounded-[var(--r-xs)] border border-[color:var(--hairline)]"
                  style={{ backgroundColor: primaryColor }}
                />
                <span
                  aria-hidden
                  className="h-5 w-5 rounded-[var(--r-xs)] border border-[color:var(--hairline)]"
                  style={{ backgroundColor: secondaryColor }}
                />
                <span className="text-[11px] text-ink-5">Paleta</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-ink-5">
                <Layers className="h-3.5 w-3.5" strokeWidth={1.75} />
                {current.blocks.total} secciones
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin/store-ai/editor"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--r-sm)] bg-ink-0 px-6 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
              Editar tema
            </Link>
            <Link
              href="/admin/store-ai/themes"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-6 text-[13px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none"
            >
              <Palette className="h-3.5 w-3.5" strokeWidth={1.75} />
              Ver más temas
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// Small inline helper
function FactChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 py-2">
      <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-ink-6">{label}</p>
      <p className="mt-0.5 truncate text-[12px] font-medium text-ink-0">{value}</p>
    </div>
  );
}
