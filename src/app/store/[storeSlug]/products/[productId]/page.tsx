import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getStoreProductByIdentifier, getRelatedProducts } from "@/lib/store-engine/catalog/queries";
import { getStorefrontData } from "@/lib/store-engine/queries";
import { ProductGallery } from "@/components/storefront/product/ProductGallery";
import { ProductCard } from "@/components/storefront/product/ProductCard";
import { AddToCartForm } from "@/components/storefront/product/AddToCartForm";
import { toMetaDescription, toPlainText } from "@/lib/store-engine/seo";
import { storePath } from "@/lib/store-engine/urls";
import { prisma } from "@/lib/db/prisma";
import {
  getApprovedReviewAggregate,
  listApprovedReviews,
} from "@/lib/apps/product-reviews/queries";
import { ProductReviewsBlock } from "@/components/storefront/reviews/ProductReviewsBlock";

type ProductPageProps = {
  params: Promise<{ storeSlug: string; productId: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const storefrontData = await getStorefrontData(resolvedParams.storeSlug);

  if (!storefrontData) {
    return {
      title: "Producto no encontrado",
    };
  }

  const product = await getStoreProductByIdentifier(storefrontData.store.id, resolvedParams.productId);

  if (!product) {
    return {
      title: `Producto no encontrado | ${storefrontData.store.name}`,
      description: toMetaDescription(storefrontData.store.description, storefrontData.store.name),
    };
  }

  const description = toMetaDescription(
    product.description,
    storefrontData.store.description ?? product.title,
  );

  return {
    title: `${product.title} | ${storefrontData.store.name}`,
    description,
    openGraph: {
      title: `${product.title} | ${storefrontData.store.name}`,
      description,
      images: product.featuredImage ? [{ url: product.featuredImage, alt: product.title }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const resolvedParams = await params;
  const storefrontData = await getStorefrontData(resolvedParams.storeSlug);

  if (!storefrontData) {
    notFound();
  }

  const product = await getStoreProductByIdentifier(storefrontData.store.id, resolvedParams.productId);

  if (!product) {
    notFound();
  }

  const relatedProducts = await getRelatedProducts(storefrontData.store.id, product.id, 4);

  const priceFormatted = new Intl.NumberFormat(storefrontData.store.locale, {
    style: "currency",
    currency: storefrontData.store.currency,
    maximumFractionDigits: 0,
  }).format(product.price);

  const compareAtFormatted =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? new Intl.NumberFormat(storefrontData.store.locale, {
          style: "currency",
          currency: storefrontData.store.currency,
          maximumFractionDigits: 0,
        }).format(product.compareAtPrice)
      : null;

  const discountPct =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(100 - (product.price / product.compareAtPrice) * 100)
      : null;

  const galleryImages = (product.images.length > 0 ? product.images : [product.featuredImage]).filter(Boolean);

  // ─── Product reviews (only if the app is installed + active) ───
  // Fail-closed: if the lookup errors, treat the app as off and skip the
  // block entirely so PDP never crashes because of reviews.
  let reviewsEnabled = false;
  try {
    const install = await prisma.installedApp.findUnique({
      where: {
        storeId_appSlug: {
          storeId: storefrontData.store.id,
          appSlug: "product-reviews",
        },
      },
      select: { status: true },
    });
    reviewsEnabled = install?.status === "active";
  } catch {
    reviewsEnabled = false;
  }

  const [approvedReviews, reviewAggregate] = reviewsEnabled
    ? await Promise.all([
        listApprovedReviews(storefrontData.store.id, product.id, 20),
        getApprovedReviewAggregate(storefrontData.store.id, product.id),
      ])
    : [[], { count: 0, averageRating: null as number | null }];

  // ─── JSON-LD Product schema ───
  // aggregateRating ONLY when we have real approved reviews. Never fake.
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const productUrl = `${appUrl}${storePath(resolvedParams.storeSlug, `/products/${product.handle || product.id}`)}`;
  const productJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: toPlainText(product.description || product.title),
    image: galleryImages.length > 0 ? galleryImages : undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    url: productUrl,
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: storefrontData.store.currency,
      price: product.price.toFixed(2),
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
  if (
    reviewsEnabled &&
    reviewAggregate.count > 0 &&
    reviewAggregate.averageRating != null
  ) {
    productJsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: reviewAggregate.averageRating.toFixed(1),
      reviewCount: reviewAggregate.count,
      bestRating: "5",
      worstRating: "1",
    };
  }

  return (
    <div className="bg-[var(--surface-1)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

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
          <li className="truncate text-ink-0" aria-current="page">
            {product.title}
          </li>
        </ol>
      </nav>

      <main className="mx-auto max-w-7xl px-4 pb-32 pt-8 sm:px-6 sm:pb-16 lg:px-8 lg:pt-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-14 xl:gap-16">
          {/* Gallery */}
          <ProductGallery images={galleryImages} />

          {/* Info */}
          <div className="flex flex-col rounded-[var(--r-xl)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 shadow-[var(--shadow-soft)] sm:p-8">
            {product.brand && (
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-5">
                {product.brand}
              </p>
            )}
            <h1 className="mt-3 font-semibold text-[32px] leading-[1.05] tracking-[-0.035em] text-ink-0 sm:text-[40px]">
              {product.title}
            </h1>

            {/* Price block */}
            <div className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-2 border-b border-[color:var(--hairline)] pb-8">
              <p className="tabular text-[34px] font-semibold leading-none tracking-[-0.02em] text-ink-0 sm:text-[38px]">
                {priceFormatted}
              </p>
              {compareAtFormatted && (
                <p className="tabular text-[17px] leading-none text-ink-6 line-through">
                  {compareAtFormatted}
                </p>
              )}
              {discountPct !== null && discountPct > 0 && (
                <span className="inline-flex items-center rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--accent-700)]">
                  −{discountPct}%
                </span>
              )}
            </div>

            {/* Description */}
            {product.description ? (
              <div
                className="mt-8 max-w-prose text-[15px] leading-[1.65] text-ink-4 [&_p]:mb-4 [&_p:last-child]:mb-0 [&_strong]:text-ink-0 [&_a]:underline [&_a]:decoration-[color:var(--hairline-strong)] [&_a]:underline-offset-2"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            ) : (
              <p className="mt-8 max-w-prose text-[15px] leading-[1.65] text-ink-4">
                {toPlainText(product.title)}
              </p>
            )}

            {/* Add to cart */}
            <AddToCartForm
              product={product}
              storeId={storefrontData.store.id}
              storeSlug={resolvedParams.storeSlug}
            />

            {/* Features (if provided by catalog) */}
            {product.features && product.features.length > 0 && (
              <div className="mt-10 border-t border-[color:var(--hairline)] pt-8">
                <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-5">
                  Características
                </h3>
                <ul role="list" className="mt-5 space-y-2.5 text-[14px] text-ink-3">
                  {product.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <span
                        aria-hidden
                        className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-ink-6"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Product reviews — only when the app is installed + active */}
        {reviewsEnabled && (
          <ProductReviewsBlock
            storeSlug={resolvedParams.storeSlug}
            productId={product.id}
            reviews={approvedReviews}
            aggregate={reviewAggregate}
          />
        )}

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <div className="mt-20 border-t border-[color:var(--hairline-strong)] pt-14 sm:mt-24 sm:pt-16">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-5">
              Relacionados
            </p>
            <h2 className="mb-8 mt-3 font-semibold text-[26px] leading-[1.05] tracking-[-0.03em] text-ink-0 sm:mb-10 sm:text-[32px]">
              También te puede interesar
            </h2>
            <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard
                  key={relatedProduct.id}
                  product={relatedProduct}
                  storeSlug={resolvedParams.storeSlug}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Sticky mobile CTA — hidden on ≥lg to avoid double-CTA on desktop.
          The actual add-to-cart action runs inside AddToCartForm so this is
          purely a scroll-anchor for mobile conversion. */}
      {product.inStock && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 shadow-[var(--shadow-elevated)] lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-[12px] text-ink-5">{product.title}</p>
              <p className="tabular text-[18px] font-semibold text-ink-0">{priceFormatted}</p>
            </div>
            <a
              href="#add-to-cart"
              className="inline-flex h-12 min-h-12 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-ink-0 px-6 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
            >
              Comprar
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
