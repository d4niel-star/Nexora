"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Loader2, Plug, RefreshCw, X } from "lucide-react";

import { cn } from "@/lib/utils";

import type { PaymentProviderStatus } from "@/lib/payments/types";

// ─── Status pill ───────────────────────────────────────────────────────
// Visualises any payment-provider status with a coherent color, icon and
// label. Status changes animate (slide + fade) so transitions feel alive
// without being noisy. The color tokens map to the same CSS vars the
// rest of the admin uses (signal-success / warning / danger / muted).

const STATUS_LABELS: Record<PaymentProviderStatus, string> = {
  disconnected: "Sin conectar",
  connecting: "Conectando…",
  connected: "Conectado",
  validating: "Validando…",
  needs_reconnection: "Reconexión requerida",
  error: "Error",
  disconnecting: "Desconectando…",
};

interface StatusVisual {
  tone: "success" | "warning" | "danger" | "info" | "muted";
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  spin?: boolean;
}

const STATUS_VISUALS: Record<PaymentProviderStatus, StatusVisual> = {
  disconnected: { tone: "muted", Icon: Plug },
  connecting: { tone: "info", Icon: Loader2, spin: true },
  connected: { tone: "success", Icon: Check },
  validating: { tone: "info", Icon: Loader2, spin: true },
  needs_reconnection: { tone: "warning", Icon: RefreshCw },
  error: { tone: "danger", Icon: AlertTriangle },
  disconnecting: { tone: "muted", Icon: X },
};

const TONE_CLASSES: Record<StatusVisual["tone"], string> = {
  success:
    "bg-[color:color-mix(in_srgb,var(--signal-success)_14%,transparent)] text-[color:var(--signal-success)] ring-1 ring-inset ring-[color:color-mix(in_srgb,var(--signal-success)_28%,transparent)]",
  warning:
    "bg-[color:color-mix(in_srgb,var(--signal-warning)_16%,transparent)] text-[color:var(--signal-warning)] ring-1 ring-inset ring-[color:color-mix(in_srgb,var(--signal-warning)_30%,transparent)]",
  danger:
    "bg-[color:color-mix(in_srgb,var(--signal-danger)_14%,transparent)] text-[color:var(--signal-danger)] ring-1 ring-inset ring-[color:color-mix(in_srgb,var(--signal-danger)_30%,transparent)]",
  info: "bg-[color:color-mix(in_srgb,var(--accent-500)_14%,transparent)] text-[color:var(--accent-500)] ring-1 ring-inset ring-[color:color-mix(in_srgb,var(--accent-500)_30%,transparent)]",
  muted:
    "bg-[var(--surface-2)] text-ink-5 ring-1 ring-inset ring-[color:var(--hairline)]",
};

interface StatusPillProps {
  status: PaymentProviderStatus;
  size?: "sm" | "md";
  className?: string;
  /** Custom label override; defaults to the canonical Spanish copy. */
  label?: string;
}

export function StatusPill({ status, size = "md", className, label }: StatusPillProps) {
  const visual = STATUS_VISUALS[status];
  const Icon = visual.Icon;
  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.span
        key={status}
        initial={{ opacity: 0, y: -4, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 4, scale: 0.96 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full font-medium tracking-[-0.005em]",
          size === "sm"
            ? "h-6 px-2.5 text-[10.5px] uppercase tracking-[0.08em]"
            : "h-7 px-3 text-[11.5px]",
          TONE_CLASSES[visual.tone],
          className,
        )}
      >
        <Icon className={cn("h-3 w-3", visual.spin && "animate-spin")} strokeWidth={2.4} />
        {label ?? STATUS_LABELS[status]}
      </motion.span>
    </AnimatePresence>
  );
}
