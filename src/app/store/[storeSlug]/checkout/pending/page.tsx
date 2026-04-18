import { getStorefrontData } from "@/lib/store-engine/queries";
import { storePath } from "@/lib/store-engine/urls";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db/prisma";

// ─── Checkout Pending ───
// Unified monochrome shell. Waiting state communicated via signal-warning
// icon tint, not a yellow wash.

export default async function CheckoutPendingPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ orderId?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const storefrontData = await getStorefrontData(resolvedParams.storeSlug);

  if (!storefrontData) notFound();

  const order = resolvedSearchParams.orderId
    ? await prisma.order.findFirst({
        where: {
          id: resolvedSearchParams.orderId,
          storeId: storefrontData.store.id,
        },
        select: {
          orderNumber: true,
          paymentStatus: true,
          total: true,
          currency: true,
        },
      })
    : null;

  const formattedTotal = order
    ? new Intl.NumberFormat(storefrontData.store.locale, {
        style: "currency",
        currency: order.currency,
        maximumFractionDigits: 0,
      }).format(order.total)
    : null;

  const isPaid = order?.paymentStatus === "paid";

  return (
    <div className="bg-[var(--surface-1)] min-h-[80vh] flex flex-col items-center justify-center px-4 py-20 sm:px-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-7 inline-flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
          <Clock
            className="h-5 w-5 text-[color:var(--signal-warning)]"
            strokeWidth={1.75}
          />
        </div>

        <h1 className="font-semibold text-[32px] leading-[1.08] tracking-[-0.035em] text-ink-0">
          {isPaid ? "Pago confirmado." : "Pago en proceso."}
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-[14px] leading-[1.55] text-ink-5">
          {isPaid
            ? "El webhook de Mercado Pago ya confirmó el pago de esta orden."
            : "Tu pago está siendo procesado. Nexora espera el webhook firmado de Mercado Pago antes de marcar la orden como pagada."}
        </p>

        {order && (
          <div className="mx-auto mt-7 inline-block rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-6 py-4 text-left">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
              Número de orden
            </p>
            <p className="mt-1 font-mono text-[18px] text-ink-0 tracking-wider">
              {order.orderNumber}
            </p>
            {formattedTotal && (
              <p className="mt-2 tabular text-[13px] font-medium text-ink-3">
                {formattedTotal}
              </p>
            )}
          </div>
        )}

        <div className="mt-10 flex flex-col items-center gap-3">
          {order && (
            <Link
              href={storePath(
                resolvedParams.storeSlug,
                `tracking?order=${encodeURIComponent(order.orderNumber)}`,
              )}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--r-sm)] bg-ink-0 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2 sm:w-auto sm:px-7"
            >
              Seguir tu pedido
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </Link>
          )}
          <Link
            href={storePath(resolvedParams.storeSlug)}
            className="text-[13px] text-ink-5 transition-colors hover:text-ink-0"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
