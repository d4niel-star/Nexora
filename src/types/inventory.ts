export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
export type SyncStatus = 'synced' | 'syncing' | 'error' | 'unlinked';
export type MovementType = 'sale' | 'restock' | 'adjustment' | 'return' | 'reservation';

export interface StockMovement {
  id: string;
  type: MovementType;
  quantity: number;
  date: string;
  reference?: string; // Order ID or adjustment note
  user?: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  sku: string;
  title: string;
  variantTitle?: string;
  image: string;
  category: string;
  supplier: string;
  available: number;
  reserved: number;
  total: number; // available + reserved
  reorderPoint: number;
  stockStatus: StockStatus;
  syncStatus: SyncStatus;
  lastSyncedAt: string;
  movements: StockMovement[];
}
