"use client";

// ─── Inspector Panel — Section settings editor (multi-tab) ───────────────────

import { useEffect, useState } from "react";
import {
  AlignCenter,
  Check,
  Columns,
  Layers,
  Maximize2,
  Paintbrush,
  Pencil,
  Save,
  Settings2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { InspectorTab, SectionBlock } from "../engine/types";
import { findSectionDef } from "../engine/section-library";

interface InspectorPanelProps {
  block: SectionBlock | null;
  allBlocks: SectionBlock[];
  activeTab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  onUpdateSettings: (blockId: string, settings: Record<string, unknown>) => void;
  onSave: () => void;
  isPending: boolean;
}

const TABS: Array<{ id: InspectorTab; label: string; icon: typeof Pencil }> = [
  { id: "content", label: "Contenido", icon: Pencil },
  { id: "design", label: "Diseño", icon: Paintbrush },
  { id: "layout", label: "Layout", icon: Columns },
  { id: "effects", label: "Efectos", icon: Sparkles },
  { id: "advanced", label: "Avanzado", icon: Settings2 },
];

const inputCls =
  "w-full h-9 px-3 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-[12px] font-medium text-ink-0 outline-none transition-[box-shadow,border-color] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)] placeholder:text-ink-6";

export function InspectorPanel({
  block,
  allBlocks,
  activeTab,
  onTabChange,
  onUpdateSettings,
  onSave,
  isPending,
}: InspectorPanelProps) {
  if (!block) {
    return (
      <aside className="flex w-[320px] shrink-0 flex-col border-l border-[color:var(--hairline)] bg-[var(--surface-0)]">
        <EmptyInspector />
      </aside>
    );
  }

  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-l border-[color:var(--hairline)] bg-[var(--surface-0)]">
      {/* Header */}
      <div className="border-b border-[color:var(--hairline)] px-4 py-3">
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-6">Inspector</p>
        <p className="mt-0.5 text-[13px] font-semibold text-ink-0">
          {findSectionDef(block.blockType)?.label ?? block.blockType}
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-[color:var(--hairline)] px-2 pt-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-1 border-b-2 px-2.5 pb-1.5 pt-1 text-[10px] font-medium transition-colors",
                active
                  ? "border-ink-0 text-ink-0"
                  : "border-transparent text-ink-5 hover:text-ink-0",
              )}
            >
              <Icon className="h-3 w-3" strokeWidth={1.75} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "content" && (
          <ContentTab block={block} onUpdate={onUpdateSettings} />
        )}
        {activeTab === "design" && (
          <DesignTab block={block} onUpdate={onUpdateSettings} />
        )}
        {activeTab === "layout" && (
          <LayoutTab block={block} onUpdate={onUpdateSettings} />
        )}
        {activeTab === "effects" && (
          <EffectsTab block={block} onUpdate={onUpdateSettings} />
        )}
        {activeTab === "advanced" && (
          <AdvancedTab block={block} onUpdate={onUpdateSettings} />
        )}
      </div>

      {/* Save button */}
      <div className="border-t border-[color:var(--hairline)] p-3">
        <button
          type="button"
          onClick={onSave}
          disabled={isPending}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-full bg-ink-0 text-[12px] font-semibold text-ink-12 transition-colors hover:bg-ink-2 disabled:opacity-50"
        >
          <Save className="h-3 w-3" strokeWidth={1.75} />
          {isPending ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </aside>
  );
}

// ─── Tab: Content ────────────────────────────────────────────────────────────

