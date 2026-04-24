"use client";

import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── WhatsApp floating button ────────────────────────────────────────────
// Renders an accessible, animated FAB that opens a wa.me deep-link in a
// new tab. Only rendered when the merchant has enabled it from the
// Comunicación admin. Fully driven by data — no hardcoded numbers.

interface WhatsAppButtonProps {
  number: string;
  buttonText: string;
  position: "bottom-right" | "bottom-left";
}

export function WhatsAppFloatingButton({
  number,
  buttonText,
  position,
}: WhatsAppButtonProps) {
  const cleanNumber = number.replace(/\D/g, "");
  const encodedText = encodeURIComponent(buttonText);
  const href = `https://wa.me/${cleanNumber}?text=${encodedText}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      className={cn(
        "fixed z-[90] flex items-center gap-2.5 rounded-full bg-[#25D366] px-5 py-3.5 text-white shadow-[0_4px_24px_rgba(37,211,102,0.35)] transition-all duration-300 hover:scale-105 hover:shadow-[0_6px_32px_rgba(37,211,102,0.45)] active:scale-95",
        position === "bottom-right"
          ? "bottom-5 right-5 sm:bottom-6 sm:right-6"
          : "bottom-5 left-5 sm:bottom-6 sm:left-6",
      )}
    >
      <MessageCircle className="h-6 w-6" fill="white" strokeWidth={0} />
      <span className="hidden text-[14px] font-semibold sm:inline">
        WhatsApp
      </span>
    </a>
  );
}
