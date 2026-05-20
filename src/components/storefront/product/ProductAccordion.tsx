"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Product Accordion ───────────────────────────────────────────────────
// Expandable tabs for PDP: description, specifications, shipping, returns.
// Only renders sections that have content — no empty/fake tabs.

export interface AccordionSection {
  id: string;
  title: string;
  content: string; // HTML string or plain text
  isHtml?: boolean;
}

export function ProductAccordion({ sections }: { sections: AccordionSection[] }) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    // First section open by default
    return new Set(sections.length > 0 ? [sections[0].id] : []);
  });

  if (sections.length === 0) return null;

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="mt-10 divide-y divide-[color:var(--hairline)] border-t border-b border-[color:var(--hairline)]">
      {sections.map((section) => {
        const isOpen = openIds.has(section.id);
        return (
          <div key={section.id}>
            <button
              type="button"
              onClick={() => toggle(section.id)}
              className="flex w-full items-center justify-between py-5 text-left focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
              aria-expanded={isOpen}
              aria-controls={`accordion-panel-${section.id}`}
            >
              <span className="text-[13px] font-semibold tracking-[-0.01em] text-ink-0 sm:text-[14px]">
                {section.title}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-ink-5 transition-transform duration-200",
                  isOpen && "rotate-180",
                )}
                strokeWidth={1.75}
              />
            </button>
            <div
              id={`accordion-panel-${section.id}`}
              role="region"
              className={cn(
                "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
                isOpen ? "max-h-[800px] opacity-100 pb-6" : "max-h-0 opacity-0",
              )}
            >
              {section.isHtml ? (
                <div
                  className="max-w-prose text-[14px] leading-[1.65] text-ink-4 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:text-ink-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:mb-1"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              ) : (
                <p className="max-w-prose text-[14px] leading-[1.65] text-ink-4">
                  {section.content}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
