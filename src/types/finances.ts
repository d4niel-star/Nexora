export type FinanceStatus = "collected" | "pending" | "refunded" | "partial" | "failed" | "review" | "exported" | "scheduled" | "critical" | "stable";
export type FinanceSeverity = "info" | "warning" | "error" | "critical";
export type FinanceChannel = "Mercado Libre" | "Shopify" | "Tienda propia" | "WhatsApp";
export type RefundReason = "Producto defectuoso" | "Error de envio" | "Cancelacion cliente" | "Producto incorrecto" | "Garantia";
export type ExportType = "ventas" | "reembolsos" | "comisiones" | "margenes" | "pendientes" | "completo";

export interface FinanceMovement {
  id: string;
  reference: string;
  customer: string;
  channel: FinanceChannel;
  date: string;
  gross: number;
  commission: number;
  shipping: number;
  net: number;
  status: FinanceStatus;
}

export interface PendingPayment {
  id: string;
  reference: string;
  customer: string;
  date: string;
  amount: number;
  cause: string;
  dueDate: string;
  channel: FinanceChannel;
  status: FinanceStatus;
}

export interface Refund {
  id: string;
  reference: string;
  customer: string;
  date: string;
  amount: number;
  reason: RefundReason;
  status: FinanceStatus;
  method: string;
}

export interface CommissionEntry {
  id: string;
  source: string;
  type: "pasarela" | "plataforma" | "canal";
  amount: number;
  percentage: number;
  transactions: number;
  period: string;
}

export interface MarginEntry {
  id: string;
  name: string;
  category: string;
  revenue: number;
  cost: number;
  margin: number;
  marginPercent: number;
  discountImpact: number;
  shippingImpact: number;
  health: "stable" | "warning" | "critical";
}

export interface ExportRecord {
  id: string;
  type: ExportType;
  range: string;
  date: string;
  status: FinanceStatus;
  fileSize: string;
}

export interface FinanceSummary {
  totalCollected: number;
  totalPending: number;
  totalRefunded: number;
  avgTicket: number;
  estimatedMargin: number;
  estimatedMarginPercent: number;
  totalCommissions: number;
  totalShipping: number;
  estimatedNet: number;
  pendingCount: number;
  refundCount: number;
}
