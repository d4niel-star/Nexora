import Link from "next/link";
import { StorefrontProduct } from "@/types/storefront";
import { formatCurrency } from "@/lib/utils";

export function ProductCard({ product, storeSlug }: { product: StorefrontProduct; storeSlug: string }) {
  return (
    <Link href={`/${storeSlug}/products/${product.handle}`} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-sm">
      <div className="aspect-[3/4] w-full overflow-hidden rounded-sm bg-gray-100 relative">
        <img
          src={product.featuredImage}
          alt={product.title}
          className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
        />
        {product.badges.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {product.badges.map(b => (
              <span key={b} className="inline-flex items-center rounded-sm bg-white px-2 py-1 text-[10px] uppercase font-black tracking-widest text-gray-900 shadow-sm">
                {b}
              </span>
            ))}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex justify-center pb-6">
           <span className="bg-white/90 backdrop-blur px-6 py-3 rounded-sm text-xs font-bold uppercase tracking-widest text-gray-900 shadow-sm">Vista rapida</span>
        </div>
      </div>
      <div className="mt-4 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">{product.title}</h3>
          <p className="mt-1 text-xs text-gray-500">{product.brand}</p>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <p className="text-sm font-bold text-gray-900">{formatCurrency(product.price)}</p>
          {product.compareAtPrice && (
            <p className="text-sm font-medium text-gray-400 line-through">{formatCurrency(product.compareAtPrice)}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
