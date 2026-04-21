"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  Send,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { processInput, type ActionType, type PlannedAction } from "@/lib/copilot/engine";
import {
  createEmptyContext,
  updateContext,
  pushUndoSnapshot,
  popUndoSnapshot,
  type ConversationContext,
  type UndoSnapshot,
} from "@/lib/copilot/context";
import {
  okResponse,
  errResponse,
  partialResponse,
  clarifyResponse,
  formatResponse,
  HELP_RESPONSE,
  GREETING_RESPONSE,
  type CopilotResponse,
} from "@/lib/copilot/feedback";

// ─── Nexora Editor Chat v2 ────────────────────────────────────────────────
//
// Premium conversational copilot for the Tienda IA editor.
//
// Architecture:
//   Input → NLU Engine → PlannedAction[] → Executor → Feedback
//
// The copilot:
//   - Understands natural Spanish (rioplatense tolerant)
//   - Handles compound instructions
//   - Tracks conversational context
//   - Supports undo via snapshots
//   - Gives structured feedback on every action
//   - Controls preview device/surface
//   - Never gives false success

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  structured?: CopilotResponse;
  timestamp: number;
  status?: "ok" | "err" | "partial" | "clarify";
}

interface NexoraEditorChatProps {
  onActionApplied: () => void;
  onDeviceChange?: (device: "desktop" | "mobile") => void;
  onPreviewSurfaceChange?: (surface: "home" | "listing" | "product" | "cart") => void;
  currentBranding?: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    tone: string;
    buttonStyle: string;
  } | null;
}

