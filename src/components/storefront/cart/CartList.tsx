"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertCircle, Loader2, Trash2, X } from "lucide-react";
import type { CartItemType, CartStockIssue } from "@/types/cart";
import { clearCart, removeCartItem, updateCartItemQuantity } from "@/lib/store-engine/cart/actions";

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
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-gray-500">
          {items.length} {items.length === 1 ? "producto" : "productos"} en el carrito
        </p>
        <button
          type="button"
          onClick={handleClear}
          disabled={clearPending}
          className="inline-flex items-center justify-center gap-2 rounded-sm border border-gray-200 px-3 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {clearPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Vaciar carrito
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <ul role="list" className="divide-y divide-gray-200 border-t border-b border-gray-200">
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
    <li className={`flex py-6 ${stockIssue ? "bg-red-50/40 px-3 sm:px-4" : ""}`}>
      <div className="flex-shrink-0">
        <div className="h-24 w-24 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
          {item.imageSnapshot ? (
            <img
              src={item.imageSnapshot}
              alt={item.titleSnapshot}
              className="h-full w-full object-cover object-center"
            />
          ) : (
            <span className="text-xs text-gray-400">Sin imagen</span>
          )}
        </div>
      </div>

      <div className="ml-4 flex flex-1 flex-col">
        <div>
          <div className="flex justify-between text-base font-medium text-gray-900">
            <h3 className="line-clamp-2 pr-4">{item.titleSnapshot}</h3>
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            ) : (
              <p className="ml-4 tabular-nums">{formatPrice(item.priceSnapshot * item.quantity, currency, locale)}</p>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">{item.variantTitleSnapshot}</p>
          {stockIssue && (
            <div className="mt-3 flex items-start gap-2 rounded-sm border border-red-200 bg-white px-3 py-2 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Pediste {stockIssue.requested}, pero quedan {stockIssue.available}. Ajusta la cantidad para continuar.
              </p>
            </div>
          )}
        </div>
        <div className="flex flex-1 items-end justify-between text-sm">
          <div className="flex items-center gap-3">
            <label htmlFor={`quantity-${item.id}`} className="sr-only">Cantidad, {item.titleSnapshot}</label>
            <select
              id={`quantity-${item.id}`}
              name={`quantity-${item.id}`}
              value={item.quantity}
              onChange={(e) => handleUpdate(Number(e.target.value))}
              disabled={isPending}
              className="max-w-full rounded-md border border-gray-300 py-1.5 text-left text-base font-medium leading-5 text-gray-700 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 sm:text-sm bg-white cursor-pointer disabled:opacity-50"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>

          <div className="flex">
            <button
              type="button"
              onClick={handleRemove}
              disabled={isPending}
              className="font-medium text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 rounded-sm"
            >
              <span className="sr-only">Eliminar</span>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
