// ─── Daily Operations Center v1 Types ───

export type OpSeverity = "critical" | "high" | "normal" | "info";
export type OpCategory = "orders" | "margin" | "catalog" | "inventory" | "sourcing" | "ai";

export interface OperationalItem {
  id: string;
  severity: OpSeverity;
  category: OpCategory;
  title: string;
  description: string;
  metric?: string;
  href: string;
  actionLabel: string;
}

export interface OpsKpis {
  ordersToProcess: number;
  totalRevenue: number;
  productsPublished: number;
  totalProducts: number;
  inventoryAlerts: number;
  productsWithoutCost: number;
}

export interface OperationsCenterData {
  items: OperationalItem[];
  kpis: OpsKpis;
  generatedAt: string;
}
