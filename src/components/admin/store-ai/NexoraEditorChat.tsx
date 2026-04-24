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
import {
  createEditorContext,
  processEditorMessage,
  type EditorCallbacks,
  type EditorContext,
} from "@/lib/assistants/editor";
import type { Reply } from "@/lib/ai-core";
import {
  buildEditorMemoryPayload,
  getEditorContentSignature,
  hydrateEditorContext,
  isEditorMemoryPayload,
  type TranscriptLine,
} from "@/lib/assistants/memory/payload";
import {
  loadNexoraAssistantMemory,
  logNexoraDeliberation,
  saveNexoraAssistantMemory,
} from "@/lib/assistants/nexora-memory-actions";
import { computeStoreContentSignature } from "@/lib/assistants/memory/signature";
import type { AssistantMemoryScope } from "@/lib/assistants/memory/scope";
import type { DeliberationOptions } from "@/lib/ai-core";
import type { AdminStoreInitialData } from "@/types/store-engine";

// ─── Nexora Editor Chat — built on the shared AI Core ───────────────────
//
// This component is the editor's chat shell. It does NOT import from
// `lib/copilot/*` directly anymore; it talks to `processEditorMessage`,
// which goes through the same `deliberate()` pipeline as the global
// assistant — but uses the editor's specialized planner, dispatcher and
// undo-aware private context.
//
// Surface preserved:
//   · undo counter in the header (driven by the legacy ConversationContext
//     that lives inside EditorContext.editor.legacy)
//   · device + preview surface callbacks (forwarded into the dispatcher)
//   · onActionApplied notification after a successful mutation
//   · clarification / partial / error visual states

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  reply?: Reply;
  ts: number;
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
  /** Server-scoped; editor memory is never shared with the global assistant. */
  memoryScope?: AssistantMemoryScope;
  /** Store snapshot for safe continuity vs. persisted `contentSignature` (from server). */
  storeInitialData?: AdminStoreInitialData | null;
}

const STARTER: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text:
    "Hola. Soy tu copiloto de diseño. Decime qué querés cambiar y lo ajusto en tu tienda.",
  ts: Date.now(),
};

function editorTranscriptToMessages(t: TranscriptLine[]): ChatMessage[] {
  return t.map((line, i) => ({
    id: `e-${line.ts}-${i}`,
    role: line.role,
    text: line.text,
    ts: line.ts,
  }));
}

function editorMessagesToTranscript(msgs: ChatMessage[]): TranscriptLine[] {
  return msgs
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, text: m.text, ts: m.ts }));
}

