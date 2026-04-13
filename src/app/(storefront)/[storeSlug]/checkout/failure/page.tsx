import { getStorefrontData } from "@/lib/store-engine/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { XCircle } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { RetryButton } from "@/components/storefront/checkout/RetryButton";

export default async function CheckoutFailurePage({ params, searchParams }: { params: Promise<{ storeSlug: string }>, searchParams: Promise<{ orderId?: string }> }) {
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
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
            <XCircle className="w-12 h-12 text-red-500" />
          </div>
        </div>
        
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Pago no procesado</h1>
          <p className="mt-4 text-base text-gray-500">
            El pago no pudo completarse. Esto puede ocurrir por fondos insuficientes, datos incorrectos, o una cancelación manual.
          </p>
          {orderNumber && (
            <p className="mt-2 text-sm text-gray-400">Orden: {orderNumber}</p>
          )}
        </div>

        <div className="flex flex-col items-center gap-4">
          {orderNumber && resolvedSearchParams.orderId ? (
            <RetryButton orderId={resolvedSearchParams.orderId} storeSlug={resolvedParams.storeSlug} />
          ) : (
            <Link 
              href={`/${resolvedParams.storeSlug}/checkout`}
              className="px-6 py-3 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black transition-all active:scale-95"
            >
              Nuevo pago
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
