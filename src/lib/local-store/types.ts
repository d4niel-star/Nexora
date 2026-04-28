// ─── Local físico — shared types ──────────────────────────────────────
//
// Plain types consumed by both server queries and client components.
// We don't expose Prisma model types directly because RSC props and
// client components serialize through JSON, and Prisma's generated
// types include relation fields we don't always populate.

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

// ── Perfil & horarios ────────────────────────────────────────────────

export interface LocationDayHours {
  weekday: number; // 0..6, Sun..Sat
  isOpen: boolean;
  openTime: string | null; // "HH:MM" or null
  closeTime: string | null;
}

export interface LocationProfile {
  id: string;
  name: string;
  addressLine: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  googleMapsUrl: string | null;

  pickupEnabled: boolean;
  pickupInstructions: string | null;
  pickupPreparationMinutes: number | null;
  pickupWindow: string | null;

  hours: LocationDayHours[]; // always 7 entries Sun..Sat

  // Computed
  isOpenNow: boolean;
  openCloseLabel: string; // "Abierto · cierra 19:00" / "Cerrado · abre 09:00 mañana"
}

// ── Stock local ──────────────────────────────────────────────────────

export interface LocalStockRow {
  variantId: string;
  productId: string;
  productTitle: string;
  variantTitle: string;
  sku: string | null;
  imageUrl: string | null;
  unitPrice: number;
  onlineStock: number; // ProductVariant.stock — informativo
  localStock: number;
  lowStockThreshold: number;
  status: "out_of_stock" | "low_stock" | "ok";
}

// ── Caja diaria ──────────────────────────────────────────────────────

export interface CashSessionSummary {
  id: string;
  status: "open" | "closed";
  openedAt: string;
  closedAt: string | null;
  openingCash: number;
  expectedCash: number | null;
  countedCash: number | null;
  difference: number | null;
  notes: string | null;

  // Aggregations from sales/movements
  cashSalesTotal: number;
  cardSalesTotal: number;
  transferSalesTotal: number;
  otherSalesTotal: number;
  totalSales: number;
  totalSalesCount: number;
  totalExpenses: number;
}

export interface CashMovementRow {
  id: string;
  type: string;
  amount: number;
  reason: string;
  createdAt: string;
}

// ── Ventas presenciales ──────────────────────────────────────────────

export interface InStoreSaleRow {
  id: string;
  saleNumber: number;
  total: number;
  paymentMethod: string;
  itemCount: number;
  customerName: string | null;
  createdAt: string;
}

export interface DailyOperationalSummary {
  // Sales today (regardless of cash session)
  salesCountToday: number;
  salesTotalToday: number;

  // Cash session (if open)
  hasOpenCashSession: boolean;
  cashSessionId: string | null;

  // Pickup orders pending (Order.shippingMethodId pointing to a pickup
  // ShippingMethod and shippingStatus !== 'delivered')
  pendingPickupOrders: number;

  // Stock alerts on the local inventory only
  localLowStockCount: number;
  localOutOfStockCount: number;
}
