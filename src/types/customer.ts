import type { OrderStatus } from "@/types/order";

export type CustomerChannel =
  | "Shopify"
  | "Mercado Libre"
  | "Tienda Nube"
  | "Instagram"
  | "Manual";

export type CustomerSegment = "new" | "recurring" | "vip";
export type CustomerLifecycleStatus = "active" | "inactive" | "risk";

export interface CustomerOrderSummary {
  id: string;
  number: string;
  date: string;
  total: number;
  status: OrderStatus;
  channel: CustomerChannel;
  itemsCount: number;
}

export interface CustomerNote {
  id: string;
  body: string;
  createdAt: string;
  author: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  channel: CustomerChannel;
  segment: CustomerSegment;
  lifecycleStatus: CustomerLifecycleStatus;
  totalSpent: number;
  averageTicket: number;
  ordersCount: number;
  firstPurchaseAt: string;
  lastPurchaseAt: string;
  isHighValue: boolean;
  pendingFollowUp: boolean;
  tags: string[];
  notes: CustomerNote[];
  orderHistory: CustomerOrderSummary[];
}
