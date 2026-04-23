"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Save,
} from "lucide-react";

import { patchCarrierConfigAction } from "@/lib/shipping/actions";
import type { CarrierId } from "@/lib/shipping/types";

interface Props {
  carrierId: CarrierId;
  /** Currently stored contract number (empty if none). */
  contractNumber: string;
}

export function CarrierExtrasForm({ carrierId, contractNumber }: Props) {
  const [value, setValue] = useState(contractNumber);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      try {
        const res = await patchCarrierConfigAction(carrierId, {
          contractNumber: value.trim() || null,
        });
        setFeedback({ tone: res.ok ? "success" : "error", message: res.message });
      } catch (err) {
        setFeedback({
          tone: "error",
          message:
            err instanceof Error
              ? `Error inesperado: ${err.message}`
              : "Error inesperado.",
        });
      }
    });
  }

  return (
    <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
      <header className="mb-4 flex items-center gap-2">
        <FileText className="h-4 w-4 text-ink-3" strokeWidth={1.75} />
        <h2 className="text-[14px] font-semibold text-ink-0">
          Datos de contrato
        </h2>
      </header>
      <p className="mb-5 max-w-xl text-[12px] leading-[1.55] text-ink-5">
        El número de contrato es lo que vincula tu cuenta a las tarifas
        negociadas con el carrier. Sin él no se puede cotizar ni generar
        etiquetas.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-[12px] font-medium text-ink-3">
            Número de contrato
          </span>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="400006611"
            className="block w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 py-2 text-[13px] text-ink-0 placeholder:text-ink-6 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-400)]"
            disabled={pending}
          />
          <span className="block text-[11px] leading-[1.5] text-ink-5">
            Lo encontrás en el portal del carrier o en el contrato comercial.
          </span>
        </label>

        {feedback ? (
          <div
            className={[
              "flex items-start gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3 text-[12px] leading-[1.55]",
              feedback.tone === "success"
                ? "text-[color:var(--signal-success)]"
                : "text-[color:var(--signal-danger)]",
            ].join(" ")}
          >
            {feedback.tone === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
            )}
            <p>{feedback.message}</p>
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-9 items-center gap-2 rounded-[var(--r-sm)] bg-ink-0 px-4 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
            ) : (
              <Save className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
            Guardar contrato
          </button>
        </div>
      </form>
    </section>
  );
}
