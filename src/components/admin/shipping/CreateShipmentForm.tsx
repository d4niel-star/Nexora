"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  Package,
} from "lucide-react";

import { createShipmentAction } from "@/lib/shipping/operations";
import type { CreateShipmentActionResult } from "@/lib/shipping/operations-types";
import type { CarrierId, ShipmentDeliveryType } from "@/lib/shipping/types";

interface CarrierOption {
  id: CarrierId;
  name: string;
  connected: boolean;
  /** Whether the carrier exposes an API to download the label PDF. */
  supportsLabelPdf: boolean;
}

interface Props {
  carriers: CarrierOption[];
  defaults: {
    weightG: number;
    heightCm: number;
    widthCm: number;
    lengthCm: number;
  };
  hasOrigin: boolean;
  hasAnyConnected: boolean;
}

export function CreateShipmentForm({
  carriers,
  defaults,
  hasOrigin,
  hasAnyConnected,
}: Props) {
  const firstConnected = carriers.find((c) => c.connected);
  const [carrier, setCarrier] = useState<CarrierId>(
    (firstConnected?.id ?? carriers[0]?.id ?? "andreani") as CarrierId,
  );
  const [externalOrderId, setExternalOrderId] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [document, setDocumentValue] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [street, setStreet] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [floor, setFloor] = useState("");
  const [apartment, setApartment] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [provinceCode, setProvinceCode] = useState("");
  const [deliveryType, setDeliveryType] = useState<ShipmentDeliveryType>("home");
  const [branchCode, setBranchCode] = useState("");
  const [serviceCode, setServiceCode] = useState("");
  const [weightG, setWeightG] = useState(String(defaults.weightG));
  const [heightCm, setHeightCm] = useState(String(defaults.heightCm));
  const [widthCm, setWidthCm] = useState(String(defaults.widthCm));
  const [lengthCm, setLengthCm] = useState(String(defaults.lengthCm));
  const [declaredValue, setDeclaredValue] = useState("");

  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CreateShipmentActionResult | null>(null);

  const disabled = !hasAnyConnected || !hasOrigin;
  const selected = carriers.find((c) => c.id === carrier);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled) return;
    setResult(null);
    startTransition(async () => {
      const res = await createShipmentAction({
        carrier,
        externalOrderId,
        orderNumber: orderNumber || undefined,
        destination: {
          name,
          email,
          phone: phone || undefined,
          document: document || undefined,
          postalCode,
          street: street || undefined,
          streetNumber: streetNumber || undefined,
          floor: floor || undefined,
          apartment: apartment || undefined,
          city: city || undefined,
          province: province || undefined,
          provinceCode: provinceCode || undefined,
        },
        weightG: numOrUndefined(weightG),
        heightCm: numOrUndefined(heightCm),
        widthCm: numOrUndefined(widthCm),
        lengthCm: numOrUndefined(lengthCm),
        declaredValue: numOrUndefined(declaredValue),
        deliveryType,
        branchCode: branchCode || undefined,
        serviceCode: serviceCode || undefined,
      });
      setResult(res);
    });
  }

  return (
    <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-ink-3" strokeWidth={1.75} />
            <h2 className="text-[14px] font-semibold text-ink-0">
              Generar envío y etiqueta
            </h2>
          </div>
          <p className="max-w-xl text-[12px] leading-[1.55] text-ink-5">
            Crea el envío en el carrier, persiste el número de seguimiento y, si
            la API lo permite, descarga la etiqueta en PDF.
          </p>
        </div>
      </header>

      {!hasOrigin ? (
        <Banner
          tone="warning"
          message={
            <>
              Cargá el origen de envío en{" "}
              <a
                href="/admin/shipping/settings"
                className="underline underline-offset-2 hover:text-ink-0"
              >
                Ajustes de envío
              </a>{" "}
              antes de generar etiquetas.
            </>
          }
        />
      ) : null}
      {!hasAnyConnected ? (
        <Banner
          tone="info"
          message="Conectá una cuenta de carrier para empezar a generar envíos."
        />
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Carrier + order */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Carrier">
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value as CarrierId)}
              className={inputCls}
              disabled={disabled || pending}
            >
              {carriers.map((c) => (
                <option key={c.id} value={c.id} disabled={!c.connected}>
                  {c.name}
                  {!c.connected ? " (sin conectar)" : ""}
                  {c.supportsLabelPdf ? "" : " · sin PDF"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Identificador de la orden" required>
            <input
              type="text"
              value={externalOrderId}
              onChange={(e) => setExternalOrderId(e.target.value)}
              placeholder="ORD-1024"
              className={inputCls}
              required
              disabled={disabled || pending}
            />
          </Field>
          <Field label="Número de orden interno">
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="1024"
              className={inputCls}
              disabled={disabled || pending}
            />
          </Field>
        </div>

        {/* Destination */}
        <fieldset className="space-y-4 rounded-[var(--r-sm)] border border-[color:var(--hairline)] p-4">
          <legend className="px-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
            Destinatario
          </legend>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nombre completo" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                required
                disabled={disabled || pending}
              />
            </Field>
            <Field label="Email" required>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                required
                disabled={disabled || pending}
              />
            </Field>
            <Field label="Teléfono">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputCls}
                disabled={disabled || pending}
              />
            </Field>
            <Field label="DNI / CUIT">
              <input
                type="text"
                value={document}
                onChange={(e) => setDocumentValue(e.target.value)}
                className={inputCls}
                disabled={disabled || pending}
              />
            </Field>
            <Field label="Código postal" required>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className={inputCls}
                required
                disabled={disabled || pending}
              />
            </Field>
            <Field label="Ciudad / localidad">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputCls}
                disabled={disabled || pending}
              />
            </Field>
            <Field label="Provincia">
              <input
                type="text"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className={inputCls}
                disabled={disabled || pending}
              />
            </Field>
            <Field label="Código de provincia">
              <input
                type="text"
                value={provinceCode}
                onChange={(e) => setProvinceCode(e.target.value)}
                placeholder="C"
                maxLength={3}
                className={inputCls}
                disabled={disabled || pending}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Field label="Calle">
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className={inputCls}
                disabled={disabled || pending}
              />
            </Field>
            <Field label="Número">
              <input
                type="text"
                value={streetNumber}
                onChange={(e) => setStreetNumber(e.target.value)}
                className={inputCls}
                disabled={disabled || pending}
              />
            </Field>
            <Field label="Piso">
              <input
                type="text"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                className={inputCls}
                disabled={disabled || pending}
              />
            </Field>
            <Field label="Departamento">
              <input
                type="text"
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
                className={inputCls}
                disabled={disabled || pending}
              />
            </Field>
          </div>
        </fieldset>

        {/* Service + package */}
        <fieldset className="space-y-4 rounded-[var(--r-sm)] border border-[color:var(--hairline)] p-4">
          <legend className="px-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
            Servicio y paquete
          </legend>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Tipo de entrega">
              <select
                value={deliveryType}
                onChange={(e) =>
                  setDeliveryType(e.target.value as ShipmentDeliveryType)
                }
                className={inputCls}
                disabled={disabled || pending}
              >
                <option value="home">A domicilio</option>
                <option value="branch">A sucursal</option>
              </select>
            </Field>
            {deliveryType === "branch" ? (
              <Field label="Código de sucursal">
                <input
                  type="text"
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value)}
                  className={inputCls}
                  disabled={disabled || pending}
                />
              </Field>
            ) : null}
            <Field label="Service code (opcional)">
              <input
                type="text"
                value={serviceCode}
                onChange={(e) => setServiceCode(e.target.value)}
                placeholder="Tomado de la cotización"
                className={inputCls}
                disabled={disabled || pending}
              />
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
        </fieldset>

        {selected && !selected.supportsLabelPdf ? (
          <Banner
            tone="info"
            message={`${selected.name} no devuelve la etiqueta vía API. Una vez creado el envío vas a tener que imprimirla desde el portal del carrier.`}
          />
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={disabled || pending}
            className="inline-flex h-10 items-center gap-2 rounded-[var(--r-sm)] bg-ink-0 px-5 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
            ) : (
              <Package className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
            Crear envío
          </button>
        </div>
      </form>

      {result ? <ShipmentResultBlock result={result} /> : null}
    </section>
  );
}

function ShipmentResultBlock({ result }: { result: CreateShipmentActionResult }) {
  if (!result.ok || !result.shipment) {
    return (
      <div className="mt-5 flex items-start gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3 text-[12px] text-[color:var(--signal-danger)]">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
        {result.message}
      </div>
    );
  }
  const s = result.shipment;
  return (
    <div className="mt-5 space-y-3 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-4">
      <div className="flex items-start gap-2 text-[12px] text-[color:var(--signal-success)]">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
        <p>{result.message}</p>
      </div>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Tracking" value={s.trackingNumber ?? "—"} />
        <Stat label="ID externo" value={s.externalShipmentId ?? "—"} />
        <Stat label="Estado" value={s.status} />
      </dl>
      <div className="flex flex-wrap gap-2">
        {s.labelDownloadUrl ? (
          <a
            href={s.labelDownloadUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3 text-[12px] font-medium text-ink-3 transition-colors hover:bg-[var(--surface-2)]"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
            Descargar etiqueta PDF
          </a>
        ) : null}
        {s.trackingUrl ? (
          <a
            href={s.trackingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3 text-[12px] font-medium text-ink-3 transition-colors hover:bg-[var(--surface-2)]"
          >
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
            Ver tracking público
          </a>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
        {label}
      </dt>
      <dd className="mt-1 truncate text-[13px] font-medium text-ink-0">{value}</dd>
    </div>
  );
}

function Banner({
  tone,
  message,
}: {
  tone: "info" | "warning";
  message: React.ReactNode;
}) {
  return (
    <div
      className={[
        "mb-4 flex items-start gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3 text-[12px]",
        tone === "warning"
          ? "text-[color:var(--signal-warning)]"
          : "text-ink-5",
      ].join(" ")}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
      <span>{message}</span>
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
  "block w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 py-2 text-[13px] text-ink-0 placeholder:text-ink-6 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-400)] disabled:opacity-50";
