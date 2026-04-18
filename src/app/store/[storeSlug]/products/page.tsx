import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/storefront/product/ProductCard";
import { getStoreProducts } from "@/lib/store-engine/catalog/queries";
import { getStorefrontData } from "@/lib/store-engine/queries";
import { toMetaDescription } from "@/lib/store-engine/seo";
import { storePath } from "@/lib/store-engine/urls";
import { Hairline } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

// ─── Products (PLP) ───
// Breadcrumb + hairline separator + sober category pill row. Category chips
// are rectangular (matching the global radius tokens) and use inverted ink
// fill for the active state.

type ProductsPageProps = {
  params: Promise<{ storeSlug: string }>;
  searchParams?: Promise<{ category?: string }>;
};

export async function generateMetadata({
  params,
}: ProductsPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const storefrontData = await getStorefrontData(resolvedParams.storeSlug);

  if (!storefrontData) return { title: "Productos" };

  const products = await getStoreProducts(storefrontData.store.id);
  const categories = Array.from(
    new Set(
      products
        .map((p) => p.category)
        .filter((c): c is string => Boolean(c)),
    ),
  );
  const realFallback =
    products.length > 0
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
      images: storefrontData.store.logo
        ? [{ url: storefrontData.store.logo, alt: storefrontData.store.name }]
        : undefined,
    },
  };
}

export default async function ProductsPage({
  params,
  searchParams,
}: ProductsPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const storefrontData = await getStorefrontData(resolvedParams.storeSlug);
  if (!storefrontData) notFound();

  const selectedCategory = resolvedSearchParams.category?.trim();
  const products = await getStoreProducts(storefrontData.store.id);
  const categories = Array.from(
    new Set(
      products
        .map((p) => p.category)
        .filter((c): c is string => Boolean(c)),
    ),
  ).sort((a, b) => a.localeCompare(b));
  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category === selectedCategory)
    : products;

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
          <li className="text-ink-0" aria-current="page">
            Productos
          </li>
        </ol>
      </nav>

      <Hairline />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 border-b border-[color:var(--hairline)] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-5">
              {storefrontData.store.name}
            </p>
            <h1 className="mt-3 font-semibold text-[36px] leading-[1.05] tracking-[-0.035em] text-ink-0 sm:text-[48px]">
              Productos.
            </h1>
            <p className="mt-4 text-[14px] leading-[1.55] text-ink-5">
              {storefrontData.store.description ??
                "Explora los productos disponibles de esta tienda."}
            </p>
          </div>
          <p className="tabular text-[13px] text-ink-5">
            {filteredProducts.length} de {products.length} productos
          </p>
        </header>

        {categories.length > 0 && (
          <div
            className="mb-10 flex gap-2 overflow-x-auto pb-2"
            aria-label="Filtros por categoría"
          >
            <Link
              href={storePath(resolvedParams.storeSlug, "products")}
              className={cn(
                "shrink-0 rounded-[var(--r-sm)] border px-3.5 h-9 inline-flex items-center text-[13px] font-medium transition-colors",
                !selectedCategory
                  ? "border-ink-0 bg-ink-0 text-ink-12"
                  : "border-[color:var(--hairline-strong)] bg-transparent text-ink-3 hover:bg-ink-11 hover:text-ink-0",
              )}
            >
              Todos
            </Link>
            {categories.map((category) => {
              const isActive = selectedCategory === category;
              return (
                <Link
                  key={category}
                  href={`${storePath(resolvedParams.storeSlug, "products")}?category=${encodeURIComponent(category)}`}
                  className={cn(
                    "shrink-0 rounded-[var(--r-sm)] border px-3.5 h-9 inline-flex items-center text-[13px] font-medium transition-colors",
                    isActive
                      ? "border-ink-0 bg-ink-0 text-ink-12"
                      : "border-[color:var(--hairline-strong)] bg-transparent text-ink-3 hover:bg-ink-11 hover:text-ink-0",
                  )}
                >
                  {category}
                </Link>
              );
            })}
          </div>
        )}

        {products.length === 0 ? (
          <div className="rounded-[var(--r-md)] border border-dashed border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-6 py-16 text-center">
            <h2 className="text-[15px] font-medium text-ink-0">
              No hay productos disponibles.
            </h2>
            <p className="mt-2 text-[13px] text-ink-5">
              Esta tienda todavía no tiene productos activos con stock.
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-[var(--r-md)] border border-dashed border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-6 py-16 text-center">
            <h2 className="text-[15px] font-medium text-ink-0">
              Sin productos en esta categoría.
            </h2>
            <p className="mt-2 text-[13px] text-ink-5">
              Probá con otro filtro o volvé al catálogo completo.
            </p>
            <Link
              href={storePath(resolvedParams.storeSlug, "products")}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-[var(--r-sm)] bg-ink-0 px-5 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2"
            >
              Ver todos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
            {filteredProducts.map((product) => (
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
