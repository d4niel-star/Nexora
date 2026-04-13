export type MarketingStatus = "active" | "paused" | "archived" | "scheduled" | "draft" | "expired";

export type CouponType = "percentage" | "fixed_amount" | "free_shipping";

export type PromoType =
  | "auto_discount"
  | "bundle"
  | "free_shipping"
  | "upsell"
  | "cross_sell"
  | "banner";

export type AutomationType =
  | "cart_reminder"
  | "post_purchase_coupon"
  | "bundle_suggestion"
  | "vip_message"
  | "exit_intent_popup";

export type CaptureType = "email_form" | "whatsapp" | "popup" | "banner_subscription";

export interface Coupon {
  id: string;
  name: string;
  code: string;
  type: CouponType;
  discount: number;
  usageCount: number;
  usageLimit: number | null;
  minPurchase: number | null;
  startsAt: string;
  expiresAt: string | null;
  status: MarketingStatus;
  revenueGenerated: number;
}

export interface Promotion {
  id: string;
  name: string;
  type: PromoType;
  targeting: string;
  discount: string;
  startsAt: string;
  expiresAt: string | null;
  status: MarketingStatus;
  impressions: number;
  conversions: number;
  revenueGenerated: number;
}

export interface AbandonedCart {
  id: string;
  customerName: string;
  customerEmail: string;
  cartTotal: number;
  itemsCount: number;
  abandonedAt: string;
  remindersSent: number;
  recovered: boolean;
  lastReminderAt: string | null;
}

export interface Automation {
  id: string;
  name: string;
  type: AutomationType;
  trigger: string;
  status: MarketingStatus;
  executionsCount: number;
  conversionRate: number;
  lastExecutedAt: string | null;
  createdAt: string;
}

export interface CaptureForm {
  id: string;
  name: string;
  type: CaptureType;
  status: MarketingStatus;
  leadsCollected: number;
  conversionRate: number;
  placement: string;
  createdAt: string;
}

export interface MarketingSummary {
  activeCampaigns: number;
  activeCoupons: number;
  cartRecoveryRate: number;
  promoUsageRate: number;
  activeBundles: number;
  attributedRevenue: number;
  totalLeads: number;
  abandonedCarts: number;
}
