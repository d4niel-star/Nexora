import { getStorefrontData } from "@/lib/store-engine/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db/prisma";

export default async function CheckoutSuccessPage({ params, searchParams }: { params: Promise<{ storeSlug: string }>, searchParams: Promise<{ orderId?: string; payment_id?: string; status?: string; collection_id?: string }> }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const storefrontData = await getStorefrontData(resolvedParams.storeSlug);

  if (!storefrontData) {
    notFound();
  }

  const orderId = resolvedSearchParams.orderId;
  const mpPaymentId = resolvedSearchParams.payment_id;
  const mpStatus = resolvedSearchParams.status;
  let orderNumber = "";
  let paymentStatus = "pending";
  let orderStatus = "new";

  if (orderId) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (order) {
      orderNumber = order.orderNumber;
      paymentStatus = order.paymentStatus;
      orderStatus = order.status;
    }
  }

  // Payment might not have been processed by webhook yet when user returns.
  // If MP says approved but our DB still says pending, show optimistic success.
  const isApproved = mpStatus === "approved" || paymentStatus === "paid";
  const isPending = !isApproved && (mpStatus === "in_process" || mpStatus === "pending" || paymentStatus === "pending");
  const isCancelled = orderStatus === "cancelled" || paymentStatus === "refunded" || paymentStatus === "failed" || paymentStatus === "cancelled";

  return (
    <div className="bg-white min-h-[70vh] flex flex-col items-center justify-center py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center">
          {isCancelled ? (
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-red-500" />
            </div>
          ) : isApproved ? (
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
          ) : isPending ? (
            <div className="w-20 h-20 rounded-full bg-yellow-50 flex items-center justify-center">
              <Clock className="w-12 h-12 text-yellow-500" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
          )}
        </div>
        
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {isCancelled ? "Pedido cancelado" : isApproved ? "¡Pago Confirmado!" : isPending ? "Pago en proceso" : "¡Orden Confirmada!"}
          </h1>
          <p className="mt-4 text-base text-gray-500">
            {isCancelled
              ? "Tu pedido ha sido cancelado o el pago fue rechazado."
              : isApproved
              ? "Tu pago fue acreditado exitosamente. Estamos preparando tu pedido."
              : isPending
              ? "Tu pago está siendo procesado. Te notificaremos por email cuando se acredite."
              : "Gracias por tu compra. Te enviamos un email con los detalles de tu pedido."
            }
          </p>

          {/* Payment badge */}
          {mpPaymentId && (
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
              <span className="text-xs font-bold text-green-700">Pago procesado por Mercado Pago</span>
            </div>
          )}

          {orderNumber && (
            <div className="mt-6 bg-gray-50 rounded-md py-4 px-6 inline-block">
               <p className="text-sm font-bold text-gray-700">Número de Orden</p>
               <p className="text-xl font-mono text-gray-900 tracking-wider mt-1">{orderNumber}</p>
            </div>
          )}
        </div>

        <div className="mt-8 pt-8 flex flex-col items-center gap-4">
           {orderNumber && (
             <Link 
               href={`/${resolvedParams.storeSlug}/tracking?order=${encodeURIComponent(orderNumber)}`} 
               className="px-6 py-3 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black transition-all active:scale-95 inline-flex items-center gap-2"
             >
               Seguí tu pedido
             </Link>
           )}
           <Link href={`/${resolvedParams.storeSlug}`} className="text-sm font-bold text-gray-900 hover:text-gray-700">
             &larr; Volver al inicio
           </Link>
        </div>
      </div>
    </div>
  );
}
