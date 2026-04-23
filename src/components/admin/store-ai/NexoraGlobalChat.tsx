"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  CheckCircle2,
  Loader2,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { processInput, type PlannedAction } from "@/lib/copilot/engine";
import {
  createEmptyContext,
  updateContext,
  type ConversationContext,
} from "@/lib/copilot/context";
import {
  errResponse,
  partialResponse,
  formatResponse,
  HELP_RESPONSE,
  GREETING_RESPONSE,
  NOISE_RESPONSE,
  type CopilotResponse,
} from "@/lib/copilot/feedback";

// ─── Nexora Global Chat ──────────────────────────────────────────────────
//
// Premium floating AI assistant for the entire admin.
// Lives in AdminShell, visible on ALL admin pages EXCEPT the store editor
// (which has its own dedicated NexoraEditorChat).
//
// Uses the same copilot engine (processInput) as the editor chat.

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  structured?: CopilotResponse;
  timestamp: number;
  status?: "ok" | "err" | "partial";
}

// ─── Component ──────────────────────────────────────────────────────────

export function NexoraGlobalChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      role: "assistant",
      content: GREETING_RESPONSE.summary,
      structured: GREETING_RESPONSE,
      timestamp: Date.now(),
      status: "ok",
    },
  ]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [ctx, setCtx] = useState<ConversationContext>(createEmptyContext());

  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [isOpen]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    startTransition(async () => {
      try {
        const currentCtx = ctxRef.current;
        const result = processInput(text, currentCtx);
        const responses: ChatMessage[] = [];

        // Handle special intents
        if (result.actions.length === 1) {
          const action = result.actions[0];
          if (action.intent === "greeting") {
            responses.push(makeMsg(GREETING_RESPONSE.summary, GREETING_RESPONSE, "ok"));
            setMessages((prev) => [...prev, ...responses]);
            return;
          }
          if (action.intent === "help") {
            responses.push(makeMsg(HELP_RESPONSE.summary, HELP_RESPONSE, "ok"));
            setMessages((prev) => [...prev, ...responses]);
            return;
          }
        }

        const readyActions = result.actions.filter((a) => a.status === "ready");
        const unsupported = result.actions.filter((a) => a.status === "unsupported");

        if (readyActions.length === 0 && unsupported.length > 0) {
          const mainAction = result.actions[0];
          const isNoise = mainAction?.intent === "unknown" && (mainAction?.confidence ?? 0) >= 0.5;

          if (isNoise) {
            responses.push(makeMsg(NOISE_RESPONSE.summary, NOISE_RESPONSE, "ok"));
          } else {
            const resp = errResponse(
              "No entendí ese pedido.",
              unsupported.map((a) => a.rawText),
              [
                "Probá algo como: \"poné tonos más premium\", \"ocultá testimonios\", \"cambiá la fuente\".",
                "Escribí \"ayuda\" para ver todo lo que puedo hacer.",
              ],
            );
            responses.push(makeMsg(formatResponse(resp), resp, "err"));
          }
          setMessages((prev) => [...prev, ...responses]);
          return;
        }

        // Execute ready actions
        const changed: string[] = [];
        const notChanged: string[] = [];
        let newCtx = currentCtx;

        for (const action of readyActions) {
          const execResult = await executeGlobalAction(action);
          if (execResult.ok) {
            changed.push(execResult.detail);
            newCtx = updateContextFromAction(newCtx, action);
          } else {
            notChanged.push(execResult.detail);
          }
        }

        // Build response
        let summary: string;
        let status: "ok" | "err" | "partial";

        if (notChanged.length === 0 && changed.length > 0) {
          summary = changed.length === 1 ? changed[0] : `${changed.length} cambios aplicados correctamente.`;
          status = "ok";
        } else if (changed.length > 0 && notChanged.length > 0) {
          summary = `${changed.length} de ${changed.length + notChanged.length} acciones completadas.`;
          status = "partial";
        } else {
          summary = "No se pudo aplicar ningún cambio.";
          status = "err";
        }

        const resp = partialResponse(summary, changed, notChanged, []);
        responses.push(makeMsg(formatResponse(resp), resp, status));
        setMessages((prev) => [...prev, ...responses]);
        setCtx(newCtx);
      } catch (e) {
        const msg = (e as Error).message ?? "Error desconocido";
        const resp = errResponse(`Error: ${msg}`, [], []);
        setMessages((prev) => [...prev, makeMsg(formatResponse(resp), resp, "err")]);
      }
    });
  }, [input]);

  return (
    <>
      {/* ── FAB ────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={cn(
          "fixed bottom-5 right-5 z-[70] flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-all duration-300 focus-visible:outline-none",
          isOpen
            ? "bg-white border border-gray-200 text-gray-700"
            : "bg-gray-900 text-white hover:bg-gray-800",
        )}
        aria-label={isOpen ? "Cerrar Nexora IA" : "Abrir Nexora IA"}
      >
        {isOpen ? (
          <X className="h-4.5 w-4.5" strokeWidth={1.75} />
        ) : (
          <Sparkles className="h-4.5 w-4.5" strokeWidth={1.75} />
        )}
      </button>

      {/* ── Chat panel ─────────────────────────────────── */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Nexora IA"
          className="fixed bottom-18 right-5 z-[70] flex w-[380px] max-h-[min(560px,calc(100vh-110px))] flex-col rounded-xl border border-gray-200 bg-white shadow-2xl animate-in slide-in-from-bottom-3 fade-in duration-250"
        >
          {/* Header */}
          <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-900 text-white">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-gray-900">Nexora IA</p>
                <p className="text-[9px] uppercase tracking-[0.12em] text-gray-400">Asistente del admin</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700"
              aria-label="Cerrar"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3">
            {messages.map((msg) => (
              <Bubble key={msg.id} msg={msg} />
            ))}
            {isPending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-400">
                  <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
                  Procesando…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions */}
          {messages.length <= 2 && (
            <div className="border-t border-gray-100 px-4 py-2">
              <p className="mb-1.5 text-[9px] font-medium uppercase tracking-[0.12em] text-gray-400">Probá algo</p>
              <div className="flex flex-wrap gap-1.5">
                {["Algo más premium", "Cambiá la tipografía", "Mostrá la ayuda"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Preguntame lo que quieras…"
                className="flex-1 h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-[12px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-200"
                disabled={isPending}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={isPending || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white transition-colors hover:bg-gray-800 disabled:opacity-40"
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

// ─── Message Bubble ──────────────────────────────────────────────────────

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[90%] rounded-lg px-3 py-2 text-[12px] leading-[1.6]",
          isUser && "bg-gray-900 text-white",
          !isUser && msg.status === "ok" && "bg-gray-50 text-gray-900 border border-gray-100",
          !isUser && msg.status === "err" && "bg-red-50 text-gray-900 border border-red-100",
          !isUser && msg.status === "partial" && "bg-amber-50 text-gray-900 border border-amber-100",
          !isUser && !msg.status && "bg-gray-50 text-gray-900 border border-gray-100",
        )}
      >
        {!isUser && msg.status === "ok" && (
          <div className="mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" strokeWidth={2} />
            <span className="text-[10px] font-medium text-emerald-600">Listo</span>
          </div>
        )}
        <div className="whitespace-pre-wrap">{msg.content}</div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeMsg(content: string, structured: CopilotResponse, status: ChatMessage["status"]): ChatMessage {
  return {
    id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    role: "assistant",
    content,
    structured,
    timestamp: Date.now(),
    status,
  };
}

function updateContextFromAction(ctx: ConversationContext, action: PlannedAction): ConversationContext {
  const e = action.entities;
  switch (action.intent) {
    case "change-primary-color":
    case "change-secondary-color":
    case "change-color":
      return updateContext(ctx, { lastAction: action.intent, lastColorChanged: e.colorHex ?? e.colorName ?? "" });
    case "change-font":
    case "change-font-by-style":
      return updateContext(ctx, { lastAction: action.intent, lastFontChanged: e.fontValue ?? "" });
    default:
      return updateContext(ctx, { lastAction: action.intent });
  }
}

// Execute actions in global context (same as editor but no undo/preview)
async function executeGlobalAction(action: PlannedAction): Promise<{ ok: boolean; detail: string }> {
  const e = action.entities;
  switch (action.intent) {
    case "change-primary-color":
    case "change-color": {
      if (!e.colorHex) return { ok: false, detail: "Color no reconocido." };
      const { saveStoreBranding } = await import("@/lib/store-engine/actions");
      if (e.isCompoundPalette === "true" && e.secondaryColorHex) {
        await saveStoreBranding({ primaryColor: e.colorHex, secondaryColor: e.secondaryColorHex });
        return { ok: true, detail: `Paleta aplicada: ${e.colorName ?? e.colorHex} + ${e.secondaryColorName ?? e.secondaryColorHex}` };
      }
      await saveStoreBranding({ primaryColor: e.colorHex });
      return { ok: true, detail: `Color principal → ${e.colorName ?? e.colorHex}` };
    }
    case "change-secondary-color": {
      if (!e.colorHex) return { ok: false, detail: "Color no reconocido." };
      const { saveStoreBranding } = await import("@/lib/store-engine/actions");
      await saveStoreBranding({ secondaryColor: e.colorHex });
      return { ok: true, detail: `Color secundario → ${e.colorName ?? e.colorHex}` };
    }
    case "change-font":
    case "change-font-by-style": {
      if (!e.fontValue) return { ok: false, detail: "Tipografía no reconocida." };
      const { saveStoreBranding } = await import("@/lib/store-engine/actions");
      await saveStoreBranding({ fontFamily: e.fontValue });
      return { ok: true, detail: `Tipografía → ${e.fontLabel ?? e.fontValue}` };
    }
    case "change-tone":
    case "change-tone-by-mood": {
      if (!e.toneValue) return { ok: false, detail: "Tono no reconocido." };
      const { saveStoreBranding } = await import("@/lib/store-engine/actions");
      await saveStoreBranding({ tone: e.toneValue });
      return { ok: true, detail: `Tono → ${e.toneLabel ?? e.toneValue}` };
    }
    case "apply-visual-tone": {
      if (!e.primaryColor) return { ok: false, detail: "No se pudo resolver el estilo." };
      const { saveStoreBranding } = await import("@/lib/store-engine/actions");
      await saveStoreBranding({ primaryColor: e.primaryColor, secondaryColor: e.secondaryColor, fontFamily: e.fontFamily, tone: e.tone });
      return { ok: true, detail: `Estilo "${e.toneLabel}" aplicado` };
    }
    case "change-button-style": {
      if (!e.buttonStyle) return { ok: false, detail: "Estilo no reconocido." };
      const { saveStoreBranding } = await import("@/lib/store-engine/actions");
      await saveStoreBranding({ buttonStyle: e.buttonStyle });
      return { ok: true, detail: `Botón → estilo ${e.buttonStyleLabel ?? e.buttonStyle}` };
    }
    case "change-hero-headline": {
      if (!e.textValue) return { ok: false, detail: "No se pudo extraer el texto." };
      const { fetchHomeBlocks, saveHomeBlocks } = await import("@/lib/store-engine/actions");
      const blocks = await fetchHomeBlocks();
      if (!blocks?.length) return { ok: false, detail: "No hay bloques. Aplicá un tema primero." };
      await saveHomeBlocks(blocks.map((b: any) => b.blockType !== "hero" ? b : { ...b, settingsJson: JSON.stringify({ ...(typeof b.settingsJson === "string" ? JSON.parse(b.settingsJson) : b.settingsJson ?? {}), headline: e.textValue }) })); // eslint-disable-line @typescript-eslint/no-explicit-any
      return { ok: true, detail: `Headline → "${e.textValue}"` };
    }
    case "change-hero-subheadline": {
      if (!e.textValue) return { ok: false, detail: "No se pudo extraer el texto." };
      const { fetchHomeBlocks, saveHomeBlocks } = await import("@/lib/store-engine/actions");
      const blocks = await fetchHomeBlocks();
      if (!blocks?.length) return { ok: false, detail: "No hay bloques." };
      await saveHomeBlocks(blocks.map((b: any) => b.blockType !== "hero" ? b : { ...b, settingsJson: JSON.stringify({ ...(typeof b.settingsJson === "string" ? JSON.parse(b.settingsJson) : b.settingsJson ?? {}), subheadline: e.textValue }) })); // eslint-disable-line @typescript-eslint/no-explicit-any
      return { ok: true, detail: `Subheadline → "${e.textValue}"` };
    }
    case "change-hero-cta": {
      if (!e.textValue) return { ok: false, detail: "No se pudo extraer el texto." };
      const { fetchHomeBlocks, saveHomeBlocks } = await import("@/lib/store-engine/actions");
      const blocks = await fetchHomeBlocks();
      if (!blocks?.length) return { ok: false, detail: "No hay bloques." };
      await saveHomeBlocks(blocks.map((b: any) => b.blockType !== "hero" ? b : { ...b, settingsJson: JSON.stringify({ ...(typeof b.settingsJson === "string" ? JSON.parse(b.settingsJson) : b.settingsJson ?? {}), primaryActionLabel: e.textValue }) })); // eslint-disable-line @typescript-eslint/no-explicit-any
      return { ok: true, detail: `CTA → "${e.textValue}"` };
    }
    case "hide-section": {
      if (!e.sectionKey) return { ok: false, detail: "Sección no reconocida." };
      const { fetchHomeBlocks, saveHomeBlocks } = await import("@/lib/store-engine/actions");
      const blocks = await fetchHomeBlocks();
      if (!blocks?.length) return { ok: false, detail: "No hay bloques." };
      const target = blocks.find((b: any) => b.blockType === e.sectionKey); // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!target) return { ok: false, detail: `Sección "${e.sectionKey}" no encontrada.` };
      if (!target.isVisible) return { ok: false, detail: `${e.sectionKey} ya estaba oculta.` };
      await saveHomeBlocks(blocks.map((b: any) => b.blockType === e.sectionKey ? { ...b, isVisible: false } : b)); // eslint-disable-line @typescript-eslint/no-explicit-any
      return { ok: true, detail: `${e.sectionLabel ?? e.sectionKey} → oculta` };
    }
    case "show-section": {
      if (!e.sectionKey) return { ok: false, detail: "Sección no reconocida." };
      const { fetchHomeBlocks, saveHomeBlocks } = await import("@/lib/store-engine/actions");
      const blocks = await fetchHomeBlocks();
      if (!blocks?.length) return { ok: false, detail: "No hay bloques." };
      const target = blocks.find((b: any) => b.blockType === e.sectionKey); // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!target) return { ok: false, detail: `Sección "${e.sectionKey}" no encontrada.` };
      if (target.isVisible) return { ok: false, detail: `${e.sectionKey} ya era visible.` };
      await saveHomeBlocks(blocks.map((b: any) => b.blockType === e.sectionKey ? { ...b, isVisible: true } : b)); // eslint-disable-line @typescript-eslint/no-explicit-any
      return { ok: true, detail: `${e.sectionLabel ?? e.sectionKey} → visible` };
    }
    case "apply-theme": {
      if (!e.themeId) return { ok: false, detail: "Tema no reconocido." };
      const { applyBuiltInTemplateAction } = await import("@/lib/themes/actions");
      const result = await applyBuiltInTemplateAction(e.themeId);
      if (result.ok) return { ok: true, detail: `Tema "${e.themeLabel ?? e.themeId}" aplicado` };
      return { ok: false, detail: result.errors?.[0] ?? "No se pudo aplicar el tema." };
    }
    default:
      return { ok: false, detail: `"${action.intent}" no disponible en el chat global. Abrí el editor de tienda para acciones avanzadas.` };
  }
}