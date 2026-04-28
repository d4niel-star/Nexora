"use client";

import { useState, useTransition } from "react";
import { Save, Check, Package, ExternalLink, RotateCcw } from "lucide-react";

import { AdminPanel } from "@/components/admin/primitives/AdminPanel";
import {
  markPickupCollected,
  markPickupReady,
  reopenPickup,
  savePickupSettings,
} from "@/lib/local-store/actions";
import type { LocationProfile, PickupOrderRow } from "@/lib/local-store/types";

interface Props {
  profile: LocationProfile;
  pickupOrders: PickupOrderRow[];
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
      <div className="lg:col-span-3">
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

        {/* Public integration note */}
        <p
          style={{
            marginTop: 10,
            fontSize: 11.5,
            color: "var(--ink-5)",
            lineHeight: 1.5,
          }}
        >
          Esta configuración aparece en el checkout público de tu tienda como una
          opción de entrega. Cuando un cliente elige retirar, su pedido se lista
          abajo para que lo prepares y entregues.
        </p>
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

      {/* ── Pedidos para retirar ──────────────────────────────────── */}
      <div className="lg:col-span-3">
        <AdminPanel
          title="Pedidos para retirar"
          description="Pedidos online con retiro en local pendientes de entrega. Marcá listo cuando esté preparado y entregado cuando el cliente lo retire."
        >
          <PickupOrdersTable
            orders={pickupOrders}
            pickupEnabled={profile.pickupEnabled}
          />
        </AdminPanel>
      </div>
    </div>
  );
}

// ─── Tabla de pedidos pickup con acciones operativas ──────────────────
function PickupOrdersTable({
  orders,
  pickupEnabled,
}: {
  orders: PickupOrderRow[];
  pickupEnabled: boolean;
}) {
  if (orders.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "40px 12px",
          color: "var(--ink-5)",
          textAlign: "center",
        }}
      >
        <Package size={22} strokeWidth={1.5} />
        <span style={{ fontSize: 13 }}>
          {pickupEnabled
            ? "No hay pedidos pendientes de retiro. Cuando tus clientes elijan retirar en local, los verás acá."
            : "Activá el retiro para empezar a recibir pedidos."}
        </span>
      </div>
    );
  }
  return (
    <div className="nx-table-shell" style={{ border: "none" }}>
      <table className="nx-table">
        <thead>
          <tr>
            <th style={{ width: 100 }}>Pedido</th>
            <th>Cliente</th>
            <th style={{ width: 120 }}>Pago</th>
            <th style={{ width: 70, textAlign: "right" }}>Items</th>
            <th style={{ width: 110, textAlign: "right" }}>Total</th>
            <th style={{ width: 100 }}>Hora</th>
            <th style={{ width: 130 }}>Estado</th>
            <th style={{ width: 220 }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <PickupRow key={o.id} order={o} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PickupRow({ order }: { order: PickupOrderRow }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optStatus, setOptStatus] = useState<string>(order.shippingStatus);

  function run(action: () => Promise<{ success: boolean; error?: string }>, optimisticTo: string) {
    setError(null);
    const previous = optStatus;
    setOptStatus(optimisticTo);
    startTransition(async () => {
      const res = await action();
      if (!res.success) {
        setError(res.error || "No se pudo actualizar");
        setOptStatus(previous);
      }
    });
  }

  return (
    <tr>
      <td>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{order.orderNumber}</span>
      </td>
      <td>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 12.5, color: "var(--ink-0)" }}>{order.customerName}</span>
          <span style={{ fontSize: 11, color: "var(--ink-5)" }}>
            {order.customerEmail}
            {order.customerPhone ? ` · ${order.customerPhone}` : ""}
          </span>
        </div>
      </td>
      <td>
        <PaymentBadge status={order.paymentStatus} />
      </td>
      <td style={{ textAlign: "right", fontSize: 12.5 }}>{order.itemCount}</td>
      <td style={{ textAlign: "right", fontSize: 12.5, fontWeight: 500 }}>
        {formatARS(order.total)}
      </td>
      <td style={{ fontSize: 11.5, color: "var(--ink-5)" }}>
        {new Date(order.createdAt).toLocaleString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </td>
      <td>
        <ShippingStatusBadge status={optStatus} />
      </td>
      <td>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {optStatus === "unfulfilled" ? (
            <button
              className="nx-action nx-action--sm"
              disabled={isPending}
              onClick={() => run(() => markPickupReady(order.id), "fulfilled")}
              title="Marcar como listo para retirar"
            >
              {isPending ? "…" : "Listo"}
            </button>
          ) : null}
          {optStatus === "fulfilled" ? (
            <>
              <button
                className="nx-action nx-action--sm nx-action--primary"
                disabled={isPending}
                onClick={() => run(() => markPickupCollected(order.id), "delivered")}
              >
                {isPending ? "…" : "Retirado"}
              </button>
              <button
                className="nx-action nx-action--sm"
                disabled={isPending}
                onClick={() => run(() => reopenPickup(order.id), "unfulfilled")}
                title="Volver a preparación"
                aria-label="Volver a preparación"
                style={{ width: 28, padding: 0, justifyContent: "center" }}
              >
                <RotateCcw size={12} />
              </button>
            </>
          ) : null}
          <a
            href={`/admin/orders/${order.id}`}
            className="nx-action nx-action--sm"
            style={{ width: 28, padding: 0, justifyContent: "center" }}
            title="Ver detalle del pedido"
            aria-label="Ver detalle del pedido"
          >
            <ExternalLink size={12} />
          </a>
          {error ? (
            <span style={{ fontSize: 10.5, color: "#a3262e" }}>{error}</span>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    paid: { label: "Pagado", bg: "rgba(34, 153, 84, 0.10)", color: "#1d6f3f" },
    approved: { label: "Pagado", bg: "rgba(34, 153, 84, 0.10)", color: "#1d6f3f" },
    pending: { label: "Pendiente", bg: "rgba(186, 116, 0, 0.10)", color: "#8a5a00" },
    failed: { label: "Falló", bg: "rgba(163, 38, 46, 0.08)", color: "#a3262e" },
    rejected: { label: "Rechazado", bg: "rgba(163, 38, 46, 0.08)", color: "#a3262e" },
    refunded: { label: "Reembolsado", bg: "var(--studio-paper-soft)", color: "var(--ink-3)" },
  };
  const cfg = map[status] ?? { label: status, bg: "var(--studio-paper-soft)", color: "var(--ink-3)" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 999,
        background: cfg.bg,
        color: cfg.color,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {cfg.label}
    </span>
  );
}

function ShippingStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    unfulfilled: { label: "Preparando", bg: "rgba(186, 116, 0, 0.12)", color: "#8a5a00" },
    fulfilled: { label: "Listo p/ retirar", bg: "rgba(34, 153, 84, 0.12)", color: "#1d6f3f" },
    delivered: { label: "Retirado", bg: "var(--studio-paper-soft)", color: "var(--ink-3)" },
  };
  const cfg = map[status] ?? { label: status, bg: "var(--studio-paper-soft)", color: "var(--ink-3)" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 999,
        background: cfg.bg,
        color: cfg.color,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {cfg.label}
    </span>
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
