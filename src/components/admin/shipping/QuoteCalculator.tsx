"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Loader2,
} from "lucide-react";

import { quoteShipmentAction } from "@/lib/shipping/operations";
import type {
  QuoteActionResult,
  QuoteRowResult,
} from "@/lib/shipping/operations-types";
import type { CarrierId, ShipmentDeliveryType } from "@/lib/shipping/types";

interface CarrierOption {
  id: CarrierId;
  name: string;
  connected: boolean;
}

interface Props {
  carriers: CarrierOption[];
  defaults: {
    weightG: number;
    heightCm: number;
    widthCm: number;
    lengthCm: number;
  };
  /** When false, the form shows a disabled CTA with a hint to connect a carrier. */
  hasAnyConnected: boolean;
  /** When false, the form shows a disabled CTA with a hint to set origin. */
  hasOrigin: boolean;
}

const ARS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function QuoteCalculator({
  carriers,
  defaults,
  hasAnyConnected,
  hasOrigin,
}: Props) {
  const [carrier, setCarrier] = useState<CarrierId | "all">("all");
  const [postalCode, setPostalCode] = useState("");
  const [deliveryType, setDeliveryType] = useState<ShipmentDeliveryType>("home");
  const [weightG, setWeightG] = useState<string>(String(defaults.weightG));
  const [heightCm, setHeightCm] = useState<string>(String(defaults.heightCm));
  const [widthCm, setWidthCm] = useState<string>(String(defaults.widthCm));
  const [lengthCm, setLengthCm] = useState<string>(String(defaults.lengthCm));
  const [declaredValue, setDeclaredValue] = useState<string>("");

  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<QuoteActionResult | null>(null);

  const disabled = !hasAnyConnected || !hasOrigin;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled) return;
    setResult(null);
    startTransition(async () => {
      const res = await quoteShipmentAction({
        carrier,
        destinationPostalCode: postalCode,
        weightG: numOrUndefined(weightG),
        heightCm: numOrUndefined(heightCm),
        widthCm: numOrUndefined(widthCm),
        lengthCm: numOrUndefined(lengthCm),
        declaredValue: numOrUndefined(declaredValue),
        deliveryType,
      });
      setResult(res);
    });
  }

  return (
    <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-ink-3" strokeWidth={1.75} />
            <h2 className="text-[14px] font-semibold text-ink-0">Cotizar envío</h2>
          </div>
          <p className="max-w-xl text-[12px] leading-[1.55] text-ink-5">
            Calcula tarifas reales contra los carriers conectados usando tu
            origen guardado y el paquete por defecto.
          </p>
        </div>
      </header>

      {!hasOrigin ? (
        <div className="mb-4 flex items-start gap-2 rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3 text-[12px] text-[color:var(--signal-warning)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          Cargá el código postal de origen en{" "}
          <a
            href="/admin/shipping/settings"
            className="underline underline-offset-2 hover:text-ink-0"
          >
            Ajustes de envío
          </a>{" "}
          para empezar a cotizar.
        </div>
      ) : null}

      {!hasAnyConnected ? (
        <div className="mb-4 flex items-start gap-2 rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3 text-[12px] text-ink-5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          Conectá al menos una cuenta de carrier (Correo Argentino o Andreani)
          para habilitar la cotización.
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Carrier">
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value as CarrierId | "all")}
              className={selectCls}
              disabled={disabled || pending}
            >
              <option value="all">Todos los conectados</option>
              {carriers.map((c) => (
                <option key={c.id} value={c.id} disabled={!c.connected}>
                  {c.name}
                  {!c.connected ? " (sin conectar)" : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Código postal destino" required>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="1425"
              className={inputCls}
              required
              disabled={disabled || pending}
            />
          </Field>
          <Field label="Tipo de entrega">
            <select
              value={deliveryType}
              onChange={(e) =>
                setDeliveryType(e.target.value as ShipmentDeliveryType)
              }
              className={selectCls}
              disabled={disabled || pending}
            >
              <option value="home">A domicilio</option>
              <option value="branch">A sucursal</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <Field label="Peso (g)">
            <input
              type="number"
              min={1}
              max={25000}
              value={weightG}
              onChange={(e) => setWeightG(e.target.value)}
              className={inputCls}
              disabled={disabled || pending}
            />
          </Field>
          <Field label="Alto (cm)">
            <input
              type="number"
              min={1}
              max={150}
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className={inputCls}
              disabled={disabled || pending}
            />
          </Field>
          <Field label="Ancho (cm)">
            <input
              type="number"
              min={1}
              max={150}
              value={widthCm}
              onChange={(e) => setWidthCm(e.target.value)}
              className={inputCls}
              disabled={disabled || pending}
            />
          </Field>
          <Field label="Largo (cm)">
            <input
              type="number"
              min={1}
              max={150}
              value={lengthCm}
              onChange={(e) => setLengthCm(e.target.value)}
              className={inputCls}
              disabled={disabled || pending}
            />
          </Field>
          <Field label="Valor declarado">
            <input
              type="number"
              min={0}
              value={declaredValue}
              onChange={(e) => setDeclaredValue(e.target.value)}
              placeholder="0"
              className={inputCls}
              disabled={disabled || pending}
            />
          </Field>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={disabled || pending}
            className="inline-flex h-10 items-center gap-2 rounded-[var(--r-lg)] bg-ink-0 px-5 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
            ) : (
              <Calculator className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
            Cotizar
          </button>
        </div>
      </form>

      {result ? <QuoteResults result={result} /> : null}
    </section>
  );
}

function QuoteResults({ result }: { result: QuoteActionResult }) {
  if (!result.ok) {
    return (
      <div className="mt-4 flex items-start gap-2 rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3 text-[12px] text-[color:var(--signal-danger)]">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
        {result.message ?? "No se pudo cotizar."}
      </div>
    );
  }
  if (result.rows.length === 0) {
    return (
      <div className="mt-4 rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3 text-[12px] text-ink-5">
        Sin resultados.
      </div>
    );
  }
  return (
    <div className="mt-4 space-y-3">
      {result.rows.map((row) => (
        <CarrierResultBlock key={row.carrierId} row={row} />
      ))}
    </div>
  );
}

function CarrierResultBlock({ row }: { row: QuoteRowResult }) {
  return (
    <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-semibold text-ink-0">{row.carrierName}</h3>
        {row.ok ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[color:var(--signal-success)]">
            <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
            {row.rates?.length ?? 0} tarifa
            {(row.rates?.length ?? 0) === 1 ? "" : "s"}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[color:var(--signal-danger)]">
            <AlertTriangle className="h-3 w-3" strokeWidth={2} />
            Error
          </span>
        )}
      </div>
      {row.ok && row.rates && row.rates.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {row.rates.map((r, i) => (
            <li
              key={`${r.serviceCode}-${i}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3 py-2"
            >
              <div>
                <p className="text-[12px] font-medium text-ink-0">{r.serviceName}</p>
                <p className="text-[11px] text-ink-5">
                  {r.deliveryType === "branch" ? "A sucursal" : "A domicilio"}
                  {r.estimatedDaysMin || r.estimatedDaysMax
                    ? ` · ${r.estimatedDaysMin ?? "?"}–${r.estimatedDaysMax ?? "?"} días hábiles`
                    : ""}
                </p>
              </div>
              <p className="text-[14px] font-semibold text-ink-0">
                {ARS.format(r.amount)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
      {!row.ok ? (
        <p className="mt-2 text-[12px] text-[color:var(--signal-danger)]">
          {row.message ?? "Error desconocido."}
        </p>
      ) : null}
    </div>
  );
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

function numOrUndefined(v: string): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

const inputCls =
  "block w-full rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 py-2 text-[13px] text-ink-0 placeholder:text-ink-6 focus:outline-none focus:shadow-[var(--shadow-focus)] focus:border-[color:var(--hairline-strong)] disabled:opacity-50";
const selectCls = inputCls;
