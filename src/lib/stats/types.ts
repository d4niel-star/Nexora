// ─── Stats type definitions ────────────────────────────────────────────
// Pure interfaces. Zero server dependencies. Safe for client bundles.

/** ISO date strings (YYYY-MM-DD) representing the inclusive range used to
 *  compute the analytical surface. Always present in OverviewData so the
 *  client can show the active window without re-deriving it. */
export interface DateRange {
  from: string;
  to: string;
}

export interface DailyRevenuePoint {
  date: string;
  label: string;
  revenue: number;
  orders: number;
}

/** A point in the *previous* equal-length window, aligned by relative
 *  position so the hero chart can overlay both series. */
export interface PrevDailyRevenuePoint {
  /** Index 0…N-1 — same length as the current series. */
  index: number;
  date: string;
  revenue: number;
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
  /** The active window (current period) used for every aggregate below. */
  range: DateRange;
  /** Previous equal-length window used for change indicators. */
  prevRange: DateRange;
  /** Window length expressed in days (inclusive). */
  rangeDays: number;
  kpis: OverviewKPIs;
  dailyRevenue: DailyRevenuePoint[];
  /** Same length as `dailyRevenue` — used by the hero chart to overlay
   *  the previous period as a dashed line. */
  prevDailyRevenue: PrevDailyRevenuePoint[];
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