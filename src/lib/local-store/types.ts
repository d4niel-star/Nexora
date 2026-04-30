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

// ── Pedidos para retirar ─────────────────────────────────────────────
//
// Public-facing pickup order shape consumed by the admin pickup tab.
// `shippingStatus` follows the operational state machine documented
// in `markPickupReady` / `markPickupCollected` in actions.ts.
//
// Notification state is denormalised into the row so the UI can show
// "ya notificaste por email/WhatsApp" badges and disable the buttons
// when there is no contact method available, without an extra round-trip.
export interface PickupOrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  total: number;
  itemCount: number;
  paymentStatus: string;
  shippingStatus: string;
  createdAt: string;

  // Notification telemetry surfaced from EmailLog / SystemEvent. Both
  // are nullable because the merchant may have never notified the buyer
  // (or the buyer may not have an email/phone to begin with).
  pickupReadyEmailSentAt: string | null;
  pickupReadyEmailRecipient: string | null;
  pickupReadyWhatsAppOpenedAt: string | null;

  // Pre-built wa.me deep link with the pickup-ready message already
  // encoded. Null when the buyer has no usable phone number; callers
  // should treat null as "WhatsApp button disabled". The link is
  // generated server-side via `buildPickupWhatsAppLink` so the public
  // location data does not have to bleed into client components.
  whatsappLink: string | null;
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