export function NexoraEditorChat({
  onActionApplied,
  onDeviceChange,
  onPreviewSurfaceChange,
  memoryScope,
  storeInitialData,
}: NexoraEditorChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([STARTER]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [ctx, setCtx] = useState<EditorContext>(() => createEditorContext());

  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const onActionAppliedRef = useRef(onActionApplied);
  onActionAppliedRef.current = onActionApplied;
  const onDeviceChangeRef = useRef(onDeviceChange);
  onDeviceChangeRef.current = onDeviceChange;
  const onPreviewSurfaceChangeRef = useRef(onPreviewSurfaceChange);
  onPreviewSurfaceChangeRef.current = onPreviewSurfaceChange;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const memoryRecoveredThisSession = useRef(false);
  const memoryRowUpdatedAt = useRef<string | null>(null);
  const loadedContentSigRef = useRef<string | undefined>(undefined);
  const stalePassUsedRef = useRef(false);

  const contentSignature = storeInitialData ? computeStoreContentSignature(storeInitialData) : undefined;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen]);

  useEffect(() => {
    if (!memoryScope) return;
    let cancelled = false;
    (async () => {
      const row = await loadNexoraAssistantMemory(
        memoryScope.storeId,
        memoryScope.userId,
        "editor",
      );
      if (cancelled || !row?.payloadJson) return;
      try {
        const parsed: unknown = JSON.parse(row.payloadJson);
        if (!isEditorMemoryPayload(parsed)) return;
        memoryRecoveredThisSession.current = true;
        memoryRowUpdatedAt.current = row.updatedAt;
        loadedContentSigRef.current = getEditorContentSignature(parsed);
        setCtx(hydrateEditorContext(parsed, "/admin/store-ai/editor"));
        if (parsed.transcript?.length) {
          setMessages(editorTranscriptToMessages(parsed.transcript));
        }
        onPreviewSurfaceChangeRef.current?.(parsed.editor.preview);
        onDeviceChangeRef.current?.(parsed.editor.currentDevice);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [memoryScope?.storeId, memoryScope?.userId]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
      ts: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    startTransition(async () => {
      try {
        const callbacks: EditorCallbacks = {
          onActionApplied: () => onActionAppliedRef.current(),
          onDeviceChange: (d) => onDeviceChangeRef.current?.(d),
          onPreviewSurfaceChange: (s) => onPreviewSurfaceChangeRef.current?.(s),
        };
        const ageFromRow =
          memoryRowUpdatedAt.current == null
            ? undefined
            : Date.now() - new Date(memoryRowUpdatedAt.current).getTime();
        const stateStale = Boolean(
          !stalePassUsedRef.current &&
            loadedContentSigRef.current != null &&
            contentSignature != null &&
            loadedContentSigRef.current !== contentSignature,
        );
        if (stateStale) {
          stalePassUsedRef.current = true;
        }
        const deliberationOptions: DeliberationOptions = {
          preloadedMemoryAgeMs: ageFromRow,
          memoryRecoveredThisSession: memoryRecoveredThisSession.current,
          stateStale,
        };
        const { reply, context, meta, trace } = await processEditorMessage(text, ctxRef.current, {
          callbacks,
          deliberationOptions,
        });
        setMessages((prev) => {
          const aMsg: ChatMessage = {
            id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            role: "assistant",
            text: reply.text,
            reply,
            ts: Date.now(),
          };
          const next = [...prev, aMsg];
          if (memoryScope) {
            const t = editorMessagesToTranscript(next);
            const payload = buildEditorMemoryPayload(context, t, {
              lastRecommendation: reply.nextSteps?.[0] ?? reply.bullets?.[0],
              contentSignature,
            });
            const json = JSON.stringify(payload);
            void saveNexoraAssistantMemory(
              memoryScope.storeId,
              memoryScope.userId,
              "editor",
              json,
              payload.summaryLine,
            );
            void logNexoraDeliberation(memoryScope.storeId, memoryScope.userId, meta, trace);
            loadedContentSigRef.current = contentSignature;
            memoryRowUpdatedAt.current = new Date().toISOString();
          }
          return next;
        });
        setCtx(context);
      } catch (e) {
        const msg = (e as Error).message ?? "Error desconocido";
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            text: `Hubo un problema procesando tu mensaje: ${msg}`,
            ts: Date.now(),
          },
        ]);
      }
    });
  }, [input, memoryScope]);

  const undoCount = ctx.editor.legacy.undoStack.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={cn(
          "fixed bottom-6 right-6 z-[70] flex h-12 w-12 items-center justify-center rounded-full shadow-[var(--shadow-overlay)] transition-all duration-300 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
          isOpen
            ? "bg-[var(--surface-0)] border border-[color:var(--hairline)] text-ink-0"
            : "bg-ink-0 text-ink-12 hover:bg-ink-2",
        )}
        aria-label={isOpen ? "Cerrar copiloto" : "Abrir copiloto"}
      >
        {isOpen ? (
          <X className="h-5 w-5" strokeWidth={1.75} />
        ) : (
          <Sparkles className="h-5 w-5" strokeWidth={1.75} />
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-20 right-6 z-[70] flex w-[400px] max-h-[min(600px,calc(100vh-120px))] flex-col rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-overlay)] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <header className="flex items-center justify-between border-b border-[color:var(--hairline)] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-[var(--r-sm)] bg-ink-0 text-ink-12">
                <Sparkles className="h-4 w-4" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-ink-0">Nexora IA</p>
                <p className="text-[9px] uppercase tracking-[0.12em] text-ink-5">
                  Copiloto de diseño
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {undoCount > 0 && (
                <span className="flex items-center gap-1 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-1.5 py-0.5 text-[9px] text-ink-5">
                  <Undo2 className="h-2.5 w-2.5" strokeWidth={1.75} />
                  {undoCount}
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

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {isPending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-[var(--r-md)] bg-[var(--surface-1)] px-3.5 py-2.5 text-[11px] text-ink-5">
                  <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
                  Pensando…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 2 && (
            <div className="border-t border-[color:var(--hairline)] px-4 py-2.5">
              <p className="mb-2 text-[9px] font-medium uppercase tracking-[0.12em] text-ink-6">
                Probá algo
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Algo más premium",
                  "Poné una imagen premium",
                  "Botones más circulares",
                  "Fuente más editorial",
                  "Mostrame en celu",
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setInput(s);
                      inputRef.current?.focus();
                    }}
                    className="rounded-[var(--r-full)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2.5 py-1 text-[10px] font-medium text-ink-5 transition-colors hover:bg-[var(--surface-2)] hover:text-ink-0"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-[color:var(--hairline)] px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
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

// ─── Message Bubble ──────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  const r = msg.reply;
  const status =
    r?.kind === "ok"
      ? "ok"
      : r?.kind === "err"
      ? "err"
      : r?.kind === "ask"
      ? "clarify"
      : r?.kind === "deny"
      ? "clarify"
      : undefined;
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[90%] rounded-[var(--r-md)] px-3.5 py-2.5 text-[12px] leading-[1.6]",
          isUser && "bg-ink-0 text-ink-12",
          !isUser && status === "ok" && "bg-[var(--surface-1)] text-ink-0 border border-[color:var(--hairline)]",
          !isUser && status === "err" && "bg-[color:var(--signal-danger)]/8 text-ink-0 border border-[color:var(--signal-danger)]/20",
          !isUser && status === "clarify" && "bg-[var(--surface-1)] text-ink-0 border border-[color:var(--accent-500)]/30",
          !isUser && !status && "bg-[var(--surface-1)] text-ink-0 border border-[color:var(--hairline)]",
        )}
      >
        {!isUser && status === "ok" && (
          <div className="mb-1.5 flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-[color:var(--signal-success)]" strokeWidth={2} />
            <span className="text-[10px] font-medium text-[color:var(--signal-success)]">Aplicado</span>
          </div>
        )}
        {!isUser && status === "err" && (
          <div className="mb-1.5 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-[color:var(--signal-danger)]" strokeWidth={2} />
            <span className="text-[10px] font-medium text-[color:var(--signal-danger)]">No se pudo</span>
          </div>
        )}
        {!isUser && status === "clarify" && (
          <div className="mb-1.5 flex items-center gap-1.5">
            <Info className="h-3 w-3 text-[var(--accent-500)]" strokeWidth={2} />
            <span className="text-[10px] font-medium text-[var(--accent-500)]">Necesito más info</span>
          </div>
        )}
        <div className="whitespace-pre-wrap">{msg.text}</div>

        {r?.bullets && r.bullets.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-[11px] text-ink-5">
            {r.bullets.map((b, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-ink-6">·</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}

        {r?.nextSteps && r.nextSteps.length > 0 && (
          <p className="mt-2 text-[10px] uppercase tracking-[0.1em] text-ink-6">
            {r.nextSteps.join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
