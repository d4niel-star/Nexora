"use client";

import { useState } from "react";
import { StorefrontProduct } from "@/types/storefront";
import { addToCart } from "@/lib/store-engine/cart/actions";
import { Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { storePath } from "@/lib/store-engine/urls";

// ─── Add To Cart Form ───
// Keeps every handler, state and server-action call identical to the prior
// implementation. Only the visual hierarchy was reworked: variants render as
// pill chips using token colors, stock lines read as a single hairline caption
// and stock scarcity is surfaced as a subtle signal line — no yellow alerts.

export function AddToCartForm({
  product,
  storeId,
  storeSlug,
}: {
  product: StorefrontProduct;
  storeId: string;
  storeSlug: string;
}) {
  const router = useRouter();
  const [selectedVariantId, setSelectedVariantId] = useState(
    product.variants[0]?.id || "",
  );

  const selectedVariant =
    product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddToCart = async () => {
    if (!selectedVariantId) return;
    setIsPending(true);
    setError(null);
    try {
      await addToCart(storeId, storeSlug, product.id, selectedVariantId, 1);
      router.push(storePath(storeSlug, "cart"));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No pudimos agregar el producto al carrito.",
      );
      setIsPending(false);
    }
  };

  const stockLabel = selectedVariant
    ? selectedVariant.inStock
      ? selectedVariant.allowBackorder
        ? "Disponible bajo pedido"
        : selectedVariant.availableStock > 0
          ? `Disponible · ${selectedVariant.availableStock} unidades`
          : "Disponible"
      : "Sin stock"
    : null;

  const isLowStock =
    selectedVariant?.inStock &&
    !selectedVariant.allowBackorder &&
    selectedVariant.availableStock > 0 &&
    selectedVariant.availableStock <= 5;

  return (
    <div className="mt-10">
      {/* Variants */}
      {product.variants.length > 1 && (
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
              Opciones
            </h2>
          </div>
          <fieldset className="mt-3">
            <legend className="sr-only">Elegí una variante</legend>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((variant) => {
                const isActive = selectedVariantId === variant.id;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedVariantId(variant.id)}
                    className={
                      "inline-flex h-11 min-w-[56px] items-center justify-center rounded-[var(--r-sm)] border px-4 text-[14px] font-medium transition-colors " +
                      (isActive
                        ? "border-ink-0 bg-ink-0 text-ink-12"
                        : "border-[color:var(--hairline-strong)] bg-transparent text-ink-0 hover:bg-ink-11")
                    }
                  >
                    {variant.values[0]}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
      )}

      {/* Stock line */}
      {stockLabel && (
        <div className="mt-8 flex items-center gap-2 text-[13px] text-ink-5">
          <span
            className={
              "h-1.5 w-1.5 rounded-full " +
              (selectedVariant?.inStock
                ? "bg-[var(--signal-success)]"
                : "bg-[var(--signal-danger)]")
            }
          />
          <span>{stockLabel}</span>
        </div>
      )}
      {isLowStock && (
        <p className="mt-1.5 text-[12px] text-[color:var(--signal-warning)]">
          Quedan pocas unidades.
        </p>
      )}

      {/* Primary CTA (desktop + mobile inline; mobile also has a sticky bar
          rendered at page level) */}
      <div className="mt-8 flex flex-col gap-3">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!selectedVariant?.inStock || isPending}
          className="inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-[var(--r-sm)] bg-ink-0 text-[15px] font-medium text-ink-12 transition-colors hover:bg-ink-2 active:translate-y-px disabled:bg-ink-8 disabled:text-ink-12 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
        >
          {isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Agregando…
            </>
          ) : selectedVariant?.inStock ? (
            "Agregar al carrito"
          ) : (
            "Sin stock"
          )}
        </button>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3.5 py-3 text-[13px] text-[color:var(--signal-danger)]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
