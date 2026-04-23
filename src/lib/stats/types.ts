// ─── Stats type definitions ────────────────────────────────────────────
// Pure interfaces. Zero server dependencies. Safe for client bundles.

export interface DailyRevenuePoint {
  date: string;
  label: string;
  revenue: number;
  orders: number;
}

export interface OverviewKPIs {
  revenue30d: number;
  revenuePrev30d: number;
  revenueChange: number | null;
  orders30d: number;
  ordersPrev30d: number;
  ordersChange: number | null;
  avgTicket: number;
  avgTicketPrev: number;
  avgTicketChange: number | null;
  totalCustomers: number;
  newCustomers30d: number;
  repeatRate: number | null;
  marginPercent: number | null;
  productsPublished: number;
  productsWithSales: number;
}

export interface OverviewData {
  kpis: OverviewKPIs;
  dailyRevenue: DailyRevenuePoint[];
  topProducts: { title: string; revenue: number; units: number }[];
  revenueByCategory: { category: string; revenue: number; units: number }[];
}

export interface CommercialData {
  topProducts: {
    id: string;
    title: string;
    category: string;
    revenue: number;
    units: number;
    marginPercent: number | null;
    marginHealth: string;
  }[];
  topCategories: {
    category: string;
    revenue: number;
    units: number;
    productCount: number;
    avgMargin: number | null;
  }[];
  bottomProducts: {
    id: string;
    title: string;
    category: string;
    revenue: number;
    units: number;
    marginPercent: number | null;
  }[];
}

export interface AudienceData {
  totalCustomers: number;
  newCustomers30d: number;
  recurringCustomers: number;
  vipCustomers: number;
  inactiveCustomers: number;
  avgOrdersPerCustomer: number;
  avgRevenuePerCustomer: number;
  topCustomers: {
    email: string;
    name: string | null;
    ordersCount: number;
    totalSpent: number;
    lastPurchaseAt: string;
  }[];
  ordersByChannel: { channel: string; count: number; revenue: number }[];
}