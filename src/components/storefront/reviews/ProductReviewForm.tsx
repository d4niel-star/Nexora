"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { submitReviewAction } from "@/lib/apps/product-reviews/actions";

interface Props {
  storeSlug: string;
  productId: string;
}

const inputCls =
  "w-full h-10 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3 text-[13px] text-ink-0 outline-none transition-[box-shadow,border-color] placeholder:text-ink-6 focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)]";
const textareaCls =
  "w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3 py-2.5 text-[13px] text-ink-0 outline-none transition-[box-shadow,border-color] placeholder:text-ink-6 focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)] resize-none";
const labelCls =
  "text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5";

export function ProductReviewForm({ storeSlug, productId }: Props) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await submitReviewAction({
        storeSlug,
        productId,
        displayName,
        rating,
        title: title.trim() || undefined,
        body,
        buyerEmail: buyerEmail.trim() || undefined,
      });
      if (!res.ok) {
        setErrorMsg(mapError(res.error));
        return;
      }
      setSuccessMsg(
        "Gracias. Tu reseña quedó pendiente de moderación — la tienda la revisará antes de publicarla.",
      );
      setDisplayName("");
      setBuyerEmail("");
      setTitle("");
      setBody("");
      setRating(5);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-5 space-y-4"
    >
      <div>
        <p className="text-[14px] font-semibold text-ink-0">Escribí tu reseña</p>
        <p className="mt-1 text-[12px] text-ink-5">
          Tu reseña queda pendiente hasta que la tienda la apruebe. Sin spam,
          sin contenido inventado.
        </p>
      </div>

      <div className="space-y-2">
        <span className={labelCls}>Puntuación</span>
        <div className="inline-flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => {
            const filled = i <= (hoverRating || rating);
            return (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setHoverRating(i)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(i)}
                className="p-1 -m-1 rounded-[var(--r-xs)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
                aria-label={`${i} estrella${i === 1 ? "" : "s"}`}
                aria-pressed={i === rating}
              >
                <Star
                  className={cn(
                    "h-5 w-5 transition-colors",
                    filled
                      ? "fill-ink-0 text-ink-0"
                      : "text-ink-6",
                  )}
                  strokeWidth={1.5}
                />
              </button>
            );
          })}
          <span className="ml-2 text-[12px] text-ink-5 tabular-nums">
            {rating}/5
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <label className={labelCls} htmlFor="review-name">
          Tu nombre
        </label>
        <input
          id="review-name"
          required
          minLength={2}
          maxLength={60}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className={inputCls}
          placeholder="Juan P."
          autoComplete="name"
        />
      </div>

      <div className="space-y-2">
        <label className={labelCls} htmlFor="review-email">
          Email de la compra (opcional)
        </label>
        <input
          id="review-email"
          type="email"
          maxLength={200}
          value={buyerEmail}
          onChange={(e) => setBuyerEmail(e.target.value)}
          className={inputCls}
          placeholder="juan@ejemplo.com"
          autoComplete="email"
        />
        <p className="text-[11px] text-ink-5">
          Si lo dejás, verificamos que exista una compra tuya de este producto
          y tu reseña aparecerá con el badge{" "}
          <strong className="text-ink-3">Verificada</strong>. No se publica.
        </p>
      </div>

      <div className="space-y-2">
        <label className={labelCls} htmlFor="review-title">
          Título (opcional)
        </label>
        <input
          id="review-title"
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputCls}
          placeholder="Muy buena relación precio–calidad"
        />
      </div>

      <div className="space-y-2">
        <label className={labelCls} htmlFor="review-body">
          Tu reseña
        </label>
        <textarea
          id="review-body"
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={textareaCls}
          placeholder="Contanos qué te pareció el producto…"
        />
        <p className="text-[11px] text-ink-5 tabular-nums">
          {body.length}/2000
        </p>
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

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 h-10 w-full px-4 rounded-[var(--r-sm)] bg-ink-0 text-[12px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
        )}
        Enviar reseña
      </button>
    </form>
  );
}

function mapError(code: string | undefined): string {
  switch (code) {
    case "invalid_name":
      return "Completá tu nombre (2 a 60 caracteres).";
    case "invalid_rating":
      return "Elegí una puntuación entre 1 y 5 estrellas.";
    case "invalid_body":
      return "El comentario debe tener entre 10 y 2000 caracteres.";
    case "invalid_title":
      return "El título no puede superar los 120 caracteres.";
    case "invalid_email":
      return "El email ingresado es demasiado largo.";
    case "rate_limited":
      return "Ya enviaste una reseña para este producto recientemente. Intentá de nuevo más tarde.";
    case "app_not_active":
      return "Las reseñas no están habilitadas en esta tienda.";
    case "product_not_found":
    case "store_not_found":
      return "No pudimos encontrar el producto.";
    default:
      return "No se pudo enviar la reseña. Probá de nuevo en un rato.";
  }
}
