"use client";

import { useState, useTransition } from "react";
import { Save, Check } from "lucide-react";

import { AdminPanel } from "@/components/admin/primitives/AdminPanel";
import { saveLocationProfile } from "@/lib/local-store/actions";
import type { LocationProfile, LocationDayHours } from "@/lib/local-store/types";

interface Props {
  profile: LocationProfile;
}

const WEEKDAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export function LocalProfileTab({ profile }: Props) {
  const [name, setName] = useState(profile.name);
  const [addressLine, setAddressLine] = useState(profile.addressLine ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const [province, setProvince] = useState(profile.province ?? "");
  const [postalCode, setPostalCode] = useState(profile.postalCode ?? "");
  const [country, setCountry] = useState(profile.country ?? "AR");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [googleMapsUrl, setGoogleMapsUrl] = useState(profile.googleMapsUrl ?? "");

  const [hours, setHours] = useState<LocationDayHours[]>(profile.hours);

  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  function patchHours(weekday: number, patch: Partial<LocationDayHours>) {
    setHours((prev) =>
      prev.map((h) => (h.weekday === weekday ? { ...h, ...patch } : h)),
    );
  }

  function handleSave() {
    setFeedback(null);
    startTransition(async () => {
      const res = await saveLocationProfile({
        name,
        addressLine: addressLine || null,
        city: city || null,
        province: province || null,
        postalCode: postalCode || null,
        country: country || null,
        phone: phone || null,
        email: email || null,
        googleMapsUrl: googleMapsUrl || null,
        hours,
      });
      if (res.success) {
        setFeedback({ kind: "ok", msg: "Perfil guardado correctamente" });
      } else {
        setFeedback({ kind: "err", msg: res.error });
      }
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* ── Datos del local ──────────────────────────────────────── */}
      <div className="lg:col-span-2">
        <AdminPanel
          title="Datos del local"
          description="Lo que ven tus clientes en la tienda y en confirmaciones de retiro."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Nombre visible" required>
              <input
                className="nx-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sucursal Centro"
              />
            </Field>
            <Field label="Teléfono">
              <input
                className="nx-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+54 11 0000 0000"
              />
            </Field>
            <Field label="Email de contacto">
              <input
                type="email"
                className="nx-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="local@tutienda.com"
              />
            </Field>
            <Field label="Link de Google Maps">
              <input
                className="nx-input"
                value={googleMapsUrl}
                onChange={(e) => setGoogleMapsUrl(e.target.value)}
                placeholder="https://maps.app.goo.gl/…"
              />
            </Field>
            <Field label="Dirección" full>
              <input
                className="nx-input"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="Av. Corrientes 1234"
              />
            </Field>
            <Field label="Ciudad">
              <input
                className="nx-input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </Field>
            <Field label="Provincia">
              <input
                className="nx-input"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
              />
            </Field>
            <Field label="Código postal">
              <input
                className="nx-input"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
              />
            </Field>
            <Field label="País">
              <input
                className="nx-input"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </Field>
          </div>
        </AdminPanel>
      </div>

      {/* ── Horarios ─────────────────────────────────────────────── */}
      <div className="lg:col-span-1">
        <AdminPanel
          title="Horarios de atención"
          description="Definí qué días y horas abre el local. Se usa para marcar abierto/cerrado en el header."
        >
          <div className="flex flex-col gap-1.5">
            {hours.map((h) => (
              <DayRow key={h.weekday} hour={h} onChange={(patch) => patchHours(h.weekday, patch)} />
            ))}
          </div>
        </AdminPanel>
      </div>

      {/* ── Save bar ─────────────────────────────────────────────── */}
      <div className="lg:col-span-3 flex items-center justify-end gap-3">
        {feedback ? (
          <span
            style={{
              fontSize: 12.5,
              color: feedback.kind === "ok" ? "#1d6f3f" : "#a3262e",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {feedback.kind === "ok" ? <Check size={14} /> : null}
            {feedback.msg}
          </span>
        ) : null}
        <button
          className="nx-action nx-action--primary"
          onClick={handleSave}
          disabled={isPending}
        >
          <Save size={14} strokeWidth={2} />
          {isPending ? "Guardando…" : "Guardar perfil"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  required,
  full,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  full?: boolean;
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        gridColumn: full ? "1 / -1" : undefined,
      }}
    >
      <span style={{ fontSize: 11.5, color: "var(--ink-5)", fontWeight: 500 }}>
        {label}
        {required ? <span style={{ color: "#a3262e" }}> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function DayRow({
  hour,
  onChange,
}: {
  hour: LocationDayHours;
  onChange: (patch: Partial<LocationDayHours>) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "92px 24px 1fr 1fr",
        alignItems: "center",
        gap: 8,
        padding: "6px 0",
        borderBottom: "1px solid var(--studio-line)",
      }}
    >
      <span style={{ fontSize: 12.5, color: "var(--ink-1)" }}>{WEEKDAY_LABELS[hour.weekday]}</span>
      <input
        type="checkbox"
        checked={hour.isOpen}
        onChange={(e) => onChange({ isOpen: e.target.checked })}
        aria-label={`${WEEKDAY_LABELS[hour.weekday]} abre`}
      />
      <input
        type="time"
        className="nx-input"
        value={hour.openTime ?? ""}
        disabled={!hour.isOpen}
        onChange={(e) => onChange({ openTime: e.target.value })}
        style={{ height: 30, padding: "0 8px", fontSize: 12.5 }}
      />
      <input
        type="time"
        className="nx-input"
        value={hour.closeTime ?? ""}
        disabled={!hour.isOpen}
        onChange={(e) => onChange({ closeTime: e.target.value })}
        style={{ height: 30, padding: "0 8px", fontSize: 12.5 }}
      />
    </div>
  );
}
