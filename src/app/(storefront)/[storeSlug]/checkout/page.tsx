import { getStorefrontData } from "@/lib/store-engine/queries";
import { notFound, redirect } from "next/navigation";
import { getCart } from "@/lib/store-engine/cart/queries";
import { getOrCreateCheckoutDraftForSession } from "@/lib/store-engine/checkout/queries";
import { getShippingMethods } from "@/lib/store-engine/shipping/queries";
import { CheckoutForm } from "@/components/storefront/checkout/CheckoutForm";

export default async function CheckoutPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const resolvedParams = await params;
  const storefrontData = await getStorefrontData(resolvedParams.storeSlug);

  if (!storefrontData) {
    notFound();
  }

  const cart = await getCart(storefrontData.store.id);

  if (!cart || cart.items.length === 0) {
    redirect(`/${resolvedParams.storeSlug}/cart`);
  }

  // Get or create the draft using SSR-safe query
  const draft = await getOrCreateCheckoutDraftForSession(storefrontData.store.id);

  if (!draft) {
    redirect(`/${resolvedParams.storeSlug}/cart`);
  }

  const shippingMethods = await getShippingMethods(storefrontData.store.id);

  const priceFormatted = (price: number) => new Intl.NumberFormat(storefrontData.store.locale, {
    style: "currency",
    currency: storefrontData.store.currency,
    maximumFractionDigits: 0,
  }).format(price);

  return (
    <div className="bg-gray-50 flex flex-col lg:flex-row min-h-screen">
      
      {/* Left side: Form */}
      <div className="flex-1 px-4 py-8 sm:px-6 lg:px-8 xl:px-24">
        <div className="max-w-xl mx-auto lg:ml-auto lg:mr-0 pt-8">
           <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-8">Checkout</h1>
           <CheckoutForm draft={draft} storeSlug={resolvedParams.storeSlug} shippingMethods={shippingMethods} />
        </div>
      </div>

      {/* Right side: Summary */}
      <div className="flex-1 bg-white border-l border-gray-200 px-4 py-8 sm:px-6 lg:px-8 xl:px-24">
        <div className="max-w-lg mx-auto lg:mr-auto lg:ml-0 sticky top-12 pt-8">
           <h2 className="text-lg font-bold text-gray-900 mb-6">Resumen del pedido</h2>
           
           <ul role="list" className="divide-y divide-gray-200">
             {cart.items.map((item) => (
               <li key={item.id} className="flex py-6">
                 <div className="h-16 w-16 flex-shrink-0 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                   {item.imageSnapshot ? (
                     <img src={item.imageSnapshot} alt={item.titleSnapshot} className="h-full w-full object-cover" />
                   ) : (
                     <span className="text-[10px] text-gray-400">N/A</span>
                   )}
                 </div>
                 <div className="ml-4 flex flex-1 flex-col">
                   <div>
                     <div className="flex justify-between text-sm font-medium text-gray-900">
                       <h3 className="line-clamp-2 pr-4">{item.titleSnapshot}</h3>
                       <p className="ml-4 tabular-nums block">{priceFormatted(item.priceSnapshot * item.quantity)}</p>
                     </div>
                     <p className="mt-1 text-xs text-gray-500">{item.variantTitleSnapshot}</p>
                   </div>
                   <div className="flex flex-1 items-end justify-between text-xs">
                     <p className="text-gray-500">Cant. {item.quantity}</p>
                   </div>
                 </div>
               </li>
             ))}
           </ul>

           <dl className="mt-6 space-y-4 text-sm font-medium text-gray-500 border-t border-gray-200 pt-6">
             <div className="flex justify-between">
               <dt>Subtotal</dt>
               <dd className="text-gray-900 tabular-nums">{priceFormatted(draft.subtotal)}</dd>
             </div>
             <div className="flex justify-between">
               <dt>Envío</dt>
               <dd className="text-gray-900 tabular-nums">{draft.shippingAmount > 0 ? priceFormatted(draft.shippingAmount) : "Gratis"}</dd>
             </div>
             <div className="flex justify-between border-t border-gray-200 pt-4 text-base font-bold text-gray-900">
               <dt>Total</dt>
               <dd className="tabular-nums">{priceFormatted(draft.total)}</dd>
             </div>
           </dl>
        </div>
      </div>

    </div>
  );
}
