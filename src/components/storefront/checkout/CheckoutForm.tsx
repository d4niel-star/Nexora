"use client";

import { useState, useTransition } from "react";
import { updateCheckoutDraftInfo } from "@/lib/store-engine/checkout/actions";
import { initiatePayment } from "@/lib/payments/mercadopago/actions";
import { updateCheckoutShippingMethod } from "@/lib/store-engine/shipping/actions";
import { CheckoutDraftType } from "@/types/checkout";
import { ShippingMethodData } from "@/lib/store-engine/shipping/queries";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";

// ─── Checkout Form ───
// Every handler, server action and payment integration is intact — including
// the Mercado Pago redirect, the shipping-method transition, the draft update
// and the error surface. Only the shell was redrawn:
//   · numbered editorial sections (01 / 02 / 03)
//   · token-based inputs (16px, 44px, accent focus ring)
//   · Mercado Pago lockup as a hairline card with the official brand blue
//     used only as a micro-accent on the payment chip, not the full CTA
//   · primary pay CTA in ink-0 for consistency with the rest of the system

const SECTIONS = {
  contact: { number: "01", title: "Contacto" },
  address: { number: "02", title: "Envío" },
  payment: { number: "03", title: "Pago" },
} as const;

// Local token-based input styling — keeps the form uncluttered without
// turning every <input> into an imported component.
const inputClass =
  "block w-full rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3.5 text-[15px] text-ink-0 placeholder:text-ink-6 " +
  "transition-[box-shadow,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)] " +
  "focus:border-[var(--accent-500)] focus:outline-none focus:shadow-[var(--shadow-focus)] h-12";

const labelClass = "block text-[12px] font-medium text-ink-5 mb-1.5";

function SectionHeader({ step, title }: { step: string; title: string }) {
  return (
    <div className="mb-5 flex items-baseline gap-3">
      <span className="tabular text-[11px] font-medium text-ink-6">{step}</span>
      <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-ink-0">
        {title}
      </h2>
    </div>
  );
}

