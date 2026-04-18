import { getStorefrontData } from "@/lib/store-engine/queries";
import { storePath } from "@/lib/store-engine/urls";
import { notFound } from "next/navigation";
import Link from "next/link";
import { XCircle } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { RetryButton } from "@/components/storefront/checkout/RetryButton";

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
    <div className="bg-white min-h-[70vh] flex flex-col items-center justify-center py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
            <XCircle className="w-12 h-12 text-red-500" />
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Pago no procesado</h1>
          <p className="mt-4 text-base text-gray-500">
            Mercado Pago no completo el cobro o la operacion fue rechazada. La orden no se marca como pagada sin webhook aprobado.
          </p>
          {order?.paymentStatus === "paid" && (
            <p className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              La orden ya figura pagada en Nexora. No vuelvas a pagarla.
            </p>
          )}
          {order && <p className="mt-2 text-sm text-gray-400">Orden: {order.orderNumber}</p>}
        </div>

        <div className="flex flex-col items-center gap-4">
          {order && order.paymentStatus !== "paid" ? (
            <RetryButton orderId={order.id} storeSlug={resolvedParams.storeSlug} />
          ) : (
            <Link
              href={storePath(resolvedParams.storeSlug, "checkout")}
              className="px-6 py-3 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black transition-all active:scale-95"
            >
              Nuevo pago
            </Link>
          )}
          <Link href={storePath(resolvedParams.storeSlug)} className="text-sm font-bold text-gray-900 hover:text-gray-700">
            &larr; Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
