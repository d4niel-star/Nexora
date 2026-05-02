"use client";

import { useState, useTransition, useEffect } from "react";
import {
  updateOrderFulfillment,
  ShippingStatus,
} from "@/lib/store-engine/fulfillment/actions";
import {
  getOrderShippingState,
  createOrderShipment,
  markOrderShippedManually,
  updateOrderTracking,
  type OrderShippingState,
  type CarrierCapabilityRow,
} from "@/lib/shipping/order-shipping-actions";
import {
  Package,
  Truck,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Zap,
  MapPin,
  ExternalLink,
  Copy,
  Send,
  Edit3,
  Loader2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Order } from "@/types/order";

export function FulfillmentControls({ order }: { order: Order }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [shippingState, setShippingState] = useState<OrderShippingState | null>(null);
  const [stateLoading, setStateLoading] = useState(true);

  // Manual ship form
  const [showManualForm, setShowManualForm] = useState(false);
  const [showTrackingUpdate, setShowTrackingUpdate] = useState(false);

  // Load shipping state
  useEffect(() => {
    setStateLoading(true);
    getOrderShippingState(order.id)
      .then(setShippingState)
      .catch(() => setShippingState(null))
      .finally(() => setStateLoading(false));
  }, [order.id]);

  const handleStatusChange = (newStatus: ShippingStatus) => {
    startTransition(async () => {
      setError(null);
      setSuccess(null);
      try {
        await updateOrderFulfillment({ orderId: order.id, shippingStatus: newStatus });
        setSuccess(newStatus === "preparing" ? "Preparación iniciada" : newStatus === "delivered" ? "Marcado como entregado" : "Estado actualizado");
        // Refresh state
        const newState = await getOrderShippingState(order.id);
        setShippingState(newState);
      } catch (err: any) {
        setError(err.message || "Error al actualizar estado logístico");
      }
    });
  };

  const handleCreateShipment = (carrierId: string) => {
    startTransition(async () => {
      setError(null);
      setSuccess(null);
      try {
        const result = await createOrderShipment(order.id, carrierId);
        if (!result.success) {
          setError(result.error || "Error al crear envío");
          return;
        }
        setSuccess(`Envío creado${result.trackingCode ? ` — Tracking: ${result.trackingCode}` : ""}`);
        const newState = await getOrderShippingState(order.id);
        setShippingState(newState);
      } catch (err: any) {
        setError(err.message || "Error al crear envío con carrier");
      }
    });
  };

  const handleManualShip = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      setError(null);
      setSuccess(null);
      try {
        const result = await markOrderShippedManually({
          orderId: order.id,
          carrierName: (fd.get("carrier") as string) || "",
          trackingCode: (fd.get("trackingCode") as string) || "",
          trackingUrl: (fd.get("trackingUrl") as string) || "",
          note: (fd.get("note") as string) || "",
        });
        if (!result.success) {
          setError(result.error || "Error al marcar como enviado");
          return;
        }
        setSuccess("Orden marcada como enviada manualmente");
        setShowManualForm(false);
        const newState = await getOrderShippingState(order.id);
        setShippingState(newState);
      } catch (err: any) {
        setError(err.message || "Error al marcar como enviado");
      }
    });
  };

  const handleTrackingUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      setError(null);
      setSuccess(null);
      try {
        const result = await updateOrderTracking(
          order.id,
          (fd.get("trackingCode") as string) || "",
          (fd.get("trackingUrl") as string) || "",
        );
        if (!result.success) {
          setError(result.error || "Error al actualizar tracking");
          return;
        }
        setSuccess("Tracking actualizado");
        setShowTrackingUpdate(false);
        const newState = await getOrderShippingState(order.id);
        setShippingState(newState);
      } catch (err: any) {
        setError(err.message || "Error al actualizar tracking");
      }
    });
  };

  const currentStatus = shippingState?.shippingStatus || order.shipping.shippingStatus || "unfulfilled";
  const isCancelled = order.status === "cancelled";

  return (
    <div className="bg-[var(--surface-1)] rounded-[var(--r-md)] p-6 border border-[color:var(--hairline)]">
      <div className="flex items-center justify-between mb-5">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 flex items-center gap-1.5">
          {shippingState?.isPickup ? (
            <><MapPin className="w-3.5 h-3.5" /> Retiro en local</>
          ) : (
            <><Truck className="w-3.5 h-3.5" /> Logística de envío</>
          )}
        </span>
        {(isPending || stateLoading) && (
          <Loader2 className="w-3.5 h-3.5 text-ink-5 animate-spin" />
        )}
      </div>

      {/* Status banners */}
      {error && (
        <div className="rounded-[var(--r-sm)] border border-[color:color-mix(in_srgb,var(--signal-danger)_30%,var(--hairline))] bg-[color:color-mix(in_srgb,var(--signal-danger)_8%,var(--surface-0))] p-3 mb-4 flex items-center gap-2 text-[13px] text-[color:var(--signal-danger)]">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="rounded-[var(--r-sm)] border border-emerald-200 bg-emerald-50 p-3 mb-4 flex items-center gap-2 text-[13px] text-emerald-700">
          <CheckCircle className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {isCancelled && (
        <div className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4 mb-5 text-[13px] text-[color:var(--signal-danger)]">
          Logística detenida: el pedido fue cancelado.
        </div>
      )}

      {/* PICKUP ORDERS */}
      {shippingState?.isPickup && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-ink-3" />
            <span className="text-[14px] font-medium text-ink-0">
              {shippingState.shippingMethodLabel || "Retiro en local"}
            </span>
          </div>
          <p className="text-[12px] text-ink-5">
            Esta orden es de retiro en local. El envío se gestiona presencialmente.
            No aplican operaciones de carrier ni tracking logístico.
          </p>
        </div>
      )}

      {/* SHIPPING ORDERS — Progress track */}
      {shippingState && !shippingState.isPickup && (
        <>
          {/* Warnings */}
          {shippingState.warnings.length > 0 && (
            <div className="mb-4 space-y-1">
              {shippingState.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-[12px] text-amber-600 bg-amber-50 border border-amber-200 rounded-[var(--r-sm)] px-3 py-2">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {w}
                </div>
              ))}
            </div>
          )}

          {/* Progress track */}
          <div className="relative pl-5 space-y-6 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-px before:bg-[color:var(--hairline-strong)]">

            {/* Step 1: Preparing */}
            <div className="relative">
              <div className={`absolute -left-[27px] top-1 w-3 h-3 rounded-full ring-4 ring-[var(--surface-1)] transition-colors ${currentStatus !== "unfulfilled" ? "bg-ink-0" : "bg-[var(--surface-3)]"}`} />
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-[13px] font-medium ${currentStatus !== "unfulfilled" ? "text-ink-0" : "text-ink-5"}`}>
                    En preparación
                  </p>
                  {currentStatus === "unfulfilled" && (
                    <p className="text-[11px] text-ink-5 mt-1">El pedido aún no fue armado.</p>
                  )}
                </div>
                {currentStatus === "unfulfilled" && order.paymentStatus === "paid" && !isCancelled && (
                  <button
                    onClick={() => handleStatusChange("preparing")}
                    disabled={isPending}
                    className="inline-flex items-center h-8 px-3 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-[11px] font-medium text-ink-0 hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50"
                  >
                    Comenzar
                  </button>
                )}
              </div>
            </div>

            {/* Step 2: Dispatch */}
            <div className="relative">
              <div className={`absolute -left-[27px] top-1 w-3 h-3 rounded-full ring-4 ring-[var(--surface-1)] transition-colors ${currentStatus === "shipped" || currentStatus === "delivered" ? "bg-ink-0" : "bg-[var(--surface-3)]"}`} />
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-medium ${currentStatus === "shipped" || currentStatus === "delivered" ? "text-ink-0" : "text-ink-5"}`}>
                    Despachado
                  </p>

                  {/* Already shipped: show tracking info */}
                  {(currentStatus === "shipped" || currentStatus === "delivered") && !showTrackingUpdate && (
                    <div className="mt-3 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-3">
                      {shippingState.currentTrackingCode ? (
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 mb-1">
                            Rastreo activo
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[13px] text-ink-0">{shippingState.currentTrackingCode}</span>
                            <button
                              type="button"
                              onClick={() => navigator.clipboard?.writeText(shippingState.currentTrackingCode || "")}
                              className="p-1 text-ink-5 hover:text-ink-0 transition-colors"
                              title="Copiar"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          {shippingState.currentTrackingUrl && (
                            <a
                              href={shippingState.currentTrackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-[11px] text-ink-4 hover:text-ink-0 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" /> Ver tracking externo
                            </a>
                          )}
                          {shippingState.selectedCarrier && (
                            <p className="text-[11px] text-ink-4 mt-1">Carrier: {shippingState.selectedCarrier}</p>
                          )}
                          {shippingState.shippedAt && (
                            <p className="text-[10px] text-ink-6 mt-1" suppressHydrationWarning>
                              Despachado: {new Date(shippingState.shippedAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-ink-5 italic">
                          Enviado sin código de tracking.
                        </p>
                      )}
                      {!isCancelled && currentStatus === "shipped" && (
                        <button
                          onClick={() => setShowTrackingUpdate(true)}
                          className="mt-2 text-[11px] font-medium text-ink-0 hover:underline flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" /> Actualizar tracking
                        </button>
                      )}
                    </div>
                  )}

                  {/* Update tracking form */}
                  {showTrackingUpdate && (
                    <form onSubmit={handleTrackingUpdate} className="mt-3 rounded-[var(--r-md)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] p-4 space-y-3">
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 mb-1.5 block">Código de tracking</label>
                        <input name="trackingCode" type="text" defaultValue={shippingState.currentTrackingCode || ""} placeholder="Ej: TRK-99213" className="w-full px-3 h-10 text-[13px] bg-[var(--surface-0)] border border-[color:var(--hairline)] rounded-[var(--r-sm)] text-ink-0 placeholder:text-ink-6 outline-none focus:border-ink-5 focus:shadow-[var(--shadow-focus)]" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 mb-1.5 block">URL de rastreo (opcional)</label>
                        <input name="trackingUrl" type="url" defaultValue={shippingState.currentTrackingUrl || ""} placeholder="https://" className="w-full px-3 h-10 text-[13px] bg-[var(--surface-0)] border border-[color:var(--hairline)] rounded-[var(--r-sm)] text-ink-0 placeholder:text-ink-6 outline-none focus:border-ink-5 focus:shadow-[var(--shadow-focus)]" />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button type="submit" disabled={isPending} className="flex-1 h-9 rounded-[var(--r-sm)] bg-ink-0 text-ink-12 text-[12px] font-medium hover:bg-ink-2 transition-colors disabled:opacity-50">Guardar</button>
                        <button type="button" onClick={() => setShowTrackingUpdate(false)} className="h-9 px-3 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-ink-0 text-[12px] font-medium hover:bg-[var(--surface-2)] transition-colors">Cancelar</button>
                      </div>
                    </form>
                  )}

                  {/* Preparing: show carrier actions */}
                  {currentStatus === "preparing" && !showManualForm && !isCancelled && (
                    <div className="mt-3 space-y-2">
                      {/* Real carrier buttons */}
                      {shippingState.availableCarriers.filter((c) => c.canCreateShipment).map((c) => (
                        <button
                          key={c.provider}
                          onClick={() => handleCreateShipment(c.provider)}
                          disabled={isPending}
                          className="w-full inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-[12px] font-medium text-ink-0 hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50"
                          title={`Crear envío vía ${c.label}`}
                        >
                          <Zap className="w-3.5 h-3.5" strokeWidth={1.75} />
                          Crear envío con {c.label}
                        </button>
                      ))}

                      {/* Manual ship button */}
                      <button
                        onClick={() => setShowManualForm(true)}
                        disabled={isPending}
                        className="w-full inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-[var(--r-sm)] bg-ink-0 text-ink-12 text-[12px] font-medium hover:bg-ink-2 transition-colors disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Marcar como enviado manualmente
                      </button>

                      {/* Carriers without connection */}
                      {shippingState.availableCarriers.filter((c) => !c.canCreateShipment && c.configured).length > 0 && (
                        <p className="text-[10px] text-ink-6 pt-1">
                          {shippingState.availableCarriers.filter((c) => !c.canCreateShipment && c.configured).map((c) => c.label).join(", ")} configurado pero sin conexión activa.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Manual ship form */}
                  {showManualForm && (
                    <form onSubmit={handleManualShip} className="mt-3 rounded-[var(--r-md)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] p-4 space-y-3">
                      <p className="text-[11px] text-ink-5 font-medium uppercase tracking-[0.12em]">Envío manual</p>
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 mb-1.5 block">Logística / carrier (opcional)</label>
                        <input name="carrier" type="text" defaultValue={shippingState.selectedCarrier || ""} placeholder="Ej: Andreani, OCA, Correo" className="w-full px-3 h-10 text-[13px] bg-[var(--surface-0)] border border-[color:var(--hairline)] rounded-[var(--r-sm)] text-ink-0 placeholder:text-ink-6 outline-none focus:border-ink-5 focus:shadow-[var(--shadow-focus)]" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 mb-1.5 block">Código de tracking (opcional)</label>
                        <input name="trackingCode" type="text" placeholder="Ej: TRK-99213" className="w-full px-3 h-10 text-[13px] bg-[var(--surface-0)] border border-[color:var(--hairline)] rounded-[var(--r-sm)] text-ink-0 placeholder:text-ink-6 outline-none focus:border-ink-5 focus:shadow-[var(--shadow-focus)]" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 mb-1.5 block">URL de rastreo (opcional)</label>
                        <input name="trackingUrl" type="url" placeholder="https://" className="w-full px-3 h-10 text-[13px] bg-[var(--surface-0)] border border-[color:var(--hairline)] rounded-[var(--r-sm)] text-ink-0 placeholder:text-ink-6 outline-none focus:border-ink-5 focus:shadow-[var(--shadow-focus)]" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5 mb-1.5 block">Nota interna (opcional)</label>
                        <textarea name="note" rows={2} placeholder="Ej: Entregado al courier en mano" className="w-full px-3 py-2 text-[13px] bg-[var(--surface-0)] border border-[color:var(--hairline)] rounded-[var(--r-sm)] text-ink-0 placeholder:text-ink-6 outline-none focus:border-ink-5 focus:shadow-[var(--shadow-focus)] resize-none" />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button type="submit" disabled={isPending} className="flex-1 h-9 rounded-[var(--r-sm)] bg-ink-0 text-ink-12 text-[12px] font-medium hover:bg-ink-2 transition-colors disabled:opacity-50">
                          Confirmar envío manual
                        </button>
                        <button type="button" onClick={() => setShowManualForm(false)} className="h-9 px-3 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-ink-0 text-[12px] font-medium hover:bg-[var(--surface-2)] transition-colors">
                          Cancelar
                        </button>
                      </div>
                      <p className="text-[10px] text-ink-5 text-center">
                        Al confirmar, se enviará el correo ORDER_SHIPPED al cliente (si está activo).
                      </p>
                    </form>
                  )}
                </div>
              </div>
            </div>

            {/* Step 3: Delivered */}
            <div className="relative">
              <div className={`absolute -left-[27px] top-1 w-3 h-3 rounded-full ring-4 ring-[var(--surface-1)] transition-colors ${currentStatus === "delivered" ? "bg-[color:var(--signal-success)]" : "bg-[var(--surface-3)]"}`} />
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-[13px] font-medium ${currentStatus === "delivered" ? "text-ink-0" : "text-ink-5"}`}>Entregado</p>
                  {shippingState.deliveredAt && (
                    <p className="text-[10px] text-ink-6 mt-0.5" suppressHydrationWarning>
                      {new Date(shippingState.deliveredAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
                {currentStatus === "shipped" && !isCancelled && (
                  <button
                    onClick={() => handleStatusChange("delivered")}
                    disabled={isPending}
                    className="inline-flex items-center h-8 px-3 rounded-[var(--r-sm)] bg-ink-0 text-ink-12 text-[11px] font-medium hover:bg-ink-2 transition-colors disabled:opacity-50"
                  >
                    Marcar entregado
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Loading fallback */}
      {stateLoading && !shippingState && (
        <div className="flex items-center gap-2 text-[13px] text-ink-5 py-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando estado logístico…
        </div>
      )}
    </div>
  );
}