export function CheckoutForm({
  draft,
  storeSlug,
  shippingMethods,
}: {
  draft: CheckoutDraftType;
  storeSlug: string;
  shippingMethods: ShippingMethodData[];
}) {
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
        await updateCheckoutDraftInfo(draft.id, data);
        const result = await initiatePayment(draft.id, storeSlug);
        window.location.href = result.redirectUrl;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Error al procesar el pago. Intentá nuevamente.";
        console.error(err);
        setError(message);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-[var(--r-md)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] p-4"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--signal-danger)]"
            strokeWidth={1.75}
          />
          <div>
            <p className="text-[13px] font-medium text-ink-0">
              Error en el checkout
            </p>
            <p className="mt-1 text-[13px] text-[color:var(--signal-danger)]">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* 01 Contact */}
      <section>
        <SectionHeader
          step={SECTIONS.contact.number}
          title={SECTIONS.contact.title}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="email" className={labelClass}>
              Email <span className="text-ink-6">*</span>
            </label>
            <input
              required
              type="email"
              id="email"
              name="email"
              defaultValue={draft.email || ""}
              className={inputClass}
              placeholder="tu@email.com"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="phone" className={labelClass}>
              Teléfono
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              defaultValue={draft.phone || ""}
              className={inputClass}
              placeholder="11 1234 5678"
            />
          </div>
        </div>
      </section>

      {/* 02 Shipping */}
      <section>
        <SectionHeader
          step={SECTIONS.address.number}
          title={SECTIONS.address.title}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className={labelClass}>
              Nombre <span className="text-ink-6">*</span>
            </label>
            <input
              required
              type="text"
              id="firstName"
              name="firstName"
              defaultValue={draft.firstName || ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="lastName" className={labelClass}>
              Apellido <span className="text-ink-6">*</span>
            </label>
            <input
              required
              type="text"
              id="lastName"
              name="lastName"
              defaultValue={draft.lastName || ""}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="document" className={labelClass}>
              DNI / CUIT
            </label>
            <input
              type="text"
              id="document"
              name="document"
              defaultValue={draft.document || ""}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="addressLine1" className={labelClass}>
              Dirección <span className="text-ink-6">*</span>
            </label>
            <input
              required
              type="text"
              id="addressLine1"
              name="addressLine1"
              defaultValue={draft.addressLine1 || ""}
              placeholder="Calle y número"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="addressLine2" className={labelClass}>
              Depto, piso, etc.
            </label>
            <input
              type="text"
              id="addressLine2"
              name="addressLine2"
              defaultValue={draft.addressLine2 || ""}
              className={inputClass}
              placeholder="Opcional"
            />
          </div>
          <div>
            <label htmlFor="city" className={labelClass}>
              Ciudad <span className="text-ink-6">*</span>
            </label>
            <input
              required
              type="text"
              id="city"
              name="city"
              defaultValue={draft.city || ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="province" className={labelClass}>
              Provincia <span className="text-ink-6">*</span>
            </label>
            <input
              required
              type="text"
              id="province"
              name="province"
              defaultValue={draft.province || ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="postalCode" className={labelClass}>
              Código postal <span className="text-ink-6">*</span>
            </label>
            <input
              required
              type="text"
              id="postalCode"
              name="postalCode"
              defaultValue={draft.postalCode || ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="country" className={labelClass}>
              País
            </label>
            <select
              id="country"
              name="country"
              defaultValue={draft.country || "AR"}
              className={inputClass + " appearance-none bg-[var(--surface-0)]"}
            >
              <option value="AR">Argentina</option>
            </select>
          </div>
        </div>

        {/* Shipping method */}
        <div
          className={
            "mt-8 " + (isShippingPending ? "opacity-50 pointer-events-none" : "")
          }
        >
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-[13px] font-medium text-ink-0">
              Método de envío
            </h3>
            {isShippingPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-6" />
            )}
          </div>
          {shippingMethods.length === 0 ? (
            <p className="text-[13px] text-[color:var(--signal-danger)]">
              No hay métodos de envío disponibles para esta zona.
            </p>
          ) : (
            <div className="space-y-2">
              {shippingMethods.map((method) => {
                const isSelected =
                  draft.shippingMethodId === method.id ||
                  (!draft.shippingMethodId && method.isDefault);
                const isFree =
                  method.freeShippingOver && draft.subtotal >= method.freeShippingOver;
                const finalAmount = isFree ? 0 : method.baseAmount;
                const formattedPrice = new Intl.NumberFormat("es-AR", {
                  style: "currency",
                  currency: "ARS",
                  maximumFractionDigits: 0,
                }).format(finalAmount);

                return (
                  <label
                    key={method.id}
                    htmlFor={`shipping-${method.id}`}
                    className="flex cursor-pointer items-center gap-3 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4 transition-colors hover:bg-[var(--surface-2)] has-[:checked]:border-ink-0 has-[:checked]:bg-[var(--surface-2)]"
                  >
                    <input
                      defaultChecked={isSelected}
                      id={`shipping-${method.id}`}
                      name="shippingMethodId"
                      type="radio"
                      value={method.id}
                      onChange={() => handleShippingChange(method.id)}
                      className="h-4 w-4 border-[color:var(--hairline-strong)] text-ink-0 focus:ring-[var(--accent-500)] focus:ring-offset-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium text-ink-0">
                        {method.name}
                      </p>
                      <p className="mt-0.5 text-[12px] text-ink-5">
                        {method.type === "pickup"
                          ? "Retirar por el local"
                          : method.estimatedDaysMax
                            ? `Llega entre ${method.estimatedDaysMin || 1} y ${method.estimatedDaysMax} días`
                            : "Recibilo en tu domicilio"}
                      </p>
                    </div>
                    <span className="tabular ml-auto shrink-0 text-[14px] font-medium text-ink-0">
                      {finalAmount === 0 ? "Gratis" : formattedPrice}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 03 Payment — Mercado Pago */}
      <section>
        <SectionHeader
          step={SECTIONS.payment.number}
          title={SECTIONS.payment.title}
        />
        <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4">
          <div className="flex items-center gap-3">
            <div
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-sm)] text-ink-12"
              style={{ backgroundColor: "#009EE3" }}
              aria-hidden
            >
              <span className="text-[11px] font-bold tracking-wider">MP</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-ink-0">Mercado Pago</p>
              <p className="mt-0.5 text-[12px] text-ink-5">
                Tarjeta de crédito, débito, efectivo y más.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--signal-success)]">
              <ShieldCheck className="h-3 w-3" strokeWidth={2} />
              Seguro
            </span>
          </div>
          <p className="mt-3 pl-[52px] text-[12px] leading-[1.55] text-ink-5">
            Te redirigimos a Mercado Pago para completar el pago de forma segura.
          </p>
        </div>
      </section>

      {/* Submit */}
      <div className="border-t border-[color:var(--hairline)] pt-8">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-ink-0 text-[15px] font-medium text-ink-12 transition-colors hover:bg-ink-2 active:translate-y-px disabled:bg-ink-8 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
        >
          {isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Conectando con Mercado Pago…
            </>
          ) : (
            "Pagar con Mercado Pago"
          )}
        </button>
        <p className="mt-3 text-center text-[12px] text-ink-5">
          Al hacer clic, te redirigimos a Mercado Pago para completar tu compra
          de forma segura.
        </p>
      </div>
    </form>
  );
}
