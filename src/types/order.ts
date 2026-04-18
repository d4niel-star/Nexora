export type OrderStatus = 'new' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'approved' | 'in_process' | 'rejected' | 'cancelled';
export type Channel = 'Manual' | 'Tienda Nube' | 'Storefront';

export interface OrderItem {
  id: string;
  productId?: string | null;
  variantId?: string | null;
  sku: string | null;
  title: string;
  variantTitle: string;
  quantity: number;
  price: number;
  lineTotal: number;
  image?: string | null;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  document?: string | null; // DNI/CUIT
}

export interface ShippingDetails {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shippingMethodLabel?: string | null;
  shippingEstimate?: string | null;
  shippingStatus?: string | null;
}

/**
 * Unified Order type used by admin UI.
 * Adapts the flat Prisma Order model into a structured shape for the frontend.
 */
export interface Order {
  id: string;
  number: string; // e.g., #10042
  createdAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  channel: Channel;
  total: number;
  subtotal: number;
  shippingCost: number;
  currency: string;
  customer: Customer;
  shipping: ShippingDetails;
  items: OrderItem[];
  notes?: string;
  publicStatus?: string;
  paymentProvider?: string | null;
  mpPaymentId?: string | null;
  mpPreferenceId?: string | null;
  fiscalInvoice?: any;
}
