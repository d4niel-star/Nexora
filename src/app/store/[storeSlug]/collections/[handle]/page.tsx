import { getStoreCollectionByHandle } from "@/lib/store-engine/catalog/queries";
import { getStorefrontData } from "@/lib/store-engine/queries";
import { ProductCard } from "@/components/storefront/product/ProductCard";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { storePath } from "@/lib/store-engine/urls";

// ─── Collection Detail Pro ───
// Improved header hierarchy, product count badge, better grid spacing,
// and premium empty state with illustration icon.

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
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="border-b border-[color:var(--hairline-strong)] bg-[var(--surface-0)]">
        <ol
          role="list"
          className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-4 text-[12px] text-ink-5 sm:px-6 lg:px-8"
        >
          <li>
            <Link
              href={storePath(resolvedParams.storeSlug)}
              className="rounded-[var(--r-xs)] transition-colors hover:text-ink-0 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
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
              className="rounded-[var(--r-xs)] transition-colors hover:text-ink-0 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
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

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {/* Collection header */}
        <div className="mb-10 border-b border-[color:var(--hairline)] pb-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <h1 className="font-bold text-[34px] leading-[1.05] tracking-[-0.035em] text-ink-0 sm:text-[44px]">
                {collection.title}
              </h1>
              {collection.description && (
                <p className="mt-4 max-w-xl text-[15px] leading-[1.6] text-ink-4">
                  {collection.description}
                </p>
              )}
            </div>
            {/* Product count badge */}
            <span className="inline-flex h-8 items-center gap-1.5 self-start rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3 text-[12px] font-medium text-ink-4 sm:self-auto">
              <Package className="h-3.5 w-3.5" strokeWidth={1.75} />
              {products.length} {products.length === 1 ? "producto" : "productos"}
            </span>
          </div>
        </div>

        {/* Product grid or empty state */}
        {products.length === 0 ? (
          <div className="flex flex-col items-center rounded-[var(--r-xl)] border border-dashed border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-6 py-20 text-center shadow-[var(--shadow-soft)]">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-2)]">
              <Package className="h-6 w-6 text-ink-5" strokeWidth={1.5} />
            </div>
            <h2 className="mt-5 text-[16px] font-semibold text-ink-0">
              Esta colección aún no tiene productos.
            </h2>
            <p className="mt-2 max-w-sm text-[14px] leading-[1.5] text-ink-5">
              Volvé más tarde o explorá el resto del catálogo.
            </p>
            <Link
              href={storePath(resolvedParams.storeSlug, "products")}
              className="mt-6 inline-flex h-10 items-center justify-center rounded-[var(--r-md)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-5 text-[13px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-1)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
            >
              Ver todos los productos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-7">
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
