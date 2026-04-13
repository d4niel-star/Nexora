"use client";

import { CartItemType } from "@/types/cart";
import { updateCartItemQuantity, removeCartItem } from "@/lib/store-engine/cart/actions";
import { X, Loader2 } from "lucide-react";
import { useTransition } from "react";

function formatPrice(price: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

export function CartList({ items, storeSlug, currency, locale }: { items: CartItemType[], storeSlug: string, currency: string, locale: string }) {
  return (
    <>
      {items.map((item) => (
        <CartItem key={item.id} item={item} storeSlug={storeSlug} currency={currency} locale={locale} />
      ))}
    </>
  );
}

function CartItem({ item, storeSlug, currency, locale }: { item: CartItemType, storeSlug: string, currency: string, locale: string }) {
  const [isPending, startTransition] = useTransition();

  const handleUpdate = (newQuantity: number) => {
    startTransition(async () => {
      await updateCartItemQuantity(item.id, newQuantity, storeSlug);
    });
  };

  const handleRemove = () => {
    startTransition(async () => {
      await removeCartItem(item.id, storeSlug);
    });
  };

  return (
    <li className="flex py-6">
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
              className="font-medium text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
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
