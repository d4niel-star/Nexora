"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FaqSectionProps {
  settings: Record<string, unknown>;
}

export function FaqSection({ settings }: FaqSectionProps) {
  const title = (settings.title as string) ?? "FAQ";
  const questions = (settings.questions as Array<{
    question: string;
    answer: string;
  }>) ?? [];

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (questions.length === 0) return null;

  return (
    <div className="bg-gray-50 py-24 sm:py-32 border-y border-gray-100">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-16">
          {title}
        </h2>
        <div className="space-y-3">
          {questions.map((q, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-gray-50"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                >
                  <span className="text-sm font-bold text-gray-900 pr-4">
                    {q.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-200",
                    isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <div className="border-t border-gray-100 px-6 pb-5 pt-4">
                    <p className="text-sm font-medium leading-relaxed text-gray-600">
                      {q.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
