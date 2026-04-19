"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertCircle, Loader2, Minus, Plus, Trash2, X } from "lucide-react";
import type { CartItemType, CartStockIssue } from "@/types/cart";
import {
  clearCart,
  removeCartItem,
  updateCartItemQuantity,
} from "@/lib/store-engine/cart/actions";

// ─── Cart List ───
// Same state machine, same actions, same server calls. Visual rewrite only:
//  · divide-y swapped for hairline token dividers
//  · native <select> replaced by a stepper (−/+ buttons) so the control
//    matches the premium feel on mobile and desktop
//  · stock issues surfaced as hairline cards, not loud red washes

function formatPrice(price: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No pudimos actualizar el carrito.";
}

export function CartList({
  items,
  storeSlug,
  currency,
  locale,
  stockIssues = [],
}: {
  items: CartItemType[];
  storeSlug: string;
  currency: string;
  locale: string;
  stockIssues?: CartStockIssue[];
}) {
  const [clearPending, startClearTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const issueByItemId = useMemo(
    () => new Map(stockIssues.map((issue) => [issue.itemId, issue])),
    [stockIssues],
  );

  const handleClear = () => {
    if (!window.confirm("¿Vaciar todo el carrito?")) return;

    startClearTransition(async () => {
      setError(null);
      try {
        await clearCart(storeSlug);
      } catch (caughtError) {
        setError(getErrorMessage(caughtError));
      }
    });
  };

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-ink-5">
          {items.length} {items.length === 1 ? "producto" : "productos"} en el
          carrito
        </p>
        <button
          type="button"
          onClick={handleClear}
          disabled={clearPending}
          className="inline-flex h-11 min-h-11 items-center gap-1.5 self-start rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3.5 text-[12px] font-medium text-ink-5 transition-colors hover:border-[color:var(--hairline-strong)] hover:bg-[var(--surface-2)] hover:text-ink-0 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] sm:self-auto"
        >
          {clearPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
          )}
          Vaciar carrito
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3.5 py-3 text-[13px] text-[color:var(--signal-danger)]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          <p>{error}</p>
        </div>
      )}

      <ul
        role="list"
        className="divide-y divide-[color:var(--hairline)] overflow-hidden rounded-[var(--r-xl)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-soft)]"
      >
        {items.map((item) => (
          <CartItem
            key={item.id}
            item={item}
            storeSlug={storeSlug}
            currency={currency}
            locale={locale}
            stockIssue={issueByItemId.get(item.id)}
            onError={setError}
          />
        ))}
      </ul>
    </>
  );
}

function CartItem({
  item,
  storeSlug,
  currency,
  locale,
  stockIssue,
  onError,
}: {
  item: CartItemType;
  storeSlug: string;
  currency: string;
  locale: string;
  stockIssue?: CartStockIssue;
  onError: (message: string | null) => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleUpdate = (newQuantity: number) => {
    if (newQuantity < 1) return;
    startTransition(async () => {
      onError(null);
      try {
        await updateCartItemQuantity(item.id, newQuantity, storeSlug);
      } catch (caughtError) {
        onError(getErrorMessage(caughtError));
      }
    });
  };

  const handleRemove = () => {
    startTransition(async () => {
      onError(null);
      try {
        await removeCartItem(item.id, storeSlug);
      } catch (caughtError) {
        onError(getErrorMessage(caughtError));
      }
    });
  };

  return (
    <li className="flex gap-4 px-4 py-5 sm:gap-5 sm:px-6 sm:py-6">
      {/* Thumb */}
      <div className="h-24 w-20 shrink-0 overflow-hidden rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-2)] sm:h-28 sm:w-24">
        {item.imageSnapshot ? (
          <img
            src={item.imageSnapshot}
            alt={item.titleSnapshot}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-[10px] text-ink-6">Sin imagen</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-[15px] font-medium text-ink-0">
              {item.titleSnapshot}
            </h3>
            {item.variantTitleSnapshot && (
              <p className="mt-1 text-[12px] text-ink-5">
                {item.variantTitleSnapshot}
              </p>
            )}
          </div>
          <div className="text-right">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin text-ink-6" />
            ) : (
              <p className="tabular text-[15px] font-medium text-ink-0">
                {formatPrice(item.priceSnapshot * item.quantity, currency, locale)}
              </p>
            )}
          </div>
        </div>

        {stockIssue && (
          <div
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-[var(--r-md)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-3 py-2 text-[12px] text-[color:var(--signal-danger)]"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            <p>
              Pediste {stockIssue.requested}, pero quedan {stockIssue.available}.
              Ajustá la cantidad para continuar.
            </p>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-4">
          {/* Stepper */}
          <div className="inline-flex h-11 items-center rounded-[var(--r-md)] border border-[color:var(--hairline-strong)] bg-[var(--surface-1)]">
            <button
              type="button"
              onClick={() => handleUpdate(item.quantity - 1)}
              disabled={isPending || item.quantity <= 1}
              aria-label="Reducir cantidad"
              className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--r-md)] text-ink-3 transition-colors hover:bg-ink-11 hover:text-ink-0 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
            >
              <Minus className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            <span className="tabular w-8 text-center text-[14px] font-medium text-ink-0">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => handleUpdate(item.quantity + 1)}
              disabled={isPending}
              aria-label="Aumentar cantidad"
              className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--r-md)] text-ink-3 transition-colors hover:bg-ink-11 hover:text-ink-0 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            aria-label="Eliminar del carrito"
            className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--r-md)] text-ink-5 transition-colors hover:bg-ink-11 hover:text-[color:var(--signal-danger)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </li>
  );
}
