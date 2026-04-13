import { getStoreProductByHandle, getRelatedProducts } from "@/lib/store-engine/catalog/queries";
import { getStorefrontData } from "@/lib/store-engine/queries";
import { ProductGallery } from "@/components/storefront/product/ProductGallery";
import { StorefrontProduct } from "@/types/storefront";
import { ProductCard } from "@/components/storefront/product/ProductCard";
import { AddToCartForm } from "@/components/storefront/product/AddToCartForm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default async function ProductPage({ params }: { params: Promise<{ storeSlug: string; handle: string }> }) {
  const resolvedParams = await params;
  const storefrontData = await getStorefrontData(resolvedParams.storeSlug);

  if (!storefrontData) {
    notFound();
  }

  const product = await getStoreProductByHandle(storefrontData.store.id, resolvedParams.handle);

  if (!product) {
    notFound();
  }

  // Fetch related products (limit 4)
  const relatedProducts = await getRelatedProducts(storefrontData.store.id, product.id, 4);

  const priceFormatted = new Intl.NumberFormat(storefrontData.store.locale, {
    style: "currency",
    currency: storefrontData.store.currency,
    maximumFractionDigits: 0,
  }).format(product.price);

  const compareAtFormatted = product.compareAtPrice ? new Intl.NumberFormat(storefrontData.store.locale, {
    style: "currency",
    currency: storefrontData.store.currency,
    maximumFractionDigits: 0,
  }).format(product.compareAtPrice) : null;

  return (
    <div className="bg-white">
      <div className="border-b border-gray-200">
        <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ol role="list" className="flex items-center space-x-4 py-4">
            <li>
              <div className="flex items-center">
                <Link href={`/${resolvedParams.storeSlug}`} className="mr-4 text-sm font-medium text-gray-900 hover:text-gray-600">
                  Inicio
                </Link>
                <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
              </div>
            </li>
            <li className="text-sm">
              <span className="font-medium text-gray-500" aria-current="page">
                {product.title}
              </span>
            </li>
          </ol>
        </nav>
      </div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-8">
          {/* Image gallery */}
          <ProductGallery images={product.images.length > 0 ? product.images : [product.featuredImage]} />

          {/* Product info */}
          <div className="mt-10 px-4 sm:px-0 lg:mt-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{product.title}</h1>

            <div className="mt-3">
              <h2 className="sr-only">Product information</h2>
              <div className="flex items-center gap-3">
                <p className="text-3xl font-bold tracking-tight text-gray-900">{priceFormatted}</p>
                {compareAtFormatted && (
                  <p className="text-xl font-medium tracking-tight text-gray-400 line-through">
                    {compareAtFormatted}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="sr-only">Description</h3>
              <div className="space-y-6 text-base text-gray-700" dangerouslySetInnerHTML={{ __html: product.description }} />
            </div>

            <AddToCartForm 
              product={product} 
              storeId={storefrontData.store.id} 
              storeSlug={resolvedParams.storeSlug} 
            />

            {/* Features list */}
            {product.features && product.features.length > 0 && (
              <div className="mt-10 pt-10 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900">Características</h3>
                <div className="mt-4 prose prose-sm text-gray-500">
                  <ul role="list">
                    {product.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-24 pt-16 border-t border-gray-200">
            <div className="flex items-center text-center justify-center mb-12">
               <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 text-center">También te puede interesar</h2>
            </div>
            <div className="grid grid-cols-1 gap-y-10 sm:grid-cols-2 gap-x-6 lg:grid-cols-4 xl:gap-x-8">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} storeSlug={resolvedParams.storeSlug} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
