import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckoutForm } from "@/components/storefront/checkout/CheckoutForm";
import { getCart, getCartStockIssues } from "@/lib/store-engine/cart/queries";
import { getOrCreateCheckoutDraftForSession } from "@/lib/store-engine/checkout/queries";
import { getShippingMethods } from "@/lib/store-engine/shipping/queries";
import { getStorefrontData } from "@/lib/store-engine/queries";
import { storePath } from "@/lib/store-engine/urls";
import { hasMercadoPagoConnected } from "@/lib/payments/mercadopago/tenant";

export default async function CheckoutPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const resolvedParams = await params;
  const storefrontData = await getStorefrontData(resolvedParams.storeSlug);

  if (!storefrontData) {
    notFound();
  }

  const cart = await getCart(storefrontData.store.id);

  if (!cart || cart.items.length === 0) {
    redirect(storePath(resolvedParams.storeSlug, "cart"));
  }

  const stockIssues = await getCartStockIssues(cart.id);
  const hasStockIssues = stockIssues.length > 0;
  const draft = hasStockIssues
    ? null
    : await getOrCreateCheckoutDraftForSession(storefrontData.store.id);

  if (!draft && !hasStockIssues) {
    redirect(storePath(resolvedParams.storeSlug, "cart"));
  }

  const shippingMethods = hasStockIssues ? [] : await getShippingMethods(storefrontData.store.id);
  const canCheckoutWithMercadoPago = hasStockIssues
    ? false
    : await hasMercadoPagoConnected(storefrontData.store.id);
  const subtotal = draft?.subtotal ?? cart.subtotal;
  const shippingAmount = draft?.shippingAmount ?? 0;
  const total = draft?.total ?? subtotal;

  const priceFormatted = (price: number) => new Intl.NumberFormat(storefrontData.store.locale, {
    style: "currency",
    currency: storefrontData.store.currency,
    maximumFractionDigits: 0,
  }).format(price);

  return (
    <div className="min-h-screen bg-[var(--surface-1)]">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-12 lg:gap-12 lg:px-8">
        <section className="lg:col-span-7 xl:col-span-8" aria-labelledby="checkout-title">
          <div className="mb-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-5">
              Checkout
            </p>
            <h1
              id="checkout-title"
              className="mt-2 font-semibold text-[34px] leading-[1.04] tracking-[-0.035em] text-ink-0 sm:text-[48px]"
            >
              Finalizá tu compra
            </h1>
            <p className="mt-3 max-w-xl text-[14px] leading-[1.55] text-ink-5">
              Completá tus datos y te redirigimos a Mercado Pago para pagar de
              forma segura.
            </p>
          </div>

          <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 sm:p-7">
          {hasStockIssues ? (
            <div role="alert">
              <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-ink-0">
                El stock cambió antes del checkout
              </h2>
              <p className="mt-2 text-[13px] leading-[1.55] text-ink-5">
                No podemos avanzar al pago hasta que ajustes el carrito. Esto
                evita vender unidades que ya no están disponibles.
              </p>
              <ul className="mt-4 space-y-2">
                {stockIssues.map((issue) => (
                  <li
                    key={issue.itemId}
                    className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 py-2 text-[13px] text-[color:var(--signal-danger)]"
                  >
                    <span className="font-medium text-ink-0">{issue.title}</span>{" "}
                    ({issue.variantTitle}): pediste {issue.requested}, quedan{" "}
                    {issue.available}.
                  </li>
                ))}
              </ul>
              <Link
                href={storePath(resolvedParams.storeSlug, "cart")}
                className="mt-5 inline-flex h-11 items-center justify-center rounded-[var(--r-sm)] bg-ink-0 px-4 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
              >
                Ajustar carrito
              </Link>
            </div>
          ) : !canCheckoutWithMercadoPago ? (
            <div role="status">
              <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-ink-0">
                Checkout no disponible
              </h2>
              <p className="mt-2 text-[13px] leading-[1.55] text-ink-5">
                Esta tienda todavía no tiene Mercado Pago conectado. Podés
                revisar el carrito, pero el pago se habilita cuando el vendedor
                conecta su cuenta.
              </p>
              <Link
                href={storePath(resolvedParams.storeSlug, "cart")}
                className="mt-5 inline-flex h-11 items-center justify-center rounded-[var(--r-sm)] bg-ink-0 px-4 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
              >
                Volver al carrito
              </Link>
            </div>
          ) : (
            <CheckoutForm draft={draft!} storeSlug={resolvedParams.storeSlug} shippingMethods={shippingMethods} />
          )}
          </div>
        </section>

        <aside className="lg:col-span-5 xl:col-span-4" aria-labelledby="order-summary-title">
          <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 sm:p-6 lg:sticky lg:top-24">
          <h2
            id="order-summary-title"
            className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-5"
          >
            Resumen del pedido
          </h2>

          <ul role="list" className="mt-5 divide-y divide-[color:var(--hairline)] border-y border-[color:var(--hairline)]">
            {cart.items.map((item) => (
              <li key={item.id} className="flex py-4">
                <div className="flex h-16 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-2)]">
                  {item.imageSnapshot ? (
                    <img src={item.imageSnapshot} alt={item.titleSnapshot} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-ink-6">N/A</span>
                  )}
                </div>
                <div className="ml-3 flex min-w-0 flex-1 flex-col">
                  <div>
                    <div className="flex justify-between gap-3 text-[13px] font-medium text-ink-0">
                      <h3 className="line-clamp-2 min-w-0">{item.titleSnapshot}</h3>
                      <p className="tabular shrink-0">{priceFormatted(item.priceSnapshot * item.quantity)}</p>
                    </div>
                    <p className="mt-1 truncate text-[12px] text-ink-5">{item.variantTitleSnapshot}</p>
                  </div>
                  <div className="flex flex-1 items-end justify-between text-[12px]">
                    <p className="text-ink-5">Cant. {item.quantity}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <dl className="mt-6 space-y-3 text-[14px]">
            <div className="flex justify-between">
              <dt className="text-ink-5">Subtotal</dt>
              <dd className="tabular font-medium text-ink-0">{priceFormatted(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-5">Envío</dt>
              <dd className="tabular font-medium text-ink-0">{shippingAmount > 0 ? priceFormatted(shippingAmount) : "Gratis"}</dd>
            </div>
            <div className="flex justify-between border-t border-[color:var(--hairline)] pt-4 text-[16px] font-semibold text-ink-0">
              <dt>Total</dt>
              <dd className="tabular">{priceFormatted(total)}</dd>
            </div>
          </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
