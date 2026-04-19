"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

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
      {images.length > 1 && (
        <div className="flex w-full shrink-0 gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:w-[4.5rem] lg:flex-col lg:overflow-y-auto lg:pb-0">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIdx(idx)}
              type="button"
              className={cn(
                "relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-[var(--r-md)] border bg-[var(--surface-2)] transition-[opacity,box-shadow] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] lg:w-full",
                activeIdx === idx
                  ? "border-[color:var(--accent-500)] opacity-100 shadow-[var(--shadow-soft)] ring-1 ring-[color:var(--accent-500)]/40"
                  : "border-[color:var(--hairline)] opacity-65 hover:opacity-100",
              )}
              aria-label={`Ver imagen ${idx + 1}`}
            >
              <img src={img} alt="" className="h-full w-full object-cover object-center" />
            </button>
          ))}
        </div>
      )}
      <div className="aspect-[4/5] w-full flex-1 overflow-hidden rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-2)] shadow-[var(--shadow-soft)]">
        <img
          src={images[activeIdx]}
          alt="Imagen del producto"
          className="h-full w-full object-cover object-center"
        />
      </div>
    </div>
  );
}
