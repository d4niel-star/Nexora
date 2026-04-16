export type ProductStatus = 'active' | 'draft' | 'archived';
export type Supplier = 'Own' | 'Nexora Global' | 'Aliexpress Dropship' | 'Local Partner';

export interface ProductVariant {
  id: string;
  sku: string;
  title: string;
  price: number;
  cost: number;
  stock: number;
  reservedStock?: number;
  availableStock?: number;
  attributes?: Record<string, string>; // e.g., { Color: 'Rojo', Talle: 'M' }
}

export interface CatalogSignal {
  key: string;
  label: string;
  severity: "blocker" | "warning" | "info" | "ok";
}

export interface Product {
  id: string;
  image: string;
  title: string;
  description?: string;
  category: string;
  status: ProductStatus;
  supplier: Supplier;
  price: number;
  cost: number;
  costReal: boolean;
  margin: number; // Derived as (price - cost) / price
  totalStock: number;
  updatedAt: string;
  tags?: string[];
  variants: ProductVariant[];
  // Catalog Intelligence v2
  signals: CatalogSignal[];
  issueCount: number;
  hasProvider: boolean;
  providerName: string | null;
  mirrorSyncStatus: string | null;
  channelCount: number;
  channelSyncIssues: number;
  firstListingId: string | null;
  // Catalog Variant Intelligence v1
  variantRiskCount: number;
  hiddenVariantCount: number;
  variantCriticalId: string | null;
  variantHiddenId: string | null;
  variantStuckId: string | null;
  variantNegativeId: string | null;
  variantUrgentReorderId: string | null;
}

export interface ImportableProduct {
  id: string;
  images: string[];
  originalTitle: string;
  category: string;
  supplier: Supplier;
  suggestedPrice: number;
  baseCost: number;
  estimatedMargin: number;
  deliveryTimeDays: string; // e.g., "5-7 días"
  rating: number;
  totalSales: number;
  stockAvailable: number;
  features: string[];
}
