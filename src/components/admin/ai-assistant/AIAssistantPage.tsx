"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowUp,
  Loader2,
  MessageSquare,
  Package,
  Plus,
  ShoppingCart,
  Store,
  Target,
  HelpCircle,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createConversationAction,
  sendMessageAction,
  getConversationsAction,
  getConversationAction,
  getAIUsageStatsAction,
} from "@/lib/ai-core/actions";
import type { AIContextType } from "@/lib/ai-core/contexts";
import { UpgradePrompt } from "@/components/admin/billing/UpgradePrompt";

// ─── Types ───

interface MessageView {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface ConversationSummary {
  id: string;
  contextType: string;
  title: string;
  messageCount: number;
  updatedAt: string;
}

// ─── Nexora Logo (inline SVG component, matching AdminShell identity) ───

function NexoraMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <div className="absolute inset-0 rotate-12 rounded-[5px] bg-[#111111]" />
      <div className="absolute rounded-sm bg-emerald-500" style={{ width: size * 0.25, height: size * 0.25, top: "15%", left: "15%" }} />
      <div className="absolute rounded-sm bg-white" style={{ width: size * 0.25, height: size * 0.25, bottom: "15%", right: "15%" }} />
    </div>
  );
}

// ─── Main ───

export function AIAssistantPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageView[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [usageStats, setUsageStats] = useState({ totalConversations: 0, totalMessages: 0, totalTokens: 0 });
  const [outOfCredits, setOutOfCredits] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    Promise.all([getConversationsAction(), getAIUsageStatsAction()]).then(([convs, stats]) => {
      setConversations(convs);
      setUsageStats(stats);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const refreshConversations = () => {
    getConversationsAction().then(setConversations);
    getAIUsageStatsAction().then(setUsageStats);
  };

  const handleNewConversation = useCallback((contextType: AIContextType = "general") => {
    startTransition(async () => {
      const conv = await createConversationAction(contextType);
      setActiveConversationId(conv.id);
      setMessages([]);
      refreshConversations();
      inputRef.current?.focus();
    });
  }, []);

  const handleOpenConversation = useCallback((id: string) => {
    startTransition(async () => {
      const conv = await getConversationAction(id);
      if (conv) {
        setActiveConversationId(conv.id);
        setMessages(conv.messages);
      }
    });
  }, []);

  const handleSend = useCallback(() => {
    if (!input.trim() || !activeConversationId || isPending) return;
    const msg = input;
    setInput("");

    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, role: "user", content: msg, createdAt: new Date().toISOString() }]);

    startTransition(async () => {
      try {
        const result = await sendMessageAction(activeConversationId, msg);
        setOutOfCredits(false);
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempId);
          return [...filtered, result.userMessage, result.assistantMessage];
        });
        refreshConversations();
      } catch (e: any) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        if (e.message.toLowerCase().includes("créditos") || e.message.toLowerCase().includes("reembolsados")) {
           setOutOfCredits(true);
        } else {
           alert("Error al enviar: " + e.message);
        }
      }
    });
  }, [input, activeConversationId, isPending]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#CCCCCC]" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      {/* ─── Header ─── */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <NexoraMark size={28} />
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight text-[#111111] leading-none">Nexora AI</h1>
            <p className="mt-1 text-[13px] text-[#999999]">Asistente inteligente para tu negocio</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3 text-[11px] text-[#BBBBBB]">
          <span className="tabular-nums">{usageStats.totalConversations} chats</span>
          <span className="text-[#E5E5E5]">·</span>
          <span className="tabular-nums">{usageStats.totalMessages} mensajes</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[260px_1fr] lg:gap-6">
        {/* ─── Sidebar ─── */}
        <div className="mb-6 lg:mb-0">
          {/* New conversation */}
          <button
            onClick={() => handleNewConversation("general")}
            className="flex w-full items-center gap-2 rounded-lg bg-[#111111] px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-black"
            type="button"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo chat
          </button>

          {/* Context shortcuts */}
          <div className="mt-6">
            <p className="px-1 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#BBBBBB]">Contextos</p>
            <div className="space-y-0.5">
              {CONTEXT_OPTIONS.map((ctx) => (
                <button
                  key={ctx.type}
                  onClick={() => handleNewConversation(ctx.type)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-[#777777] transition-colors hover:bg-[#F5F5F5] hover:text-[#111111]"
                  type="button"
                >
                  <ctx.icon className="h-3.5 w-3.5" />
                  {ctx.label}
                </button>
              ))}
            </div>
          </div>

          {/* History */}
          <div className="mt-6 pt-5 border-t border-[#F0F0F0]">
            <p className="px-1 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#BBBBBB]">Recientes</p>
            {conversations.length === 0 ? (
              <p className="px-2.5 py-2 text-[12px] text-[#CCCCCC]">Sin conversaciones</p>
            ) : (
              <div className="space-y-0.5 max-h-[260px] overflow-y-auto">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleOpenConversation(conv.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
                      conv.id === activeConversationId
                        ? "bg-[#111111] text-white"
                        : "text-[#777777] hover:bg-[#F5F5F5]"
                    )}
                    type="button"
                  >
                    <MessageSquare className={cn("h-3 w-3 shrink-0", conv.id === activeConversationId ? "text-white/50" : "text-[#CCCCCC]")} />
                    <span className="truncate text-[12px] font-medium">{conv.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Chat Area ─── */}
        <div className="flex flex-col rounded-2xl border border-[#E5E5E5] bg-white overflow-hidden" style={{ minHeight: "560px", maxHeight: "calc(100vh - 200px)" }}>
          {!activeConversationId ? (
            <WelcomeView onNewConversation={handleNewConversation} />
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8 space-y-6">
                {messages.length === 0 && (
                  <SuggestedPrompts onSelect={(prompt) => { setInput(prompt); inputRef.current?.focus(); }} />
                )}
                {messages.map((msg) => (
                  <ChatBlock key={msg.id} message={msg} />
                ))}
                {isPending && messages.length > 0 && messages[messages.length - 1].role === "user" && (
                  <div className="flex items-start gap-3">
                    <NexoraMark size={22} />
                    <div className="flex items-center gap-2 text-[13px] text-[#BBBBBB]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Pensando...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              {outOfCredits ? (
                 <div className="border-t border-[#F0F0F0] bg-[#FAFAFA] p-4">
                    <UpgradePrompt 
                       title="Se agotaron tus créditos de IA" 
                       description="Alcanzaste el límite de créditos incluidos en tu plan. Podés comprar créditos adicionales o actualizar a un plan con mayor capacidad."
                       feature="ai_credits"
                    />
                 </div>
              ) : (
                 <div className="border-t border-[#F0F0F0] bg-[#FAFAFA] px-4 md:px-6 py-4">
                   <div className="flex items-end gap-2 rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 focus-within:border-[#111111] transition-colors">
                     <textarea
                       ref={inputRef}
                       value={input}
                       onChange={(e) => setInput(e.target.value)}
                       onKeyDown={handleKeyDown}
                       placeholder="Escribí tu mensaje..."
                       className="flex-1 resize-none bg-transparent py-1 text-[13px] text-[#111111] outline-none placeholder:text-[#CCCCCC]"
                       rows={1}
                       style={{ maxHeight: "100px" }}
                     />
                     <button
                       onClick={handleSend}
                       disabled={!input.trim() || isPending}
                       className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#111111] text-white transition-all hover:bg-black disabled:opacity-20"
                       type="button"
                       aria-label="Enviar mensaje"
                     >
                       <ArrowUp className="h-3.5 w-3.5" />
                     </button>
                   </div>
                   <p className="mt-2 text-center text-[10px] text-[#CCCCCC]">
                     Nexora AI · Las respuestas pueden no ser exactas
                   </p>
                 </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Welcome View ───

function WelcomeView({ onNewConversation }: { onNewConversation: (ctx: AIContextType) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
      <NexoraMark size={40} className="mb-6" />
      <h2 className="text-xl font-extrabold tracking-tight text-[#111111]">¿En qué te puedo ayudar?</h2>
      <p className="mt-2 max-w-sm text-[13px] text-[#999999]">
        Seleccioná un contexto para comenzar o escribí directamente.
      </p>
      <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-md w-full">
        {CONTEXT_OPTIONS.map((ctx) => (
          <button
            key={ctx.type}
            onClick={() => onNewConversation(ctx.type)}
            className="group flex items-center gap-2 rounded-lg border border-[#E5E5E5] bg-white px-3.5 py-3 text-left transition-all hover:border-[#111111]/20 hover:bg-[#FAFAFA]"
            type="button"
          >
            <ctx.icon className="h-3.5 w-3.5 text-[#BBBBBB] group-hover:text-[#111111] transition-colors" />
            <span className="text-[12px] font-semibold text-[#777777] group-hover:text-[#111111] transition-colors">{ctx.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Chat Block (not bubble — more workspace-like) ───

function ChatBlock({ message }: { message: MessageView }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] rounded-2xl rounded-br-md bg-[#111111] px-4 py-3 text-[13px] leading-relaxed text-white">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <NexoraMark size={22} className="mt-0.5 shrink-0" />
      <div className="max-w-[85%] text-[13px] leading-[1.7] text-[#333333]">
        <div
          className="prose-nexora"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
        />
      </div>
    </div>
  );
}

// ─── Suggested Prompts ───

function SuggestedPrompts({ onSelect }: { onSelect: (prompt: string) => void }) {
  const prompts = [
    { text: "¿Cómo mejoro las descripciones de mis productos?", icon: Package },
    { text: "Dame ideas para una campaña de marketing", icon: Target },
    { text: "¿Cómo optimizo mi tienda para vender más?", icon: Store },
    { text: "Ayudame a crear FAQs para mi tienda", icon: HelpCircle },
  ];

  return (
    <div className="flex flex-col items-center py-10">
      <NexoraMark size={28} className="mb-4" />
      <p className="mb-6 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#BBBBBB]">Prueba preguntando</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {prompts.map((p) => (
          <button
            key={p.text}
            onClick={() => onSelect(p.text)}
            className="group flex items-start gap-2.5 rounded-xl border border-[#E5E5E5] bg-white px-4 py-3 text-left transition-all hover:border-[#111111]/20 hover:bg-[#FAFAFA]"
            type="button"
          >
            <p.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#CCCCCC] group-hover:text-[#111111] transition-colors" />
            <span className="text-[12px] text-[#777777] group-hover:text-[#111111] transition-colors">{p.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Context Options ───

const CONTEXT_OPTIONS: { type: AIContextType; label: string; icon: typeof Package }[] = [
  { type: "general", label: "General", icon: LayoutDashboard },
  { type: "store", label: "Mi Tienda", icon: Store },
  { type: "catalog", label: "Catálogo", icon: Package },
  { type: "orders", label: "Pedidos", icon: ShoppingCart },
  { type: "marketing", label: "Marketing", icon: Target },
  { type: "support", label: "Soporte", icon: HelpCircle },
];

// ─── Markdown renderer (premium styling) ───

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-[#111111]">$1</strong>')
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, '<h3 class="text-[13px] font-bold text-[#111111] mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-[14px] font-bold text-[#111111] mt-4 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-[15px] font-bold text-[#111111] mt-4 mb-1.5">$1</h1>')
    .replace(/^- (.+)$/gm, '<div class="flex items-start gap-2 ml-1 my-0.5"><span class="mt-[7px] h-1 w-1 rounded-full bg-[#CCCCCC] shrink-0"></span><span>$1</span></div>')
    .replace(/^(\d+)\. (.+)$/gm, '<div class="flex items-start gap-2 ml-1 my-0.5"><span class="text-[11px] font-bold text-[#BBBBBB] mt-[1px] shrink-0 w-4">$1.</span><span>$2</span></div>')
    .replace(/\n{2,}/g, '<div class="h-3"></div>')
    .replace(/\n/g, '<div class="h-1"></div>');
}