function ContentTab({
  block,
  onUpdate,
}: {
  block: SectionBlock;
  onUpdate: (blockId: string, settings: Record<string, unknown>) => void;
}) {
  const [settings, setSettings] = useState(block.settings);

  useEffect(() => { setSettings(block.settings); }, [block.settings]);

  const update = (key: string, value: unknown) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    onUpdate(block.id, next);
  };

  // Generic field editor based on blockType
  switch (block.blockType) {
    case "hero":
      return <HeroContentFields settings={settings} update={update} />;
    case "featured_products":
      return <SimpleTextFields settings={settings} update={update} fields={[{ key: "title", label: "Título" }, { key: "subtitle", label: "Subtítulo" }]} />;
    case "featured_categories":
      return <SimpleTextFields settings={settings} update={update} fields={[{ key: "title", label: "Título" }]} />;
    case "benefits":
      return <BenefitsContentFields settings={settings} update={update} />;
    case "testimonials":
      return <TestimonialsContentFields settings={settings} update={update} />;
    case "faq":
      return <FaqContentFields settings={settings} update={update} />;
    case "newsletter":
      return <SimpleTextFields settings={settings} update={update} fields={[{ key: "title", label: "Título" }, { key: "description", label: "Descripción" }, { key: "buttonLabel", label: "Texto del botón" }]} />;
    default:
      return <p className="text-[11px] text-ink-5">Sin campos de contenido disponibles para este tipo de sección.</p>;
  }
}

// ─── Tab: Design ─────────────────────────────────────────────────────────────

