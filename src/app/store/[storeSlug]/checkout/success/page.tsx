import { getStorefrontData } from "@/lib/store-engine/queries";
import { storePath } from "@/lib/store-engine/urls";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock, ShieldCheck, XCircle } from "lucide-react";
import { prisma } from "@/lib/db/prisma";

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ orderId?: string; payment_id?: string; status?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const storefrontData = await getStorefrontData(resolvedParams.storeSlug);

  if (!storefrontData) {
    notFound();
  }

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
          publicStatus: true,
          status: true,
          mpPaymentId: true,
          total: true,
          currency: true,
        },
      })
    : null;

  const isPaid = order?.paymentStatus === "paid" || order?.publicStatus === "PAID";
  const isFailed =
    order?.paymentStatus === "failed" ||
    order?.paymentStatus === "refunded" ||
    order?.publicStatus === "CANCELLED" ||
    order?.publicStatus === "REFUNDED";
  const isPending = !isPaid && !isFailed;

  const title = isPaid ? "Pago confirmado" : isFailed ? "Pago no confirmado" : "Estamos validando tu pago";
  const description = isPaid
    ? "El webhook de Mercado Pago confirmo el cobro. Estamos preparando tu pedido."
    : isFailed
      ? "Mercado Pago no confirmo el cobro de esta orden. Podes reintentar el pago o contactar a la tienda."
      : "Volviste desde Mercado Pago, pero todavia no recibimos la confirmacion segura del webhook. Te vamos a avisar por email cuando se acredite.";

  const formattedTotal = order
    ? new Intl.NumberFormat(storefrontData.store.locale, {
        style: "currency",
        currency: order.currency,
        maximumFractionDigits: 0,
      }).format(order.total)
    : null;

  return (
    <div className="bg-white min-h-[70vh] flex flex-col items-center justify-center py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isPaid ? "bg-green-50" : isFailed ? "bg-red-50" : "bg-yellow-50"}`}>
            {isPaid ? (
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            ) : isFailed ? (
              <XCircle className="w-12 h-12 text-red-500" />
            ) : (
              <Clock className="w-12 h-12 text-yellow-500" />
            )}
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{title}</h1>
          <p className="mt-4 text-base text-gray-500">{description}</p>

          {resolvedSearchParams.status === "approved" && !isPaid && (
            <p className="mt-3 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
              Mercado Pago devolvio estado aprobado, pero Nexora espera el webhook firmado antes de marcar la orden como pagada.
            </p>
          )}

          {isPaid && order?.mpPaymentId && (
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
              <span className="text-xs font-bold text-green-700">Pago confirmado por webhook</span>
            </div>
          )}

          {order && (
            <div className="mt-6 bg-gray-50 rounded-md py-4 px-6 inline-block">
              <p className="text-sm font-bold text-gray-700">Numero de orden</p>
              <p className="text-xl font-mono text-gray-900 tracking-wider mt-1">{order.orderNumber}</p>
              {formattedTotal && <p className="mt-2 text-sm font-semibold text-gray-700">{formattedTotal}</p>}
            </div>
          )}
        </div>

        <div className="mt-8 pt-8 flex flex-col items-center gap-4">
          {order && (
            <Link
              href={storePath(resolvedParams.storeSlug, `tracking?order=${encodeURIComponent(order.orderNumber)}`)}
              className="px-6 py-3 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black transition-all active:scale-95 inline-flex items-center gap-2"
            >
              Segui tu pedido
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
