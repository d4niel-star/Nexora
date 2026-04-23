"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Package,
  Save,
} from "lucide-react";

import { upsertShippingSettingsAction } from "@/lib/shipping/operations";
import type { StoreShippingSettingsView } from "@/lib/shipping/store-settings";
import type { CarrierId } from "@/lib/shipping/types";

interface CarrierOption {
  id: CarrierId;
  name: string;
  connected: boolean;
}

interface Props {
  initial: StoreShippingSettingsView;
  carriers: CarrierOption[];
}

const PROVINCES: { code: string; name: string }[] = [
  { code: "C", name: "CABA" },
  { code: "B", name: "Buenos Aires" },
  { code: "X", name: "Córdoba" },
  { code: "S", name: "Santa Fe" },
  { code: "M", name: "Mendoza" },
  { code: "T", name: "Tucumán" },
  { code: "A", name: "Salta" },
  { code: "E", name: "Entre Ríos" },
  { code: "Y", name: "Jujuy" },
  { code: "K", name: "Catamarca" },
  { code: "F", name: "La Rioja" },
  { code: "G", name: "Santiago del Estero" },
  { code: "H", name: "Chaco" },
  { code: "P", name: "Formosa" },
  { code: "N", name: "Misiones" },
  { code: "W", name: "Corrientes" },
  { code: "L", name: "La Pampa" },
  { code: "D", name: "San Luis" },
  { code: "J", name: "San Juan" },
  { code: "Q", name: "Neuquén" },
  { code: "R", name: "Río Negro" },
  { code: "U", name: "Chubut" },
  { code: "Z", name: "Santa Cruz" },
  { code: "V", name: "Tierra del Fuego" },
];

