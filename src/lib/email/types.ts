export type EventType = 
  | "ORDER_CREATED"
  | "ORDER_PAID_OWNER"
  | "PAYMENT_APPROVED"
  | "PAYMENT_PENDING"
  | "PAYMENT_FAILED"
  | "ORDER_SHIPPED"
  | "ORDER_CANCELLED"
  | "PAYMENT_REFUNDED"
  | "ORDER_DELIVERED"
  | "ORDER_IN_TRANSIT"
  | "PICKUP_READY"
  | "STOCK_CRITICAL"
  | "ABANDONED_CART"
  | "POST_PURCHASE_REVIEW_REQUEST"
  | "POST_PURCHASE_REORDER_FOLLOWUP"
  | "BILLING_PAYMENT_FAILED"
  | "BILLING_SUSPENSION_WARNING"
  | "BILLING_REACTIVATED";

export interface AbandonedCartEmailData {
  storeSlug: string;
  storeName: string;
  customerName: string;
  cartItems: Array<{
    title: string;
    variantTitle: string | null;
    quantity: number;
    price: number;
    image: string | null;
  }>;
  subtotal: number;
  currency: string;
  recoveryUrl: string;
}

export interface StockCriticalEmailData {
  storeSlug: string;
  storeName: string;
  productTitle: string;
  variantTitle: string | null;
  sku: string | null;
  currentStock: number;
  reorderPoint: number;
  inventoryUrl: string;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailProvider {
  name: string;
  send(payload: EmailPayload): Promise<{ success: boolean; error?: string }>;
}

export interface OrderEmailData {
  storeSlug: string;
  storeName: string;
  customerName: string;
  orderNumber: string;
  orderId: string;
  subtotal: number;
  shippingAmount: number;
  total: number;
  currency: string;
  shippingMethodLabel?: string;
  trackingUrl?: string;
  trackingCode?: string;
  statusUrl?: string; // Link to the order success/pending page

  // ─── PICKUP_READY-specific (only used by the pickup-ready template) ──
  // These are public store-location fields the merchant has typed into
  // /admin/store/local. We never include cash/sales/inventory data here.
  pickupLocalName?: string;
  pickupAddress?: string; // Single-line "addressLine, city, province"
  pickupHoursSummary?: string; // e.g. "Lun a Vie 09:00-18:00 · Sáb 10:00-14:00"
  pickupInstructions?: string;
  pickupGoogleMapsUrl?: string;
  pickupPhone?: string; // The merchant's local phone, not the buyer's
}
