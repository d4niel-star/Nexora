import type {
  AnalyticsAlert,
  AnalyticsSummary,
  ConversionChannel,
  CustomerSegmentMetric,
  FunnelStep,
  MarketingMetric,
  SalesDay,
  TopProduct,
} from "@/types/analytics";

const now = Date.now();
const DAY = 1000 * 60 * 60 * 24;
const daysAgo = (d: number) => new Date(now - d * DAY).toISOString();

export const MOCK_ANALYTICS_SUMMARY: AnalyticsSummary = {
  totalRevenue: 18_740_000,
  totalOrders: 342,
  avgTicket: 54_795,
  conversionRate: 3.8,
  newCustomers: 89,
  returningCustomers: 156,
  cartRecoveryRate: 28.5,
  activePromotions: 6,
  criticalStock: 4,
  totalLeads: 5364,
  revenueChange: 12.4,
  ordersChange: 8.7,
};

export const MOCK_SALES_DAYS: SalesDay[] = [
  { id: "sd_01", date: daysAgo(0), orders: 48, revenue: 2_630_000, avgTicket: 54_791, conversionRate: 4.2 },
  { id: "sd_02", date: daysAgo(1), orders: 52, revenue: 2_850_000, avgTicket: 54_807, conversionRate: 3.9 },
  { id: "sd_03", date: daysAgo(2), orders: 41, revenue: 2_248_000, avgTicket: 54_829, conversionRate: 3.5 },
  { id: "sd_04", date: daysAgo(3), orders: 67, revenue: 3_674_000, avgTicket: 54_835, conversionRate: 4.8 },
  { id: "sd_05", date: daysAgo(4), orders: 38, revenue: 2_082_000, avgTicket: 54_789, conversionRate: 3.1 },
  { id: "sd_06", date: daysAgo(5), orders: 55, revenue: 3_010_000, avgTicket: 54_727, conversionRate: 4.1 },
  { id: "sd_07", date: daysAgo(6), orders: 41, revenue: 2_246_000, avgTicket: 54_780, conversionRate: 3.4 },
  { id: "sd_08", date: daysAgo(7), orders: 36, revenue: 1_975_000, avgTicket: 54_861, conversionRate: 2.9 },
  { id: "sd_09", date: daysAgo(8), orders: 44, revenue: 2_410_000, avgTicket: 54_772, conversionRate: 3.6 },
  { id: "sd_10", date: daysAgo(9), orders: 50, revenue: 2_740_000, avgTicket: 54_800, conversionRate: 4.0 },
];

export const MOCK_TOP_PRODUCTS: TopProduct[] = [
  { id: "tp_01", name: "Auriculares Bluetooth Pro", category: "Electronica", unitsSold: 187, revenue: 4_680_000, views: 4_250, conversionRate: 4.4, stock: 23, performance: "high" },
  { id: "tp_02", name: "Zapatillas Running Ultra", category: "Calzado", unitsSold: 143, revenue: 3_575_000, views: 3_180, conversionRate: 4.5, stock: 8, performance: "high" },
  { id: "tp_03", name: "Mochila Urbana Premium", category: "Accesorios", unitsSold: 112, revenue: 2_240_000, views: 2_890, conversionRate: 3.9, stock: 45, performance: "medium" },
  { id: "tp_04", name: "Smartwatch Serie 5", category: "Electronica", unitsSold: 98, revenue: 3_920_000, views: 5_120, conversionRate: 1.9, stock: 3, performance: "critical" },
  { id: "tp_05", name: "Campera Impermeable Tech", category: "Ropa", unitsSold: 87, revenue: 2_610_000, views: 1_980, conversionRate: 4.4, stock: 67, performance: "high" },
  { id: "tp_06", name: "Parlante Portatil Mini", category: "Electronica", unitsSold: 76, revenue: 1_520_000, views: 3_400, conversionRate: 2.2, stock: 120, performance: "low" },
  { id: "tp_07", name: "Kit Skincare Natural", category: "Belleza", unitsSold: 64, revenue: 1_280_000, views: 1_600, conversionRate: 4.0, stock: 34, performance: "medium" },
  { id: "tp_08", name: "Termo Acero 1L", category: "Hogar", unitsSold: 56, revenue: 840_000, views: 2_100, conversionRate: 2.7, stock: 0, performance: "critical" },
];

