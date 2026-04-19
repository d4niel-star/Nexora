"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";
import { processGlobalCommand } from "@/app/admin/ai/actions";

export function GlobalCommandInput() {
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isPending) return;

    startTransition(async () => {
      await processGlobalCommand(input);
    });
  };

  return (
    <div className="mt-8 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 shadow-[var(--shadow-soft)] relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-5 h-5 text-ink-0" />
          <h4 className="text-sm font-semibold text-ink-0">Comando Global Rápido</h4>
        </div>
        <form onSubmit={handleSubmit} className="relative">
          <textarea 
             value={input}
             onChange={(e) => setInput(e.target.value)}
             onKeyDown={(e) => {
               if (e.key === 'Enter' && !e.shiftKey) {
                 e.preventDefault();
                 handleSubmit(e);
               }
             }}
             className="w-full bg-[var(--surface-1)] border border-[color:var(--hairline)] rounded-[var(--r-md)] px-4 py-3 placeholder:text-ink-6 focus:outline-none focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)] text-sm text-ink-0 resize-none transition-[box-shadow,border-color]"
             placeholder="Ej: Analizá mi rentabilidad y sugerime una campaña para el top 1..."
             rows={3}
             disabled={isPending}
          />
          <div className="absolute right-3 bottom-4 flex items-center">
            <button 
              type="submit"
              disabled={!input.trim() || isPending}
              className="bg-ink-0 text-ink-12 p-2.5 rounded-[var(--r-sm)] disabled:opacity-50 disabled:bg-[var(--surface-3)] disabled:text-ink-6 transition-colors hover:bg-ink-1"
            >
               {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </form>
        {isPending && (
           <div className="absolute inset-0 bg-[var(--surface-0)]/50 backdrop-blur-[1px] flex items-center justify-center">
             <div className="bg-ink-0 text-ink-12 text-[12px] font-semibold px-4 py-2 rounded-[var(--r-sm)] flex items-center gap-2 shadow-[var(--shadow-elevated)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--signal-success)] animate-ping" />
                Ruteando contexto...
             </div>
           </div>
        )}
    </div>
  );
}
