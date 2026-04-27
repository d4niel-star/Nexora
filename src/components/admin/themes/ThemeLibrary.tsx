"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
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
import type { StoreTemplate } from "@/types/store-templates";
import {
  applyBuiltInTemplateAction,
  applyImportedTemplateAction,
  exportCurrentStoreAsTemplateAction,
  type ApplyTemplateResult,
} from "@/lib/themes/actions";

// ─── Theme Library ──────────────────────────────────────────────────────
//
// Renders the full theme/template surface inside Tienda IA:
//
//   1. Current theme strip — name, theme style, block counts by source.
//   2. Built-in gallery — curated templates with Apply CTA per card.
//   3. Importer — JSON paste + file upload with honest validation.
//   4. Exporter — download current store as a re-importable template.
//
// The component is deliberately flat: no carousels, no hero banners, no
// decorative pills. Every row either reports a real DB-backed fact or
// triggers a real server action. Applying a template produces
// StoreBlock / StoreBranding / StoreTheme rows editable from
// /admin/store?tab=home, so nothing locks the merchant in.

interface CurrentThemeView {
  themeStyle: string | null;
  appliedTemplate: {
    id: string;
    name: string;
    themeStyle: string;
  } | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  fontFamily: string | null;
  blocks: {
    total: number;
    bySource: Record<string, number>;
  };
}

interface Props {
  current: CurrentThemeView;
  templates: readonly StoreTemplate[];
}