export const MOCK_CUSTOMER_SEGMENTS: CustomerSegmentMetric[] = [
  { id: "seg_01", segment: "Nuevos", count: 89, revenue: 3_120_000, avgTicket: 35_056, frequency: 1.0, trend: "up" },
  { id: "seg_02", segment: "Recurrentes", count: 156, revenue: 8_580_000, avgTicket: 55_000, frequency: 2.8, trend: "stable" },
  { id: "seg_03", segment: "VIP", count: 34, revenue: 5_440_000, avgTicket: 160_000, frequency: 4.2, trend: "up" },
  { id: "seg_04", segment: "Inactivos", count: 67, revenue: 0, avgTicket: 0, frequency: 0, trend: "down" },
  { id: "seg_05", segment: "Riesgo de churn", count: 23, revenue: 460_000, avgTicket: 20_000, frequency: 0.3, trend: "down" },
  { id: "seg_06", segment: "Alto valor", count: 48, revenue: 7_200_000, avgTicket: 150_000, frequency: 3.5, trend: "stable" },
];

export const MOCK_MARKETING_METRICS: MarketingMetric[] = [
  { id: "mk_01", name: "Cupon INVIERNO25", type: "Cupon", conversions: 143, revenue: 4_280_000, roi: 340, performance: "high" },
  { id: "mk_02", name: "2x1 en accesorios", type: "Bundle", conversions: 234, revenue: 3_120_000, roi: 280, performance: "high" },
  { id: "mk_03", name: "Envio gratis +$50K", type: "Promocion", conversions: 1890, revenue: 14_500_000, roi: 520, performance: "high" },
  { id: "mk_04", name: "Banner otoño", type: "Banner", conversions: 612, revenue: 4_890_000, roi: 190, performance: "medium" },
  { id: "mk_05", name: "Upsell cargador", type: "Upsell", conversions: 128, revenue: 1_920_000, roi: 150, performance: "medium" },
  { id: "mk_06", name: "Cross-sell funda", type: "Cross-sell", conversions: 84, revenue: 840_000, roi: 90, performance: "low" },
  { id: "mk_07", name: "Popup bienvenida", type: "Captacion", conversions: 2340, revenue: 0, roi: 0, performance: "medium" },
  { id: "mk_08", name: "Recordatorio carrito", type: "Automatizacion", conversions: 1240, revenue: 8_680_000, roi: 680, performance: "high" },
];

export const MOCK_FUNNEL: FunnelStep[] = [
  { label: "Sesiones", value: 12_400, dropoff: 0 },
  { label: "Producto visto", value: 6_820, dropoff: 45.0 },
  { label: "Agregado al carrito", value: 1_860, dropoff: 72.7 },
  { label: "Inicio checkout", value: 980, dropoff: 47.3 },
  { label: "Compra completada", value: 472, dropoff: 51.8 },
];

export const MOCK_CHANNELS: ConversionChannel[] = [
  { id: "ch_01", name: "Organico", sessions: 5_200, conversions: 198, conversionRate: 3.8, revenue: 7_920_000, trend: "up" },
  { id: "ch_02", name: "Google Ads", sessions: 3_100, conversions: 124, conversionRate: 4.0, revenue: 4_960_000, trend: "stable" },
  { id: "ch_03", name: "Instagram", sessions: 2_400, conversions: 72, conversionRate: 3.0, revenue: 2_880_000, trend: "up" },
  { id: "ch_04", name: "Email", sessions: 890, conversions: 53, conversionRate: 6.0, revenue: 2_120_000, trend: "stable" },
  { id: "ch_05", name: "Directo", sessions: 580, conversions: 18, conversionRate: 3.1, revenue: 540_000, trend: "down" },
  { id: "ch_06", name: "Referidos", sessions: 230, conversions: 7, conversionRate: 3.0, revenue: 320_000, trend: "stable" },
];

export const MOCK_ALERTS: AnalyticsAlert[] = [
  { id: "alt_01", title: "Stock critico en Smartwatch Serie 5", description: "Solo 3 unidades. Producto con alta demanda y 5.120 vistas.", severity: "critical", category: "Stock" },
  { id: "alt_02", title: "Termo Acero 1L sin stock", description: "Producto agotado con 56 ventas previas. Reposicion urgente.", severity: "critical", category: "Stock" },
  { id: "alt_03", title: "Abandono de checkout alto", description: "51.8% de abandono en la etapa de compra. Revisar proceso de pago.", severity: "warning", category: "Conversion" },
  { id: "alt_04", title: "Canal Directo en caida", description: "Trafico directo cayendo un 15%. Considerar campañas de marca.", severity: "warning", category: "Canales" },
  { id: "alt_05", title: "VIP revenue creciendo", description: "Segmento VIP crecio 18% en ingresos. Considerar programa exclusivo.", severity: "info", category: "Clientes" },
  { id: "alt_06", title: "Parlante Portatil baja conversion", description: "3.400 vistas pero solo 2.2% conversion. Revisar pricing.", severity: "warning", category: "Productos" },
];
