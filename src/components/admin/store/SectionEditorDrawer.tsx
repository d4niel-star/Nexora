"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Check,
  ChevronDown,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { saveHomeBlocks } from "@/lib/store-engine/actions";
import type { BlockType } from "@/types/store-engine";

// ─── Section Editor Drawer ──────────────────────────────────────────────
// Real, per-block-type content editing. Each block type gets a focused
// form that maps 1:1 to the settings schema the storefront consumes.
// No WYSIWYG, no drag-and-drop, no chaos — just clear fields that save.

export interface SectionBlock {
  id: string;
  blockType: string;
  sortOrder: number;
  isVisible: boolean;
  settings: Record<string, unknown>;
  source: string;
  state: string;
}

interface SectionEditorDrawerProps {
  block: SectionBlock | null;
  allBlocks: SectionBlock[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const inputCls =
  "w-full h-11 px-3.5 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] text-[13px] font-medium text-ink-0 outline-none transition-[box-shadow,border-color] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)] placeholder:text-ink-6";
const labelCls = "text-[12px] font-medium text-ink-5";
const sectionTitle =
  "text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5";

export function SectionEditorDrawer({
  block,
  allBlocks,
  isOpen,
  onClose,
  onSaved,
}: SectionEditorDrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (block) setSettings({ ...block.settings });
    setSaved(false);
  }, [block]);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "unset";
      return;
    }
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !block) return null;

  const updateField = (key: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const updatedBlocks = allBlocks.map((b) => ({
          blockType: b.blockType as BlockType,
          sortOrder: b.sortOrder,
          isVisible: b.isVisible,
          settingsJson:
            b.id === block.id
              ? JSON.stringify(settings)
              : JSON.stringify(b.settings),
          source: b.source,
          state: "published",
        }));
        await saveHomeBlocks(updatedBlocks);
        setSaved(true);
        onSaved();
      } catch {
        // Error handled by parent toast system
      }
    });
  };

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-ink-0/40"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        aria-labelledby="section-editor-title"
        aria-modal="true"
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-y-auto border-l border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-overlay)] outline-none animate-in slide-in-from-right-5 duration-[var(--dur-slow)] sm:max-w-xl"
        role="dialog"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="sticky top-0 z-20 border-b border-[color:var(--hairline)] bg-[var(--surface-0)] px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className={sectionTitle}>Editar sección</p>
              <h2
                id="section-editor-title"
                className="mt-1 truncate text-[18px] font-semibold tracking-[-0.02em] text-ink-0"
              >
                {blockLabel(block.blockType)}
              </h2>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">
                  {block.source === "ai" ? "IA" : "Manual"}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-[var(--r-xs)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]",
                    block.isVisible
                      ? "bg-[color:var(--signal-success)]/10 text-[color:var(--signal-success)]"
                      : "bg-[var(--surface-2)] text-ink-5"
                  )}
                >
                  {block.isVisible ? "Visible" : "Oculta"}
                </span>
              </div>
            </div>
            <button
              aria-label="Cerrar editor"
              className="rounded-[var(--r-sm)] p-2 text-ink-5 transition-colors hover:bg-[var(--surface-2)] hover:text-ink-0 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6 p-6 sm:p-8">
          {block.blockType === "hero" && (
            <HeroEditor settings={settings} onChange={updateField} />
          )}
          {block.blockType === "benefits" && (
            <BenefitsEditor settings={settings} onChange={updateField} />
          )}
          {block.blockType === "featured_products" && (
            <FeaturedProductsEditor
              settings={settings}
              onChange={updateField}
            />
          )}
          {block.blockType === "featured_categories" && (
            <FeaturedCategoriesEditor
              settings={settings}
              onChange={updateField}
            />
          )}
          {block.blockType === "testimonials" && (
            <TestimonialsEditor settings={settings} onChange={updateField} />
          )}
          {block.blockType === "faq" && (
            <FaqEditor settings={settings} onChange={updateField} />
          )}
          {block.blockType === "newsletter" && (
            <NewsletterEditor settings={settings} onChange={updateField} />
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-20 border-t border-[color:var(--hairline)] bg-[var(--surface-0)] px-6 py-4 sm:px-8">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-ink-5">
              {saved
                ? "Cambios guardados"
                : "Los cambios se aplican al guardar"}
            </p>
            <button
              className="inline-flex items-center gap-2 h-10 px-5 rounded-[var(--r-sm)] bg-ink-0 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
              disabled={isPending}
              onClick={handleSave}
              type="button"
            >
              {saved ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {isPending ? "Guardando..." : saved ? "Guardado" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Per-block editors ───────────────────────────────────────────────────

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

// ── Hero ──

function HeroEditor({
  settings,
  onChange,
}: {
  settings: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <FieldGroup>
      <h3 className={sectionTitle}>Contenido principal</h3>
      <Field label="Titular principal">
        <textarea
          className={cn(inputCls, "min-h-24 py-2.5")}
          value={(settings.headline as string) ?? ""}
          onChange={(e) => onChange("headline", e.target.value)}
          placeholder="Tu titular principal"
          maxLength={120}
        />
      </Field>
      <Field label="Subtítulo">
        <textarea
          className={cn(inputCls, "min-h-20 py-2.5")}
          value={(settings.subheadline as string) ?? ""}
          onChange={(e) => onChange("subheadline", e.target.value)}
          placeholder="Texto de apoyo debajo del titular"
          maxLength={200}
        />
      </Field>

      <h3 className={cn(sectionTitle, "pt-4")}>Llamadas a la acción</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Texto del botón principal">
          <input
            className={inputCls}
            value={(settings.primaryActionLabel as string) ?? ""}
            onChange={(e) => onChange("primaryActionLabel", e.target.value)}
            placeholder="Comprar ahora"
          />
        </Field>
        <Field label="Link del botón principal">
          <input
            className={inputCls}
            value={(settings.primaryActionLink as string) ?? ""}
            onChange={(e) => onChange("primaryActionLink", e.target.value)}
            placeholder="products"
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Texto del botón secundario">
          <input
            className={inputCls}
            value={(settings.secondaryActionLabel as string) ?? ""}
            onChange={(e) => onChange("secondaryActionLabel", e.target.value)}
            placeholder="Conocer más"
          />
        </Field>
        <Field label="Link del botón secundario">
          <input
            className={inputCls}
            value={(settings.secondaryActionLink as string) ?? ""}
            onChange={(e) => onChange("secondaryActionLink", e.target.value)}
            placeholder="collections"
          />
        </Field>
      </div>

      <h3 className={cn(sectionTitle, "pt-4")}>Imagen de fondo</h3>
      <Field label="URL de imagen">
        <input
          className={inputCls}
          value={(settings.backgroundImageUrl as string) ?? ""}
          onChange={(e) => onChange("backgroundImageUrl", e.target.value)}
          placeholder="https://..."
          type="url"
        />
      </Field>
    </FieldGroup>
  );
}

// ── Benefits ──

interface BenefitItem {
  title: string;
  description: string;
  icon: string;
}

const iconOptions = [
  "CheckCircle2",
  "Leaf",
  "PackageCheck",
  "Rabbit",
  "ShieldCheck",
  "Truck",
  "Zap",
];

function BenefitsEditor({
  settings,
  onChange,
}: {
  settings: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const benefits = Array.isArray(settings.benefits)
    ? (settings.benefits as BenefitItem[])
    : [];

  const updateBenefit = (index: number, field: string, value: string) => {
    const updated = benefits.map((b, i) =>
      i === index ? { ...b, [field]: value } : b
    );
    onChange("benefits", updated);
  };

  const addBenefit = () => {
    onChange("benefits", [
      ...benefits,
      { title: "", description: "", icon: "CheckCircle2" },
    ]);
  };

  const removeBenefit = (index: number) => {
    onChange(
      "benefits",
      benefits.filter((_, i) => i !== index)
    );
  };

  return (
    <FieldGroup>
      <Field label="Título de la sección">
        <input
          className={inputCls}
          value={(settings.title as string) ?? ""}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="Por qué elegirnos"
        />
      </Field>
      <Field label="Subtítulo">
        <input
          className={inputCls}
          value={(settings.subtitle as string) ?? ""}
          onChange={(e) => onChange("subtitle", e.target.value)}
          placeholder="Texto de apoyo opcional"
        />
      </Field>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className={sectionTitle}>
            Beneficios ({benefits.length})
          </h3>
          <button
            type="button"
            onClick={addBenefit}
            className="inline-flex items-center gap-1.5 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2.5 py-1.5 text-[11px] font-medium text-ink-3 transition-colors hover:bg-[var(--surface-2)] hover:text-ink-0"
          >
            <Plus className="h-3 w-3" />
            Agregar
          </button>
        </div>
        {benefits.map((benefit, idx) => (
          <div
            key={idx}
            className="space-y-3 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-4"
          >
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-mono text-ink-6">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <button
                type="button"
                onClick={() => removeBenefit(idx)}
                className="rounded-[var(--r-sm)] p-1 text-ink-6 hover:text-[color:var(--signal-danger)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <input
              className={inputCls}
              value={benefit.title}
              onChange={(e) => updateBenefit(idx, "title", e.target.value)}
              placeholder="Título del beneficio"
            />
            <input
              className={inputCls}
              value={benefit.description}
              onChange={(e) =>
                updateBenefit(idx, "description", e.target.value)
              }
              placeholder="Descripción breve"
            />
            <select
              className={cn(inputCls, "appearance-none")}
              value={benefit.icon || "CheckCircle2"}
              onChange={(e) => updateBenefit(idx, "icon", e.target.value)}
            >
              {iconOptions.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </FieldGroup>
  );
}

// ── Featured Products ──

function FeaturedProductsEditor({
  settings,
  onChange,
}: {
  settings: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const handles = Array.isArray(settings.productHandles)
    ? (settings.productHandles as string[])
    : [];

  return (
    <FieldGroup>
      <Field label="Título de la sección">
        <input
          className={inputCls}
          value={(settings.title as string) ?? ""}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="Productos destacados"
        />
      </Field>
      <Field label="Subtítulo">
        <input
          className={inputCls}
          value={(settings.subtitle as string) ?? ""}
          onChange={(e) => onChange("subtitle", e.target.value)}
          placeholder="Texto de apoyo"
        />
      </Field>
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-4">
        <p className={sectionTitle}>Productos seleccionados</p>
        <p className="mt-2 text-[12px] text-ink-5">
          {handles.length > 0
            ? `${handles.length} productos configurados: ${handles.join(", ")}`
            : "Los productos se cargan automáticamente al publicar la tienda."}
        </p>
      </div>
    </FieldGroup>
  );
}

// ── Featured Categories ──

function FeaturedCategoriesEditor({
  settings,
  onChange,
}: {
  settings: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <FieldGroup>
      <Field label="Título de la sección">
        <input
          className={inputCls}
          value={(settings.title as string) ?? ""}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="Categorías"
        />
      </Field>
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-4">
        <p className={sectionTitle}>Colecciones seleccionadas</p>
        <p className="mt-2 text-[12px] text-ink-5">
          Las colecciones se vinculan desde el catálogo.
        </p>
      </div>
    </FieldGroup>
  );
}

// ── Testimonials ──

interface TestimonialItem {
  name: string;
  text: string;
  rating: number;
}

function TestimonialsEditor({
  settings,
  onChange,
}: {
  settings: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const testimonials = Array.isArray(settings.testimonials)
    ? (settings.testimonials as TestimonialItem[])
    : [];

  const updateItem = (index: number, field: string, value: unknown) => {
    const updated = testimonials.map((t, i) =>
      i === index ? { ...t, [field]: value } : t
    );
    onChange("testimonials", updated);
  };

  const addItem = () => {
    onChange("testimonials", [
      ...testimonials,
      { name: "", text: "", rating: 5 },
    ]);
  };

  const removeItem = (index: number) => {
    onChange(
      "testimonials",
      testimonials.filter((_, i) => i !== index)
    );
  };

  return (
    <FieldGroup>
      <Field label="Título de la sección">
        <input
          className={inputCls}
          value={(settings.title as string) ?? ""}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="Testimonios"
        />
      </Field>
      <Field label="Subtítulo">
        <input
          className={inputCls}
          value={(settings.subtitle as string) ?? ""}
          onChange={(e) => onChange("subtitle", e.target.value)}
          placeholder="Lo que dicen nuestros clientes"
        />
      </Field>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className={sectionTitle}>
            Testimonios ({testimonials.length})
          </h3>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1.5 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2.5 py-1.5 text-[11px] font-medium text-ink-3 transition-colors hover:bg-[var(--surface-2)] hover:text-ink-0"
          >
            <Plus className="h-3 w-3" />
            Agregar
          </button>
        </div>
        {testimonials.map((t, idx) => (
          <div
            key={idx}
            className="space-y-3 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-4"
          >
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-mono text-ink-6">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="rounded-[var(--r-sm)] p-1 text-ink-6 hover:text-[color:var(--signal-danger)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <input
              className={inputCls}
              value={t.name}
              onChange={(e) => updateItem(idx, "name", e.target.value)}
              placeholder="Nombre del cliente"
            />
            <textarea
              className={cn(inputCls, "min-h-20 py-2.5")}
              value={t.text}
              onChange={(e) => updateItem(idx, "text", e.target.value)}
              placeholder="Texto del testimonio"
            />
            <Field label="Calificación (1-5)">
              <input
                className={inputCls}
                type="number"
                min={1}
                max={5}
                value={t.rating}
                onChange={(e) =>
                  updateItem(idx, "rating", Number(e.target.value))
                }
              />
            </Field>
          </div>
        ))}
      </div>
    </FieldGroup>
  );
}

// ── FAQ ──

interface FaqItem {
  question: string;
  answer: string;
}

function FaqEditor({
  settings,
  onChange,
}: {
  settings: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const questions = Array.isArray(settings.questions)
    ? (settings.questions as FaqItem[])
    : [];

  const updateItem = (index: number, field: string, value: string) => {
    const updated = questions.map((q, i) =>
      i === index ? { ...q, [field]: value } : q
    );
    onChange("questions", updated);
  };

  const addItem = () => {
    onChange("questions", [
      ...questions,
      { question: "", answer: "" },
    ]);
  };

  const removeItem = (index: number) => {
    onChange(
      "questions",
      questions.filter((_, i) => i !== index)
    );
  };

  return (
    <FieldGroup>
      <Field label="Título de la sección">
        <input
          className={inputCls}
          value={(settings.title as string) ?? ""}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="Preguntas frecuentes"
        />
      </Field>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className={sectionTitle}>
            Preguntas ({questions.length})
          </h3>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1.5 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2.5 py-1.5 text-[11px] font-medium text-ink-3 transition-colors hover:bg-[var(--surface-2)] hover:text-ink-0"
          >
            <Plus className="h-3 w-3" />
            Agregar
          </button>
        </div>
        {questions.map((q, idx) => (
          <div
            key={idx}
            className="space-y-3 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-4"
          >
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-mono text-ink-6">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="rounded-[var(--r-sm)] p-1 text-ink-6 hover:text-[color:var(--signal-danger)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <input
              className={inputCls}
              value={q.question}
              onChange={(e) => updateItem(idx, "question", e.target.value)}
              placeholder="Pregunta"
            />
            <textarea
              className={cn(inputCls, "min-h-20 py-2.5")}
              value={q.answer}
              onChange={(e) => updateItem(idx, "answer", e.target.value)}
              placeholder="Respuesta"
            />
          </div>
        ))}
      </div>
    </FieldGroup>
  );
}

// ── Newsletter ──

function NewsletterEditor({
  settings,
  onChange,
}: {
  settings: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <FieldGroup>
      <Field label="Título">
        <input
          className={inputCls}
          value={(settings.title as string) ?? ""}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="Newsletter"
        />
      </Field>
      <Field label="Descripción">
        <textarea
          className={cn(inputCls, "min-h-20 py-2.5")}
          value={(settings.description as string) ?? ""}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="Texto de la sección newsletter"
        />
      </Field>
      <Field label="Texto del botón">
        <input
          className={inputCls}
          value={(settings.buttonLabel as string) ?? ""}
          onChange={(e) => onChange("buttonLabel", e.target.value)}
          placeholder="Suscribirse"
        />
      </Field>
    </FieldGroup>
  );
}

// ── Shared ──

function blockLabel(blockType: string): string {
  const labels: Record<string, string> = {
    hero: "Hero principal",
    featured_products: "Productos destacados",
    featured_categories: "Categorías",
    benefits: "Beneficios",
    testimonials: "Testimonios",
    faq: "Preguntas frecuentes",
    newsletter: "Newsletter",
  };
  return labels[blockType] ?? blockType;
}
