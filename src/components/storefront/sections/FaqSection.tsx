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
    <section className="border-y border-[color:var(--hairline-strong)] bg-[var(--surface-1)] py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center sm:mb-12">
          <div className="mx-auto mb-5 h-px w-10 bg-[var(--accent-500)]" aria-hidden />
          <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-5">
            {title}
          </h2>
        </div>
        <div className="space-y-3">
          {questions.map((q, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="overflow-hidden rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-soft)]"
              >
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] sm:min-h-[52px] sm:px-6"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                >
                  <span className="pr-4 text-[14px] font-semibold tracking-[-0.01em] text-ink-0">
                    {q.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-ink-5 transition-transform duration-200",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-200",
                    isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
                  )}
                >
                  <div className="border-t border-[color:var(--hairline)] px-5 pb-5 pt-4 sm:px-6">
                    <p className="text-[13px] leading-[1.65] text-ink-5">{q.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
