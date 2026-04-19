import Link from "next/link";
import type { StorefrontCollection } from "@/types/storefront";
import { storePath } from "@/lib/store-engine/urls";

interface FeaturedCategoriesSectionProps {
  settings: Record<string, unknown>;
  storeSlug: string;
  collections?: StorefrontCollection[];
}

export function FeaturedCategoriesSection({
  settings,
  storeSlug,
  collections = [],
}: FeaturedCategoriesSectionProps) {
  const title = (settings.title as string) ?? "Categorías";
  const handles = (settings.collectionHandles as string[]) ?? [];

  if (collections.length === 0 && handles.length === 0) return null;

  return (
    <section className="border-y border-[color:var(--hairline-strong)] bg-[var(--surface-2)] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl sm:mb-12">
          <div className="mb-5 h-px w-10 bg-[var(--accent-500)]" aria-hidden />
          <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-5">
            {title}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {collections.map((col) => (
            <Link
              key={col.id}
              href={storePath(storeSlug, `collections/${col.handle}`)}
              className="group relative block aspect-[3/2] overflow-hidden rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-soft)] transition-[border-color,box-shadow] hover:border-[color:var(--hairline-strong)] hover:shadow-[var(--shadow-elevated)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
            >
              {col.imageUrl ? (
                <>
                  <img
                    src={col.imageUrl}
                    alt={col.title}
                    className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:opacity-95"
                  />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink-0/75 via-ink-0/25 to-transparent" />
                </>
              ) : (
                <div aria-hidden className="absolute inset-0 bg-[var(--surface-3)]" />
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
                  className={`mt-1.5 text-[12px] tabular ${
                    col.imageUrl ? "text-ink-12/75" : "text-ink-5"
                  }`}
                >
                  {col.productCount} productos
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
