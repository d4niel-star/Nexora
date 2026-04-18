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
  | "STOCK_CRITICAL"
  | "ABANDONED_CART";

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
}
