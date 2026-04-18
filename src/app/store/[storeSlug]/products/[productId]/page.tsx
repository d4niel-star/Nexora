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

  const compareAtFormatted = product.compareAtPrice
    ? new Intl.NumberFormat(storefrontData.store.locale, {
        style: "currency",
        currency: storefrontData.store.currency,
        maximumFractionDigits: 0,
      }).format(product.compareAtPrice)
    : null;
  const galleryImages = (product.images.length > 0 ? product.images : [product.featuredImage]).filter(Boolean);

  // ─── JSON-LD Product schema ───
  // Schema.org Product markup for rich results in Google. We only declare
  // fields we can back with real data — no invented ratings or review counts.
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

  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <div className="border-b border-gray-200">
        <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ol role="list" className="flex items-center space-x-4 py-4">
            <li>
              <div className="flex items-center">
                <Link href={storePath(resolvedParams.storeSlug)} className="mr-4 text-sm font-medium text-gray-900 hover:text-gray-600">
                  Inicio
                </Link>
                <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
              </div>
            </li>
            <li className="text-sm">
              <span className="font-medium text-gray-500" aria-current="page">
                {product.title}
              </span>
            </li>
          </ol>
        </nav>
      </div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-8">
          <ProductGallery images={galleryImages} />

          <div className="mt-10 px-4 sm:px-0 lg:mt-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{product.title}</h1>

            <div className="mt-3">
              <h2 className="sr-only">Informacion del producto</h2>
              <div className="flex items-center gap-3">
                <p className="text-3xl font-bold tracking-tight text-gray-900">{priceFormatted}</p>
                {compareAtFormatted && (
                  <p className="text-xl font-medium tracking-tight text-gray-400 line-through">
                    {compareAtFormatted}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="sr-only">Descripcion</h3>
              {product.description ? (
                <div className="space-y-6 text-base text-gray-700" dangerouslySetInnerHTML={{ __html: product.description }} />
              ) : (
                <p className="text-base text-gray-700">{toPlainText(product.title)}</p>
              )}
            </div>

            <div className="mt-6 rounded-sm border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Stock</p>
              <p className={product.inStock ? "mt-1 text-sm font-semibold text-emerald-700" : "mt-1 text-sm font-semibold text-gray-500"}>
                {product.inStock ? "Disponible" : "Sin stock"}
              </p>
            </div>

            <AddToCartForm
              product={product}
              storeId={storefrontData.store.id}
              storeSlug={resolvedParams.storeSlug}
            />

            {product.features && product.features.length > 0 && (
              <div className="mt-10 pt-10 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900">Caracteristicas</h3>
                <div className="mt-4 prose prose-sm text-gray-500">
                  <ul role="list">
                    {product.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <div className="mt-24 pt-16 border-t border-gray-200">
            <div className="flex items-center text-center justify-center mb-12">
              <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 text-center">Tambien te puede interesar</h2>
            </div>
            <div className="grid grid-cols-1 gap-y-10 sm:grid-cols-2 gap-x-6 lg:grid-cols-4 xl:gap-x-8">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} storeSlug={resolvedParams.storeSlug} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
