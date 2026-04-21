"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Layers,
  Loader2,
  MessageSquare,
  Palette,
  Sparkles,
  SwatchBook,
  Type,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Nexora IA Copilot ──────────────────────────────────────────────────
//
// A small, elegant, persistent floating assistant that lives on the
// Tienda IA landing and /admin/store.  It issues REAL edits to the
// real store system — branding, blocks, theme — via server actions
// already available.
//
// It is NOT a chat that "does magic" in isolation.  Every action maps
// directly to the same server mutations the manual editor uses:
//   · saveStoreBranding   → colours, font, tone
//   · saveHomeBlocks      → add/remove/reorder/edit blocks
//   · applyBuiltInTemplateAction → switch theme
//
// Architecture:
//   1. The copilot is a floating FAB + expandable panel.
//   2. It presents a set of "quick actions" grouped by capability.
//   3. Each action opens a small inline form (never a full page).
//   4. On submit it calls the real server action, shows the result,
//      and the page revalidates via the action's own revalidatePath.

// ─── Types ──────────────────────────────────────────────────────────────

interface CopilotAction {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  category: "branding" | "content" | "structure";
}

interface ActionLog {
  id: string;
  action: string;
  detail: string;
  timestamp: number;
  status: "ok" | "err";
}

// ─── Quick actions ──────────────────────────────────────────────────────

const COPILOT_ACTIONS: CopilotAction[] = [
  {
    id: "change-primary-color",
    label: "Cambiar color principal",
    description: "Actualizá el color primario de tu marca.",
    icon: Palette,
    category: "branding",
  },
  {
    id: "change-secondary-color",
    label: "Cambiar color secundario",
    description: "Modificá el color de fondo y acentos.",
    icon: Palette,
    category: "branding",
  },
  {
    id: "change-font",
    label: "Cambiar tipografía",
    description: "Elegí una tipografía diferente para tu tienda.",
    icon: Type,
    category: "branding",
  },
  {
    id: "change-hero-headline",
    label: "Editar titular del Hero",
    description: "Reescribí el texto principal de tu landing.",
    icon: MessageSquare,
    category: "content",
  },
  {
    id: "change-hero-subheadline",
    label: "Editar subtitular del Hero",
    description: "Ajustá el texto secundario de tu landing.",
    icon: MessageSquare,
    category: "content",
  },
  {
    id: "change-hero-cta",
    label: "Editar CTA del Hero",
    description: "Cambiá el texto del botón principal.",
    icon: ArrowRight,
    category: "content",
  },
  {
    id: "toggle-section",
    label: "Ocultar / mostrar sección",
    description: "Activá o desactivá un bloque de tu landing.",
    icon: EyeOff,
    category: "structure",
  },
  {
    id: "apply-theme",
    label: "Aplicar tema base",
    description: "Cambiá toda la base de diseño a un tema existente.",
    icon: SwatchBook,
    category: "structure",
  },
  {
    id: "change-tone",
    label: "Cambiar tono de copy",
    description: "Ajustá el tono de comunicación de tu marca.",
    icon: MessageSquare,
    category: "branding",
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  branding: "Identidad visual",
  content: "Contenido",
  structure: "Estructura y temas",
};

const FONT_OPTIONS = [
  "Inter",
  "Roboto",
  "Outfit",
  "Montserrat",
  "Poppins",
  "DM Sans",
  "Space Grotesk",
  "Playfair Display",
  "Lora",
  "Source Sans 3",
];

const TONE_OPTIONS = [
  "Elegante",
  "Casual",
  "Profesional",
  "Juvenil",
  "Neutro",
  "Premium",
  "Amigable",
];

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero principal",
  featured_products: "Productos destacados",
  featured_categories: "Categorías",
  benefits: "Beneficios",
  testimonials: "Testimonios",
  faq: "Preguntas frecuentes",
  newsletter: "Newsletter",
};

const BUILT_IN_THEMES = [
  { id: "minimal-essentials", label: "Minimal Essentials" },
  { id: "bold-commerce", label: "Bold Commerce" },
  { id: "classic-elegance", label: "Classic Elegance" },
  { id: "fresh-catalog", label: "Fresh Catalog" },
  { id: "moda-urban", label: "Urban Fashion" },
  { id: "tech-showcase", label: "Tech Showcase" },
  { id: "belleza-ritual", label: "Beauty Ritual" },
  { id: "editorial-lifestyle", label: "Lifestyle Editorial" },
];

// ─── Component ──────────────────────────────────────────────────────────

