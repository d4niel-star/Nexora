export type EventType = 
  | "ORDER_CREATED"
  | "PAYMENT_APPROVED"
  | "PAYMENT_PENDING"
  | "PAYMENT_FAILED"
  | "ORDER_SHIPPED"
  | "ORDER_CANCELLED"
  | "PAYMENT_REFUNDED"
  | "ORDER_DELIVERED"
  | "ORDER_IN_TRANSIT";

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
