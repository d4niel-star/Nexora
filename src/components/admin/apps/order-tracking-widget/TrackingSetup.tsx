"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Truck,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { TrackingStats } from "@/lib/apps/order-tracking-widget/queries";

interface Props {
  isActive: boolean;
  publicUrl: string;
  stats: TrackingStats;
}

const chipBase =
  "inline-flex items-center h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-medium uppercase tracking-[0.14em]";
const secondaryBtn =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-[12px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]";

export function TrackingSetup({ isActive, publicUrl, stats }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard might be unavailable (insecure origin); ignore */
    }
  }

  return (
    <div className="animate-in fade-in duration-[var(--dur-slow)] space-y-6">
      <Link
        href="/admin/apps/order-tracking-widget"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-5 hover:text-ink-0 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
        Volver al detalle
      </Link>

      {/* Header */}
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
            <Truck className="h-5 w-5 text-ink-0" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
                Confianza · Seguimiento
              </span>
              <span className="text-ink-6">·</span>
              <span
                className={cn(
                  chipBase,
                  isActive
                    ? "text-[color:var(--signal-success)]"
                    : "text-ink-5",
                )}
              >
                {isActive ? "Activa" : "Inactiva"}
              </span>
            </div>
            <h1 className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-ink-0">
              Seguimiento de pedidos
            </h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-[1.55] text-ink-5">
              La app no requiere configuración manual. Al estar activa, tu
              storefront muestra un link <strong className="text-ink-0">
              Seguir pedido</strong> en el footer. El cliente consulta con
              número de pedido y email.
            </p>
          </div>
        </div>
      </div>

      {/* Public URL */}
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 space-y-4">
        <div>
          <h2 className="text-[14px] font-semibold text-ink-0">
            URL pública de seguimiento
          </h2>
          <p className="mt-1 text-[12px] text-ink-5">
            Podés compartirla en emails de post-venta, WhatsApp o imprimir en
            el packaging. Requiere el número de pedido y el email del cliente.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="flex-1 min-w-0 truncate rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 py-2.5 text-[12px] font-mono text-ink-0">
            {publicUrl}
          </code>
          <div className="flex gap-2">
            <button type="button" onClick={copy} className={secondaryBtn}>
              {copied ? (
                <Check className="h-3.5 w-3.5" strokeWidth={1.75} />
              ) : (
                <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
              )}
              {copied ? "Copiado" : "Copiar"}
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={secondaryBtn}
            >
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
              Abrir
            </a>
          </div>
        </div>
      </div>

      {/* Real stats */}
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <h2 className="text-[14px] font-semibold text-ink-0">
          Datos de envío en tu tienda
        </h2>
        <p className="mt-1 text-[12px] text-ink-5">
          Calculado a partir de tus órdenes reales. Nada acá es estimado.
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Órdenes totales" value={stats.totalOrders} />
          <Stat label="Con tracking" value={stats.withTrackingCode} />
          <Stat label="Enviadas" value={stats.shipped} />
          <Stat label="Entregadas" value={stats.delivered} />
        </dl>
        {stats.totalOrders > 0 && stats.withTrackingCode === 0 && (
          <p className="mt-4 text-[12px] text-[color:var(--signal-warning)]">
            Ninguna orden tiene tracking cargado. Cargá{" "}
            <code className="font-mono">trackingCode</code> y{" "}
            <code className="font-mono">trackingUrl</code> desde el panel de
            pedidos para que el cliente pueda ver el envío.
          </p>
        )}
      </div>

      {/* Honesty note */}
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-5 text-[12px] leading-[1.55] text-ink-5">
        <p className="font-medium text-ink-0 mb-1">Qué ve el cliente</p>
        <p>
          Solo datos reales guardados en la orden: estado del envío (
          <code className="font-mono">unfulfilled</code>,{" "}
          <code className="font-mono">shipped</code>,{" "}
          <code className="font-mono">delivered</code>), carrier, número de
          tracking y link externo si existen. Si falta algo, se indica como
          <strong className="text-ink-0"> sin dato</strong> en lugar de
          inventar un estado.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-4">
      <dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
        {label}
      </dt>
      <dd className="mt-1 text-[20px] font-semibold tabular-nums text-ink-0">
        {value}
      </dd>
    </div>
  );
}
