"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MapPin,
  Search,
} from "lucide-react";

import { getTrackingAction } from "@/lib/shipping/operations";
import type { TrackingActionResult } from "@/lib/shipping/operations-types";
import type { CarrierId } from "@/lib/shipping/types";

interface CarrierOption {
  id: CarrierId;
  name: string;
  /**
   * Whether the carrier exposes tracking without merchant credentials.
   * Used in the UI to flag that the merchant doesn't even need to be
   * connected to use this widget.
   */
  publicTracking: boolean;
  /** Whether the merchant has a connection persisted. */
  connected: boolean;
}

interface Props {
  carriers: CarrierOption[];
}

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function TrackingLookup({ carriers }: Props) {
  const initial = carriers[0]?.id ?? ("andreani" as CarrierId);
  const [carrier, setCarrier] = useState<CarrierId>(initial);
  const [number, setNumber] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<TrackingActionResult | null>(null);

  const selected = carriers.find((c) => c.id === carrier);
  const canUse = !!selected && (selected.publicTracking || selected.connected);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!number.trim()) return;
    setResult(null);
    startTransition(async () => {
      const res = await getTrackingAction({ carrier, trackingNumber: number });
      setResult(res);
    });
  }

  return (
    <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
      <header className="mb-5 space-y-1">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-ink-3" strokeWidth={1.75} />
          <h2 className="text-[14px] font-semibold text-ink-0">
            Consultar tracking
          </h2>
        </div>
        <p className="max-w-xl text-[12px] leading-[1.55] text-ink-5">
          Trae los eventos del envío directamente desde la API del carrier.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Carrier">
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value as CarrierId)}
              className={inputCls}
              disabled={pending}
            >
              {carriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.publicTracking
                    ? " · sin credenciales"
                    : c.connected
                      ? " · cuenta conectada"
                      : " · requiere conexión"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Número de envío" required>
            <input
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder={
                carrier === "andreani"
                  ? "9134669991"
                  : "000500076393019A3G0C701"
              }
              className={inputCls}
              required
              disabled={pending}
            />
          </Field>
        </div>
        {!canUse ? (
          <div className="flex items-start gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3 text-[12px] text-ink-5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
            Conectá la cuenta del carrier para consultar tracking autenticado.
          </div>
        ) : null}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending || !canUse}
            className="inline-flex h-10 items-center gap-2 rounded-[var(--r-sm)] bg-ink-0 px-5 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
            ) : (
              <Search className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
            Consultar
          </button>
        </div>
      </form>

      {result ? <TrackingResultBlock result={result} /> : null}
    </section>
  );
}

function TrackingResultBlock({ result }: { result: TrackingActionResult }) {
  if (!result.ok || !result.result) {
    return (
      <div className="mt-4 flex items-start gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3 text-[12px] text-[color:var(--signal-danger)]">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
        {result.message ?? "No se pudo consultar el tracking."}
      </div>
    );
  }
  const r = result.result;
  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-ink-5">
          Estado actual
        </p>
        <p className="mt-1 text-[15px] font-semibold text-ink-0">{r.status}</p>
        <p className="mt-1 text-[12px] text-ink-5">
          Envío <span className="text-ink-3">{r.trackingNumber}</span>
          {r.lastUpdate
            ? ` · actualizado ${formatDate(r.lastUpdate)}`
            : ""}
        </p>
      </div>
      {r.events.length > 0 ? (
        <ol className="relative space-y-3 border-l border-[color:var(--hairline)] pl-4">
          {r.events.map((e, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[21px] top-1.5 inline-flex h-3 w-3 items-center justify-center rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-0)]">
                {i === 0 ? (
                  <CheckCircle2 className="h-2.5 w-2.5 text-[color:var(--signal-success)]" strokeWidth={2.25} />
                ) : null}
              </span>
              <p className="text-[12px] font-medium text-ink-0">
                {e.description ?? e.status}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-5">
                {formatDate(e.occurredAt)}
                {e.location ? (
                  <>
                    {" · "}
                    <MapPin className="-mt-0.5 mr-0.5 inline h-3 w-3" strokeWidth={1.75} />
                    {e.location}
                  </>
                ) : null}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-[12px] text-ink-5">
          El carrier no devolvió eventos para este envío.
        </p>
      )}
    </div>
  );
}

function formatDate(raw: string): string {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return dateFmt.format(d);
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-medium text-ink-3">
        {label}
        {required ? (
          <span className="ml-0.5 text-[color:var(--signal-danger)]">*</span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "block w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 py-2 text-[13px] text-ink-0 placeholder:text-ink-6 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-400)] disabled:opacity-50";
