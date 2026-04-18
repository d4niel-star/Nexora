"use client";

import { useState, useTransition } from "react";
import { updateCheckoutDraftInfo } from "@/lib/store-engine/checkout/actions";
import { initiatePayment } from "@/lib/payments/mercadopago/actions";
import { updateCheckoutShippingMethod } from "@/lib/store-engine/shipping/actions";
import { CheckoutDraftType } from "@/types/checkout";
import { ShippingMethodData } from "@/lib/store-engine/shipping/queries";
import { useRouter } from "next/navigation";
import { Loader2, CreditCard, ShieldCheck, AlertCircle } from "lucide-react";

export function CheckoutForm({ draft, storeSlug, shippingMethods }: { draft: CheckoutDraftType, storeSlug: string, shippingMethods: ShippingMethodData[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isShippingPending, startShippingTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleShippingChange = (id: string) => {
    startShippingTransition(async () => {
      setError(null);
      const res = await updateCheckoutShippingMethod(draft.id, id);
      if (!res.success) {
        setError(res.error || "No se pudo actualizar el costo de envío.");
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get("email") as string,
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      phone: formData.get("phone") as string,
      document: formData.get("document") as string,
      addressLine1: formData.get("addressLine1") as string,
      addressLine2: formData.get("addressLine2") as string,
      city: formData.get("city") as string,
      province: formData.get("province") as string,
      postalCode: formData.get("postalCode") as string,
      country: formData.get("country") as string,
      shippingMethod: formData.get("shippingMethod") as string,
      paymentMethod: "mercadopago",
    };

    startTransition(async () => {
      try {
         // 1. Save customer data to draft
         await updateCheckoutDraftInfo(draft.id, data);
         
         // 2. Create order + Mercado Pago preference, get redirect URL
         const result = await initiatePayment(draft.id, storeSlug);
         
         // 3. Redirect to Mercado Pago checkout
         window.location.href = result.redirectUrl;
         
      } catch (err: any) {
         console.error(err);
         setError(err.message || "Error al procesar el pago. Intentá nuevamente.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Error en el checkout</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Contact Info */}
      <section>
         <h2 className="text-lg font-bold text-gray-900 mb-4">Información de contacto</h2>
         <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email *</label>
              <input required type="email" id="email" name="email" defaultValue={draft.email || ""} className="mt-1 block w-full rounded-sm border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-base sm:text-sm min-h-[44px] py-3 px-3 border" />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Teléfono</label>
              <input type="tel" id="phone" name="phone" defaultValue={draft.phone || ""} className="mt-1 block w-full rounded-sm border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-base sm:text-sm min-h-[44px] py-3 px-3 border" />
            </div>
         </div>
      </section>

      {/* Shipping address */}
      <section>
         <h2 className="text-lg font-bold text-gray-900 mb-4">Dirección de envío</h2>
         <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">Nombre *</label>
              <input required type="text" id="firstName" name="firstName" defaultValue={draft.firstName || ""} className="mt-1 block w-full rounded-sm border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-base sm:text-sm min-h-[44px] py-3 px-3 border" />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Apellido *</label>
              <input required type="text" id="lastName" name="lastName" defaultValue={draft.lastName || ""} className="mt-1 block w-full rounded-sm border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-base sm:text-sm min-h-[44px] py-3 px-3 border" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="document" className="block text-sm font-medium text-gray-700">DNI / CUIT</label>
              <input type="text" id="document" name="document" defaultValue={draft.document || ""} className="mt-1 block w-full rounded-sm border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-base sm:text-sm min-h-[44px] py-3 px-3 border" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700">Dirección *</label>
              <input required type="text" id="addressLine1" name="addressLine1" defaultValue={draft.addressLine1 || ""} placeholder="Calle y número" className="mt-1 block w-full rounded-sm border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-base sm:text-sm min-h-[44px] py-3 px-3 border" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700">Departamento, piso, etc. (opcional)</label>
              <input type="text" id="addressLine2" name="addressLine2" defaultValue={draft.addressLine2 || ""} className="mt-1 block w-full rounded-sm border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-base sm:text-sm min-h-[44px] py-3 px-3 border" />
            </div>
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700">Ciudad *</label>
              <input required type="text" id="city" name="city" defaultValue={draft.city || ""} className="mt-1 block w-full rounded-sm border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-base sm:text-sm min-h-[44px] py-3 px-3 border" />
            </div>
             <div>
              <label htmlFor="province" className="block text-sm font-medium text-gray-700">Provincia *</label>
              <input required type="text" id="province" name="province" defaultValue={draft.province || ""} className="mt-1 block w-full rounded-sm border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-base sm:text-sm min-h-[44px] py-3 px-3 border" />
            </div>
            <div>
              <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">Código Postal *</label>
              <input required type="text" id="postalCode" name="postalCode" defaultValue={draft.postalCode || ""} className="mt-1 block w-full rounded-sm border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-base sm:text-sm min-h-[44px] py-3 px-3 border" />
            </div>
             <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700">País</label>
              <select id="country" name="country" defaultValue={draft.country || "AR"} className="mt-1 block w-full rounded-sm border-gray-300 shadow-sm bg-white focus:border-gray-900 focus:ring-gray-900 text-base sm:text-sm min-h-[44px] py-3 px-3 border">
                 <option value="AR">Argentina</option>
              </select>
            </div>
         </div>
      </section>

      {/* Shipping Method */}
      <section className={isShippingPending ? "opacity-50 pointer-events-none" : ""}>
         <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            Método de Envío
            {isShippingPending && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
         </h2>
         {shippingMethods.length === 0 ? (
            <p className="text-sm text-red-500 font-medium">No hay métodos de envío disponibles para esta zona.</p>
         ) : (
           <div className="space-y-3">
              {shippingMethods.map((method) => {
                const isSelected = draft.shippingMethodId === method.id || (!draft.shippingMethodId && method.isDefault);
                const isFree = method.freeShippingOver && draft.subtotal >= method.freeShippingOver;
                const finalAmount = isFree ? 0 : method.baseAmount;
                const formattedPrice = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(finalAmount);

                return (
                  <label key={method.id} htmlFor={`shipping-${method.id}`} className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-gray-900 has-[:checked]:bg-gray-50">
                    <input 
                      defaultChecked={isSelected}
                      id={`shipping-${method.id}`} 
                      name="shippingMethodId" 
                      type="radio" 
                      value={method.id} 
                      onChange={() => handleShippingChange(method.id)}
                      className="h-4 w-4 border-gray-300 text-gray-900 focus:ring-gray-900" 
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">{method.name}</span>
                      <span className="block text-xs text-gray-500 mt-0.5">
                        {method.type === 'pickup' 
                          ? 'Retirar por el local' 
                          : (method.estimatedDaysMax ? `Llega entre ${method.estimatedDaysMin || 1} y ${method.estimatedDaysMax} días` : 'Recibilo en tu domicilio')}
                      </span>
                    </div>
                    <span className="ml-auto text-sm font-semibold text-gray-900">
                       {finalAmount === 0 ? 'Gratis' : formattedPrice}
                    </span>
                  </label>
                );
              })}
           </div>
         )}
      </section>

      {/* Payment Method — Mercado Pago */}
      <section>
         <h2 className="text-lg font-bold text-gray-900 mb-4">Medio de pago</h2>
         <div className="p-4 border-2 border-[#009EE3] bg-[#009EE3]/5 rounded-lg">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-[#009EE3] rounded-lg flex items-center justify-center shrink-0">
               <CreditCard className="w-5 h-5 text-white" />
             </div>
             <div className="flex-1">
               <p className="text-sm font-bold text-gray-900">Mercado Pago</p>
               <p className="text-xs text-gray-500 mt-0.5">Tarjeta de crédito, débito, efectivo y más</p>
             </div>
             <div className="flex items-center gap-1 px-2 py-1 bg-white rounded-md border border-gray-200">
               <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
               <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Seguro</span>
             </div>
           </div>
           <p className="text-xs text-gray-500 mt-3 pl-[52px]">
             Serás redirigido a Mercado Pago para completar el pago de forma segura.
           </p>
         </div>
      </section>

      <div className="pt-6 border-t border-gray-200 space-y-4">
         <button 
           type="submit" 
           disabled={isPending}
           className="w-full flex items-center justify-center rounded-lg border border-transparent bg-[#009EE3] px-4 py-4 text-base font-bold text-white shadow-sm hover:bg-[#0084c2] focus:outline-none focus:ring-2 focus:ring-[#009EE3] focus:ring-offset-2 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed active:scale-[0.99]"
         >
           {isPending ? (
             <><Loader2 className="w-5 h-5 animate-spin mr-2"/> Conectando con Mercado Pago...</>
           ) : (
             <><CreditCard className="w-5 h-5 mr-2" /> Pagar con Mercado Pago</>
           )}
         </button>
         <p className="text-center text-xs text-gray-400">
           Al hacer clic, serás redirigido a Mercado Pago para completar tu compra de forma segura.
         </p>
      </div>
    </form>
  );
}
