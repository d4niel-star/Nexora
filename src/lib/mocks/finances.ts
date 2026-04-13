import type {
  FinanceMovement,
  PendingPayment,
  Refund,
  CommissionEntry,
  MarginEntry,
  ExportRecord,
  FinanceSummary,
} from "@/types/finances";

const now = Date.now();
const HOUR = 1000 * 60 * 60;
const DAY = HOUR * 24;
const MINUTE = 1000 * 60;

const minutesAgo = (m: number) => new Date(now - m * MINUTE).toISOString();
const hoursAgo = (h: number) => new Date(now - h * HOUR).toISOString();
const daysAgo = (d: number) => new Date(now - d * DAY).toISOString();

// ─── Collected ───

export const MOCK_MOVEMENTS: FinanceMovement[] = [
  { id: "mov_01", reference: "PO-2024-0891", customer: "Juan Perez", channel: "Mercado Libre", date: minutesAgo(45), gross: 45900, commission: 5967, shipping: 2800, net: 37133, status: "collected" },
  { id: "mov_02", reference: "PO-2024-0890", customer: "Maria Garcia", channel: "Tienda propia", date: hoursAgo(2), gross: 23450, commission: 0, shipping: 1500, net: 21950, status: "collected" },
  { id: "mov_03", reference: "PO-2024-0889", customer: "Carlos Lopez", channel: "Shopify", date: hoursAgo(4), gross: 67800, commission: 4746, shipping: 3200, net: 59854, status: "collected" },
  { id: "mov_04", reference: "PO-2024-0888", customer: "Ana Martinez", channel: "WhatsApp", date: hoursAgo(6), gross: 12300, commission: 0, shipping: 900, net: 11400, status: "collected" },
  { id: "mov_05", reference: "PO-2024-0887", customer: "Roberto Diaz", channel: "Mercado Libre", date: hoursAgo(8), gross: 89500, commission: 11635, shipping: 4100, net: 73765, status: "collected" },
  { id: "mov_06", reference: "PO-2024-0886", customer: "Laura Fernandez", channel: "Tienda propia", date: daysAgo(1), gross: 34200, commission: 0, shipping: 2200, net: 32000, status: "collected" },
  { id: "mov_07", reference: "PO-2024-0885", customer: "Diego Moreno", channel: "Shopify", date: daysAgo(1), gross: 56700, commission: 3969, shipping: 3500, net: 49231, status: "collected" },
  { id: "mov_08", reference: "PO-2024-0884", customer: "Sofia Ruiz", channel: "Mercado Libre", date: daysAgo(2), gross: 19800, commission: 2574, shipping: 1800, net: 15426, status: "collected" },
  { id: "mov_09", reference: "PO-2024-0883", customer: "Pablo Gomes", channel: "WhatsApp", date: daysAgo(2), gross: 41200, commission: 0, shipping: 2500, net: 38700, status: "collected" },
  { id: "mov_10", reference: "PO-2024-0882", customer: "Valentina Torres", channel: "Tienda propia", date: daysAgo(3), gross: 28900, commission: 0, shipping: 1900, net: 27000, status: "collected" },
];

// ─── Pending ───

export const MOCK_PENDING: PendingPayment[] = [
  { id: "pend_01", reference: "PO-2024-0892", customer: "Lucas Herrera", date: minutesAgo(20), amount: 34500, cause: "Pago en procesamiento", dueDate: daysAgo(-2), channel: "Mercado Libre", status: "pending" },
  { id: "pend_02", reference: "PO-2024-0893", customer: "Camila Blanco", date: hoursAgo(3), amount: 15800, cause: "Retencion por disputa", dueDate: daysAgo(-5), channel: "Shopify", status: "review" },
  { id: "pend_03", reference: "PO-2024-0894", customer: "Martin Sosa", date: hoursAgo(12), amount: 67200, cause: "Liberacion programada", dueDate: daysAgo(-1), channel: "Mercado Libre", status: "scheduled" },
  { id: "pend_04", reference: "PO-2024-0895", customer: "Florencia Vega", date: daysAgo(1), amount: 8900, cause: "Verificacion identidad", dueDate: daysAgo(-3), channel: "Tienda propia", status: "review" },
  { id: "pend_05", reference: "PO-2024-0896", customer: "Nicolas Paz", date: daysAgo(2), amount: 42100, cause: "Contracargo en revision", dueDate: daysAgo(-7), channel: "Mercado Libre", status: "critical" },
  { id: "pend_06", reference: "PO-2024-0897", customer: "Isabella Rojas", date: daysAgo(3), amount: 23400, cause: "Pago parcial recibido", dueDate: daysAgo(-4), channel: "WhatsApp", status: "partial" },
];

// ─── Refunds ───

