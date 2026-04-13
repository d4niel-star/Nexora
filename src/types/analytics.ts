export type AnalyticsTrend = "up" | "down" | "stable";
export type PerformanceLevel = "high" | "medium" | "low" | "critical";
export type AnalyticsPeriod = "7d" | "30d" | "90d";

export interface KpiMetric {
  label: string;
  value: string;
  previousValue: string;
  changePercent: number;
  trend: AnalyticsTrend;
}

export interface SalesDay {
  id: string;
  date: string;
  orders: number;
  revenue: number;
  avgTicket: number;
  conversionRate: number;
}

export interface TopProduct {
  id: string;
  name: string;
  category: string;
  unitsSold: number;
  revenue: number;
  views: number;
  conversionRate: number;
  stock: number;
  performance: PerformanceLevel;
}

export interface CustomerSegmentMetric {
  id: string;
  segment: string;
  count: number;
  revenue: number;
  avgTicket: number;
  frequency: number;
  trend: AnalyticsTrend;
}

export interface MarketingMetric {
  id: string;
  name: string;
  type: string;
  conversions: number;
  revenue: number;
  roi: number;
  performance: PerformanceLevel;
}

export interface FunnelStep {
  label: string;
  value: number;
  dropoff: number;
}

export interface ConversionChannel {
  id: string;
  name: string;
  sessions: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  trend: AnalyticsTrend;
}

export interface AnalyticsAlert {
  id: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
  category: string;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  totalOrders: number;
  avgTicket: number;
  conversionRate: number;
  newCustomers: number;
  returningCustomers: number;
  cartRecoveryRate: number;
  activePromotions: number;
  criticalStock: number;
  totalLeads: number;
  revenueChange: number;
  ordersChange: number;
}
