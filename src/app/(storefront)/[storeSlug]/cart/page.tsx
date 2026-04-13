import { getCart } from "@/lib/store-engine/cart/queries";
import { getStorefrontData } from "@/lib/store-engine/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CartList } from "@/components/storefront/cart/CartList";

export default async function CartPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const resolvedParams = await params;
  const storefrontData = await getStorefrontData(resolvedParams.storeSlug);

  if (!storefrontData) {
    notFound();
  }

  const cart = await getCart(storefrontData.store.id);

  const formatCurrency = (price: number) => new Intl.NumberFormat(storefrontData.store.locale, {
    style: "currency",
    currency: storefrontData.store.currency,
    maximumFractionDigits: 0,
  }).format(price);

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:px-0">
        <h1 className="text-center text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          Carrito de Compras
        </h1>

        {!cart || cart.items.length === 0 ? (
          <div className="mt-12 text-center">
            <h2 className="text-xl font-medium text-gray-900">Tu carrito está vacío</h2>
            <p className="mt-4 text-gray-500">Parece que aún no has agregado nada.</p>
            <div className="mt-8">
              <Link
                href={`/${resolvedParams.storeSlug}`}
                className="inline-flex items-center justify-center rounded-sm border border-transparent bg-gray-900 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
              >
                Volver a la tienda
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-12">
            <section aria-labelledby="cart-heading">
              <h2 id="cart-heading" className="sr-only">
                Items in your shopping cart
              </h2>

              <ul role="list" className="divide-y divide-gray-200 border-t border-b border-gray-200">
                <CartList 
                  items={cart.items} 
                  storeSlug={resolvedParams.storeSlug} 
                  currency={storefrontData.store.currency}
                  locale={storefrontData.store.locale}
                />
              </ul>
            </section>

            {/* Order summary */}
            <section aria-labelledby="summary-heading" className="mt-10">
              <h2 id="summary-heading" className="sr-only">
                Order summary
              </h2>

              <div>
                <dl className="space-y-4">
                  <div className="flex items-center justify-between">
                    <dt className="text-base font-medium text-gray-900">Subtotal</dt>
                    <dd className="ml-4 text-base font-medium text-gray-900">{formatCurrency(cart.subtotal)}</dd>
                  </div>
                </dl>
                <p className="mt-1 text-sm text-gray-500">Los costos de envío y los impuestos se calculan en el checkout.</p>
              </div>

              <div className="mt-10">
                <Link
                  href={`/${resolvedParams.storeSlug}/checkout`}
                  className="w-full flex items-center justify-center rounded-sm border border-transparent bg-gray-900 px-4 py-4 text-base font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 focus:ring-offset-gray-50 transition-colors"
                >
                  Iniciar Checkout
                </Link>
              </div>

              <div className="mt-6 text-center text-sm">
                <p>
                  o{' '}
                  <Link href={`/${resolvedParams.storeSlug}`} className="font-medium text-gray-900 hover:text-gray-600">
                    Continuar comprando<span aria-hidden="true"> &rarr;</span>
                  </Link>
                </p>
              </div>
            </section>
          </form>
        )}
      </div>
    </div>
  );
}
