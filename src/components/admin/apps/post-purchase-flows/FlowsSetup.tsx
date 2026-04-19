"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  RotateCcw,
  ShoppingBag,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { savePostPurchaseSettingsAction } from "@/lib/apps/post-purchase-flows/actions";
import type { PostPurchaseSettingsView } from "@/lib/apps/post-purchase-flows/settings";

interface Props {
  settings: PostPurchaseSettingsView;
  planAllows: boolean;
  installed: boolean;
  /** Raw InstalledApp.status for the current tenant. Drives the visible
   *  status chip so it matches real cron behaviour rather than the
   *  possibly-desynced local form state. */
  installStatus: "active" | "needs_setup" | "disabled" | null;
}

const inputCls =
  "w-full h-10 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 text-[13px] text-ink-0 outline-none transition-[box-shadow,border-color] placeholder:text-ink-6 focus:bg-[var(--surface-0)] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)]";
const labelCls =
  "text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5";
const primaryBtn =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--r-sm)] bg-ink-0 text-[12px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]";
const chipBase =
  "inline-flex items-center h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-medium uppercase tracking-[0.14em]";

export function FlowsSetup({ settings, planAllows, installed, installStatus }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(settings.reviewRequestEnabled);
  const [delay, setDelay] = useState(settings.reviewRequestDelayDays);
  const [reorderEnabled, setReorderEnabled] = useState(
    settings.reorderFollowupEnabled,
  );
  const [reorderDelay, setReorderDelay] = useState(
    settings.reorderFollowupDelayDays,
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await savePostPurchaseSettingsAction({
        reviewRequestEnabled: enabled,
        reviewRequestDelayDays: delay,
        reorderFollowupEnabled: reorderEnabled,
        reorderFollowupDelayDays: reorderDelay,
      });
      if (!res.ok) {
        setErrorMsg(mapError(res.error));
        return;
      }
      setSuccessMsg("Configuración guardada.");
      router.refresh();
    });
  }

  // Reflect the real InstalledApp.status so the chip never drifts from the
  // cron's filter. "disabled" means admin toggled the app off from the
  // detail page, which the cron honours over the settings flag.
  const status: "active" | "needs_setup" | "disabled" | "inactive" = !installed
    ? "inactive"
    : installStatus === "active"
    ? "active"
    : installStatus === "disabled"
    ? "disabled"
    : "needs_setup";

  return (
    <div className="animate-in fade-in duration-[var(--dur-slow)] space-y-6">
      <Link
        href="/admin/apps/post-purchase-flows"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-5 hover:text-ink-0 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
        Volver al detalle
      </Link>

      {/* Header */}
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
            <ShoppingBag className="h-5 w-5 text-ink-0" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
                Retención · Post-compra
              </span>
              <span className="text-ink-6">·</span>
              <span
                className={cn(
                  chipBase,
                  status === "active"
                    ? "text-[color:var(--signal-success)]"
                    : status === "needs_setup"
                    ? "text-[color:var(--signal-warning)]"
                    : "text-ink-5",
                )}
              >
                {status === "active"
                  ? "Activa"
                  : status === "needs_setup"
                  ? "Requiere setup"
                  : status === "disabled"
                  ? "Desactivada"
                  : "Inactiva"}
              </span>
            </div>
            <h1 className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-ink-0">
              Flujos de post-compra
            </h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-[1.55] text-ink-5">
              Dos flows reales post-entrega:{" "}
              <strong className="text-ink-0">pedido de reseña</strong> y{" "}
              <strong className="text-ink-0">
                recordatorio de recompra
              </strong>
              . Cada uno se habilita y programa por separado. Los emails
              transaccionales (confirmación, envío, entrega) ya salen solos
              en Nexora y no se tocan.
            </p>
          </div>
        </div>
      </div>

      {!planAllows && (
        <div
          role="alert"
          className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3 text-[13px] font-medium text-[color:var(--signal-warning)]"
        >
          Tu plan actual no incluye Flujos de post-compra. Necesitás Growth o
          superior.
        </div>
      )}

      {/* Both flows live in a single form so Guardar commits atomically. */}
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Flow 1: review request */}
        <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
              <Mail className="h-4 w-4 text-ink-3" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-ink-0">
                Pedido de reseña post-entrega
              </h2>
              <p className="mt-1 text-[12px] text-ink-5">
                Evento: <code className="font-mono">deliveredAt + delayDays</code>
                . Canal: email. Idempotencia: <code className="font-mono">EmailLog (POST_PURCHASE_REVIEW_REQUEST, order, id)</code>.
              </p>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={!planAllows}
              className="mt-0.5 h-4 w-4 rounded-[var(--r-xs)] border-[color:var(--hairline)] accent-ink-0"
            />
            <span className="text-[13px] text-ink-0">
              Activar el flow
              <span className="block text-[11px] text-ink-5 mt-0.5">
                Solo se envía si la app está instalada. Mientras esté desactivado,
                el cron salta silenciosamente.
              </span>
            </span>
          </label>

          <div className="space-y-2">
            <label className={labelCls} htmlFor="delay-days">
              Delay (días después de la entrega)
            </label>
            <div className="flex items-center gap-2 max-w-[280px]">
              <Clock className="h-3.5 w-3.5 text-ink-5" strokeWidth={1.75} />
              <input
                id="delay-days"
                type="number"
                min={1}
                max={60}
                value={delay}
                onChange={(e) => setDelay(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                disabled={!planAllows}
                className={inputCls}
              />
            </div>
            <p className="text-[11px] text-ink-5">
              Rango: 1 a 60 días. Default 7.
            </p>
          </div>
        </div>

        {/* Flow 2: reorder follow-up (V3.4) */}
        <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
              <RotateCcw className="h-4 w-4 text-ink-3" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-ink-0">
                Recordatorio de recompra
              </h2>
              <p className="mt-1 text-[12px] text-ink-5">
                Evento: <code className="font-mono">deliveredAt + reorderDelayDays</code>
                . Canal: email. CTA: home del storefront. Idempotencia:{" "}
                <code className="font-mono">
                  EmailLog (POST_PURCHASE_REORDER_FOLLOWUP, order, id)
                </code>
                .
              </p>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={reorderEnabled}
              onChange={(e) => setReorderEnabled(e.target.checked)}
              disabled={!planAllows}
              className="mt-0.5 h-4 w-4 rounded-[var(--r-xs)] border-[color:var(--hairline)] accent-ink-0"
            />
            <span className="text-[13px] text-ink-0">
              Activar el flow
              <span className="block text-[11px] text-ink-5 mt-0.5">
                Un solo email por orden entregada. Sin descuentos inventados:
                invita a volver a la tienda y nada más. Independiente del
                flow de reseña.
              </span>
            </span>
          </label>

          <div className="space-y-2">
            <label className={labelCls} htmlFor="reorder-delay-days">
              Delay (días después de la entrega)
            </label>
            <div className="flex items-center gap-2 max-w-[280px]">
              <Clock className="h-3.5 w-3.5 text-ink-5" strokeWidth={1.75} />
              <input
                id="reorder-delay-days"
                type="number"
                min={7}
                max={180}
                value={reorderDelay}
                onChange={(e) =>
                  setReorderDelay(
                    Math.max(7, Math.min(180, Number(e.target.value) || 7)),
                  )
                }
                disabled={!planAllows}
                className={inputCls}
              />
            </div>
            <p className="text-[11px] text-ink-5">
              Rango: 7 a 180 días. Default 30.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="flex items-start gap-2 text-[12px] font-medium text-[color:var(--signal-danger)]"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div
            role="status"
            className="flex items-start gap-2 text-[12px] font-medium text-[color:var(--signal-success)]"
          >
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            {successMsg}
          </div>
        )}

        <button type="submit" disabled={isPending || !planAllows} className={primaryBtn}>
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
          )}
          Guardar configuración
        </button>
      </form>

      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-5 text-[12px] leading-[1.55] text-ink-5">
        <p className="font-medium text-ink-0 mb-1">Cómo se ejecuta</p>
        <p>
          Un cron interno (POST a <code className="font-mono">/api/cron/post-purchase-review-requests</code>
          con header <code className="font-mono">x-cron-secret</code>) recorre
          las órdenes entregadas que pasaron el delay configurado y envía el
          email una sola vez. Protegido por <code className="font-mono">CRON_SECRET</code>.
          Configurá una frecuencia cada 1–4 horas en tu scheduler (Render,
          GitHub Actions, cron externo).
        </p>
      </div>
    </div>
  );
}

function mapError(code: string | undefined): string {
  switch (code) {
    case "plan_locked":
      return "Tu plan no incluye esta app.";
    case "no_active_store":
      return "No hay una tienda activa.";
    case "invalid_delay":
      return "El delay de reseña tiene que estar entre 1 y 60 días.";
    case "invalid_reorder_delay":
      return "El delay de recompra tiene que estar entre 7 y 180 días.";
    default:
      return "No se pudo guardar la configuración.";
  }
}