export function NexoraEditorChat({
  onActionApplied,
  onDeviceChange,
  onPreviewSurfaceChange,
  currentBranding,
}: NexoraEditorChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
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
        const result = processInput(text, ctx);
        const responses: ChatMessage[] = [];

        // Handle special intents first
        if (result.actions.length === 1) {
          const action = result.actions[0];
          if (action.intent === "greeting") {
            responses.push(makeAssistantMessage(GREETING_RESPONSE.summary, GREETING_RESPONSE, "ok"));
            setMessages((prev) => [...prev, ...responses]);
            return;
          }
          if (action.intent === "help") {
            responses.push(makeAssistantMessage(HELP_RESPONSE.summary, HELP_RESPONSE, "ok"));
            setMessages((prev) => [...prev, ...responses]);
            return;
          }
          if (action.status === "needs-clarification" && action.clarification) {
            const resp = clarifyResponse(action.clarification, []);
            responses.push(makeAssistantMessage(formatResponse(resp), resp, "clarify"));
            setMessages((prev) => [...prev, ...responses]);
            return;
          }
        }

        // Execute all ready actions
        const readyActions = result.actions.filter((a) => a.status === "ready");
        const unsupported = result.actions.filter((a) => a.status === "unsupported");
        const needClarification = result.actions.filter((a) => a.status === "needs-clarification");

        if (readyActions.length === 0 && unsupported.length > 0) {
          const resp = errResponse(
            "No entendí ese pedido.",
            unsupported.map((a) => a.rawText),
            [
              "Probá algo como: \"poné tonos más premium\", \"ocultá testimonios\", \"cambiá la fuente\".",
              "Si querés ver todo lo que puedo hacer, escribí \"ayuda\".",
            ],
          );
          responses.push(makeAssistantMessage(formatResponse(resp), resp, "err"));
          setMessages((prev) => [...prev, ...responses]);
          return;
        }

        // Execute each ready action
        const changed: string[] = [];
        const notChanged: string[] = [];
        let newCtx = ctx;

        for (const action of readyActions) {
          // Take snapshot before action for undo
          if (action.intent !== "undo" && action.intent !== "switch-desktop" && action.intent !== "switch-mobile" && action.intent !== "switch-preview-surface" && action.intent !== "greeting" && action.intent !== "help") {
            const snapshot = await buildSnapshot(action.intent);
            newCtx = pushUndoSnapshot(newCtx, describeAction(action), snapshot?.branding ?? null, snapshot?.blocks ?? null);
          }

          const execResult = await executeAction(action, newCtx);
          if (execResult.ok) {
            changed.push(execResult.detail);
            newCtx = updateContextFromAction(newCtx, action);
            // Fire device/surface callbacks
            if (action.intent === "switch-mobile") {
              onDeviceChange?.("mobile");
              newCtx = updateContext(newCtx, { currentDevice: "mobile" });
            } else if (action.intent === "switch-desktop") {
              onDeviceChange?.("desktop");
              newCtx = updateContext(newCtx, { currentDevice: "desktop" });
            } else if (action.intent === "switch-preview-surface" && action.entities.surface) {
              onPreviewSurfaceChange?.(action.entities.surface as "home" | "listing" | "product" | "cart");
            }
          } else {
            notChanged.push(execResult.detail);
          }
        }

        // Handle clarification requests
        for (const action of needClarification) {
          notChanged.push(`⚠️ ${action.rawText}: ${action.clarification}`);
        }

        // Handle unsupported
        for (const action of unsupported) {
          notChanged.push(`No pude procesar: "${action.rawText}"`);
        }

        // Build response
        let summary: string;
        let status: "ok" | "err" | "partial";

        if (notChanged.length === 0 && changed.length > 0) {
          summary = changed.length === 1
            ? changed[0]
            : `${changed.length} cambios aplicados correctamente.`;
          status = "ok";
        } else if (changed.length > 0 && notChanged.length > 0) {
          summary = `${changed.length} de ${changed.length + notChanged.length} acciones completadas.`;
          status = "partial";
        } else {
          summary = "No se pudo aplicar ningún cambio.";
          status = "err";
        }

        const resp = partialResponse(summary, changed, notChanged, []);
        const nextSteps = buildNextSteps(readyActions);
        resp.nextSteps = nextSteps;

        responses.push(makeAssistantMessage(formatResponse(resp), resp, status));
        setMessages((prev) => [...prev, ...responses]);
        setCtx(newCtx);

        if (changed.length > 0) onActionApplied();
      } catch (e) {
        const msg = (e as Error).message ?? "Error desconocido";
        const resp = errResponse(`Error: ${msg}`, [], []);
        setMessages((prev) => [
          ...prev,
          makeAssistantMessage(formatResponse(resp), resp, "err"),
        ]);
      }
    });
  }, [input, ctx, onActionApplied]);

  return (
    <>
      {/* FAB */}
      <button
        type="button"
        onClick={() => { setIsOpen((o) => !o); }}
        className={cn(
          "fixed bottom-6 right-6 z-[70] flex h-12 w-12 items-center justify-center rounded-full shadow-[var(--shadow-overlay)] transition-all duration-300 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
          isOpen
            ? "bg-[var(--surface-0)] border border-[color:var(--hairline)] text-ink-0"
            : "bg-ink-0 text-ink-12 hover:bg-ink-2",
        )}
        aria-label={isOpen ? "Cerrar copiloto" : "Abrir copiloto"}
      >
        {isOpen ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Sparkles className="h-5 w-5" strokeWidth={1.75} />}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-[70] flex w-[400px] max-h-[min(600px,calc(100vh-120px))] flex-col rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-overlay)] animate-in slide-in-from-bottom-4 fade-in duration-300">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-[color:var(--hairline)] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-[var(--r-sm)] bg-ink-0 text-ink-12">
                <Sparkles className="h-4 w-4" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-ink-0">Nexora IA</p>
                <p className="text-[9px] uppercase tracking-[0.12em] text-ink-5">Copiloto de diseño</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {ctx.undoStack.length > 0 && (
                <span className="flex items-center gap-1 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-1.5 py-0.5 text-[9px] text-ink-5">
                  <Undo2 className="h-2.5 w-2.5" strokeWidth={1.75} />
                  {ctx.undoStack.length}
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-[var(--r-xs)] p-1 text-ink-5 transition-colors hover:bg-[var(--surface-2)] hover:text-ink-0"
                aria-label="Cerrar"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </header>

          {/* Messages */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {isPending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-[var(--r-md)] bg-[var(--surface-1)] px-3.5 py-2.5 text-[11px] text-ink-5">
                  <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
                  Procesando…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions */}
          {messages.length <= 2 && (
            <div className="border-t border-[color:var(--hairline)] px-4 py-2.5">
              <p className="mb-2 text-[9px] font-medium uppercase tracking-[0.12em] text-ink-6">Probá algo</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Algo más premium",
                  "Ocultá testimonios",
                  "Poné tonos beige",
                  "Fuente más editorial",
                  "Mostrame en celu",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                    className="rounded-[var(--r-full)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2.5 py-1 text-[10px] font-medium text-ink-5 transition-colors hover:bg-[var(--surface-2)] hover:text-ink-0"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-[color:var(--hairline)] px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Decime qué querés cambiar…"
                className="flex-1 h-10 px-3.5 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-[12px] text-ink-0 outline-none placeholder:text-ink-6 focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)]"
                disabled={isPending}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={isPending || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-ink-0 text-ink-12 transition-colors hover:bg-ink-2 disabled:opacity-40"
              >
                <Send className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[90%] rounded-[var(--r-md)] px-3.5 py-2.5 text-[12px] leading-[1.6]",
          isUser && "bg-ink-0 text-ink-12",
          !isUser && msg.status === "ok" && "bg-[var(--surface-1)] text-ink-0 border border-[color:var(--hairline)]",
          !isUser && msg.status === "err" && "bg-[color:var(--signal-danger)]/8 text-ink-0 border border-[color:var(--signal-danger)]/20",
          !isUser && msg.status === "partial" && "bg-[color:var(--signal-warning)]/8 text-ink-0 border border-[color:var(--signal-warning)]/20",
          !isUser && msg.status === "clarify" && "bg-[var(--surface-1)] text-ink-0 border border-[color:var(--accent-500)]/30",
          !isUser && !msg.status && "bg-[var(--surface-1)] text-ink-0 border border-[color:var(--hairline)]",
        )}
      >
        {/* Status indicator */}
        {!isUser && msg.status === "ok" && (
          <div className="mb-1.5 flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-[color:var(--signal-success)]" strokeWidth={2} />
            <span className="text-[10px] font-medium text-[color:var(--signal-success)]">Aplicado</span>
          </div>
        )}
        {!isUser && msg.status === "err" && (
          <div className="mb-1.5 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-[color:var(--signal-danger)]" strokeWidth={2} />
            <span className="text-[10px] font-medium text-[color:var(--signal-danger)]">Error</span>
          </div>
        )}
        {!isUser && msg.status === "partial" && (
          <div className="mb-1.5 flex items-center gap-1.5">
            <Info className="h-3 w-3 text-[color:var(--signal-warning)]" strokeWidth={2} />
            <span className="text-[10px] font-medium text-[color:var(--signal-warning)]">Parcial</span>
          </div>
        )}
        {!isUser && msg.status === "clarify" && (
          <div className="mb-1.5 flex items-center gap-1.5">
            <Info className="h-3 w-3 text-[var(--accent-500)]" strokeWidth={2} />
            <span className="text-[10px] font-medium text-[var(--accent-500)]">Necesito más info</span>
          </div>
        )}

        <div className="whitespace-pre-wrap">{msg.content}</div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeAssistantMessage(content: string, structured: CopilotResponse, status: ChatMessage["status"]): ChatMessage {
  return {
    id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    role: "assistant",
    content,
    structured,
    timestamp: Date.now(),
    status,
  };
}

function describeAction(action: PlannedAction): string {
  const labels: Record<ActionType, string> = {
    "change-primary-color": "Cambio de color principal",
    "change-secondary-color": "Cambio de color secundario",
    "change-color": "Cambio de color",
    "change-font": "Cambio de tipografía",
    "change-font-by-style": "Cambio de tipografía por estilo",
    "change-tone": "Cambio de tono",
    "change-tone-by-mood": "Cambio de tono por mood",
    "apply-visual-tone": "Aplicación de tono visual",
    "change-button-style": "Cambio de estilo de botón",
    "change-hero-headline": "Cambio de headline",
    "change-hero-subheadline": "Cambio de subheadline",
    "change-hero-cta": "Cambio de CTA",
    "change-hero-image": "Cambio de imagen",
    "hide-section": "Ocultar sección",
    "show-section": "Mostrar sección",
    "move-section": "Mover sección",
    "apply-theme": "Aplicar tema",
    "switch-desktop": "Switch desktop",
    "switch-mobile": "Switch mobile",
    "switch-preview-surface": "Cambio de preview",
    "undo": "Deshacer",
    "greeting": "Saludo",
    "help": "Ayuda",
    "unknown": "Desconocido",
  };
  return labels[action.intent] ?? action.intent;
}

async function buildSnapshot(intent: ActionType): Promise<{ branding: UndoSnapshot["branding"]; blocks: UndoSnapshot["blocks"] } | null> {
  try {
    const { fetchHomeBlocks, fetchStoreBranding } = await import("@/lib/store-engine/actions");
    const [blocks, branding] = await Promise.all([fetchHomeBlocks(), fetchStoreBranding()]);
    return {
      branding: branding ? {
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        fontFamily: branding.fontFamily,
        tone: branding.tone,
        buttonStyle: branding.buttonStyle,
        logoUrl: branding.logoUrl,
      } : null,
      blocks: blocks ? blocks.map((b: any) => ({
        blockType: b.blockType,
        sortOrder: b.sortOrder,
        isVisible: b.isVisible,
        settingsJson: typeof b.settingsJson === "string" ? b.settingsJson : JSON.stringify(b.settingsJson ?? {}),
        source: b.source ?? "template",
        state: b.state ?? "draft",
      })) : null,
    };
  } catch {
    return null;
  }
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
    case "hide-section":
    case "show-section":
    case "move-section":
      return updateContext(ctx, { lastAction: action.intent, lastBlockType: e.sectionKey ?? "" });
    case "apply-visual-tone":
      return updateContext(ctx, { lastAction: action.intent, lastThemeApplied: e.toneLabel ?? "" });
    case "apply-theme":
      return updateContext(ctx, { lastAction: action.intent, lastThemeApplied: e.themeId ?? "" });
    default:
      return updateContext(ctx, { lastAction: action.intent });
  }
}

function buildNextSteps(actions: PlannedAction[]): string[] {
  if (actions.length === 0) return [];
  const steps: string[] = [];
  const intents = actions.map((a) => a.intent);

  if (intents.includes("apply-visual-tone") || intents.includes("change-color")) {
    steps.push("Podés ajustar colores específicos con \"cambiar el color principal a azul\".");
  }
  if (intents.includes("change-font") || intents.includes("change-font-by-style")) {
    steps.push("Probá \"ver en celu\" para ver cómo queda la nueva tipografía en mobile.");
  }
  if (intents.includes("hide-section") || intents.includes("move-section")) {
    steps.push("Escribí \"deshacé eso\" si querés revertir el cambio.");
  }

  return steps.slice(0, 2);
}

// ─── Action executor ──────────────────────────────────────────────────────

async function executeAction(
  action: PlannedAction,
  ctx: ConversationContext,
): Promise<{ ok: boolean; detail: string }> {
  const e = action.entities;

  switch (action.intent) {
    // ── Colors ───────────────────────────────────────────────────────────
    case "change-primary-color":
    case "change-color": {
      if (!e.colorHex) return { ok: false, detail: "Color no reconocido." };
      const { saveStoreBranding } = await import("@/lib/store-engine/actions");
      await saveStoreBranding({ primaryColor: e.colorHex });
      return { ok: true, detail: `Color principal → ${e.colorName ?? e.colorHex}` };
    }

    case "change-secondary-color": {
      if (!e.colorHex) return { ok: false, detail: "Color no reconocido." };
      const { saveStoreBranding } = await import("@/lib/store-engine/actions");
      await saveStoreBranding({ secondaryColor: e.colorHex });
      return { ok: true, detail: `Color secundario → ${e.colorName ?? e.colorHex}` };
    }

    // ── Typography ───────────────────────────────────────────────────────
    case "change-font":
    case "change-font-by-style": {
      if (!e.fontValue) return { ok: false, detail: "Tipografía no reconocida." };
      const { saveStoreBranding } = await import("@/lib/store-engine/actions");
      await saveStoreBranding({ fontFamily: e.fontValue });
      return { ok: true, detail: `Tipografía → ${e.fontLabel ?? e.fontValue}` };
    }

    // ── Tone ─────────────────────────────────────────────────────────────
    case "change-tone":
    case "change-tone-by-mood": {
      if (!e.toneValue) return { ok: false, detail: "Tono no reconocido." };
      const { saveStoreBranding } = await import("@/lib/store-engine/actions");
      await saveStoreBranding({ tone: e.toneValue });
      return { ok: true, detail: `Tono de copy → ${e.toneLabel ?? e.toneValue}` };
    }

    // ── Visual tone preset ───────────────────────────────────────────────
    case "apply-visual-tone": {
      if (!e.primaryColor) return { ok: false, detail: "No se pudo resolver el estilo visual." };
      const { saveStoreBranding } = await import("@/lib/store-engine/actions");
      await saveStoreBranding({
        primaryColor: e.primaryColor,
        secondaryColor: e.secondaryColor,
        fontFamily: e.fontFamily,
        tone: e.tone,
      });
      return { ok: true, detail: `Estilo "${e.toneLabel}" aplicado: ${e.toneDescription}` };
    }

    // ── Button style ─────────────────────────────────────────────────────
    case "change-button-style": {
      if (!e.buttonStyle) return { ok: false, detail: "Estilo de botón no reconocido." };
      const { saveStoreBranding } = await import("@/lib/store-engine/actions");
      await saveStoreBranding({ buttonStyle: e.buttonStyle });
      return { ok: true, detail: `Botón → ${e.buttonStyleLabel ?? e.buttonStyle}` };
    }

    // ── Hero content ─────────────────────────────────────────────────────
    case "change-hero-headline": {
      if (!e.textValue) return { ok: false, detail: "No se pudo extraer el texto para el titular." };
      const { fetchHomeBlocks, saveHomeBlocks } = await import("@/lib/store-engine/actions");
      const blocks = await fetchHomeBlocks();
      if (!blocks?.length) return { ok: false, detail: "No hay bloques. Aplicá un tema primero." };
      const updated = blocks.map((b: any) => {
        if (b.blockType !== "hero") return b;
        const s = typeof b.settingsJson === "string" ? JSON.parse(b.settingsJson) : b.settingsJson ?? {};
        s.headline = e.textValue;
        return { ...b, settingsJson: JSON.stringify(s) };
      });
      await saveHomeBlocks(updated);
      return { ok: true, detail: `Headline → "${e.textValue}"` };
    }

    case "change-hero-subheadline": {
      if (!e.textValue) return { ok: false, detail: "No se pudo extraer el texto para el subtitular." };
      const { fetchHomeBlocks, saveHomeBlocks } = await import("@/lib/store-engine/actions");
      const blocks = await fetchHomeBlocks();
      if (!blocks?.length) return { ok: false, detail: "No hay bloques. Aplicá un tema primero." };
      const updated = blocks.map((b: any) => {
        if (b.blockType !== "hero") return b;
        const s = typeof b.settingsJson === "string" ? JSON.parse(b.settingsJson) : b.settingsJson ?? {};
        s.subheadline = e.textValue;
        return { ...b, settingsJson: JSON.stringify(s) };
      });
      await saveHomeBlocks(updated);
      return { ok: true, detail: `Subheadline → "${e.textValue}"` };
    }

    case "change-hero-cta": {
      if (!e.textValue) return { ok: false, detail: "No se pudo extraer el texto para el CTA." };
      const { fetchHomeBlocks, saveHomeBlocks } = await import("@/lib/store-engine/actions");
      const blocks = await fetchHomeBlocks();
      if (!blocks?.length) return { ok: false, detail: "No hay bloques. Aplicá un tema primero." };
      const updated = blocks.map((b: any) => {
        if (b.blockType !== "hero") return b;
        const s = typeof b.settingsJson === "string" ? JSON.parse(b.settingsJson) : b.settingsJson ?? {};
        s.primaryActionLabel = e.textValue;
        return { ...b, settingsJson: JSON.stringify(s) };
      });
      await saveHomeBlocks(updated);
      return { ok: true, detail: `CTA del hero → "${e.textValue}"` };
    }

    // ── Hero image (limited - honest response) ───────────────────────────
    case "change-hero-image": {
      return { ok: false, detail: "No puedo generar o reemplazar imágenes por ahora. Podés cambiar la imagen del hero manualmente desde el editor de secciones." };
    }

    // ── Section visibility ───────────────────────────────────────────────
    case "hide-section": {
      if (!e.sectionKey) return { ok: false, detail: "Sección no reconocida." };
      const { fetchHomeBlocks, saveHomeBlocks } = await import("@/lib/store-engine/actions");
      const blocks = await fetchHomeBlocks();
      if (!blocks?.length) return { ok: false, detail: "No hay bloques." };
      const target = blocks.find((b: any) => b.blockType === e.sectionKey);
      if (!target) return { ok: false, detail: `Sección "${e.sectionLabel ?? e.sectionKey}" no encontrada.` };
      if (!target.isVisible) return { ok: false, detail: `${e.sectionLabel ?? e.sectionKey} ya estaba oculta.` };
      const updated = blocks.map((b: any) => b.blockType === e.sectionKey ? { ...b, isVisible: false } : b);
      await saveHomeBlocks(updated);
      return { ok: true, detail: `${e.sectionLabel ?? e.sectionKey} → oculta` };
    }

    case "show-section": {
      if (!e.sectionKey) return { ok: false, detail: "Sección no reconocida." };
      const { fetchHomeBlocks, saveHomeBlocks } = await import("@/lib/store-engine/actions");
      const blocks = await fetchHomeBlocks();
      if (!blocks?.length) return { ok: false, detail: "No hay bloques." };
      const target = blocks.find((b: any) => b.blockType === e.sectionKey);
      if (!target) return { ok: false, detail: `Sección "${e.sectionLabel ?? e.sectionKey}" no encontrada.` };
      if (target.isVisible) return { ok: false, detail: `${e.sectionLabel ?? e.sectionKey} ya estaba visible.` };
      const updated = blocks.map((b: any) => b.blockType === e.sectionKey ? { ...b, isVisible: true } : b);
      await saveHomeBlocks(updated);
      return { ok: true, detail: `${e.sectionLabel ?? e.sectionKey} → visible` };
    }

    // ── Move section ─────────────────────────────────────────────────────
    case "move-section": {
      if (!e.sectionKey || !e.direction) return { ok: false, detail: "No se pudo determinar la sección o dirección." };
      const { fetchHomeBlocks, saveHomeBlocks } = await import("@/lib/store-engine/actions");
      const blocks = await fetchHomeBlocks();
      if (!blocks?.length) return { ok: false, detail: "No hay bloques." };

      const sorted = [...blocks].sort((a: any, b: any) => a.sortOrder - b.sortOrder);
      const idx = sorted.findIndex((b: any) => b.blockType === e.sectionKey);
      if (idx === -1) return { ok: false, detail: `Sección "${e.sectionLabel}" no encontrada.` };

      const dir = e.direction as "up" | "down" | "top" | "bottom";
      let newOrder: any[];
      if (dir === "up" && idx > 0) {
        newOrder = [...sorted];
        [newOrder[idx], newOrder[idx - 1]] = [newOrder[idx - 1], newOrder[idx]];
      } else if (dir === "down" && idx < sorted.length - 1) {
        newOrder = [...sorted];
        [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
      } else if (dir === "top" && idx > 0) {
        const item = sorted.splice(idx, 1)[0];
        sorted.unshift(item);
        newOrder = sorted;
      } else if (dir === "bottom" && idx < sorted.length - 1) {
        const item = sorted.splice(idx, 1)[0];
        sorted.push(item);
        newOrder = sorted;
      } else {
        return { ok: false, detail: `No se puede mover "${e.sectionLabel}" en esa dirección.` };
      }

      const updated = newOrder.map((b: any, i: number) => ({ ...b, sortOrder: i }));
      await saveHomeBlocks(updated);
      return { ok: true, detail: `${e.sectionLabel} movida ${dir === "up" ? "arriba" : dir === "down" ? "abajo" : dir === "top" ? "al principio" : "al final"}` };
    }

    // ── Apply theme ──────────────────────────────────────────────────────
    case "apply-theme": {
      if (!e.themeId) return { ok: false, detail: "Tema no reconocido." };
      const { applyBuiltInTemplateAction } = await import("@/lib/themes/actions");
      const result = await applyBuiltInTemplateAction(e.themeId);
      if (result.ok) {
        return { ok: true, detail: `Tema "${e.themeLabel ?? e.themeId}" aplicado (${result.blocksCreated} bloques creados)` };
      }
      return { ok: false, detail: result.errors?.[0] ?? "No se pudo aplicar el tema." };
    }

    // ── Device switch ────────────────────────────────────────────────────
    case "switch-mobile": {
      // Triggered via onDeviceChange callback - actual switch happens at ThemeEditorShell level
      return { ok: true, detail: "Vista mobile activada. El preview cambió a celular." };
    }

    case "switch-desktop": {
      return { ok: true, detail: "Vista desktop activada. El preview cambió a escritorio." };
    }

    // ── Preview surface ──────────────────────────────────────────────────
    case "switch-preview-surface": {
      return { ok: true, detail: `Preview cambiado a: ${e.surface}` };
    }

    // ── Undo ─────────────────────────────────────────────────────────────
    case "undo": {
      const { ctx: newCtx, snapshot } = popUndoSnapshot(ctx);
      if (!snapshot) return { ok: false, detail: "No hay cambios previos para deshacer." };

      // Restore branding
      if (snapshot.branding) {
        const { saveStoreBranding } = await import("@/lib/store-engine/actions");
        await saveStoreBranding({
          primaryColor: snapshot.branding.primaryColor,
          secondaryColor: snapshot.branding.secondaryColor,
          fontFamily: snapshot.branding.fontFamily,
          tone: snapshot.branding.tone,
          buttonStyle: snapshot.branding.buttonStyle,
        });
      }

      // Restore blocks
      if (snapshot.blocks) {
        const { saveHomeBlocks } = await import("@/lib/store-engine/actions");
        await saveHomeBlocks(snapshot.blocks.map((b) => ({
          blockType: b.blockType as any,
          sortOrder: b.sortOrder,
          isVisible: b.isVisible,
          settingsJson: b.settingsJson,
          source: b.source,
          state: b.state,
        })));
      }

      return { ok: true, detail: `Revertido: "${snapshot.label}"` };
    }

    default:
      return { ok: false, detail: `Acción "${action.intent}" no implementada.` };
  }
}