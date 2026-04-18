import { getStorefrontData } from "@/lib/store-engine/queries";
import { storePath } from "@/lib/store-engine/urls";
import { notFound } from "next/navigation";
import Link from "next/link";
import { XCircle } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { RetryButton } from "@/components/storefront/checkout/RetryButton";

// ─── Checkout Failure ───
// Monochrome shell + signal-danger icon tint. RetryButton preserved as-is.

export default async function CheckoutFailurePage({
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
          id: true,
          orderNumber: true,
          paymentStatus: true,
        },
      })
    : null;

  return (
    <div className="bg-[var(--surface-1)] min-h-[80vh] flex flex-col items-center justify-center px-4 py-20 sm:px-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-7 inline-flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
          <XCircle
            className="h-5 w-5 text-[color:var(--signal-danger)]"
            strokeWidth={1.75}
          />
        </div>

        <h1 className="font-semibold text-[32px] leading-[1.08] tracking-[-0.035em] text-ink-0">
          Pago no procesado.
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-[14px] leading-[1.55] text-ink-5">
          Mercado Pago no completó el cobro o la operación fue rechazada. La
          orden no se marca como pagada sin webhook aprobado.
        </p>

        {order?.paymentStatus === "paid" && (
          <div className="mx-auto mt-5 max-w-sm rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-4 py-3 text-[12px] leading-[1.55] text-[color:var(--signal-success)]">
            La orden ya figura pagada en Nexora. No vuelvas a pagarla.
          </div>
        )}
        {order && (
          <p className="mt-4 font-mono text-[12px] text-ink-5">
            Orden · {order.orderNumber}
          </p>
        )}

        <div className="mt-10 flex flex-col items-center gap-3">
          {order && order.paymentStatus !== "paid" ? (
            <RetryButton orderId={order.id} storeSlug={resolvedParams.storeSlug} />
          ) : (
            <Link
              href={storePath(resolvedParams.storeSlug, "checkout")}
              className="inline-flex h-12 items-center justify-center rounded-[var(--r-sm)] bg-ink-0 px-7 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2"
            >
              Nuevo pago
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
