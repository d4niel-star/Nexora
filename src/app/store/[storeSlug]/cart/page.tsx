import { getCart, getCartStockIssues } from "@/lib/store-engine/cart/queries";
import { getStorefrontData } from "@/lib/store-engine/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { CartList } from "@/components/storefront/cart/CartList";
import { storePath } from "@/lib/store-engine/urls";
import { Surface } from "@/components/ui/primitives";

// ─── Cart Page ───
// 12-col editorial grid: items dominate (7 cols) and summary docks on the
// right (5 cols on lg, sticky). Mobile stacks with the summary flowing below.
// Empty state uses a restrained surface rather than centered copy.

export default async function CartPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const resolvedParams = await params;
  const storefrontData = await getStorefrontData(resolvedParams.storeSlug);

  if (!storefrontData) {
    notFound();
  }

  const cart = await getCart(storefrontData.store.id);
  const stockIssues = cart ? await getCartStockIssues(cart.id) : [];
  const hasStockIssues = stockIssues.length > 0;

  const formatCurrency = (price: number) =>
    new Intl.NumberFormat(storefrontData.store.locale, {
      style: "currency",
      currency: storefrontData.store.currency,
      maximumFractionDigits: 0,
    }).format(price);

  return (
    <div className="bg-[var(--surface-1)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <header className="mb-12">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-5">
            Carrito
          </p>
          <h1 className="mt-3 font-semibold text-[34px] leading-[1.04] tracking-[-0.035em] text-ink-0 sm:text-[48px]">
            Tu selección
          </h1>
        </header>

        {!cart || cart.items.length === 0 ? (
          <Surface
            level={0}
            hairline
            radius="lg"
            className="p-10 shadow-[var(--shadow-soft)] sm:p-16"
          >
            <div className="mx-auto flex max-w-md flex-col items-start gap-6">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-4">
                <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="font-semibold text-[24px] leading-[1.05] tracking-[-0.03em] text-ink-0 sm:text-[28px]">
                  Tu carrito está vacío.
                </h2>
                <p className="mt-3 text-[14px] leading-[1.55] text-ink-5">
                  Agregá productos desde el catálogo para empezar tu compra.
                </p>
              </div>
              <Link
                href={storePath(resolvedParams.storeSlug)}
                className="inline-flex h-12 min-h-12 items-center justify-center gap-2 rounded-[var(--r-md)] bg-ink-0 px-6 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
              >
                Volver al catálogo
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </Link>
            </div>
          </Surface>
        ) : (
          <form className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
            {/* Items */}
            <section
              aria-labelledby="cart-heading"
              className="lg:col-span-7 xl:col-span-8"
            >
              <h2 id="cart-heading" className="sr-only">
                Productos en tu carrito
              </h2>

              {hasStockIssues && (
                <div
                  role="alert"
                  className="mb-5 rounded-[var(--r-md)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] p-4"
                >
                  <p className="text-[13px] font-medium text-[color:var(--signal-danger)]">
                    El stock cambió desde que agregaste productos.
                  </p>
                  <p className="mt-1 text-[13px] text-ink-5">
                    Ajustá las cantidades marcadas para poder avanzar al checkout.
                  </p>
                </div>
              )}

              <CartList
                items={cart.items}
                storeSlug={resolvedParams.storeSlug}
                currency={storefrontData.store.currency}
                locale={storefrontData.store.locale}
                stockIssues={stockIssues}
              />
            </section>

            {/* Summary */}
            <aside className="lg:col-span-5 xl:col-span-4">
              <Surface
                level={0}
                hairline
                radius="lg"
                className="p-6 shadow-[var(--shadow-soft)] lg:sticky lg:top-28"
              >
                <h2
                  id="summary-heading"
                  className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-5"
                >
                  Resumen
                </h2>

                <dl className="mt-6 space-y-3.5 text-[14px]">
                  <div className="flex items-center justify-between">
                    <dt className="text-ink-5">Subtotal</dt>
                    <dd className="tabular font-medium text-ink-0">
                      {formatCurrency(cart.subtotal)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between text-ink-5">
                    <dt>Envío</dt>
                    <dd>Se calcula en el checkout</dd>
                  </div>
                </dl>

                <div className="my-6 h-px bg-[color:var(--hairline)]" />

                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[13px] text-ink-5">Total estimado</span>
                  <span className="tabular text-[24px] font-semibold tracking-[-0.02em] text-ink-0">
                    {formatCurrency(cart.subtotal)}
                  </span>
                </div>

                <div className="mt-6">
                  {hasStockIssues ? (
                    <span className="inline-flex h-12 min-h-12 w-full cursor-not-allowed items-center justify-center rounded-[var(--r-md)] bg-ink-8 text-[14px] font-medium text-ink-12">
                      Ajustá el stock para continuar
                    </span>
                  ) : (
                    <Link
                      href={storePath(resolvedParams.storeSlug, "checkout")}
                      className="inline-flex h-12 min-h-12 w-full items-center justify-center gap-2 rounded-[var(--r-md)] bg-ink-0 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
                    >
                      Iniciar checkout
                      <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                    </Link>
                  )}
                </div>

                <p className="mt-4 text-center text-[12px] text-ink-5">
                  o{" "}
                  <Link
                    href={storePath(resolvedParams.storeSlug)}
                    className="text-ink-0 underline decoration-[color:var(--hairline-strong)] underline-offset-4 hover:decoration-ink-0"
                  >
                    continuar comprando
                  </Link>
                </p>
              </Surface>
            </aside>
          </form>
        )}
      </div>
    </div>
  );
}