export function ShippingSettingsForm({ initial, carriers }: Props) {
  const [defaultCarrier, setDefaultCarrier] = useState<CarrierId | "">(
    initial.defaultCarrier ?? "",
  );
  const [originPostalCode, setOriginPostalCode] = useState(
    initial.originPostalCode ?? "",
  );
  const [originStreet, setOriginStreet] = useState(initial.originStreet ?? "");
  const [originStreetNumber, setOriginStreetNumber] = useState(
    initial.originStreetNumber ?? "",
  );
  const [originFloor, setOriginFloor] = useState(initial.originFloor ?? "");
  const [originApartment, setOriginApartment] = useState(
    initial.originApartment ?? "",
  );
  const [originCity, setOriginCity] = useState(initial.originCity ?? "");
  const [originProvinceCode, setOriginProvinceCode] = useState(
    initial.originProvinceCode ?? "",
  );
  const [contactName, setContactName] = useState(initial.originContactName ?? "");
  const [contactPhone, setContactPhone] = useState(initial.originContactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(initial.originContactEmail ?? "");
  const [handlingDaysMin, setHandlingDaysMin] = useState(
    String(initial.handlingDaysMin),
  );
  const [handlingDaysMax, setHandlingDaysMax] = useState(
    String(initial.handlingDaysMax),
  );
  const [weightG, setWeightG] = useState(String(initial.defaultPackageWeightG));
  const [heightCm, setHeightCm] = useState(String(initial.defaultPackageHeightCm));
  const [widthCm, setWidthCm] = useState(String(initial.defaultPackageWidthCm));
  const [lengthCm, setLengthCm] = useState(String(initial.defaultPackageLengthCm));
  const [declaredValue, setDeclaredValue] = useState(
    initial.defaultDeclaredValue !== null
      ? String(initial.defaultDeclaredValue)
      : "",
  );
  const [freeShippingOver, setFreeShippingOver] = useState(
    initial.freeShippingOver !== null ? String(initial.freeShippingOver) : "",
  );

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
        const res = await upsertShippingSettingsAction({
          defaultCarrier: (defaultCarrier || null) as CarrierId | null,
          originPostalCode,
          originStreet,
          originStreetNumber,
          originFloor,
          originApartment,
          originCity,
          originProvinceCode,
          originContactName: contactName,
          originContactPhone: contactPhone,
          originContactEmail: contactEmail,
          handlingDaysMin: numOr(handlingDaysMin, 1),
          handlingDaysMax: numOr(handlingDaysMax, 2),
          defaultPackageWeightG: numOr(weightG, 1000),
          defaultPackageHeightCm: numOr(heightCm, 15),
          defaultPackageWidthCm: numOr(widthCm, 20),
          defaultPackageLengthCm: numOr(lengthCm, 25),
          defaultDeclaredValue: nullableNum(declaredValue),
          freeShippingOver: nullableNum(freeShippingOver),
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Defaults ──────────────────────────────────────────────────── */}
      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <h2 className="text-[14px] font-semibold text-ink-0">Reglas operativas</h2>
        <p className="mt-1 text-[12px] leading-[1.55] text-ink-5">
          Settings comunes a toda la operación logística de tu tienda.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Carrier por defecto">
            <select
              value={defaultCarrier}
              onChange={(e) => setDefaultCarrier(e.target.value as CarrierId | "")}
              className={inputCls}
              disabled={pending}
            >
              <option value="">Sin preferencia</option>
              {carriers.map((c) => (
                <option key={c.id} value={c.id} disabled={!c.connected}>
                  {c.name}
                  {!c.connected ? " (sin conectar)" : ""}
                </option>
              ))}
            </select>
            <Hint>
              Se usa cuando hay que elegir uno solo (por ejemplo, generar un
              envío sin selector).
            </Hint>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Días de preparación · mínimo">
              <input
                type="number"
                min={0}
                max={60}
                value={handlingDaysMin}
                onChange={(e) => setHandlingDaysMin(e.target.value)}
                className={inputCls}
                disabled={pending}
              />
            </Field>
            <Field label="Días de preparación · máximo">
              <input
                type="number"
                min={0}
                max={60}
                value={handlingDaysMax}
                onChange={(e) => setHandlingDaysMax(e.target.value)}
                className={inputCls}
                disabled={pending}
              />
            </Field>
          </div>
          <Field label="Envío gratis a partir de (ARS)">
            <input
              type="number"
              min={0}
              value={freeShippingOver}
              onChange={(e) => setFreeShippingOver(e.target.value)}
              placeholder="Sin umbral"
              className={inputCls}
              disabled={pending}
            />
            <Hint>Dejá vacío para no ofrecer envío gratis automático.</Hint>
          </Field>
          <Field label="Valor declarado por defecto (ARS)">
            <input
              type="number"
              min={0}
              value={declaredValue}
              onChange={(e) => setDeclaredValue(e.target.value)}
              placeholder="0"
              className={inputCls}
              disabled={pending}
            />
            <Hint>Se usa para el seguro del envío.</Hint>
          </Field>
        </div>
      </section>

      {/* ── Origen ────────────────────────────────────────────────────── */}
      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <h2 className="text-[14px] font-semibold text-ink-0">Origen del envío</h2>
        <p className="mt-1 text-[12px] leading-[1.55] text-ink-5">
          Los carriers necesitan tu código postal y dirección de origen para
          cotizar y generar etiquetas.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Código postal" required>
            <input
              type="text"
              value={originPostalCode}
              onChange={(e) => setOriginPostalCode(e.target.value)}
              placeholder="1425"
              className={inputCls}
              required
              disabled={pending}
            />
          </Field>
          <Field label="Provincia">
            <select
              value={originProvinceCode}
              onChange={(e) => setOriginProvinceCode(e.target.value)}
              className={inputCls}
              disabled={pending}
            >
              <option value="">Seleccioná provincia</option>
              {PROVINCES.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ciudad">
            <input
              type="text"
              value={originCity}
              onChange={(e) => setOriginCity(e.target.value)}
              className={inputCls}
              disabled={pending}
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Calle">
              <input
                type="text"
                value={originStreet}
                onChange={(e) => setOriginStreet(e.target.value)}
                className={inputCls}
                disabled={pending}
              />
            </Field>
            <Field label="Nº">
              <input
                type="text"
                value={originStreetNumber}
                onChange={(e) => setOriginStreetNumber(e.target.value)}
                className={inputCls}
                disabled={pending}
              />
            </Field>
            <Field label="Piso/Dpto">
              <input
                type="text"
                value={originFloor}
                onChange={(e) => setOriginFloor(e.target.value)}
                placeholder="1B"
                className={inputCls}
                disabled={pending}
              />
            </Field>
          </div>
          <Field label="Departamento">
            <input
              type="text"
              value={originApartment}
              onChange={(e) => setOriginApartment(e.target.value)}
              className={inputCls}
              disabled={pending}
            />
          </Field>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          <Field label="Contacto · nombre">
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className={inputCls}
              disabled={pending}
            />
          </Field>
          <Field label="Contacto · teléfono">
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className={inputCls}
              disabled={pending}
            />
          </Field>
          <Field label="Contacto · email">
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className={inputCls}
              disabled={pending}
            />
          </Field>
        </div>
      </section>

      {/* ── Default package ───────────────────────────────────────────── */}
      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <header className="flex items-center gap-2">
          <Package className="h-4 w-4 text-ink-3" strokeWidth={1.75} />
          <h2 className="text-[14px] font-semibold text-ink-0">
            Paquete por defecto
          </h2>
        </header>
        <p className="mt-1 text-[12px] leading-[1.55] text-ink-5">
          Se usa cuando no especificás dimensiones del envío al cotizar o
          generar la etiqueta.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Field label="Peso (g)">
            <input
              type="number"
              min={1}
              max={25000}
              value={weightG}
              onChange={(e) => setWeightG(e.target.value)}
              className={inputCls}
              disabled={pending}
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
              disabled={pending}
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
              disabled={pending}
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
              disabled={pending}
            />
          </Field>
        </div>
      </section>

      {feedback ? (
        <div
          role="status"
          className={[
            "flex items-start gap-2 rounded-[var(--r-sm)] border px-4 py-3 text-[12px] leading-[1.55]",
            feedback.tone === "success"
              ? "border-[color:var(--hairline)] bg-[var(--surface-1)] text-[color:var(--signal-success)]"
              : "border-[color:var(--hairline)] bg-[var(--surface-1)] text-[color:var(--signal-danger)]",
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
          className="inline-flex h-10 items-center gap-2 rounded-[var(--r-sm)] bg-ink-0 px-5 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
          ) : (
            <Save className="h-3.5 w-3.5" strokeWidth={1.75} />
          )}
          Guardar ajustes
        </button>
      </div>
    </form>
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
      <span className="text-[12px] font-medium text-ink-3">
        {label}
        {required ? (
          <span className="ml-0.5 text-[color:var(--signal-danger)]">*</span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[11px] leading-[1.5] text-ink-5">{children}</span>
  );
}

function numOr(s: string, fallback: number): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

function nullableNum(s: string): number | null {
  if (!s || s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const inputCls =
  "block w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 py-2 text-[13px] text-ink-0 placeholder:text-ink-6 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-400)] disabled:opacity-50";
