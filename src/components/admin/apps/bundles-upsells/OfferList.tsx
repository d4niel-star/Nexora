"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BadgePercent, Loader2, Plus, Power, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  deleteOfferAction,
  setOfferStatusAction,
} from "@/lib/apps/bundles-upsells/actions";
import type { AdminOfferRow } from "@/lib/apps/bundles-upsells/queries";
import { EmptyState } from "@/components/ui/EmptyState";

interface Props {
  offers: AdminOfferRow[];
  planAllows: boolean;
}

const chipBase =
  "inline-flex items-center h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-medium uppercase tracking-[0.14em]";
const primaryBtn =
  "inline-flex items-center justify-center gap-2 h-10 px-5 rounded-full bg-ink-0 text-[12px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]";
const secondaryBtn =
  "inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-[11px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]";
const ghostBtn =
  "inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-full text-[11px] font-medium text-ink-5 transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]";

export function OfferList({ offers, planAllows }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorId, setErrorId] = useState<string | null>(null);

  function handle(id: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setErrorId(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setErrorId(id);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="animate-in fade-in duration-[var(--dur-slow)] space-y-6">
      <Link
        href="/admin/apps/bundles-upsells"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-5 hover:text-ink-0 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
        Volver al detalle
      </Link>

      {/* Header */}
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
              <BadgePercent className="h-5 w-5 text-ink-0" strokeWidth={1.5} />
            </div>
            <div>
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
                Conversión · Ofertas
              </span>
              <h1 className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-ink-0">
                Bundles y upsells
              </h1>
              <p className="mt-2 max-w-2xl text-[13px] leading-[1.55] text-ink-5">
                Cada oferta asocia un producto <strong className="text-ink-0">
                trigger</strong> con una lista de productos complementarios que
                aparecerán en su PDP. Sin descuentos inventados, sin tocar el
                carrito.
              </p>
            </div>
          </div>
          <Link
            href="/admin/apps/bundles-upsells/offers/new"
            className={cn(primaryBtn, !planAllows && "pointer-events-none opacity-50")}
            aria-disabled={!planAllows}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Nueva oferta
          </Link>
        </div>
      </div>

      {!planAllows && (
        <div
          role="alert"
          className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3 text-[13px] font-medium text-[color:var(--signal-warning)]"
        >
          Tu plan actual no incluye Bundles y upsells. Necesitás Growth o
          superior.
        </div>
      )}

      {/* List */}
      {offers.length === 0 ? (
        <div className="rounded-[var(--r-md)] border border-dashed border-[color:var(--hairline)] bg-[var(--surface-1)]">
          <EmptyState
            icon={BadgePercent}
            tone="muted"
            size="compact"
            title="No hay bundles todavía"
            description="Elegí un producto trigger y los complementarios que querés mostrar en su PDP. Un bundle con más de un ítem cross-sell convierte mejor que un CTA suelto."
            action={
              planAllows
                ? { label: "Crear bundle", href: "/admin/apps/bundles-upsells/offers/new" }
                : undefined
            }
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {offers.map((o) => (
            <li
              key={o.id}
              className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        chipBase,
                        o.status === "active"
                          ? "text-[color:var(--signal-success)]"
                          : "text-ink-5",
                      )}
                    >
                      {o.status === "active" ? "Activa" : "Borrador"}
                    </span>
                    <span className={cn(chipBase, "text-ink-5")}>
                      {o.itemsCount} ítem{o.itemsCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <h3 className="mt-3 text-[14px] font-semibold text-ink-0">
                    {o.title || o.name}
                  </h3>
                  {o.title && o.name !== o.title && (
                    <p className="mt-0.5 text-[11px] text-ink-5">
                      Nombre interno: {o.name}
                    </p>
                  )}
                  <p className="mt-2 text-[12px] text-ink-5">
                    Trigger:{" "}
                    <Link
                      href={`/admin/catalog?product=${o.triggerProductId}`}
                      className="text-ink-3 font-medium hover:text-ink-0 transition-colors"
                    >
                      {o.triggerProductTitle}
                    </Link>
                  </p>
                  <p className="mt-1 text-[11px] text-ink-5 tabular-nums">
                    Última actualización:{" "}
                    {new Intl.DateTimeFormat("es-AR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(o.updatedAt)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Link
                    href={`/admin/apps/bundles-upsells/offers/${o.id}`}
                    className={secondaryBtn}
                  >
                    Editar
                  </Link>
                  <button
                    type="button"
                    disabled={isPending || !planAllows}
                    onClick={() =>
                      handle(o.id, () =>
                        setOfferStatusAction(
                          o.id,
                          o.status === "active" ? "draft" : "active",
                        ),
                      )
                    }
                    className={secondaryBtn}
                  >
                    {isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Power className="h-3 w-3" strokeWidth={1.75} />
                    )}
                    {o.status === "active" ? "Pausar" : "Activar"}
                  </button>
                  <button
                    type="button"
                    disabled={isPending || !planAllows}
                    onClick={() => {
                      if (!confirm("¿Eliminar esta oferta?")) return;
                      handle(o.id, () => deleteOfferAction(o.id));
                    }}
                    className={ghostBtn}
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={1.75} />
                    Eliminar
                  </button>
                </div>
              </div>
              {errorId === o.id && (
                <p
                  role="alert"
                  className="mt-3 text-[11px] font-medium text-[color:var(--signal-danger)]"
                >
                  No se pudo procesar la acción.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
