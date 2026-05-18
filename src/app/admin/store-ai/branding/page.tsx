"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  Palette,
  Type,
  Layout,
  Square,
  Sparkles,
  Layers,
  Monitor,
  Tablet,
  Smartphone,
  RefreshCw,
  Check,
  Moon,
  Sun,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  applyThemePresetAction,
  saveThemeTokensAction,
  setThemeVariantAction,
  resetThemeTokensAction,
  getThemeTokensAction,
} from "@/lib/store-engine/theme/actions";
import { THEME_PRESETS } from "@/lib/store-engine/theme/presets";
import { STORE_FONT_OPTIONS, resolveStoreFontOption } from "@/lib/store-engine/theme-tokens";
import type { ThemeTokens, ThemeVariant } from "@/lib/store-engine/theme/types";

type BrandingTab = "colors" | "typography" | "layout" | "buttons" | "cards" | "effects" | "presets";
type DevicePreview = "desktop" | "tablet" | "mobile";

const TABS: Array<{ id: BrandingTab; label: string; icon: typeof Palette }> = [
  { id: "colors", label: "Colores", icon: Palette },
  { id: "typography", label: "Tipografía", icon: Type },
  { id: "layout", label: "Layout", icon: Layout },
  { id: "buttons", label: "Botones", icon: Square },
  { id: "cards", label: "Cards", icon: Layers },
  { id: "effects", label: "Efectos", icon: Sparkles },
  { id: "presets", label: "Presets", icon: Settings2 },
];