export function ThemeLibrary({ current, templates }: Props) {
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: "ok" | "warn" | "err"; text: string } | null>(null);
  const [importText, setImportText] = useState<string>("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const pushToast = (tone: "ok" | "warn" | "err", text: string) => {
    setToast({ tone, text });
    window.setTimeout(() => setToast(null), 3600);
  };

  const currentTemplateId = current.appliedTemplate?.id ?? null;

  const handleApply = (templateId: string) => {
    setBusyId(templateId);
    startTransition(async () => {
      try {
        const result: ApplyTemplateResult = await applyBuiltInTemplateAction(templateId);
        if (result.ok) {
          pushToast("ok", "Template aplicado. Ya podés editar cada sección desde Mi tienda.");
        } else {
          pushToast("err", result.errors?.[0] ?? "No se pudo aplicar el template.");
        }
      } catch (e) {
        pushToast("err", (e as Error).message ?? "Error al aplicar el template.");
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
          pushToast("ok", `Template importado (${result.blocksCreated} secciones). Ya es editable en Mi tienda.`);
          setImportText("");
        } else {
          setImportErrors(result.errors ?? ["Formato inválido."]);
          pushToast("warn", "El template no se importó. Revisá los errores listados debajo.");
        }
      } catch (e) {
        setImportErrors([(e as Error).message ?? "Error al importar."]);
      } finally {
        setBusyId(null);
      }
    });
  };

  const handleFile = async (file: File) => {
    setImportErrors([]);
    try {
      const text = await file.text();
      setImportText(text);
    } catch (e) {
      setImportErrors([`No se pudo leer el archivo: ${(e as Error).message}`]);
    }
  };

  const handleExport = () => {
    setBusyId("__export__");
    startTransition(async () => {
      try {
        const result = await exportCurrentStoreAsTemplateAction();
        if (!result.ok) {
          pushToast("err", result.errors[0] ?? "No se pudo exportar la tienda.");
          return;
        }
        const blob = new Blob([JSON.stringify(result.payload, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `nexora-template-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        pushToast("ok", "Template exportado. Podés re-importarlo en cualquier tienda Nexora.");
      } catch (e) {
        pushToast("err", (e as Error).message ?? "Error al exportar.");
      } finally {
        setBusyId(null);
      }
    });
  };

  const currentStateLabel = useMemo(() => {
    if (current.appliedTemplate) return `Template · ${current.appliedTemplate.name}`;
    if (current.blocks.bySource.ai) return "Tienda creada con IA";
    if (current.blocks.total > 0) return "Tienda editada manualmente";
    return "Tienda sin contenido inicial";
  }, [current]);

  return (
    <section
      id="theme-library"
      aria-label="Biblioteca de temas"
      className="space-y-8"
    >
      {/* ── Current state strip ───────────────────────────────── */}
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
        <div className="flex flex-col gap-3 border-b border-[color:var(--hairline)] px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
              <Palette className="h-4 w-4 text-ink-0" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-5">Tema actual</p>
              <h3 className="mt-1 text-[16px] font-semibold tracking-[-0.01em] text-ink-0">
                {currentStateLabel}
              </h3>
              <p className="mt-1 max-w-xl text-[12px] leading-[1.55] text-ink-5">
                Aplicar un template genera secciones, branding y theme style editables desde Mi tienda. Tus
                ediciones manuales o bloques generados con IA no se pisan al re-aplicar.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] h-9 px-3.5 text-[12px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50"
          >
            {busyId === "__export__" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
            ) : (
              <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
            Exportar mi tema
          </button>
        </div>

        <dl className="grid grid-cols-2 gap-px bg-[color:var(--hairline)] sm:grid-cols-4">
          <StatFact label="Theme style" value={current.themeStyle ?? "—"} />
          <StatFact
            label="Color primario"
            value={current.primaryColor ? current.primaryColor.toUpperCase() : "—"}
            swatch={current.primaryColor ?? null}
          />
          <StatFact label="Tipografía" value={current.fontFamily ?? "—"} />
          <StatFact
            label="Secciones"
            value={
              current.blocks.total > 0
                ? `${current.blocks.total} (${Object.entries(current.blocks.bySource)
                    .map(([src, n]) => `${src}:${n}`)
                    .join(" · ")})`
                : "0"
            }
          />
        </dl>
      </div>

      {/* ── Gallery ───────────────────────────────────────────── */}
      <div>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-ink-0">
              Templates de arranque
            </h3>
            <p className="mt-1 text-[12px] leading-[1.5] text-ink-5">
              Bases reales de ecommerce. Cada template escribe secciones compatibles con el renderer del storefront, listas para editar.
            </p>
          </div>
          <span className="hidden md:inline text-[11px] text-ink-6">{templates.length} disponibles</span>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {templates.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              template={tpl}
              isCurrent={tpl.id === currentTemplateId}
              isBusy={isPending && busyId === tpl.id}
              onApply={() => handleApply(tpl.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Importer ──────────────────────────────────────────── */}
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
            <FileUp className="h-4 w-4 text-ink-0" strokeWidth={1.75} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-5">Importar plantilla</p>
            <h3 className="mt-1 text-[16px] font-semibold tracking-[-0.01em] text-ink-0">
              Cargar un template Nexora
            </h3>
            <p className="mt-1 max-w-2xl text-[12px] leading-[1.55] text-ink-5">
              Aceptamos JSON con el schema de templates de Nexora (ver export para un ejemplo). No aceptamos
              themes de Shopify ni Tiendanube: requerirían un conversor real. Si el archivo no valida, te
              mostramos exactamente qué campos fallan, sin intentar adivinar.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_auto]">
          <textarea
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value);
              if (importErrors.length > 0) setImportErrors([]);
            }}
            placeholder='Pegá aquí el JSON del template o cargá un archivo .json'
            className="min-h-[120px] w-full resize-y rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-3 font-mono text-[12px] leading-[1.55] text-ink-0 outline-none placeholder:text-ink-6 focus:border-[var(--accent-500)] focus:bg-[var(--surface-0)] focus:shadow-[var(--shadow-focus)]"
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
      </div>

      {/* ── Toast ─────────────────────────────────────────────── */}
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
    </section>
  );
}

// ─── Template card ──────────────────────────────────────────────────────

function TemplateCard({
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
  const heroBlock = template.homeBlocks.find((b) => b.blockType === "hero");
  const heroHeadline = (heroBlock?.settings?.headline as string) ?? template.name;
  const primaryColor = template.branding.primaryColor;
  const secondaryColor = template.branding.secondaryColor;
  const fontStack = getPreviewFontStack(template.branding.fontFamily);

  return (
    <article
      className={cn(
        "flex flex-col rounded-[var(--r-md)] border bg-[var(--surface-0)] transition-colors overflow-hidden",
        isCurrent ? "border-ink-0" : "border-[color:var(--hairline)] hover:border-[color:var(--hairline-strong)]",
      )}
    >
      {/* Structural preview — mini storefront mockup */}
      <div className="relative overflow-hidden" style={{ backgroundColor: secondaryColor }}>
        <div className="px-4 pt-3 pb-2.5">
          {/* Mini nav bar */}
          <div
            className="flex items-center justify-between rounded-t-[2px] px-2.5 py-1"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center gap-1">
              <div className="h-1 w-1 rounded-full bg-white/40" />
              <div className="h-0.5 w-6 rounded-full bg-white/20" />
            </div>
            <div className="flex gap-1">
              <div className="h-0.5 w-3 rounded-full bg-white/10" />
              <div className="h-0.5 w-3 rounded-full bg-white/10" />
            </div>
          </div>
          {/* Hero mockup */}
          <div className="rounded-b-[2px] border-x border-b border-[color:var(--hairline)] bg-[var(--surface-paper)] px-3 py-2.5">
            <p
              className="text-[10px] font-bold leading-[1.2] line-clamp-1"
              style={{ color: primaryColor, fontFamily: fontStack }}
            >
              {heroHeadline}
            </p>
            <div className="mt-1.5 flex items-center gap-1">
              <span
                className="h-2.5 rounded-[1px] px-1 text-[5px] font-semibold leading-[10px]"
                style={{ backgroundColor: primaryColor, color: secondaryColor }}
              >
                {(heroBlock?.settings?.primaryActionLabel as string) ?? "CTA"}
              </span>
            </div>
          </div>
          {/* Block structure dots */}
          <div className="mt-1.5 flex flex-wrap gap-0.5">
            {template.homeBlocks.map((b, i) => (
              <div
                key={i}
                className="h-1 rounded-full"
                style={{
                  width: b.blockType === "hero" ? 12 : b.blockType === "featured_products" ? 10 : 7,
                  backgroundColor: primaryColor,
                  opacity: b.blockType === "hero" ? 0.15 : 0.25,
                }}
              />
            ))}
          </div>
        </div>
        {isCurrent && (
          <div className="absolute right-2 top-2">
            <span className="inline-flex items-center gap-0.5 rounded-[var(--r-xs)] bg-ink-0 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.12em] text-ink-12">
              <CheckCircle2 className="h-2.5 w-2.5" strokeWidth={2} />
              Aplicado
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col px-4 py-3.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-[14px] font-semibold tracking-[-0.01em] text-ink-0">{template.name}</h4>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-ink-6">
              {template.industry} · {THEME_STYLE_LABEL[template.themeStyle]} · <span className="font-medium text-ink-4">{template.branding.fontFamily}</span>
            </p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <div className="h-3 w-3 rounded-full border border-[color:var(--hairline)]" style={{ backgroundColor: primaryColor }} />
            <div className="h-3 w-3 rounded-full border border-[color:var(--hairline)]" style={{ backgroundColor: secondaryColor }} />
          </div>
        </div>
        <p className="mt-1.5 text-[11px] leading-[1.5] text-ink-5 line-clamp-2">{template.description}</p>

        {/* Section chips */}
        <div className="mt-2 flex flex-wrap gap-0.5">
          {template.homeBlocks.map((b, i) => (
            <span
              key={i}
              className="inline-flex h-3.5 items-center rounded-[1px] bg-[var(--surface-1)] px-1 text-[7px] font-medium text-ink-5"
            >
              {SECTION_LABEL[b.blockType] ?? b.blockType}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center gap-2 pt-3">
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
              "Aplicar como base"
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

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

// ─── Small helpers ──────────────────────────────────────────────────────

function StatFact({
  label,
  value,
  swatch,
}: {
  label: string;
  value: string;
  swatch?: string | null;
}) {
  return (
    <div className="bg-[var(--surface-0)] px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-6">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        {swatch ? (
          <span
            aria-hidden
            className="h-3 w-3 rounded-[var(--r-xs)] border border-[color:var(--hairline)]"
            style={{ backgroundColor: swatch }}
          />
        ) : null}
        <p className="truncate text-[13px] font-medium text-ink-0">{value}</p>
      </div>
    </div>
  );
}

const SECTION_LABEL: Record<string, string> = {
  hero: "Hero",
  benefits: "Beneficios",
  featured_products: "Productos",
  featured_categories: "Categorías",
  testimonials: "Reseñas",
  faq: "FAQ",
  newsletter: "Newsletter",
};

const THEME_STYLE_LABEL: Record<string, string> = {
  minimal: "Minimal",
  bold: "Bold",
  classic: "Classic",
};
