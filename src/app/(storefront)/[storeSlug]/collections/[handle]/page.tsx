import { getStoreCollectionByHandle } from "@/lib/store-engine/catalog/queries";
import { getStorefrontData } from "@/lib/store-engine/queries";
import { ProductCard } from "@/components/storefront/product/ProductCard";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default async function CollectionPage({ params }: { params: Promise<{ storeSlug: string; handle: string }> }) {
  const resolvedParams = await params;
  const storefrontData = await getStorefrontData(resolvedParams.storeSlug);

  if (!storefrontData) {
    notFound();
  }

  const result = await getStoreCollectionByHandle(storefrontData.store.id, resolvedParams.handle);

  if (!result) {
    notFound();
  }

  const { collection, products } = result;

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
            <li>
              <div className="flex items-center">
                <Link href={`/${resolvedParams.storeSlug}/collections`} className="mr-4 text-sm font-medium text-gray-900 hover:text-gray-600">
                  Colecciones
                </Link>
                <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
              </div>
            </li>
            <li className="text-sm">
              <span className="font-medium text-gray-500" aria-current="page">
                {collection.title}
              </span>
            </li>
          </ol>
        </nav>
      </div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="flex flex-col md:flex-row md:items-baseline md:justify-between mb-10">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">{collection.title}</h1>
            {collection.description && <p className="mt-4 max-w-xl text-base text-gray-500">{collection.description}</p>}
          </div>
          <p className="mt-4 md:mt-0 text-sm text-gray-500">{products.length} productos</p>
        </div>

        {products.length === 0 ? (
          <div className="w-full py-24 bg-gray-50 border border-gray-100 rounded-xl text-center">
             <h2 className="text-lg font-medium text-gray-900">Esta colección no tiene productos</h2>
             <p className="mt-2 text-sm text-gray-500">Volvé más tarde.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} storeSlug={resolvedParams.storeSlug} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
