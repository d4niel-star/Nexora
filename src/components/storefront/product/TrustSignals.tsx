import Link from "next/link";
import { CreditCard, RotateCcw, Truck } from "lucide-react";

import { storePath } from "@/lib/store-engine/urls";
import type { StorefrontTrustSignals } from "@/lib/storefront/trust";

// ─── Storefront TrustSignals ─────────────────────────────────────────────
// Small, sober chip row rendered under the PDP CTA and inside the cart
// summary. Every line is backed by a real signal from the store — the
// helper that feeds this component (getStorefrontTrustSignals) never
// returns fake values.
//
// Copy rules (non-negotiable):
//   * NO "X personas están viendo", "vendido N veces", "popular",
//     "últimas unidades" global copies — those would be fake or belong
//     on the per-variant stock line, not here.
//   * NO scarcity or urgency language. Each chip states a concrete,
//     verifiable benefit: payment method, shipping threshold, returns.
//   * Chips render only when their signal is available. The component
//     collapses to nothing when there are zero truthful signals so it
//     never shouts with an empty shell.

export interface TrustSignalsProps {
  signals: StorefrontTrustSignals;
  storeSlug: string;
  variant?: "pdp" | "cart";
}

export function TrustSignals({
  signals,
  storeSlug,
  variant = "pdp",
}: TrustSignalsProps) {
  const items: Array<{
    icon: React.ReactNode;
    title: string;
    description: string;
    href?: string;
  }> = [];

  if (signals.hasMercadoPago) {
    items.push({
      icon: <CreditCard className="h-4 w-4 text-ink-3" strokeWidth={1.75} />,
      title: "Pago con Mercado Pago",
      description: "Tarjeta, transferencia o efectivo. Procesado por MP.",
    });
  }

  if (signals.freeShippingThreshold != null) {
    const threshold = new Intl.NumberFormat(signals.locale, {
      style: "currency",
      currency: signals.currency,
      maximumFractionDigits: 0,
    }).format(signals.freeShippingThreshold);
    items.push({
      icon: <Truck className="h-4 w-4 text-ink-3" strokeWidth={1.75} />,
      title: `Envío gratis desde ${threshold}`,
      description: "Aplica según el método elegido en el checkout.",
    });
  }

  if (signals.hasReturnsPolicy) {
    items.push({
      icon: <RotateCcw className="h-4 w-4 text-ink-3" strokeWidth={1.75} />,
      title: "Derecho de arrepentimiento",
      description: "10 días para cambios y devoluciones.",
      href: storePath(storeSlug, "arrepentimiento"),
    });
  }

  if (items.length === 0) return null;

  return (
    <ul
      className={
        variant === "pdp"
          ? "mt-6 divide-y divide-[color:var(--hairline)] border-y border-[color:var(--hairline)]"
          : "mt-5 divide-y divide-[color:var(--hairline)] rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)]"
      }
      aria-label="Garantías y métodos de pago"
    >
      {items.map((item) => {
        const row = (
          <div className="flex items-start gap-3 py-3">
            <span
              aria-hidden
              className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-0)]"
            >
              {item.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium leading-[1.35] text-ink-0">
                {item.title}
              </p>
              <p className="mt-0.5 text-[12px] leading-[1.5] text-ink-5">
                {item.description}
              </p>
            </div>
          </div>
        );
        if (item.href) {
          return (
            <li key={item.title} className="px-0 first:pt-0 last:pb-0">
              <Link
                href={item.href}
                className="block rounded-[var(--r-xs)] px-1 -mx-1 transition-colors hover:bg-[var(--surface-1)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
              >
                {row}
              </Link>
            </li>
          );
        }
        return (
          <li key={item.title} className="px-1 -mx-1">
            {row}
          </li>
        );
      })}
    </ul>
  );
}
