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
    <div className="mt-8 rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-5 h-5 text-[#111111]" />
          <h4 className="text-sm font-bold text-[#111111]">Comando Global Rápido</h4>
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
             className="w-full bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl px-4 py-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#111111] text-sm resize-none transition-shadow"
             placeholder="Ej: Analizá mi rentabilidad y sugerime una campaña para el top 1..."
             rows={3}
             disabled={isPending}
          />
          <div className="absolute right-3 bottom-4 flex items-center">
            <button 
              type="submit"
              disabled={!input.trim() || isPending}
              className="bg-[#111111] text-white p-2.5 rounded-lg disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400 transition-colors hover:bg-black"
            >
               {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </form>
        {isPending && (
           <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center">
             <div className="bg-[#111111] text-white text-[12px] font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Ruteando contexto...
             </div>
           </div>
        )}
    </div>
  );
}
