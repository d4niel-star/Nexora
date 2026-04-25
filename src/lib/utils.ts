import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Currency formatter. Defaults to ARS in es-AR because the platform's
// primary market is Argentina, but accepts an optional `currency` code
// so per-tenant or per-order currencies (Order.currency) can be honored
// without leaking peso symbols into a USD checkout.
export function formatCurrency(value: number, currency: string = "ARS"): string {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    // Intl throws on unsupported / malformed currency codes — fall back
    // to ARS so the UI never crashes on bad data.
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(value);
  }
}