function DesignTab({
  block,
  onUpdate,
}: {
  block: SectionBlock;
  onUpdate: (blockId: string, settings: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionLabel>Opciones de diseño</SectionLabel>
      <p className="text-[11px] text-ink-5">
        Los colores, tipografía y sombras de esta sección se heredan del sistema de tokens del tema.
        Editá los tokens globales desde el Branding Studio.
      </p>
      <a href="/admin/store-ai/branding" className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-0 hover:underline">
        <Paintbrush className="h-3 w-3" /> Abrir Branding Studio
      </a>
    </div>
  );
}

// ─── Tab: Layout ─────────────────────────────────────────────────────────────

function LayoutTab({
  block,
  onUpdate,
}: {
  block: SectionBlock;
  onUpdate: (blockId: string, settings: Record<string, unknown>) => void;
}) {
  const [settings, setSettings] = useState(block.settings);
  useEffect(() => { setSettings(block.settings); }, [block.settings]);

  const update = (key: string, value: unknown) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    onUpdate(block.id, next);
  };

  if (block.blockType === "hero") {
    return (
      <div className="space-y-4">
        <SectionLabel>Layout del Hero</SectionLabel>
        <label className="block space-y-1.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">Variante</span>
          <div className="grid grid-cols-3 gap-1.5">
            {(["default", "centered", "split"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => update("layout", v)}
                className={cn(
                  "rounded-full py-1.5 text-[10px] font-medium capitalize transition-colors",
                  settings.layout === v ? "bg-ink-0 text-ink-12" : "border border-[color:var(--hairline)] text-ink-5 hover:text-ink-0",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionLabel>Layout</SectionLabel>
      <p className="text-[11px] text-ink-5">
        El layout de esta sección se ajusta automáticamente al contenido y al dispositivo.
      </p>
    </div>
  );
}

// ─── Tab: Effects ────────────────────────────────────────────────────────────

function EffectsTab({
  block,
  onUpdate,
}: {
  block: SectionBlock;
  onUpdate: (blockId: string, settings: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionLabel>Efectos</SectionLabel>
      <p className="text-[11px] text-ink-5">
        Los efectos hover, zoom y sombras se controlan globalmente desde los tokens del tema.
      </p>
      <a href="/admin/store-ai/branding" className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-0 hover:underline">
        <Sparkles className="h-3 w-3" /> Editar efectos globales
      </a>
    </div>
  );
}

// ─── Tab: Advanced ───────────────────────────────────────────────────────────

function AdvancedTab({
  block,
  onUpdate,
}: {
  block: SectionBlock;
  onUpdate: (blockId: string, settings: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionLabel>Avanzado</SectionLabel>
      <div className="space-y-2">
        <InfoRow label="ID" value={block.id} />
        <InfoRow label="Tipo" value={block.blockType} />
        <InfoRow label="Fuente" value={block.source === "ai" ? "IA" : "Manual"} />
        <InfoRow label="Estado" value={block.state} />
        <InfoRow label="Orden" value={String(block.sortOrder)} />
        <InfoRow label="Visible" value={block.isVisible ? "Sí" : "No"} />
      </div>
    </div>
  );
}

// ─── Content sub-forms ───────────────────────────────────────────────────────

function HeroContentFields({
  settings,
  update,
}: {
  settings: Record<string, unknown>;
  update: (key: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionLabel>Contenido principal</SectionLabel>
      <Field label="Titular">
        <textarea
          className={cn(inputCls, "min-h-20 py-2")}
          value={(settings.headline as string) ?? ""}
          onChange={(e) => update("headline", e.target.value)}
          placeholder="Tu titular principal"
          maxLength={120}
        />
      </Field>
      <Field label="Subtítulo">
        <textarea
          className={cn(inputCls, "min-h-16 py-2")}
          value={(settings.subheadline as string) ?? ""}
          onChange={(e) => update("subheadline", e.target.value)}
          placeholder="Texto de apoyo"
          maxLength={200}
        />
      </Field>

      <SectionLabel>CTAs</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Botón primario">
          <input className={inputCls} value={(settings.primaryActionLabel as string) ?? ""} onChange={(e) => update("primaryActionLabel", e.target.value)} placeholder="Comprar" />
        </Field>
        <Field label="Link">
          <input className={inputCls} value={(settings.primaryActionLink as string) ?? ""} onChange={(e) => update("primaryActionLink", e.target.value)} placeholder="products" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Botón secundario">
          <input className={inputCls} value={(settings.secondaryActionLabel as string) ?? ""} onChange={(e) => update("secondaryActionLabel", e.target.value)} placeholder="Conocer más" />
        </Field>
        <Field label="Link">
          <input className={inputCls} value={(settings.secondaryActionLink as string) ?? ""} onChange={(e) => update("secondaryActionLink", e.target.value)} placeholder="collections" />
        </Field>
      </div>

      <SectionLabel>Imagen</SectionLabel>
      <Field label="URL de fondo">
        <input className={inputCls} value={(settings.backgroundImageUrl as string) ?? ""} onChange={(e) => update("backgroundImageUrl", e.target.value)} placeholder="https://..." type="url" />
      </Field>
    </div>
  );
}

function BenefitsContentFields({
  settings,
  update,
}: {
  settings: Record<string, unknown>;
  update: (key: string, value: unknown) => void;
}) {
  const benefits = Array.isArray(settings.benefits) ? (settings.benefits as Array<{ title: string; description: string; icon: string }>) : [];

  const updateItem = (idx: number, field: string, value: string) => {
    const next = benefits.map((b, i) => (i === idx ? { ...b, [field]: value } : b));
    update("benefits", next);
  };

  return (
    <div className="space-y-4">
      <Field label="Título"><input className={inputCls} value={(settings.title as string) ?? ""} onChange={(e) => update("title", e.target.value)} /></Field>
      <Field label="Subtítulo"><input className={inputCls} value={(settings.subtitle as string) ?? ""} onChange={(e) => update("subtitle", e.target.value)} /></Field>
      <SectionLabel>Beneficios ({benefits.length})</SectionLabel>
      {benefits.map((b, idx) => (
        <div key={idx} className="space-y-2 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-3">
          <input className={inputCls} value={b.title} onChange={(e) => updateItem(idx, "title", e.target.value)} placeholder="Título" />
          <input className={inputCls} value={b.description} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder="Descripción" />
        </div>
      ))}
      <button type="button" onClick={() => update("benefits", [...benefits, { title: "", description: "", icon: "CheckCircle2" }])} className="w-full rounded-full border border-dashed border-[color:var(--hairline-strong)] py-1.5 text-[10px] font-medium text-ink-5 hover:text-ink-0">
        + Agregar beneficio
      </button>
    </div>
  );
}

function TestimonialsContentFields({
  settings,
  update,
}: {
  settings: Record<string, unknown>;
  update: (key: string, value: unknown) => void;
}) {
  const items = Array.isArray(settings.testimonials) ? (settings.testimonials as Array<{ name: string; text: string; rating: number }>) : [];

  const updateItem = (idx: number, field: string, value: unknown) => {
    const next = items.map((t, i) => (i === idx ? { ...t, [field]: value } : t));
    update("testimonials", next);
  };

  return (
    <div className="space-y-4">
      <Field label="Título"><input className={inputCls} value={(settings.title as string) ?? ""} onChange={(e) => update("title", e.target.value)} /></Field>
      <SectionLabel>Testimonios ({items.length})</SectionLabel>
      {items.map((t, idx) => (
        <div key={idx} className="space-y-2 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-3">
          <input className={inputCls} value={t.name} onChange={(e) => updateItem(idx, "name", e.target.value)} placeholder="Nombre" />
          <textarea className={cn(inputCls, "min-h-14 py-2")} value={t.text} onChange={(e) => updateItem(idx, "text", e.target.value)} placeholder="Texto" />
        </div>
      ))}
      <button type="button" onClick={() => update("testimonials", [...items, { name: "", text: "", rating: 5 }])} className="w-full rounded-full border border-dashed border-[color:var(--hairline-strong)] py-1.5 text-[10px] font-medium text-ink-5 hover:text-ink-0">
        + Agregar testimonio
      </button>
    </div>
  );
}

function FaqContentFields({
  settings,
  update,
}: {
  settings: Record<string, unknown>;
  update: (key: string, value: unknown) => void;
}) {
  const items = Array.isArray(settings.questions) ? (settings.questions as Array<{ question: string; answer: string }>) : [];

  const updateItem = (idx: number, field: string, value: string) => {
    const next = items.map((q, i) => (i === idx ? { ...q, [field]: value } : q));
    update("questions", next);
  };

  return (
    <div className="space-y-4">
      <Field label="Título"><input className={inputCls} value={(settings.title as string) ?? ""} onChange={(e) => update("title", e.target.value)} /></Field>
      <SectionLabel>Preguntas ({items.length})</SectionLabel>
      {items.map((q, idx) => (
        <div key={idx} className="space-y-2 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-3">
          <input className={inputCls} value={q.question} onChange={(e) => updateItem(idx, "question", e.target.value)} placeholder="Pregunta" />
          <textarea className={cn(inputCls, "min-h-14 py-2")} value={q.answer} onChange={(e) => updateItem(idx, "answer", e.target.value)} placeholder="Respuesta" />
        </div>
      ))}
      <button type="button" onClick={() => update("questions", [...items, { question: "", answer: "" }])} className="w-full rounded-full border border-dashed border-[color:var(--hairline-strong)] py-1.5 text-[10px] font-medium text-ink-5 hover:text-ink-0">
        + Agregar pregunta
      </button>
    </div>
  );
}

function SimpleTextFields({
  settings,
  update,
  fields,
}: {
  settings: Record<string, unknown>;
  update: (key: string, value: unknown) => void;
  fields: Array<{ key: string; label: string }>;
}) {
  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <Field key={f.key} label={f.label}>
          <input className={inputCls} value={(settings[f.key] as string) ?? ""} onChange={(e) => update(f.key, e.target.value)} placeholder={f.label} />
        </Field>
      ))}
    </div>
  );
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function EmptyInspector() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--hairline)] bg-[var(--surface-1)]">
        <Layers className="h-4 w-4 text-ink-5" strokeWidth={1.75} />
      </div>
      <p className="mt-3 text-[12px] font-medium text-ink-0">Seleccioná una sección</p>
      <p className="mt-1 text-[11px] text-ink-5">
        Hacé click en una sección del canvas o del panel de estructura para editar sus propiedades.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">{label}</span>
      {children}
    </label>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-6">{children}</p>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[var(--r-xs)] bg-[var(--surface-1)] px-2.5 py-1.5">
      <span className="text-[10px] font-medium text-ink-5">{label}</span>
      <span className="max-w-[140px] truncate text-[10px] font-mono text-ink-0">{value}</span>
    </div>
  );
}
