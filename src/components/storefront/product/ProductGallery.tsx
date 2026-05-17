"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

// ─── Product Gallery Pro ───
// Improved thumbnail interaction, smooth main image transitions,
// better mobile horizontal scroll, and refined active state.

export function ProductGallery({ images }: { images: string[] }) {
  const [activeIdx, setActiveIdx] = useState(0);

  if (!images || images.length === 0)
    return (
      <div className="flex aspect-[4/5] w-full items-center justify-center rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-2)]">
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-6">
          Sin imagen
        </span>
      </div>
    );

  return (
    <div className="flex flex-col-reverse gap-4 lg:flex-row lg:gap-5">
      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex w-full shrink-0 gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:w-[4.5rem] lg:flex-col lg:overflow-y-auto lg:pb-0">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIdx(idx)}
              type="button"
              className={cn(
                "relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-[var(--r-md)] border-2 bg-[var(--surface-2)] transition-all duration-300 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] lg:w-full",
                activeIdx === idx
                  ? "border-ink-0 opacity-100 shadow-[var(--shadow-soft)]"
                  : "border-transparent opacity-50 hover:opacity-80",
              )}
              aria-label={`Ver imagen ${idx + 1}`}
              aria-pressed={activeIdx === idx}
            >
              <img
                src={img}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover object-center"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main image */}
      <div className="relative aspect-[4/5] w-full flex-1 overflow-hidden rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-2)] shadow-[var(--shadow-soft)]">
        {images.map((img, idx) => (
          <img
            key={idx}
            src={img}
            alt={idx === activeIdx ? "Imagen del producto" : ""}
            loading={idx === 0 ? "eager" : "lazy"}
            className={cn(
              "absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500",
              activeIdx === idx ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
          />
        ))}
      </div>
    </div>
  );
}
