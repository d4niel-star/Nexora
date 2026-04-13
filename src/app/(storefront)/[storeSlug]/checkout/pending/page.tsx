import { getStorefrontData } from "@/lib/store-engine/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock } from "lucide-react";
import { prisma } from "@/lib/db/prisma";

export default async function CheckoutPendingPage({ params, searchParams }: { params: Promise<{ storeSlug: string }>, searchParams: Promise<{ orderId?: string }> }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const storefrontData = await getStorefrontData(resolvedParams.storeSlug);

  if (!storefrontData) notFound();

  let orderNumber = "";
  if (resolvedSearchParams.orderId) {
    const order = await prisma.order.findUnique({ where: { id: resolvedSearchParams.orderId } });
    if (order) orderNumber = order.orderNumber;
  }

  return (
    <div className="bg-white min-h-[70vh] flex flex-col items-center justify-center py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-yellow-50 flex items-center justify-center">
            <Clock className="w-12 h-12 text-yellow-500" />
          </div>
        </div>
        
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Pago en proceso</h1>
          <p className="mt-4 text-base text-gray-500">
            Tu pago está siendo procesado. Esto suele ocurrir con pagos en efectivo o transferencias bancarias. 
            Te notificaremos por email cuando se acredite.
          </p>
          {orderNumber && (
            <div className="mt-6 bg-gray-50 rounded-md py-4 px-6 inline-block">
              <p className="text-sm font-bold text-gray-700">Número de Orden</p>
              <p className="text-xl font-mono text-gray-900 tracking-wider mt-1">{orderNumber}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-4">
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
