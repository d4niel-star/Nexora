"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function ProductGallery({ images }: { images: string[] }) {
  const [activeIdx, setActiveIdx] = useState(0);

  if (!images || images.length === 0) return (
    <div className="aspect-[4/5] w-full bg-gray-100 flex items-center justify-center rounded-sm">
      <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">Sin imagen</span>
    </div>
  );

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-4">
      {images.length > 1 && (
        <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto pb-2 lg:pb-0 lg:w-20 shrink-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden w-full">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIdx(idx)}
              type="button"
              className={cn(
                "relative aspect-[4/5] w-16 lg:w-full shrink-0 overflow-hidden rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black",
                activeIdx === idx ? "ring-2 ring-black" : "opacity-70 hover:opacity-100"
              )}
              aria-label={`Ver imagen ${idx + 1}`}
            >
              <img src={img} alt="" className="h-full w-full object-cover object-center" />
            </button>
          ))}
        </div>
      )}
      <div className="aspect-[4/5] w-full bg-gray-50 rounded-sm overflow-hidden flex-1">
        <img 
          src={images[activeIdx]} 
          alt="Product feature" 
          className="h-full w-full object-cover object-center"
        />
      </div>
    </div>
  );
}
