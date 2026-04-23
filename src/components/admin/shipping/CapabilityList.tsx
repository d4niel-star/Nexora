import { Check, Minus } from "lucide-react";

import type { CarrierCapabilities } from "@/lib/shipping/types";

interface Props {
  capabilities: CarrierCapabilities;
  notes?: string[];
}

const ROWS: { key: keyof CarrierCapabilities; label: string; help: string }[] = [
  { key: "validateCredentials", label: "Validar credenciales", help: "Login real contra el carrier." },
  { key: "quoteShipment", label: "Cotizar envíos", help: "Calcular tarifa por código postal y peso." },
  { key: "createShipment", label: "Generar envío", help: "Dar de alta el envío en el carrier." },
  { key: "labelPdf", label: "Descargar etiqueta PDF", help: "El carrier expone la etiqueta vía API." },
  { key: "getTracking", label: "Consultar tracking", help: "Eventos de seguimiento del envío." },
];

export function CapabilityList({ capabilities, notes }: Props) {
  return (
    <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
      <h2 className="text-[14px] font-semibold text-ink-0">Capacidades reales</h2>
      <p className="mt-1 text-[12px] leading-[1.55] text-ink-5">
        Solo se listan operaciones soportadas por la API oficial del carrier.
      </p>
      <ul className="mt-4 space-y-2">
        {ROWS.map((row) => {
          const supported = capabilities[row.key];
          return (
            <li
              key={row.key}
              className="flex items-start gap-3 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3"
            >
              <span
                className={[
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                  supported
                    ? "bg-[color:var(--signal-success)]/15 text-[color:var(--signal-success)]"
                    : "bg-[var(--surface-2)] text-ink-5",
                ].join(" ")}
                aria-hidden
              >
                {supported ? (
                  <Check className="h-3 w-3" strokeWidth={2.25} />
                ) : (
                  <Minus className="h-3 w-3" strokeWidth={2.25} />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink-0">{row.label}</p>
                <p className="mt-0.5 text-[11px] leading-[1.55] text-ink-5">
                  {supported ? row.help : `${row.help} — no disponible.`}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      {notes && notes.length > 0 ? (
        <div className="mt-4 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
            Notas operativas
          </p>
          <ul className="mt-2 space-y-1">
            {notes.map((n, i) => (
              <li key={i} className="text-[12px] leading-[1.55] text-ink-3">
                · {n}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
