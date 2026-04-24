"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ArrowUpRight, CheckCircle2, Loader2, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createCoreContext, type CoreContext, type Reply } from "@/lib/ai-core";
import { processGlobalMessage } from "@/lib/assistants/global";
import {
  buildGlobalMemoryPayload,
  hydrateGlobalContext,
  MEMORY_V1,
  MEMORY_V2,
  type TranscriptLine,
} from "@/lib/assistants/memory/payload";
import type { AssistantMemoryScope } from "@/lib/assistants/memory/scope";
import {
  loadNexoraAssistantMemory,
  logNexoraDeliberation,
  saveNexoraAssistantMemory,
} from "@/lib/assistants/nexora-memory-actions";

// ─── Nexora Global Chat ──────────────────────────────────────────────────
//
// Floating AI assistant that lives across the entire admin (everything
// except the store editor — that surface has its own dedicated assistant
// with a separate context and a separate intent catalog).
//
// This component is intentionally a dumb shell: all conversational logic
// (classification, tone, interpretation, dispatch) lives in
// `lib/assistants/global`, which itself sits on top of the shared AI Core
// (`lib/ai-core`). This is what enables "one brain, two assistants".

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  reply?: Reply;
  text: string;
  ts: number;
}

const STARTER_MSG: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text:
    "Hola. Soy Nexora. Mi fuerte son los Ads (Meta, TikTok, Google), pero también te ayudo con todo el admin.",
  ts: Date.now(),
};

function transcriptToChatMessages(t: TranscriptLine[]): ChatMessage[] {
  return t.map((line, i) => ({
    id: `m-${line.ts}-${i}`,
    role: line.role,
    text: line.text,
    ts: line.ts,
  }));
}

function chatMessagesToTranscript(msgs: ChatMessage[]): TranscriptLine[] {
  return msgs
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, text: m.text, ts: m.ts }));
}

