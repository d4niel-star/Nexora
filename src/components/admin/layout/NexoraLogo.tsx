import React from "react";

/**
 * Premium Minimalist Nexora Logo
 * Represents a flow / box / direction / commerce with a monogram N
 */
export function NexoraLogo({ className = "w-6 h-6", dark = false }: { className?: string; dark?: boolean }) {
  // We use currentColor for the inner N lines, and the container handles the overall color scheme
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      <rect width="24" height="24" rx="6" fill={dark ? "#111111" : "#111111"} />
      <path 
         d="M8 16V8L16 16V8" 
         stroke="currentColor" 
         strokeWidth="2.5" 
         strokeLinecap="round" 
         strokeLinejoin="round"
         className={dark ? "text-white" : "text-white"}
      />
      {/* Small accent dot representing the 'pulse' or 'operation' */}
      <circle cx="18" cy="6" r="2" fill="#10B981" />
    </svg>
  );
}
