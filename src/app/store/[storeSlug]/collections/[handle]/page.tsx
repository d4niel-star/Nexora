import { getStoreCollectionByHandle } from "@/lib/store-engine/catalog/queries";
import { getStorefrontData } from "@/lib/store-engine/queries";
import { ProductCard } from "@/components/storefront/product/ProductCard";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { storePath } from "@/lib/store-engine/urls";
import { Hairline } from "@/components/ui/primitives";

// ─── Collection detail ───
// Matches the PDP header styling for coherence: breadcrumb with chevron,
// hairline separator, display heading, tabular product count.

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ storeSlug: string; handle: string }>;
}) {
  const resolvedParams = await params;
  const storefrontData = await getStorefrontData(resolvedParams.storeSlug);
  if (!storefrontData) notFound();

  const result = await getStoreCollectionByHandle(
    storefrontData.store.id,
    resolvedParams.handle,
  );
  if (!result) notFound();

  const { collection, products } = result;

  return (
    <div className="bg-[var(--surface-1)]">
      <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ol role="list" className="flex items-center gap-2 py-5 text-[12px] text-ink-5">
          <li>
            <Link
              href={storePath(resolvedParams.storeSlug)}
              className="transition-colors hover:text-ink-0"
            >
              Inicio
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="h-3.5 w-3.5 text-ink-6" strokeWidth={1.75} />
          </li>
          <li>
            <Link
              href={storePath(resolvedParams.storeSlug, "collections")}
              className="transition-colors hover:text-ink-0"
            >
              Colecciones
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="h-3.5 w-3.5 text-ink-6" strokeWidth={1.75} />
          </li>
          <li className="truncate text-ink-0" aria-current="page">
            {collection.title}
          </li>
        </ol>
      </nav>

      <Hairline />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h1 className="font-semibold text-[36px] leading-[1.05] tracking-[-0.035em] text-ink-0 sm:text-[48px]">
              {collection.title}
            </h1>
            {collection.description && (
              <p className="mt-4 text-[14px] leading-[1.55] text-ink-5">
                {collection.description}
              </p>
            )}
          </div>
          <p className="tabular text-[13px] text-ink-5">
            {products.length} productos
          </p>
        </div>

        {products.length === 0 ? (
          <div className="rounded-[var(--r-md)] border border-dashed border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-6 py-16 text-center">
            <h2 className="text-[15px] font-medium text-ink-0">
              Esta colección no tiene productos.
            </h2>
            <p className="mt-2 text-[13px] text-ink-5">Volvé más tarde.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                storeSlug={resolvedParams.storeSlug}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