export const MOCK_REFUNDS: Refund[] = [
  { id: "ref_01", reference: "RF-2024-0201", customer: "Andrea Suarez", date: hoursAgo(5), amount: 12300, reason: "Producto defectuoso", status: "refunded", method: "Mercado Pago" },
  { id: "ref_02", reference: "RF-2024-0200", customer: "Tomas Silva", date: daysAgo(1), amount: 8900, reason: "Error de envio", status: "refunded", method: "Stripe" },
  { id: "ref_03", reference: "RF-2024-0199", customer: "Julieta Ramos", date: daysAgo(2), amount: 34500, reason: "Cancelacion cliente", status: "partial", method: "Mercado Pago" },
  { id: "ref_04", reference: "RF-2024-0198", customer: "Mateo Aguero", date: daysAgo(3), amount: 5600, reason: "Producto incorrecto", status: "refunded", method: "Transferencia" },
  { id: "ref_05", reference: "RF-2024-0197", customer: "Lucia Mendez", date: daysAgo(5), amount: 19200, reason: "Garantia", status: "review", method: "Mercado Pago" },
  { id: "ref_06", reference: "RF-2024-0196", customer: "Joaquin Peralta", date: daysAgo(7), amount: 7800, reason: "Producto defectuoso", status: "failed", method: "PayPal" },
];

// ─── Commissions ───

export const MOCK_COMMISSIONS: CommissionEntry[] = [
  { id: "com_01", source: "Mercado Pago", type: "pasarela", amount: 18540, percentage: 4.5, transactions: 142, period: "Abril 2024" },
  { id: "com_02", source: "Stripe", type: "pasarela", amount: 8715, percentage: 3.6, transactions: 67, period: "Abril 2024" },
  { id: "com_03", source: "Mercado Libre", type: "plataforma", amount: 24890, percentage: 13.0, transactions: 89, period: "Abril 2024" },
  { id: "com_04", source: "Shopify", type: "plataforma", amount: 6200, percentage: 2.0, transactions: 45, period: "Abril 2024" },
  { id: "com_05", source: "Tienda propia", type: "canal", amount: 0, percentage: 0, transactions: 203, period: "Abril 2024" },
  { id: "com_06", source: "WhatsApp", type: "canal", amount: 0, percentage: 0, transactions: 34, period: "Abril 2024" },
];

// ─── Margins ───

export const MOCK_MARGINS: MarginEntry[] = [
  { id: "mar_01", name: "Auriculares Bluetooth Pro", category: "Audio", revenue: 89500, cost: 42000, margin: 47500, marginPercent: 53.1, discountImpact: 2400, shippingImpact: 4100, health: "stable" },
  { id: "mar_02", name: "Funda Premium iPhone 15", category: "Accesorios", revenue: 23450, cost: 8200, margin: 15250, marginPercent: 65.0, discountImpact: 0, shippingImpact: 1500, health: "stable" },
  { id: "mar_03", name: "Cable USB-C 2m", category: "Cables", revenue: 12300, cost: 9800, margin: 2500, marginPercent: 20.3, discountImpact: 1200, shippingImpact: 900, health: "critical" },
  { id: "mar_04", name: "Mouse Inalambrico Ergonomico", category: "Perifericos", revenue: 45900, cost: 28500, margin: 17400, marginPercent: 37.9, discountImpact: 3200, shippingImpact: 2800, health: "warning" },
  { id: "mar_05", name: "Cargador Rapido 65W", category: "Energia", revenue: 34200, cost: 18900, margin: 15300, marginPercent: 44.7, discountImpact: 1800, shippingImpact: 2200, health: "stable" },
  { id: "mar_06", name: "Soporte Notebook Aluminio", category: "Accesorios", revenue: 56700, cost: 31200, margin: 25500, marginPercent: 45.0, discountImpact: 4500, shippingImpact: 3500, health: "stable" },
  { id: "mar_07", name: "Adaptador HDMI Multi", category: "Conectividad", revenue: 19800, cost: 15600, margin: 4200, marginPercent: 21.2, discountImpact: 2100, shippingImpact: 1800, health: "critical" },
  { id: "mar_08", name: "Webcam 4K AutoFocus", category: "Video", revenue: 67800, cost: 35400, margin: 32400, marginPercent: 47.8, discountImpact: 5600, shippingImpact: 3200, health: "stable" },
];

// ─── Exports ───

export const MOCK_EXPORTS: ExportRecord[] = [
  { id: "exp_01", type: "ventas", range: "01-30 Abr 2024", date: minutesAgo(30), status: "exported", fileSize: "2.4 MB" },
  { id: "exp_02", type: "comisiones", range: "01-30 Abr 2024", date: hoursAgo(6), status: "exported", fileSize: "890 KB" },
  { id: "exp_03", type: "reembolsos", range: "01-30 Mar 2024", date: daysAgo(5), status: "exported", fileSize: "340 KB" },
  { id: "exp_04", type: "margenes", range: "01-30 Abr 2024", date: daysAgo(1), status: "exported", fileSize: "1.1 MB" },
  { id: "exp_05", type: "completo", range: "Q1 2024", date: daysAgo(10), status: "exported", fileSize: "8.7 MB" },
  { id: "exp_06", type: "pendientes", range: "01-11 Abr 2024", date: minutesAgo(5), status: "scheduled", fileSize: "—" },
];

// ─── Summary ───

export const MOCK_FINANCE_SUMMARY: FinanceSummary = {
  totalCollected: 419750,
  totalPending: 191900,
  totalRefunded: 88300,
  avgTicket: 41975,
  estimatedMargin: 159550,
  estimatedMarginPercent: 38.0,
  totalCommissions: 58345,
  totalShipping: 24400,
  estimatedNet: 337005,
  pendingCount: 6,
  refundCount: 6,
};
