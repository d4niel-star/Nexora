import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/storefront/product/ProductCard";
import { getStoreProducts } from "@/lib/store-engine/catalog/queries";
import { getStorefrontData } from "@/lib/store-engine/queries";
import { toMetaDescription } from "@/lib/store-engine/seo";
import { storePath } from "@/lib/store-engine/urls";

type ProductsPageProps = {
  params: Promise<{ storeSlug: string }>;
  searchParams?: Promise<{ category?: string }>;
};

export async function generateMetadata({ params }: ProductsPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const storefrontData = await getStorefrontData(resolvedParams.storeSlug);

  if (!storefrontData) {
    return {
      title: "Productos",
    };
  }

  const products = await getStoreProducts(storefrontData.store.id);
  const categories = Array.from(
    new Set(products.map((product) => product.category).filter((category): category is string => Boolean(category))),
  );
  const realFallback = products.length > 0
    ? `Explora ${products.length} productos activos de ${storefrontData.store.name}${categories.length > 0 ? `: ${categories.slice(0, 3).join(", ")}` : ""}.`
    : `Productos activos de ${storefrontData.store.name}.`;
  const description = toMetaDescription(
    storefrontData.store.description,
    realFallback,
  );

  return {
    title: `Productos | ${storefrontData.store.name}`,
    description,
    openGraph: {
      title: `Productos | ${storefrontData.store.name}`,
      description,
      images: storefrontData.store.logo ? [{ url: storefrontData.store.logo, alt: storefrontData.store.name }] : undefined,
    },
  };
}

export default async function ProductsPage({ params, searchParams }: ProductsPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const storefrontData = await getStorefrontData(resolvedParams.storeSlug);

  if (!storefrontData) {
    notFound();
  }

  const selectedCategory = resolvedSearchParams.category?.trim();
  const products = await getStoreProducts(storefrontData.store.id);
  const categories = Array.from(
    new Set(products.map((product) => product.category).filter((category): category is string => Boolean(category))),
  ).sort((a, b) => a.localeCompare(b));
  const filteredProducts = selectedCategory
    ? products.filter((product) => product.category === selectedCategory)
    : products;

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex items-center gap-2 text-sm font-medium text-gray-500">
            <li>
              <Link href={storePath(resolvedParams.storeSlug)} className="hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-sm">
                Inicio
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-gray-900" aria-current="page">
              Productos
            </li>
          </ol>
        </nav>

        <div className="flex flex-col gap-6 border-b border-gray-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
              {storefrontData.store.name}
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Productos
            </h1>
            <p className="mt-4 text-sm leading-6 text-gray-500">
              {storefrontData.store.description ?? "Explora los productos disponibles de esta tienda."}
            </p>
          </div>
          <p className="text-sm font-medium text-gray-500">
            {filteredProducts.length} de {products.length} productos disponibles
          </p>
        </div>

        {categories.length > 0 && (
          <div className="mt-8 flex gap-2 overflow-x-auto pb-2" aria-label="Filtros por categoria">
            <Link
              href={storePath(resolvedParams.storeSlug, "products")}
              className={`shrink-0 rounded-sm border px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                !selectedCategory ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-600 hover:border-gray-900 hover:text-gray-900"
              }`}
            >
              Todos
            </Link>
            {categories.map((category) => (
              <Link
                key={category}
                href={`${storePath(resolvedParams.storeSlug, "products")}?category=${encodeURIComponent(category)}`}
                className={`shrink-0 rounded-sm border px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                  selectedCategory === category ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-600 hover:border-gray-900 hover:text-gray-900"
                }`}
              >
                {category}
              </Link>
            ))}
          </div>
        )}

        {products.length === 0 ? (
          <div className="mt-12 rounded-sm border border-gray-200 bg-gray-50 px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-gray-900">No hay productos disponibles</h2>
            <p className="mt-2 text-sm text-gray-500">Esta tienda todavia no tiene productos activos con stock.</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="mt-12 rounded-sm border border-gray-200 bg-gray-50 px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-gray-900">No encontramos productos en esta categoria</h2>
            <p className="mt-2 text-sm text-gray-500">Proba con otro filtro o volve al catalogo completo.</p>
            <Link
              href={storePath(resolvedParams.storeSlug, "products")}
              className="mt-6 inline-flex rounded-sm bg-gray-900 px-5 py-3 text-sm font-bold text-white hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            >
              Ver todos
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} storeSlug={resolvedParams.storeSlug} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
