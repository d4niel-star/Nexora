import { LogisticsProvider } from "./types";
import { MockCarrierProvider } from "./providers/mock";

const providers: Record<string, LogisticsProvider> = {
  mock_carrier: new MockCarrierProvider(),
  // andreani: new AndreaniProvider(),
  // shipnow: new ShipnowProvider(),
};

export function getProvider(id: string): LogisticsProvider {
  const provider = providers[id];
  if (!provider) {
    throw new Error(`Provider no encontrado: ${id}`);
  }
  return provider;
}

export function getAllProviders(): LogisticsProvider[] {
  return Object.values(providers).filter(p => p.isAvailable());
}

/**
 * Utility to map external provider statuses to our internal ShippingStatus 
 * if they don't map perfectly.
 */
export function normalizeStatus(carrierStatus: string): string {
  const map: Record<string, string> = {
     "unfulfilled": "unfulfilled",
     "preparing": "preparing",
     "ready_to_ship": "shipped",
     "shipped": "shipped",
     "in_transit": "shipped",
     "out_for_delivery": "shipped",
     "delivered": "delivered",
     "failed_delivery": "shipped", // Could be mapped to a custom failed status in future
     "returned": "returned",
     "cancelled": "cancelled"
  };
  return map[carrierStatus] || "shipped";
}
