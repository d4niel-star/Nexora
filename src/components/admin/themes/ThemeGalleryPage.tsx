"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileUp,
  Layers,
  Loader2,
  Palette,
  Rocket,
  Upload,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { groupTemplatesByCategory, getCategoryForTemplate, getCategoryById } from "@/lib/themes/categories";
import type { StoreTemplate } from "@/types/store-templates";
import {
  applyBuiltInTemplateAction,
  applyImportedTemplateAction,
  exportCurrentStoreAsTemplateAction,
  type ApplyTemplateResult,
} from "@/lib/themes/actions";

// ─── Theme Gallery Page ─────────────────────────────────────────────────
// Dedicated route (/admin/store-ai/themes) to explore all templates
// grouped by category. Each category section shows a header + grid of
// template cards with visual previews, apply CTA, and the current theme
// marked clearly. Import/export tools live at the bottom of this page,
// not on the Tienda IA landing.

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
  templates: readonly StoreTemplate[];
}

const THEME_STYLE_LABEL: Record<string, string> = {
  minimal: "Minimal",
  bold: "Bold",
  classic: "Classic",
};

export function ThemeGalleryPage({ current, templates }: Props) {
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: "ok" | "warn" | "err"; text: string } | null>(null);
  const [importText, setImportText] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const importSectionRef = useRef<HTMLElement | null>(null);

  const scrollToImport = () => {
    importSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const pushToast = (tone: "ok" | "warn" | "err", text: string) => {
    setToast({ tone, text });
    window.setTimeout(() => setToast(null), 4000);
  };

  const currentTemplateId = current.appliedTemplate?.id ?? null;
  const grouped = useMemo(() => groupTemplatesByCategory(templates), [templates]);

  const handleApply = (templateId: string) => {
    setBusyId(templateId);
    startTransition(async () => {
      try {
        const result: ApplyTemplateResult = await applyBuiltInTemplateAction(templateId);
        if (result.ok) {
          pushToast("ok", "Tema aplicado correctamente. Ya podés editar cada sección desde Mi tienda.");
        } else {
          pushToast("err", result.errors?.[0] ?? "No se pudo aplicar el tema.");
        }
      } catch (e) {
        pushToast("err", (e as Error).message ?? "Error al aplicar el tema.");
      } finally {
        setBusyId(null);
      }
    });
  };

  const handleImport = () => {
    setImportErrors([]);
    if (!importText.trim()) {
      setImportErrors(["Pegá un JSON de template o cargá un archivo para continuar."]);
      return;
    }
    setBusyId("__import__");
    startTransition(async () => {
      try {
        const result = await applyImportedTemplateAction(importText);
        if (result.ok) {
          pushToast("ok", `Tema importado (${result.blocksCreated} secciones). Editable desde Mi tienda.`);
          setImportText("");
        } else {
          setImportErrors(result.errors ?? ["Formato inválido."]);
          pushToast("warn", "El tema no se importó. Revisá los errores.");
        }
      } catch (e) {
        setImportErrors([(e as Error).message ?? "Error al importar."]);
      } finally {
        setBusyId(null);
      }
    });
  };

  const handleExport = () => {
    setBusyId("__export__");
    startTransition(async () => {
      try {
        const result = await exportCurrentStoreAsTemplateAction();
        if (!result.ok) {
          pushToast("err", result.errors[0] ?? "No se pudo exportar.");
          return;
        }
        const blob = new Blob([JSON.stringify(result.payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `nexora-template-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        pushToast("ok", "Tema exportado como archivo JSON.");
      } catch (e) {
        pushToast("err", (e as Error).message ?? "Error al exportar.");
      } finally {
        setBusyId(null);
      }
    });
  };

  const handleFile = async (file: File) => {
    setImportErrors([]);
    try {
      setImportText(await file.text());
    } catch (e) {
      setImportErrors([`No se pudo leer el archivo: ${(e as Error).message}`]);
    }
  };

  return (
    <div className="space-y-10">
      {/* ── Page header ────────────────────────────────────── */}
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            href="/admin/store-ai"
            className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-5 transition-colors hover:text-ink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
            Tienda IA
          </Link>
          <h1 className="text-[28px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink-0 lg:text-[32px]">
            Temas disponibles
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-[1.55] text-ink-5">
            Explorá todas las bases de diseño. Elegí la que mejor encaje con tu marca y empezá a editar inmediatamente.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={scrollToImport}
            className="inline-flex h-10 items-center gap-2 rounded-[var(--r-sm)] bg-ink-0 px-5 text-[12px] font-medium text-ink-12 transition-colors hover:bg-ink-2"
          >
            <Upload className="h-3.5 w-3.5" strokeWidth={1.75} />
            Importar temas
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isPending}
            className="inline-flex h-10 items-center gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-4 text-[12px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50"
          >
            {busyId === "__export__" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
            ) : (
              <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
            Exportar mi tema
          </button>
        </div>
      </header>

      {/* ── Category groups ────────────────────────────────── */}
      {grouped.map(({ category, templates: catTemplates }) => (
        <section key={category.id} aria-label={`Categoría: ${category.label}`}>
          <div className="mb-5 flex items-end justify-between border-b border-[color:var(--hairline)] pb-4">
            <div>
              <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-ink-0">
                {category.label}
              </h2>
              <p className="mt-1 text-[12px] text-ink-5">{category.description}</p>
            </div>
            <span className="text-[11px] font-medium text-ink-6">
              {catTemplates.length} {catTemplates.length === 1 ? "tema" : "temas"}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {catTemplates.map((tpl) => (
              <GalleryCard
                key={tpl.id}
                template={tpl}
                isCurrent={tpl.id === currentTemplateId}
                isBusy={isPending && busyId === tpl.id}
                onApply={() => handleApply(tpl.id)}
              />
            ))}
          </div>
        </section>
      ))}

      {/* ── Import section ─────────────────────────────────── */}
      <section
        ref={importSectionRef}
        id="import-section"
        className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
            <FileUp className="h-4 w-4 text-ink-0" strokeWidth={1.75} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-5">
              Importar plantilla
            </p>
            <h3 className="mt-1 text-[16px] font-semibold tracking-[-0.01em] text-ink-0">
              Cargar un tema Nexora
            </h3>
            <p className="mt-1 max-w-2xl text-[12px] leading-[1.55] text-ink-5">
              Aceptamos JSON con el schema de templates de Nexora. Si el archivo no valida,
              te mostramos exactamente qué campos fallan.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 max-w-lg">
              <div className="rounded-[var(--r-xs)] border border-[color:var(--signal-success)]/20 bg-[color:var(--signal-success)]/5 px-2.5 py-1.5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[color:var(--signal-success)]">
                  ✓ Soportado
                </p>
                <ul className="mt-1 space-y-0.5 text-[10px] leading-[1.4] text-ink-4">
                  <li>JSON de template Nexora</li>
                  <li>Export/import propio</li>
                  <li>Templates validadas</li>
                </ul>
              </div>
              <div className="rounded-[var(--r-xs)] border border-[color:var(--signal-danger)]/20 bg-[color:var(--signal-danger)]/5 px-2.5 py-1.5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[color:var(--signal-danger)]">
                  ✗ No soportado
                </p>
                <ul className="mt-1 space-y-0.5 text-[10px] leading-[1.4] text-ink-4">
                  <li>Themes de Shopify / Tiendanube</li>
                  <li>HTML ajeno sin mapeo</li>
                  <li>Formatos incompatibles</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_auto]">
          <textarea
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value);
              if (importErrors.length > 0) setImportErrors([]);
            }}
            placeholder="Pegá aquí el JSON del template o cargá un archivo .json"
            className="min-h-[100px] w-full resize-y rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-3 font-mono text-[12px] leading-[1.55] text-ink-0 outline-none placeholder:text-ink-6 focus:border-[var(--accent-500)] focus:bg-[var(--surface-0)] focus:shadow-[var(--shadow-focus)]"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-4 text-[12px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)]"
          >
            <Upload className="h-3.5 w-3.5" strokeWidth={1.75} />
            Cargar archivo
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isPending || !importText.trim()}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[var(--r-sm)] bg-ink-0 px-5 text-[12px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:opacity-50"
          >
            {isPending && busyId === "__import__" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
            ) : (
              <Rocket className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
            Validar y aplicar
          </button>
        </div>

        {importErrors.length > 0 && (
          <div className="mt-4 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-[color:var(--signal-warning)]" strokeWidth={1.75} />
              <p className="text-[12px] font-medium text-ink-0">
                El template no pasó la validación.
              </p>
            </div>
            <ul className="mt-2 space-y-1">
              {importErrors.map((e, i) => (
                <li key={i} className="text-[12px] leading-[1.55] text-ink-4 font-mono">
                  · {e}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ── Toast ───────────────────────────────────────────── */}
      {toast && (
        <div
          role="status"
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-[var(--r-md)] border px-4 py-3 text-[12px] font-medium shadow-[var(--shadow-overlay)] animate-in slide-in-from-bottom-3 fade-in",
            toast.tone === "ok"
              ? "border-[color:var(--hairline)] bg-[var(--surface-0)] text-ink-0"
              : toast.tone === "warn"
              ? "border-[color:var(--hairline)] bg-[var(--surface-0)] text-[color:var(--signal-warning)]"
              : "border-[color:var(--hairline)] bg-[var(--surface-0)] text-[color:var(--signal-danger)]",
          )}
        >
          {toast.tone === "ok" ? (
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.75} />
          )}
          {toast.text}
        </div>
      )}
    </div>
  );
}

// ─── Gallery Card ───────────────────────────────────────────────────────

function GalleryCard({
  template,
  isCurrent,
  isBusy,
  onApply,
}: {
  template: StoreTemplate;
  isCurrent: boolean;
  isBusy: boolean;
  onApply: () => void;
}) {
  const categoryId = getCategoryForTemplate(template);
  const category = getCategoryById(categoryId);

  const heroBlock = template.homeBlocks.find((b) => b.blockType === "hero");
  const heroHeadline = (heroBlock?.settings?.headline as string) ?? template.name;
  const heroSubheadline = (heroBlock?.settings?.subheadline as string) ?? "";
  const primaryColor = template.branding.primaryColor;
  const secondaryColor = template.branding.secondaryColor;

  // Resolve font for preview
  const fontStack = getPreviewFontStack(template.branding.fontFamily);

  // Build block indicators for the structural preview
  const blockIndicators = template.homeBlocks.map((b, i) => {
    const type = b.blockType;
    return { type, index: i };
  });

  return (
    <article
      className={cn(
        "group flex flex-col rounded-[var(--r-md)] border bg-[var(--surface-0)] overflow-hidden transition-all",
        isCurrent
          ? "border-ink-0 shadow-[0_0_0_1px_var(--ink-0)]"
          : "border-[color:var(--hairline)] hover:border-[color:var(--hairline-strong)] hover:shadow-[var(--shadow-card)]",
      )}
    >
      {/* Visual preview — rich storefront mockup */}
      <div className="relative overflow-hidden" style={{ backgroundColor: secondaryColor }}>
        <div className="px-4 pt-4 pb-3">
          {/* Mini nav bar */}
          <div
            className="flex items-center justify-between rounded-t-[3px] px-3 py-1.5"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
              <div className="h-1 w-8 rounded-full bg-white/25" />
            </div>
            <div className="flex gap-1.5">
              <div className="h-1 w-4 rounded-full bg-white/15" />
              <div className="h-1 w-4 rounded-full bg-white/15" />
              <div className="h-1 w-4 rounded-full bg-white/15" />
            </div>
          </div>

          {/* Content area — shows hero + block structure */}
          <div className="rounded-b-[3px] border-x border-b border-black/5 bg-white/90">
            {/* Hero section */}
            <div className="px-3 pt-3 pb-2">
              <p
                className="text-[11px] font-bold leading-[1.25] tracking-[-0.01em] line-clamp-2"
                style={{ color: primaryColor, fontFamily: fontStack }}
              >
                {heroHeadline}
              </p>
              {heroSubheadline && (
                <p className="mt-1 text-[7px] leading-[1.3] text-black/40 line-clamp-1">
                  {heroSubheadline}
                </p>
              )}
              <div className="mt-2 flex items-center gap-1">
                <span
                  className="h-3.5 rounded-[2px] px-1.5 text-[6px] font-semibold leading-[14px]"
                  style={{ backgroundColor: primaryColor, color: secondaryColor }}
                >
                  {(heroBlock?.settings?.primaryActionLabel as string) ?? "CTA"}
                </span>
                {(heroBlock?.settings?.secondaryActionLabel as string) && (
                  <span className="h-3.5 w-6 rounded-[2px] border border-black/10" />
                )}
              </div>
            </div>

            {/* Block structure indicators */}
            <div className="border-t border-black/5 px-3 py-2 space-y-1.5">
              {blockIndicators.map(({ type, index }) => (
                <BlockPreviewIndicator
                  key={index}
                  blockType={type}
                  primaryColor={primaryColor}
                  secondaryColor={secondaryColor}
                  settings={template.homeBlocks[index]?.settings}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Current badge */}
        {isCurrent && (
          <div className="absolute right-3 top-3">
            <span className="inline-flex items-center gap-1 rounded-[var(--r-xs)] bg-ink-0 px-2 py-1 text-[9px] font-medium uppercase tracking-[0.14em] text-ink-12 shadow-sm">
              <CheckCircle2 className="h-2.5 w-2.5" strokeWidth={2} />
              Actual
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col px-4 py-3.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-ink-0">
              {template.name}
            </h3>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-ink-6">
              {category?.label ?? template.industry} · {THEME_STYLE_LABEL[template.themeStyle]}
            </p>
          </div>
          {/* Color palette mini swatches */}
          <div className="flex items-center gap-1 shrink-0">
            <div className="h-3.5 w-3.5 rounded-[2px] border border-black/10" style={{ backgroundColor: primaryColor }} />
            <div className="h-3.5 w-3.5 rounded-[2px] border border-black/10" style={{ backgroundColor: secondaryColor }} />
          </div>
        </div>
        <p className="mt-1.5 text-[11px] leading-[1.5] text-ink-5 line-clamp-2">
          {template.description}
        </p>

        {/* Font + section info */}
        <div className="mt-2 flex items-center gap-2 text-[10px] text-ink-5">
          <span className="shrink-0">Tipografía: <strong className="font-medium text-ink-3">{template.branding.fontFamily}</strong></span>
          <span className="text-ink-6">·</span>
          <Layers className="h-3 w-3 shrink-0" strokeWidth={1.75} />
          <span>{template.homeBlocks.length} secciones</span>
        </div>

        {/* Section chips */}
        <div className="mt-2 flex flex-wrap gap-1">
          {template.homeBlocks.map((b, i) => (
            <span
              key={i}
              className="inline-flex h-4 items-center rounded-[2px] bg-[var(--surface-1)] px-1.5 text-[8px] font-medium text-ink-5"
            >
              {SECTION_LABEL[b.blockType] ?? b.blockType}
            </span>
          ))}
        </div>

        {/* Apply CTA */}
        <div className="mt-auto pt-3">
          <button
            type="button"
            onClick={onApply}
            disabled={isBusy}
            className={cn(
              "inline-flex h-8 w-full items-center justify-center gap-2 rounded-[var(--r-sm)] text-[11px] font-medium transition-colors disabled:opacity-50",
              isCurrent
                ? "border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-ink-0 hover:bg-[var(--surface-2)]"
                : "bg-ink-0 text-ink-12 hover:bg-ink-2",
            )}
          >
            {isBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
            ) : isCurrent ? (
              "Re-aplicar"
            ) : (
              "Aplicar tema"
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

/** Renders a tiny structural indicator for each block type in the preview. */
function BlockPreviewIndicator({
  blockType,
  primaryColor,
  secondaryColor,
  settings,
}: {
  blockType: string;
  primaryColor: string;
  secondaryColor: string;
  settings?: Record<string, unknown>;
}) {
  switch (blockType) {
    case "featured_products":
      return (
        <div className="space-y-1">
          <div className="h-1 w-12 rounded-full" style={{ backgroundColor: primaryColor, opacity: 0.25 }} />
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex-1 space-y-0.5">
                <div className="h-4 rounded-[1px]" style={{ backgroundColor: secondaryColor }} />
                <div className="h-0.5 w-full rounded-full bg-black/8" />
                <div className="h-0.5 w-2/3 rounded-full bg-black/5" />
              </div>
            ))}
          </div>
        </div>
      );
    case "featured_categories":
      return (
        <div className="flex gap-1">
          {[0, 1].map((i) => (
            <div key={i} className="flex-1 h-5 rounded-[1px]" style={{ backgroundColor: primaryColor, opacity: 0.12 }} />
          ))}
        </div>
      );
    case "benefits":
      return (
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex-1 space-y-0.5">
              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: primaryColor, opacity: 0.35 }} />
              <div className="h-0.5 w-full rounded-full bg-black/10" />
            </div>
          ))}
        </div>
      );
    case "testimonials":
      return (
        <div className="space-y-0.5">
          <div className="h-0.5 w-3/4 rounded-full bg-black/8" />
          <div className="h-0.5 w-1/2 rounded-full bg-black/5" />
        </div>
      );
    case "faq":
      return (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <div className="h-0.5 w-1 rounded-full" style={{ backgroundColor: primaryColor, opacity: 0.4 }} />
            <div className="h-0.5 w-2/3 rounded-full bg-black/8" />
          </div>
          <div className="flex items-center gap-1">
            <div className="h-0.5 w-1 rounded-full" style={{ backgroundColor: primaryColor, opacity: 0.4 }} />
            <div className="h-0.5 w-1/2 rounded-full bg-black/8" />
          </div>
        </div>
      );
    case "newsletter":
      return (
        <div className="flex items-center gap-1">
          <div className="h-2 flex-1 rounded-[1px] border border-black/8" />
          <div className="h-2 w-5 rounded-[1px]" style={{ backgroundColor: primaryColor }} />
        </div>
      );
    case "hero":
      return null; // hero is rendered separately above
    default:
      return (
        <div className="h-0.5 w-full rounded-full bg-black/5" />
      );
  }
}

/** Resolve a preview font stack from the template branding fontFamily. */
function getPreviewFontStack(fontFamily: string): string {
  const map: Record<string, string> = {
    "Inter": "Inter, system-ui, sans-serif",
    "System": "system-ui, -apple-system, sans-serif",
    "Editorial Serif": "Georgia, 'Times New Roman', serif",
    "Rounded Commerce": "'Trebuchet MS', Avenir, Verdana, sans-serif",
    "Technical Mono": "Consolas, 'Courier New', monospace",
  };
  return map[fontFamily] ?? "system-ui, sans-serif";
}

// ─── Helpers ────────────────────────────────────────────────────────────

const SECTION_LABEL: Record<string, string> = {
  hero: "Hero",
  benefits: "Beneficios",
  featured_products: "Productos",
  featured_categories: "Categorías",
  testimonials: "Reseñas",
  faq: "FAQ",
  newsletter: "Newsletter",
};


