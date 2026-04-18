import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/storefront/product/ProductCard";
import { StorefrontProduct } from "@/types/storefront";
import { storePath } from "@/lib/store-engine/urls";

export function FeaturedProductsSection({ 
  settings, 
  products, 
  storeSlug 
}: { 
  settings: Record<string, any>; 
  products: StorefrontProduct[]; 
  storeSlug: string 
}) {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">{settings.title}</h2>
            {settings.subtitle && <p className="mt-2 text-sm font-medium text-gray-500">{settings.subtitle}</p>}
          </div>
          <Link href={storePath(storeSlug, "collections")} className="hidden sm:flex text-sm font-bold uppercase tracking-widest text-gray-900 items-center gap-2 hover:text-gray-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-sm">
            Ver colección <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-y-10 sm:grid-cols-2 gap-x-6 lg:grid-cols-4 xl:gap-x-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} storeSlug={storeSlug} />
          ))}
        </div>
        
        <div className="mt-12 flex justify-center sm:hidden">
          <Link href={storePath(storeSlug, "collections")} className="flex w-full items-center justify-center rounded-sm border border-gray-300 bg-white px-8 py-3.5 text-sm font-extrabold uppercase tracking-widest text-gray-900 shadow-sm hover:bg-gray-50">
            Ver todo
          </Link>
        </div>
      </div>
    </div>
  );
}
