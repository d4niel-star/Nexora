"use client";

import { useState, useTransition } from "react";
import { Save, Check, Package } from "lucide-react";

import { AdminPanel } from "@/components/admin/primitives/AdminPanel";
import { savePickupSettings } from "@/lib/local-store/actions";
import type { LocationProfile } from "@/lib/local-store/types";

interface PickupOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
}

interface Props {
  profile: LocationProfile;
  pickupOrders: PickupOrder[];
}

const formatARS = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);

export function LocalPickupTab({ profile, pickupOrders }: Props) {
  const [enabled, setEnabled] = useState(profile.pickupEnabled);
  const [instructions, setInstructions] = useState(profile.pickupInstructions ?? "");
  const [prepMinutes, setPrepMinutes] = useState<string>(
    profile.pickupPreparationMinutes?.toString() ?? "",
  );
  const [pickupWindow, setPickupWindow] = useState(profile.pickupWindow ?? "");

  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  function handleSave() {
    setFeedback(null);
    startTransition(async () => {
      const minutes = prepMinutes.trim() === "" ? null : Number(prepMinutes);
      if (minutes !== null && (!Number.isFinite(minutes) || minutes < 0)) {
        setFeedback({ kind: "err", msg: "Tiempo de preparación inválido" });
        return;
      }
      const res = await savePickupSettings({
        pickupEnabled: enabled,
        pickupInstructions: instructions || null,
        pickupPreparationMinutes: minutes,
        pickupWindow: pickupWindow || null,
      });
      if (res.success) {
        setFeedback({ kind: "ok", msg: "Configuración guardada" });
      } else {
        setFeedback({ kind: "err", msg: res.error });
      }
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* ── Config ────────────────────────────────────────────────── */}
      <div className="lg:col-span-2">
        <AdminPanel
          title="Retiro en tienda"
          description="Activá el retiro presencial y configurá lo que verán los clientes en el checkout."
        >
          {/* ── Toggle activar ───────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "10px 12px",
              border: "1px solid var(--studio-line)",
              borderRadius: 8,
              marginBottom: 16,
              background: "var(--studio-paper-soft)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-0)" }}>
                {enabled ? "Retiro en tienda activado" : "Retiro en tienda desactivado"}
              </span>
              <span style={{ fontSize: 12, color: "var(--ink-5)" }}>
                {enabled
                  ? "Los clientes verán esta opción al hacer checkout."
                  : "El retiro no aparecerá como opción al hacer checkout."}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setEnabled((v) => !v)}
              role="switch"
              aria-checked={enabled}
              style={{
                width: 44,
                height: 24,
                borderRadius: 999,
                background: enabled ? "var(--brand)" : "var(--ink-9)",
                border: "none",
                position: "relative",
                cursor: "pointer",
                transition: "background 150ms",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: enabled ? 22 : 2,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 150ms",
                }}
              />
            </button>
          </div>

          {/* ── Settings ─────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Instrucciones para el cliente">
              <textarea
                className="nx-input"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Ej: Pasá por la entrada principal y consultá en el mostrador del fondo."
                rows={3}
                style={{ minHeight: 72, resize: "vertical", padding: "8px 10px" }}
              />
            </Field>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
              <Field label="Tiempo de preparación (minutos)">
                <input
                  className="nx-input"
                  inputMode="numeric"
                  value={prepMinutes}
                  onChange={(e) => setPrepMinutes(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="60"
                />
              </Field>
              <Field label="Ventana de retiro (texto libre)">
                <input
                  className="nx-input"
                  value={pickupWindow}
                  onChange={(e) => setPickupWindow(e.target.value)}
                  placeholder="Lun a Vie 10-18hs"
                />
              </Field>
            </div>
          </div>
        </AdminPanel>

        {/* Integration note */}
        <p
          style={{
            marginTop: 10,
            fontSize: 11.5,
            color: "var(--ink-5)",
            lineHeight: 1.5,
          }}
        >
          Esta configuración se guarda en el perfil del local y queda preparada para el
          checkout. La integración pública con el flujo de pago se conecta en una
          siguiente entrega — la opción no se mostrará al comprador hasta entonces.
        </p>
      </div>

      {/* ── Pedidos para retirar ──────────────────────────────────── */}
      <div className="lg:col-span-1">
        <AdminPanel
          title="Pedidos para retirar"
          description="Pedidos online con envío tipo retiro pendientes de entrega."
        >
          {pickupOrders.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "28px 12px",
                color: "var(--ink-5)",
                textAlign: "center",
              }}
            >
              <Package size={20} strokeWidth={1.5} />
              <span style={{ fontSize: 12.5 }}>
                {profile.pickupEnabled
                  ? "Cuando tus clientes elijan retirar, los verás acá."
                  : "Activá el retiro para empezar a recibir pedidos."}
              </span>
            </div>
          ) : (
            <ul style={{ display: "flex", flexDirection: "column", gap: 6, margin: 0, padding: 0, listStyle: "none" }}>
              {pickupOrders.map((o) => (
                <li
                  key={o.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: "var(--studio-paper-soft)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-0)" }}>
                      #{o.orderNumber}
                    </span>
                    <span style={{ fontSize: 12.5, color: "var(--ink-1)" }}>
                      {formatARS(o.total)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 11.5, color: "var(--ink-5)" }}>{o.customerName}</span>
                    <span style={{ fontSize: 11.5, color: "var(--ink-5)" }}>{o.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>
      </div>

      {/* ── Save bar ────────────────────────────────────────────── */}
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
        <button className="nx-action nx-action--primary" onClick={handleSave} disabled={isPending}>
          <Save size={14} strokeWidth={2} />
          {isPending ? "Guardando…" : "Guardar configuración"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11.5, color: "var(--ink-5)", fontWeight: 500 }}>{label}</span>
      {children}
    </label>
  );
}
