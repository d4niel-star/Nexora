"use client";

import { Star } from "lucide-react";

interface TestimonialsSectionProps {
  settings: Record<string, unknown>;
}

export function TestimonialsSection({ settings }: TestimonialsSectionProps) {
  const title = (settings.title as string) ?? "Testimonios";
  const testimonials = (settings.testimonials as Array<{
    name: string;
    text: string;
    rating: number;
    avatar?: string;
  }>) ?? [];

  if (testimonials.length === 0) return null;

  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-16">
          {title}
        </h2>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-gray-50/50 p-6 shadow-sm"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < t.rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-gray-200"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm font-medium leading-relaxed text-gray-600">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="mt-auto flex items-center gap-3 pt-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">
                  {t.name.charAt(0)}
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {t.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
