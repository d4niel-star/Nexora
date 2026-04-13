import { getStoreCollections } from "@/lib/store-engine/catalog/queries";
import { getStorefrontData } from "@/lib/store-engine/queries";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function CollectionsPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const resolvedParams = await params;
  const storefrontData = await getStorefrontData(resolvedParams.storeSlug);

  if (!storefrontData) {
    notFound();
  }

  const collections = await getStoreCollections(storefrontData.store.id);

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Colecciones</h1>
        <p className="mt-4 max-w-xl text-sm text-gray-500">
          Explorá todas nuestras colecciones de productos.
        </p>

        {collections.length === 0 ? (
          <div className="mt-12 w-full p-12 bg-gray-50 border border-gray-100 rounded-xl text-center">
             <h2 className="text-lg font-medium text-gray-900">No hay colecciones publicadas</h2>
             <p className="mt-2 text-sm text-gray-500">Volvé más tarde.</p>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-y-10 sm:grid-cols-2 gap-x-6 lg:grid-cols-3 xl:gap-x-8">
            {collections.map((col) => (
              <Link
                key={col.id}
                href={`/${resolvedParams.storeSlug}/collections/${col.handle}`}
                className="group relative"
              >
                <div className="aspect-h-3 aspect-w-4 overflow-hidden rounded-lg bg-gray-100">
                  <img
                    src={col.imageUrl || "https://images.unsplash.com/photo-1615397323924-b1bce1087e5b?auto=format&fit=crop&q=80&w=800"}
                    alt={col.title}
                    className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent opacity-60" aria-hidden="true" />
                  <div className="absolute flex items-end p-6 inset-0">
                    <div>
                      <h3 className="text-xl font-bold text-white">{col.title}</h3>
                      <p className="mt-1 text-sm text-gray-300">{col.productCount} productos</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
