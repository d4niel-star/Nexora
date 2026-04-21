"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, Loader2, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Nexora Editor Chat ─────────────────────────────────────────────────
// Free-form conversational AI copilot that lives ONLY inside the editor.
// The user types natural language; we parse intent and map to real server
// actions (saveStoreBranding, saveHomeBlocks, applyBuiltInTemplateAction).
//
// This is NOT prefab buttons. The input is free text.

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  status?: "ok" | "err";
}

// Intent patterns — maps natural language to server action calls
const INTENT_PATTERNS: {
  pattern: RegExp;
  action: string;
  extract: (m: RegExpMatchArray) => Record<string, string>;
  response: (params: Record<string, string>) => string;
}[] = [
  {
    pattern: /(?:cambi[aá]|pon[eé]|us[aá])\s+(?:el\s+)?color\s+(?:principal|primario)\s+(?:a\s+|por\s+)?([#\w]+)/i,
    action: "change-primary-color",
    extract: (m) => ({ color: m[1] }),
    response: (p) => `Color principal cambiado a ${p.color}.`,
  },
  {
    pattern: /(?:cambi[aá]|pon[eé]|us[aá])\s+(?:el\s+)?color\s+(?:secundario|de fondo)\s+(?:a\s+|por\s+)?([#\w]+)/i,
    action: "change-secondary-color",
    extract: (m) => ({ color: m[1] }),
    response: (p) => `Color secundario cambiado a ${p.color}.`,
  },
  {
    pattern: /(?:cambi[aá]|pon[eé]|us[aá])\s+(?:la\s+)?(?:tipograf[ií]a|fuente|font)\s+(?:a\s+|por\s+)?([\w\s]+)/i,
    action: "change-font",
    extract: (m) => ({ font: m[1].trim() }),
    response: (p) => `Tipografía cambiada a ${p.font}.`,
  },
  {
    pattern: /(?:cambi[aá]|pon[eé]|edit[aá]|reescrib[ií])\s+(?:el\s+)?(?:titular|headline|título)\s+(?:del\s+)?hero\s+(?:a\s+|por\s+)?["""]?(.+?)["""]?\s*$/i,
    action: "change-hero-headline",
    extract: (m) => ({ text: m[1].replace(/["""]/g, "").trim() }),
    response: (p) => `Headline del hero actualizado: "${p.text}"`,
  },
  {
    pattern: /(?:cambi[aá]|pon[eé]|edit[aá])\s+(?:el\s+)?(?:subtítulo|sub|subheadline)\s+(?:del\s+)?hero\s+(?:a\s+|por\s+)?["""]?(.+?)["""]?\s*$/i,
    action: "change-hero-subheadline",
    extract: (m) => ({ text: m[1].replace(/["""]/g, "").trim() }),
    response: (p) => `Subheadline del hero actualizado: "${p.text}"`,
  },
  {
    pattern: /(?:cambi[aá]|pon[eé]|edit[aá])\s+(?:el\s+)?(?:texto\s+del\s+)?(?:bot[oó]n|cta)\s+(?:principal\s+)?(?:a\s+|por\s+)?["""]?(.+?)["""]?\s*$/i,
    action: "change-hero-cta",
    extract: (m) => ({ text: m[1].replace(/["""]/g, "").trim() }),
    response: (p) => `CTA del hero actualizado: "${p.text}"`,
  },
  {
    pattern: /(?:ocult[aá]|escond[eé]|desactiv[aá])\s+(?:la\s+)?(?:secci[oó]n\s+(?:de\s+)?)?(?:los?\s+)?(hero|productos?\s+destacados?|categor[ií]as?|beneficios?|testimonios?|faq|preguntas?\s+frecuentes?|newsletter)/i,
    action: "hide-section",
    extract: (m) => ({ section: normalizeSectionName(m[1]) }),
    response: (p) => `Sección "${p.section}" ocultada.`,
  },
  {
    pattern: /(?:mostr[aá]|activ[aá]|habilit[aá])\s+(?:la\s+)?(?:secci[oó]n\s+(?:de\s+)?)?(?:los?\s+)?(hero|productos?\s+destacados?|categor[ií]as?|beneficios?|testimonios?|faq|preguntas?\s+frecuentes?|newsletter)/i,
    action: "show-section",
    extract: (m) => ({ section: normalizeSectionName(m[1]) }),
    response: (p) => `Sección "${p.section}" activada.`,
  },
  {
    pattern: /(?:aplic[aá]|us[aá]|cambi[aá]\s+(?:a|al))\s+(?:el\s+)?tema\s+(.+)/i,
    action: "apply-theme",
    extract: (m) => ({ theme: m[1].trim().toLowerCase() }),
    response: (p) => `Tema "${p.theme}" aplicado.`,
  },
  {
    pattern: /(?:cambi[aá]|pon[eé]|us[aá])\s+(?:el\s+)?tono\s+(?:a\s+|por\s+)?(\w+)/i,
    action: "change-tone",
    extract: (m) => ({ tone: m[1].trim() }),
    response: (p) => `Tono de copy cambiado a "${p.tone}".`,
  },
  {
    pattern: /(?:us[aá]|pon[eé])\s+(?:tonos?\s+)?(?:negro\s+y\s+beige|beige\s+y\s+negro)/i,
    action: "black-beige",
    extract: () => ({}),
    response: () => `Paleta negro y beige aplicada.`,
  },
  {
    pattern: /(?:hac[eé]|pon[eé])\s+(?:el\s+)?(?:dise[ñn]o|header|estilo)\s+(?:m[aá]s\s+)?(?:minimalista|premium|elegante|editorial)/i,
    action: "style-minimal",
    extract: (m) => ({ style: m[0] }),
    response: () => `Estilo ajustado: tipografía premium y colores sobrios aplicados.`,
  },
];

function normalizeSectionName(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (s.includes("producto")) return "featured_products";
  if (s.includes("categor")) return "featured_categories";
  if (s.includes("beneficio")) return "benefits";
  if (s.includes("testimonio")) return "testimonials";
  if (s.includes("faq") || s.includes("pregunta")) return "faq";
  if (s.includes("newsletter")) return "newsletter";
  if (s.includes("hero")) return "hero";
  return s;
}

const COLOR_MAP: Record<string, string> = {
  negro: "#111111", black: "#111111",
  blanco: "#FFFFFF", white: "#FFFFFF",
  beige: "#F5F0E8",
  rojo: "#DC2626", red: "#DC2626",
  azul: "#2563EB", blue: "#2563EB",
  verde: "#16A34A", green: "#16A34A",
  dorado: "#B8860B", gold: "#B8860B",
  gris: "#6B7280", gray: "#6B7280",
  rosa: "#EC4899", pink: "#EC4899",
  naranja: "#EA580C", orange: "#EA580C",
  violeta: "#7C3AED", purple: "#7C3AED",
};

function resolveColor(raw: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  return COLOR_MAP[raw.toLowerCase()] ?? raw;
}

const THEME_MAP: Record<string, string> = {
  "minimal": "minimal-essentials",
  "minimal essentials": "minimal-essentials",
  "bold": "bold-commerce",
  "bold commerce": "bold-commerce",
  "classic": "classic-elegance",
  "classic elegance": "classic-elegance",
  "fresh": "fresh-catalog",
  "fresh catalog": "fresh-catalog",
  "urban": "moda-urban",
  "urban fashion": "moda-urban",
  "tech": "tech-showcase",
  "tech showcase": "tech-showcase",
  "beauty": "belleza-ritual",
  "beauty ritual": "belleza-ritual",
  "editorial": "editorial-lifestyle",
  "lifestyle": "editorial-lifestyle",
  "lifestyle editorial": "editorial-lifestyle",
};

export function NexoraEditorChat({ onActionApplied }: { onActionApplied: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", text: "Hola, soy Nexora IA. Pedime lo que quieras cambiar en tu tienda y lo aplico en tiempo real. Probá algo como \"cambiá el color principal a #1A1A2E\" o \"ocultá la sección de testimonios\"." },
  ]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text };
    setMessages((prev) => [...prev, userMsg]);

    startTransition(async () => {
      try {
        const result = await executeIntent(text);
        const assistantMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: result.response,
          status: result.ok ? "ok" : "err",
        };
        setMessages((prev) => [...prev, assistantMsg]);
        if (result.ok) onActionApplied();
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          { id: `e-${Date.now()}`, role: "assistant", text: `Error: ${(e as Error).message}`, status: "err" },
        ]);
      }
    });
  }, [input, onActionApplied]);

  return (
    <>
      {/* FAB */}
      <button
        type="button"
        onClick={() => { setIsOpen((o) => !o); setTimeout(() => inputRef.current?.focus(), 100); }}
        className={cn(
          "fixed bottom-6 right-6 z-[70] flex h-12 w-12 items-center justify-center rounded-full shadow-[var(--shadow-overlay)] transition-all duration-300",
          isOpen ? "bg-[var(--surface-0)] border border-[color:var(--hairline)] text-ink-0" : "bg-ink-0 text-ink-12 hover:bg-ink-2",
        )}
        aria-label={isOpen ? "Cerrar IA" : "Abrir IA"}
      >
        {isOpen ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Sparkles className="h-5 w-5" strokeWidth={1.75} />}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-[70] flex w-[360px] max-h-[min(520px,calc(100vh-120px))] flex-col rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-overlay)] animate-in slide-in-from-bottom-4 fade-in duration-300">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-[color:var(--hairline)] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-[var(--r-xs)] bg-ink-0 text-ink-12">
                <Sparkles className="h-3 w-3" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-ink-0">Nexora IA</p>
                <p className="text-[8px] uppercase tracking-[0.1em] text-ink-5">Copiloto de diseño</p>
              </div>
            </div>
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-2.5">
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[85%] rounded-[var(--r-sm)] px-3 py-2 text-[11px] leading-[1.5]",
                  msg.role === "user"
                    ? "bg-ink-0 text-ink-12"
                    : msg.status === "err"
                      ? "bg-[color:var(--signal-danger)]/10 text-ink-0 border border-[color:var(--signal-danger)]/20"
                      : "bg-[var(--surface-1)] text-ink-0",
                )}>
                  {msg.role === "assistant" && msg.status === "ok" && (
                    <CheckCircle2 className="inline h-3 w-3 mr-1 text-[color:var(--signal-success)]" strokeWidth={2} />
                  )}
                  {msg.text}
                </div>
              </div>
            ))}
            {isPending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-[var(--r-sm)] bg-[var(--surface-1)] px-3 py-2 text-[11px] text-ink-5">
                  <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
                  Aplicando cambios…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[color:var(--hairline)] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Escribí lo que querés cambiar…"
                className="flex-1 h-9 px-3 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-[12px] text-ink-0 outline-none placeholder:text-ink-6 focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)]"
                disabled={isPending}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={isPending || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-ink-0 text-ink-12 transition-colors hover:bg-ink-2 disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Intent execution ────────────────────────────────────────────────────

async function executeIntent(text: string): Promise<{ ok: boolean; response: string }> {
  const { saveStoreBranding, fetchHomeBlocks, saveHomeBlocks } = await import("@/lib/store-engine/actions");

  // Match against patterns
  for (const intent of INTENT_PATTERNS) {
    const match = text.match(intent.pattern);
    if (!match) continue;
    const params = intent.extract(match);

    switch (intent.action) {
      case "change-primary-color": {
        const color = resolveColor(params.color);
        if (!/^#[0-9a-fA-F]{6}$/.test(color)) return { ok: false, response: `No reconozco el color "${params.color}". Usá formato HEX (#RRGGBB) o nombres como "negro", "beige", "dorado".` };
        await saveStoreBranding({ primaryColor: color });
        return { ok: true, response: intent.response({ color }) };
      }
      case "change-secondary-color": {
        const color = resolveColor(params.color);
        if (!/^#[0-9a-fA-F]{6}$/.test(color)) return { ok: false, response: `No reconozco el color "${params.color}".` };
        await saveStoreBranding({ secondaryColor: color });
        return { ok: true, response: intent.response({ color }) };
      }
      case "change-font":
        await saveStoreBranding({ fontFamily: params.font });
        return { ok: true, response: intent.response(params) };
      case "change-tone":
        await saveStoreBranding({ tone: params.tone });
        return { ok: true, response: intent.response(params) };
      case "change-hero-headline":
      case "change-hero-subheadline":
      case "change-hero-cta": {
        const fieldMap: Record<string, string> = {
          "change-hero-headline": "headline",
          "change-hero-subheadline": "subheadline",
          "change-hero-cta": "primaryActionLabel",
        };
        const field = fieldMap[intent.action];
        const blocks = await fetchHomeBlocks();
        if (!blocks?.length) return { ok: false, response: "No hay bloques. Aplicá un tema primero." };
        const updated = blocks.map((b: any) => {
          if (b.blockType !== "hero") return b;
          const s = typeof b.settingsJson === "string" ? JSON.parse(b.settingsJson) : b.settingsJson ?? {};
          s[field] = params.text;
          return { ...b, settingsJson: JSON.stringify(s) };
        });
        await saveHomeBlocks(updated);
        return { ok: true, response: intent.response(params) };
      }
      case "hide-section":
      case "show-section": {
        const blocks = await fetchHomeBlocks();
        if (!blocks?.length) return { ok: false, response: "No hay bloques." };
        const target = blocks.find((b: any) => b.blockType === params.section);
        if (!target) return { ok: false, response: `No encontré la sección "${params.section}".` };
        const visible = intent.action === "show-section";
        const updated = blocks.map((b: any) => b.blockType === params.section ? { ...b, isVisible: visible } : b);
        await saveHomeBlocks(updated);
        return { ok: true, response: intent.response(params) };
      }
      case "apply-theme": {
        const themeId = THEME_MAP[params.theme] ?? params.theme;
        const { applyBuiltInTemplateAction } = await import("@/lib/themes/actions");
        const result = await applyBuiltInTemplateAction(themeId);
        if (result.ok) return { ok: true, response: `Tema aplicado (${result.blocksCreated} bloques creados).` };
        return { ok: false, response: result.errors?.[0] ?? "No se pudo aplicar el tema." };
      }
      case "black-beige":
        await saveStoreBranding({ primaryColor: "#111111", secondaryColor: "#F5F0E8" });
        return { ok: true, response: intent.response({}) };
      case "style-minimal":
        await saveStoreBranding({ primaryColor: "#111111", secondaryColor: "#FAFAFA", fontFamily: "Inter" });
        return { ok: true, response: intent.response({}) };
    }
  }

  return {
    ok: false,
    response: "No entendí ese pedido. Probá con cosas como:\n• \"cambiá el color principal a negro\"\n• \"poné tipografía Playfair Display\"\n• \"ocultá la sección de beneficios\"\n• \"cambiá el headline del hero a Tu estilo, tu regla\"\n• \"aplicá el tema editorial\"",
  };
}
