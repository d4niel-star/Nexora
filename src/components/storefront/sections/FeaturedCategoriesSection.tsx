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
    <div className="bg-gray-50 py-24 sm:py-32 border-y border-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-12">
          {title}
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((col) => (
            <Link
              key={col.id}
              href={storePath(storeSlug, `collections/${col.handle}`)}
              className="group relative overflow-hidden rounded-xl aspect-[4/3] bg-gray-200 shadow-sm"
            >
              {col.imageUrl ? (
                <img
                  src={col.imageUrl}
                  alt={col.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Sin imagen</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="text-lg font-extrabold text-white">
                  {col.title}
                </h3>
                <p className="mt-1 text-sm font-medium text-white/80">
                  {col.productCount} productos
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