export function NexoraGlobalChat({ memoryScope }: { memoryScope?: AssistantMemoryScope }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/admin";

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([STARTER_MSG]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [ctx, setCtx] = useState<CoreContext>(() => createCoreContext(pathname));

  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const memoryRecoveredThisSession = useRef(false);
  const memoryRowUpdatedAt = useRef<string | null>(null);

  // Keep currentRoute fresh; the assistant uses it as a soft hint.
  useEffect(() => {
    setCtx((prev) => ({ ...prev, currentRoute: pathname }));
  }, [pathname]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // Cross-session memory (separate from editor assistant; server-validated)
  useEffect(() => {
    if (!memoryScope) return;
    let cancelled = false;
    (async () => {
      const row = await loadNexoraAssistantMemory(
        memoryScope.storeId,
        memoryScope.userId,
        "global",
      );
      if (cancelled || !row?.payloadJson) return;
      try {
        const parsed: unknown = JSON.parse(row.payloadJson);
        if (
          typeof parsed !== "object" ||
          parsed === null ||
          !("v" in parsed) ||
          ((parsed as { v: number }).v !== MEMORY_V1 && (parsed as { v: number }).v !== MEMORY_V2)
        ) {
          return;
        }
        memoryRecoveredThisSession.current = true;
        memoryRowUpdatedAt.current = row.updatedAt;
        setCtx(hydrateGlobalContext(parsed as Parameters<typeof hydrateGlobalContext>[0], pathname));
        if (
          "transcript" in parsed &&
          Array.isArray((parsed as { transcript: unknown }).transcript) &&
          (parsed as { transcript: { length: number } }).transcript.length
        ) {
          setMessages(
            transcriptToChatMessages(
              (parsed as { transcript: TranscriptLine[] }).transcript,
            ),
          );
        }
      } catch {
        /* ignore bad legacy rows */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [memoryScope?.storeId, memoryScope?.userId, pathname]);

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
        const ageFromRow =
          memoryRowUpdatedAt.current == null
            ? undefined
            : Date.now() - new Date(memoryRowUpdatedAt.current).getTime();
        const { reply, context, meta, trace } = await processGlobalMessage(text, ctxRef.current, {
          preloadedMemoryAgeMs: ageFromRow,
          memoryRecoveredThisSession: memoryRecoveredThisSession.current,
        });
        const aMsg: ChatMessage = {
          id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          role: "assistant",
          reply,
          text: reply.text,
          ts: Date.now(),
        };
        setMessages((prev) => {
          const next = [...prev, aMsg];
          if (memoryScope) {
            const t = chatMessagesToTranscript(next);
            const payload = buildGlobalMemoryPayload(context, t, {
              lastRecommendation: reply.nextSteps?.[0] ?? reply.bullets?.[0],
            });
            const json = JSON.stringify(payload);
            void saveNexoraAssistantMemory(
              memoryScope.storeId,
              memoryScope.userId,
              "global",
              json,
              payload.summaryLine,
            );
            void logNexoraDeliberation(memoryScope.storeId, memoryScope.userId, meta, trace);
            memoryRowUpdatedAt.current = new Date().toISOString();
          }
          return next;
        });
        setCtx(context);
      } catch (e) {
        const err = (e as Error).message ?? "Algo salió mal.";
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            text: `Hubo un problema procesando tu mensaje: ${err}`,
            ts: Date.now(),
          },
        ]);
      }
    });
  }, [input, memoryScope]);

  const onActionClick = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router],
  );

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
          <X className="h-4 w-4" strokeWidth={1.75} />
        ) : (
          <Sparkles className="h-4 w-4" strokeWidth={1.75} />
        )}
      </button>

      {/* ── Chat panel ─────────────────────────────────── */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Nexora IA"
          className="fixed bottom-18 right-5 z-[70] flex w-[380px] max-h-[min(560px,calc(100vh-110px))] flex-col rounded-xl border border-gray-200 bg-white shadow-2xl animate-in slide-in-from-bottom-3 fade-in duration-250"
        >
          <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-900 text-white">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-gray-900">Nexora IA</p>
                <p className="text-[9px] uppercase tracking-[0.12em] text-gray-400">
                  Asistente del admin · Ads
                </p>
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

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3">
            {messages.map((msg) => (
              <Bubble key={msg.id} msg={msg} onAction={onActionClick} />
            ))}
            {isPending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-400">
                  <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
                  Pensando…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 2 && (
            <div className="border-t border-gray-100 px-4 py-2">
              <p className="mb-1.5 text-[9px] font-medium uppercase tracking-[0.12em] text-gray-400">
                Probá algo
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Cómo va el negocio",
                  "Recomendaciones de Meta Ads",
                  "Llevame a estadísticas",
                  "Configurar píxeles",
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setInput(s);
                      inputRef.current?.focus();
                    }}
                    className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 px-4 py-3">
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

function Bubble({
  msg,
  onAction,
}: {
  msg: ChatMessage;
  onAction: (href: string) => void;
}) {
  const isUser = msg.role === "user";
  const r = msg.reply;
  const tone =
    r?.kind === "err"
      ? "err"
      : r?.kind === "deny"
      ? "deny"
      : r?.kind === "ok"
      ? "ok"
      : "info";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[90%] rounded-lg px-3 py-2 text-[12px] leading-[1.6]",
          isUser && "bg-gray-900 text-white",
          !isUser && tone === "ok" && "bg-gray-50 text-gray-900 border border-gray-100",
          !isUser && tone === "err" && "bg-red-50 text-gray-900 border border-red-100",
          !isUser && tone === "deny" && "bg-amber-50 text-gray-900 border border-amber-100",
          !isUser && tone === "info" && "bg-gray-50 text-gray-900 border border-gray-100",
        )}
      >
        {!isUser && r?.kind === "ok" && (
          <div className="mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" strokeWidth={2} />
            <span className="text-[10px] font-medium text-emerald-600">Listo</span>
          </div>
        )}
        <div className="whitespace-pre-wrap">{msg.text}</div>

        {r?.bullets && r.bullets.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-[11px] text-gray-600">
            {r.bullets.map((b, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-gray-300">·</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}

        {r?.action?.href && (
          <button
            type="button"
            onClick={() => onAction(r.action!.href!)}
            className={cn(
              "mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
              isUser
                ? "bg-white/10 text-white hover:bg-white/20"
                : "bg-gray-900 text-white hover:bg-gray-800",
            )}
          >
            {r.action.label ?? "Abrir"}
            <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
          </button>
        )}

        {r?.nextSteps && r.nextSteps.length > 0 && (
          <p className="mt-2 text-[10px] uppercase tracking-[0.1em] text-gray-400">
            {r.nextSteps.join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