export default function BrandingStudioPage() {
  const [activeTab, setActiveTab] = useState<BrandingTab>("colors");
  const [device, setDevice] = useState<DevicePreview>("desktop");
  const [tokens, setTokens] = useState<ThemeTokens | null>(null);
  const [variant, setVariant] = useState<ThemeVariant>("light");
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [previewKey, setPreviewKey] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Load current tokens on mount
  useEffect(() => {
    getThemeTokensAction().then((data) => {
      if (data) {
        setTokens(data.tokens);
        setVariant(data.variant);
        setActivePreset(data.presetId);
      }
    });
  }, []);

  const refreshPreview = useCallback(() => setPreviewKey((k) => k + 1), []);

  const saveTokens = useCallback(
    (partial: Partial<ThemeTokens>) => {
      startTransition(async () => {
        const result = await saveThemeTokensAction(partial);
        if (result.ok) {
          // Re-fetch full state
          const data = await getThemeTokensAction();
          if (data) {
            setTokens(data.tokens);
            setActivePreset(data.presetId);
          }
          refreshPreview();
        }
      });
    },
    [refreshPreview],
  );

  const applyPreset = useCallback(
    (presetId: string) => {
      startTransition(async () => {
        const result = await applyThemePresetAction(presetId);
        if (result.ok) {
          const data = await getThemeTokensAction();
          if (data) {
            setTokens(data.tokens);
            setVariant(data.variant);
            setActivePreset(data.presetId);
          }
          refreshPreview();
        }
      });
    },
    [refreshPreview],
  );

  const changeVariant = useCallback(
    (v: ThemeVariant) => {
      setVariant(v);
      startTransition(async () => {
        await setThemeVariantAction(v);
        refreshPreview();
      });
    },
    [refreshPreview],
  );

  const resetTokens = useCallback(() => {
    startTransition(async () => {
      await resetThemeTokensAction();
      const data = await getThemeTokensAction();
      if (data) {
        setTokens(data.tokens);
        setVariant(data.variant);
        setActivePreset(data.presetId);
      }
      setShowResetConfirm(false);
      refreshPreview();
    });
  }, [refreshPreview]);

  if (!tokens) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center bg-[var(--admin-canvas)]">
        <div className="text-[13px] text-ink-5">Cargando tokens...</div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col overflow-hidden bg-[var(--admin-canvas)]">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[color:var(--hairline)] bg-[var(--surface-0)] px-4">
        <div className="flex items-center gap-3">
          <Sparkles className="h-4 w-4 text-ink-5" strokeWidth={1.75} />
          <div>
            <p className="text-[13px] font-semibold tracking-[-0.01em] text-ink-0">Branding Studio</p>
            <p className="text-[10px] text-ink-5">Tokens · Presets · Variants</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Variant selector */}
          <div className="flex items-center rounded-full border border-[color:var(--hairline)] bg-[var(--surface-1)] p-0.5">
            <button
              type="button"
              onClick={() => changeVariant("light")}
              className={cn("flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium transition-colors", variant === "light" ? "bg-[var(--surface-0)] text-ink-0 shadow-[var(--shadow-soft)]" : "text-ink-5 hover:text-ink-0")}
            >
              <Sun className="h-3 w-3" /> Light
            </button>
            <button
              type="button"
              onClick={() => changeVariant("dark")}
              className={cn("flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium transition-colors", variant === "dark" ? "bg-[var(--surface-0)] text-ink-0 shadow-[var(--shadow-soft)]" : "text-ink-5 hover:text-ink-0")}
            >
              <Moon className="h-3 w-3" /> Dark
            </button>
            <button
              type="button"
              onClick={() => changeVariant("auto")}
              className={cn("flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium transition-colors", variant === "auto" ? "bg-[var(--surface-0)] text-ink-0 shadow-[var(--shadow-soft)]" : "text-ink-5 hover:text-ink-0")}
            >
              Auto
            </button>
          </div>

          {/* Device toggle */}
          <div className="flex items-center rounded-full border border-[color:var(--hairline)] bg-[var(--surface-1)] p-0.5">
            <button type="button" onClick={() => setDevice("desktop")} className={cn("rounded-full p-1.5 transition-colors", device === "desktop" ? "bg-[var(--surface-0)] text-ink-0 shadow-[var(--shadow-soft)]" : "text-ink-5 hover:text-ink-0")}>
              <Monitor className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
            <button type="button" onClick={() => setDevice("tablet")} className={cn("rounded-full p-1.5 transition-colors", device === "tablet" ? "bg-[var(--surface-0)] text-ink-0 shadow-[var(--shadow-soft)]" : "text-ink-5 hover:text-ink-0")}>
              <Tablet className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
            <button type="button" onClick={() => setDevice("mobile")} className={cn("rounded-full p-1.5 transition-colors", device === "mobile" ? "bg-[var(--surface-0)] text-ink-0 shadow-[var(--shadow-soft)]" : "text-ink-5 hover:text-ink-0")}>
              <Smartphone className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: tabs + controls */}
        <aside className="flex w-[380px] shrink-0 flex-col border-r border-[color:var(--hairline)] bg-[var(--surface-0)]">
          {/* Tab strip */}
          <nav className="flex gap-0.5 overflow-x-auto border-b border-[color:var(--hairline)] p-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors",
                    active ? "bg-ink-0 text-ink-12" : "text-ink-5 hover:bg-[var(--surface-1)] hover:text-ink-0",
                  )}
                >
                  <Icon className="h-3 w-3" strokeWidth={1.75} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === "colors" && <ColorsTab tokens={tokens} onSave={saveTokens} isPending={isPending} />}
            {activeTab === "typography" && <TypographyTab tokens={tokens} onSave={saveTokens} isPending={isPending} />}
            {activeTab === "layout" && <LayoutTab tokens={tokens} onSave={saveTokens} isPending={isPending} />}
            {activeTab === "buttons" && <ButtonsTab tokens={tokens} onSave={saveTokens} isPending={isPending} />}
            {activeTab === "cards" && <CardsTab tokens={tokens} onSave={saveTokens} isPending={isPending} />}
            {activeTab === "effects" && <EffectsTab tokens={tokens} onSave={saveTokens} isPending={isPending} />}
            {activeTab === "presets" && <PresetsTab activePreset={activePreset} onApply={applyPreset} isPending={isPending} />}
          </div>

          {/* Reset button */}
          <div className="border-t border-[color:var(--hairline)] p-3">
            {showResetConfirm ? (
              <div className="flex items-center gap-2">
                <button type="button" onClick={resetTokens} disabled={isPending} className="flex-1 rounded-full bg-[color:var(--signal-danger)] px-4 py-2 text-[11px] font-semibold text-white">
                  Confirmar reset
                </button>
                <button type="button" onClick={() => setShowResetConfirm(false)} className="flex-1 rounded-full border border-[color:var(--hairline)] px-4 py-2 text-[11px] font-semibold text-ink-0">
                  Cancelar
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowResetConfirm(true)} className="w-full rounded-full border border-[color:var(--hairline)] px-4 py-2 text-[11px] font-medium text-ink-5 transition-colors hover:text-ink-0">
                <RefreshCw className="mr-1.5 inline h-3 w-3" /> Resetear tokens
              </button>
            )}
          </div>
        </aside>

        {/* Preview */}
        <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-[var(--surface-1)] p-4">
          <div
            className={cn(
              "relative overflow-hidden rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-white shadow-[var(--shadow-overlay)] transition-all duration-300",
              device === "desktop" && "h-full w-full",
              device === "tablet" && "h-[768px] w-[1024px] max-h-full max-w-full",
              device === "mobile" && "h-[720px] w-[390px] max-h-full",
            )}
          >
            <iframe
              key={previewKey}
              src={`/?_branding_preview=1&_t=${previewKey}`}
              className="h-full w-full border-0"
              title="Storefront preview"
            />
          </div>
          {isPending && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[2px]">
              <div className="flex items-center gap-2 rounded-full bg-ink-0 px-4 py-2 text-[11px] font-medium text-ink-12 shadow-[var(--shadow-elevated)]">
                <RefreshCw className="h-3 w-3 animate-spin" /> Aplicando...
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tab Components
// ═══════════════════════════════════════════════════════════════════════════════

interface TabProps {
  tokens: ThemeTokens;
  onSave: (partial: Partial<ThemeTokens>) => void;
  isPending: boolean;
}

function ColorsTab({ tokens, onSave, isPending }: TabProps) {
  const [colors, setColors] = useState(tokens.colors);

  useEffect(() => { setColors(tokens.colors); }, [tokens.colors]);

  const update = (key: keyof typeof colors, value: string) => {
    const next = { ...colors, [key]: value };
    setColors(next);
    onSave({ colors: next });
  };

  const colorFields: Array<{ key: keyof typeof colors; label: string }> = [
    { key: "primary", label: "Principal" },
    { key: "secondary", label: "Secundario" },
    { key: "accent", label: "Acento" },
    { key: "background", label: "Fondo" },
    { key: "surface", label: "Superficie" },
    { key: "text", label: "Texto" },
    { key: "muted", label: "Texto suave" },
    { key: "success", label: "Éxito" },
    { key: "warning", label: "Advertencia" },
    { key: "danger", label: "Error" },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader title="Paleta de colores" description="Todos los colores del storefront. Cambios se reflejan en tiempo real." />
      <div className="grid grid-cols-2 gap-3">
        {colorFields.map(({ key, label }) => (
          <label key={key} className="block space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">{label}</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={colors[key]?.startsWith("#") ? colors[key] : "#000000"}
                onChange={(e) => update(key, e.target.value)}
                disabled={isPending}
                className="h-8 w-10 shrink-0 cursor-pointer rounded-[var(--r-xs)] border border-[color:var(--hairline)] p-0.5"
              />
              <input
                type="text"
                value={colors[key]}
                onChange={(e) => update(key, e.target.value)}
                disabled={isPending}
                className="h-8 w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 font-mono text-[11px] text-ink-0"
              />
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

function TypographyTab({ tokens, onSave, isPending }: TabProps) {
  const [typo, setTypo] = useState(tokens.typography);

  useEffect(() => { setTypo(tokens.typography); }, [tokens.typography]);

  const updateFont = (key: "headingFont" | "bodyFont", value: string) => {
    const next = { ...typo, [key]: value };
    setTypo(next);
    onSave({ typography: next });
  };

  const updateValue = (key: keyof typeof typo, value: string) => {
    const next = { ...typo, [key]: value };
    setTypo(next);
    onSave({ typography: next });
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Tipografía" description="Fuentes, pesos y escala." />

      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">Fuente de títulos</span>
          <div className="space-y-1.5">
            {STORE_FONT_OPTIONS.map((font) => (
              <button
                key={font.value}
                type="button"
                disabled={isPending}
                onClick={() => updateFont("headingFont", font.value)}
                className={cn("w-full rounded-[var(--r-sm)] border p-2.5 text-left transition-colors", typo.headingFont === font.value ? "border-ink-0 bg-ink-0 text-ink-12" : "border-[color:var(--hairline)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)]")}
              >
                <span className="block text-[14px] font-semibold" style={{ fontFamily: font.displayStack }}>{font.label}</span>
                <span className={cn("mt-0.5 block text-[10px]", typo.headingFont === font.value ? "text-ink-9" : "text-ink-5")}>{font.description}</span>
              </button>
            ))}
          </div>
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">Fuente de cuerpo</span>
          <select
            value={typo.bodyFont}
            onChange={(e) => updateFont("bodyFont", e.target.value)}
            disabled={isPending}
            className="h-9 w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 text-[12px] text-ink-0"
            data-square
          >
            {STORE_FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">Peso títulos</span>
            <select value={typo.headingWeight} onChange={(e) => updateValue("headingWeight", e.target.value)} disabled={isPending} className="h-9 w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 text-[12px] text-ink-0" data-square>
              <option value="400">Regular (400)</option>
              <option value="500">Medium (500)</option>
              <option value="600">Semibold (600)</option>
              <option value="700">Bold (700)</option>
              <option value="800">Extra Bold (800)</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">Tamaño base</span>
            <select value={typo.baseFontSize} onChange={(e) => updateValue("baseFontSize", e.target.value)} disabled={isPending} className="h-9 w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 text-[12px] text-ink-0" data-square>
              <option value="13px">13px (Compact)</option>
              <option value="14px">14px (Small)</option>
              <option value="15px">15px (Default)</option>
              <option value="16px">16px (Large)</option>
              <option value="17px">17px (Editorial)</option>
            </select>
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">Line Height</span>
          <input type="range" min="1.2" max="2.0" step="0.05" value={typo.lineHeight} onChange={(e) => updateValue("lineHeight", e.target.value)} disabled={isPending} className="w-full" />
          <span className="text-[11px] font-mono text-ink-5">{typo.lineHeight}</span>
        </label>
      </div>
    </div>
  );
}

function LayoutTab({ tokens, onSave, isPending }: TabProps) {
  const [layout, setLayout] = useState(tokens.layout);
  const [spacing, setSpacing] = useState(tokens.spacing);

  useEffect(() => { setLayout(tokens.layout); setSpacing(tokens.spacing); }, [tokens.layout, tokens.spacing]);

  const updateLayout = (key: keyof typeof layout, value: string) => {
    const next = { ...layout, [key]: value } as typeof layout;
    setLayout(next);
    onSave({ layout: next });
  };

  const updateSpacing = (key: keyof typeof spacing, value: string) => {
    const next = { ...spacing, [key]: value };
    setSpacing(next);
    onSave({ spacing: next });
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Layout y espaciado" description="Densidad, secciones y contenedor." />

      <label className="block space-y-1">
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">Densidad de contenido</span>
        <div className="grid grid-cols-3 gap-2">
          {(["compact", "comfortable", "spacious"] as const).map((d) => (
            <button key={d} type="button" onClick={() => updateLayout("contentDensity", d)} disabled={isPending} className={cn("rounded-full py-2 text-[11px] font-medium capitalize transition-colors", layout.contentDensity === d ? "bg-ink-0 text-ink-12" : "border border-[color:var(--hairline)] text-ink-5 hover:text-ink-0")}>
              {d}
            </button>
          ))}
        </div>
      </label>

      <label className="block space-y-1">
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">Estilo de Hero</span>
        <div className="grid grid-cols-3 gap-2">
          {(["default", "centered", "split"] as const).map((s) => (
            <button key={s} type="button" onClick={() => updateLayout("heroStyle", s)} disabled={isPending} className={cn("rounded-full py-2 text-[11px] font-medium capitalize transition-colors", layout.heroStyle === s ? "bg-ink-0 text-ink-12" : "border border-[color:var(--hairline)] text-ink-5 hover:text-ink-0")}>
              {s}
            </button>
          ))}
        </div>
      </label>

      <label className="block space-y-1">
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">Espaciado entre secciones</span>
        <input type="range" min="2" max="10" step="0.5" value={parseFloat(spacing.sectionPadding)} onChange={(e) => updateSpacing("sectionPadding", `${e.target.value}rem 0`)} disabled={isPending} className="w-full" />
        <span className="text-[11px] font-mono text-ink-5">{spacing.sectionPadding}</span>
      </label>

      <label className="block space-y-1">
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">Ancho máximo contenedor</span>
        <select value={spacing.containerWidth} onChange={(e) => updateSpacing("containerWidth", e.target.value)} disabled={isPending} className="h-9 w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 text-[12px] text-ink-0" data-square>
          <option value="68rem">68rem (Narrow)</option>
          <option value="72rem">72rem (Editorial)</option>
          <option value="76rem">76rem (Default)</option>
          <option value="80rem">80rem (Standard)</option>
          <option value="84rem">84rem (Wide)</option>
          <option value="90rem">90rem (Full)</option>
        </select>
      </label>
    </div>
  );
}

function ButtonsTab({ tokens, onSave, isPending }: TabProps) {
  const [radius, setRadius] = useState(tokens.radius);

  useEffect(() => { setRadius(tokens.radius); }, [tokens.radius]);

  const updateRadius = (key: keyof typeof radius, value: string) => {
    const next = { ...radius, [key]: value };
    setRadius(next);
    onSave({ radius: next });
  };

  const radiusOptions = [
    { value: "2px", label: "Sharp" },
    { value: "6px", label: "Suave" },
    { value: "10px", label: "Rounded" },
    { value: "16px", label: "Soft" },
    { value: "9999px", label: "Pill" },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader title="Botones y radius" description="Forma de CTAs, inputs y elementos interactivos." />

      <label className="block space-y-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">Radius de botones</span>
        <div className="grid grid-cols-5 gap-1.5">
          {radiusOptions.map((opt) => (
            <button key={opt.value} type="button" onClick={() => updateRadius("buttons", opt.value)} disabled={isPending} className={cn("rounded-[var(--r-sm)] border py-2 text-[10px] font-medium transition-colors", radius.buttons === opt.value ? "border-ink-0 bg-ink-0 text-ink-12" : "border-[color:var(--hairline)] text-ink-5 hover:text-ink-0")}>
              {opt.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex justify-center">
          <button type="button" disabled className="px-6 py-2.5 text-[12px] font-semibold bg-ink-0 text-ink-12" style={{ borderRadius: radius.buttons }}>
            Preview CTA
          </button>
        </div>
      </label>

      <label className="block space-y-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">Radius de inputs</span>
        <div className="grid grid-cols-5 gap-1.5">
          {radiusOptions.filter((o) => o.value !== "9999px").map((opt) => (
            <button key={opt.value} type="button" onClick={() => updateRadius("inputs", opt.value)} disabled={isPending} className={cn("rounded-[var(--r-sm)] border py-2 text-[10px] font-medium transition-colors", radius.inputs === opt.value ? "border-ink-0 bg-ink-0 text-ink-12" : "border-[color:var(--hairline)] text-ink-5 hover:text-ink-0")}>
              {opt.label}
            </button>
          ))}
        </div>
      </label>
    </div>
  );
}

function CardsTab({ tokens, onSave, isPending }: TabProps) {
  const [radius, setRadius] = useState(tokens.radius);

  useEffect(() => { setRadius(tokens.radius); }, [tokens.radius]);

  const updateRadius = (key: keyof typeof radius, value: string) => {
    const next = { ...radius, [key]: value };
    setRadius(next);
    onSave({ radius: next });
  };

  const cardRadiusOptions = [
    { value: "4px", label: "Sharp" },
    { value: "8px", label: "Suave" },
    { value: "12px", label: "Default" },
    { value: "16px", label: "Rounded" },
    { value: "24px", label: "Soft" },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader title="Cards y superficies" description="Forma de tarjetas, imágenes y contenedores." />

      <label className="block space-y-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">Radius de cards</span>
        <div className="grid grid-cols-5 gap-1.5">
          {cardRadiusOptions.map((opt) => (
            <button key={opt.value} type="button" onClick={() => updateRadius("cards", opt.value)} disabled={isPending} className={cn("rounded-[var(--r-sm)] border py-2 text-[10px] font-medium transition-colors", radius.cards === opt.value ? "border-ink-0 bg-ink-0 text-ink-12" : "border-[color:var(--hairline)] text-ink-5 hover:text-ink-0")}>
              {opt.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex justify-center">
          <div className="h-24 w-36 border border-[color:var(--hairline)] bg-[var(--surface-1)] shadow-[var(--shadow-soft)]" style={{ borderRadius: radius.cards }} />
        </div>
      </label>

      <label className="block space-y-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">Radius de imágenes</span>
        <div className="grid grid-cols-5 gap-1.5">
          {cardRadiusOptions.map((opt) => (
            <button key={opt.value} type="button" onClick={() => updateRadius("images", opt.value)} disabled={isPending} className={cn("rounded-[var(--r-sm)] border py-2 text-[10px] font-medium transition-colors", radius.images === opt.value ? "border-ink-0 bg-ink-0 text-ink-12" : "border-[color:var(--hairline)] text-ink-5 hover:text-ink-0")}>
              {opt.label}
            </button>
          ))}
        </div>
      </label>
    </div>
  );
}

function EffectsTab({ tokens, onSave, isPending }: TabProps) {
  const [effects, setEffects] = useState(tokens.effects);

  useEffect(() => { setEffects(tokens.effects); }, [tokens.effects]);

  const updateEffect = (key: keyof typeof effects, value: number | string | boolean) => {
    const next = { ...effects, [key]: value };
    setEffects(next);
    onSave({ effects: next });
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Efectos" description="Hover, zoom, sombras y movimiento." />

      <label className="block space-y-1">
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">Intensidad de hover</span>
        <input type="range" min="0" max="1" step="0.1" value={effects.hoverIntensity} onChange={(e) => updateEffect("hoverIntensity", parseFloat(e.target.value))} disabled={isPending} className="w-full" />
        <span className="text-[11px] font-mono text-ink-5">{effects.hoverIntensity}</span>
      </label>

      <label className="block space-y-1">
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">Zoom de imagen al hover</span>
        <input type="range" min="1.0" max="1.1" step="0.01" value={effects.imageHoverZoom} onChange={(e) => updateEffect("imageHoverZoom", parseFloat(e.target.value))} disabled={isPending} className="w-full" />
        <span className="text-[11px] font-mono text-ink-5">{effects.imageHoverZoom}x</span>
      </label>

      <label className="block space-y-1">
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">Card lift al hover</span>
        <div className="grid grid-cols-4 gap-1.5">
          {["-1px", "-2px", "-3px", "-4px"].map((val) => (
            <button key={val} type="button" onClick={() => updateEffect("cardLift", val)} disabled={isPending} className={cn("rounded-full py-2 text-[11px] font-medium transition-colors", effects.cardLift === val ? "bg-ink-0 text-ink-12" : "border border-[color:var(--hairline)] text-ink-5 hover:text-ink-0")}>
              {val}
            </button>
          ))}
        </div>
      </label>

      <label className="flex items-center gap-3">
        <input type="checkbox" checked={effects.glassmorphism} onChange={(e) => updateEffect("glassmorphism", e.target.checked)} disabled={isPending} className="h-4 w-4" />
        <span className="text-[12px] font-medium text-ink-0">Glassmorphism (blur effects)</span>
      </label>
    </div>
  );
}

function PresetsTab({ activePreset, onApply, isPending }: { activePreset: string | null; onApply: (id: string) => void; isPending: boolean }) {
  return (
    <div className="space-y-5">
      <SectionHeader title="Presets" description="Aplicar un preset modifica SOLO tokens. Secciones, bloques y navegación permanecen intactos." />
      <div className="space-y-2">
        {THEME_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onApply(preset.id)}
            disabled={isPending}
            className={cn("w-full rounded-[var(--r-md)] border p-3.5 text-left transition-colors", activePreset === preset.id ? "border-ink-0 bg-ink-0 text-ink-12" : "border-[color:var(--hairline)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)]")}
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold">{preset.name}</span>
              {activePreset === preset.id && <Check className="h-3.5 w-3.5" />}
            </div>
            <p className={cn("mt-1 text-[11px]", activePreset === preset.id ? "text-ink-9" : "text-ink-5")}>{preset.description}</p>
            {/* Color swatch preview */}
            <div className="mt-3 flex gap-1">
              {preset.tokens.colors && (
                <>
                  <div className="h-4 w-4 rounded-full border border-white/20" style={{ background: preset.tokens.colors.primary }} />
                  <div className="h-4 w-4 rounded-full border border-black/10" style={{ background: preset.tokens.colors.secondary }} />
                  <div className="h-4 w-4 rounded-full border border-white/20" style={{ background: preset.tokens.colors.accent }} />
                  <div className="h-4 w-4 rounded-full border border-black/10" style={{ background: preset.tokens.colors.background }} />
                </>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Shared Components ───────────────────────────────────────────────────────

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="pb-2">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">{title}</p>
      <p className="mt-1 text-[11px] leading-[1.5] text-ink-5">{description}</p>
    </div>
  );
}