export function NexoraCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>("branding");
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeActionId) setActiveActionId(null);
        else setIsOpen(false);
      }
    };
    if (isOpen) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, activeActionId]);

  const pushLog = useCallback((action: string, detail: string, status: "ok" | "err") => {
    setLogs((prev) => [
      { id: `${Date.now()}-${Math.random()}`, action, detail, timestamp: Date.now(), status },
      ...prev.slice(0, 9),
    ]);
  }, []);

  const handleActionComplete = useCallback(() => {
    setActiveActionId(null);
  }, []);

  const groupedActions = COPILOT_ACTIONS.reduce<Record<string, CopilotAction[]>>((acc, a) => {
    (acc[a.category] ??= []).push(a);
    return acc;
  }, {});

  return (
    <>
      {/* ── FAB ────────────────────────────────────────── */}
      <button
        type="button"
        aria-label={isOpen ? "Cerrar copiloto Nexora IA" : "Abrir copiloto Nexora IA"}
        onClick={() => setIsOpen((o) => !o)}
        className={cn(
          "fixed bottom-6 right-6 z-[70] flex h-12 w-12 items-center justify-center rounded-full shadow-[var(--shadow-overlay)] transition-all duration-300 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
          isOpen
            ? "bg-[var(--surface-0)] border border-[color:var(--hairline)] text-ink-0 rotate-0"
            : "bg-ink-0 text-ink-12 hover:bg-ink-2",
        )}
      >
        {isOpen ? (
          <X className="h-5 w-5" strokeWidth={1.75} />
        ) : (
          <Sparkles className="h-5 w-5" strokeWidth={1.75} />
        )}
      </button>

      {/* ── Panel ──────────────────────────────────────── */}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Copiloto Nexora IA"
          className="fixed bottom-20 right-6 z-[70] flex w-[340px] max-h-[min(600px,calc(100vh-120px))] flex-col rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-overlay)] animate-in slide-in-from-bottom-4 fade-in duration-300"
        >
          {/* Header */}
          <header className="flex items-center justify-between border-b border-[color:var(--hairline)] px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-[var(--r-xs)] bg-ink-0 text-ink-12">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-ink-0">Nexora IA</p>
                <p className="text-[9px] uppercase tracking-[0.12em] text-ink-5">Copiloto de diseño</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-[var(--r-xs)] p-1 text-ink-5 transition-colors hover:bg-[var(--surface-2)] hover:text-ink-0"
              aria-label="Cerrar"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </header>

          {/* Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-3">
            {activeActionId ? (
              <ActionForm
                action={COPILOT_ACTIONS.find((a) => a.id === activeActionId)!}
                onComplete={handleActionComplete}
                onLog={pushLog}
              />
            ) : (
              <div className="space-y-2">
                <p className="px-1 text-[11px] leading-[1.5] text-ink-5">
                  Edición asistida de tu tienda real. Cada acción modifica colores, contenido o
                  estructura directamente en el sistema.
                </p>

                {Object.entries(groupedActions).map(([cat, actions]) => (
                  <div key={cat} className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedCategory(expandedCategory === cat ? null : cat)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-[var(--surface-1)]"
                    >
                      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
                        {CATEGORY_LABELS[cat] ?? cat}
                      </span>
                      {expandedCategory === cat ? (
                        <ChevronUp className="h-3 w-3 text-ink-5" strokeWidth={1.75} />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-ink-5" strokeWidth={1.75} />
                      )}
                    </button>
                    {expandedCategory === cat && (
                      <div className="border-t border-[color:var(--hairline)] divide-y divide-[color:var(--hairline)]">
                        {actions.map((action) => {
                          const Icon = action.icon;
                          return (
                            <button
                              key={action.id}
                              type="button"
                              onClick={() => setActiveActionId(action.id)}
                              className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-1)]"
                            >
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-3 transition-colors group-hover:bg-[var(--surface-2)]">
                                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[12px] font-medium text-ink-0">
                                  {action.label}
                                </p>
                                <p className="truncate text-[10px] text-ink-5">
                                  {action.description}
                                </p>
                              </div>
                              <ArrowRight className="h-3 w-3 shrink-0 text-ink-6 transition-colors group-hover:text-ink-0" strokeWidth={1.75} />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action log */}
          {logs.length > 0 && !activeActionId && (
            <div className="border-t border-[color:var(--hairline)] px-3 py-2 max-h-[120px] overflow-y-auto">
              <p className="mb-1.5 text-[9px] font-medium uppercase tracking-[0.12em] text-ink-6">
                Historial
              </p>
              <div className="space-y-1">
                {logs.slice(0, 4).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-1.5 text-[10px]"
                  >
                    {log.status === "ok" ? (
                      <CheckCircle2 className="mt-0.5 h-2.5 w-2.5 shrink-0 text-[color:var(--signal-success)]" strokeWidth={2} />
                    ) : (
                      <X className="mt-0.5 h-2.5 w-2.5 shrink-0 text-[color:var(--signal-danger)]" strokeWidth={2} />
                    )}
                    <span className="text-ink-4 leading-[1.4]">
                      <strong className="text-ink-0 font-medium">{log.action}</strong>{" "}
                      {log.detail}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─── Action form ────────────────────────────────────────────────────────

function ActionForm({
  action,
  onComplete,
  onLog,
}: {
  action: CopilotAction;
  onComplete: () => void;
  onLog: (action: string, detail: string, status: "ok" | "err") => void;
}) {
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; detail: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (!value.trim()) return;
    startTransition(async () => {
      try {
        const { saveStoreBranding, fetchHomeBlocks, saveHomeBlocks } = await import(
          "@/lib/store-engine/actions"
        );

        switch (action.id) {
          case "change-primary-color": {
            if (!/^#[0-9a-fA-F]{6}$/.test(value.trim())) {
              setResult({ ok: false, detail: "Formato inválido. Usá HEX (#RRGGBB)." });
              onLog(action.label, "formato inválido", "err");
              return;
            }
            await saveStoreBranding({ primaryColor: value.trim() });
            setResult({ ok: true, detail: `Color principal → ${value.trim()}` });
            onLog(action.label, value.trim(), "ok");
            break;
          }
          case "change-secondary-color": {
            if (!/^#[0-9a-fA-F]{6}$/.test(value.trim())) {
              setResult({ ok: false, detail: "Formato inválido. Usá HEX (#RRGGBB)." });
              onLog(action.label, "formato inválido", "err");
              return;
            }
            await saveStoreBranding({ secondaryColor: value.trim() });
            setResult({ ok: true, detail: `Color secundario → ${value.trim()}` });
            onLog(action.label, value.trim(), "ok");
            break;
          }
          case "change-font": {
            await saveStoreBranding({ fontFamily: value.trim() });
            setResult({ ok: true, detail: `Tipografía → ${value.trim()}` });
            onLog(action.label, value.trim(), "ok");
            break;
          }
          case "change-tone": {
            await saveStoreBranding({ tone: value.trim() });
            setResult({ ok: true, detail: `Tono de copy → ${value.trim()}` });
            onLog(action.label, value.trim(), "ok");
            break;
          }
          case "change-hero-headline":
          case "change-hero-subheadline":
          case "change-hero-cta": {
            const blocks = await fetchHomeBlocks();
            if (!blocks || blocks.length === 0) {
              setResult({ ok: false, detail: "No hay bloques. Aplicá un tema primero." });
              onLog(action.label, "sin bloques", "err");
              return;
            }
            const fieldMap: Record<string, string> = {
              "change-hero-headline": "headline",
              "change-hero-subheadline": "subheadline",
              "change-hero-cta": "primaryActionLabel",
            };
            const field = fieldMap[action.id];
            const updated = blocks.map((b: any) => {
              if (b.blockType !== "hero") return b;
              const settings = typeof b.settingsJson === "string"
                ? JSON.parse(b.settingsJson)
                : b.settingsJson ?? {};
              settings[field] = value.trim();
              return { ...b, settingsJson: JSON.stringify(settings) };
            });
            await saveHomeBlocks(updated);
            setResult({ ok: true, detail: `Hero ${field} → "${value.trim()}"` });
            onLog(action.label, `"${value.trim()}"`, "ok");
            break;
          }
          case "toggle-section": {
            const blocks = await fetchHomeBlocks();
            if (!blocks || blocks.length === 0) {
              setResult({ ok: false, detail: "No hay bloques." });
              onLog(action.label, "sin bloques", "err");
              return;
            }
            const target = blocks.find((b: any) => b.blockType === value.trim());
            if (!target) {
              setResult({ ok: false, detail: `Sección "${value.trim()}" no encontrada.` });
              onLog(action.label, "sección no encontrada", "err");
              return;
            }
            const updated = blocks.map((b: any) =>
              b.blockType === value.trim()
                ? { ...b, isVisible: !b.isVisible }
                : b,
            );
            await saveHomeBlocks(updated);
            const nowVisible = !target.isVisible;
            setResult({ ok: true, detail: `${SECTION_LABELS[value.trim()] ?? value.trim()} → ${nowVisible ? "visible" : "oculto"}` });
            onLog(action.label, `${value.trim()} → ${nowVisible ? "visible" : "oculto"}`, "ok");
            break;
          }
          case "apply-theme": {
            const { applyBuiltInTemplateAction } = await import("@/lib/themes/actions");
            const result = await applyBuiltInTemplateAction(value.trim());
            if (result.ok) {
              const name = BUILT_IN_THEMES.find((t) => t.id === value.trim())?.label ?? value.trim();
              setResult({ ok: true, detail: `Tema "${name}" aplicado (${result.blocksCreated} bloques).` });
              onLog(action.label, name, "ok");
            } else {
              setResult({ ok: false, detail: result.errors?.[0] ?? "No se pudo aplicar." });
              onLog(action.label, result.errors?.[0] ?? "error", "err");
            }
            break;
          }
          default:
            setResult({ ok: false, detail: "Acción no implementada." });
        }
      } catch (e) {
        const msg = (e as Error).message ?? "Error desconocido";
        setResult({ ok: false, detail: msg });
        onLog(action.label, msg, "err");
      }
    });
  };

  const Icon = action.icon;
  const isColor = action.id.includes("color");
  const isFont = action.id === "change-font";
  const isTone = action.id === "change-tone";
  const isToggleSection = action.id === "toggle-section";
  const isApplyTheme = action.id === "apply-theme";
  const isSelectInput = isFont || isTone || isToggleSection || isApplyTheme;

  return (
    <div className="space-y-3">
      {/* Back + title */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onComplete}
          className="rounded-[var(--r-xs)] p-1 text-ink-5 transition-colors hover:bg-[var(--surface-2)] hover:text-ink-0"
        >
          <ChevronDown className="h-3.5 w-3.5 rotate-90" strokeWidth={1.75} />
        </button>
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-ink-3" strokeWidth={1.75} />
          <p className="text-[12px] font-semibold text-ink-0">{action.label}</p>
        </div>
      </div>

      <p className="text-[11px] leading-[1.5] text-ink-5">{action.description}</p>

      {/* Input */}
      {isSelectInput ? (
        <select
          ref={inputRef as any}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 py-2 text-[12px] text-ink-0 outline-none focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)]"
        >
          <option value="">
            {isFont ? "Seleccioná una fuente…" : isTone ? "Seleccioná un tono…" : isToggleSection ? "Seleccioná una sección…" : "Seleccioná un tema…"}
          </option>
          {isFont && FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
          {isTone && TONE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          {isToggleSection && Object.entries(SECTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          {isApplyTheme && BUILT_IN_THEMES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      ) : (
        <div className="flex items-center gap-2">
          {isColor && (
            <input
              type="color"
              value={value || "#111111"}
              onChange={(e) => setValue(e.target.value)}
              className="h-8 w-8 shrink-0 cursor-pointer rounded-[var(--r-xs)] border border-[color:var(--hairline)]"
            />
          )}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            placeholder={isColor ? "#1A1A2E" : "Escribí el nuevo valor…"}
            className="w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 py-2 text-[12px] text-ink-0 outline-none placeholder:text-ink-6 focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)] font-mono"
          />
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || !value.trim()}
        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[var(--r-sm)] bg-ink-0 text-[12px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
        ) : (
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
        )}
        Aplicar cambio
      </button>

      {/* Result */}
      {result && (
        <div
          className={cn(
            "rounded-[var(--r-sm)] border px-3 py-2 text-[11px] leading-[1.5]",
            result.ok
              ? "border-[color:var(--signal-success)]/30 bg-[color:var(--signal-success)]/5 text-ink-0"
              : "border-[color:var(--signal-danger)]/30 bg-[color:var(--signal-danger)]/5 text-ink-0",
          )}
        >
          <div className="flex items-start gap-1.5">
            {result.ok ? (
              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[color:var(--signal-success)]" strokeWidth={2} />
            ) : (
              <X className="mt-0.5 h-3 w-3 shrink-0 text-[color:var(--signal-danger)]" strokeWidth={2} />
            )}
            <span>{result.detail}</span>
          </div>
          {result.ok && (
            <p className="mt-1 text-[10px] text-ink-5">
              Cambio aplicado al sistema real. Recargá para ver el resultado.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
