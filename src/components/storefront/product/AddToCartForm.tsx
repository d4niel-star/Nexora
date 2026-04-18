"use client";

import { useState } from "react";
import { StorefrontProduct } from "@/types/storefront";
import { addToCart } from "@/lib/store-engine/cart/actions";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { storePath } from "@/lib/store-engine/urls";

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
    product.variants[0]?.id || ""
  );
  
  const selectedVariant = product.variants.find(v => v.id === selectedVariantId) || product.variants[0];
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
      setError(caughtError instanceof Error ? caughtError.message : "No pudimos agregar el producto al carrito.");
      setIsPending(false);
    }
  };

  return (
    <div className="mt-8">
      {/* Variants Selector */}
      {product.variants.length > 1 && (
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-900">Opciones</h2>
          </div>
          <fieldset className="mt-4">
            <legend className="sr-only">Choose a variant</legend>
            <div className="grid grid-cols-4 gap-4 sm:grid-cols-8 lg:grid-cols-4">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setSelectedVariantId(variant.id)}
                  className={`group relative flex cursor-pointer items-center justify-center rounded-sm border py-3 px-4 text-sm font-medium uppercase shadow-sm focus:outline-none sm:flex-1 transition-colors ${
                    selectedVariantId === variant.id
                      ? "ring-2 ring-gray-900 border-transparent bg-gray-900 text-white hover:bg-gray-800"
                      : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {variant.values[0]}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {/* Add to Cart Button */}
      <div className="mt-10 flex flex-col gap-2">
        {selectedVariant && (
          <p className={selectedVariant.inStock ? "text-sm font-medium text-emerald-700" : "text-sm font-medium text-gray-500"}>
            {selectedVariant.inStock
              ? selectedVariant.allowBackorder
                ? "Disponible bajo pedido"
                : selectedVariant.availableStock > 0
                  ? `Disponible: ${selectedVariant.availableStock} unidades`
                  : "Disponible"
              : "Sin stock"}
          </p>
        )}
        <button
          type="button"
          onClick={handleAddToCart}
          className="flex max-w-xs flex-1 items-center justify-center gap-2 rounded-sm border border-transparent bg-gray-900 px-8 py-4 text-base font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 focus:ring-offset-gray-50 sm:w-full transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          disabled={!selectedVariant?.inStock || isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Agregando...
            </>
          ) : selectedVariant?.inStock ? (
            "Agregar al carrito"
          ) : (
            "Agotado"
          )}
        </button>
        {selectedVariant?.inStock && selectedVariant.availableStock > 0 && selectedVariant.availableStock <= 5 && (
           <p className="text-sm font-medium text-amber-600">
             ¡Solo quedan {selectedVariant.availableStock} disponibles!
           </p>
        )}
        {error && (
          <p className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
