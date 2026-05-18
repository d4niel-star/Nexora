import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/storefront/product/ProductCard";
import { getStoreProducts } from "@/lib/store-engine/catalog/queries";
import { getStorefrontData } from "@/lib/store-engine/queries";
import { toMetaDescription } from "@/lib/store-engine/seo";
import { storePath } from "@/lib/store-engine/urls";
import { cn } from "@/lib/utils";

// ─── Products (PLP) ───
// Breadcrumb + hairline separator + sober category pill row. Category chips
// are rectangular (matching the global radius tokens) and use inverted ink
// fill for the active state.

type ProductsPageProps = {
  params: Promise<{ storeSlug: string }>;
  searchParams?: Promise<{
    category?: string;
    q?: string;
    sort?: string;
    minPrice?: string;
    maxPrice?: string;
    sale?: string;
  }>;
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
  const searchQuery = resolvedSearchParams.q?.trim();
  const sortBy = resolvedSearchParams.sort ?? "newest";
  const minPrice = resolvedSearchParams.minPrice ? parseFloat(resolvedSearchParams.minPrice) : undefined;
  const maxPrice = resolvedSearchParams.maxPrice ? parseFloat(resolvedSearchParams.maxPrice) : undefined;
  const onlySale = resolvedSearchParams.sale === "1";

  const allProducts = await getStoreProducts(storefrontData.store.id);
  const categories = Array.from(
    new Set(
      allProducts
        .map((p) => p.category)
        .filter((c): c is string => Boolean(c)),
    ),
  ).sort((a, b) => a.localeCompare(b));

  let filteredProducts = allProducts;
  if (selectedCategory) filteredProducts = filteredProducts.filter((p) => p.category === selectedCategory);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredProducts = filteredProducts.filter((p) => p.title.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q));
  }
  if (minPrice !== undefined) filteredProducts = filteredProducts.filter((p) => p.price >= minPrice);
  if (maxPrice !== undefined) filteredProducts = filteredProducts.filter((p) => p.price <= maxPrice);
  if (onlySale) filteredProducts = filteredProducts.filter((p) => p.compareAtPrice && p.compareAtPrice > p.price);

  // Sort
  if (sortBy === "price_asc") filteredProducts.sort((a, b) => a.price - b.price);
  else if (sortBy === "price_desc") filteredProducts.sort((a, b) => b.price - a.price);
  else if (sortBy === "name") filteredProducts.sort((a, b) => a.title.localeCompare(b.title));
  // default: newest (already sorted by createdAt desc)

  const hasActiveFilters = !!(selectedCategory || searchQuery || minPrice !== undefined || maxPrice !== undefined || onlySale);
  const products = allProducts;

  return (
    <div className="bg-[var(--surface-1)]">
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
          <li className="text-ink-0" aria-current="page">
            Productos
          </li>
        </ol>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <header className="mb-10 flex flex-col gap-4 border-b border-[color:var(--hairline)] pb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-5">
              {storefrontData.store.name}
            </p>
            <h1 className="mt-3 font-semibold text-[34px] leading-[1.05] tracking-[-0.035em] text-ink-0 sm:text-[44px]">
              Productos.
            </h1>
            <p className="mt-4 text-[14px] leading-[1.55] text-ink-5">
              {storefrontData.store.description ??
                "Explora los productos disponibles de esta tienda."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              defaultValue={sortBy}
              className="h-11 rounded-[var(--r-md)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-3 text-[13px] text-ink-0 outline-none focus-visible:shadow-[var(--shadow-focus)]"
              onChange={() => {/* Client-side JS will handle this */}}
              data-sort-select
            >
              <option value="newest">Más recientes</option>
              <option value="price_asc">Menor precio</option>
              <option value="price_desc">Mayor precio</option>
              <option value="name">Nombre A-Z</option>
            </select>
            <p className="tabular text-[13px] text-ink-5">
              {filteredProducts.length} de {products.length}
            </p>
          </div>
        </header>

        {hasActiveFilters && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-3 py-1.5 text-[12px] font-medium text-ink-0">
                &ldquo;{searchQuery}&rdquo;
                <Link href={storePath(resolvedParams.storeSlug, "products")} className="text-ink-5 hover:text-ink-0">×</Link>
              </span>
            )}
            {selectedCategory && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-3 py-1.5 text-[12px] font-medium text-ink-0">
                {selectedCategory}
                <Link href={storePath(resolvedParams.storeSlug, "products")} className="text-ink-5 hover:text-ink-0">×</Link>
              </span>
            )}
            {onlySale && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-3 py-1.5 text-[12px] font-medium text-ink-0">
                En oferta
              </span>
            )}
            <Link href={storePath(resolvedParams.storeSlug, "products")} className="text-[12px] font-medium text-ink-5 hover:text-ink-0 transition-colors">
              Limpiar filtros
            </Link>
          </div>
        )}

        {categories.length > 0 && (
          <div
            className="mb-10 flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Filtros por categoría"
          >
            <Link
              href={storePath(resolvedParams.storeSlug, "products")}
              className={cn(
                "inline-flex h-11 min-h-11 shrink-0 items-center rounded-[var(--r-md)] border px-4 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
                !selectedCategory
                  ? "border-ink-0 bg-ink-0 text-ink-12"
                  : "border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-ink-4 hover:bg-[var(--surface-2)] hover:text-ink-0",
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
                    "inline-flex h-11 min-h-11 shrink-0 items-center rounded-[var(--r-md)] border px-4 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
                    isActive
                      ? "border-ink-0 bg-ink-0 text-ink-12"
                      : "border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-ink-4 hover:bg-[var(--surface-2)] hover:text-ink-0",
                  )}
                >
                  {category}
                </Link>
              );
            })}
          </div>
        )}

        {products.length === 0 ? (
          <div className="rounded-[var(--r-xl)] border border-dashed border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-6 py-16 text-center shadow-[var(--shadow-soft)]">
            <h2 className="text-[15px] font-semibold text-ink-0">
              No hay productos disponibles.
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-5">
              Esta tienda todavía no tiene productos activos con stock.
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-[var(--r-xl)] border border-dashed border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-6 py-16 text-center shadow-[var(--shadow-soft)]">
            <h2 className="text-[15px] font-semibold text-ink-0">
              Sin productos en esta categoría.
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-5">
              Probá con otro filtro o volvé al catálogo completo.
            </p>
            <Link
              href={storePath(resolvedParams.storeSlug, "products")}
              className="mt-6 inline-flex h-12 min-h-12 items-center justify-center rounded-[var(--r-md)] bg-ink-0 px-6 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
            >
              Ver todos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-7">
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
