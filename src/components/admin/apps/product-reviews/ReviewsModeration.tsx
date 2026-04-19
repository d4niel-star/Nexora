"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  EyeOff,
  Loader2,
  RotateCcw,
  Star,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  approveReviewAction,
  hideReviewAction,
  unhideReviewAction,
  deleteReviewAction,
} from "@/lib/apps/product-reviews/actions";
import type {
  AdminReview,
  ReviewStatus,
} from "@/lib/apps/product-reviews/queries";

interface Counts {
  pending: number;
  approved: number;
  hidden: number;
  total: number;
}

interface Props {
  initialStatus: ReviewStatus;
  reviews: AdminReview[];
  counts: Counts;
  planAllows: boolean;
}

const chipBase =
  "inline-flex items-center h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-medium uppercase tracking-[0.14em]";
const primaryBtn =
  "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-[var(--r-sm)] bg-ink-0 text-[11px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]";
const secondaryBtn =
  "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-[11px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]";
const ghostBtn =
  "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-[var(--r-sm)] text-[11px] font-medium text-ink-5 transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]";

export function ReviewsModeration({
  initialStatus,
  reviews,
  counts,
  planAllows,
}: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<ReviewStatus>(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [errorId, setErrorId] = useState<string | null>(null);

  function changeFilter(next: ReviewStatus) {
    setFilter(next);
    router.push(`/admin/apps/product-reviews/moderation?status=${next}`);
  }

  function handle(
    id: string,
    fn: () => Promise<{ ok: boolean; error?: string }>,
  ) {
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
        href="/admin/apps/product-reviews"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-5 hover:text-ink-0 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
        Volver al detalle
      </Link>

      {/* Header */}
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
            <Star className="h-5 w-5 text-ink-0" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
              Confianza · Moderación
            </span>
            <h1 className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-ink-0">
              Reseñas de productos
            </h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-[1.55] text-ink-5">
              Pending-first. Toda reseña nueva entra en estado{" "}
              <strong className="text-ink-0">pendiente</strong> hasta que la
              aprobés acá.
            </p>
          </div>
        </div>
      </div>

      {!planAllows && (
        <div
          role="alert"
          className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3 text-[13px] font-medium text-[color:var(--signal-warning)]"
        >
          Tu plan actual no incluye Reseñas de productos. Necesitás Growth o
          superior para moderar reseñas.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
        <FilterPill
          label={`Pendientes (${counts.pending})`}
          active={filter === "pending"}
          onClick={() => changeFilter("pending")}
        />
        <FilterPill
          label={`Aprobadas (${counts.approved})`}
          active={filter === "approved"}
          onClick={() => changeFilter("approved")}
        />
        <FilterPill
          label={`Ocultas (${counts.hidden})`}
          active={filter === "hidden"}
          onClick={() => changeFilter("hidden")}
        />
      </div>

      {/* List */}
      {reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[var(--r-md)] border border-dashed border-[color:var(--hairline)] bg-[var(--surface-1)] py-16 text-center">
          <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
            <Star className="h-4 w-4 text-ink-5" strokeWidth={1.5} />
          </div>
          <h3 className="text-[16px] font-semibold tracking-[-0.02em] text-ink-0">
            {filter === "pending"
              ? "No hay reseñas pendientes"
              : filter === "approved"
              ? "Aún no aprobaste reseñas"
              : "Sin reseñas ocultas"}
          </h3>
          <p className="mt-2 max-w-sm text-[13px] leading-[1.55] text-ink-5">
            Las reseñas se cargan desde la PDP del storefront. Si la app está
            activa, todo envío queda pendiente hasta tu revisión.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StarRating rating={r.rating} />
                    <span className={cn(chipBase, statusTone(r.status))}>
                      {statusLabel(r.status)}
                    </span>
                    {r.verifiedPurchase && (
                      <span
                        className={cn(
                          chipBase,
                          "text-[color:var(--signal-success)]",
                        )}
                      >
                        Compra verificada
                      </span>
                    )}
                  </div>
                  {r.title && (
                    <h3 className="mt-3 text-[14px] font-semibold text-ink-0">
                      {r.title}
                    </h3>
                  )}
                  <p className="mt-1 text-[13px] leading-[1.55] text-ink-3 whitespace-pre-wrap">
                    {r.body}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-5">
                    <span className="font-medium text-ink-3">
                      {r.displayName}
                    </span>
                    <span>·</span>
                    <span>
                      Producto:{" "}
                      <span className="font-medium text-ink-3">
                        {r.productTitle}
                      </span>
                    </span>
                    <span>·</span>
                    <span className="tabular-nums">
                      {new Intl.DateTimeFormat("es-AR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(r.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {r.status === "pending" && (
                    <>
                      <button
                        type="button"
                        disabled={isPending || !planAllows}
                        onClick={() =>
                          handle(r.id, () => approveReviewAction(r.id))
                        }
                        className={primaryBtn}
                      >
                        {isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" strokeWidth={2} />
                        )}
                        Aprobar
                      </button>
                      <button
                        type="button"
                        disabled={isPending || !planAllows}
                        onClick={() =>
                          handle(r.id, () => hideReviewAction(r.id))
                        }
                        className={secondaryBtn}
                      >
                        <EyeOff className="h-3 w-3" strokeWidth={1.75} />
                        Ocultar
                      </button>
                    </>
                  )}
                  {r.status === "approved" && (
                    <button
                      type="button"
                      disabled={isPending || !planAllows}
                      onClick={() =>
                        handle(r.id, () => hideReviewAction(r.id))
                      }
                      className={secondaryBtn}
                    >
                      <EyeOff className="h-3 w-3" strokeWidth={1.75} />
                      Ocultar
                    </button>
                  )}
                  {r.status === "hidden" && (
                    <button
                      type="button"
                      disabled={isPending || !planAllows}
                      onClick={() =>
                        handle(r.id, () => unhideReviewAction(r.id))
                      }
                      className={secondaryBtn}
                    >
                      <RotateCcw className="h-3 w-3" strokeWidth={1.75} />
                      Devolver a pendientes
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isPending || !planAllows}
                    onClick={() => {
                      if (!confirm("¿Eliminar definitivamente esta reseña?")) return;
                      handle(r.id, () => deleteReviewAction(r.id));
                    }}
                    className={ghostBtn}
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={1.75} />
                    Eliminar
                  </button>
                </div>
              </div>
              {errorId === r.id && (
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

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center h-8 px-3 rounded-[var(--r-sm)] text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
        active
          ? "bg-ink-0 text-ink-12"
          : "border border-[color:var(--hairline)] bg-[var(--surface-0)] text-ink-3 hover:bg-[var(--surface-2)]",
      )}
    >
      {label}
    </button>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${rating} de 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i <= rating
              ? "fill-ink-0 text-ink-0"
              : "text-ink-6",
          )}
          strokeWidth={1.5}
        />
      ))}
      <span className="ml-1 text-[11px] font-medium tabular-nums text-ink-3">
        {rating}/5
      </span>
    </span>
  );
}

function statusLabel(s: ReviewStatus): string {
  if (s === "pending") return "Pendiente";
  if (s === "approved") return "Aprobada";
  return "Oculta";
}
function statusTone(s: ReviewStatus): string {
  if (s === "pending") return "text-[color:var(--signal-warning)]";
  if (s === "approved") return "text-[color:var(--signal-success)]";
  return "text-ink-5";
}
