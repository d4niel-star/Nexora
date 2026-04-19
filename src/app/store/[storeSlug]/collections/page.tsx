import { getStoreCollections } from "@/lib/store-engine/catalog/queries";
import { getStorefrontData } from "@/lib/store-engine/queries";
import Link from "next/link";
import { notFound } from "next/navigation";
import { storePath } from "@/lib/store-engine/urls";

// ─── Collections index ───
// 3-column hairline tile grid matching FeaturedCategoriesSection styling so
// storefront navigation feels coherent. Empty state uses the canonical
// sunken surface.

export default async function CollectionsPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const resolvedParams = await params;
  const storefrontData = await getStorefrontData(resolvedParams.storeSlug);

  if (!storefrontData) notFound();

  const collections = await getStoreCollections(storefrontData.store.id);

  return (
    <div className="bg-[var(--surface-1)]">
      <div className="border-b border-[color:var(--hairline-strong)] bg-[var(--surface-0)]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-5">Catálogo</p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <header className="mb-12 max-w-2xl">
          <div className="mb-5 h-px w-10 bg-[var(--accent-500)]" aria-hidden />
          <h1 className="font-semibold text-[34px] leading-[1.05] tracking-[-0.035em] text-ink-0 sm:text-[44px]">
            Colecciones.
          </h1>
          <p className="mt-4 text-[14px] leading-[1.6] text-ink-5 sm:text-[15px]">
            Explorá todas nuestras colecciones de productos.
          </p>
        </header>

        {collections.length === 0 ? (
          <div className="rounded-[var(--r-xl)] border border-dashed border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-6 py-16 text-center shadow-[var(--shadow-soft)]">
            <h2 className="text-[15px] font-semibold text-ink-0">
              No hay colecciones publicadas.
            </h2>
            <p className="mt-2 text-[13px] text-ink-5">Volvé más tarde.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {collections.map((col) => (
              <Link
                key={col.id}
                href={storePath(resolvedParams.storeSlug, `collections/${col.handle}`)}
                className="group relative block aspect-[3/2] overflow-hidden rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-3)] shadow-[var(--shadow-soft)] transition-[border-color,box-shadow] hover:border-[color:var(--hairline-strong)] hover:shadow-[var(--shadow-elevated)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
              >
                {col.imageUrl ? (
                  <>
                    <img
                      src={col.imageUrl}
                      alt={col.title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-[600ms] ease-[var(--ease-out)] group-hover:scale-[1.04]"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(10,11,14,0) 40%, rgba(10,11,14,0.72) 100%)",
                      }}
                    />
                  </>
                ) : (
                  <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{ background: "var(--surface-3)" }}
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <h3
                    className={`font-semibold text-[22px] leading-[1.05] tracking-[-0.03em] sm:text-[26px] ${
                      col.imageUrl ? "text-ink-12" : "text-ink-0"
                    }`}
                  >
                    {col.title}
                  </h3>
                  <p
                    className={`mt-1.5 tabular text-[12px] ${
                      col.imageUrl ? "text-ink-12/70" : "text-ink-5"
                    }`}
                  >
                    {col.productCount} productos
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
