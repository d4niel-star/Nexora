import { CheckCircle2, CircleAlert, CircleDashed, ShieldAlert } from "lucide-react";
import type { CarrierConnectionStatus } from "@/lib/shipping/types";

const COPY: Record<
  CarrierConnectionStatus,
  { label: string; tone: "success" | "warning" | "danger" | "muted" }
> = {
  connected: { label: "Conectado", tone: "success" },
  disconnected: { label: "No conectado", tone: "muted" },
  error: { label: "Error de validación", tone: "danger" },
  needs_reconnection: { label: "Reconexión necesaria", tone: "warning" },
};

const TONE_CLASSES: Record<"success" | "warning" | "danger" | "muted", string> = {
  success:
    "text-[color:var(--signal-success)] border-[color:var(--hairline)] bg-[var(--surface-0)]",
  warning:
    "text-[color:var(--signal-warning)] border-[color:var(--hairline)] bg-[var(--surface-0)]",
  danger:
    "text-[color:var(--signal-danger)] border-[color:var(--hairline)] bg-[var(--surface-0)]",
  muted: "text-ink-5 border-[color:var(--hairline)] bg-[var(--surface-0)]",
};

export function CarrierStatusBadge({
  status,
  className,
}: {
  status: CarrierConnectionStatus;
  className?: string;
}) {
  const { label, tone } = COPY[status];
  const Icon =
    tone === "success"
      ? CheckCircle2
      : tone === "warning"
        ? ShieldAlert
        : tone === "danger"
          ? CircleAlert
          : CircleDashed;

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em]",
        TONE_CLASSES[tone],
        className ?? "",
      ].join(" ")}
    >
      <Icon className="h-3 w-3" strokeWidth={2} />
      {label}
    </span>
  );
}
